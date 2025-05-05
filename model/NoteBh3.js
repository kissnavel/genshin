import MysApi from './mys/mysApi.js'
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
    let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }

    let note = await mysApi.getData('dailyNote', { headers })
    let daily = note.data
    if (!daily) {
      await this.e.reply('体力数据获取失败')
      return false
    }

    return {
      ...this.screenData,
      daily,
      uid
    }
  }
}
