

const { sources, Compilation } = require('webpack');
const path = require('path');
const fetch = require('node-fetch');
const fse = require('fs-extra');

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

/**
 * @param {*} { translateApiUrl: 翻译APi地址， text: 需要翻译的文本， from: 源语言， to: 目标语言, separator: 词组分割符}
 * @returns
 */
function transform({ translateApiUrl, text, from, to, separator }) {
  let url = `${translateApiUrl}?text=${text}&from=${from}&to=${to}`;
  return fetch(url)
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      return res.result.split(separator);
    })
    .catch((err) => {
      throw new Error(
        'Translation error, Check that the API is available',
        err
      );
    });
}

const TRANSFROMSOURCETARGET = 'transform-source-target.txt';

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
  // 先清空，再写入
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

class TransformWebpackPlugin {
  constructor(
    options = {
      translateApiUrl: '',
      from: 'zh-CN',
      to: 'zh-TW',
      separator: '|',
      regex: /[\u4e00-\u9fa5]/g,
      outputTxt: false,
    }
  ) {
    if (!options.translateApiUrl)
      throw new ReferenceError('The translateApiUrl parameter is required');
    this.options = options;
  }
  apply(compiler) {
    const { separator, translateApiUrl, from, to, regex, outputTxt } =
      this.options;
    const outputNormal = {};
    const sourceAllList = {};
    const targetAllList = {};
    compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tapAsync(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        async (assets, callback) => {
          for (const [pathname, source] of Object.entries(assets)) {
            const dest = compiler.options.output.path;
            const outputPath = path.resolve(dest, pathname);
            if (!(pathname.endsWith('js') || pathname.endsWith('.html'))) {
              continue;
            }
            let sourceCode = source.source();
            const sourceList = getLanguageList(sourceCode, regex);
            // 如果小于0，说明当前文件中没有中文，不需要替换
            if (sourceList.length <= 0) continue;

            // 翻译
            const targetList = await transform({
              translateApiUrl: translateApiUrl,
              text: sourceList.join(separator),
              from: from,
              to: to,
              separator: separator,
            });

            // 如果翻译后的结果与原数组的长度不一致，说明翻译有问题。此时应该抛出错误，解决API翻译的问题
            // 如果API翻译有问题，基本整个插件就废了
            // TODO：这一步应该可以在外部提供一个配置，用于手动校对。
            if (targetList.length !== sourceList.length) {
              throw new Error(
                `Translation error, sourceList length: ${sourceList.length}, targetList length: ${targetList.length}`
              );
            }
            // 将简体转换为繁体
            // TODO: 待优化replace记录位置往后继续替换，减少搜索
            targetList.forEach((phrase, index) => {
              sourceCode = sourceCode.replace(sourceList[index], phrase);
            });

            if (outputTxt) {
              sourceAllList[outputPath] = sourceList.join(separator);
              targetAllList[outputPath] = targetList.join(separator);
            }

            outputNormal[outputPath] = {
              filename: pathname,
              content: sourceCode,
              size: Buffer.from(sourceCode, 'utf-8').length,
            };
            // 一定要写return, 不然没用
            return callback();
          }
        }
      );

      compilation.hooks.afterProcessAssets.tap(pluginName, () => {
        if (outputTxt) {
          // 输出前先清空目标文件
          clearFile();
        }
        for (const [key, value] of Object.entries(outputNormal)) {
          if (outputTxt) {
            // 输出原语言与目标语言对照版
            outputFile(
              `======: ${outputNormal[key].filename} :====== \r\n ${sourceAllList[key]} \r\n ${targetAllList[key]} \r\n`
            );
          }

          compilation.updateAsset(
            value.filename,
            new sources.RawSource(value.content)
          );
        }
      });
    });
  }
}

module.exports = TransformWebpackPlugin;
