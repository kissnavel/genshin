import { Data } from '#miao'

const games = [
  { key: 'bh2', name: '崩坏学园2' },
  { key: 'bh3', name: '崩坏三' },
  { key: 'wd', name: '未定事件簿' },
  { key: 'zzz', name: '绝区零' },
  { key: 'sr', name: '星穹铁道' },
  { key: 'gs', name: '原神' }
]

const MysUtil = {
  // 获取标准ltuid
  getLtuid (data) {
    if (!data) {
      return false
    }
    if (/^\d{4,10}$/.test(data)) {
      return data
    }
    let testRet = /ltuid=(\d{4,10})/g.exec(data.ck || data)
    if (testRet && testRet[1]) {
      return testRet[1]
    }
    return false
  },

  // 获取标准gameKey
  getGameKey (game) {
    // 兼容e的处理
    if (game.game) {
      game = game.game
    }
    switch (game) {
      case 'sr':
        return 'sr'
      case 'zzz':
        return 'zzz'
      case 'wd':
        return 'wd'
      case 'bh3':
        return 'bh3'
      case 'bh2':
        return 'bh2'
      default:
        return 'gs'
    }
  },

  // 生成设备guid
  getDeviceGuid () {
    function S4 () {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
  },

  // 循环game
  async eachGame (fn) {
    await Data.forEach(games, (ds) => {
      return fn(ds.key, ds)
    })
  },

  // 循环server
  async eachServ (fn) {
    await Data.forEach(['mys', 'hoyolab'], fn)
  }
}
export default MysUtil
