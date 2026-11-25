import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import common from '../../../lib/common/common.js'
import MysInfo from './mys/mysInfo.js'
import MysApi from './mys/mysApi.js'
import base from './base.js'
import moment from 'moment'
import Cfg from './Cfg.js'
import _ from 'lodash'
import { Character } from '#miao.models'
import { resolveBoundGroup } from './SignTaskNotice.js'
import { sendNoteReminder } from './NotePush.js'

let noteTaskRunning = false

function getRecoveryTime (value, now = new Date()) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return
  const date = new Date(now.getTime() + seconds * 1000)
  if (!Number.isFinite(date.getTime())) return

  // 比较本地日历日期，不用经过的小时数判定今天、明天或后天。
  const dayStart = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const daysAhead = (dayStart(date) - dayStart(now)) / 86400000
  const sameYear = date.getFullYear() === now.getFullYear()
  const dateLabel = moment(date).format(sameYear ? 'M月D日' : 'YYYY年M月D日')
  return { seconds, date, daysAhead, dateLabel, clock: moment(date).format('HH:mm') }
}

export default class Note extends base {
  constructor(e) {
    super(e)
    this.model = 'dailyNote'
    this.week = [
      '星期日',
      '星期一',
      '星期二',
      '星期三',
      '星期四',
      '星期五',
      '星期六'
    ]
  }

  static async get(e) {
    let note = new Note(e)

    let { cks } = await Cfg.getcks(false, e.user_id, true)
    if (_.every(cks, _.isEmpty)) return e.reply(['请【#扫码登录】绑定ck\n或尝试【#刷新ck】', segment.button([
      { text: '#ck帮助', callback: '#ck帮助' },
      { text: '#sk帮助', callback: '#sk帮助' }
    ],[
      { text: '#扫码登录', callback: '#扫码登录' },
      { text: '#刷新ck', callback: '#刷新ck' }
    ])], false, { at: true })

    e.reply('查询中请稍等...', false, { at: true, recallMsg: 30 })

    let sendMsg = []
    e._reply = e.reply
    e.reply = ((msg) => {
      sendMsg.push(msg)
    })

    let promises = []
    for (let g of ['gs', 'sr', 'zzz'])
      if (!_.isEmpty(cks[g]))
        promises.push(note.ddos(cks[g], g))

    await Promise.all(promises)

    if (sendMsg.length > note.set.forward)
      await e._reply(await common.makeForwardMsg(e, sendMsg))
    else
      await e._reply(sendMsg, false, { at: false })

    return
  }

  async ddos(cks, game) {
    for (let i in cks) {
      await this.getData(cks[i], game)
    }
  }

  async NoteTask() {
    if (!this.set.NoteTask || noteTaskRunning) return
    noteTaskRunning = true
    try {
      await this.runNoteTask()
    } finally {
      noteTaskRunning = false
    }
  }

  async runNoteTask() {
    const sendCD = this.set.sendCD * 3600
    const subscriptions = Cfg.getConfig('defnote')
    for (const [botId, users] of Object.entries(subscriptions ?? {})) {
      for (const [userId, groups] of Object.entries(users ?? {})) {
        const numericId = Number(userId)
        const user = Number.isSafeInteger(numericId) && String(numericId) === userId ? numericId : userId
        const images = new Map()
        let cks
        for (const [groupId, group] of Object.entries(groups ?? {})) {
          const label = `[体力推送]Bot:${botId};Group:${groupId};User:${userId}`
          let attempted = false
          try {
            if (!resolveBoundGroup(botId, groupId)) {
              logger.warn(`${label} 订阅机器人不可用，已跳过`)
              continue
            }
            cks ??= (await Cfg.getcks(false, user, true)).cks
            const entries = await this.collectNoteReminders(cks, images, botId, user, groupId, group)
            if (!entries.length) continue

            // 查询和出图期间可能已掉线或重连，发消息前重新解析原账号。
            const route = resolveBoundGroup(botId, groupId)
            if (!route) throw new Error('订阅机器人不可用，已跳过')
            attempted = true
            await sendNoteReminder(route.account.pickGroup(route.key), [segment.at(user), this.set.TaskMsg, ...entries.map(entry => entry.image)])
            for (const { key } of entries) await redis.set(key, '1', { EX: sendCD })
            logger.mark(`${label} 已发送 ${entries.length} 条体力提醒`)
          } catch (error) {
            logger.warn(`${label} ${error?.message ?? error}`)
          } finally {
            if (attempted) await common.sleep(5000)
          }
        }
      }
    }
  }

