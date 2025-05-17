import crypto from 'crypto'
/**
 * 整合接口用于查询数据
 * 方便后续用于解耦
 * 临时处理，后续大概率重写 主要原因（懒）
 */
export default class apiTool {
  /**
   *
   * @param {用户uid} uid
   * @param {区服} server
   * @param {是否为星穹铁道或其他游戏? type(bool or string)} isSr
   */
  constructor(uid, server, game, biz) {
    this.uid = uid
    this.game = game || 'gs'
    this.server = server
    this.biz = biz
    this.uuid = crypto.randomUUID()
  }

  getUrlMap = (data = {}) => {
    const productName = data?.productName ?? 'XQ-AT52'
    const deviceType = data?.deviceType ?? 'XQ-AT52'
    const modelName = data?.modelName ?? 'XQ-AT52'
    const oaid = data?.oaid ?? this.uuid
    const osVersion = data?.osVersion ?? '12'
    const deviceInfo = data?.deviceInfo ?? 'Sony/XQ-AT52/XQ-AT52:12/58.2.A.7.93/058002A007009304241360111:user/release-keys'
    const board = data?.board ?? 'kona'
    const deviceBrand = deviceInfo.split('/')[0]
    const deviceDisplay = deviceInfo.split('/')[3]
    let host, hostRecord, hostPublicData
    if (['bh3_cn', 'bh2_cn'].includes(this.biz) || /cn_|_cn/.test(this.server)) {
      host = 'https://api-takumi.mihoyo.com/'
      hostRecord = 'https://api-takumi-record.mihoyo.com/'
      hostPublicData = 'https://public-data-api.mihoyo.com/'
    } else {
      host = 'https://sg-public-api.hoyolab.com/'
      hostRecord = 'https://bbs-api-os.hoyolab.com/'
      hostPublicData = 'https://sg-public-data-api.hoyoverse.com/'
    }
    let urlMap = {
      gs: {
        /** 体力接口fp参数用于避开验证码 */
        ...(['cn_gf01', 'cn_qd01'].includes(this.server) ? {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d802d62e7fb',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"${deviceDisplay}","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f469c1319',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"${deviceDisplay}","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        }),
        /** 首页宝箱 */
        index: {
          url: `${hostRecord}game_record/app/genshin/api/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 深渊 */
        spiralAbyss: {
          url: `${hostRecord}game_record/app/genshin/api/spiralAbyss`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || 1}&server=${this.server}`
        },
        /** 幻想真境剧诗 */
        role_combat: {
          url: `${hostRecord}game_record/app/genshin/api/role_combat`,
          query: `role_id=${this.uid}&need_detail=true&server=${this.server}`
        },
        /** 角色详情 */
        character: {
          url: `${hostRecord}game_record/app/genshin/api/character/list`,
          body: { role_id: this.uid, server: this.server }
        },
        /** 角色面板 */
        characterDetail: {
          url: `${hostRecord}game_record/app/genshin/api/character/detail`,
          body: { role_id: this.uid, server: this.server, character_ids: data.character_ids}
        },
        /** 树脂 */
        dailyNote: {
          url: `${hostRecord}game_record/app/genshin/api/dailyNote`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 详情 */
        detail: {
          url: `${host}event/e20200928calculate/v1/sync/avatar/detail`,
          query: `uid=${this.uid}&region=${this.server}&avatar_id=${data.avatar_id}`
        },
        /** 札记 */
        ys_ledger: {
          url: 'https://hk4e-api.mihoyo.com/event/ys_ledger/monthInfo',
          query: `month=${data.month}&bind_uid=${this.uid}&bind_region=${this.server}`
        },
        /** 养成计算器 */
        compute: {
          url: `${host}event/e20200928calculate/v3/batch_compute`,
          body: data.body
        },
        computeList: {
          url: `${host}event/e20200928calculate/v1/${data.type || 'avatar'}/list`,
          body: data.body
        },
        blueprintCompute: {
          url: `${host}event/e20200928calculate/v1/furniture/compute`,
          body: data.body
        },
        /** 养成计算器 */
        blueprint: {
          url: `${host}event/e20200928calculate/v1/furniture/blueprint`,
          query: `share_code=${data.share_code}&region=${this.server}`
        },
        /** 角色技能 */
        avatarSkill: {
          url: `${host}event/e20200928calculate/v1/avatarSkill/list`,
          query: `avatar_id=${data.avatar_id}`
        },
        /** 七圣召唤数据 */
        basicInfo: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/basicInfo`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /**七圣牌组 */
        deckList: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/deckList`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 七圣召唤角色牌数据 */
        avatar_cardList: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/cardList`,
          query: `limit=999&need_action=false&need_avatar=true&need_stats=true&offset=0&role_id=${this.uid}&server=${this.server}`
        },
        /** 七圣召唤行动牌数据 */
        action_cardList: {
          url: `${hostRecord}game_record/app/genshin/api/gcg/cardList`,
          query: `limit=999&need_action=true&need_avatar=false&need_stats=true&offset=0&role_id=${this.uid}&server=${this.server}`
        },
        /**使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: 'https://sg-hk4e-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl',
          query: `cdkey=${data.cdk}&game_biz=hk4e_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ''}&uid=${this.uid}`
        },
        deviceLogin: {
          url: 'https://bbs-api.miyoushe.com/apihub/api/deviceLogin',
          body: {
            app_version: '2.73.1',
            device_id: data.deviceId,
            device_name: `${deviceBrand}${modelName}`,
            os_version: '33',
            platform: 'Android',
            registration_id: this.generateSeed(19),
          },
        },
        saveDevice: {
          url: 'https://bbs-api.miyoushe.com/apihub/api/saveDevice',
          body: {
            app_version: '2.73.1',
            device_id: data.deviceId,
            device_name: `${deviceBrand}${modelName}`,
            os_version: '33',
            platform: 'Android',
            registration_id: this.generateSeed(19),
          },
        }
      },
      sr: {
        ...(['prod_gf_cn', 'prod_qd_cn'].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hkrpg_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d802d62e7fb',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"${deviceDisplay}","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hkrpg_global&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f469c1319',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"${deviceDisplay}","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        }),
        /** 首页宝箱 */
        index: {
          url: `${hostRecord}game_record/app/hkrpg/api/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        basicInfo: {
          url: `${hostRecord}game_record/app/hkrpg/api/role/basicInfo`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 深渊 （混沌回忆） */
        spiralAbyss: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || 1}&server=${this.server}`
        },
        /** 角色面板 */
        avatarInfo: {
          url: `${hostRecord}game_record/app/hkrpg/api/avatar/info`,
          query: `need_wiki=true&role_id=${this.uid}&server=${this.server}`
        },
        /** 开拓月历接口 */
        ys_ledger: {
          url: `${host}event/srledger/month_info`,
          query: `lang=zh-cn&region=${this.server}&uid=${this.uid}&month=${data.month}`
        },
        /** 角色详情 */
        character: {
          url: `${hostRecord}game_record/app/hkrpg/api/avatar/basic`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 树脂 */
        dailyNote: {
          url: `${hostRecord}game_record/app/hkrpg/api/note`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 养成计算器 */
        compute: {
          url: `${host}event/rpgcalc/compute?`,
          query: `game=hkrpg`,
          body: data.body
        },
        /** 详情 */
        detail: {
          url: `${host}event/rpgcalc/avatar/detail`,
          query: `game=hkrpg&lang=zh-cn&item_id=${data.avatar_id}&tab_from=${data.tab_from}&change_target_level=0&uid=${this.uid}&region=${this.server}`
        },
        /**使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: 'https://sg-hkrpg-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl',
          query: `cdkey=${data.cdk}&game_biz=hkrpg_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ''}&uid=${this.uid}`
        },
        deviceLogin: {
          url: 'https://bbs-api.miyoushe.com/apihub/api/deviceLogin',
          body: {
            app_version: '2.73.1',
            device_id: data.deviceId,
            device_name: `${deviceBrand}${modelName}`,
            os_version: '33',
            platform: 'Android',
            registration_id: this.generateSeed(19)
          }
        },
        saveDevice: {
          url: 'https://bbs-api.miyoushe.com/apihub/api/saveDevice',
          body: {
            app_version: '2.73.1',
            device_id: data.deviceId,
            device_name: `${deviceBrand}${modelName}`,
            os_version: '33',
            platform: 'Android',
            registration_id: this.generateSeed(19)
          }
        }
      },
      zzz: {
        ...(['prod_gf_cn'].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nap_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d802d62e7fb',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"${deviceDisplay}","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nap_global&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f469c1319',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"${deviceDisplay}","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        }),
        /** 首页宝箱 */
        index: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/index`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 角色详情 */
        character: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/avatar/basic`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 树脂 */
        dailyNote: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/note`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /** 邦布 */
        buddy: {
          url: `${hostRecord}event/game_record_zzz/api/zzz/buddy/info`,
          query: `role_id=${this.uid}&server=${this.server}`
        },
        /**使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: 'https://public-operation-nap.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl',
          query: `cdkey=${data.cdk}&game_biz=nap_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ''}&uid=${this.uid}`
        }
      },
      wd: {
        ...(['cn_prod_gf01', 'cn_prod_bb01', 'cn_prod_mix01'].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nxx_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d802d62e7fb',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"${deviceDisplay}","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `${['tw_prod_wd01'].includes(this.server) ? 'game_biz=nxx_tw' : 'game_biz=nxx_global'}&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f469c1319',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"${deviceDisplay}","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        })
      },
      bh3: {
        bh3_cn: {
          url: 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie',
          query: 'game_biz=bh3_cn'
        },
        bh3_global: {
          url: 'https://sg-public-api.hoyolab.com/binding/api/getUserGameRolesByCookie',
          query: 'game_biz=bh3_global'
        },
        ...(['bh3_cn'].includes(this.biz) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=bh3_cn&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d802d62e7fb',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"${deviceDisplay}","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=bh3_global&region=${this.server}&game_uid=${this.uid}`
          },
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f469c1319',
              device_id: 'd927172613ac7594',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221344","appUpdateTimeDiff":1736258244054,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.6262221x3.1136606x9.471091","sdRemain":221216,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"228442","magnetometer":"-17.1x-6.6937504x-25.85625","display":"${deviceDisplay}","appInstallTimeDiff":1736258244054,"packageVersion":"2.33.0","gyroscope":"-0.18203248x-0.3193204x0.060321167","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        }),
        /** 体力 */
        dailyNote: {
          url: `${hostRecord}game_record/appv2/honkai3rd/api/note`,
          query: `role_id=${this.uid}&server=${this.server}`
        }
      },
      bh2: {
        bh2_cn: {
          url: 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie',
          query: 'game_biz=bh2_cn'
        },
        UserGame: {
          url: `${host}binding/api/getUserGameRolesByCookie`,
          query: `game_biz=bh2_cn&region=${this.server}&game_uid=${this.uid}`
        },
        /** 体力接口fp参数用于避开验证码 */
        getFp: {
          url: `${hostPublicData}device-fp/api/getFp`,
          body: {
            app_name: 'bbs_cn',
            bbs_device_id: `${this.uuid}`,
            device_fp: '38d802d62e7fb',
            device_id: 'd927172613ac7594',
            ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"${modelName}","productName":"${productName}","romRemain":"489","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":228442,"buildTime":"1653304778000","buildUser":"BuildUser","simState":1,"ramRemain":"221267","appUpdateTimeDiff":1736258293874,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"31","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"512","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"0.24616162x0.44117668x9.934102","sdRemain":221125,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"228442","magnetometer":"-0.93750006x26.456251x-42.693752","display":"${deviceDisplay}","appInstallTimeDiff":1736258293874,"packageVersion":"2.33.0","gyroscope":"4.5813544E-4x-0.0x-7.635591E-4","batteryStatus":66,"hasKeyboard":0,"board":"${board}"}`,
            platform: '2',
            seed_id: `${this.uuid}`,
            seed_time: new Date().getTime() + ''
          }
        }
      }
    }

    if (this.server.startsWith('os')) {
      urlMap.gs.detail.url = 'https://sg-public-api.hoyolab.com/event/calculateos/sync/avatar/detail'// 角色天赋详情
      urlMap.gs.detail.query = `lang=zh-cn&uid=${this.uid}&region=${this.server}&avatar_id=${data.avatar_id}`
      urlMap.gs.avatarSkill.url = 'https://sg-public-api.hoyolab.com/event/calculateos/avatar/skill_list'// 查询未持有的角色天赋
      urlMap.gs.avatarSkill.query = `lang=zh-cn&avatar_id=${data.avatar_id}`
      urlMap.gs.compute.url = 'https://sg-public-api.hoyolab.com/event/calculateos/compute'// 已支持养成计算
      urlMap.gs.blueprint.url = 'https://sg-public-api.hoyolab.com/event/calculateos/furniture/blueprint'
      urlMap.gs.blueprint.query = `share_code=${data.share_code}&region=${this.server}&lang=zh-cn`
      urlMap.gs.blueprintCompute.url = 'https://sg-public-api.hoyolab.com/event/calculateos/furniture/compute'
      urlMap.gs.blueprintCompute.body = { lang: 'zh-cn', ...data.body }
      urlMap.gs.ys_ledger.url = 'https://sg-hk4e-api.hoyolab.com/event/ysledgeros/month_info'// 支持了国际服札记
      urlMap.gs.ys_ledger.query = `lang=zh-cn&month=${data.month}&uid=${this.uid}&region=${this.server}`
    }

    if (this.game == 'zzz' && /_us|_eu|_jp|_sg/.test(this.server)) {
      urlMap.zzz.index.url = 'https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/index'// 首页宝箱
      urlMap.zzz.index.query = `lang=zh-cn&role_id=${this.uid}&server=${this.server}`
      urlMap.zzz.character.url = 'https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/avatar/basic'// 角色详情
      urlMap.zzz.character.query = `lang=zh-cn&role_id=${this.uid}&server=${this.server}`
      urlMap.zzz.dailyNote.url = 'https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/note'// 树脂
      urlMap.zzz.dailyNote.query = `role_id=${this.uid}&server=${this.server}`
      urlMap.zzz.buddy.url = 'https://sg-act-nap-api.hoyolab.com/event/game_record_zzz/api/zzz/buddy/info'// 邦布
      urlMap.zzz.buddy.query = `lang=zh-cn&role_id=${this.uid}&server=${this.server}`
    }
    return urlMap[this.game]
  }

  generateSeed(length = 16) {
    const characters = '0123456789abcdef'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
    return result
  }
}
