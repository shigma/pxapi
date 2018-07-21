/**
 * Collect items and stored them in a proxy
 * @param {Array} items Source items
 * @param {object} data Other properties
 * @param {Function} type Related class
 * @returns {Proxy} Collections
 */
function collect(items, data, type) {
  const result = items.map((item) => {
    if (item instanceof type) {
      return item
    } else {
      return Reflect.construct(type, [item, data.api])
    }
  })
  result.api = data.api
  result.next = data.next_url
  result.limit = data.search_span_limit
  return new Proxy(result, {
    get(target, key) {
      return Reflect.get(target, key)
    }
  })
}

const collectIllusts = (data, api) => collect(data.illusts, {...data, api}, PixivIllust)
const collectNovels = (data, api) => collect(data.novels, {...data, api}, PixivNovel)
const collectUsers = (data, api) => collect(data.user_previews, {...data, api}, PixivUser)

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
    /** @private Pixiv API */
    this.api = api
    /**
     * @private Illustrations
     * @type {Proxy} Collections
     **/
    this._illusts = collect(data.illusts || [], {api}, PixivIllust)
    /**
     * @private Novels
     * @type {Proxy} Collections
     **/
    this._novels = collect(data.novels || [], {api}, PixivNovel)
  }

  /** User id */
  get id() { return this.user.id }

  /** Get user detail information */
  detail() {
    if (this.api.allowCache && this.profile) return Promise.resolve(this)
    return this.api.search('user', this.id, 'detail', {}, (data) => {
      this.user = data.user
      this.is_muted = data.is_muted
      this.profile = data.profile
      this.profile_publicity = data.profile_publicity
      this.workspace = data.workspace
      return this
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
}

class PixivIllust {
  constructor(data, api) {
    Object.assign(this, data)
    /** @private Pixiv API */
    this.api = api
  }
}

class PixivNovel {
  constructor(data, api) {
    Object.assign(this, data)
    /** @private Pixiv API */
    this.api = api
  }
}

module.exports = {
  word: {
    _key: 'word',
    illust: {
      url: '/v1/search/illust',
      options() {
        return {
          target: 'partial_match_for_tags',
          sort: this.auth.user.is_preminum ? 'popular_desc' : 'date_desc'
        }
      },
      then: collectIllusts
    },
    illustPopularPreview: {
      url: '/v1/search/popular-preview/illust',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collectIllusts
    },
    illustBookmarkRanges: {
      url: '/v1/search/bookmark-ranges/illust',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collectIllusts
    },
    novel: {
      url: '/v1/search/novel',
      options() {
        return {
          target: 'partial_match_for_tags',
          sort: this.auth.user.is_preminum ? 'popular_desc' : 'date_desc'
        }
      },
      then: collectNovels
    },
    novelPopularPreview: {
      url: '/v1/search/popular-preview/novel',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collectNovels
    },
    novelBookmarkRanges: {
      url: '/v1/search/bookmark-ranges/novel',
      options: {
        target: 'partial_match_for_tags',
      },
      then: collectNovels
    },
    user: {
      url: '/v1/search/user',
      then: collectUsers
    },
    autoComplete: {
      url: '/v1/search/autocomplete',
      then: data => data.search_auto_complete_keywords
    }
  },
  user: {
    _key: 'user_id',
    detail: {
      url: '/v1/user/detail',
      then: (data, api) => new PixivUser(data, api)
    },
    illusts: {
      url: '/v1/user/illusts',
      then: collectIllusts
    },
    novels: {
      url: '/v1/user/novels',
      then: collectNovels
    },
    bookmarkIllusts: {
      url: '/v1/user/bookmarks/illust',
      options: {
        restrict: 'public'
      },
      then: collectIllusts
    },
    bookmarkTags: {
      url: '/v1/user/bookmark-tags/illust',
      options: {
        restrict: 'public'
      }
    },
  }
}