  async collectNoteReminders(cks, images, botId, user, groupId, group) {
    const entries = new Map()
    this.e = { user_id: user, qq: user, msg: '体力', reply: () => {} }
    for (const game of ['gs', 'sr', 'zzz']) {
      this.e.isSr = game === 'sr'
      this.e.isZzz = game === 'zzz'
      for (const uid of group?.[game] ?? []) {
        const key = `${groupId}:${botId}:${game}_NoteTask:${uid}`
        if (entries.has(key) || await redis.get(key)) continue
        const threshold = Number(group[`${game}_Resin`])
        const cacheKey = `${game}_${uid}`
        let info = images.get(cacheKey)
        if (!info) {
          const ck = cks?.[game]?.[uid]
          if (!ck) continue
          const { Data, Sign } = await this.noteData(ck, game) || {}
          if (Data?.retcode !== 0 || _.isEmpty(Sign)) continue
          const resin = this.e.isZzz ? Data.data?.energy?.progress?.current : Data.data?.[this.e.isSr ? 'current_stamina' : 'current_resin']
          if (!(Number(resin) >= threshold)) continue
          const detail = this.e.isZzz ? await this.noteZzz(Data, uid) : this.e.isSr ? await this.noteSr(Data, uid) : await this.notegs(Data, uid)
          const data = { quality: 80, ...this.screenNote, ...detail, ...Sign }
          const image = await this.screenshotDailyNote(data)
          if (!image) continue
          info = { resin: Number(resin), image }
          images.set(cacheKey, info)
        }
        if (info.resin >= threshold) entries.set(key, info.image)
      }
    }
    return Array.from(entries, ([key, image]) => ({ key, image }))
  }

  async getData(ck, game) {
    let isSr = game === 'sr'
    let isZzz = game === 'zzz'
    /** 当前查询的游戏状态固定在本轮，避免多游戏并发时相互覆盖 */
    this.e.isSr = isSr
    this.e.isZzz = isZzz
    let screenNote = this.screenNote

    let res = await this.noteData(ck, game)
    if (res?.Data?.retcode !== 0 || _.isEmpty(res?.Sign)) return false

    let data = isZzz ? await this.noteZzz(res.Data, ck.uid) : isSr ? await this.noteSr(res.Data, ck.uid) : await this.notegs(res.Data, ck.uid)

    data = {
      quality: 80,
      ...screenNote,
      ...data,
      ...res.Sign
    }
    let img = await this.screenshotDailyNote(data)
    if (img) return await this.e.reply(img)
  }

  screenshotDailyNote (data) {
    return puppeteer.screenshot(`${data.gstempFile}dailyNote`, { ...data, imgType: 'png', omitBackground: true })
  }

  async noteData(ck, game) {
    let mysApi = new MysApi(ck.uid, ck.ck, {}, '', '', game)

    let device_fp = await mysApi.getData('getFp')
    if (device_fp?.retcode !== 0) return false
    let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }

    let Data = await mysApi.getData('dailyNote', { headers })
    Data = await new MysInfo(this.e).checkCode(Data, 'dailyNote', mysApi, {}, true)
    if (Data?.retcode !== 0) return false
    await common.sleep(200)

    let signInfo = await mysApi.getData('sign_info')
    signInfo = await new MysInfo(this.e).checkCode(signInfo, 'sign_info', mysApi, {}, true)
    if (signInfo?.retcode !== 0) return false
    await common.sleep(200)

