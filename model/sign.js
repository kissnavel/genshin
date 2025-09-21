import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import common from '../../../lib/common/common.js'
import cfg from '../../../lib/config/config.js'
import MysApi from './mys/mysApi.js'
import base from './base.js'
import moment from 'moment'
import Cfg from './Cfg.js'
import _ from 'lodash'

let signing = false
let finishTime
let Nosign = 0
export default class MysSign extends base {
    constructor(e) {
        super(e)
        this.model = 'MysSign'
    }

    static async sign(e) {
        let mysSign = new MysSign(e)

        let { cks, uids } = await Cfg.getcks(false, e.user_id)

        if (_.every(cks, _.isEmpty))
            return e.reply('无法签到，请发送【#cookie帮助】查看配置教程\n或尝试【#刷新ck】', false, { at: true })

        if (signing) return e.reply(`\n当前签到剩余【${Nosign}】个\n预计【${finishTime}】完成`, false, { at: true, recallMsg: mysSign.set.recall })

        e.reply(`签到中...`, false, { at: true, recallMsg: mysSign.set.recall })

        return await mysSign.signWithImage(cks, uids)
    }

    async signWithImage(cks, uids) {
        let gameList = []
        let totalSignCount = 0

        for (let g of this.set.game) {
            let name = g == 'gs' ? '原神' : g == 'sr' ? '崩坏：星穹铁道' : g == 'zzz' ? '绝区零' : g == 'bh3' ? '崩坏三' : g == 'bh2' ? '崩坏学园2' : '未定事件簿'
            let gameData = {
                name,
                results: []
            }

            for (let i = 0; i < uids[g].length; i++) {
                this.ckNum = Number(i) + 1
                if (i >= 1) await common.sleep(5000)
                let uid = uids[g][i]; let ck = cks[g][uid]; let retry = 0

                logger.mark(`[${name}签到]QQ: ${this.e.user_id} ${name}UID: ${uid}`)
                let res = await this.doSign(ck, uid, g, name)
                if (res.retcode === -1000)
                    while (res.retcode === -1000 && retry < this.set.retry) {
                        res = await this.doSign(ck, uid, g, name)
                        retry++
                    }

                if (res) {
                    let status = 'failed'
                    let statusText = '签到失败'
                    if (res.retcode === 0) {
                        if (res.is_sign) {
                            status = 'already'
                            statusText = '今日已签'
                        } else {
                            status = 'success'
                            statusText = '签到成功'
                        }
                    }

                    let icon = ''; let reward = ''; let totalDays = ''
                    let msgParts = res.msg.split('\n')
                    for (let part of msgParts) {
                        if (part.includes('天奖励：')) {
                            let rewardMatch = part.match(/第(\d+)天奖励：(.+)/)
                            if (rewardMatch) {
                                totalDays = rewardMatch[1]
                                reward = rewardMatch[2]
                                icon = res.icon
                            }
                        }
                    }

                    gameData.results.push({
                        index: i + 1,
                        uid,
                        status,
                        statusText,
                        icon,
                        reward,
                        totalDays
                    })

                    if (res.retcode === 0) {
                        totalSignCount++
                    }
                }
            }

            if (gameData.results.length > 0) {
                gameList.push(gameData)
            }
        }

        // 渲染图片
        let screenData = this.screenData
        screenData.tplFile = `${this._path}/plugins/genshin/resources/MysSign/html/sign/sign.html`
        screenData.pluResPath = `${this._path}/plugins/genshin/resources/MysSign/`
        let data = {
            ...screenData,
            saveId: this.e.user_id,
            quality: 100,
            totalSignCount,
            gameList
        }

        let img = await puppeteer.screenshot('MysSign/sign', data)
        if (img) {
            return this.e.reply(img, false, { at: true })
        } else {
            let textMsg = []
            for (let game of gameList) {
                textMsg.push(`\n${game.name}：`)
                for (let result of game.results) {
                    textMsg.push(`uid:${result.uid}，${result.statusText}\n第${result.totalDays}天奖励：${result.reward}`)
                }
            }
            return this.e.reply(textMsg.join('\n'), false, { at: true })
        }
    }

