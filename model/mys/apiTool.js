import crypto from 'crypto'
import Cfg from '../Cfg.js'
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
    this.api = Cfg.getConfig('api')
  }

  getUrlMap = (data = {}) => {
    const productName = data?.productName || 'XQ-BC52_EEA'
    const deviceType = data?.deviceType || 'XQ-BC52'
    const modelName = data?.modelName || 'XQ-BC52'
    const oaid = data?.oaid || this.uuid
    const osVersion = data?.osVersion || '13'
    const deviceInfo = data?.deviceInfo || 'Sony/XQ-BC52_EEA/XQ-BC52:13/61.2.A.0.472A/061002A0000472A0046651803:user/release-keys'
    const board = data?.board || 'lahaina'
    const deviceBrand = deviceInfo.split('/')[0]
    const deviceDisplay = deviceInfo.split('/')[3]
    let bbs_api = 'https://bbs-api.miyoushe.com/'
    let host, host_hk4e, host_nap, hostRecord, hostPublicData
    if (['bh3_cn', 'bh2_cn'].includes(this.biz) || /cn_|_cn/.test(this.server)) {
      host = 'https://api-takumi.mihoyo.com/'
      host_nap = 'https://act-nap-api.mihoyo.com/'
      hostRecord = 'https://api-takumi-record.mihoyo.com/'
      hostPublicData = 'https://public-data-api.mihoyo.com/'
    } else {
      host = 'https://sg-public-api.hoyolab.com/'
      host_hk4e = 'https://sg-hk4e-api.hoyolab.com/'
      host_nap = 'https://sg-act-nap-api.hoyolab.com/'
      hostRecord = 'https://bbs-api-os.hoyolab.com/'
      hostPublicData = 'https://sg-public-data-api.hoyoverse.com/'
    }
    let urlMap = {
      all: {
        createGeetest: {
          url: `${host}event/toolcomsrv/risk/createGeetest`,
          query: `is_high=true&app_key=${data.app_key}`
        },
        verifyGeetest: {
          url: `${host}event/toolcomsrv/risk/verifyGeetest`,
          body: {
            geetest_challenge: data.challenge || data.geetest_challenge,
            geetest_validate: data.validate || data.geetest_validate,
            geetest_seccode: `${data.validate || data.geetest_validate}|jordan`,
            app_key: data.app_key
          }
        },
        createVerification: {
          url: `${hostRecord}game_record/app/card/wapi/createVerification`,
          query: 'is_high=true'
        },
        verifyVerification: {
          url: `${hostRecord}game_record/app/card/wapi/verifyVerification`,
          body: {
            geetest_challenge: data.challenge || data.geetest_challenge,
            geetest_validate: data.validate || data.geetest_validate,
            geetest_seccode: `${data.validate || data.geetest_validate}|jordan`
          }
        },
        test_nine: {
          url: `${this.api.api}`,
          query: `gt=${data.gt}&challenge=${data.challenge}`
        },
        recognize: {
          url: `${this.api.api}`,
          config: `${this.api.key}&${this.api.query}&gt=${data.gt}&challenge=${data.challenge}`
        },
        signrecognize: {
          url: `${this.api.api}`,
          config: `${this.api.key}&${this.api.signquery}&gt=${data.gt}&challenge=${data.challenge}`
        },
        results: {
          url: `${this.api.resapi}`,
          config: `${this.api.key}&resultid=${data.resultid}`
        },
        in: {
          url: `${this.api.api}`,
          query: `${this.api.key}&${this.api.query}&gt=${data.gt}&challenge=${data.challenge}`
        },
        res: {
          url: `${this.api.resapi}`,
          query: `${this.api.key}&${this.api.resquery}&id=${data.request}`
        }
      },
      bbs: {
        bbsisSign: {
          url: `${bbs_api}apihub/sapi/getUserMissionsState`,
          types: 'bbs'
        },
        querySignInStatus: {
          url: `${bbs_api}apihub/sapi/querySignInStatus`,
          query: `gids=${data.signId}`,
          types: 'bbs'
        },
        bbsSign: {
          url: `${bbs_api}apihub/app/api/signIn`,
          body: {
            gids: data.signId
          },
          sign: true,
          types: 'bbs'
        },
        bbsGetCaptcha: {
          url: `${bbs_api}misc/api/createVerification`,
          query: 'is_high=true',
          types: 'bbs'
        },
        bbsCaptchaVerify: {
          url: `${bbs_api}misc/api/verifyVerification`,
          body: {
            "geetest_challenge": data.challenge || data.geetest_challenge,
            "geetest_validate": data.validate || data.geetest_validate,
            "geetest_seccode": `${data.validate || data.geetest_validate}|jordan`
          },
          types: 'bbs'
        },
        bbsPostList: {
          url: `${bbs_api}post/api/getForumPostList`,
          query: `forum_id=${data.forumId}&is_good=false&is_hot=false&page_size=20&sort_type=1`,
          types: 'bbs'
        },
        bbsPostFull: {
          url: `${bbs_api}post/api/getPostFull`,
          query: `post_id=${data.postId}`,
          types: 'bbs'
        },
        bbsShareConf: {
          url: `${bbs_api}apihub/api/getShareConf`,
          query: `entity_id=${data.postId}&entity_type=1`,
          types: 'bbs'
        },
        bbsVotePost: {
          url: `${bbs_api}apihub/sapi/upvotePost`,
          body: {
            "post_id": data.postId,
            "is_cancel": false
          },
          types: 'bbs'
        },
        getFp: {
          url: `${hostPublicData}device-fp/api/getFp`,
          body: {
            app_name: 'bbs_cn',
            bbs_device_id: `${this.uuid}`,
            device_fp: '38d805c20d53d',
            device_id: 'cc57c40f763ae4cc',
            ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
            platform: '2',
            seed_id: `${this.uuid}`,
            seed_time: new Date().getTime() + ''
          }
        },
        deviceLogin: {
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
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
      gs: {
        ...(['cn_gf01', 'cn_qd01'].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hk4e_cn&region=${this.server}&game_uid=${this.uid}`
          },
          sign: {
            url: `${host}event/luna/sign`,// 国服原神签到
            body: { act_id: 'e202311201442471', region: this.server, uid: this.uid, lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/luna/info`,
            query: `lang=zh-cn&act_id=e202311201442471&region=${this.server}&uid=${this.uid}`,
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/luna/home`,
            query: 'lang=zh-cn&act_id=e202311201442471',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d805c20d53d',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        } : {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hk4e_global&region=${this.server}&game_uid=${this.uid}`
          },
          sign: {
            url: `${host_hk4e}event/sol/sign`,// 国际服原神签到
            body: { act_id: 'e202102251931481', lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host_hk4e}event/sol/info`,
            query: 'lang=zh-cn&act_id=e202102251931481',
            types: 'sign'
          },
          sign_home: {
            url: `${host_hk4e}event/sol/home`,
            query: 'lang=zh-cn&act_id=e202102251931481',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f4c72b736',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"737","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218355","appUpdateTimeDiff":1740498134990,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-0.6436693x5.510072x8.106883","sdRemain":218227,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"224845","magnetometer":"-46.143753x52.350002x141.54376","display":"${deviceDisplay}","appInstallTimeDiff":1740498134990,"packageVersion":"2.35.0","gyroscope":"0.21242823x0.11484258x-0.09850194","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
        /** 幽境危战 */
        hard_challenge: {
          url: `${hostRecord}game_record/app/genshin/api/hard_challenge`,
          query: `role_id=${this.uid}&need_detail=true&server=${this.server}`
          // 先只做获取详细信息的（需要ck）
        },
        /** 幽境危战增益角色 */
        hard_challenge_popularity: {
          url: `${hostRecord}game_record/app/genshin/api/hard_challenge/popularity`,
          query: `role_id=${this.uid}&server=${this.server}`
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
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
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
      sr: {
        ...(['prod_gf_cn', 'prod_qd_cn'].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=hkrpg_cn&region=${this.server}&game_uid=${this.uid}`
          },
          sign: {
            url: `${host}event/luna/sign`,// 国服星铁签到
            body: { act_id: 'e202304121516551', region: this.server, uid: this.uid, lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/luna/info`,
            query: `lang=zh-cn&act_id=e202304121516551&region=${this.server}&uid=${this.uid}`,
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/luna/home`,
            query: 'lang=zh-cn&act_id=e202304121516551',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d805c20d53d',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
          sign: {
            url: `${host}event/luna/os/sign`,// 国际服星铁签到
            body: { act_id: 'e202303301540311', lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/luna/os/info`,
            query: 'lang=zh-cn&act_id=e202303301540311',
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/luna/os/home`,
            query: 'lang=zh-cn&act_id=e202303301540311',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f4c72b736',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"737","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218355","appUpdateTimeDiff":1740498134990,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-0.6436693x5.510072x8.106883","sdRemain":218227,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"224845","magnetometer":"-46.143753x52.350002x141.54376","display":"${deviceDisplay}","appInstallTimeDiff":1740498134990,"packageVersion":"2.35.0","gyroscope":"0.21242823x0.11484258x-0.09850194","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
        srChallenge: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge`,
          query: `isPrev=&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengeSimple: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengeStory: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_story`,
          query: `isPrev=&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengeStorySimple: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_story`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengeBoss: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_boss`,
          query: `isPrev=&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengeBossSimple: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_boss`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengePeak: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_peak`,
          query: `isPrev=&need_all=true&role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        srChallengePeakSimple: {
          url: `${hostRecord}game_record/app/hkrpg/api/challenge_peak`,
          query: `role_id=${this.uid}&schedule_type=${data.schedule_type || '1'}&server=${this.server}`
        },
        /**使用兑换码 目前仅限国际服,来自于国服的uid请求已在mysInfo.js的init方法提前拦截 */
        useCdk: {
          url: 'https://sg-hkrpg-api.hoyolab.com/common/apicdkey/api/webExchangeCdkeyHyl',
          query: `cdkey=${data.cdk}&game_biz=hkrpg_global&lang=zh-cn&region=${this.server}&t=${new Date().getTime() + ''}&uid=${this.uid}`
        },
        deviceLogin: {
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
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
          sign: {
            url: `${host_nap}event/luna/zzz/sign`,// 国服绝区零签到
            body: { act_id: 'e202406242138391', region: this.server, uid: this.uid, lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host_nap}event/luna/zzz/info`,
            query: `lang=zh-cn&act_id=e202406242138391&region=${this.server}&uid=${this.uid}`,
            types: 'sign'
          },
          sign_home: {
            url: `${host_nap}event/luna/zzz/home`,
            query: 'lang=zh-cn&act_id=e202406242138391',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d805c20d53d',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
          sign: {
            url: `${host_nap}event/luna/zzz/os/sign`,// 国际服绝区零签到
            body: { act_id: 'e202406031448091', lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host_nap}event/luna/zzz/os/info`,
            query: 'lang=zh-cn&act_id=e202406031448091',
            types: 'sign'
          },
          sign_home: {
            url: `${host_nap}event/luna/zzz/os/home`,
            query: 'lang=zh-cn&act_id=e202406031448091',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f4c72b736',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"737","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218355","appUpdateTimeDiff":1740498134990,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-0.6436693x5.510072x8.106883","sdRemain":218227,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"224845","magnetometer":"-46.143753x52.350002x141.54376","display":"${deviceDisplay}","appInstallTimeDiff":1740498134990,"packageVersion":"2.35.0","gyroscope":"0.21242823x0.11484258x-0.09850194","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
        },
        deviceLogin: {
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
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
      wd: {
        ...(['cn_prod_gf01', 'cn_prod_bb01', 'cn_prod_mix01'].includes(this.server) ? {
          UserGame: {
            url: `${host}binding/api/getUserGameRolesByCookie`,
            query: `game_biz=nxx_cn&region=${this.server}&game_uid=${this.uid}`
          },
          sign: {
            url: `${host}event/luna/sign`,// 国服未定签到
            body: { act_id: 'e202202251749321', region: this.server, uid: this.uid, lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/luna/info`,
            query: `lang=zh-cn&act_id=e202202251749321&region=${this.server}&uid=${this.uid}`,
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/luna/home`,
            query: 'lang=zh-cn&act_id=e202202251749321',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d805c20d53d',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
          sign: {
            url: `${host}event/luna/os/sign`,// 国际服未定签到
            body: ['tw_prod_wd01'].includes(this.server) ? { act_id: 'e202308141137581', lang: 'zh-tw' } : { act_id: 'e202202281857121', lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/luna/os/info`,
            query: ['tw_prod_wd01'].includes(this.server) ? 'lang=zh-tw&act_id=e202308141137581' : 'lang=zh-cn&act_id=e202202281857121',
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/luna/os/home`,
            query: ['tw_prod_wd01'].includes(this.server) ? 'lang=zh-tw&act_id=e202308141137581' : 'lang=zh-cn&act_id=e202202281857121',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f4c72b736',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"737","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218355","appUpdateTimeDiff":1740498134990,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-0.6436693x5.510072x8.106883","sdRemain":218227,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"224845","magnetometer":"-46.143753x52.350002x141.54376","display":"${deviceDisplay}","appInstallTimeDiff":1740498134990,"packageVersion":"2.35.0","gyroscope":"0.21242823x0.11484258x-0.09850194","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
              hoyolab_device_id: `${this.uuid}`,
              platform: '2',
              seed_id: `${this.uuid}`,
              seed_time: new Date().getTime() + ''
            }
          }
        }),
        deviceLogin: {
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
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
          sign: {
            url: `${host}event/luna/bh3/sign`,// 国服崩三签到
            body: { act_id: 'e202306201626331', region: this.server, uid: this.uid, lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/luna/bh3/info`,
            query: `lang=zh-cn&act_id=e202306201626331&region=${this.server}&uid=${this.uid}`,
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/luna/bh3/home`,
            query: 'lang=zh-cn&act_id=e202306201626331',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_cn',
              bbs_device_id: `${this.uuid}`,
              device_fp: '38d805c20d53d',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
          sign: {
            url: `${host}event/mani/sign`,// 国际服崩三签到
            body: { act_id: 'e202110291205111', lang: 'zh-cn' },
            types: 'sign'
          },
          sign_info: {
            url: `${host}event/mani/info`,
            query: 'lang=zh-cn&act_id=e202110291205111',
            types: 'sign'
          },
          sign_home: {
            url: `${host}event/mani/home`,
            query: 'lang=zh-cn&act_id=e202110291205111',
            types: 'sign'
          },
          getFp: {
            url: `${hostPublicData}device-fp/api/getFp`,
            body: {
              app_name: 'bbs_oversea',
              device_fp: '38d7f4c72b736',
              device_id: 'cc57c40f763ae4cc',
              ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"737","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218355","appUpdateTimeDiff":1740498134990,"deviceInfo":"${deviceInfo}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"app_set_id":"${this.uuid}","chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","adid":"${this.uuid}","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-0.6436693x5.510072x8.106883","sdRemain":218227,"buildTags":"release-keys","packageName":"com.mihoyo.hoyolab","networkType":"WiFi","debugStatus":1,"ramCapacity":"224845","magnetometer":"-46.143753x52.350002x141.54376","display":"${deviceDisplay}","appInstallTimeDiff":1740498134990,"packageVersion":"2.35.0","gyroscope":"0.21242823x0.11484258x-0.09850194","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
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
        },
        deviceLogin: {
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
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
      bh2: {
        bh2_cn: {
          url: 'https://api-takumi.mihoyo.com/binding/api/getUserGameRolesByCookie',
          query: 'game_biz=bh2_cn'
        },
        UserGame: {
          url: `${host}binding/api/getUserGameRolesByCookie`,
          query: `game_biz=bh2_cn&region=${this.server}&game_uid=${this.uid}`
        },
        sign: {
          url: `${host}event/luna/sign`,// 国服崩二签到
          body: { act_id: 'e202203291431091', region: this.server, uid: this.uid, lang: 'zh-cn' },
          types: 'sign'
        },
        sign_info: {
          url: `${host}event/luna/info`,
          query: `lang=zh-cn&act_id=e202203291431091&region=${this.server}&uid=${this.uid}`,
          types: 'sign'
        },
        sign_home: {
          url: `${host}event/luna/home`,
          query: 'lang=zh-cn&act_id=e202203291431091',
          types: 'sign'
        },
        getFp: {
          url: `${hostPublicData}device-fp/api/getFp`,
          body: {
            app_name: 'bbs_cn',
            bbs_device_id: `${this.uuid}`,
            device_fp: '38d805c20d53d',
            device_id: 'cc57c40f763ae4cc',
            ext_fields: `{"proxyStatus":1,"isRoot":0,"romCapacity":"768","deviceName":"${modelName}","productName":"${productName}","romRemain":"727","hostname":"BuildHost","screenSize":"1096x2434","isTablet":0,"aaid":"${this.uuid}","model":"${modelName}","brand":"${deviceBrand}","hardware":"qcom","deviceType":"${deviceType}","devId":"REL","serialNumber":"unknown","sdCapacity":224845,"buildTime":"1692775759000","buildUser":"BuildUser","simState":1,"ramRemain":"218344","appUpdateTimeDiff":1740498108042,"deviceInfo":"${deviceInfo}","vaid":"${this.uuid}","buildType":"user","sdkVersion":"33","ui_mode":"UI_MODE_TYPE_NORMAL","isMockLocation":0,"cpuType":"arm64-v8a","isAirMode":0,"ringMode":2,"chargeStatus":1,"manufacturer":"${deviceBrand}","emulatorStatus":0,"appMemory":"768","osVersion":"${osVersion}","vendor":"unknown","accelerometer":"-1.588236x6.8404818x6.999604","sdRemain":218214,"buildTags":"release-keys","packageName":"com.mihoyo.hyperion","networkType":"WiFi","oaid":"${oaid}","debugStatus":1,"ramCapacity":"224845","magnetometer":"-47.04375x51.3375x137.96251","display":"${deviceDisplay}","appInstallTimeDiff":1740498108042,"packageVersion":"2.35.0","gyroscope":"-0.22601996x-0.09453133x0.09040799","batteryStatus":88,"hasKeyboard":0,"board":"${board}"}`,
            platform: '2',
            seed_id: `${this.uuid}`,
            seed_time: new Date().getTime() + ''
          }
        },
        deviceLogin: {
          url: `${bbs_api}apihub/api/deviceLogin`,
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
          url: `${bbs_api}apihub/api/saveDevice`,
          body: {
            app_version: '2.73.1',
            device_id: data.deviceId,
            device_name: `${deviceBrand}${modelName}`,
            os_version: '33',
            platform: 'Android',
            registration_id: this.generateSeed(19)
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
