import plugin from '../../../lib/plugins/plugin.js'

/** 星铁命令前缀 */
const srReg = /^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/
/** 绝区零命令前缀 */
const zzzReg = /^#?(%|％|绝区零|绝区)+/
/** 未定事件簿命令前缀 */
const wdReg = /^#?(&|未定事件簿|未定)+/
/** 崩坏三命令前缀 */
const bh3Reg = /^#?(！|!|崩坏三|崩三)+/
/** 崩坏二命令前缀 */
const bh2Reg = /^#?(￥|崩坏学园2|崩坏二|崩二)+/

export class dealEvent extends plugin {
  constructor() {
    super({
      name: 'genshin·命令替换',
      dsc: '命令前缀替换',
      event: 'message',
      priority: -Infinity
    })
  }

  accept(e) {
    if (srReg.test(e.msg)) {
      e.game = 'sr'
      e.msg = e.msg.replace(srReg, '#星铁')
    } else if (zzzReg.test(e.msg)) {
      e.game = 'zzz'
      e.msg = e.msg.replace(zzzReg, '#绝区零')
    } else if (wdReg.test(e.msg)) {
      e.game = 'wd'
      e.msg = e.msg.replace(wdReg, '#未定')
    } else if (bh3Reg.test(e.msg)) {
      e.game = 'bh3'
      e.msg = e.msg.replace(bh3Reg, '#崩三')
    } else if (bh2Reg.test(e.msg)) {
      e.game = 'bh2'
      e.msg = e.msg.replace(bh2Reg, '#崩二')
    }

    return
  }
}
