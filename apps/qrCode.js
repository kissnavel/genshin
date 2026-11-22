import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import Cfg from '../model/Cfg.js'
import User from '../model/user.js'
import MysApi from '../model/mys/mysApi.js'
import MysInfo from '../model/mys/mysInfo.js'
import qrcode from '../model/qrCode.js'
import GachaLog from '../model/gachaLog.js'

let refreshingAllCk = false

export class qrCode extends plugin {
    constructor() {
        super({
            name: 'genshin·刷新',
            dsc: '扫码登录等部分功能的配置',
            event: 'message',
            priority: Cfg.getConfig('config').priority,
            rule: [
                {
                    reg: '^#?(刷新|更新)全部(c|C)(oo)?k(ie)?$',
                    permission: 'master',
                    fnc: 'upAllCookie'
                },
                {
                    reg: '^#?(原神|星铁|绝区零)?(刷新|更新)(c|C)(oo)?k(ie)?$',
                    fnc: 'upCookie'
                },
                {
                    reg: '^#?(原神|星铁|绝区零)?绑定(s|S)(to)?k(en)?$',
                    fnc: 'bindStoken'
                },
                {
                    reg: '^#?(原神|星铁|绝区零)?(扫码|二维码)(登录|绑定|登陆)$',
                    fnc: 'qrCodeLogin'
                },
                {
                    reg: '^#?米币查询$',
                    fnc: 'bbsisSign'
                },
                {
                    reg: '^#?(我的|删除)(s|S)(to)?k(en)?$',
                    fnc: 'getStoken'
                },
                {
                    reg: '^#?(原神|星铁|绝区零)?(s|S)(to)?k(en)?(帮助|教程)$',
                    fnc: 'helpStoken'
                },
                {
                    reg: "^#?(刷新|更新|获取)抽卡(链接|记录)?$",
                    fnc: 'refreshGachaLog'
                }
            ]
        })
    }

    async helpStoken(e) {
        let gametype = e.game == 'zzz' ? '%' : e.game == 'sr' ? '*' : '#'
        let msgs = [
            '[stoken帮助]',
            '方法一(仅支持国服)：',
            '1、给机器人发送"(#/*/%)扫码登录"指令，并按照提示操作',
            '2、提示绑定成功',
            '方法二(支持国服与国际服)：',
            '1、使用抓包软件抓取(米游社/hoyolab)APP主页的请求',
            '2、在抓取的请求头的Cookie内找到"stuid"、"stoken"、"mid"',
            '3、自行构造如下格式的stoken信息：',
            '{"stuid": "抓取的stuid", "stoken": "抓取的stoken", "mid": "抓取的mid"}',
            '4、给机器人发送"(#/*/%)绑定sk"指令(需绑定对应游戏的uid)',
            '5、机器人会提示发送stoken信息',
            '6、粘贴自行构造的stoken信息，并发送',
            '7、提示绑定成功'
        ]
        msgs = msgs.join('\n')
        return e.reply([msgs, segment.button([
            { text: `${gametype}扫码登录`, callback: `${gametype}扫码登录` },
            { text: `${gametype}绑定sk`, callback: `${gametype}绑定sk` }
        ])])
    }

    async bbsisSign(e) {
        let { sks, ltuids } = await new qrcode(e).getStoken(e, true)

        let msgs = []
        for (let i of ltuids) {
            let mysApi = new MysApi(sks[i].stuid, sks[i].sk, { game: 'bbs' }, sks[i].region)

            let res = await mysApi.getData('bbsisSign')
            if (!res?.data) {
                msgs.push(`stuid：${sks[i].stuid}，请求异常：${res.message}`)
            } else {
                msgs.push(`米游社通行证：${sks[i].stuid}`)
                msgs.push(`当前米游币数量为：${res.data.total_points}，今日剩余可获取：${res.data.can_get_points}`)
            }
            msgs.push('*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-')
        }
        msgs = msgs.join('\n')
        return e.reply(msgs)
    }

