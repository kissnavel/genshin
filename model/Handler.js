import common from '../../../lib/common/common.js'
import getDeviceFp from './getDeviceFp.js'
import MysApi from './mys/mysApi.js'
import MysInfo from './mys/mysInfo.js'
import fetch from 'node-fetch'
import Cfg from './Cfg.js'

export default class Handler {
  constructor() {
    this.apiCfg = Cfg.getConfig('api')
  }
  async getvali (e, mysApi, type, data = {}) {
    let res
    try {
      res = await mysApi.getData(type, data)
      if (res?.retcode == 0 || (type == 'detail' && res?.retcode == -1002)) return res

      res = await this.geetest(e, mysApi, res?.retcode)
      if (!res?.data?.challenge) {
        return { data: null, message: '验证码失败', retcode: res?.retcode }
      }

      if (data?.headers) {
        data.headers = {
          ...data.headers,
          'x-rpc-challenge': res?.data?.challenge,
        }
      } else {
        if (!data) data = {}
        data.headers = {
          'x-rpc-challenge': res?.data?.challenge,
        }
      }
      res = await mysApi.getData(type, data)

      if (!(res?.retcode === 0 || (type == 'detail' && res?.retcode === -1002))) {
        return { data: null, message: '验证码失败', retcode: res?.retcode }
      }
    } catch (error) {
      logger.error(error)
      return { data: null, message: '出错了', retcode: res?.retcode }
    }
    return res
  }

  async geetest (e, data, retcode = 1034) {
    let res
    let { uid, cookie, game } = data
    if (e?.game) game = e?.game
    let vali = new MysApi(uid, cookie, data.option || {}, '', '', 'all')

    try {
      let challenge_game = game == 'zzz' ? '8' : game == 'sr' ? '6' : '2'
      let { deviceFp } = await getDeviceFp.Fp(uid, cookie, game)
      let headers = { 'x-rpc-device_fp': deviceFp, 'x-rpc-challenge_game': challenge_game }
      let app_key = game == 'zzz' ? 'game_record_zzz' : game == 'sr' ? 'hkrpg_game_record' : ''

      res = await vali.getData(retcode === 10035 ? 'createGeetest' : 'createVerification', { headers, app_key })
      if (!res || res?.retcode !== 0) {
        return { data: null, message: '未知错误，可能为cookie失效', retcode: 10103 }
      }

      let test_nine = res
      let retry = 0
      if (this.apiCfg.type == 0) {
        if ([2, 1].includes(this.apiCfg.GtestType)) res = await vali.getData('test_nine', res?.data)
        if (res?.data?.validate) res = {
          data: {
            challenge: test_nine?.data?.challenge,
            validate: res?.data?.validate
          }
        }
      } else if (this.apiCfg.type == 1) {
        if ([2, 1].includes(this.apiCfg.GtestType)) res = await vali.getData('recognize', res?.data)
        if (res?.resultid) {
          let results = res
          await common.sleep(5000)
          res = await vali.getData('results', results)
          while ((res?.status == 2) && retry < 10) {
            await common.sleep(5000)
            res = await vali.getData('results', results)
            retry++
          }
        }
      } else if (this.apiCfg.type == 2) {
        if ([2, 1].includes(this.apiCfg.GtestType)) res = await vali.getData('in', res?.data)
        if (res?.request) {
          let request = res
          await common.sleep(5000)
          res = await vali.getData('res', request)
          while ((res?.request == 'CAPCHA_NOT_READY') && retry < 10) {
            await common.sleep(5000)
            res = await vali.getData('res', request)
            retry++
          }
        }
      }
      if (res?.data?.validate || res?.request?.geetest_validate) {
        res = await vali.getData(retcode === 10035 ? 'verifyGeetest' : 'verifyVerification', {
          ...res?.data ? res.data : res.request,
          headers,
          app_key
        })
      } else {
        if ([2, 0].includes(this.apiCfg.GtestType)) {
          if (this.apiCfg.GtestType == 2) res = await vali.getData(retcode === 10035 ? 'createGeetest' : 'createVerification', { headers, app_key })
          res = await this.Manual_geetest(e, res?.data)
          if (res?.data?.validate || res?.data?.geetest_validate) {
            res = await vali.getData(retcode === 10035 ? 'verifyGeetest' : 'verifyVerification', {
              ...res.data,
              headers,
              app_key
            })
          } else {
            return { data: null, message: '验证码失败', retcode: retcode }
          }
        } else {
          return { data: null, message: '验证码失败', retcode: retcode }
        }
      }

      if (res?.data?.challenge) return res
    } catch (error) {
      logger.error(error)
    }
    return { data: null, message: '验证码失败', retcode: retcode }
  }

