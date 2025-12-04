import common from '../../../lib/common/common.js'
import MysApi from './mys/mysApi.js'
import MysInfo from './mys/mysInfo.js'
import base from './base.js'
import gsCfg from './gsCfg.js'

export default class Note extends base {
  constructor (e) {
    super(e)
    this.model = 'dailyNote'
  }

  static async get (e) {
    let note = new Note(e)
    return await note.getData()
  }

  async getData () {
    let { uid, ck, game_biz, region } = await gsCfg.othergame(this.e)
    let game = this.e.game
    let mysApi = new MysApi(uid, ck, { game }, region, game_biz)
    let device_fp = await mysApi.getData('getFp')
    device_fp = await new MysInfo(this.e).checkCode(device_fp, 'getFp', mysApi, {}, true)
    if (device_fp?.retcode !== 0) return false
    let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }
    await common.sleep(200)

    let note = await mysApi.getData('dailyNote', { headers })
    note = await new MysInfo(this.e).checkCode(note, 'dailyNote', mysApi, {}, true)
    if (note?.retcode !== 0) {
      await this.e.reply('体力数据获取失败')
      return false
    }
    let daily = note.data
    daily = this.processTimeData(daily)

    await common.sleep(200)

    let signInfo = await mysApi.getData('sign_info')
    signInfo = await new MysInfo(this.e).checkCode(signInfo, 'sign_info', mysApi, {}, true)
    if (signInfo?.retcode !== 0) return false

    return {
      ...this.screenData,
      daily,
      Sign: signInfo.data, 
      uid
    }
  }

  formatTimeDiff (timestamp) {
    const now = Math.floor(Date.now() / 1000)
    const diff = timestamp - now
    if (diff <= 0) {
      return "已结束"
    }
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const minutes = Math.floor((diff % 3600) / 60)
    const displayHours = minutes >= 0 ? hours + 1 : hours
    return `${String(days).padStart(2, "0")} 天 / ${String(displayHours).padStart(2, "0")} 小时`
  }

  formatStaminaTime (seconds) {
    if (seconds <= 0) {
      return "已全部恢复"
    }
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h:${String(minutes).padStart(2, "0")}min`
  }

  processTimeData (daily) {
    if (daily.stamina_recover_time !== undefined) {
      daily.stamina_recover_time = this.formatStaminaTime(daily.stamina_recover_time)
    }
    if (daily.greedy_endless && daily.greedy_endless.schedule_end) {
      daily.greedy_endless.schedule_end = this.formatTimeDiff(daily.greedy_endless.schedule_end)
    }
    if (daily.ultra_endless && daily.ultra_endless.schedule_end) {
      daily.ultra_endless.schedule_end = this.formatTimeDiff(daily.ultra_endless.schedule_end)
    }
    if (daily.battle_field && daily.battle_field.schedule_end) {
      daily.battle_field.schedule_end = this.formatTimeDiff(daily.battle_field.schedule_end)
    }
    if (daily.god_war && daily.god_war.schedule_end) {
      daily.god_war.schedule_end = this.formatTimeDiff(daily.god_war.schedule_end)
    }
    return daily
  }
}
