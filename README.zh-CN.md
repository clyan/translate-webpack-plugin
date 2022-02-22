<h1 align="center">translate-language-webpack-plugin</h1>

<p align="center">一款用于自动化转换语言的插件，不同于i18n, 无需写多套语言文件, 采用谷歌API进行翻译，只需要编写一种语言，即可转换为其他任意语言</p>

[English](./README.md) | 简体中文

## 简介

该插件诞生于中文简体转中文繁体场景下，其他场景未测试，理论上只需要编写匹配对应语言的正则，即可转移成任意其他语言，

## 前置工作

该插件依赖于谷歌翻译 API，但是谷歌 API 是收费的，幸运的是，这里有一个基于 Puppeteer 免费 API,理论上基于 Puppeteer 该服务是不会挂掉的, 所以需要先从 [Translateer](git@github.com:ywymoshi/Translateer.git) 或者 [translate-language-webpack-plugin](git@github.com:ywymoshi/translate-language-webpack-plugin.git)仓库的`api`目录 拉取代码在本地或服务器部署服务。

注意：部署 API 服务的服务器需要能访问`https://translate.google.cn/`（科学上网）。

**clone 代码**

```bash
  git clone git@github.com:ywymoshi/Translateer.git
```

**安装依赖**

```bash
npm install
```

**运行**

```bash
npm run dev
```

默认端口为8999，如当前你的ip为127.0.0.1，那么你的翻译api地址为: `http://127.0.0.1:8999/api/post` (自行修改)

## 安装

### Webpack5.0

```bash
  npm i --save-dev translate-language-webpack-plugin
```

```bash
  yarn add --dev translate-language-webpack-plugin
```

### Webpack4.0

```bash
  npm i --save-dev translate-language-webpack-plugin@4
```

```bash
  yarn add --dev translate-language-webpack-plugin@4
```

## 使用

**vue.config.js**

```javascript
const TranslateWebpackPlugin = require('translate-language-webpack-plugin');
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new TranslateWebpackPlugin({
        translateApiUrl: 'http://127.0.0.1:8999/api/post',
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

## 选项

|名称|类型|默认值|描述|
|:--:|:--:|:-----:|:----------|
|**`translateApiUrl`**|`String`|`''`|`API地址`|
|**`from`**|`String`|`'zh-CN'`|`源语言`|
|**`to`**|`String`|`'zh-TW'`|`目标语言`|
|**`separator`**|`String`|`'\|'`|`语言分割符， 用于内部多个词组分隔的字符, 示情况调整默认值`|
|**`regex`**|`RegExp`|`/[\u4e00-\u9fa5]/g`|`用于匹配源语言的正则表达式`|
|**`outputTxt`**|`Boolean`|`false`|`用于输出源语言与目标语言的对照，方便查看是否有误`|
|**`limit`**|`number`|`850`|`用于限制最大字符长度，默认为850，因为中文每个汉字encode后为9倍，谷歌最大支持url长度8124 (正尝试Api使用FireFox)`|

如果您觉得这个项目还不错, 可以在 Github 上面帮我点个 star, 支持一下作者 ☜(ﾟヮﾟ ☜)

## 基本原理

1. 以中文简体转中文繁体为例子
2. 需要一个免费、准确、且不易挂的翻译服务，采用基于Puppeteer的谷歌API
3. 编写webpack插件，在编译过程中读取正则表达式匹配到的内容，以词组为单位，如，源码中含有`<p>失联</p><div>系鞋带</div>,  返回： ['失联', '系鞋带']`
4. 将返回的字符数组，以`分隔符分隔`，如`['失联', '系鞋带']` => `失联'|'系鞋带'` , 分隔的原因： 如中文简体 => 中文繁体(存在多形字)：失联系鞋带 => 失聯繫鞋帶, 而正确的结果应该是 `失联系鞋带`， `失联`是一个词组，`系鞋带`是一个词组，转换后不会有变化的， 而`联系`在一起的时候就会变成 `聯繫`
5. 将翻译后的结果，以`分隔符` 转换为数组，遍历将代码中的简体全部替换繁体

## 案例

![](https://s2.loli.net/2022/02/21/ah9qt4jIrwbSu7J.png)