    async doSign(ck, uid, game, name) {
        this.mysApi = new MysApi(uid, ck.ck, { device: ck.device_id }, ck.region, ck.game_biz, game)
        this.key = `${game}:Sign:${uid}`

        this.log = `[${name}uid:${uid}][qq:${_.padEnd(ck.qq, 10, ' ')}]`

        let isSigned = await redis.get(this.key)
        if (isSigned) {
            let reward = await this.getReward(isSigned, game)
            return {
                retcode: 0,
                msg: `\n${name}uid:${uid}，今日已签\n第${isSigned}天奖励：${reward.reward}`,
                icon: reward.icon,
                is_sign: true
            }
        }

        let signInfo = await this.mysApi.getData('sign_info')

        if (!signInfo) return false

        if ((signInfo.retcode == -100 && signInfo.message == '尚未登录') || (signInfo.retcode !== 0 && signInfo.message?.includes('请登录后重试'))) {
            logger.error(`[${name}签到失败]${this.log} 绑定cookie已失效`)
            if (this.set.Autodelck)
                await Cfg.delck(ck.ltuid, ck.qq)
            return {
                retcode: -100,
                msg: `\n签到失败，绑定cookie已失效\n可【#刷新ck】`,
                is_invalid: true
            }
        }

        if (signInfo.retcode !== 0) {
            return {
                retcode: signInfo.retcode,
                msg: `\n签到失败：${signInfo.message || '未知错误'}`
            }
        }

        if (signInfo.first_bind) {
            return {
                retcode: 100,
                msg: '\n签到失败：首次请先手动签到'
            }
        }

        this.signInfo = signInfo.data

        if (this.signInfo.is_sign) {
            let reward = await this.getReward(this.signInfo.total_sign_day, game)
            this.setCache(this.signInfo.total_sign_day)
            return {
                retcode: 0,
                msg: `\n${name}uid:${uid}，今日已签\n第${this.signInfo.total_sign_day}天奖励：${reward.reward}`,
                icon: reward.icon,
                is_sign: true
            }
        }

        /** 签到 */

        let res = await this.bbsSign(name, game)

        if (res) {
            let totalSignDay = this.signInfo.total_sign_day
            if (!this.signInfo.is_sign)
                totalSignDay++

            let tips = '签到成功'

            if (this.signed)
                tips = '今日已签'

            let reward = await this.getReward(totalSignDay, game)

            this.setCache(totalSignDay)

            return {
                retcode: 0,
                msg: `\n${name}uid:${uid}，${tips}\n第${totalSignDay}天奖励：${reward.reward}`,
                icon: reward.icon
            }
        }

        return {
            retcode: -1000,
            msg: `\n${name}uid:${uid}，签到失败：${this.signMsg}`,
        }
    }

    async getReward(signDay) {
        let key = `${this.mysApi.game}:rewards`

        let icon; let reward = await redis.get(key)

        if (reward) {
            reward = JSON.parse(reward)
        } else {
            let res = await this.mysApi.getData('sign_home')
            if (!res || Number(res.retcode) !== 0) return false

            let data = res.data
            if (data && data.awards && data.awards.length > 0) {
                reward = data.awards

                let monthEnd = Number(moment().endOf('month').format('X')) - Number(moment().format('X'))
                redis.setEx(key, monthEnd, JSON.stringify(reward))
            }
        }
        if (reward && reward.length > 0) {
            reward = reward[signDay - 1] || ''
            if (reward.icon && reward.name && reward.cnt) {
                icon = reward.icon
                reward = `${reward.name}*${reward.cnt}`
            }
        } else {
            icon = ''
            reward = ''
        }

        return { icon, reward }
    }

    async setCache(day) {
        let end = Number(moment().endOf('day').format('X')) - Number(moment().format('X'))
        redis.setEx(this.key, end, String(day))
    }

