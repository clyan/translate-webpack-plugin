const fetch = require("node-fetch");
/**
 *
 * @param {*} content 打包后的bundle文件内容
 * @returns
 */
function getLanguageList(content, regx) {
  let index = 0;
  let termList = []; // 遍历获取到的中文数组
  let term = "";
  let list;
  while ((list = regx.exec(content))) {
    if (list.index !== index + 1 && term) {
      termList.push(term);
      term = "";
    }
    term += list[0];
    index = list.index;
  }
  if (term !== "") {
    termList.push(term);
  }
  return termList;
}

/**
 *
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
      throw new Error("翻译失败", err);
    });
}

class TransformPlugin {
  constructor(options) {
    const {
      translateApiUrl,
      from = "zh-CN",
      to = "zh-TW",
      separator = "A",
      regx = /[\u4e00-\u9fa5]/g
    } = options;
    if (!translateApiUrl)
      throw new ReferenceError("translateApiUrl 参数不存在");
    this.separator = separator;
    this.translateApiUrl = translateApiUrl;
    this.from = from;
    this.to = to;
    this.regx = regx;
  }
  apply(compiler) {
    compiler.hooks.assetEmitted.tap(
      "TransformPlugin",
      async (
        file,
        { content, source, outputPath, compilation, targetPath }
      ) => {

        // 只替换js文件
        if (!/(.js)$/.test(targetPath)) return;
        console.log("targetPath", targetPath);
        let tempContent = content.toString("utf-8");
        const sourceList = getLanguageList(tempContent, this.regx);

        // 如果小于0，说明当前文件中没有中文，不需要替换
        if (sourceList.length <= 0) return;

        // 翻译
        const targetList = await transform({
          translateApiUrl: this.translateApiUrl,
          text: sourceList.join(this.separator),
          from: this.from,
          to: this.to,
          separator: this.separator,
        });
        if (targetList.length <= 0) return content;

        // TODO: 替换
        targetList.forEach((phrase, index) => {
          tempContent.replace(sourceList[index], phrase);
        });
        console.log("targetList", targetList); // 打印中文数据

        // TODO: 写入
        return tempContent;
      }
    );
  }
}

module.exports = TransformPlugin;
