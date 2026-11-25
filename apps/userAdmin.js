import plugin from '../../../lib/plugins/plugin.js'
import fs from 'node:fs'
import YAML from 'yaml'
import common from '../../../lib/common/common.js'
import User from '../model/user.js'
import GsCfg from '../model/gsCfg.js'
import MysInfo from '../model/mys/mysInfo.js'
import MysUser from '../model/mys/MysUser.js'
import { MysUserDB, UserDB } from '../model/db/index.js'
import { getGeetestStats } from '../model/GeetestStats.js'

/** 解析 Cookie 字符串为键值对（兼容 token 值内包含 =） */
function parseCookie(ck = '') {
  const param = {}
  String(ck || '').replace(/#|'|"/g, '').split(';').forEach((item) => {
    const tmp = item.trim()
    if (!tmp) return
    const idx = tmp.indexOf('=')
    if (idx > -1) {
      const k = tmp.slice(0, idx).trim()
      const v = tmp.slice(idx + 1).trim()
      if (k && v) param[k] = v
    }
  })
  return param
}

/** 判定并规范化旧格式 CK：v2 清洗为纯 v2，纯 v1 保留原字段并补齐 ltuid_v2 */
function normalizeLegacyCk(rawCk, fallbackLtuid = '') {
  const param = parseCookie(rawCk)
  const hasV1Key = Boolean(param.ltoken || param.ltuid || param.cookie_token || param.account_id)

  const ltokenV2 = param.ltoken_v2 || (/^v2_/i.test(param.ltoken || '') ? param.ltoken : '')
  const cookieTokenV2 = param.cookie_token_v2 || (/^v2_/i.test(param.cookie_token || '') ? param.cookie_token : '')
  const midV2 = param.account_mid_v2 || param.ltmid_v2 || ''
  const ltuidV2 = [
    param.ltuid_v2,
    param.account_id_v2,
    param.ltuid,
    param.account_id,
    String(fallbackLtuid || '')
  ].find((v) => /^\d{4,10}$/.test(String(v || ''))) || ''

  // 纯 v1 分支：保留原有 v1 字段，补齐 ltuid_v2 兼容查询
  if (!ltokenV2) {
    if (!param.ltoken || !ltuidV2) {
      return {
        status: 'incomplete',
        ltuid: ltuidV2,
        reason: !param.ltoken ? '缺少ltoken/ltoken_v2' : '缺少有效数字ltuid'
      }
    }
    if (param.ltuid_v2 === ltuidV2) {
      return { status: 'v1_clean', ck: rawCk, ltuid: ltuidV2 }
    }
    const base = String(rawCk || '')
      .trim()
      .replace(/(?:^|;)\s*ltuid_v2=[^;]*/g, '')
      .replace(/^;+|;+$/g, '')
    return {
      status: 'v1_repaired',
      ck: `${base};ltuid_v2=${ltuidV2};`,
      ltuid: ltuidV2
    }
  }

  // v2 分支
  if (!midV2 || !ltuidV2) {
    return {
      status: 'incomplete',
      ltuid: ltuidV2,
      reason: !midV2 ? '缺少ltmid_v2/account_mid_v2' : '缺少有效数字ltuid_v2'
    }
  }

  const alreadyClean = !hasV1Key && Boolean(
    param.ltoken_v2
    && param.ltuid_v2 === ltuidV2
    && param.account_id_v2
    && param.ltmid_v2
    && param.account_mid_v2
  )
  if (alreadyClean) {
    return { status: 'v2_clean', ck: rawCk, ltuid: ltuidV2 }
  }

  const parts = [
    `ltuid_v2=${ltuidV2}`,
    `account_id_v2=${ltuidV2}`,
    ...(cookieTokenV2 ? [`cookie_token_v2=${cookieTokenV2}`] : []),
    `ltoken_v2=${ltokenV2}`,
    `ltmid_v2=${midV2}`,
    `account_mid_v2=${midV2}`
  ]
  if (param.mi18nLang) {
    parts.push(`mi18nLang=${param.mi18nLang}`)
  }

  return {
    status: 'v2_repaired',
    ck: `${parts.join(';')};`,
    ltuid: ltuidV2
  }
}

export class user extends plugin {
  constructor (e) {
    super({
      name: '用户管理',
      dsc: 'CK用户管理',
      event: 'message',
      priority: 300,
      rule: [{
        reg: '^#用户统计$',
        fnc: 'userAdmin',
        permission: "master",
      }, {
        reg: '^#过码统计(?:\\s*[1-9]\\d*)?$',
        fnc: 'geetestStats',
        permission: 'master'
      }, {
        reg: '^#(刷新|重置)用户(缓存|统计|ck|Ck|CK)$',
        fnc: 'resetCache',
        permission: "master",
      }, {
        reg: '^#删除(无效|失效)(用户|ck|Ck|CK)$',
        fnc: 'delDisable',
        permission: "master",
      }, {
        reg: '^#?修复旧c(oo)?k(ie)?$',
        fnc: 'repairOldCk',
        permission: "master",
      }]
    })
    this.User = new User(e)
    this.button = segment.button([
      { text: "用户统计", callback: "#用户统计" },
      { text: "删除无效", callback: "#删除无效用户" },
    ],[
      { text: "刷新统计", callback: "#刷新用户统计" },
      { text: "重置统计", callback: "#重置用户统计" },
    ])
  }

