import md5 from 'md5'
import _ from 'lodash'
import fetch from 'node-fetch'
import cfg from '../../../../lib/config/config.js'
import getDeviceFp from '../getDeviceFp.js'
import ApiTool from './apiTool.js'

let HttpsProxyAgent = ''
export default class MysApi {
  /**
   * @param uid 游戏uid
   * @param cookie 米游社cookie
   * @param option 其他参数
   * @param option.log 是否显示日志
   * @param isSr 是否星铁
   * @param device 设备device_id
   */
  constructor(uid, cookie, option = { game: 'gs', device: '' }, Server = '', Biz = '', game = '') {
    this.uid = uid
    this.cookie = cookie
    this.game = game || option.game
    this.server = Server || this.getServer()
    this.biz = Biz
    this.apiTool = new ApiTool(this.uid, this.server, this.game, this.biz)
    /** 5分钟缓存 */
    this.cacheCd = 300

    this._device = option.device || this.device
    this.option = {
      log: true,
      ...option
    }

    this.types = [
      'test_nine',
      'recognize',
      'signrecognize',
      'results',
      'in',
      'res',
      'qrCodeLogin',
      'qrCodeQuery',
      'exchange',
      'material'
    ]

    this.gttypes = [
      'recognize',
      'signrecognize',
      'results'
    ]
  }

  /** ltuid -> 刷新结果缓存，避免同一次查询内重复刷新 */
  static ckRefreshCache = new Map()
  /** ltuid -> 刷新中的 Promise，避免并发重复刷新 */
  static ckRefreshTasks = new Map()
  /** 刷新结果缓存时间(ms) */
  static ckRefreshCacheTtl = 60 * 1000
  /** stoken列表短时缓存，避免多账号刷新时反复读取yaml */
  static skScanCache = null

  /** 从ck中解析ltuid */
  static getLtuid(ck = '') {
    let ret = String(ck || '').match(/ltuid=(\d+)|stuid=(\d+)/)
    return ret ? (ret[1] || ret[2]) : ''
  }

  /** 是否为ck登录失效返回 */
  static isLoginError(res) {
    if (!res) return false
    let retcode = Number(res.retcode)
    if (![-1, -100, 1001, 10001, 10103].includes(retcode)) return false
    return /(登录|login|ck失效|cookie.*失效)/i.test(res.message || '')
  }

  /** 根据stoken推断bbs的game_biz */
  static getBbsGameBiz(sk = {}) {
    let game_biz = ''
    if (sk.type == 'hoyolab') {
      if (/os_/.test(sk.region)) {
        game_biz = 'hk4e_global'
      } else if (/official/.test(sk.region)) {
        game_biz = 'hkrpg_global'
      } else if (/_us|_eu|_jp|_sg/.test(sk.region)) {
        game_biz = 'nap_global'
      }
    } else {
      if (/cn_/.test(sk.region)) {
        game_biz = 'hk4e_cn'
      } else if (/_cn/.test(sk.region)) {
        game_biz = String(sk.uid || '').length < 10 ? 'nap_cn' : 'hkrpg_cn'
      }
    }
    return game_biz
  }

  /**
   * 自动刷新ck
   * @param ck 失效的ck
   * @returns {Promise<{ok: boolean, ck?: string, ltuid?: string, qq?: string, reason?: string}>}
   */
  static async refreshCk(ck) {
    let ltuid = MysApi.getLtuid(ck)
    if (!ltuid) return { ok: false, reason: '无法解析ltuid' }

    let cache = MysApi.ckRefreshCache.get(ltuid)
    if (cache && Date.now() - cache.at < MysApi.ckRefreshCacheTtl) return cache.ret

    if (MysApi.ckRefreshTasks.has(ltuid)) return await MysApi.ckRefreshTasks.get(ltuid)

    let task = MysApi.doRefreshCk(ltuid)
    MysApi.ckRefreshTasks.set(ltuid, task)
    let ret
    try {
      ret = await task
    } finally {
      MysApi.ckRefreshTasks.delete(ltuid)
    }
    MysApi.ckRefreshCache.set(ltuid, { at: Date.now(), ret })
    return ret
  }

