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
    await common.sleep(200)

    let signInfo = await mysApi.getData('sign_info')
    signInfo = await new MysInfo(this.e).checkCode(signInfo, 'sign_info', mysApi, {}, true)
    if (signInfo?.retcode !== 0) return false

    return {
      ...this.screenData,
      daily: note.data,
      Sign: signInfo.data, 
      uid
    }
  }
}
