const TranslateLanguageWebpackPlugin = require('translate-language-webpack-plugin');
module.exports = {
  configureWebpack: {
    plugins: [
      new TranslateLanguageWebpackPlugin({
        translateApiUrl: 'http://127.0.0.1:8999/api/post',
        from: 'zh-CN',
        to: 'zh-TW',
        separator: '-',
        regex: /[\u4e00-\u9fa5]/g,
        outputTxt: true,
      }),
    ],
  },
};
