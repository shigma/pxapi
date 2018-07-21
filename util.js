/**
 * Collect items and stored them in a proxy
 * @param {Array} items Source items
 * @param {object} data Other properties
 * @param {Function} type Related class
 * @returns {Proxy} Collections
 */
function collect(items, data, type) {
  const result = (type instanceof Object) ? items.map((item) => {
    if (item instanceof type) {
      return item
    } else {
      return Reflect.construct(type, [item, data.api])
    }
  }) : items
  result.api = data.api
  result.next = data.next_url
  result.limit = data.search_span_limit
  return new Proxy(result, {
    get(target, key) {
      return Reflect.get(target, key)
    }
  })
}

collect.illusts = (data, api) => collect(data.illusts, {...data, api}, PixivIllust)
collect.novels = (data, api) => collect(data.novels, {...data, api}, PixivNovel)
collect.users = (data, api) => collect(data.user_previews, {...data, api}, PixivUser)
collect.comments = (data, api) => collect(data.comments, {...data, api}, PixivComment)

class PixivUser {
  constructor(data, api) {
    /** General information */
    this.user = data.user
    /** Whether the user is muted */
    this.is_muted = data.is_muted
    /** User profile */
    this.profile = data.profile
    /** User profile publicity */
    this.profile_publicity = data.profile_publicity
    /** User workspace */
    this.workspace = data.workspace
    /** Pixiv API */
    this.api = api
    /** User illustrations */
    this._illusts = collect(data.illusts || [], {api}, PixivIllust)
    /** User novels */
    this._novels = collect(data.novels || [], {api}, PixivNovel)
  }

  /** User id */
  get id() {
    return this.user.id
  }

  /** Get user detail information */
  detail() {
    if (this.api.allowCache && this.profile) return Promise.resolve(this)
    return this.api.search('user', this.id, 'detail', {}, (data) => {
      return Object.assign(this, data)
    })
  }

  /** Get user illustrations */
  illusts() {
    if (this.api.allowCache && this._illusts.length) return Promise.resolve(this._illusts)
    return this.api.search('user', this.id, 'illusts', {}, (data) => {
      this._illusts = collect(data.illusts, {...data, api: this.api}, PixivIllust)
      return this._illusts
    })
  }

  /** Get user novels */
  novels() {
    if (this.api.allowCache && this._novels.length) return Promise.resolve(this._novels)
    return this.api.search('user', this.id, 'novels', {}, (data) => {
      this._novels = collect(data.novels, {...data, api: this.api}, PixivNovel)
      return this._novels
    })
  }

  /**
   * Follow user
   * @param {string} restrict Restriction
   * 
   * Restriction can be `public` or `private`.
   **/
  follow(restrict = 'public') {
    return this.api.postRequest('/v1/user/follow/add', {
      user_id: this.id,
      restrict,
    })
  }

  /** Unfollow user */
  unfollow() {
    return this.api.postRequest('/v1/user/follow/delete', {
      user_id: this.id
    })
  }
}

class PixivIllust {
  constructor(data, api) {
    Object.assign(this, data)
    /** @private Pixiv API */
    this.api = api
  }

  /** Illustrator */
  get author() {
    return new PixivUser({user: this.user}, this.api)
  }

  /** Get illustration detail information */
  detail() {
    if (this.api.allowCache) return Promise.resolve(this)
    return this.api.search('illust', this.id, 'detail', {}, (data) => {
      return Object.assign(this, data)
    })
  }

  /** Get illustration bookmark information */
  bookmark() {
    if (this.api.allowCache && this._bookmark) return Promise.resolve(this._bookmark)
    return this.api.search('illust', this.id, 'bookmarkDetail', {}, (data) => {
      this._bookmark = data
      return data
    })
  }

  /** Get illustration comments */
  comments() {
    if (this.api.allowCache && this._comments) return Promise.resolve(this._comments)
    return this.api.search('illust', this.id, 'comments', {}, (data) => {
      this._comments = collect(data.comments, {...data, api: this.api}, PixivComment)
      return this._comments
    })
  }

  /** Get related illustrations */
  related() {
    if (this.api.allowCache && this._related) return Promise.resolve(this._related)
    return this.api.search('illust', this.id, 'related', {}, (data) => {
      this._related = collect(data.illusts, {...data, api: this.api}, PixivIllust)
      return this._related
    })
  }

  /**
   * Add a comment
   * @param {string} comment Comment
   **/
  addComment(comment) {
    if (!comment) return Promise.reject(new TypeError('comment required'))
    return this.api.postRequest('/v1/illust/comment/add', {
      illust_id: this.id,
      comment
    })
  }

  /**
   * Add bookmark
   * @param {Array<string>} tags Tags to add
   * @param {string} restrict Restriction
   * 
   * Restriction can be `public` or `private`.
   **/
  addBookmark(tags = [], restrict = 'public') {
    if (!(tags instanceof Array)) return Promise.reject(new TypeError('invalid tags'))
    return this.api.postRequest('/v2/illust/bookmark/add', {
      illust_id: this.id,
      restrict,
      tags,
    })
  }

  /** Delete bookmark */
  deleteBookmark() {
    return this.api.postRequest('/v1/illust/bookmark/delete', {
      illust_id: this.id
    })
  }
}

class PixivNovel {
  constructor(data, api) {
    Object.assign(this, data)
    /** @private Pixiv API */
    this.api = api
  }

  /** Author */
  get author() {
    return new PixivUser({user: this.user}, this.api)
  }

  /**
   * Add a comment
   * @param {string} comment Comment
   **/
  addComment(comment) {
    if (!comment) return Promise.reject(new TypeError('comment required'))
    return this.api.postRequest('/v1/novel/comment/add', {
      novel_id: this.id,
      comment
    })
  }

  /**
   * Add bookmark
   * @param {Array<string>} tags Tags to add
   * @param {string} restrict Restriction
   * 
   * Restriction can be `public` or `private`.
   **/
  addBookmark(tags = [], restrict = 'public') {
    if (!(tags instanceof Array)) return Promise.reject(new TypeError('invalid tags'))
    return this.api.postRequest('/v2/novel/bookmark/add', {
      novel_id: this.id,
      restrict,
      tags,
    })
  }

  /** Delete bookmark */
  deleteBookmark() {
    return this.api.postRequest('/v1/novel/bookmark/delete', {
      novel_id: this.id
    })
  }
}

class PixivComment {
  constructor(data, api) {
    Object.assign(this, data)
    /** @private Pixiv API */
    this.api = api
  }

  /** Author */
  get author() {
    return new PixivUser({user: this.user}, this.api)
  }

  /** Get comment replies */
  replies() {
    if (this.api.allowCache && this._replies) return Promise.resolve(this._replies)
    return this.api.search('comment', this.id, 'replies', {}, (data) => {
      this._replies = collect(data.comments, {...data, api: this.api}, PixivComment)
      return this._replies
    })
  }
}

module.exports = {PixivIllust, PixivNovel, PixivComment, PixivUser, collect}