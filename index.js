const QS = require('querystring')
const {URL} = require('url')
const Hosts = require('./hosts.js')
const searchData = require('./search')

const BASE_URL = 'https://app-api.pixiv.net'
const CLIENT_ID = 'KzEZED7aC0vird8jWyHM38mXjNTY'
const CLIENT_SECRET = 'W9JZoJe00qPvJsiyCGT3CCtC6ZUtdpKpzMbNlUGP'

function catcher(error) {
  if (error.response) {
    throw error.response.data
  } else {
    throw error.message
  }
}

function toKebab(source) {
  if (typeof source === 'string') {
    return source.replace(/-/g, '_')
      .replace(/[A-Z]/g, char => '_' + char.toLowerCase())
  } else {
    const result = {}
    for (const key in source) {
      result[toKebab(key)] = toKebab(source[key])
    }
    return result
  }
}

function _wrap(source) {
  if (!(source instanceof Promise)) return source
  return new Proxy(source, {
    get(target, property) {
      if (property in Promise.prototype) {
        return (...args) => {
          return _wrap(target[property].apply(target, args))
        }
      } else {
        return (...args) => _wrap(target.then((result) => {
          return result[property](...args)
        }))
      }
    }
  })
}

const AsyncWrapper = new Proxy(Promise, {
  construct: (_, args) => _wrap(new Promise(...args)),
  get: (target, property) => _wrap(target[property])
})

const supportedLanguages = ['zh', 'zh-TW', 'en', 'ja']

class PixivAPI {
  constructor({
    library,
    hosts,
    allowCache = true,
    timeout = 20000,
    language = 'en-US'
  } = {}) {
    /** Web library */
    this.library = library || require('https')
    /** Host map */
    this.hosts = new Hosts(hosts || Hosts.default)
    /** Default headers */
    this.headers = {
      'App-OS': 'ios',
      'App-OS-Version': '9.3.3',
      'App-Version': '7.1.11',
      'User-Agent': 'PixivIOSApp/7.1.11 (iOS 9.0; iPhone8,2)',
    }
    /** Whether to allow cache */
    this.allowCache = allowCache
    /** Socket timeout */
    this.timeout = timeout
    /** Set language */
    this.language = language
  }

  get language() {
    return this.headers['Accept-Language']
  }

  set language(value) {
    this.headers['Accept-Language'] = value
  }

  /**
   * @private Request without authorization
   * @param {string|URL} url URL
   * @param {string} method Method
   * @param {object} headers Headers
   * @param {string|object} postdata Data
   **/
  request({url, method, headers, postdata}) {
    if (!(url instanceof URL)) {
      url = new URL(url, BASE_URL)
    }
    return new AsyncWrapper((resolve, reject) => {
      let data = ''
      const request = this.library.request({
        method: method || 'GET',
        headers: Object.assign({
          Host: url.hostname
        }, this.headers, headers),
        hostname: this.hosts.getHostName(url.hostname),
        servername: url.hostname,
        path: url.pathname + url.search,
      }, (response) => {
        response.on('data', chunk => data += chunk)
        response.on('end', () => {
          try {
            return resolve(JSON.parse(data))
          } catch (err) {
            return reject(new Error(`An error is encounted in ${data}\n${err}`))
          }
        })
      })
      request.on('error', error => reject(error))
      if (postdata instanceof Object) {
        request.write(QS.stringify(postdata))
      } else if (typeof postdata === 'string') {
        request.write(postdata)
      }
      request.end()
      setTimeout(() => {
        request.abort()
      }, this.timeout)
    })
  }

