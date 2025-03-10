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
  constructor(uid, server, game) {
    this.uid = uid
    this.game = game || 'gs'
    this.server = server
    this.uuid = crypto.randomUUID()
  }

  getUrlMap = (data = {}) => {
    let host, hostRecord, hostPublicData
    if (/cn_|_cn/.test(this.server)) {
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
              device_fp: '38d7faa51d2b6',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":76,"hasKeyboard":0,"board":"msmnile"}`,
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
              device_fp: '38d7f2352506c',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
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
              device_fp: '38d7faa51d2b6',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":76,"hasKeyboard":0,"board":"msmnile"}`,
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
              device_fp: '38d7f2352506c',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
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
              device_fp: '38d7faa51d2b6',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":76,"hasKeyboard":0,"board":"msmnile"}`,
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
              device_fp: '38d7f2352506c',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
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
        UserGame: {
          url: `${host}binding/api/getUserGameRolesByCookie`,
          query: `region=${this.server}&game_uid=${this.uid}`
        },
        ...(['cn_prod_gf01', 'cn_prod_bb01', 'cn_prod_mix01'].includes(this.server) ? {
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d7faa51d2b6',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"456","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96757","appUpdateTimeDiff":1722171241616,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","vaid":"${this.uuid}","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","osVersion":"11","vendor":"unknown","accelerometer":"-0.084346995x8.73799x4.6301117","sdRemain":96600,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${this.uuid}","debugStatus":1,"ramCapacity":"107433","magnetometer":"-13.9125x-17.8875x-5.4750004","display":"55.2.A.4.332","appInstallTimeDiff":1717065300325,"packageVersion":"2.20.2","gyroscope":"0.017714571x-4.5813544E-4x0.0015271181","batteryStatus":76,"hasKeyboard":0,"board":"msmnile"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          /** 体力接口fp参数用于避开验证码 */
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f2352506c',
              device_id: '35315696b7071100',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"512","deviceName":"Xperia 1","productName":"J9110","romRemain":"474","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"J9110","brand":"Sony","hardware":"qcom","deviceType":"J9110","devId":"REL","serialNumber":"unknown","sdCapacity":107433,"buildTime":"1633631032000","buildUser":"BuildUser","simState":1,"ramRemain":"96715","appUpdateTimeDiff":1722171191009,"deviceInfo":"Sony\/J9110\/J9110:11\/55.2.A.4.332\/055002A004033203408384484:user\/release-keys","buildType":"user","sdkVersion":"30","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"Sony","emulatorStatus":0,"appMemory":"512","adid":"${this.uuid}","osVersion":"11","vendor":"unknown","accelerometer":"-0.22372891x-1.5332011x9.802497","sdRemain":96571,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"107433","magnetometer":"3.73125x-10.668751x3.7687502","display":"55.2.A.4.332","appInstallTimeDiff":1716489549794,"packageVersion":"","gyroscope":"0.18386503x-0.006413896x-0.008857286","batteryStatus":77,"hasKeyboard":0,"board":"msmnile"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        })
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
}
