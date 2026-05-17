/* 原石预估来自米游社@你的夏木繁 */
/* 星琼预估来自米游社@祈鸢ya */
/* 菲林预估来自米游社@HoYo青枫 */
import fetch from 'node-fetch'
import common from '../../../lib/common/common.js'
import Cfg from '../model/Cfg.js'

export class estimate extends plugin {
  constructor(e) {
    super({
      name: 'genshin·预估',
      dsc: '原石、星琼预估',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [
        {
          reg: '^#?(原神|星铁|绝区零)?(原石|星琼|菲林)?预估$',
          fnc: 'estimate'
        }
      ]
    })
    this.e = e
  }

  async estimate(e) {
    let res
    const isZzz = /绝区零|菲林/.test(this.e.msg)
    const isSr = /星铁|星琼/.test(this.e.msg)

    if (isZzz) {
      res = await (await fetch("https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=%E8%8F%B2%E6%9E%97%E8%B5%84%E6%BA%90&uid=285802042&size=20&offset=0&sort_type=2")).json()
    } else if (isSr) {
      res = await (await fetch("https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=%E6%98%9F%E7%90%BC%E7%BB%9F%E8%AE%A1&uid=137101761&size=20&offset=0&sort_type=2")).json()
    } else {
      res = await (await fetch("https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=%E5%89%8D%E7%9E%BB%E6%B1%87%E6%80%BB&uid=387899471&size=20&offset=0&sort_type=2")).json()
    }
    const post = res.data.list[0].post.post

    let promises = []
    promises.push(post.subject)
    for (let images of post.images)
      promises.push(segment.image(images))

    await Promise.all(promises)

    await e.reply([await common.makeForwardMsg(e, [promises]), segment.button([
      { text: '#预估', callback: '#预估' },
      { text: '*预估', callback: '*预估' },
      { text: '%预估', callback: '%预估' }
    ],[
      { text: '#原石', callback: '#原石' },
      { text: '#原石统计', callback: '#原石统计' }
    ],[
      { text: '*星琼', callback: '*星琼' },
      { text: '*星琼统计', callback: '*星琼统计' }
    ],[
      { text: '%菲林', callback: '%菲林' },
      { text: '%菲林统计', callback: '%菲林统计' }
    ])])
  }
}
