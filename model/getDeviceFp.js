import fetch from 'node-fetch'
import MysApi from './mys/mysApi.js'

export default class getDeviceFp {
  static async Fp(uid, ck, game, biz) {
    let ltuid = ck.match(/ltuid=(\d+)/)
    ltuid = ltuid[1]
    let mysapi = new MysApi(uid, ck, { game }, '', biz)
    let deviceFp = await redis.get(`genshin:device_fp:${ltuid}:fp`)
    let data = {}
    if (!deviceFp) {
      let bindInfo = await redis.get(`genshin:device_fp:${ltuid}:bind`)
      if (bindInfo) {
        data = {
          deviceFp
        }
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
      const sdk = mysapi.getUrl('getFp', data)
      const res = await fetch(sdk.url, {
        headers: sdk.headers,
        method: 'POST',
        body: sdk.body
      })
      const fpRes = await res.json()
      logger.debug(`[米游社][设备指纹]${JSON.stringify(fpRes)}`)
      deviceFp = fpRes?.data?.device_fp
      if (!deviceFp) {
        return { deviceFp: null }
      }
      await redis.set(`genshin:device_fp:${ltuid}:fp`, deviceFp, {
        EX: 86400 * 7
      })
      if (['bh3_cn', 'bh2_cn'].includes(biz) || !(game == 'wd' ? /^(10|20)[0-9]{7}/i : /^(1[0-9]|[6-9])[0-9]{8}/i).test(uid)) {
        data['deviceFp'] = deviceFp
        const deviceLogin = mysapi.getUrl('deviceLogin', data)
        const saveDevice = mysapi.getUrl('saveDevice', data)
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

    return { deviceFp }
  }
}