    return { Data, Sign: signInfo?.data || {} }
  }

  async noteZzz(res, uid) {
    let { data } = res
    const ImgData = {}

    Object.assign(ImgData, await this.resinRecoveryFields(data.energy.restore))
    ImgData.sale_state = /Doing/.test(data.vhs_sale.sale_state) ? '正在营业' : '未营业'
    ImgData.card = /Done/.test(data.card_sign) ? '已完成' : '未完成'

    return {
      uid: uid,
      saveId: uid,
      dayMb2: moment(new Date()).format('yyyy年MM月DD日 HH:mm') + ' ' + this.week[new Date().getDay()],
      ...ImgData,
      ...data
    }
  }

  async noteSr(res, uid) {
    let { data } = res

    const recovery = getRecoveryTime(data.stamina_recover_time)
    let resinMaxTime
    if (recovery) {
      const total = Math.ceil(recovery.seconds)
      const day = Math.floor(total / 86400)
      const hours = Math.floor(total / 3600) % 24
      const minutes = Math.floor(total / 60) % 60
      const seconds = total % 60
      const countdown = `${day ? `${day}天` : ''}${day || hours ? `${hours}小时` : ''}${day || hours || minutes ? `${minutes}分钟` : ''}${seconds}秒`
      const label = ['今日', '明日', '后日'][recovery.daysAhead] ?? recovery.dateLabel
      resinMaxTime = `${countdown} | [${label}]${recovery.clock}`
    }
    data.bfStamina = data.current_stamina / data.max_stamina * 100 + '%'
    // 头像
    let iconChar = _.sample([
      "希儿",
      "白露",
      "艾丝妲",
      "布洛妮娅",
      "姬子",
      "卡芙卡",
      "克拉拉",
      "停云",
      "佩拉",
      "黑塔",
      "希露瓦",
      "银狼",
    ])
    let char = Character.get(iconChar, "gs")
    return {
      uid,
      saveId: uid,
      sricon: char.imgs?.face,
      day: `${this.week[moment().day()]}`,
      resinMaxTime, nowDay: moment(new Date()).format('YYYY年MM月DD日'),
      ...data
    }
  }

  async notegs(res, uid) {
    let { data } = res

    /** 树脂 */
    const nowDay = moment().format('YYYY-MM-DD')
    const { resinMaxTime, resinMaxTimeMb2, resinMaxTimeMb2Day } = await this.resinRecoveryFields(data.resin_recovery_time)

    /** 派遣 */
    let remainedTime = ''
    for (let val of data.expeditions) {
      if (String(val.status) === 'Finished') {
        val.percentage = 100
      } else {
        val.percentage = 50
        if (data.expeditions && data.expeditions.length >= 1) {
          remainedTime = _.map(data.expeditions, "remained_time")
          remainedTime = _.min(remainedTime)

          if (remainedTime > 0) {
            let nowUnix = Number(moment().format("X"))
            remainedTime = nowUnix + Number(remainedTime)
            let remainedDate = moment.unix(remainedTime)
            remainedTime = remainedDate.format("HH:mm")

            if (remainedDate.format('YYYY-MM-DD') !== nowDay) {
              remainedTime = `明天 ${remainedTime}`
            } else {
              remainedTime = `今天 ${remainedTime}`
            }
          }
        }
      }
    }

    /** 宝钱 */
    let coinTime = ''
    let coinTimeMb2 = ''
    let coinTimeMb2Day = ''
    let chnNumChar = ['零', '明', '后', '三', '四', '五', '六', '七', '八', '九']
    if (!data.home_coin_recovery_time && data.current_home_coin < data.max_home_coin)
      data.home_coin_recovery_time = (data.max_home_coin - data.current_home_coin) / 30 * 3600

    if (data.home_coin_recovery_time > 0) {
      let coinDate = new Date(new Date().getTime() + data.home_coin_recovery_time * 1000)
      let coinDay = Math.floor(data.home_coin_recovery_time / 3600 / 24)
      let coinHour = Math.floor((data.home_coin_recovery_time / 3600) % 24)
      let coinMin = Math.floor((data.home_coin_recovery_time / 60) % 60)
      if (coinDay > 0) {
        coinTime = `${coinDay}天${coinHour}小时${coinMin}分钟`
        let dayTime = (24 - moment(new Date()).format('HH') + moment(coinDate).diff(new Date(), 'hours')) / 24
        coinTimeMb2Day = chnNumChar[dayTime.toFixed(0)] + '天'
        let timeDay = await this.dateTime_(coinDate)
        coinTimeMb2 = timeDay + moment(coinDate).format('hh:mm')
      } else {
        coinTimeMb2 = moment(coinDate).format('hh:mm')
        if (moment(coinDate).format('YYYY-MM-DD') !== nowDay) {
          coinTimeMb2Day = '明天'
          coinTime = `明天 ${moment(coinDate).format('hh:mm')}`
        } else {
          coinTimeMb2Day = '今天'
          coinTime = moment(coinDate).format('hh:mm', coinDate)
        }
      }
    }

    return {
      uid,
      saveId: uid,
      resinMaxTime,
      resinMaxTimeMb2,
      resinMaxTimeMb2Day,
      remainedTime,
      coinTime,
      coinTimeMb2,
      coinTimeMb2Day,
      dayMb2: moment(new Date()).format('yyyy年MM月DD日 HH:mm') + ' ' + this.week[new Date().getDay()],
      day: moment().format('MM-DD HH:mm') + ' ' + this.week[moment().day()],
      ...data
    }
  }

  async resinRecoveryFields (value) {
    const recovery = getRecoveryTime(value)
    if (!recovery) return {}

    const { date, daysAhead, dateLabel, clock } = recovery
    const label = ['今天', '明天', '后天'][daysAhead] ?? dateLabel
    const timeDay = await this.dateTime_(date)
    return {
      resinMaxTime: `${label} ${clock}`,
      resinMaxTimeMb2: timeDay + moment(date).format('hh:mm'),
      resinMaxTimeMb2Day: label
    }
  }

  async dateTime_(time) {
    return moment(time).format('HH') < 6
      ? '凌晨'
      : moment(time).format('HH') < 12
        ? '上午'
        : moment(time).format('HH') < 17.5
          ? '下午'
          : moment(time).format('HH') < 19.5
            ? '傍晚'
            : moment(time).format('HH') < 22
              ? '晚上'
              : '深夜'
  }
}
