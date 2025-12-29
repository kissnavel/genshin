import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import common from '../../../lib/common/common.js'
import MysInfo from './mys/mysInfo.js'
import MysApi from './mys/mysApi.js'
import base from './base.js'
import moment from 'moment'
import Cfg from './Cfg.js'
import getDeviceFp from './getDeviceFp.js'
import _ from 'lodash'

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
    if (_.every(cks, _.isEmpty)) return e.reply('请【#扫码登录】绑定ck\n或尝试【#刷新ck】', false, { at: true })

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
    if (!this.set.NoteTask) return

    let sendCD = this.set.sendCD * 3600;
    let Note = Cfg.getConfig('defnote')
    if (_.isEmpty(Note)) return

    for (let bot_id in Note)
      for (let user_id in Note[bot_id]) {
        logger.mark(`[定时任务:检查体力推送]Bot:${bot_id};User:${user_id}`)
        let User = Note[bot_id][user_id]
        user_id = Number(user_id) || user_id
        let { cks } = await Cfg.getcks(false, user_id, true)
        let imgs = {}, Resins = {}
        for (let group_id in User) {
          let Group = User[group_id]
          this.e = {
            user_id: user_id,
            qq: user_id,
            msg: "体力",
            isSr: false,
            isZzz: false
          }
          let sendMsg = [segment.at(user_id), this.set.TaskMsg]
          let length = sendMsg.length
          this.e.reply = (msg) => { sendMsg.push(msg) }

          for (let g of ['gs', 'sr', 'zzz']) {
            this.e.isSr = g == 'sr' ?? true
            this.e.isZzz = g == 'zzz' ?? true
            for (let uid of Group[g]) {
              let data = {}, Resin = Group[`${g}_Resin`]
              let sendkey = `${group_id}:${bot_id}:${g}_NoteTask:${uid}`
              if (await redis.get(sendkey)) continue

              if (imgs[`${g}_${uid}`]) {
                if (Number(Resins[`${g}_${uid}`]) < Number(Resin)) continue
                logger.mark(`[体力推送]Bot:${bot_id};Group:${group_id};QQ:${user_id};${`${g}_UID`}:${uid}`)

                await redis.set(sendkey, "1", { EX: sendCD })
                await this.e.reply(imgs[`${g}_${uid}`])
                continue
              }

              if (!cks[g][uid]) continue
              let ck = cks[g][uid]

              let { Data, Sign } = await this.noteData(ck, g)
              if (Data?.retcode !== 0 || _.isEmpty(res?.Sign)) continue

              Resins[`${g}_${uid}`] = this.e.isZzz ? Data?.data.energy.progress.current : Data?.data[`current_${this.e.isSr ? 'stamina' : 'resin'}`]
              if (Number(Resins[`${g}_${uid}`]) >= Number(Resin)) {
                logger.mark(`[体力推送]Bot:${bot_id};Group:${group_id};QQ:${user_id};${`${g}_UID`}:${uid}`)

                data = this.e.isZzz ? await this.noteZzz(Data, uid) : this.e.isSr ? await this.noteSr(Data, uid) : await this.notegs(Data, uid)
                data = {
                  quality: 80,
                  ...this.screenNote,
                  ...data,
                  ...Sign
                }
                imgs[`${g}_${uid}`] = await puppeteer.screenshot(`${data.gstempFile}dailyNote`, data)
              }

              if (imgs[`${g}_${uid}`]) {
                await redis.set(sendkey, "1", { EX: sendCD })
                await this.e.reply(imgs[`${g}_${uid}`])
              }
            }
          }
          if (sendMsg.length > length) {
            Bot[bot_id].pickGroup(group_id).sendMsg(sendMsg)
            await common.sleep(5000)
          }
        }
      }

    return
  }

  async getData(ck, game) {
    let res = await this.noteData(ck, game)
    if (res?.Data?.retcode !== 0 || _.isEmpty(res?.Sign)) return false

    this.e.isSr = game == 'sr' ? true : false
    this.e.isZzz = game == 'zzz' ? true : false
    let data = this.e.isZzz ? await this.noteZzz(res.Data, ck.uid) : this.e.isSr ? await this.noteSr(res.Data, ck.uid) : await this.notegs(res.Data, ck.uid)

    data = {
      quality: 80,
      ...this.screenNote,
      ...data,
      ...res.Sign
    }
    let img = await puppeteer.screenshot(`${data.gstempFile}dailyNote`, data)
    if (img) return await this.e.reply(img)
  }

  async noteData(ck, game) {
    let mysApi = new MysApi(ck.uid, ck.ck, {}, '', '', game)

    let { deviceFp } = await getDeviceFp.Fp(ck.uid, ck.ck, game)
    let headers = { 'x-rpc-device_fp': deviceFp }
    await common.sleep(200)

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

    const nowDay = moment(new Date()).format('DD')
    if (data.energy.restore > 0) {
      let resinMaxTime = new Date().getTime() + data.energy.restore * 1000
      let maxDate = new Date(resinMaxTime)

      resinMaxTime = moment(maxDate).format('HH:mm')
      let timeDay = await this.dateTime_(maxDate)
      ImgData.resinMaxTimeMb2 = timeDay + moment(maxDate).format('hh:mm')

      if (moment(maxDate).format('DD') !== nowDay) {
        ImgData.resinMaxTimeMb2Day = '明天'
        resinMaxTime = `明天 ${resinMaxTime}`
      } else {
        ImgData.resinMaxTimeMb2Day = '今天'
        resinMaxTime = ` ${resinMaxTime}`
      }
      ImgData.resinMaxTime = resinMaxTime
    }
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

    /** 树脂 */
    let resinMaxTime
    if (data.stamina_recover_time > 0) {
      let d = moment.duration(data.stamina_recover_time, 'seconds')
      let day = Math.floor(d.asDays())
      let hours = d.hours()
      let minutes = d.minutes()
      let seconds = d.seconds()
      resinMaxTime = hours + '小时' + minutes + '分钟' + seconds + '秒'
      //精确到秒。。。。
      if (day > 0) {
        resinMaxTime = day + '天' + hours + '小时' + minutes + '分钟' + seconds + '秒'
      } else if (hours > 0) {
        resinMaxTime = hours + '小时' + minutes + '分钟' + seconds + '秒'
      } else if (minutes > 0) {
        resinMaxTime = minutes + '分钟' + seconds + '秒'
      } else if (seconds > 0) {
        resinMaxTime = seconds + '秒'
      }
      if ((day > 0) || (hours > 0) || (seconds > 0)) {
        let total_seconds = 3600 * hours + 60 * minutes + seconds
        const now = new Date()
        const dateTimes = now.getTime() + total_seconds * 1000
        const date = new Date(dateTimes)
        const dayDiff = date.getDate() - now.getDate()
        const str = dayDiff === 0 ? '今日' : '明日'
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date
          .getMinutes()
          .toString()
          .padStart(2, '0')}`
        let recoverTimeStr = ` | [${str}]${timeStr}`
        resinMaxTime += recoverTimeStr
      }
    }
    data.bfStamina = data.current_stamina / data.max_stamina * 100 + '%'
    /** 派遣 */
    for (let item of data.expeditions) {
      let d = moment.duration(item.remaining_time, 'seconds')
      let day = Math.floor(d.asDays())
      let hours = d.hours()
      let minutes = d.minutes()
      item.dateTime = ([day + '天', hours + '时', minutes + '分'].filter(v => !['0天', '0时', '0分'].includes(v))).join('')
      item.bfTime = (72000 - item.remaining_time) / 72000 * 100 + '%'
      if (item.avatars.length == 1) {
        item.avatars.push('派遣头像')
      }
    }
    // 派遣头像
    let promises = []
    for (let avatars of data.expeditions) {
      for (let avatar of avatars.avatars)
        promises.push(avatar)
    }
    await Promise.all(promises)
    let icon = Math.floor(Math.random() * promises.length)
    let sricon = promises[icon]
    if (!sricon) sricon = `${this._path}/plugins/genshin/resources/StarRail/img/other/face.png`
    return {
      uid,
      saveId: uid,
      sricon,
      day: `${this.week[moment().day()]}`,
      resinMaxTime, nowDay: moment(new Date()).format('YYYY年MM月DD日'),
      ...data
    }
  }

  async notegs(res, uid) {
    let { data } = res

    /** 树脂 */
    let nowDay = moment(new Date()).format('DD')
    let resinMaxTime, resinMaxTimeMb2, resinMaxTimeMb2Day
    if (data.resin_recovery_time > 0) {
      resinMaxTime = new Date().getTime() + data.resin_recovery_time * 1000
      let maxDate = new Date(resinMaxTime)
      resinMaxTime = moment(maxDate).format('HH:mm')
      let timeDay = await this.dateTime_(maxDate)
      resinMaxTimeMb2 = timeDay + moment(maxDate).format('hh:mm')

      if (moment(maxDate).format('DD') !== nowDay) {
        resinMaxTimeMb2Day = '明天'
        resinMaxTime = `明天 ${resinMaxTime}`
      } else {
        resinMaxTimeMb2Day = '今天'
        resinMaxTime = ` ${resinMaxTime}`
      }
    }

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

            if (remainedDate.date() != nowDay) {
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
        if (moment(coinDate).format('DD') !== nowDay) {
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
