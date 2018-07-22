# Pixiv API Client

这是受到 [alphasp](https://github.com/alphasp/pixiv-api-client) 启发而开发的一套 Pixiv 客户端函数库。相比原仓库增加了以下优点：

- 完全使用 NodeJS 原生库编写，无需任何依赖。
- 支持 https 等多种网络库，登录信息更加安全。
- 自带 hosts 接口，可以实现自动翻墙功能。
- 同时支持 camel-case 和 snake-case。
- 减少了 API 的数量和长度，增强了 API 的功能和逻辑。
- 完全基于 Promise 的同时也允许你[像同步函数一样编程](#AsyncWrapper)。
- 当检测到 premium 用户时自动启动按热度排序。
- 所有函数使用 jsDoc 进行注释，便于阅读。

本程序仍在开发中，文档敬请期待。

### AsyncWrapper

AsyncWrapper 专门为这个库而设计，可以用来简化 Promise 的书写。看一个例子：

```JavaScript
pixiv
  .login(username, password) // 登录账号
  .searchIllust(68910277) // 查找某一部作品
  .author() // 作品的作者
  .illusts() // 作者的全部作品
  .itemAt(2) // 第 2 个作品
  .comments() // 作品的全部评论
  .itemAt(1) // 第 1 个评论
  .author() // 评论的作者
  .following() // 作者的关注
  .itemAt(5) // 第 5 个关注
  .detail() // 用户的详细信息
  .then(console.log)
  .catch(console.log)
```

Pixiv API Client 中的几乎所有函数都是异步的，但你不必使用大量的`then`，因为 AsyncWrapper 为你做好了相关的绑定工作。你只需要像同步函数一样书写，同时记得最后加上补完异步的逻辑即可。
