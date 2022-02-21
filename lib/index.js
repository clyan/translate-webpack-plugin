const { RawSource } = require('webpack-sources');
const path = require('path');
const fse = require('fs-extra');
const fetch = require('node-fetch');

/**
 * @param {*} { translateApiUrl: 翻译APi地址， text: 需要翻译的文本， from: 源语言， to: 目标语言, separator: 词组分割符}
 * @returns
 */
function transform({ translateApiUrl, text, from, to }) {
  let url = `${translateApiUrl}?text=${text}&from=${from}&to=${to}`;
  return fetch(url)
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      return res.result;
    })
    .catch((err) => {
      return `Translation error, Check that the API is available: ${err}`;
    });
}
/**
 * @description 返回中文词组数组, 如: <p>你好</p><div>世界</div>,  返回： ['你好', '世界']
 * @param {*} content 打包后的bundle文件内容
 * @returns
 */
function getLanguageList(content, regex) {
  let index = 0,
    termList = [],
    term = '',
    list; // 遍历获取到的中文数组
  while ((list = regex.exec(content))) {
    if (list.index !== index + 1 && term) {
      termList.push(term);
      term = '';
    }
    term += list[0];
    index = list.index;
  }
  if (term !== '') {
    termList.push(term);
  }
  return termList;
}

const TRANSFROMSOURCETARGET = 'transform-source-target.txt';
// 一次最大支持
const googleMaxCharLimit = 1500;
// get url 最大长度限制8124, encode以后会更小
const urlMaxCharLimit = 8124;
/**
 * @description 获取
 * @param {*} filename
 * @returns
 */
function getFilePath(filename) {
  const dir = process.cwd();
  const outputPath = path.join(dir, filename);
  return outputPath;
}

/**
 * @description 追加文件内容
 * @param {*} filename 写入的文件名
 * @param {*} content 写入的内容
 */
function outputFile(content, filename = TRANSFROMSOURCETARGET) {
  const outputPath = getFilePath(filename);
  fse.outputFileSync(outputPath, content);
}

/**
 * @description 清除文件
 * @param {*} filename
 */
function clearFile(filename = TRANSFROMSOURCETARGET) {
  const outputPath = getFilePath(filename);
  fse.removeSync(outputPath);
}

const pluginName = 'TransformWebpackPlugin';

