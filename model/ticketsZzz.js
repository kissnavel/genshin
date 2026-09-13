import base from './base.js'
import MysApi from './mys/mysApi.js'
import MysInfo from './mys/mysInfo.js'

export default class Tickets extends base {
    constructor (e) {
      super(e)
      this.model = 'Tickets'
    }
  
    async getData () {
      this.button = segment.button([
        { text: '#ck帮助', callback: '#ck帮助' },
        { text: '%sk帮助', callback: '%sk帮助' }
      ],[
        { text: '%扫码登录', callback: '%扫码登录' },
        { text: '%刷新ck', callback: '%刷新ck' }
      ])

      let uid = this.e.msg.match(/\d+/)?.[0] || await MysInfo.getUid(this.e, false)
      if (!uid) {
        await this.e.reply(['找不到uid，请：%刷新ck 或者：%扫码登录', this.button])
        return false
      }

      let ck = await MysInfo.checkUidBing(uid, 'zzz')
      ck = ck.ck
      if (!ck) {
        await this.e.reply([`uid:${uid}当前尚未绑定Cookie`, this.button])
        return false
      }

      let mysApi = new MysApi(uid, ck, {}, '', '', 'zzz')
      let device_fp = await mysApi.getData('getFp')
      if (device_fp?.retcode !== 0) return false
      let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }

      let res = await mysApi.getData('tickets', { headers })
      res = await new MysInfo(this.e).checkCode(res, 'tickets', mysApi, {}, true)

      this.e.apiSync = true

      if (!res || res.retcode !== 0) return false

      let ticketsType = {
        GACHA_TICKET_TYPE_RECHARGE_MONOCHROME: '菲林底片',
        GACHA_TICKET_TYPE_POLYCHROME: '菲林',
        GACHA_TICKET_TYPE_ENCRYPTED_MASTER_TAPE: '加密母带',
        GACHA_TICKET_TYPE_MASTER_TAPE: '原装母带',
        GACHA_TICKET_TYPE_BOOPON: '邦布券'
      }

      let tickets = [
        { ticket_type: ticketsType[res.data.tickets[0].ticket_type], ticket_cnt: res.data.tickets[0].ticket_cnt },
        { ticket_type: ticketsType[res.data.tickets[1].ticket_type], ticket_cnt: res.data.tickets[1].ticket_cnt },
        { ticket_type: ticketsType[res.data.tickets[2].ticket_type], ticket_cnt: res.data.tickets[2].ticket_cnt },
        { ticket_type: ticketsType[res.data.tickets[3].ticket_type], ticket_cnt: res.data.tickets[3].ticket_cnt },
        { ticket_type: ticketsType[res.data.tickets[4].ticket_type], ticket_cnt: res.data.tickets[4].ticket_cnt }
      ]

      let screenData = this.screenData

      return {
        uid: uid,
        saveId: uid,
        quality: 80,
        ...screenData,
        tickets
      }
    }
}