  /** 用stoken刷新ck并写回MysUsers */
  static async doRefreshCk(ltuid) {
    try {
      const [{ default: Cfg }, { default: MysUser }] = await Promise.all([
        import('../Cfg.js'),
        import('./MysUser.js')
      ])

      /** 查找该ltuid对应的stoken（短时缓存，避免多账号刷新时反复扫描yaml） */
      let sks
      if (MysApi.skScanCache && Date.now() - MysApi.skScanCache.at < 10 * 1000) {
        sks = MysApi.skScanCache.sks
      } else {
        sks = await Cfg.getsks(true, '', false)
        MysApi.skScanCache = { at: Date.now(), sks }
      }
      let sk = Object.values(sks || {}).find(v => v && String(v.stuid) === String(ltuid) && v.stoken && v.ltoken)
      if (!sk) return { ok: false, reason: '无stoken' }

      let mysApi = new MysApi(sk.stuid, sk.sk, { game: 'bbs', log: false }, sk.region, MysApi.getBbsGameBiz(sk))
      let res = await mysApi.getData('bbsGetCookie')
      if (!res?.data?.cookie_token) {
        return { ok: false, reason: `bbsGetCookie失败${res?.message ? `：${res.message}` : ''}` }
      }

      let ck = `ltoken=${sk.ltoken};ltuid=${sk.stuid};cookie_token=${res.data.cookie_token};account_id=${sk.stuid}`
      let mys = await MysUser.create(sk.stuid)
      if (!mys || !mys.ck) return { ok: false, reason: 'ck记录不存在' }

      mys.setCkData({ ck })
      await mys.save()
      try {
        await mys.initCache()
      } catch (error) {
        logger.error(`[自动刷新ck]ltuid:${ltuid} 刷新缓存失败：${error.message}`)
      }
      logger.mark(`[自动刷新ck]ltuid:${ltuid} qq:${sk.userId} 刷新成功`)
      return { ok: true, ck, ltuid: String(ltuid), qq: sk.userId }
    } catch (error) {
      logger.error(`[自动刷新ck]ltuid:${ltuid} 刷新异常：${error.message}`)
      return { ok: false, reason: '刷新异常' }
    }
  }

  /* eslint-disable quotes */
  get device() {
    if (!this._device) this._device = this.getGuid()
    return this._device
  }

  getUrl(type, data = {}) {
    let urlMap = this.apiTool.getUrlMap({ ...data, deviceId: this.device })
    if (!urlMap[type]) return false

    let { url, query = '', body = '', config = '', types = '', sign = ''  } = urlMap[type]

    if (query) url += `?${query}`
    if (body) body = JSON.stringify(body)

    this.forumid = data.forumid || ''
    let headers = this.getHeaders(types, query, body, sign)

    // 如果有设备指纹，写入设备指纹
    if (data.deviceFp) {
      headers['x-rpc-device_fp'] = data.deviceFp
      // 兼容喵崽
      this._device_fp = { data: { device_fp: data.deviceFp } }
    }

    // 如果有设备ID，写入设备ID（传入的，这里是绑定设备方法1中的设备ID）
    if (data.deviceId) headers['x-rpc-device_id'] = data.deviceId

    // 如果有绑定设备信息，写入绑定设备信息，否则写入默认设备信息
    if (data?.deviceInfo && data?.modelName && data?.osVersion) {
      const osVersion = data.osVersion
      const modelName = data.modelName
      const deviceBrand = data.deviceInfo?.split('/')[0]
      const deviceDisplay = data.deviceInfo?.split('/')[3]
      try {
        headers['x-rpc-device_name'] = `${deviceBrand} ${modelName}`
        headers['x-rpc-device_model'] = modelName
        headers['x-rpc-csm_source'] = 'myself'
        // 国际服不需要绑定设备，故写入的'User-Agent'为国服
        headers['User-Agent'] = `Mozilla/5.0 (Linux; Android ${osVersion}; ${modelName} Build/${deviceDisplay}; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36 miHoYoBBS/2.73.1`
      } catch (error) {
        logger.error(`[genshin]设备信息解析失败：${error.message}`)
      }
    } else {
      try {
        headers['x-rpc-device_name'] = 'Sony XQ-BC52'
        headers['x-rpc-device_model'] = 'XQ-BC52'
        headers['x-rpc-csm_source'] = 'myself'
      } catch (error) {
        logger.error(`[genshin]设备信息解析失败：${error.message}`)
      }
    }

    if (type == 'deviceLogin' || type == 'saveDevice') {
      try {
        headers['x-rpc-sys_version'] = '12'
        headers['x-rpc-client_type'] = '2'
        headers['x-rpc-channel'] = 'miyousheluodi'
        headers['x-rpc-csm_source'] = 'home'
        headers['Host'] = 'bbs-api.miyoushe.com'
        headers['User-Agent'] = 'okhttp/4.9.3'
        headers['Referer'] = 'https://app.mihoyo.com/'
        headers['DS'] = this.getDs2()
      } catch (error) {
        logger.error(`[genshin]设备信息解析失败：${error.message}`)
      }
    }

    if (type == 'material') {
      headers['x-rpc-client_type'] = '4'
      headers['Referer'] = 'https://bbs-api-os.hoyolab.com/'
    }

    return { url, headers, body, config }
  }

