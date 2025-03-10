import md5 from 'md5'
import fetch from 'node-fetch'
import cfg from '../../../../lib/config/config.js'
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
  constructor(uid, cookie, option = { game: 'gs', device: '' }) {
    this.uid = uid
    this.cookie = cookie
    this.game = option.game || 'gs'
    this.server = this.getServer()
    this.apiTool = new ApiTool(uid, this.server, this.game)
    /** 5分钟缓存 */
    this.cacheCd = 300

    this._device = option.device || this.device
    this.option = {
      log: true,
      ...option
    }
  }

  /* eslint-disable quotes */
  get device() {
    if (!this._device) this._device = `Yz-${md5(this.uid).substring(0, 5)}`
    return this._device
  }

  getUrl(type, data = {}) {
    let urlMap = this.apiTool.getUrlMap({ ...data, deviceId: this.device })
    if (!urlMap[type]) return false

    let { url, query = '', body = '' } = urlMap[type]

    if (query) url += `?${query}`
    if (body) body = JSON.stringify(body)

    let headers = this.getHeaders(query, body)

    return { url, headers, body }
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

  async getData(type, data = {}, cached = false) {
    if (!this._device_fp && !data?.Getfp && !data?.headers?.['x-rpc-device_fp']) {
      this._device_fp = await this.getData('getFp', { Getfp: true })
    }
    if (type === 'getFp' && !data?.Getfp) return this._device_fp

    let { url, headers, body } = this.getUrl(type, data)

    if (!url) return false

    let cacheKey = this.cacheKey(type, data)
    let cahce = await redis.get(cacheKey)
    if (cahce) return JSON.parse(cahce)

    headers.Cookie = this.cookie

    if (data.headers) {
      headers = { ...headers, ...data.headers }
    }

    if (type !== 'getFp' && !headers['x-rpc-device_fp'] && this._device_fp.data?.device_fp) {
      headers['x-rpc-device_fp'] = this._device_fp.data.device_fp
    }

    let param = {
      headers,
      agent: await this.getAgent(),
      timeout: 10000
    }
    if (body) {
      param.method = 'post'
      param.body = body
    } else {
      param.method = 'get'
    }
    let response = {}
    let start = Date.now()
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

    return res
  }

  getHeaders(query = '', body = '') {
    const cn = {
      app_version: '2.73.1',
      User_Agent: 'Mozilla/5.0 (Linux; Android 12; XQ-AT52 Build/58.2.A.7.93; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.88 Mobile Safari/537.36 miHoYoBBS/2.73.1',
      client_type: '5',
      Origin: 'https://webstatic.mihoyo.com',
      X_Requested_With: 'com.mihoyo.hyperion',
      Referer: 'https://webstatic.mihoyo.com/'
    }
    const os = {
      app_version: '2.57.1',
      User_Agent: 'Mozilla/5.0 (Linux; Android 12; XQ-AT52 Build/58.2.A.7.93; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/100.0.4896.88 Mobile Safari/537.36 miHoYoBBSOversea/2.57.1',
      client_type: '2',
      Origin: 'https://act.hoyolab.com',
      X_Requested_With: 'com.mihoyo.hoyolab',
      Referer: 'https://act.hoyolab.com/'
    }
    let client
    if (/cn_|_cn/.test(this.server)) {
      client = cn
    } else {
      client = os
    }
    return {
      'x-rpc-app_version': client.app_version,
      'x-rpc-client_type': client.client_type,
      'User-Agent': client.User_Agent,
      Referer: client.Referer,
      DS: this.getDs(query, body)
    }
  }

  getDs(q = '', b = '') {
    let n = ''
    if (/cn_|_cn/.test(this.server)) {
      n = 'xV8v4Qu54lUKrEYFZkJhB8cuOh9Asafs'
    } else {
      n = 'okr4obncj8bw5a65hbnn5oo6ixjc3l9w'
    }
    let t = Math.round(new Date().getTime() / 1000)
    let r = Math.floor(Math.random() * 900000 + 100000)
    let DS = md5(`salt=${n}&t=${t}&r=${r}&b=${b}&q=${q}`)
    return `${t},${r},${DS}`
  }

  getGuid() {
    function S4() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
    }

    return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4())
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

    if (/cn_|_cn/.test(this.server)) return null

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
