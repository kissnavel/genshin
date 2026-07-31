import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import fetch from 'node-fetch'
import Cfg from '../model/Cfg.js'
import MysApi from '../model/mys/mysApi.js'

export class exchange extends plugin {
  constructor() {
    super({
      name: 'genshin·兑换码',
      dsc: '前瞻直播兑换码',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [
        {
          reg: /^(#|\*)?(原神|星铁|崩铁|崩三|崩坏三|崩坏3|绝区零)?(国服|国际服)?(直播|前瞻)?兑换码$/,
          fnc: 'getCode'
        }
      ]
    })
  }

  async getCode() {
    let hoyo = this.e.msg.match('国际服')
    if (hoyo) return this.getHoyoCode()
    let reg = this.e.msg.match(/^(#|\*)?(原神|星铁|崩铁|崩三|崩坏三|崩坏3|绝区零)?(国服)?(直播|前瞻)?兑换码$/)
    this.uid = '75276539'
    this.gid = '2'
    if (reg[1] == '*' || ['星铁', '崩铁'].includes(reg[2])) {
      this.uid = '80823548'
      this.gid = '6'
    }
    if (['崩三', '崩坏三', '崩坏3'].includes(reg[2])) {
      this.uid = '73565430'
      this.gid = '1'
    }
    if (reg[2] == '绝区零') {
      this.uid = '152039148'
      this.gid = '8'
    }
    this.now = parseInt(Date.now() / 1000)
    let actid = await this.getActId()
    let isBackupAct = false
    if (!actid) {
      actid = await this.getBackupActId()
      isBackupAct = true
    }
    if (!actid) {
      logger.info('[兑换码] 未获取到actId')
      return await this.reply('暂无前瞻直播资讯')
    }
    
    this.actId = actid

    /** index info */
    let index = await this.getData('index')
    if (!index || !index.data) {
      return true
    }

    if (index.data === null) {
      return await this.reply(`错误：\n${index.message}`)
    }

    let index_data = index.data.live
    let title = index_data['title']
    this.code_ver = index_data['code_ver']
    if (index_data.remain > 0) {
      return await this.reply(`暂无${title}直播兑换码`, true)
    }

    let code = await this.getData('code')
    let time
    if (isBackupAct) {
      time = await this.getTimeStamp()
    } else {
      time = this.deadline
    }
    if (!code || !code.data?.code_list) {
      logger.info('[兑换码] 未获取到兑换码')
      return true
    }
    let msgs = []
    msgs.push(`${title}-直播兑换码`)
    msgs.push(`兑换码过期时间: \n${time}`)

    for (let val of code.data.code_list) {
      if (val.code) {
        msgs.push(val.code)
      }
    }

    let msg = msgs.join('\n')
    await this.reply(msg)
  }

  async getData(type) {
    let url = {
      index: `https://api-takumi.mihoyo.com/event/miyolive/index`,
      code: `https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode?version=${this.code_ver}&time=${this.now}`,
      actId: `https://bbs-api.mihoyo.com/painter/api/user_instant/list?offset=0&size=20&uid=${this.uid}`,
      nav: `https://bbs-api.miyoushe.com/apihub/api/home/new?gids=${this.gid}&parts=1%2C3%2C4`
    }

    let response
    try {
      response = await fetch(url[type], {
        method: 'get',
        headers: {
          'x-rpc-act_id': this.actId
        }
      })
    } catch (error) {
      logger.error(error.toString())
      return false
    }

    if (!response.ok) {
      logger.error(`[兑换码接口错误][${type}] ${response.status} ${response.statusText}`)
      return false
    }
    const res = await response.json()
    return res
  }

  // 获取 "act_id"
  async getActId() {
    let ret = await this.getData('actId')
    if (ret.error || ret.retcode !== 0) {
      return ''
    }

    for (const p of ret.data.list) {
      // Not every posts have post.post
      let post = p?.post?.post
      if (!post) {
        continue
      }
      let date = new Date(post.created_at * 1000)
      if (this.uid == '80823548') {
        date.setDate(date.getDate() + 1)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
      } else if (this.uid == '73565430') {
        date.setDate(date.getDate() + 5)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
      } else if (this.uid == '152039148') {
        date.setDate(date.getDate() + 1)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
      } else {
        date.setDate(date.getDate() + 5)
        this.deadline = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 12:00:00`
      }
      let structured_content = post.structured_content
      let result = structured_content.match(/{\"link\":\"https:\/\/webstatic.mihoyo.com\/bbs\/event\/live\/index.html\?act_id=(.*?)\\/)
      if (result) {
        return result[1]
      }
    }
  }

  async getBackupActId() {
    const res = await this.getData('nav')
    if (res.retcode !== 0) return null
      const navMatch = res.data?.navigator?.find(item => 
      item.name.match(/前瞻|特别节目/) && 
      item.app_path.includes('act_id=')
    )

    if (navMatch) {
      const actId = navMatch.app_path.match(/act_id=([a-zA-Z0-9]+)/)[1]
      return actId
    }
  }
  
  async getTimeStamp(){
    let code = await this.getData('code')
    let timestamp = code.data.code_list[0].to_get_time
    const date = new Date(timestamp * 1000)
    const s = this.gid === '2'? 3 : (this.gid === '1' || this.gid === '6') ? 1 : 2 
    date.setDate(date.getDate() + s)
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const t = this.gid === '2' ? '12:00:00' : '23:59:59'
    const time = `${y}-${m}-${d} ${t}`
    return time
  }

  async getHoyoCode() {
    let url, gametype, name, game_id
    if (this.e.game == 'gs') {
      url = 'https://genshin.hoyoverse.com/zh-tw/gift'
      gametype = '#'
      name = '原神'
      game_id = '2'
    } else if (this.e.game == 'sr') {
      url = 'https://hsr.hoyoverse.com/gift'
      gametype = '*'
      name = '崩坏星穹铁道'
      game_id = '6'
    } else if (this.e.game == 'zzz') {
      url = 'https://zenless.hoyoverse.com/redemption'
      gametype = '%'
      name = '绝区零'
      game_id = '8'
    }

    let mysApi = new MysApi('', '', { game: 'bbs' })
    let res = await mysApi.getData('material', { game_id })
    res = res?.data?.modules[0]?.exchange_group?.bonuses
    if (!res || res.length == 0) return this.e.reply(`暂无《${name}》国际服前瞻直播兑换码`)

    let msgData = [], button = []
    msgData.push(`《${name}》国际服前瞻直播兑换码：`)
    for (let i = 0; i < res.length; i++) {
      if (!res[i].exchange_code) break
      msgData.push(res[i].exchange_code)
      button.push([{ text: `${gametype}兑换码使用${res[i].exchange_code}`, callback: `${gametype}兑换码使用${res[i].exchange_code}` }])
    }
    msgData.push(`兑换码使用网站：${url}`)
    msgData.push(`可使用命令"${gametype}兑换码使用+(空格)+兑换码"进行兑换`)
    msgData.push('若兑换失败，请尝试刷新cookie或重新绑定cookie')

    let msg = msgData.join('\n')
    return this.e.reply([msg, segment.button(...button)])
  }
}
