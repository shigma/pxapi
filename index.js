const QS = require('querystring')
const URL = require('url').URL
const Hosts = require('./hosts.js')

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

class PixivAPI {
  constructor({library, hosts} = {}) {
    /** Web library */
    this.library = library || require('https')
    /** Host map */
    this.hosts = new Hosts(hosts || Hosts.default)
    /** Default headers */
    this.headers = {
      'App-OS': 'ios',
      'Accept-Language': 'en-us',
      'App-OS-Version': '9.3.3',
      'App-Version': '7.1.11',
      'User-Agent': 'PixivIOSApp/7.1.11 (iOS 9.0; iPhone8,2)',
    }
  }

  /**
   * Log in your pixiv account
   * @param {string} username User Name
   * @param {string} password Password
   * @param {boolean} remember Whether to remember password
   */
  login(username, password, remember) {
    if (!username) return Promise.reject(new TypeError('username required'))
    if (!password) return Promise.reject(new TypeError('password required'))
    return this._request({
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
      /** Authorization Information */
      this.auth = data.response
      /** Whether to remember password */
      this.remember = remember === false
      if (remember) {
        /** User name */
        this.username = username
        /** Password */
        this.password = password
      }
      return data.response
    }).catch(catcher)
  }

  /** Log out your pixiv account */
  logout() {
    this.auth = null
    this.username = null
    this.password = null
    delete this.headers.Authorization
    return Promise.resolve()
  }

  /** Get authorization information */
  authInfo() {
    return this.auth
  }

  /**
   * Refresh access token
   * @param {string} token Refresh token
   */
  refreshAccessToken(token = this.auth ? this.auth.refresh_token : null) {
    if (!token) return Promise.reject(new TypeError('refresh_token required'))
    return this._request({
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
    if (!nickname) return Promise.reject(new TypeError('nickname required'))
    return this._request({
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
   * Custom request sender
   * @param {URL} url URL
   * @param {object} options Options
   * @param {string} options.method Method
   * @param {object} options.headers Headers
   * @param {object} options.postdata Postdata
   */
  request(url, options = {}) {
    if (!url) return Promise.reject(new TypeError('Url cannot be empty'))
    options.url = url
    options.headers = options.headers || {}
    if (this.auth && this.auth.access_token) {
      options.headers.Authorization = `Bearer ${this.auth.access_token}`
    }
    return this._request(options).catch((error) => {
      if (this.remember && this.username && this.password) {
        return this.login(this.username, this.password).then(() => {
          options.headers.Authorization = `Bearer ${this.auth.access_token}`
          return this._request(options)
        })
      }
      throw error
    })
  }

  /**
   * @private
   * Request sender
   **/
  _request({url, method, headers, postdata}) {
    if (!(url instanceof URL)) {
      url = new URL(url, BASE_URL)
    }
    return new Promise((resolve, reject) => {
      let data = ''
      const request = this.library.request({
        method: method || 'POST',
        headers: Object.assign({
          Host: url.hostname
        }, this.headers, headers),
        hostname: this.hosts.getHostName(url.hostname),
        servername: url.hostname,
        path: url.pathname
      }, (response) => {
        response.on('data', chunk => data += chunk)
        response.on('end', () => resolve(JSON.parse(data)))
      })
      request.on('error', error => reject(error))
      if (postdata instanceof Object) {
        request.write(QS.stringify(postdata))
      } else if (typeof postdata === 'string') {
        request.write(postdata)
      }
      request.end()
    })
  }
}

module.exports = PixivAPI