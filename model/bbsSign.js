import common from '../../../lib/common/common.js'
import cfg from '../../../lib/config/config.js'
import MysApi from './mys/mysApi.js'
import base from './base.js'
import Data from "./Data.js"
import Cfg from './Cfg.js'
import moment from 'moment'
import _ from 'lodash'
import fetch from 'node-fetch'

let signing = false
let finishTime
let Nosign = 0
export default class BBsSign extends base {
    constructor(e) {
        super(e)
        this.model = 'BBsSign'
        this.ForumData = Data.readJSON(`${Cfg.file}`, "mys")
    }

    static async bbsSign(e, name) {
        let BbsSign = new BBsSign(e)

        let sks = await Cfg.getsks(false, e.user_id)
        if (_.isEmpty(sks)) {
            e.reply('\n请【#扫码登录】后签到米币', false, { at: true })
            return false
        }

        let ltuids = _.map(sks, 'id')

        let id = Number(e.user_id) || String(e.user_id)
        if (signing) {
            e.reply(`\n签到模式：【米币${BbsSign.white.exQQ?.includes(id) ? '+经验' : ''}】\n当前签到剩余【${Nosign}】个\n预计【${finishTime}】完成`, false, { at: true, recallMsg: BbsSign.set.recall })
            return false
        }

        e.reply(`\n开始尝试${name}社区签到`, false, { at: true, recallMsg: BbsSign.set.recall })

        let list = []
        let time = (BbsSign.white.exQQ?.includes(id) || name == '全部') ? 10 : 5
        let data = BbsSign.getDataList(BbsSign.white.exQQ?.includes(id) ? '全部' : name)
        for (let i of ltuids) {
            let res = await BbsSign.getbbsSign(sks[i], data, time)
            list.push(res)
        }
        return list
    }

    async bbsSeachSign(mysApi, userId) {
        let res = await mysApi.getData("bbsisSign")
        let message = '', points = 1
        if (!res?.data) {
            message = '登录失效，请【#扫码登录】'
            if (res.retcode == -100 && this.set.Autodelsk)
                await Cfg.delsk(userId, mysApi.uid)
        } else {
            message = `当前米游币数量为：${res.data.total_points},今日剩余可获取：${res.data.can_get_points}`
            points = res.data.can_get_points
        }
        return { message, retcode: res.retcode, points }
    }

