const FS = require('fs')
const path = require('path')

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

Object.defineProperty(Hosts, 'default', {
  get() {
    return FS.readFileSync(path.join(__dirname, 'hosts'), {encoding: 'utf8'})
  }
})

module.exports = Hosts