  /** #用户统计$ */
  async userAdmin () {
    let data = await new User(this.e).userAdmin()
    if (!data) return true

    /** 生成图片 */
    this.reply([await this.renderImg('genshin', 'html/admin/userAdmin', data, { retType: "base64" }), this.button])
  }

  /** #过码统计 [页码] */
  async geetestStats () {
    const page = Number(this.e.msg.replace('#过码统计', '').trim()) || 1
    let data
    try {
      data = await getGeetestStats(page)
    } catch {
      return this.reply('读取过码统计失败，请稍后再试')
    }
    return this.reply(await this.renderImg('genshin', 'html/admin/geetestStats', data, { retType: 'base64' }))
  }

  /** #刷新用户缓存 / #重置用户缓存 */
  async resetCache () {
    // 清空老数据
    const clearData = /重置/.test(this.e.msg)
    await MysInfo.initCache(true, clearData)
    this.reply([`用户缓存已${clearData ? '重置' : '刷新'}...\n通过【#用户统计】命令可查看详情`, this.button])
  }

  async delDisable () {
    let count = await MysInfo.delDisable()
    this.reply([count > 0 ? `已删除${count}个无效用户` : '暂无无效用户...', this.button])
  }

  /** #修复旧ck：规范化旧 v2 记录，并为所有纯 v1 记录补齐 ltuid_v2 兼容查询 */
  async repairOldCk () {
    // 1. 建立 ltuid -> QQ[] 反查表，便于输出受影响用户
    const ltuidToQqs = new Map()
    const userRows = await UserDB.findAll()
    for (const u of userRows) {
      const ltuids = String(u.ltuids || '').split(',').map(v => v.trim()).filter(Boolean)
      for (const ltuid of ltuids) {
        if (!ltuidToQqs.has(ltuid)) ltuidToQqs.set(ltuid, [])
        ltuidToQqs.get(ltuid).push(u.id)
      }
    }

    // 2. 扫描并修复数据库 MysUsers 表
    const mysRows = await MysUserDB.findAll()
    let dbV2Clean = 0
    let dbV2Repaired = 0
    let dbV1Clean = 0
    let dbV1Repaired = 0
    const dbV1List = []
    const dbIncompleteList = []

    for (const row of mysRows) {
      if (!row.ck) continue
      const ltuidKey = String(row.ltuid)
      const ret = normalizeLegacyCk(row.ck, ltuidKey)
      const qqs = ltuidToQqs.get(ltuidKey)?.join('/') || '未关联QQ'
      const uidsText = Object.entries(row.uids || {})
        .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
        .map(([g, arr]) => `${g}:${arr.join(',')}`)
        .join(' | ') || '无UID'

      if (ret.status === 'v2_clean') {
        dbV2Clean++
      } else if (ret.status === 'v1_clean') {
        dbV1Clean++
        dbV1List.push(`QQ:${qqs} | ltuid:${ltuidKey} | ${uidsText} (已兼容)`)
      } else if (ret.status === 'v2_repaired' || ret.status === 'v1_repaired') {
        row.ck = ret.ck
        await row.save()
        // 同步刷新 MysUser 内存实例缓存
        const mys = await MysUser.create(row.ltuid, row)
        if (mys) mys.setCkData({ ck: ret.ck })

        if (ret.status === 'v2_repaired') {
          dbV2Repaired++
          logger.mark(`[修复旧ck] 数据库v2已规范化 ltuid:${ltuidKey}`)
        } else {
          dbV1Repaired++
          dbV1List.push(`QQ:${qqs} | ltuid:${ltuidKey} | ${uidsText} (新补齐ltuid_v2)`)
          logger.mark(`[修复旧ck] 数据库纯v1已补齐ltuid_v2 ltuid:${ltuidKey}`)
        }
      } else {
        dbIncompleteList.push(`QQ:${qqs} | ltuid:${ltuidKey} | ${uidsText} (${ret.reason})`)
      }
    }

    // 3. 扫描并修复公共 CK（config/mys.pubCk.yaml）
    const pubCkFile = './plugins/genshin/config/mys.pubCk.yaml'
    let pubTotal = 0
    let pubV2Clean = 0
    let pubV2Repaired = 0
    let pubV1Clean = 0
    let pubV1Repaired = 0
    const pubV1List = []
    const pubIncompleteList = []

    if (fs.existsSync(pubCkFile)) {
      const pubCks = GsCfg.getConfig('mys', 'pubCk')
      if (Array.isArray(pubCks) && pubCks.length > 0) {
        pubTotal = pubCks.length
        const updatedPubCks = []
        for (let idx = 0; idx < pubCks.length; idx++) {
          const rawCk = pubCks[idx]
          const ret = normalizeLegacyCk(rawCk)
          if (ret.status === 'v2_clean') {
            pubV2Clean++
            updatedPubCks.push(rawCk)
          } else if (ret.status === 'v1_clean') {
            pubV1Clean++
            updatedPubCks.push(rawCk)
            pubV1List.push(`公共CK第${idx + 1}条 | ltuid:${ret.ltuid} (已兼容)`)
          } else if (ret.status === 'v2_repaired' || ret.status === 'v1_repaired') {
            updatedPubCks.push(ret.ck)
            if (ret.status === 'v2_repaired') {
              pubV2Repaired++
              logger.mark(`[修复旧ck] 公共CK第${idx + 1}条v2已修复 ltuid_v2:${ret.ltuid}`)
            } else {
              pubV1Repaired++
              pubV1List.push(`公共CK第${idx + 1}条 | ltuid:${ret.ltuid} (新补齐ltuid_v2)`)
              logger.mark(`[修复旧ck] 公共CK第${idx + 1}条纯v1已补齐ltuid_v2:${ret.ltuid}`)
            }
          } else {
            updatedPubCks.push(rawCk)
            pubIncompleteList.push(`公共CK第${idx + 1}条 | ltuid:${ret.ltuid || '未知'} (${ret.reason})`)
          }
        }
        if (pubV2Repaired + pubV1Repaired > 0) {
          fs.writeFileSync(pubCkFile, YAML.stringify(updatedPubCks), 'utf8')
        }
      }
    }

    // 4. 如有修复项，刷新缓存使之立即生效
    if (pubV2Repaired + pubV1Repaired > 0) {
      await GsCfg.change_myspubCk()
    } else if (dbV2Repaired + dbV1Repaired > 0) {
      await MysInfo.initCache(true)
    }

    // 5. 输出汇总与名单
    const summary = [
      '【旧CK检测与修复完成】',
      `用户库(共${mysRows.length}条)：`,
      `  v2正常 ${dbV2Clean} | v2已规范化 ${dbV2Repaired}`,
      `  纯v1已兼容 ${dbV1Clean} | 纯v1新补齐ltuid_v2 ${dbV1Repaired}`,
      `  缺字段无法修复 ${dbIncompleteList.length}`,
      `公共池(共${pubTotal}条)：`,
      `  v2正常 ${pubV2Clean} | v2已规范化 ${pubV2Repaired}`,
      `  纯v1已兼容 ${pubV1Clean} | 纯v1新补齐ltuid_v2 ${pubV1Repaired}`,
      `  缺字段无法修复 ${pubIncompleteList.length}`
    ]

    const detailLines = []
    if (dbV1List.length > 0) {
      detailLines.push('--- 数据库纯 v1 名单（已保留并兼容 ltuid_v2，可自行决定是否清理）---')
      detailLines.push(...dbV1List)
    }
    if (dbIncompleteList.length > 0) {
      detailLines.push('--- 数据库缺字段名单（未修改，需用户重绑或手动清理）---')
      detailLines.push(...dbIncompleteList)
    }
    if (pubV1List.length > 0) {
      detailLines.push('--- 公共池纯 v1 名单（已保留并兼容 ltuid_v2，位于 config/mys.pubCk.yaml）---')
      detailLines.push(...pubV1List)
    }
    if (pubIncompleteList.length > 0) {
      detailLines.push('--- 公共池缺字段名单（未修改，位于 config/mys.pubCk.yaml）---')
      detailLines.push(...pubIncompleteList)
    }

    if (detailLines.length === 0) {
      summary.push('\n所有存量 CK 均为规范纯 v2，无纯 v1 或异常残留。')
      return this.reply(summary.join('\n'))
    }

    // 完整名单同步输出到控制台日志，防止聊天窗口折叠或超长
    logger.mark(`[修复旧ck] 纯v1及异常名单：\n${detailLines.join('\n')}`)

    const isQQBot = this.e?.bot?.version?.name === 'QQBot'
    if (detailLines.length <= 20 || isQQBot) {
      summary.push('')
      summary.push(...detailLines.slice(0, 25))
      if (detailLines.length > 25) {
        summary.push(`...其余 ${detailLines.length - 25} 条已打印至控制台日志`)
      }
      return this.reply(summary.join('\n'))
    }

    await this.reply(summary.join('\n'))
    try {
      const forward = await common.makeForwardMsg(this.e, [detailLines.join('\n')], '纯v1及异常CK名单')
      return this.reply(forward)
    } catch {
      return this.reply(`${detailLines.slice(0, 25).join('\n')}\n...完整名单已打印至控制台日志`)
    }
  }
}