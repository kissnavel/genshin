import common from '../../../lib/common/common.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import Cfg from './Cfg.js'
import MysApi from './mys/mysApi.js'
import _ from 'lodash'
import moment from 'moment'
import base from './base.js'

export default class qrCode extends base {
    constructor(e) {
        super(e)
        this.model = 'qrCode'
    }

    async qrCodeLogin(e, mysApi) {
        let now = await redis.get(`genshin:qrCodeLogin:${e.user_id}:code`)
        if (now) return e.reply('前置二维码未扫描，请勿重复触发指令')
        let res = await mysApi.getData('qrCodeLogin')
        if (!res?.data) return e.reply(`二维码生成失败，异常：${res?.message}\n请稍后再试`)
        let screenData = this.screenData
        screenData.tplFile = `${this._path}/plugins/genshin/resources/qrCode/index.html`
        let data = {
            ...screenData,
            url: res?.data?.url
        }
        let img = await puppeteer.screenshot('qrCode/index', data)
        if (img) await e.reply(img)

        now = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
        await redis.set(`genshin:qrCodeLogin:${e.user_id}:code`, now, {
            EX: 100
        })

        let ticket = res?.data?.ticket
        let qrCode = 1
        for (let n = 1; n < 20; n++) {
            await common.sleep(5000)
            res = await mysApi.getData('qrCodeQuery', { ticket })
            if (res?.retcode && res.retcode !== 0) return e.reply(res?.message || '二维码已过期')

            if (res?.data?.status == 'Scanned' && qrCode == 1) {
                await e.reply('二维码已扫描，请确认登录')
                qrCode++
            }

            if (res?.data?.status == 'Confirmed') break
        }
        return res
    }

    async bindStoken(e, list, info) {
        let datalist = {}
        datalist[info.stuid] = {
            stuid: info.stuid,
            stoken: info.stoken,
            ltoken: info.ltoken,
            mid: info.mid,
            uid: list[0].game_uid,
            userId: e.user_id,
            type: /cn_|_cn/.test(list[0].region) ? 'mys' : 'hoyolab',
            region_name: list[0].region_name,
            region: list[0].region
        }
        await Cfg.saveSk(e.user_id, datalist)
        let msg = 'stoken绑定成功您可通过下列指令进行操作:'
        msg += '\n【#米币查询】查询米游币余额'
        msg += '\n【#mys原神签到】获取米游币'
        msg += '\n【#更新抽卡记录】更新原神抽卡记录'
        msg += '\n【#刷新ck】刷新失效cookie'
        msg += '\n【#我的stoken】查看stoken绑定信息'
        msg += '\n【#删除stoken】删除stoken绑定信息'

        return msg
    }

    async getStoken(e, qrCode) {
        let sign = qrCode == true ? true : false
        let type = e.game == 'zzz' ? '%' : e.game == 'sr' ? '*' : '#'
        let sks = await Cfg.getsks(false, e.user_id, sign)
        if (_.isEmpty(sks)) {
            e.reply([`stoken获取失败，请【${type}扫码登录】重新绑定`, segment.button([
                { text: `${type}扫码登录`, callback: `${type}扫码登录` }
            ])], false, { at: true })
            return false
        }

        let ltuids = _.map(sks, 'id')

        return { sks, ltuids }
    }
}
