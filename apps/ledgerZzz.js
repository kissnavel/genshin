import plugin from '../../../lib/plugins/plugin.js'
import LedgerZzz from '../model/ledgerZzz.js'
import Cfg from '../model/Cfg.js'
import fs from 'node:fs'

export class ledgerZzz extends plugin {
  constructor() {
    super({
      name: 'genshin·绝区零菲林',
      dsc: '绝区零绳网月报·菲林统计',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [
        {
          reg: '^#?(绝区零)?(菲林|月报|统计)([0-9]|[一二两三四五六七八九十]+)*月*$',
          fnc: 'ledger'
        },
        {
          reg: '^#?(绝区零)?菲林统计$',
          fnc: 'ledgerCount'
        },
        {
          reg: '^#?(绝区零)?(去年|今年|\\d{4}年)(绝区零)?菲林统计$',
          fnc: 'ledgerCountHistory'
        }
      ]
    })

    Object.defineProperty(this, 'button', {
      get() {
        return segment.button([
          { text: '菲林月报', callback: '%菲林' },
          { text: '菲林统计', callback: '%菲林统计' }
        ])
      }
    })
  }

  async init() {
    if (!fs.existsSync('./data/ZZZ_NoteData')) {
      fs.mkdirSync('./data/ZZZ_NoteData', { recursive: true })
    }
  }

  /** 菲林月报 */
  async ledger() {
    this.e.game = 'zzz'
    let data = await new LedgerZzz(this.e).get()
    if (!data) return

    this.reply([await this.renderImg('genshin', 'ZZZero/html/ledger/ledger', data, { retType: 'base64', scale: 0.8 }), this.button])
  }

  /** 菲林统计 */
  async ledgerCount() {
    this.e.game = 'zzz'
    let data = await new LedgerZzz(this.e).ledgerCount()
    if (!data) return

    this.reply([await this.renderImg('genshin', 'ZZZero/html/ledger/ledger-count', data, { retType: 'base64', scale: 1.3 }), this.button])
  }

  /** 今年/去年/指定年份菲林统计 */
  async ledgerCountHistory() {
    this.e.game = 'zzz'
    let data = await new LedgerZzz(this.e).ledgerCountHistory()
    if (!data) return

    this.reply([await this.renderImg('genshin', 'ZZZero/html/ledger/ledger-count', data, { retType: 'base64', scale: 1.3 }), this.button])
  }
}
