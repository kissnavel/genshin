import plugin from '../../../lib/plugins/plugin.js'
import Cfg from '../model/Cfg.js'
import ProfileDetail from '../model/ProfileDetail.js'

export class profileDetail extends plugin {
  constructor() {
    super({
      name: 'genshin·角色面板',
      dsc: '查询角色面板并生成图片',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [{
        reg: /^[#*]*(?!(?:星铁|原神)?(?:角色面板|面板角色|面板列表|面板)\s*$)(?!(?:星铁|原神)?(?:米游社|mys)?更新)([^#*]+?)\s*(详细|详情|面板|面版|圣遗物|遗器|武器[1-7]?|伤害([1-9]+\d*)?)\s*(\d{9,10})*(.*[换].*)?$/,
        fnc: 'detail'
      }]
    })
  }

  async detail() {
    if (!Cfg.getConfig('config').myspanel) return false

    let msg = this.e.original_msg || this.e.msg || ''
    if (msg.startsWith('*')) {
      this.e.msg = '#' + msg.slice(1)
      this.e.original_msg = this.e.msg
    }
    return await ProfileDetail.detail(this.e)
  }
}
