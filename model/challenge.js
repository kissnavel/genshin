import _ from 'lodash'
import moment from 'moment'
import base from './base.js'
import MysApi from './mys/mysApi.js'
import MysInfo from './mys/mysInfo.js'

export default class srChallenge extends base {
  constructor (e) {
    super(e)
    this.model = 'StarRail'
  }

  static async get (e, challengeType, all) {
    let challenge = new srChallenge()
    return await challenge.allData(e, challengeType, all)
  }

  async queryChallenge (e, challengeType, all, uid, ck, device_fp) {
    const simple = e.msg.match('简易')

    if (all !== true) {
      uid = await this.userUid(e)
      ck = await this.userCk(e, uid)
    }

    let scheduleType = '1'
    if (e.msg.match('上期')) {
      scheduleType = '2'
    }
    if (e.msg.match('上期') && challengeType == 3) {
      scheduleType = '3'
    }

    let game = e.game
    let api = new MysApi(uid, ck, {}, '', '', game)
    if (all !== true) device_fp = await api.getData('getFp')
    let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }

    let challengeData, res, simpleRes
    // 先查详细的
    if (!simple) {
      let requestType = [
        'srChallengeBoss',
        'srChallengeStory',
        'srChallenge',
        'srChallengePeak'
      ][challengeType]
      res = await api.getData(requestType, { headers, schedule_type: scheduleType })
      res = await new MysInfo(e).checkCode(res, requestType, api, { headers, schedule_type: scheduleType }, true)
    }
    if (simple || res.retcode !== 0) {
      // 详细的出验证码了，查简单的
      let simpleRequestType = [
        'srChallengeBossSimple',
        'srChallengeStorySimple',
        'srChallengeSimple',
        'srChallengePeakSimple'
      ][challengeType]
      simpleRes = await api.getData(simpleRequestType, { headers, schedule_type: scheduleType })
      simpleRes = await new MysInfo(e).checkCode(simpleRes, simpleRequestType, api, { headers, schedule_type: scheduleType }, true)
      // 连简单的也出验证码，打住
      if (simpleRes.retcode !== 0) return false
    }
    if (!simple && res.retcode === 0) {
      challengeData = res
    } else if (simple && simpleRes.retcode === 0) {
      challengeData = simpleRes
    } else {
      challengeData = simpleRes
      let queryName = [
        '末日幻影',
        '虚构叙事',
        '忘却之庭',
        '异相仲裁'
      ][challengeType]
      logger.warn(`星铁${queryName}详细信息出现验证码，仅显示最后一层信息`)
    }
    const data = { ...challengeData.data }

    // 最新更新的深渊
    data.currentType = this.getCurrentChallengeType()
    // 起止日期要分开处理
    if ([0, 1].includes(challengeType)) {
      // 末日幻影、虚构叙事
      data.beginTime = this.timeFormat(data.groups[0].begin_time)
      data.endTime = this.timeFormat(data.groups[0].end_time)
    } else if (challengeType == 2) {
      // 忘却之庭
      data.beginTime = this.timeFormat(data.begin_time)
      data.endTime = this.timeFormat(data.end_time)
    } else {
      // 异相仲裁
      data.peak_records = e.msg.match('上期') ? data.challenge_peak_records[1] : data.challenge_peak_records[0]
      data.beginTime = this.timeFormat(data.peak_records.group.begin_time)
      data.endTime = this.timeFormat(data.peak_records.group.end_time)
    }
    if (challengeType != 3) {
      data.all_floor_detail = _.map(data.all_floor_detail, (floor) => {
        return {
          ...floor,
          node_1: {
            ...floor.node_1,
            ...(floor.node_1.challenge_time && {
              challengeTime: this.timeFormat(floor.node_1.challenge_time, 'YYYY.MM.DD HH:mm')
            }) // 快速通关就没有 challenge_time 这个属性
          },
          node_2: {
            ...floor.node_2,
            ...(floor.node_2.challenge_time && {
              challengeTime: this.timeFormat(floor.node_2.challenge_time, 'YYYY.MM.DD HH:mm')
            })
          }
        }
      })
    } else {
      // 异相仲裁
      // 王棋
      if (data.challenge_peak_records[0].boss_record) {
        data.challenge_peak_records[0].boss_record.challengeTime =
          this.timeFormat(data.challenge_peak_records[0].boss_record.challenge_time, 'YYYY.MM.DD HH:mm')
      }
      
      // 骑士
      data.challenge_peak_records[0].mob_records = 
        _.map(data.challenge_peak_records[0].mob_records, (record) => {
          return {
            ...record,
            ...(record.challenge_time && {
              challengeTime: this.timeFormat(record.challenge_time, 'YYYY.MM.DD HH:mm')
            })
          }
        })
    }
    // 末日幻影、虚构叙事：计算两边节点的总分
    if ([0, 1].includes(challengeType)) {
      data.all_floor_detail = _.map(data.all_floor_detail, (floor) => {
        return {
          ...floor,
          score: (parseInt(floor.node_1.score) + parseInt(floor.node_2.score)).toString()
        }
      })
    }

