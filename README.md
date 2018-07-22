# Pixiv API Client

这是受到 [alphasp](https://github.com/alphasp/pixiv-api-client) 启发而开发的一套 Pixiv 客户端函数库。相比原仓库增加了以下优点：

- 完全使用 NodeJS 原生库编写，无需任何依赖。
- 支持 https 等多种网络库，登录信息更加安全。
- 自带 hosts 接口，可以实现自动翻墙功能。
- 同时支持 camel-case，kebab-case 和 snake-case。
- 减少了 API 的数量和长度，专注于 API 的功能和逻辑。
- 完全基于 Promise 的同时也允许你像同步函数一样编程。
- 当检测到 premium 用户时自动启动按热度排序。
- 所有函数使用 jsDoc 进行注释，便于阅读。

## 文档

下面的文档将介绍 Pixiv API Client 的使用方法。我会按照类的顺序依次介绍：
- AsyncWrapper
- Collection
- PixivAPI
- PixivUser
- PixivNovel
- PixivIllust
- PixivComment

### AsyncWrapper

AsyncWrapper 是一个 Proxy，可以用来简化 Promise 的书写。看一个例子：

```JavaScript
const pixiv = new PixivApi()
pixiv.login(username, password).then(() => {
  pixiv
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
}).catch(console.log)
```

Pixiv API Client 中的几乎所有函数都是异步的，但你不必使用大量的`then`，因为 AsyncWrapper 为你做好了相关的绑定工作。你只需要像同步函数一样书写，同时记得最后加上补完异步的逻辑即可。

### Collection

Collection 也是一个 Proxy，可以用来简化数组的更新。一些请求列表的 API 并不会一次性地返回所有结果，而是只会返回一部分，这时候 Collection 会自动检测所需的数据，并按需自行向列表中添加。

除了支持 Array 的所有属性和方法外，Collection 还有下列实例属性和方法：

#### coll.next: string | null

返回数组中下一批未加载的数据的 URL。如果已经没有下一批数据则返回 null。

#### coll.itemAt(index: number): AsyncWrapper

- index: 元素的序号，从 1 开始计数。
- 返回: 当前数组中的第 index 个元素。

### PixivAPI

PixivAPI 是这个库的入口。它可以由一个构造函数来创建实例。每个实例会绑定一个账号，实例中大部分的方法都需要注册过的账号，否则会返回一个 Authorization required 错误。它有一些配置可以通过构造函数实现：

#### new PixivAPI({library?: {request: Function}, hosts?: string | object})

- library: 要使用的网络库，必须有一个 request 方法。默认值为`require('https')`。
- hosts: 要使用的 Hosts。可以是一个字符串，格式为 hosts 文件的格式。也可以是一个对象，键形如`pixiv.pximg.net`，对应的值是其 IP 地址。如果不写则默认为我们自带的 hosts。如果不想使用 hosts 只需使用空对象`{}`即可。

PixivAPI 有下列实例方法：

#### pixiv.setLanguage(language: string): void

#### pixiv.login(username: string, password: string, remember?: boolean): AsyncWrapper

#### pixiv.logout(): void

#### pixiv.logout(): void

#### pixiv.refreshAccessToken(token?: string): AsyncWrapper

#### pixiv.createProvisionalAccount(nickname: string): AsyncWrapper

#### pixiv.userState(): AsyncWrapper

#### pixiv.editUserAccount({password?: string, pixivId?: string, newPassword?: string, email?: string}): AsyncWrapper

#### pixiv.sendAccountVerificationEmail(): AsyncWrapper

#### Search API

Search API 包含 searchWord，searchUser，searchIllust，searchNovel，searchComment 和 searchSeries。它们的使用方法类似，我们一并介绍。

#### Get API

Get API 包含 getUsers，getIllusts，getNovels，getMangas。它们的使用方法类似，我们一并介绍。

### PixivUser
### PixivNovel
### PixivIllust
### PixivComment

