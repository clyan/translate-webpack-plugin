<h1 align="center">translate-webpack-plugin</h1>

<p align="center">A plug-in for automatic language conversion, unlike i18N, no need to write multiple sets of language files, With Google API translation, you only need to write one language and convert it to any other language</p>

English | [简体中文](./README.zh-CN.md)
## Introduction
This plug-in was born in the scenario of converting simplified Chinese to traditional Chinese, and other scenarios have not been tested，In theory, you only need to write the regularity of the corresponding language, you can convert it into any other language
regular expression
## Pre-Wrok
The plugin relies on Google Translate API, but Google API is charged. Fortunately, there is a free API based on Puppeteer. In theory, the service based on Puppeteer will not hang, so you need to start from [Translateer](git@ github.com:ywymoshi/Translateer.git) or [translate-webpack-plugin](git@github.com:ywymoshi/translate-webpack-plugin.git) Pull the code from the `api` directory of the repository and deploy the service locally or on the server.

Note: The server deploying the API service needs to be able to access `https://translate.google.cn/` (Scientific Internet).
**Clone Code**
```bash
git clone git@github.com:ywymoshi/Translateer.git
```
**Install Dependencies**
```bash
npm install 
```
**Run**
```bash
npm run dev
```
The default port is 8999. If your current IP is 127.0.0.1, then your translation api address is: `http://127.0.0.1:8999/api` (Modify it yourself)
## Install
### Webpack5.0
```bash
  npm i --save-dev translate-webpack-plugin
```

```bash
  yarn add --dev translate-webpack-plugin
```
### Webpack4.0
```bash
  npm i --save-dev translate-webpack-plugin@4
```

```bash
  yarn add --dev translate-webpack-plugin@4
```

## Usage

**vue.config.js**
```javascript
const TranslateWebpackPlugin = require('translate-webpack-plugin');
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new TranslateWebpackPlugin({
        translateApiUrl: 'http://127.0.0.1:8999/api',
        from: 'zh-CN',
        to: 'zh-TW',
        separator: '|',
        regex: /[\u4e00-\u9fa5]/g,
        outputTxt: true,
      }),
    ],
  },
});
```

## Option

|Name|Type|Default|Require|Description|
|:--:|:--:|:------:|:--:|:----------|
|**`translateApiUrl`**|`String`|`''`|`true`|`Address of the API`|
|**`from`**|`String`|`'zh-CN'`|`true`|`source language`|
|**`to`**|`String`|`'zh-TW'`|`true`|`target language`|`internally`|
|**`separator`**|`String`|`'\|'`|`false`|`A language separator, a character used to delimit multiple phrases`|
|**`regex`**|`RegExp`|`/[\u4e00-\u9fa5]/g`|`true`|`A regular expression that matches the source language`|
|**`outputTxt`**|`Boolean`|`false`|`false`|`Used to output the source language and target language comparison, convenient to check for errors`|

## Basic Principles
1. Take Simplified Chinese to Traditional Chinese as an example
2. Need a free, accurate, and easy-to-hang translation service, using Google API based on Puppeteer
3. Write a webpack plug-in, and read the content matched by the regular expression during the compilation process, in units of phrases, for example, the source code contains `<p>disconnected</p><div>tie shoelaces</div> , returns: ['missing', 'tying shoelaces']`
4. Separate the returned character array with a `delimiter`, such as `['disconnected', 'tie shoelace']` => `disconnected'|'tie shoelace'`, the reason for separation: such as Chinese Simplified => Traditional Chinese (there are polymorphic characters): Lost contact shoelace => Lost contact shoelace, and the correct result should be `lost contact shoelace`, `lost contact` is a phrase, `tie shoelace` is A phrase will not change after conversion, and when `connection` is together, it will become `connection`
5. Convert the translated result into an array with the `delimiter`, and traverse all the simplified characters in the code to replace the traditional characters