    async getStoken(e) {
        if (e.group) return e.reply('请私聊发送指令')
        let { sks, ltuids } = await new qrcode(e).getStoken(e)

        let msgs = []
        msgs.push('stoken绑定信息：')
        if (e.msg.match('删除')) {
            for (let i of ltuids) {
                await Cfg.delsk(e.user_id, sks[i].stuid)
                msgs.push(`已删除stoken：${sks[i].stuid}`)
                msgs.push('*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-')
            }
            msgs = msgs.join('\n')
            return e.reply(msgs)
        }

        for (let i of ltuids) {
            msgs.push(`米游社通行证：${sks[i].stuid}`)
            msgs.push(`stoken：${sks[i].sk}`)
            msgs.push('*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-')
        }
        msgs = msgs.join('\n')
        return e.reply(msgs)
    }

    async qrCodeLogin(e) {
        let now = await redis.get(`genshin:qrCodeLogin:${e.user_id}:code`)
        if (now) return e.reply('前置二维码未扫描，请勿重复触发指令')
        let mysApi = new MysApi('', '', { game: 'bbs' })

        let res = await new qrcode(e).qrCodeLogin(e, mysApi)
        if (res?.data?.status !== 'Confirmed') return e.reply('验证超时')
        if (!res?.data) return e.reply(`扫码登录失败：${res.message || "接口返回为空"}`)
        const Stoken = res.data?.tokens[0].token
        const Stuid = res.data?.user_info?.aid
        const Mid = res.data?.user_info?.mid
        if (!Stoken || !Stuid || !Mid) return e.reply('扫码登录返回信息不完整')

        const ltokenData = await mysApi.getData('exchange', { token: Stoken, type: 2, mid: Mid })
        if (!ltokenData?.data) return e.reply(`获取ltoken_v2失败：${ltokenData?.message || "接口返回为空"}`)

        const cookietokenData = await mysApi.getData('exchange', { token: Stoken, type: 4, mid: Mid })
        if (!cookietokenData?.data) return e.reply(`获取cookie_token_v2失败：${cookietokenData?.message || "接口返回为空"}`)

        e.ck = `ltoken_v2=${ltokenData.data?.token?.token};ltuid_v2=${Stuid};cookie_token_v2=${cookietokenData.data?.token?.token};account_mid_v2=${Mid};`

        for (let biz of ['hk4e_cn', 'hkrpg_cn', 'nap_cn']) {
            mysApi = new MysApi(Stuid, e.ck, { game: 'bbs' }, '', biz)
            res = await mysApi.getData('UserGame')
            if (res?.data?.list.length !== 0) break
        }
        let list = res?.data?.list
        if (list.length == 0) return e.reply(`绑定stoken失败，无uid信息`)

        let info = {
            stuid: Stuid,
            stoken: Stoken,
            mid: Mid
        }

        let msg = new qrcode(e).bindStoken(e, list, info)
        await e.reply(msg)

        await new User(e).bing()
    }