    async getbbsSign(sk, forumData, time = 5) {
        let message = '', challenge = '', retcode = 0, res
        let mysApi = new MysApi(sk.stuid, sk.sk, {}, '', '', 'bbs')
        let key = `Bbs:Sign:${sk.id}`
        message += `**通行证ID: ${sk.stuid}**\n`

        try {
            res = await this.bbsSeachSign(mysApi, sk.userId)
            await common.sleep(5000)
            if (res.retcode == -100) {
                return { message: res.message, retcode: -100 }
            }
            if (res.points == 0) {
                await this.setCache(key)
                return { message: res.message, retcode: 100 }
            }

            for (let forum of forumData) {
                let trueDetail = 0; let Vote = 0; let trueShare = 0; let Share = 3; let detal = 3; let data = {}
                if (forumData.length >= 3) {
                    Share = 1
                    detal = 1
                }

                message += `\n**${forum.name}**\n`
                let device_fp = await redis.get(`genshin:device_fp:${sk.stuid}:fp`)
                if (!device_fp) {
                    let bindInfo = await redis.get(`genshin:device_fp:${sk.stuid}:bind`)
                    if (bindInfo) {
                        try {
                            bindInfo = JSON.parse(bindInfo)
                            data = {
                                productName: bindInfo?.deviceProduct,
                                deviceType: bindInfo?.deviceName,
                                modelName: bindInfo?.deviceModel,
                                oaid: bindInfo?.oaid,
                                osVersion: bindInfo?.androidVersion,
                                deviceInfo: bindInfo?.deviceFingerprint,
                                board: bindInfo?.deviceBoard
                            }
                        } catch (error) {
                            bindInfo = null
                        }
                    }
                    device_fp = await mysApi.getData('getFp', data)
                    device_fp = device_fp?.data?.device_fp
                    if (device_fp) {
                        await redis.set(`genshin:device_fp:${sk.stuid}:fp`, device_fp, {
                            EX: 86400 * 7
                        })
                        const deviceLogin = mysApi.getUrl('deviceLogin', data)
                        const saveDevice = mysApi.getUrl('saveDevice', data)
                        if (!!deviceLogin && !!saveDevice) {
                            logger.debug(`[米游社][设备登录]保存设备信息`)
                            try {
                                logger.debug(`[米游社][设备登录]${JSON.stringify(deviceLogin)}`)
                                const login = await fetch(deviceLogin.url, {
                                    headers: deviceLogin.headers,
                                    method: 'POST',
                                    body: deviceLogin.body
                                })
                                const save = await fetch(saveDevice.url, {
                                    headers: saveDevice.headers,
                                    method: 'POST',
                                    body: saveDevice.body
                                })
                                const result = await Promise.all([login.json(), save.json()])
                                logger.debug(`[米游社][设备登录]${JSON.stringify(result)}`)
                            } catch (error) {
                                logger.error(`[米游社][设备登录]${error.message}`)
                            }
                        }
                    }
                }
                forum = {
                    ...forum,
                    headers: { 'x-rpc-device_fp': device_fp }
                }
                res = await mysApi.getData("querySignInStatus", forum)
                if (res?.data?.is_signed == true) {
                    message += `社区签到: 今日已签到\n`
                } else if (res?.retcode == -100) {
                    return { message: '登录失效，请【#扫码登录】', retcode: -100 }
                } else {
                    res = await mysApi.getData("bbsSign", forum)
                    await common.sleep(5000)
                    if (res?.retcode == 1034) {
                        let retry = 0
                        challenge = await this.bbsGeetest(mysApi)
                        while (!challenge && retry < this.set.bbsRetry) {
                            challenge = await this.bbsGeetest(mysApi)
                            retry++
                        }
                        if (challenge) {
                            forum = {
                                ...forum,
                                headers: {
                                    'x-rpc-device_fp': device_fp,
                                    'x-rpc-challenge': challenge
                                }
                            }
                            res = await mysApi.getData("bbsSign", forum)
                            message += `社区签到: 验证码${res?.retcode == 1034 ? '失败' : '成功'}\n`
                        } else {
                            message += `社区签到: 验证码失败\n`
                        }
                    } else {
                        message += `社区签到: ${res.message}\n`
                    }
                }
                logger.mark(`${sk.id}:${forum.name} 社区签到结果: [${res?.data?.is_signed == true ? '今日已签到' : `${res.message}`}]`)

                res = await mysApi.getData("bbsPostList", forum)
                let Listretry = 0
                while (!res.data?.list || (res.data?.list?.length < time && Listretry < 2)) {
                    await common.sleep(_.random(2) * 100 + 50)
                    res = await mysApi.getData("bbsPostList", forum)
                    Listretry++
                }

                if (!res.data?.list) {
                    message += '获取帖子失败'
                    retcode = 1034
                    continue
                }
                let postList = res.data?.list; let postId
                for (let post of postList) {
                    post = post.post
                    postId = post['post_id']
                    data = {
                        ...data,
                        postId: postId,
                        headers: { 'x-rpc-device_fp': device_fp }
                    }

                    if (trueDetail < detal) {
                        await common.sleep(1000)
                        res = await mysApi.getData("bbsPostFull", data)
                        if (res?.retcode == 1034)
                            res = await this.bbsGeetest(mysApi, "bbsPostFull", data)
                        if (res?.message && res?.retcode == 0) trueDetail++
                    }

                    if (Vote < time) {
                        await common.sleep(1000)
                        res = await mysApi.getData("bbsVotePost", data)
                        if (res?.retcode == 1034)
                            res = await this.bbsGeetest(mysApi, "bbsVotePost", data)
                        if (res?.message && res?.retcode == 0) Vote++
                    }

                    if (trueShare < Share) {
                        await common.sleep(1000)
                        res = await mysApi.getData("bbsShareConf", data)
                        if (res?.retcode == 1034)
                            res = await this.bbsGeetest(mysApi, "bbsShareConf", data)
                        if (res?.message && res?.retcode == 0) trueShare++
                    }

                    if (trueDetail >= detal && Vote >= time && trueShare >= Share) break
                }

                message += `浏览：${trueDetail}|点赞：${Vote}|分享：${Share}\n`
            }

            res = await this.bbsSeachSign(mysApi, sk.userId)
            if (res.points == 0) {
                retcode = 0
                await this.setCache(key)
            } else {
                retcode = 1034
            }
        } catch (ex) {
            logger.error(`出问题了：${ex}`)
            message += `${sk.id}获取米游币异常`
            retcode = 1034
        }
        return { message, retcode }
    }

