const FS = require('fs')

class Hosts {
  constructor(data) {
    if (typeof data === 'string') {
      this.data = {}
      this.load(data)
    } else if (typeof data === 'object') {
      this.data = data
    } else {
      this.data = {}
    }
  }

  load(code) {
    code.match(/^\d.+$/gm).forEach((line) => {
      const match = line.match(/(\S+)\s+(\S+)/)
      if (match) this.data[match[2]] = match[1]
    })
  }

  getHostName(serverName) {
    if (serverName in this.data) {
      return this.data[serverName]
    } else {
      return serverName
    }
  }
}

Hosts.default = FS.readFileSync('./hosts', {encoding: 'utf8'})

module.exports = Hosts