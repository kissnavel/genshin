/* 原石预估来自米游社@你的夏木繁 */
/* 星琼预估来自米游社@祈鸢ya */
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
          reg: '^#?(原神|星铁)?(原石|星琼)?预估$',
          fnc: 'estimate'
        }
      ]
    })
    this.e = e
  }

  async estimate(e) {
    let res
    const isSr = /星铁|星琼/.test(this.e.msg)
    if (isSr) {
      res = await (await fetch("https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=%E6%98%9F%E7%90%BC%E7%BB%9F%E8%AE%A1&uid=137101761&size=20&offset=0&sort_type=2")).json()
    } else {
      res = await (await fetch("https://bbs-api.miyoushe.com/painter/api/user_instant/search/list?keyword=%E5%8E%9F%E7%9F%B3%E7%BB%9F%E8%AE%A1&uid=387899471&size=20&offset=0&sort_type=2")).json()
    }
    const post = res.data.list[0].post.post

    let promises = []
    for (let images of post.images)
      promises.push(segment.image(images))

    await Promise.all(promises)

    await e.reply(await common.makeForwardMsg(e, [[post.subject], promises]))
  }
}
