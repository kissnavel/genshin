import plugin from '../../../lib/plugins/plugin.js'
import Cfg from '../model/Cfg.js'
import User from '../model/user.js'
import MysApi from '../model/mys/mysApi.js'
import MysInfo from '../model/mys/mysInfo.js'
import qrcode from '../model/qrCode.js'
import GachaLog from '../model/gachaLog.js'

export class qrCode extends plugin {
    constructor() {
        super({
            name: 'genshin·刷新',
            dsc: '扫码登录等部分功能的配置',
            event: 'message',
            priority: Cfg.getConfig('config').priority,
            rule: [
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
            '1、使用抓包软件抓取(米游社/hoyolab)APP主页与战绩的请求',
            '2、在抓取的请求头的Cookie内找到"stuid"、"stoken"、"mid"、"ltoken"',
            '3、自行构造如下格式的stoken信息：',
            '{"stuid": "抓取的stuid", "stoken": "抓取的stoken", "mid": "抓取的mid", "ltoken": "抓取的ltoken"}',
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
        if(e.group) return e.reply('请私聊发送指令')
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
        const Stoken = res.data?.tokens[0].token
        const Stuid = res.data?.user_info?.aid
        const Mid = res.data?.user_info?.mid
        if (!Stoken || !Stuid || !Mid) return e.reply('扫码登录返回信息不完整，未能获取stoken')

        const ltokenData = await mysApi.getData('exchange', { token: Stoken, mid: Mid })
        if (!ltokenData.data?.token?.token) return e.reply(`获取ck失败：${ltokenData?.message || "接口返回为空"}`)
        const Ltoken = ltokenData.data?.token?.token

        let sk = `stuid=${Stuid};stoken=${Stoken};mid=${Mid};ltoken=${Ltoken}`
        let biz = e.game == 'zzz' ? 'nap_cn' : e.game == 'sr' ? 'hkrpg_cn' : 'hk4e_cn'
        mysApi = new MysApi(Stuid, sk, { game: 'bbs' }, '', biz)

        res = await mysApi.getData('bbsGetCookie')
        if (!res?.data) return e.reply(`绑定stoken失败，异常：${res?.message}\n请稍后再试`)

        e.ck = `ltoken=${Ltoken};ltuid=${Stuid};cookie_token=${res.data.cookie_token};account_id=${Stuid}`

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
            ltoken: Ltoken,
            mid: Mid
        }

        let msg = await new qrcode(e).bindStoken(e, list, info)
        await e.reply(msg)

        await new User(e).bing()
    }

    async upCookie(e, qrCode) {
        let { sks, ltuids } = await new qrcode(e).getStoken(e, qrCode)
        if (!sks || !ltuids) return false

        for (let i of ltuids) {
            let game_biz = ''
            if (sks[i].type == 'hoyolab') {
                if (/os_/.test(sks[i].region)) {
                    game_biz = 'hk4e_global'
                } else if (/official/.test(sks[i].region)) {
                    game_biz = 'hkrpg_global'
                } else if (/_us|_eu|_jp|_sg/.test(sks[i].region)) {
                    game_biz = 'nap_global'
                }
            } else {
                if (/cn_/.test(sks[i].region)) {
                    game_biz = 'hk4e_cn'
                } else if (/_cn/.test(sks[i].region)) {
                    if (sks[i].uid.length < 10) {
                        game_biz = 'nap_cn'
                    } else {
                        game_biz = 'hkrpg_cn'
                    }
                }
            }
            let mysApi = new MysApi(sks[i].stuid, sks[i].sk, { game: 'bbs' }, sks[i].region, game_biz)

            let res = await mysApi.getData('bbsGetCookie')
            if (!res?.data) {
	  		    e.reply(`stuid:${sks[i].stuid},请求异常：${res.message}`)
                continue
  		    } else {
                e.ck = `ltoken=${sks[i].ltoken};ltuid=${sks[i].stuid};cookie_token=${res.data.cookie_token};account_id=${sks[i].stuid}`
                await new User(e).bing()
            }
        }
    }

    async bindStoken(e) {
        if(e.group) return e.reply('请私聊发送指令')
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
        if (!info?.stuid || !info?.stoken || !info?.mid || !info?.ltoken) {
            await this.e.reply('stoken信息格式错误')
            this.finish('toBindStoken')
            return false
        }

        let sk = `stuid=${info.stuid};stoken=${info.stoken};mid=${info.mid};ltoken=${info.ltoken}`
        let uid = await redis.get(`genshin:bindStoken:${this.e.user_id}:uid`)
        let game = await redis.get(`genshin:bindStoken:${this.e.user_id}:game`)

        let mysApi = new MysApi(uid, sk, { game })

        let res = await mysApi.getData('bbsGetCookie')
        if (!res?.data) {
            await this.e.reply(`绑定stoken失败，异常：${res?.message}\n请确认发送的stoken是否有效`)
            this.finish('toBindStoken')
            return false
        }
        this.e.ck = `ltoken=${info.ltoken};ltuid=${info.stuid};cookie_token=${res.data.cookie_token};account_id=${info.stuid}`

        mysApi = new MysApi(uid, this.e.ck, { game })
        res = await mysApi.getData('UserGame')
        let list = res?.data?.list
        if (list.length == 0) {
            await this.e.reply(`绑定stoken失败，无uid信息`)
            this.finish('toBindStoken')
            return false
        }
        let msg = await new qrcode(this.e).bindStoken(this.e, list, info)
        await this.e.reply(msg)

        await new User(this.e).bing()
        this.finish('toBindStoken')
        return false
    }

    async refreshGachaLog(e) {
        if(e.group && e.msg.match('获取')) return e.reply('请私聊发送指令')
        let uid = await MysInfo.getUid(e, false)
        if (!uid) return e.reply('请绑定uid后再操作')
        let game = e.game
        let ck = await MysInfo.checkUidBing(uid, game)
        if (!ck) return e.reply([`UID：${uid}未绑定cookie，请【#扫码登录】绑定ck，或尝试【#刷新ck】`, segment.button([
            { text: '#扫码登录', callback: '#扫码登录' },
            { text: '#刷新ck', callback: '#刷新ck' }
        ])])
        ck = ck.ck
        let ltuid = ck.match(/ltuid=(\d+)/)
        ltuid = ltuid[1]

        let { sks, ltuids } = await new qrcode(e).getStoken(e, true)

        for (let i of ltuids) {
            if (sks[i].stuid == ltuid) {
                let mysApi = new MysApi(uid, sks[i].sk, { game })

                let res = await mysApi.getData('AuthKey')
                if (!res?.data) return e.reply(`authkey获取失败，异常：${res?.message}`)
                let authkey = res?.data?.authkey
                let region = mysApi.getServer()

	            let url = `https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=301&gacha_id=fecafa7b6560db5f3182222395d88aaa6aaac1bc&timestamp=${Math.floor(Date.now() / 1000)}&lang=zh-cn&device_type=mobile&plat_type=ios&region=${region}&authkey=${encodeURIComponent(authkey)}&game_biz=hk4e_cn&gacha_type=301&page=1&size=20&end_id=0`
                if(e.msg.match('获取')) return e.reply(`UID：${uid}抽卡链接：\n${url}`)
                e.msg = url
                await new GachaLog(e).logUrl()
            }
        }
    }
}
