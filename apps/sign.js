import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import BBsSign from '../model/bbsSign.js'
import MysSign from '../model/sign.js'
import Cfg from '../model/Cfg.js'
import moment from 'moment'

let START
let command = Cfg.getConfig('command')
export class sign extends plugin {
    constructor() {
        super({
            name: 'genshin·签到',
            dsc: '游戏及社区签到',
            event: 'message',
            priority: Cfg.getConfig('config').priority,
            rule: [
                {
                    reg: '^#?(重新)?(全部签到|签到任务)$',//使用#重新全部签到时请确保同时没有正在进行的相同的签到任务
                    permission: 'master',
                    fnc: 'Task'
                },
                {
                    reg: '^#?社区(重新)?(全部签到|签到任务)$',//使用#社区重新全部签到时请确保同时没有正在进行的相同的签到任务
                    permission: 'master',
                    fnc: 'bbsTask'
                },
                {
                    reg: `^#?${command.sign}$`,
                    fnc: 'sign',
                },
                {
                    reg: `^#?${command.bbssign}$`,
                    fnc: 'bbsSign',
                }
            ]
        })
        this.config = Cfg.getConfig('config')
        this.white = Cfg.getConfig('white')
        this.task = [
            {
                cron: this.config.signTime,
                name: '签到任务',
                fnc: () => this.Task()
            },
            {
                cron: this.config.bbsSignTime,
                name: '米游社米币签到任务',
                fnc: () => this.bbsTask()
            }
        ]
    }

    async Task() {
        await new MysSign(this.e).signTask(!!this?.e?.msg)
        return
    }

    async bbsTask() {
        await new BBsSign(this.e).bbsTask(!!this?.e?.msg)
        return
    }

    async sign(e) {
        if (!await this.checkwhite(e)) return
        await MysSign.sign(e)
        return
    }

    async bbsSign(e) {
        if (!await this.checkwhite(e)) return
        START = moment().unix()
        let send = []
        let msg = e.msg?.replace(/(米游社|mys|社区|签到|#)/g, "")

        let list = await BBsSign.bbsSign(e, msg)
        if (!list) return
        
        for (let res of list)
            send.push(res.message)

        await this.replyMsg(e, send)
        return
    }

    async replyMsg(e, msgs) {
        const END = moment().unix()
        logger.info(`社区签到结束, 用时 ${END - START} 秒`)
        let id = Number(e.user_id) || String(e.user_id)
        let msg = `签到模式：【米币${this.white.exQQ?.includes(id) ? '+经验' : ''}】\n总用时 ${END - START} 秒`
        msgs.push(msg)
        msgs = await common.makeForwardMsg(e, msgs)
        e.reply('社区签到完成', false, { at: true })
        e.reply(msgs)
        return
    }

    async checkwhite(e) {
        if (e.isMaster) return true
        if (this.config.whiteSign){
            if (Array.isArray(this.white.Group) && this.white.Group.length > 0)
                if (!this.white.Group.includes(`${e.self_id}:${e.group_id}`)) {
                    e.reply('本群不可签到')
                    return false
                }
        }
        return true
    }
}
