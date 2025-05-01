import plugin from '../../../lib/plugins/plugin.js'
import Note from '../model/NoteBh3.js'

export class dailyNote extends plugin {
  constructor () {
    super({
      name: '体力查询',
      dsc: '崩三体力查询',
      event: 'message',
      priority: 300,
      rule: [
        {
          reg: '^#*崩三?(体力|查询体力)$',
          fnc: 'note'
        }
      ]
    })
  }

  /** 体力 */
  async note () {
    let data = await Note.get(this.e)
    if (!data) return

    /** 生成图片 */
    this.renderImg('genshin', `Bh3/html/dailyNote/dailyNote`, data)
  }
}
