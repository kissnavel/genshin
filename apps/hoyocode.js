import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import fetch from 'node-fetch'
import MysInfo from '../model/mys/mysInfo.js'
import Cfg from '../model/Cfg.js'

export class hoyocode extends plugin {
  constructor() {
    super({
      name: '兑换码',
      dsc: '国际服兑换码',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [
        {
          reg: /^(#|\*)?(原神|星铁|绝区零)?国际服兑换码$/,
          fnc: 'hoyocode'
        },
        {
          reg: '^#(原神|星铁|绝区零)?(兑换码使用|cdk-u).+',
          fnc: 'useCode'
        }
      ]
    })
  }

  async hoyocode() {
    let url; let gametype
    if (this.e.game == 'gs') {
      url = 'https://genshin.hoyoverse.com/zh-tw/gift'
      gametype = '#'
    } else if (this.e.game == 'sr') {
      url = 'https://hsr.hoyoverse.com/gift'
      gametype = '*'
    } else if (this.e.game == 'zzz') {
      url = 'https://zenless.hoyoverse.com/redemption'
      gametype = '%'
    }

    let codes = await this.getCode()
    if (codes.length == 0) return this.e.reply('未获取到兑换码')
    let msgData = []
    msgData.push('当前可用兑换码如下')
    codes.forEach(val => {
      msgData.push(val)
    })
    msgData.push(`兑换码使用网站: ${url}`)
    msgData.push(`可使用命令 ${gametype}兑换码使用+(空格)+兑换码 进行兑换。若兑换失败，请尝试刷新cookie或重新绑定cookie`)

    let fwdMsg = await common.makeForwardMsg(this.e, msgData, msgData[0])
    return this.e.reply(fwdMsg)
  }

  async getCode() {
    let url
    if (this.e.game == 'gs') {
      url = 'https://gamewith.jp/genshin/article/show/231856'
    } else if (this.e.game == 'sr') {
      url = 'https://gamewith.jp/houkaistarrail/article/show/396232'
    } else if (this.e.game == 'zzz') {
      url = 'https://gamewith.jp/zenless/452252'
    }

    let response = await fetch(url)
    let res = await response.text()
    // 过滤掉注释
    res = res.replace(/<!--(.|[\r\n])*?-->/g, "")
    // 提取激活码所在元素
    let rawCodes = res.match(/<div class="w-clipboard-copy-ui">\w+<\/div>/g)
    let codeList = []; let promises = []
    if (rawCodes) {
      rawCodes.forEach(val => {
        let code = val.replace(/<div class="w-clipboard-copy-ui">|<\/div>/g, "")
        codeList.push(code)
      })
    }
    if (this.e.game == 'zzz') {
      for (let i = 0; i < codeList.length; i++) {
        if (codeList[i] == 'ZENLESSGIFT') {
          promises.push(codeList[i])
          break
        }
        promises.push(codeList[i])
      }
      await Promise.all(promises)
    }

    let getCode = this.e.game == 'zzz' ? promises : codeList
    return getCode
  }

  // 兑换码使用
  async useCode() {
    const cdkCode = this.e.msg.replace(/#(原神|星铁|绝区零)?(兑换码使用|cdk-u)/, '').trim()
    const res = await MysInfo.get(this.e, 'useCdk', { cdk: cdkCode })
    if (res.retcode == 0) {
      this.e.reply(`${res.data.msg}`)
    }
  }
}