    /** 根据单条 stoken 记录换取最新版 v2 Cookie */
    async exchangeCkBySk(sk) {
        if (!sk?.stuid || !sk?.stoken || !sk?.mid) {
            return { ok: false, reason: 'stoken信息不完整' }
        }

        let game = ''
        if (sk.type == 'hoyolab') {
            if (/os_/.test(sk.region)) {
                game = 'gs'
            } else if (/official/.test(sk.region)) {
                game = 'sr'
            } else if (/_us|_eu|_jp|_sg/.test(sk.region)) {
                game = 'zzz'
            } else {
                game = 'gs'
            }
        } else {
            if (/cn_/.test(sk.region)) {
                game = 'gs'
            } else if (/_cn/.test(sk.region)) {
                game = String(sk.uid || '').length < 10 ? 'zzz' : 'sr'
            } else {
                game = 'bbs'
            }
        }

        let mysApi = new MysApi(sk.uid || sk.stuid, sk.sk, { game, log: false })
        if (sk.type == 'hoyolab') {
            let res = await mysApi.getData('getBySToken')
            const tokens = res?.data?.tokens
            const ltokenV2 = tokens?.find(t => Number(t.token_type) === 2)?.token || tokens?.[0]?.token
            const cookieTokenV2 = tokens?.find(t => Number(t.token_type) === 4)?.token || tokens?.[1]?.token
            if (!ltokenV2 || !cookieTokenV2 || (res?.retcode != null && Number(res.retcode) !== 0)) {
                return { ok: false, reason: res?.message || '接口返回为空' }
            }
            return {
                ok: true,
                ck: `ltoken_v2=${ltokenV2};ltuid_v2=${sk.stuid};account_id_v2=${sk.stuid};cookie_token_v2=${cookieTokenV2};ltmid_v2=${sk.mid};account_mid_v2=${sk.mid};`
            }
        } else {
            let ltokenData = await mysApi.getData('exchange', { token: sk.stoken, type: 2, mid: sk.mid })
            let cookietokenData = await mysApi.getData('exchange', { token: sk.stoken, type: 4, mid: sk.mid })
            const ltokenV2 = ltokenData?.data?.token?.token
            const cookieTokenV2 = cookietokenData?.data?.token?.token
            if (!ltokenV2 || (ltokenData?.retcode != null && Number(ltokenData.retcode) !== 0)) {
                return { ok: false, reason: ltokenData?.message || '获取ltoken_v2失败' }
            }
            if (!cookieTokenV2 || (cookietokenData?.retcode != null && Number(cookietokenData.retcode) !== 0)) {
                return { ok: false, reason: cookietokenData?.message || '获取cookie_token_v2失败' }
            }
            return {
                ok: true,
                ck: `ltoken_v2=${ltokenV2};ltuid_v2=${sk.stuid};account_id_v2=${sk.stuid};cookie_token_v2=${cookieTokenV2};ltmid_v2=${sk.mid};account_mid_v2=${sk.mid};`
            }
        }
    }

    async upCookie(e) {
        let { sks, ltuids } = await new qrcode(e).getStoken(e)
        if (!sks || !ltuids) return false

        for (let i of ltuids) {
            let ret = await this.exchangeCkBySk(sks[i])
            if (!ret.ok) {
                await e.reply(`stuid:${sks[i].stuid},请求异常：${ret.reason}`)
                continue
            }
            e.ck = ret.ck
            await new User(e).bing()
        }
    }

