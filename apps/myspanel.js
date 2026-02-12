// 原神、星铁米游社面板代码来源：https://github.com/thisee/xiaokeli，已修改适配本仓库
// 2024-10-18 目前只写了原神和星铁的4星5星圣遗物(遗器)识别
import plugin from '../../../lib/plugins/plugin.js'
import ProfileList from '../model/ProfileList.js'
import Myspanel from '../model/myspanel.js'
import MysInfo from '../model/mys/mysInfo.js'
import MysApi from '../model/mys/mysApi.js'
import Cfg from '../model/Cfg.js'
import moment from 'moment'

export class myspanel extends plugin {
    constructor() {
        super({
            name: 'genshin·米游社更新面板',
            dsc: '获取米游社角色数据',
            event: 'message',
            priority: Cfg.getConfig('config').priority,
            rule: [{
                reg: '^#?(原神|星铁)?(米游社|mys)?(全部面板更新|更新全部面板|获取游戏角色详情|更新面板|面板更新)',
                fnc: 'mys'
            }]
        })
    }

    async mys(e) {
        let panel = Cfg.getConfig('config').myspanel
        if (!panel) return false

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
        let game = e.game
        let ck = await MysInfo.checkUidBing(uid, game)
        ck = ck.ck
        if (!ck) {
            await e.reply(`uid:${uid}当前尚未绑定Cookie`)
            return false
        }

        let CD = Cfg.getConfig('config').myspanelCD
        let now
        if (CD > 0) {
            now = moment(new Date()).format('YYYY-MM-DD HH:mm:ss')
            let time_ = await redis.get(`bujidao:myspanelCD:${e.user_id}:${uid}`);
            if (time_) {
                let seconds = moment(now).diff(moment(time_), 'seconds')
                return e.reply(`UID：${uid}\n米游社更新面板cd中\n还需等待：${CD - seconds}秒`, true)
            }
        }

        await e.reply(`开始查询uid:${uid}的米游社面板数据，可能会需要一定时间~`, true)
        let mysApi = new MysApi(uid, ck, {}, '', '', game)
        let device_fp = await mysApi.getData('getFp')
        if (device_fp?.retcode !== 0) return false
        let headers = { 'x-rpc-device_fp': device_fp?.data?.device_fp }
        let res, data
        if (game == 'sr') {
            data = await mysApi.getData('avatarInfo', { headers })
            data = await new MysInfo(e).checkCode(data, 'avatarInfo', mysApi, {}, true)
            if (!data.data) {
                logger.mark('米游社查询失败')
                return false
            }
            await Myspanel.sr_mys(data, uid)
        } else {
            res = await mysApi.getData('character', { headers })
            res = await new MysInfo(e).checkCode(res, 'character', mysApi, {}, true)
            if (!res.data) {
                logger.mark('米游社查询失败')
                return false
            }
            let ids = []
            res.data.list.map((value) => {
                ids.push(value.id)
            })
            data = await mysApi.getData('characterDetail', { headers, character_ids: ids })
            data = await new MysInfo(e).checkCode(data, 'characterDetail', mysApi, {}, true)
            if (!data.data) {
                logger.mark('米游社查询失败')
                return false
            }
            await Myspanel.gs_mys(data, uid)
        }
        //加载面板列表图
        await ProfileList.reload(e)
        if (CD > 0) {
            now = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
            await redis.set(`bujidao:myspanelCD:${e.user_id}:${uid}`, now, {
                EX: CD
            })
        }
    }
}