class TransformLanguageWebpackPlugin {
  constructor(options = {}) {
    const defalutOptions = {
      translateApiUrl: '',
      from: 'zh-CN',
      to: 'zh-TW',
      separator: '|',
      regex: /[\u4e00-\u9fa5]/g,
      outputTxt: false,
      toleranceLimit: 200,
    };
    if (!options.translateApiUrl)
      throw new ReferenceError('The translateApiUrl parameter is required');
    this.options = { ...defalutOptions, ...options };
  }
  apply(compiler) {
    const {
      separator,
      translateApiUrl,
      from,
      to,
      regex,
      outputTxt,
      toleranceLimit,
    } = this.options;
    compiler.hooks.emit.tapAsync(pluginName, async (compilation, callback) => {
      const assets = compilation.assets;
      let chunkAllList = [];
      // 先将所有的chunk中的`指定字符词组`存起来
      for (const [pathname, source] of Object.entries(assets)) {
        if (!(pathname.endsWith('js') || pathname.endsWith('.html'))) {
          continue;
        }
        let chunkSourceCode = source.source();
        const chunkSourceLanguageList = getLanguageList(chunkSourceCode, regex);
        // 如果小于0，说明当前文件中没有 `指定字符词组`，不需要替换
        if (chunkSourceLanguageList.length <= 0) continue;
        chunkAllList.push({
          chunkSourceLanguageList,
          chunkSourceLanguageStr: chunkSourceLanguageList.join(separator),
          chunkSourceCode,
          pathname,
        });
      }
      const chunkSourceLanguageStr = chunkAllList
        .map((item) => item.chunkSourceLanguageStr)
        .join('||');

      // 以 - 分隔 chunk
      let data = chunkAllList
        .map((item) => item.chunkSourceLanguageStr)
        .join('||');
      const limit = googleMaxCharLimit - toleranceLimit;
      console.log(limit);
      // 按照谷歌最大字数限制，分割成多个字符串，去请求翻译
      const sourceList = this.getSourceList(data, limit);
      try {
        // 翻译
        const tempTargetList = await Promise.all(
          sourceList.map(async (text) => {
            return await transform({
              translateApiUrl: translateApiUrl,
              text: text,
              from: from,
              to: to,
            });
          })
        );
        let sourceStr = tempTargetList.join('');
        // targetList 中的每一项如 '联系|系鞋带'
        let targetList = sourceStr.split('||');
        // chunk长度对不上,说明翻译有问题。此时应该抛出错误，解决API翻译的问题
        // 如果API翻译有问题，基本整个插件就废了
        // // TODO：这一步应该可以在外部提供一个配置，用于手动校对。
        if (targetList.length !== chunkAllList.length) {
          if (outputTxt) {
            // 出错了则输入日志
            this.writeFile(
              pathname,
              chunkSourceLanguageStr,
              chunkTargetLanguageStr
            );
          }
          console.log(
            `Translation error, chunkSourceLanguageStr length: ${chunkSourceLanguageStr.length}, chunkTargetLanguageStr length: ${chunkTargetLanguageStr.length}`
          );
        } else {
          // chunk数量对得上，但是每一项对不上，也说明翻译有问题,此时应该抛出错误，解决API翻译的问题
          // 如果API翻译有问题，基本整个插件就废了
          const flag = chunkAllList.every((item, index) => {
            return (
              item.chunkSourceLanguageStr.length === targetList[index].length
            );
          });

          if (!flag) {
            if (outputTxt) {
              // 出错了则输入日志
              this.writeFile(
                pathname,
                chunkSourceLanguageStr,
                chunkTargetLanguageStr
              );
            }
            console.log(
              `Translation error, chunkSourceLanguageStr length: ${chunkSourceLanguageStr.length}, chunkTargetLanguageStr length: ${chunkTargetLanguageStr.length}`
            );
          } else {
            for (let i = 0; i < chunkAllList.length; i++) {
              const {
                chunkSourceLanguageStr,
                chunkSourceLanguageList,
                pathname,
                chunkSourceCode,
              } = chunkAllList[i];
              let sourceCode = chunkSourceCode;
              // 将简体转换为繁体
              // TODO: 待优化replace记录位置往后继续替换，减少搜索
              targetList[i].split(separator).forEach((phrase, index) => {
                sourceCode = sourceCode.replace(
                  chunkSourceLanguageList[i],
                  phrase
                );
              });
              if (outputTxt) {
                // 输出原语言与目标语言对照版
                console.log(pathname, chunkSourceLanguageStr);
                this.writeFile(pathname, chunkSourceLanguageStr, targetList[i]);
              }
              compilation.updateAsset(pathname, new RawSource(sourceCode));
            }

            return callback();
          }
        }
      } catch (error) {
        console.log(error);
      }
    });
  }
  writeFile(filename, chunkSourceLanguageStr, chunkTargetLanguageStr) {
    outputFile(
      `======: ${filename} :====== \r\n ${chunkSourceLanguageStr} \r\n ${chunkTargetLanguageStr} \r\n`
    );
  }
  getSourceList(sourceStr, limit) {
    const chunkSplitLimitList = [];
    let len = sourceStr.length;
    let index = 0;
    while (len > 0) {
      let end = index + limit;
      const str = sourceStr.slice(index, end);
      chunkSplitLimitList.push(str);
      index = end;
      len = len - limit;
    }
    return chunkSplitLimitList;
  }
}

module.exports = TransformLanguageWebpackPlugin;