    async bbsTask(manual) {
        if (!this.set.AutobbsSign && !manual) return

        if (this?.e?.msg?.includes('重新'))
            signing = false, Nosign = 0

        if (signing) {
            if (manual) await this.e.reply('米币签到任务进行中，完成前请勿重复执行')
            return
        }

        let { sks, ltuids } = await Cfg.signSk()
        let { noSignNum } = await this.getsignNum(ltuids)

        if (noSignNum <= 0 || ltuids.length <= 0) {
            if (manual) await this.e.reply('暂无sk需要签到')
            return
        }
        Nosign = noSignNum
        signing = true

        const START = moment().unix()
        let tips = ['【开始社区签到任务】']

        let time = 0
        if (this.set.ddos) {
            let num = Math.floor(noSignNum / this.set.ddostime) + 1
            for (let i = 0; i < num; i++)
                time += _.random(15000, 30000) / 1000
        } else {
            for (let i = 0; i < noSignNum; i++) {
                for (let i = 0; i < 8; i++)
                    time += (Math.floor(Math.random() * 2000) + 2000) / 1000

                time += (Math.floor(Math.random() * 3000) + 2000) / 1000 + 3
            }
        }

        if (this.white.bbsQQ.length > 0 || this.white.Group.length > 0)
            tips.push(`\n已开启白名单签到，仅签到白名单`)
        else
            tips.push(`\n未开启白名单签到，将签到全部sk`)

        finishTime = moment().add(time, 's').format('MM-DD HH:mm:ss')
        tips.push(`\n社区签到：${ltuids.length}个 | 未签：${noSignNum}个`)

        if (this.white.bbsQQ.length > 0 || this.white.Group.length > 0)
            if (noSignNum > 0) tips.push(`\n白名单：${this.white.Group.length > 0 ? `${this.white.Group.length}群|` : ''}${this.white.bbsQQ.length > 0 ? `${this.white.bbsQQ.length}人` : ''}`)

        tips.push(`\n预计至少需要：${Cfg.countTime(time)}`)
        if (time > 120) tips.push(`\n预计完成时间：${finishTime}`)

        logger.mark(`米币签到sk:${ltuids.length}个，预计需要${Cfg.countTime(time)} ${finishTime} 完成`)

        await this.send(manual, tips)

        let ddos = 0, signNum = 0, promises = [], ret = []
        this.sucNum = 0; this.finshNum = 0; this.failNum = 0; this.invalidNum = 0; this.invalidqq = []
        for (let i of ltuids) {
            let user_id = Number(sks[i].userId) || String(sks[i].userId)
            let data = this.getDataList(this.white.exQQ?.includes(user_id) ? '全部' : '原神')
            let time = this.white.exQQ?.includes(user_id) ? 10 : 5

            if (await redis.get(`Bbs:Sign:${i}`)) {
                this.finshNum++
                Nosign = Nosign - 1
                continue
            }
            signNum++
            logger.mark(`[社区签到][${i}]第${signNum}个`)

            if (this.set.ddos) {
                promises.push(this.getbbsSign(sks[i], data, time)
                    .then(resp => {
                        return { userId: sks[i].userId, ...resp }
                    })
                )
                ddos++
                if (ddos == this.set.ddostime)
                    ddos = 0
            } else {
                let res = await this.getbbsSign(sks[i], data, time)
                await this.result(res, sks[i].userId)
            }
        }

        if (this.set.ddos) {
            try {
                ret = await Promise.all(promises)
            } catch (error) { }
            for (let res of ret)
                await this.result(res, res.userId)
        }

        const END = moment().unix()
        let msg = `【社区签到任务完成】\n总耗时：${Cfg.countTime(END - START)}\n成功：${this.sucNum} | 已签：${this.finshNum} | 失败：${this.failNum}`
        if (this.invalidNum > 0) {
            msg += `\nsk失效：${this.invalidNum} | 失效qq:\n`
            let qq = this.invalidqq.slice()
            let qqnum = this.set.invalid || 2
            msg += qq.map((e, i) => {
                let line = `${i + 1}. ${e}`
                if ((i + 1) % qqnum === 0)
                    line += '\n'
                else
                    line += '，'
                return line
            })
        }

        await this.send(manual, msg)
        signing = false
        Nosign = 0

    }