    return {
      data,
      uid,
      challengeType,
      type: scheduleType
    }
  }

  timeFormat (timeObj, format = 'YYYY.MM.DD') {
    const { year, month, day, hour, minute } = timeObj
    return moment({
      year,
      month: month - 1,
      day,
      hour,
      minute
    }).format(format)
  }

  getCurrentChallengeType () {
    // 获取当前时间
    let currentTime = new Date()

    // 获取第一期混沌回忆的时间
    let firstTime = new Date('2024-06-24T04:00:00')

    // 计算时间差距（以毫秒为单位）
    if (currentTime < firstTime) {
      logger.error('当前系统时间早于第一期末日幻影时间，请检查系统配置！')
    }
    let timeDiff = currentTime - firstTime
    // 2周（14天）为一个周期
    let periodNum = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 14))
    // 0: 末日
    // 1: 虚构
    // 2: 混沌
    return periodNum % 3
  }

  async userUid (e) {
    let user = e.user_id
    let ats = e.message.filter(m => m.type === 'at')
    if (ats.length > 0 && !e.atBot) {
      user = ats[0].qq
      e.user_id = user
    }
    let uid = e.msg.match(/\d+/)?.[0] || await MysInfo.getUid(e, false)
    if (!uid) {
      await e.reply('找不到uid，请：#刷新ck 或者：#扫码登录', true)
      return false
    }

    return uid
  }

  async userCk (e, uid) {
    let game = e.game
    let ck = await MysInfo.checkUidBing(uid, game)
    ck = ck.ck
    if (!ck) {
      await e.reply(`uid:${uid}当前尚未绑定Cookie`)
      return false
    }

    return ck
  }

  async allData (e, challengeType, all) {
    this.e.isSr = true
    let screenData = this.screenData
    let data
    if (all !== true) {
      data = await this.queryChallenge(e, challengeType)

      if (challengeType == 3) {
        screenData.tplFile = `${this._path}/plugins/genshin/resources/StarRail/html/challenge/index_peak.html`
      } else {
        screenData.tplFile = `${this._path}/plugins/genshin/resources/StarRail/html/challenge/index.html`
      }
      data = {
        ...data,
        ...screenData,
        saveId: data.uid,
        quality: 80
      }
    } else {
      let uid = await this.userUid(e)
      let ck = await this.userCk(e, uid)
      let game = e.game
      let api = new MysApi(uid, ck, {}, '', '', game)
      let device_fp = await api.getData('getFp')
      let hall = await this.queryChallenge(e, 2, true, uid, ck, device_fp)
      if (!hall) return false
      let story = await this.queryChallenge(e, 1, true, uid, ck, device_fp)
      if (!story) return false
      let boss = await this.queryChallenge(e, 0, true, uid, ck, device_fp)
      if (!boss) return false

      screenData.tplFile = `${this._path}/plugins/genshin/resources/StarRail/html/challenge/index_all.html`
      data = {
        ...screenData,
        saveId: uid,
        quality: 80,
        hall,
        story,
        boss
      }
    }

    return data
  }
}
