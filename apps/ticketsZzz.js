import plugin from '../../../lib/plugins/plugin.js'
import ticketsZzz from '../model/ticketsZzz.js'
import Cfg from '../model/Cfg.js'

export class tickets extends plugin {
  constructor () {
    super({
      name: 'genshin·调频道具',
      dsc: '获取绝区零调频道具数量',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [{
        reg: '^#*绝区零?(调频|抽卡)道具',
        fnc: 'tickets'
      }]
    })

  }

  async tickets () {
    let data = await new ticketsZzz(this.e).getData()
    if (!data) return

    /** 生成图片 */
    this.renderImg('genshin', `ZZZero/html/tickets/tickets`, data)
  }
}
