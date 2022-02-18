const { defineConfig } = require("@vue/cli-service");
const TranslateWebpackPlugin = require("../TranslateWebpackPlugin");
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new TranslateWebpackPlugin({
        translateApiUrl: "http://127.0.0.1:8999/api",
        from: "zh-CN",
        to: "zh-TW",
        separator: "|",
        regex: /[\u4e00-\u9fa5]/g,
      }),
    ],
  },
});