    async send(manual, msg) {
        if (manual) {
            this.e.reply(msg)
        } else {
            await common.relpyPrivate(cfg.masterQQ[0], msg)
            if (this.white.bbsPush?.length > 0)
                for (let group of this.white.bbsPush)
                    try {
                        let split = group.split(':')
                        let group_id = Number(split[1]) || split[1]
                        if (Array.isArray(Bot.uin))
                            await Bot[split[0]].pickGroup(group_id).sendMsg(msg)
                        else
                            await Bot.pickGroup(group_id).sendMsg(msg)
                    } catch (error) {
                        logger.error(error)
                    }
        }
    }

    async result(res, userId) {
        Nosign = Nosign - 1
        if (res.retcode == 0) this.sucNum++
        if (res.retcode == 100) this.finshNum++
        if (res.retcode == -100) {
            this.invalidNum++
            if (!this.invalidqq?.includes(userId))
                this.invalidqq.push(userId)
        }
        if (res.retcode == 1034) this.failNum++
    }

    async getReplymsg() {
        let reply = Cfg.getConfig('command')
        let msg = { left: "", right: "" }
        let centeri = Math.floor(Math.random() * reply.center.length)

        for (let n of ['left', 'right']) {
            let time = _.random(1, 3)
            for (let i = 0; i < time; i++) {
                let index = Math.floor(Math.random() * reply[n].length)
                msg[n] += reply[n][index]
            }
        }

        let Replymsg = msg.left + reply.center[centeri] + msg.right
        return JSON.stringify([{ insert: Replymsg }])
    }

    async bbsGeetest(mysApi, type = "", data = {}) {
        let api = Cfg.getConfig('api')
        let vall = new MysApi(mysApi.uid, mysApi.cookie, {}, '', '', 'all')
        let res = await mysApi.getData('bbsGetCaptcha')
        let retry = 0; let test_nine = res
        if (api.signtype == 0) {
            res = await vall.getData('test_nine', res?.data)
            if (res?.data?.validate) res = {
                data: {
                    challenge: test_nine?.data?.challenge,
                    validate: res?.data?.validate
                }
            }
        } else if (api.signtype == 1) {
            res = await vall.getData("signrecognize", res.data)
            if (res?.resultid) {
                let results = res
                await common.sleep(5000)
                res = await vall.getData("results", results)
                while ((res?.status == 2) && retry < 10) {
                    await common.sleep(5000)
                    res = await vall.getData("results", results)
                    retry++
                }
            }
        } else if (api.signtype == 2) {
            res = await vall.getData("in", res.data)
            if (res?.request) {
                let request = res
                await common.sleep(5000)
                res = await vall.getData("res", request)
                while ((res?.request == "CAPCHA_NOT_READY") && retry < 10) {
                    await common.sleep(5000)
                    res = await vall.getData("res", request)
                    retry++
                }
            }
        }
        try {
            if (res?.data?.validate || res?.request?.geetest_validate) {
                res = await mysApi.getData("bbsCaptchaVerify", res?.data || res?.request)
                if (type) {
                    if (res?.["data"]?.["challenge"])
                        return await mysApi.getData(type, {
                            ...data,
                            headers: {
                                "x-rpc-challenge": res["data"]["challenge"],
                            }
                        })
                } else {
                    return res?.["data"]?.["challenge"] || ""
                }
            }
        } catch (error) {
            logger.error('[validate][接口请求]异常信息：' + error)
            return ""
        }
        return ""
    }

    async setCache(key) {
        let end = Number(moment().endOf('day').format('X')) - Number(moment().format('X'))
        if (!await redis.get(key))
            await redis.setEx(key, end, '1')
    }

    async getsignNum(ltuids) {
        let signNum = 0
        for (let i of ltuids)
            if (await redis.get(`Bbs:Sign:${i}`)) signNum++

        let noSignNum = ltuids.length - signNum

        noSignNum = noSignNum > 0 ? noSignNum : 0

        return { noSignNum, signNum }
    }

    getDataList(name) {
        let otherName = _.map(this.ForumData, 'otherName')
        for (let [index, item] of Object.entries(otherName)) {
            if (item?.includes(name)) {
                return [this.ForumData[index]]
            }
        }
        return this.ForumData
    }
}