  async bbsVerification (e) {
    let res
    let uid = await MysInfo.getUid(e, false)
    if ((/^(1[0-9]|[6-9])[0-9]{8}/i).test(uid)) return e.reply('国际服不需要账号验证')
    let game = e.game
    let ck = await MysInfo.checkUidBing(uid, game)
    let mysApi = new MysApi(uid, ck, {}, '', '', 'bbs')

    try {
      let vali = new MysApi(uid, ck, {}, '', '', 'all')
      let { deviceFp } = await getDeviceFp.Fp(uid, ck, game)
      let headers = { 'x-rpc-device_fp': deviceFp }

      res = await mysApi.getData('bbsGetCaptcha', { headers })
      if (!res || res?.retcode !== 0) {
        return { data: null, message: '未知错误，可能为cookie失效', retcode: 10103 }
      }

      let test_nine = res
      let retry = 0
      if (this.apiCfg.type == 0) {
        if ([2, 1].includes(this.apiCfg.GtestType)) res = await vali.getData('test_nine', res?.data)
        if (res?.data?.validate) res = {
          data: {
            challenge: test_nine?.data?.challenge,
            validate: res?.data?.validate
          }
        }
      } else if (this.apiCfg.type == 1) {
        if ([2, 1].includes(this.apiCfg.GtestType)) res = await vali.getData('recognize', res?.data)
        if (res?.resultid) {
          let results = res
          await common.sleep(5000)
          res = await vali.getData('results', results)
          while ((res?.status == 2) && retry < 10) {
            await common.sleep(5000)
            res = await vali.getData('results', results)
            retry++
          }
        }
      } else if (this.apiCfg.type == 2) {
        if ([2, 1].includes(this.apiCfg.GtestType)) res = await vali.getData('in', res?.data)
        if (res?.request) {
          let request = res
          await common.sleep(5000)
          res = await vali.getData('res', request)
          while ((res?.request == 'CAPCHA_NOT_READY') && retry < 10) {
            await common.sleep(5000)
            res = await vali.getData('res', request)
            retry++
          }
        }
      }
      if (res?.data?.validate || res?.request?.geetest_validate) {
        res = await mysApi.getData('bbsCaptchaVerify', {
          ...res?.data ? res.data : res.request,
          headers
        })
      } else {
        if ([2, 0].includes(this.apiCfg.GtestType)) {
          if (this.apiCfg.GtestType == 2) res = await mysApi.getData('bbsGetCaptcha', { headers })
          res = await this.Manual_geetest(e, res?.data)
          if (res?.data?.validate || res?.data?.geetest_validate) {
            res = await mysApi.getData('bbsCaptchaVerify', {
              ...res.data,
              headers
            })
          } else {
            return e.reply('米游社账号验证失败')
          }
        } else {
          return e.reply('米游社账号验证失败')
        }
      }

      if (res?.data?.challenge) return e.reply('米游社账号验证成功')
    } catch (error) {
      logger.error(error)
    }
    return e.reply('米游社账号验证失败')
  }

  /**
   * @param {{gt, challenge}} data
   */
  async Manual_geetest (e, data) {
    if (!data.gt || !data.challenge || !e?.reply) return false
    if (!this.apiCfg.verifyAddr || (!this.apiCfg.startApi && !(this.apiCfg.Host || this.apiCfg.Port || this.apiCfg.Address))) {
      return { data: null, message: '未正确填写配置文件[api.yaml]', retcode: null }
    }

    let res = await fetch(`${this.apiCfg.verifyAddr}`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      logger.error(`[genshin][GT-Manual] ${res.status} ${res.statusText}`)
      return false
    }
    res = await res.json()
    if (!res.data) return false

    await e.reply(`请复制地址并用手机浏览器打开完成验证\nPC浏览器请切换为手机或平板设备访问\n${res.data.link}`, true)

    for (let i = 0; i < 80; i++) {
      let validate = await (await fetch(res.data.result)).json()
      if (validate?.data) return validate

      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    return false
  }
}