  /**
   * Log in your pixiv account
   * @param {string} username User Name
   * @param {string} password Password
   * @param {boolean} remember Whether to remember password
   */
  login(username, password, remember = true) {
    if (!username) return AsyncWrapper.reject(new TypeError('username required'))
    if (!password) return AsyncWrapper.reject(new TypeError('password required'))
    return this.request({
      url: 'https://oauth.secure.pixiv.net/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      postdata: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        get_secure_url: 1,
        grant_type: 'password',
        username,
        password,
      }
    }).then((data) => {
      if (data.response) {
        /** Authorization Information */
        this.auth = data.response
        /** Whether to remember password */
        this.remember = !!remember
        if (remember) {
          /** User name */
          this.username = username
          /** Password */
          this.password = password
          this.headers.Authorization = `Bearer ${data.response.access_token}`
        }
        return data.response
      } else if (data.has_error) {
        throw data.errors.system
      } else {
        console.error('An unknown error was encounted.')
        throw data
      }
    }).catch(catcher)
  }

  /** Log out your pixiv account */
  logout() {
    this.auth = null
    this.username = null
    this.password = null
    this._user_state = null
    delete this.headers.Authorization
  }

  /**
   * Refresh access token
   * @param {string} token Refreshing token
   */
  refreshAccessToken(token = this.auth ? this.auth.refresh_token : null) {
    if (!token) return AsyncWrapper.reject(new TypeError('refresh_token required'))
    return this.request({
      url: 'https://oauth.secure.pixiv.net/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      postdata: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        get_secure_url: 1,
        grant_type: 'refresh_token',
        refresh_token: token,
      }
    }).then((data) => {
      this.auth = data.response
      return data.response
    }).catch(catcher)
  }

  /**
   * Create provisional account
   * @param {string} nickname Nickname
   */
  createProvisionalAccount(nickname) {
    if (!nickname) return AsyncWrapper.reject(new TypeError('nickname required'))
    return this.request({
      url: 'https://accounts.pixiv.net/api/provisional-accounts/create',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Bearer WHDWCGnwWA2C8PRfQSdXJxjXp0G6ULRaRkkd6t5B6h8',
      },
      postdata: {
        ref: 'pixiv_ios_app_provisional_account',
        user_name: nickname,
      }
    }).then(data => data.body).catch(catcher)
  }

  /**
   * @private Request with authorization
   * @param {URL} url URL
   * @param {object} options Options
   * @param {string} options.method Method
   * @param {object} options.headers Headers
   * @param {object} options.postdata Postdata
   */
  authRequest(url, options = {}) {
    if (!url) return AsyncWrapper.reject(new TypeError('Url cannot be empty'))
    if (!this.auth) return AsyncWrapper.reject(new Error('Authorization required'))
    options.url = url
    options.headers = options.headers || {}
    return this.request(options).catch((error) => {
      if (this.remember && this.username && this.password) {
        return this.parent.login(this.username, this.password).then(() => {
          return this.request(options)
        })
      }
      throw error
    })
  }

  /**
   * @private Post request with authorization
   * @param {URL} url URL
   * @param {string|object} postdata Postdata
   */
  postRequest(url, postdata) {
    return this.authRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      postdata
    })
  }

  /** Get pixiv user state (authorization required) */
  userState() {
    if (this.allowCache && this._user_state) {
      return AsyncWrapper.resolve(this._user_state)
    }
    return this.authRequest('/v1/user/me/state').then((data) => {
      if (data.user_state) {
        this._user_state = data.user_state
        return data.user_state
      } else {
        throw data
      }
    })
  }

  /**
   * Edit user account (authorization required)
   * @param {object} info Information
   * @param {string} info.password Current password
   * @param {string} info.pixivId New pixiv account
   * @param {string} info.newPassword New password
   * @param {string} info.email New mail address
   */
  editUserAccount(info) {
    if (!info) return AsyncWrapper.reject(new TypeError('info required'))
    const postdata = {}
    if (info.password) postdata.current_password = info.password
    if (info.pixivId) postdata.new_user_account = info.pixivId
    if (info.newPassword) postdata.new_password = info.newPassword
    if (info.email) postdata.new_mail_address = info.email
    return this.postRequest('https://accounts.pixiv.net/api/account/edit', postdata)
  }

  /** Send account verification email (authorization required) */
  sendAccountVerificationEmail() {
    return this.postRequest('/v1/mail-authentication/send')
  }

  /**
   * @private Search (authorization required)
   * @param {string} category Search category
   * @param {string} key Search key
   * @param {string} type Search type
   * @param {object} options Search options
   * @param {Function} callback Callback
   */
  search(category, key, type, options, callback) {
    if (!searchData[category][type]) {
      return AsyncWrapper.reject(new RangeError(`"${type}" is not a supported type.`))
    } else {
      const search = searchData[category][type]
      const query = {filter: 'for_ios'}
      if (searchData[category]._key) {
        if (!key) return AsyncWrapper.reject(new TypeError('key required'))
        query[searchData[category]._key] = key
      }
      if (search.options instanceof Function) {
        Object.assign(query, search.options.call(this))
      } else if (search.options instanceof Object) {
        Object.assign(query, search.options)
      }
      let request = this.authRequest(`${search.url}?${
        QS.stringify(Object.assign(query, toKebab(options)))
      }`)
      callback = callback || search.then
      if (callback) request = request.then(data => callback(data, this))
      return request
    }
  }

  /**
   * Search by word (authorization required)
   * @param {string} word Search keyword
   * @param {string} type Search type
   * @param {object} options Search options
   * 
   * - Supported types: `illust`, `illustPopularPreview`, `illustBookmarkRanges`,
   * `novel`, `novelPopularPreview`, `novelBookmarkRanges`, `user`, `autoComplete`.
   * - Supported options: `searchTarget`, `sort`.
   * - Supported search target: `partialMatchForTags`, `exactMatchForTags`, `titleAndCaption`.
   * - Supported sorting method: `dateDesc`, `dateAsc`,
   * `popularDesc`(only available for pixiv premium member).
   * 
   * All options can be in either kebab-cases or snake-cases.
   */
  searchWord(word, type, options = {}) {
    return this.search('word', word, type, options)
  }

  /**
   * Search by user (authorization required)
   * @param {number} id User id
   * @param {string} type Search type
   * @param {object} options Search options
   * 
   * - Supported types: `detail`(default), `myPixiv`,
   * `illusts`, `bookmarkIllusts`, `bookmarkIllustTags`,
   * `novels`, `bookmarkNovels`, `bookmarkNovelTags`,
   * `following`, `follower`, `followDetail`.
   * - Supported options: `restrict`.
   * - Supported restrictions: `all`, `public`, `private`.
   * 
   * All options can be in either kebab-cases or snake-cases.
   */
  searchUser(id, type, options = {}) {
    return this.search('user', id, type, options)
  }

  /**
   * Search by illustration (authorization required)
   * @param {number} id Illustration id
   * @param {string} type Search type
   * 
   * - Supported types: `detail`(default), `bookmarkDetail`,
   * `comments`, `related`, `metadata`.
   */
  searchIllust(id, type = 'detail') {
    return this.search('illust', id, type)
  }

  /**
   * Search by novel (authorization required)
   * @param {number} id Novel id
   * @param {string} type Search type
   * 
   * - Supported types: `detail`(default), `text`, `bookmarkDetail`, `comments`.
   */
  searchNovel(id, type = 'detail') {
    return this.search('novel', id, type)
  }

  /**
   * Search by comment (authorization required)
   * @param {number} id Comment id
   * @param {string} type Search type
   * 
   * - Supported types: `replies`(default).
   */
  searchComment(id, type = 'replies') {
    return this.search('comment', id, type)
  }

  /**
   * Search by series (authorization required)
   * @param {number} id Series id
   * @param {string} type Search type
   * 
   * - Supported types: `detail`(default).
   */
  searchSeries(id, type = 'detail') {
    return this.search('series', id, type)
  }

  /**
   * Get users
   * @param {string} type Search type
   * 
   * - Supported types: `recommended`(default), `new`.
   */
  getUsers(type = 'recommended', options = {}) {
    return this.search('get_users', null, type, options)
  }

  /**
   * Get illustrations
   * @param {string} type Illustration type
   * @param {object} options Search options
   * 
   * - Supported types: `recommended`(default), `new`, `follow`,
   * `walkthrough`, `ranking`, `myPixiv`, `trendingTags`.
   * - Supported options: `restrict`, `mode`.
   * - Supported restrictions: `all`, `public`, `private`.
   * - Supported modes: `day`, `week`, `month`, `day_male`, `day_female`,
   * `week_original`, `week_rookie`, `day_r18`, `day_male_r18`, `day_female_r18`,
   * `week_r18`, `week_r18g`, `day_manga`, `week_manga`, `month_manga`,
   * `week_rookie_manga`, `day_r18_manga`, `week_r18_manga`, `week_r18g_manga`.
   * 
   * All options can be in either kebab-cases or snake-cases.
   */
  getIllusts(type = 'recommended', options = {}) {
    return this.search('get_illusts', null, type, options)
  }

  /**
   * Get novels
   * @param {string} type Novel type
   * @param {object} options Search options
   * 
   * - Supported types: `recommended`(default), `new`, `follow`,
   * `ranking`, `myPixiv`, `trendingTags`.
   * - Supported options: `mode`.
   * - Supported modes: `day`, `week`, `month`, `day_male`, `day_female`,
   * `week_original`, `week_rookie`, `day_r18`, `day_male_r18`, `day_female_r18`,
   * `week_r18`, `week_r18g`, `day_manga`, `week_manga`, `month_manga`,
   * `week_rookie_manga`, `day_r18_manga`, `week_r18_manga`, `week_r18g_manga`.
   * 
   * All options can be in either kebab-cases or snake-cases.
   */
  getNovels(type = 'recommended', options = {}) {
    return this.search('get_novels', null, type, options)
  }

  /**
   * Get mangas
   * @param {string} type Search type
   * 
   * - Supported types: `recommended`(default), `new`.
   */
  getMangas(type = 'recommended') {
    return this.search('get_mangas', null, type)
  }
}

module.exports = PixivAPI