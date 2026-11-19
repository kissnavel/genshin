import plugin from '../../../lib/plugins/plugin.js'
import crypto from 'node:crypto'
import fetch from 'node-fetch'
import common from '../../../lib/common/common.js'
import Cfg from '../model/Cfg.js'
import MysApi from '../model/mys/mysApi.js'
import MysInfo from '../model/mys/mysInfo.js'
import NoteUser from '../model/mys/NoteUser.js'
import CdkExchange from '../model/CdkExchange.js'

const PENDING_CODES_TTL = 60 * 60 * 6

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
        },
        {
          reg: /^(#|\*)?(原神|星铁|绝区零)?国际服可用兑换码$/,
          fnc: 'hoyocode'
        },
        {
          reg: /^(#|\*)?(原神|星铁|绝区零)?(兑换码使用|cdk-u).*/,
          fnc: 'useCode'
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
    let gametype = this.e.game == 'zzz' ? '%' : this.e.game == 'sr' ? '*' : '#'
    let codes = code.data.code_list.map(val => val.code).filter(Boolean)

    if (codes.length === 0) {
      logger.info('[兑换码] 未获取到可用兑换码')
      return await this.reply('暂无可用兑换码')
    }

    let canRedeem = this.gid !== '1' && ['gs', 'sr', 'zzz'].includes(this.gameKey)
    let instructions = canRedeem ? [
      `可使用命令"${gametype}兑换码使用+(空格)+兑换码"进行兑换`,
      '若兑换失败，请尝试刷新cookie或重新绑定cookie'
    ] : ['请在游戏内输入兑换码领取奖励']

    let img = await this.replyCodeList(codes, gametype, 'mys', [
      `${title}-直播兑换码`,
      `兑换码过期时间: \n${time}`,
      ...instructions
    ], [], canRedeem)
    return img
  }

  get gameKey() {
    return this.e.game || (this.e.isSr ? 'sr' : this.e.isZzz ? 'zzz' : 'gs')
  }

  get gameName() {
    return { gs: '原神', sr: '崩坏：星穹铁道', zzz: '绝区零' }[this.gameKey] || '米游社'
  }

  /** 保存本次获取到的兑换码，返回随机令牌，供“批量兑换全部”按钮共享使用 */
  async savePendingCodes(codes, region) {
    let token = crypto.randomBytes(4).toString('hex')
    let pending = { codes, region, game: this.gameKey }
    await redis.set(`genshin:cdk:pending:${token}`, JSON.stringify(pending), { EX: PENDING_CODES_TTL })
    return token
  }

  async getPendingCodes(token) {
    if (!token) return null
    try {
      let pending = JSON.parse(await redis.get(`genshin:cdk:pending:${token}`) || 'null')
      if (!Array.isArray(pending?.codes) || !['mys', 'hoyo'].includes(pending.region)) return null
      return pending
    } catch (error) {
      return null
    }
  }

  /** 统一输出兑换码列表和批量兑换按钮 */
  async replyCodeList(codes, gametype, region, titleLines = [], extraLines = [], withButtons = true) {
    codes = [...new Set((codes || []).map(code => String(code || '').trim()).filter(Boolean))]
    if (codes.length === 0) return this.e.reply('暂无可用兑换码')

    let msgs = [...titleLines, ...codes, ...extraLines]
    if (!withButtons) return this.e.reply(msgs.join('\n'))

    let token = await this.savePendingCodes(codes, region)

    let button = [[{
      text: '批量兑换全部',
      callback: `${gametype}兑换码使用@batch:${token}`
    }]]

    return this.e.reply([msgs.join('\n'), segment.button(...button)])
  }

  /** 兑换只使用发起人当前 UID 对应的已绑定账号 */
  async initCdkMysInfo(game) {
    let user = await NoteUser.create(this.e)
    let uid = user.getUid(game)
    if (!uid) {
      await this.e.reply('请先绑定该游戏的 Cookie，再使用兑换码')
      return null
    }

    let uidData = user.getUidData(uid, game)
    let ckUser = uidData?.type === 'ck' ? user.mysUsers[uidData.ltuid] : null
    if (!ckUser?.ck || !ckUser.ownUid(uid, game)) {
      await this.e.reply(`当前 UID ${uid} 未绑定 Cookie，请绑定对应账号或切换到已绑定 Cookie 的 UID 后再兑换`)
      return null
    }

    let mysInfo = new MysInfo(this.e)
    mysInfo.uid = uid
    mysInfo.ckUser = ckUser
    mysInfo.ckInfo = { ...ckUser.getCkInfo(game), uid }
    this.e.uid = uid
    return mysInfo
  }

  /** 将接口返回整理为图片需要的状态数据 */
  formatCdkResult(code, res) {
    let retcode = Number(res?.retcode)
    let message = String(res?.data?.msg || res?.data?.message || res?.message || '').replace(/\s+/g, ' ').trim()
    let status = 'failed'
    let statusText = '兑换失败'

    if (retcode === 0) {
      status = 'success'
      statusText = '兑换成功'
    } else if (MysApi.isLoginError(res)) {
      status = 'failed'
      statusText = 'CK失效'
    } else if (/已(使用|兑换|领取)|重复领取|already\s*(used|redeemed)/i.test(message) || retcode === -2017) {
      status = 'used'
      statusText = '已兑换'
    } else if (/过期|失效|expired/i.test(message) || [-2018, -2020].includes(retcode)) {
      status = 'expired'
      statusText = '已过期'
    } else if (/不存在|无效|错误|格式|invalid/i.test(message) || [-2016, -2001, -2002].includes(retcode)) {
      status = 'invalid'
      statusText = '无效兑换码'
    }

    if (!message) message = statusText
    return { code, status, statusText, message, retcode, raw: res || null }
  }

  buildTextResult(data) {
    let lines = [`兑换码兑换结果（UID：${data.uid}）`]
    for (let result of data.results) {
      let icon = '❌'
      if (result.status === 'success') icon = '✅'
      else if (['used', 'expired', 'unknown'].includes(result.status)) icon = '⚠️'
      lines.push(`${icon} ${result.code}：${result.statusText}${result.message && result.message !== result.statusText ? ` - ${result.message}` : ''}`)
    }
    return lines.join('\n')
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
    let game = this.gameKey
    if (game == 'gs') {
      url = 'https://genshin.hoyoverse.com/zh-tw/gift'
      gametype = '#'
      name = '原神'
      game_id = '2'
    } else if (game == 'sr') {
      url = 'https://hsr.hoyoverse.com/gift'
      gametype = '*'
      name = '崩坏星穹铁道'
      game_id = '6'
    } else if (game == 'zzz') {
      url = 'https://zenless.hoyoverse.com/redemption'
      gametype = '%'
      name = '绝区零'
      game_id = '8'
    }

    let mysApi = new MysApi('', '', { game: 'bbs' })
    let res = await mysApi.getData('material', { game_id })
    res = res?.data?.modules[0]?.exchange_group?.bonuses
    if (!res || res.length == 0) return this.e.reply(`暂无《${name}》国际服前瞻直播兑换码`)

    let codes = []
    for (let i = 0; i < res.length; i++) {
      if (!res[i].exchange_code) break
      codes.push(res[i].exchange_code)
    }

    return this.replyCodeList(codes, gametype, 'hoyo', [
      `《${name}》国际服前瞻直播兑换码：`
    ], [
      `兑换码使用网站：${url}`,
      `可使用命令"${gametype}兑换码使用+(空格)+兑换码"进行兑换`,
      '若兑换失败，请尝试刷新cookie或重新绑定cookie'
    ])
  }

  async hoyocode() {
    let url; let gametype
    let game = this.gameKey
    if (game == 'gs') {
      url = 'https://genshin.hoyoverse.com/zh-tw/gift'
      gametype = '#'
    } else if (game == 'sr') {
      url = 'https://hsr.hoyoverse.com/gift'
      gametype = '*'
    } else if (game == 'zzz') {
      url = 'https://zenless.hoyoverse.com/redemption'
      gametype = '%'
    }

    let codes = await this.gethoyoCode()
    if (codes.length == 0) return this.e.reply('未获取到兑换码')

    return this.replyCodeList(codes, gametype, 'hoyo', ['当前可用兑换码如下：'], [
      `兑换码使用网站：${url}`,
      `可使用命令"${gametype}兑换码使用+(空格)+兑换码"进行兑换`,
      '若兑换失败，请尝试刷新cookie或重新绑定cookie'
    ])
  }

  async gethoyoCode() {
    let url
    let game = this.gameKey
    if (game == 'gs') {
      url = 'https://gamewith.jp/genshin/article/show/231856'
    } else if (game == 'sr') {
      url = 'https://gamewith.jp/houkaistarrail/article/show/396232'
    } else if (game == 'zzz') {
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
    if (game == 'zzz') {
      for (let i = 0; i < codeList.length; i++) {
        if (codeList[i] == 'ZENLESSGIFT') {
          promises.push(codeList[i])
          break
        }
        promises.push(codeList[i])
      }
      await Promise.all(promises)
    }

    let getCode = game == 'zzz' ? promises : codeList
    return getCode
  }

  // 兑换码使用，支持一次携带多个兑换码，或点击“批量兑换全部”按钮
  async useCode() {
    let raw = String(this.e.msg || '').replace(/^(#|\*)?(原神|星铁|绝区零)?(兑换码使用|cdk-u)/, '').trim()
    let game = this.gameKey
    let codes = []
    let pending

    let batch = raw.match(/^@(?:batch|all)(?::([a-f0-9]+))?$/i)
    if (batch) {
      pending = await this.getPendingCodes(batch[1])
      if (!pending?.codes.length) {
        return this.e.reply('批量兑换列表不可用，请重新获取兑换码')
      }
      if (pending.game !== game) return this.e.reply('这批兑换码属于其他游戏，请使用该游戏的兑换码列表')
      codes = pending.codes
    } else {
      codes = raw.split(/[\s,，、;；]+/).map(code => code.trim()).filter(Boolean)
    }

    codes = [...new Set(codes)]
    if (codes.length === 0) {
      return this.e.reply('请输入兑换码，多个兑换码用空格分隔')
    }

    let mysInfo = await this.initCdkMysInfo(game)
    if (!mysInfo) return true

    let mysApi = new MysApi(mysInfo.uid, mysInfo.ckInfo.ck, { game, device: mysInfo.ckUser.device })

    if (pending) {
      // server 由 MysApi.getServer() 推断，沿用 MysApi 的国服判断规则。
      let region = /cn_|_cn/.test(mysApi.server) ? 'mys' : 'hoyo'
      if (pending.region !== region) {
        let requiredRegion = pending.region === 'mys' ? '国服' : '国际服'
        return this.e.reply(`这批兑换码适用于${requiredRegion}，当前 UID ${mysInfo.uid} 的区服不匹配，请切换到对应区服的 UID 后再兑换`)
      }

      let claimed
      try {
        let key = `genshin:cdk:submitted:${batch[1]}:${game}:${mysApi.server}:${mysInfo.uid}`
        claimed = await redis.set(key, '1', { NX: true, EX: PENDING_CODES_TTL })
      } catch (error) {
        logger.error(`[兑换码] 批量兑换提交失败：${error.message}`)
        return this.e.reply('暂时无法提交批量兑换，请稍后再试')
      }
      if (!claimed) return this.e.reply(`UID ${mysInfo.uid} 已提交过这批兑换码，请勿重复点击`)
    }

    if (codes.length > 1) {
      await this.e.reply(`正在批量兑换 ${codes.length} 个兑换码...`, false, { at: true })
    }

    let results = []
    for (let i = 0; i < codes.length; i++) {
      let code = codes[i]
      try {
        let res = await mysApi.getData('useCdk', { cdk: code })
        res = await mysInfo.checkCode(res, 'useCdk', mysApi, { cdk: code }, true)
        results.push(this.formatCdkResult(code, res))
      } catch (error) {
        logger.error(`[兑换码] 单码兑换异常 [${game}][UID:${mysInfo.uid}][${i + 1}/${codes.length}] ${error?.name || 'Error'}`)
        results.push({
          code,
          status: 'unknown',
          statusText: '结果未知',
          message: '本次未能确认兑换结果，请先检查游戏内邮件',
          retcode: null,
          raw: null
        })
      }
      if (i < codes.length - 1) await common.sleep(5000)
    }

    let successCount = results.filter(result => result.status === 'success').length
    let data = {
      game,
      gameName: this.gameName,
      uid: mysInfo.uid,
      total: results.length,
      successCount,
      results
    }

    try {
      await redis.set(`genshin:cdk:result:${this.e.user_id}`, JSON.stringify({ time: Date.now(), ...data }), { EX: 86400 * 7 })
    } catch (error) {
      logger.error(`[兑换码] 保存兑换结果失败：${error.message}`)
    }

    let img
    try {
      img = await new CdkExchange(this.e).render(data)
    } catch (error) {
      logger.error(`[兑换码] 兑换结果图片渲染失败：${error.message}`)
    }

    if (img) return this.e.reply(img, false, { at: true })
    return this.e.reply(this.buildTextResult(data), false, { at: true })
  }
}