    async bbsSign(name, game) {
        this.signApi = true
        let api = Cfg.getConfig('api')
        let sign = await this.mysApi.getData('sign')
        this.signMsg = sign?.message ?? 'Too Many Requests'
        await common.sleep(5000)

        if (!sign || this.signMsg == 'Too Many Requests') {
            logger.mark(`[${name}签到失败]${this.log}：${sign.message || this.signMsg}`)
            return false
        }

        if (sign.retcode === -5003) {
            this.signed = true
            logger.mark(`[${name}已经签到]${this.log} 第${this.ckNum}个`)
            return true
        }

        if (sign.data?.gt) {
            this.signMsg = '验证码失败'
            sign.message = '验证码失败'

            if (api.type == 1) {
                let vall = new MysApi(this.mysApi.uid, this.mysApi.cookie, {}, '', '', 'all')
                let res = await vall.getData('signrecognize', sign.data)
                if (res?.resultid) {
                    let results = res
                    let retry = 0
                    await common.sleep(5000)
                    res = await vall.getData('results', results)
                    while ((res?.status == 2) && retry < 10) {
                        await common.sleep(5000)
                        res = await vall.getData('results', results)
                        retry++
                    }
                }
            } else if (api.type == 2) {
                let res = await vall.getData('in', sign.data)
                if (res?.request) {
                    let request = res
                    let retry = 0
                    await common.sleep(5000)
                    res = await vall.getData('res', request)
                    while ((res?.request == 'CAPCHA_NOT_READY') && retry < 10) {
                        await common.sleep(5000)
                        res = await vall.getData('res', request)
                        retry++
                    }
                }
            }

            try {
                if (res?.data?.validate || res?.request?.geetest_validate) {
                    sign = await this.mysApi.getData('sign', res?.data || res?.request, false, game)

                    if (sign.data?.gt) {
                        logger.mark(`[${name}签到失败]${this.log}：${sign.message} 第${this.ckNum}个`)
                        return false
                    } else {
                        this.signMsg = '验证码成功'
                        logger.mark(`[${name}签到成功]${this.log}:验证码成功 第${this.ckNum}个`)
                        return true
                    }
                } else {
                    logger.mark(`[${name}签到失败]${this.log}：${res.msg} 第${this.ckNum}个`)
                    return false
                }
            } catch (error) {
                logger.error('签到异常：' + error)
                return false
            }
        }

        if (sign.retcode === 0 && (sign?.data?.success === 0 || sign?.message === 'OK')) {
            logger.mark(`[${name}签到成功]${this.log} 第${this.ckNum}个`)
            return true
        }

        logger.mark(`[${name}签到失败]${this.log}：${sign.message} 第${this.ckNum}个`)
        return false
    }