  getServer() {
    const _uid = String(this.uid)
    const isSr = this.game == 'sr'
    const isZzz = this.game == 'zzz'
    const isWd = this.game == 'wd'
    if (isWd) {
      switch (_uid.slice(0, -7)) {
        case '11':
          return 'cn_prod_bb01'// B服
        case '21':
          return 'cn_prod_mix01'// 渠道服(华为)
        case '10':
          return 'tw_prod_wd01'// 台服
        case '20':
          return 'glb_prod_wd01'// 国际服
      }
    } else if (isZzz) {
      switch (_uid.slice(0, -8)) {
        case '10':
          return 'prod_gf_us'// 美服
        case '15':
          return 'prod_gf_eu'// 欧服
        case '13':
          return 'prod_gf_jp'// 亚服
        case '17':
          return 'prod_gf_sg'// 港澳台服
      }
    } else {
      switch (_uid.slice(0, -8)) {
        case '5':
          return isSr ? 'prod_qd_cn' : 'cn_qd01'// B服
        case '6':
          return isSr ? 'prod_official_usa' : 'os_usa'// 美服
        case '7':
          return isSr ? 'prod_official_euro' : 'os_euro'// 欧服
        case '8':
        case '18':
          return isSr ? 'prod_official_asia' : 'os_asia'// 亚服
        case '9':
          return isSr ? 'prod_official_cht' : 'os_cht'// 港澳台服
      }
    }
    return isWd ? 'cn_prod_gf01' : (isZzz || isSr) ? 'prod_gf_cn' : 'cn_gf01'// 官服
  }

