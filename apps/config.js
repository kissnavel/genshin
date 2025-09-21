import plugin from '../../../lib/plugins/plugin.js'
import Cfg from '../model/Cfg.js'
import _ from 'lodash'

export class config extends plugin {
    constructor() {
        super({
            name: 'genshin·配置',
            dsc: '',
            event: 'message',
            priority: Cfg.getConfig('config').priority,
            rule: [
                {
                    reg: /^#(社区)?签到(添加|删除)?(白名单|推送)(群)?.*$/i,
                    permission: 'master',
                    fnc: 'setwhite'
                },
                {
                    reg: '^#?设置社区签到(经验|米币)$',
                    fnc: 'setbbs'
                },
                {
                    reg: '^#?(原神|星铁|绝区零|崩三|崩二|未定)?(禁用|解禁)(uid)?\\s*((1[0-9]|[1-9])[0-9]{8}|[1-9][0-9]{5,7})$',
                    fnc: 'banUid'
                }
            ]
        })
    }

    async setwhite(e) {
        let white = Cfg.getConfig('white')
        let id = e.msg.replace(/#(社区)?签到(添加|删除)?(白名单|推送)(群)?\s*/i, '').trim()
        if (e.msg.includes('群') || e.msg.includes('推送')) return e.reply('建议使用锅巴配置')

        let action = e.msg.includes('添加') ? '添加' : '删除'
        let set = white[e.msg.includes('群') ? 'Group' : e.msg.includes('社区') ? 'bbsQQ' : 'QQ']
        let name = e.msg.includes('群') ? '群' : 'QQ'
        let push = e.msg.includes('推送') ? '推送' : '白'

        if (!id) id = e.user_id

        id = Number(id) || String(id)

        if (action === '添加') {
            if (set && set.includes(id))
                return e.reply(`${name}:${id}已在${push}名单中`)
            set.push(id)
            Cfg.setConfig('white', white)
            return e.reply(`已${action}${push}名单${name}:${id}`)
        } else if (action === '删除') {
            if (set.length === 0)
                return e.reply(`未添加${push}名单${name}`)

            let index = set.findIndex(q => q == id)
            if (index !== -1) {
                set.splice(index, 1)
                Cfg.setConfig('white', white)
                e.reply(`已${action}${push}名单${name}:${id}`)
            } else {
                e.reply(`${name}:${id}未在${push}名单中`)
            }
            return
        } else {
            let msg = set.slice()
            msg = msg.map((e, i) => `${i + 1}. ${e}`).join(', ')
            return e.reply(msg, false)
        }
    }

    async setbbs(e) {
        let white = Cfg.getConfig('white')
        let id = Number(e.user_id) || String(e.user_id)

        if (e.msg.includes('经验')) {
            if (white.exQQ?.includes(id))
                return e.reply(`\n当前社区签到模式：【米币+经验】`, false, { at: true })

            white.exQQ.push(id)
            Cfg.setConfig('white', white)
            return e.reply(`\n社区签到模式已设置：【米币+经验】`, false, { at: true })
        } else if (e.msg.includes('米币')) {
            if (white.exQQ.length === 0)
                return e.reply(`\n当前社区签到模式：【米币】`, false, { at: true })

            let index = white.exQQ.findIndex(q => q == id)
            if (index !== -1) {
                white.exQQ.splice(index, 1)
                Cfg.setConfig('white', white)
                e.reply(`\n社区签到模式已设置：【米币】`, false, { at: true })
            } else {
                e.reply(`\n当前社区签到模式：【米币】`, false, { at: true })
            }
            return
        }
    }

    async banUid(e) {
        let uid = Number(e.msg.replace(/#?(原神|星铁|绝区零|崩三|崩二|未定)?(禁用|解禁)(uid)?\s*/i, '').trim())

        if (!uid) return e.reply('未输入UID')

        let Uid = Cfg.getConfig('banuid')

        let name = e.msg.includes('未定') ? '未定' : e.msg.includes('崩二') ? '崩二' : e.msg.includes('崩三') ? '崩三' : e.msg.includes('绝区零') ? '绝区零' : e.msg.includes('星铁') ? '星铁' : '原神'
        let set = Uid[e.msg.includes('未定') ? 'wd' : e.msg.includes('崩二') ? 'bh2' : e.msg.includes('崩三') ? 'bh3' : e.msg.includes('绝区零') ? 'zzz' : e.msg.includes('星铁') ? 'sr' : 'gs']
        let action = e.msg.includes('禁用') ? '禁用' : '解禁'
        let g = e.msg.includes('未定') ? 'wd' : e.msg.includes('崩二') ? 'bh2' : e.msg.includes('崩三') ? 'bh3' : e.msg.includes('绝区零') ? 'zzz' : e.msg.includes('星铁') ? 'sr' : 'gs'

        if (!e.isMaster) {
            let { cks } = await Cfg.getcks(false, e.user_id)
            if (_.isEmpty(cks[g]))
                return e.reply('未绑定ck,或此UID已禁用', false, { at: true })
            if (!cks[g][uid])
                return e.reply(`只能${action}自己已绑ck的uid\n或此UID已禁用`)
        }

        if (action === '禁用') {
            if (set && set.includes(uid))
                return e.reply(`${name}UID:${uid}已禁用`)

            set.push(uid)
            Cfg.setConfig('banuid', Uid)
            return e.reply(`已${action}${name}UID:${uid}`)
        } else {
            if (set.length === 0)
                return e.reply(`未添加禁用UID`)

            let index = set.findIndex(q => q == uid)
            if (index !== -1) {
                set.splice(index, 1)
                Cfg.setConfig('banuid', Uid)
                e.reply(`已${action}${name}UID:${uid}`)
            } else {
                e.reply(`${name}UID:${uid}未禁用`)
            }
            return
        }
    }
}