    /** 主人指令：遍历所有 stoken，将有效用户的 ck 更新至最新版 v2 ck */
    async upAllCookie(e) {
        if (refreshingAllCk) {
            return e.reply('刷新全部ck任务正在进行中，请稍后再试')
        }

        let skMap = await Cfg.getsks(true, '', false)
        let list = Object.values(skMap || {})
        if (list.length === 0) {
            return e.reply('暂无已绑定的stoken数据')
        }

        refreshingAllCk = true
        const start = Date.now()
        let successCount = 0
        let skFailList = []
        let bindFailList = []

        try {
            await e.reply(`开始刷新全部ck，共 ${list.length} 个stoken，请稍候...`)

            for (let idx = 0; idx < list.length; idx++) {
                let sk = list[idx]
                try {
                    let ret = await this.exchangeCkBySk(sk)
                    if (!ret.ok) {
                        skFailList.push(`QQ:${sk.userId || '未知'} (stuid:${sk.stuid}) - ${ret.reason}`)
                        logger.warn(`[刷新全部ck] sk无效/异常 qq:${sk.userId} stuid:${sk.stuid} reason:${ret.reason}`)
                    } else if (!sk.userId) {
                        bindFailList.push(`stuid:${sk.stuid} - 缺少userId`)
                        logger.warn(`[刷新全部ck] 缺少userId stuid:${sk.stuid}`)
                    } else {
                        let bindE = {
                            user_id: sk.userId,
                            ck: ret.ck,
                            AutoupCookie: true,
                            logFnc: e?.logFnc || '[刷新全部ck]'
                        }
                        let ok = await new User(bindE).bing()
                        if (ok) {
                            successCount++
                            logger.mark(`[刷新全部ck] 更新成功 (${idx + 1}/${list.length}) qq:${sk.userId} stuid:${sk.stuid}`)
                        } else {
                            bindFailList.push(`QQ:${sk.userId} (stuid:${sk.stuid}) - 绑定校验失败`)
                            logger.warn(`[刷新全部ck] 绑定校验失败 qq:${sk.userId} stuid:${sk.stuid}`)
                        }
                    }
                } catch (err) {
                    bindFailList.push(`QQ:${sk.userId || '未知'} (stuid:${sk.stuid}) - ${err?.message || '未知异常'}`)
                    logger.error(`[刷新全部ck] 处理异常 qq:${sk.userId} stuid:${sk.stuid}`, err)
                }

                if (idx < list.length - 1) {
                    await common.sleep(1000 + Math.floor(Math.random() * 1000))
                }
            }

            const elapsed = Cfg.countTime(Math.max(1, Math.round((Date.now() - start) / 1000)))
            let msgs = [
                '【刷新全部ck完成】',
                `总计：${list.length} | 成功：${successCount} | sk失效/异常：${skFailList.length} | 绑定失败：${bindFailList.length}`,
                `总耗时：${elapsed}`
            ]

            const appendFailList = (title, items) => {
                if (items.length === 0) return
                msgs.push(`\n${title}：`)
                msgs.push(...items.slice(0, 15))
                if (items.length > 15) {
                    msgs.push(`...其余 ${items.length - 15} 条请查看控制台日志`)
                }
            }

            appendFailList('sk失效/异常列表', skFailList)
            appendFailList('绑定失败列表', bindFailList)

            await e.reply(msgs.join('\n'))
        } finally {
            refreshingAllCk = false
        }
    }

    async bindStoken(e) {
        if (e.group) return e.reply('请私聊发送指令')
        let uid = await MysInfo.getUid(e, false)
        if (!uid) return e.reply('请绑定uid后再操作')
        let game = e.game
        await redis.set(`genshin:bindStoken:${e.user_id}:uid`, uid, {
            EX: 120
        })
        await redis.set(`genshin:bindStoken:${e.user_id}:game`, game, {
            EX: 120
        })
        //先throw一步
        this.setContext('toBindStoken')
        await e.reply(`为UID ${uid}绑定stoken，请发送stoken信息，或者发送“取消”取消绑定`, false, { at: true, recallMsg: 100 })
    }

    async toBindStoken() {
        let info = this.e.msg.trim()
        if (info.includes('取消')) {
            await this.e.reply('已取消', false, { at: true, recallMsg: 100 })
            this.finish('toBindStoken')
            return false
        }
        info = JSON.parse(info)
        if (!info?.stuid || !info?.stoken || !info?.mid) {
            await this.e.reply('stoken信息格式错误')
            this.finish('toBindStoken')
            return false
        }

        let sk = `stuid=${info.stuid};stoken=${info.stoken};mid=${info.mid}`
        let uid = await redis.get(`genshin:bindStoken:${this.e.user_id}:uid`)
        let game = await redis.get(`genshin:bindStoken:${this.e.user_id}:game`)

        let mysApi = new MysApi(uid, sk, { game })
        if (!/^(1[0-9]|[6-9])[0-9]{8}/i.test(uid)) {
            let ltokenData = await mysApi.getData('exchange', { token: info.stoken, type: 2, mid: info.mid })
            let cookietokenData = await mysApi.getData('exchange', { token: info.stoken, type: 4, mid: info.mid })
            if (!ltokenData?.data || !cookietokenData?.data) {
                await this.e.reply('绑定stoken失败，异常：接口返回为空\n请确认发送的stoken是否有效')
                this.finish('toBindStoken')
                return false
            }
            this.e.ck = `ltoken_v2=${ltokenData.data?.token?.token};ltuid_v2=${info.stuid};cookie_token_v2=${cookietokenData.data?.token?.token};account_mid_v2=${info.mid};`
        } else {
            let res = await mysApi.getData('getBySToken')
            if (!res?.data) {
                await this.e.reply(`绑定stoken失败，异常：${res?.message || "接口返回为空"}\n请确认发送的stoken是否有效`)
                this.finish('toBindStoken')
                return false
            }

            this.e.ck = `ltoken_v2=${res?.data?.tokens[0]?.token};ltuid_v2=${info.stuid};cookie_token_v2=${res?.data?.tokens[1]?.token};account_mid_v2=${info.mid};`
        }

        mysApi = new MysApi(uid, this.e.ck, { game })
        let res = await mysApi.getData('UserGame')
        let list = res?.data?.list
        if (list.length == 0) {
            await this.e.reply(`绑定stoken失败，无uid信息`)
            this.finish('toBindStoken')
            return false
        }
        let msg = new qrcode(this.e).bindStoken(this.e, list, info)
        await this.e.reply(msg)

        await new User(this.e).bing()
        this.finish('toBindStoken')
        return false
    }