    async signTask(manual) {
        if (!this.set.AutoSign && !manual) return

        if (this?.e?.msg?.includes('重新'))
            signing = false, Nosign = 0

        if (signing) {
            if (manual) await this.e.reply('签到任务进行中，完成前请勿重复执行')
            return
        }

        let { cks, uids } = await Cfg.signCk()
        let length = 0
        for (let game of this.set.game)
            length += uids[game].length

        let { noSignNum } = await this.getsignNum(uids, length)

        if (noSignNum <= 0 || length <= 0) {
            if (manual)
                if (this.white['QQ'].length > 0 || (this.white['QQ'].length == 0 && this.white.Group.length > 0))
                    await this.e.reply('白名单中暂无ck需要签到')
                else
                    await this.e.reply('暂无ck需要签到')
            return
        }
        Nosign = noSignNum
        signing = true

        const START = moment().unix()
        let tips = ['【开始签到任务】']

        let time = 0
        for (let i = 0; i < noSignNum; i++)
            time += (Math.floor(Math.random() * 6000)) / 1000 + (Math.floor(Math.random() * 2000) + 4000) / 1000 + 4

        if (this.white['QQ'].length > 0 || this.white.Group.length > 0)
            tips.push(`\n已开启白名单签到，仅签到白名单`)
        else
            tips.push(`\n未开启白名单签到，将签到全部ck`)

        finishTime = moment().add(time, 's').format('MM-DD HH:mm:ss')

        let smsg = `\n`
        for (let game of this.set.game)
            smsg += `${game == 'gs' ? '原神' : game == 'sr' ? '星铁' : game == 'zzz' ? '绝区零' : game == 'bh3' ? '崩三' : game == 'bh2' ? '崩二' : '未定'}：${uids[game].length}|`
        tips.push(smsg)

        tips.push(`\n未签：${noSignNum}个`)
        if (this.white['QQ'].length > 0 || this.white.Group.length > 0)
            tips.push(` | 白名单：${this.white.Group.length > 0 ? `${this.white.Group.length}群|` : ''}${this.white['QQ'].length > 0 ? `${this.white['QQ'].length}人` : ''}`)

        tips.push(`\n预计需要：${Cfg.countTime(time)}`)
        if (time > 120) tips.push(`\n完成时间：${finishTime}`)

        logger.mark(`签到ck:${length}个，预计需要${Cfg.countTime(time)} ${finishTime} 完成`)

        await this.send(manual, tips)

        let sucNum = _.fromPairs(this.set.game.map((game) => [game, 0]))
        let finshNum = _.fromPairs(this.set.game.map((game) => [game, 0]))
        let failNum = _.fromPairs(this.set.game.map((game) => [game, 0]))
        let invalidNum = _.fromPairs(this.set.game.map((game) => [game, 0]))
        let invalidqq = []

        for (let g of this.set.game) {
            let name = g == 'gs' ? '原神' : g == 'sr' ? '星铁' : g == 'zzz' ? '绝区零' : g == 'bh3' ? '崩三' : g == 'bh2' ? '崩二' : '未定'
            for (let i = 0; i < uids[g].length; i++) {
                this.ckNum = Number(i) + 1
                let uid = uids[g][i]
                let ck = cks[g][uid]
                Nosign = Nosign - 1
                if (await redis.get(`${g}:Sign:${uid}`)) {
                    finshNum[g]++
                    continue
                }

                logger.mark(`自动签到[${name}]白名单用户·QQ:${ck.qq} UID:${ck.uid}`)

                let retry = 0
                let ret = await this.doSign(ck, ck.uid, g, name)
                if (ret.retcode === -1000)
                    while (ret.retcode === -1000 && retry < this.set.retry) {
                        ret = await this.doSign(ck, ck.uid, g, name)
                        retry++
                    }

                if (ret.retcode === 0)
                    if (ret.is_sign)
                        finshNum[g]++
                    else
                        sucNum[g]++
                else
                    if (ret.is_invalid) {
                        invalidNum[g]++
                        if (!invalidqq?.includes(ck.qq))
                            invalidqq.push(ck.qq)
                    } else {
                        failNum[g]++
                    }

                if (this.signApi)
                    this.signApi = false
            }
        }

        const END = moment().unix()
        let msg = `【签到任务完成】\n总耗时：${Cfg.countTime(END - START)}`
        for (let game of this.set.game)
            msg += `\n${game == 'gs' ? '原神' : game == 'sr' ? '崩坏：星穹铁道' : game == 'zzz' ? '绝区零' : game == 'bh3' ? '崩坏三' : game == 'bh2' ? '崩坏学园2' : '未定事件簿'}：\n成功：${sucNum[game]} | 已签：${finshNum[game]} | 失败：${failNum[game]}`

        msg += `\n失效ck：\n`
        for (let game of this.set.game)
            if (invalidNum[game] > 0)
                msg += `${game == 'gs' ? '原神' : game == 'sr' ? '星铁' : game == 'zzz' ? '绝区零' : game == 'bh3' ? '崩三' : game == 'bh2' ? '崩二' : '未定'}：${invalidNum[game]}|`

        msg += '\n'
        let qq = invalidqq.slice()
        let qqnum = this.set.invalid || 2
        msg += qq.map((e, i) => {
            let line = `${i + 1}. ${e}`
            if ((i + 1) % qqnum === 0)
                line += '\n'
            else
                line += '，'
            return line
        })

        await this.send(manual, msg)
        signing = false
        Nosign = 0
    }

    async send(manual, msg) {
        if (manual) {
            this.e.reply(msg)
        } else {
            await common.relpyPrivate(cfg.masterQQ[0], msg)
            if (this.white.signPush?.length > 0)
                for (let group of this.white.signPush)
                    try {
                        let split = group.split(':')
                        let group_id = Number(split[1]) || split[1]
                        await common.sleep(1000)
                        if (Array.isArray(Bot.uin))
                            await Bot[split[0]].pickGroup(group_id).sendMsg(msg)
                        else
                            await Bot.pickGroup(group_id).sendMsg(msg)
                    } catch (error) {
                        logger.error(error)
                    }
        }
    }

    async getsignNum(uids, length) {
        let signNum = 0
        for (let g of this.set.game)
            for (let i of uids[g])
                if (await redis.get(`${g}:Sign:${i}`)) signNum++

        let noSignNum = length - signNum

        noSignNum = noSignNum > 0 ? noSignNum : 0

        return { noSignNum, signNum }
    }
}
