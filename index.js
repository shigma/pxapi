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

function toKebab(object) {
  const result = {}
  for (const key in object) {
    result[key.replace(/[A-Z]/g, char => '-' + char.toLowerCase())] = object[key]
  }
  return result
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

  /** @private Request without authorization */
  request({url, method, headers, postdata}) {
    if (!(url instanceof URL)) {
      url = new URL(url, BASE_URL)
    }
    return new Promise((resolve, reject) => {
      let data = ''
      const request = this.library.request({
        method: method || 'GET',
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

  /**
   * Log in your pixiv account
   * @param {string} username User Name
   * @param {string} password Password
   * @param {boolean} remember Whether to remember password
   */
  login(username, password, remember = true) {
    if (!username) return Promise.reject(new TypeError('username required'))
    if (!password) return Promise.reject(new TypeError('password required'))
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
    }).catch(catcher)
  }

  /** Log out your pixiv account */
  logout() {
    this.auth = null
    this.username = null
    this.password = null
    delete this.headers.Authorization
  }

  /**
   * Refresh access token
   * @param {string} token Refreshing token
   */
  refreshAccessToken(token = this.auth ? this.auth.refresh_token : null) {
    if (!token) return Promise.reject(new TypeError('refresh_token required'))
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
    if (!nickname) return Promise.reject(new TypeError('nickname required'))
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
    if (!url) return Promise.reject(new TypeError('Url cannot be empty'))
    if (!this.auth) return Promise.reject(new Error('Authorization required'))
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

  /** Get pixiv user state (authorization required) */
  userState() {
    return this.authRequest('/v1/user/me/state').then((data) => {
      if (data.user_state) {
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
    if (!info) return Promise.reject(new TypeError('info required'))
    const postdata = {}
    if (info.password) postdata.current_password = info.password
    if (info.pixivId) postdata.new_user_account = info.pixivId
    if (info.newPassword) postdata.new_password = info.newPassword
    if (info.email) postdata.new_mail_address = info.email
    return this.authRequest('https://accounts.pixiv.net/api/account/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      postdata,
    })
  }

  /** Send account verification email (authorization required) */
  sendAccountVerificationEmail() {
    return this.authRequest('/v1/mail-authentication/send', {
      method: 'POST',
    })
  }
}

module.exports = PixivAPI