    async refreshGachaLog(e) {
        if (e.group && e.msg.match('获取')) return e.reply('请私聊发送指令')
        let uid = await MysInfo.getUid(e, false)
        if (!uid) return e.reply('请绑定uid后再操作')
        let game = e.game
        let ck = await MysInfo.checkUidBing(uid, game)
        if (!ck) return e.reply([`UID：${uid}未绑定cookie，请【#扫码登录】绑定ck，或尝试【#刷新ck】`, segment.button([
            { text: '#扫码登录', callback: '#扫码登录' },
            { text: '#刷新ck', callback: '#刷新ck' }
        ])])
        ck = ck.ck
        let mysApi
        if (/^(18|[6-9])[0-9]{8}/i.test(uid)) {
            mysApi = new MysApi(uid, ck, { game })

            let res = await mysApi.getData('AuthKeyByCookieToken')
            if (!res?.data) return e.reply(`authkey获取失败，异常：${res?.message}`)
            let authkey = res?.data?.authkey
            let region = mysApi.getServer()

            let url = `https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=301&gacha_id=1fb9ed6285b467a840231a4e839c00171550e217&timestamp=${Math.floor(Date.now() / 1000)}&lang=zh-cn&device_type=mobile&plat_type=ios&region=${region}&authkey=${encodeURIComponent(authkey)}&game_biz=hk4e_global&gacha_type=301&page=1&size=20&end_id=0`
            if (e.msg.match('获取')) return e.reply(`UID：${uid}抽卡链接：\n${url}`)
            e.msg = url
            await new GachaLog(e).logUrl()
        } else {
            let ltuid = ck.match(/ltuid_v2=(\d+)/)?.[1]
            if (!ltuid) return e.reply('未找到ltuid_v2信息，请重新绑定cookie')

            let { sks, ltuids } = await new qrcode(e).getStoken(e, true)

            for (let i of ltuids) {
                if (sks[i].stuid == ltuid) {
                    mysApi = new MysApi(uid, sks[i].sk, { game })

                    let res = await mysApi.getData('AuthKey')
                    if (!res?.data) return e.reply(`authkey获取失败，异常：${res?.message}`)
                    let authkey = res?.data?.authkey
                    let region = mysApi.getServer()

                    let url = `https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=301&gacha_id=fecafa7b6560db5f3182222395d88aaa6aaac1bc&timestamp=${Math.floor(Date.now() / 1000)}&lang=zh-cn&device_type=mobile&plat_type=ios&region=${region}&authkey=${encodeURIComponent(authkey)}&game_biz=hk4e_cn&gacha_type=301&page=1&size=20&end_id=0`
                    if (e.msg.match('获取')) return e.reply(`UID：${uid}抽卡链接：\n${url}`)
                    e.msg = url
                    await new GachaLog(e).logUrl()
                }
            }
        }
    }
}