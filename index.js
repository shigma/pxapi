const QS = require('querystring')
const URL = require('url').URL
const Hosts = require('./hosts.js')

const BASE_URL = 'https://app-api.pixiv.net'
const CLIENT_ID = 'KzEZED7aC0vird8jWyHM38mXjNTY'
const CLIENT_SECRET = 'W9JZoJe00qPvJsiyCGT3CCtC6ZUtdpKpzMbNlUGP'

class PixivAPI {
  constructor({library, hosts} = {}) {
    /** Web Library */
    this.library = library || require('https')

    /** Host Map */
    this.hosts = new Hosts(hosts || Hosts.default)

    /** Default Headers */
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
    if (!username) return Promise.reject(new Error('username required'))
    if (!password) return Promise.reject(new Error('password required'))
    return this.request({
      url: 'https://oauth.secure.pixiv.net/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      postdata: QS.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        get_secure_url: 1,
        grant_type: 'password',
        username,
        password,
      })
    }).then((data) => {
      this.auth = data.response
      this.remember = remember === false
      if (remember) {
        this.username = username
        this.password = password
      }
      return data.response
    }).catch((error) => {
      if (error.response) {
        throw error.response.data
      } else {
        throw error.message
      }
    })
  }

  logout() {
    this.auth = null
    this.username = null
    this.password = null
    delete this.headers.Authorization
    return Promise.resolve()
  }

  authInfo() {
    return this.auth
  }

  requestUrl(url, options = {}) {
    if (!url) return Promise.reject('Url cannot be empty')
    options.headers = Object.assign({}, this.headers, options.headers)
    if (this.auth && this.auth.access_token) {
      options.headers.Authorization = `Bearer ${this.auth.access_token}`
    }
    return this.callApi(url, options).then(JSON.stringify).catch(err => {
      if (this.rememberPassword && this.username && this.password) {
        return this.login(this.username, this.password).then(() => {
          options.headers.Authorization = `Bearer ${this.auth.access_token}`
          return this.callApi(url, options)
        })
      }
      throw err
    })
  }

  // Custom request sender
  request({url, method = 'POST', headers = {}, postdata}) {
    if (!(url instanceof URL)) {
      url = new URL(url, BASE_URL)
    }
    return new Promise((resolve, reject) => {
      let data = ''
      const request = this.library.request({
        method,
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
      if (postdata) {
        request.write(postdata)
      }
      request.end()
    })
  }
}

module.exports = PixivAPI