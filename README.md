# Pixiv API Client

这是受到 [alphasp](https://github.com/alphasp/pixiv-api-client) 启发而开发的一套 Pixiv 客户端函数库。相比原仓库增加了以下优点：

- 完全使用 NodeJS 原生库编写，无需任何依赖。
- 支持 https 等多种网络库，登录信息更加安全。
- 自带 hosts 接口，可以实现自动翻墙功能。
- 同时支持 camel-case 和 snake-case。
- 当检测到 premium 用户时自动启动按热度排序。
- 所有函数使用 jsDoc 进行注释，便于阅读。

本程序仍在开发中，文档敬请期待。