  async getData(type, data = {}, cached = false, refreshed = false) {
    /** 保留原始请求参数，ck刷新成功后重试使用；同时避免修改调用方传入的对象 */
    let originData = { ...data }
    data = { ...data }
    if (!this.types.includes(type)) {
      let ltuid
      if (this.game == 'bbs') {
        ltuid = this.uid
      } else {
        ltuid = this.cookie.match(/ltuid=(\d+)|stuid=(\d+)/)
        ltuid = ltuid[1]
      }
      if (ltuid) {
        let bindInfo = await redis.get(`genshin:device_fp:${ltuid}:bind`) || await redis.get(`ZZZ:DEVICE_FP:${ltuid}:BIND`)
        if (bindInfo) {
          try {
            bindInfo = JSON.parse(bindInfo)
            data = {
              ...data,
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
        const { deviceFp } = await getDeviceFp.Fp(this.uid, this.cookie, this.game, this.biz, this.server)
        if (deviceFp) data = {
          ...data,
          deviceFp: deviceFp
        }
        let device_id = await redis.get(`genshin:device_fp:${ltuid}:id`) || await redis.get(`ZZZ:DEVICE_FP:${ltuid}:ID`)
        if (device_id) data = {
          ...data,
          deviceId: device_id
        }
      }
    }

    if (!this.types.includes(type)) {
      if (!this._device_fp && !data?.Getfp && !data?.headers?.['x-rpc-device_fp']) {
        this._device_fp = await this.getData('getFp', {
          ...data,
          Getfp: true
        })
      }
      if (type === 'getFp' && !data?.Getfp) return this._device_fp
    }

    let { url, headers, body, config } = this.getUrl(type, data)

    if (!url) return false

    let cacheKey = this.cacheKey(type, data)
    let cahce = await redis.get(cacheKey)
    if (cahce) return JSON.parse(cahce)

    /** 记录本次请求实际使用的ck，刷新后判断是否需要重试 */
    let reqCk = this.cookie
    headers.Cookie = this.cookie

    if (data.headers) {
      headers = { ...headers, ...data.headers }
      delete data.headers
    }

    if (type == 'sign' && (data.validate || data.geetest_validate)) {
      headers["x-rpc-challenge"] = data.challenge || data.geetest_challenge
      headers["x-rpc-validate"] = data.validate || data.geetest_validate
      headers["x-rpc-seccode"] = `${data.validate || data.geetest_validate}|jordan`
    }

    if (!this.types.includes(type)) {
      if (type !== 'getFp' && !headers['x-rpc-device_fp'] && this._device_fp.data?.device_fp) {
        headers['x-rpc-device_fp'] = this._device_fp.data.device_fp
      }
    }

    let param = {
      headers,
      agent: await this.getAgent(),
      timeout: 10000
    }
    if (body) {
      param.method = 'post'
      param.body = body
    } else if (type == 'bbsGetCookie' && !/cn_|_cn/.test(this.server)) {
      param.method = 'post'
    } else {
      param.method = 'get'
    }
    let response = {}
    let start = Date.now()
    if (this.gttypes.includes(type)) {
      param = {
        method: 'post',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: config
      }
    }

    try {
      response = await fetch(url, param)
    } catch (error) {
      logger.error(error.toString())
      return false
    }

    if (!response.ok) {
      logger.error(`[米游社接口][${type}][${this.uid}] ${response.status} ${response.statusText}`)
      return false
    }
    if (this.option.log) {
      logger.mark(`[米游社接口][${type}][${this.uid}] ${Date.now() - start}ms`)
    }
    const res = await response.json()

    if (!res) {
      logger.mark('mys接口没有返回')
      return false
    }

    res.api = type

    if (cached) this.cache(res, cacheKey)

    /** ck失效：自动刷新后重试一次，成功则继续查询 */
    if (!refreshed && type !== 'bbsGetCookie' && this.game !== 'bbs' && MysApi.isLoginError(res)) {
      let refresh = await MysApi.refreshCk(reqCk)
      if (refresh.ok && refresh.ck !== reqCk) {
        this.cookie = refresh.ck
        return await this.getData(type, originData, cached, true)
      }
    }

    return res
  }

  getHeaders(types, query = '', body = '', sign = false) {
    const header = {
      'x-rpc-app_version': '2.73.1',
      'x-rpc-client_type': '5',
      'x-rpc-device_id': this._device,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; XQ-BC52 Build/61.2.A.0.472A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36 miHoYoBBS/2.73.1',
      Referer: 'https://act.mihoyo.com/'
    }

    const header_os = {
      'x-rpc-app_version': '2.57.1',
      'x-rpc-client_type': '2',
      'x-rpc-device_id': this._device,
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; XQ-BC52 Build/61.2.A.0.472A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/111.0.5563.116 Mobile Safari/537.36 miHoYoBBSOversea/2.57.1',
      Referer: 'https://act.hoyolab.com/'
    }

    const header_bbs = {
      'x-rpc-app_version': '2.73.1',
      'x-rpc-channel': 'miyousheluodi',
      'x-rpc-client_type': '2',
      Referer: 'https://app.mihoyo.com/',
      'User-Agent': 'okhttp/4.9.3',
      'x-rpc-device_id': this._device,
      'x-rpc-device_model': 'XQ-BC52',
      'x-rpc-device_name': 'Sony XQ-BC52',
      'x-rpc-sys_version': '12'
    }

    let client
    if (/_cn/.test(this.biz) || /cn_|_cn/.test(this.server)) {
      client = header
    } else {
      client = header_os
    }

    let signgame = this.game == 'gs' ? 'hk4e' : this.game == 'sr' ? 'hkrpg' : this.game == 'zzz' ? 'zzz' : this.game == 'bh3' ? 'bh3' : this.game == 'bh2' ? 'bh2' : 'nxx'
    let x_rpc = {
      'x-rpc-device_model': 'XQ-BC52',
      'x-rpc-device_name': 'Sony XQ-BC52',
      'x-rpc-sys_version': '12',
      'x-rpc-signgame': signgame,
      'x-rpc-platform': 'android'
    }

    switch (types) {
      // 细分签到
      case 'sign':
        if (/_cn/.test(this.biz) || /cn_|_cn/.test(this.server))
          return {
            ...header,
            ...x_rpc,
            'X-Requested-With': 'com.mihoyo.hyperion',
            'x-rpc-channel': 'miyousheluodi',
            DS: this.SignDs()
          }
        else
          return {
            ...header_os,
            ...x_rpc,
            'X-Requested-With': 'com.mihoyo.hoyolab',
            'x-rpc-channel': 'google',
            DS: this.SignDs()
          }
      case 'bbs':
        return {
          ...header_bbs,
          DS: (sign ? this.bbsDs(query, body) : this.SignDs("WGtruoQrwczmsjLOPXzJLnaAYycsLavx"))
        }
      case 'qrcode':
        return {
          'Host': 'passport-api.miyoushe.com',
          'x-rpc-device_os': 'Windows 10 64-bit',
          'x-rpc-lifecycle_id': 'ad09f4ea50',
          'x-rpc-app_id': 'bll8iq97cem8',
          'x-rpc-device_id': this._device,
          'x-rpc-device_name': 'Chrome',
          "x-rpc-device_fp": '38d805974f6af',
          'x-rpc-client_type': '4',
          'x-rpc-game_biz': 'bbs_cn',
          'x-rpc-sdk_version': '2.54.0',
          'x-rpc-device_model': 'Chrome 149.0.0.0',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
          'Connection': 'Keep-Alive',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      case 'hoyocode':
        return {
          ...header_os
        }
      case 'authkey':
        return {
          ...header_bbs,
          DS: this.getDs2()
        }
      case 'noheader':
        return {}
    }
    return {
      ...client,
      DS: this.getDs(query, body)
    }
  }

  getDs(q = '', b = '') {
    let n = ''
    if (/_cn/.test(this.biz) || /cn_|_cn/.test(this.server)) {
      n = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
    } else {
      n = 'okr4obncj8bw5a65hbnn5oo6ixjc3l9w'
    }
    let t = Math.round(new Date().getTime() / 1000)
    let r = Math.floor(Math.random() * 900000 + 100000)
    let DS = md5(`salt=${n}&t=${t}&r=${r}&b=${b}&q=${q}`)
    return `${t},${r},${DS}`
  }

  getDs2() {
    let t = Math.round(new Date().getTime() / 1000)
    let r = this.randomString(6)
    let DS = md5(`salt=WGtruoQrwczmsjLOPXzJLnaAYycsLavx&t=${t}&r=${r}`)
    return `${t},${r},${DS}`
  }

  bbsDs(q = "", b, salt = "t0qEgfub6cvueAPgR5m9aQWWVciEer7v") {
    let t = Math.floor(Date.now() / 1000)
    let r = _.random(100001, 200000)
    let DS = md5(`salt=${salt}&t=${t}&r=${r}&b=${b}&q=${q}`)
    return `${t},${r},${DS}`
  }

  SignDs(salt = 'jEpJb9rRARU2rXDA9qYbZ3selxkuct9a') {
    const t = Math.floor(Date.now() / 1000)
    let r = this.randomString(6)
    const DS = md5(`salt=${salt}&t=${t}&r=${r}`)
    return `${t},${r},${DS}`
  }

  getGuid() {
    function S4() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
  }

  randomString(length = 32) {
    let randomStr = ''
    for (let i = 0; i < length; i++) {
      randomStr += _.sample('abcdefghijklmnopqrstuvwxyz0123456789')
    }
    return randomStr
  }

  cacheKey(type, data) {
    return 'Yz:genshin:mys:cache:' + md5(this.uid + type + JSON.stringify(data))
  }

  async cache(res, cacheKey) {
    if (!res || res.retcode !== 0) return
    redis.setEx(cacheKey, this.cacheCd, JSON.stringify(res))
  }

  async getAgent() {
    let proxyAddress = cfg.bot.proxyAddress
    if (!proxyAddress) return null
    if (proxyAddress === 'http://0.0.0.0:0') return null

    if (/_cn/.test(this.biz) || /cn_|_cn/.test(this.server)) return null

    if (HttpsProxyAgent === '') {
      HttpsProxyAgent = await import('https-proxy-agent').catch((err) => {
        logger.error(err)
      })

      HttpsProxyAgent = HttpsProxyAgent ? HttpsProxyAgent.HttpsProxyAgent : undefined
    }

    if (HttpsProxyAgent) {
      return new HttpsProxyAgent(proxyAddress)
    }

    return null
  }
}
