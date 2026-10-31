import base from './base.js'
import MysInfo from './mys/mysInfo.js'
import MysApi from './mys/mysApi.js'
import lodash from 'lodash'
import moment from 'moment'
import fs from 'node:fs'
import common from '../../../lib/common/common.js'

const DATA_DIR = './data/ZZZ_NoteData'

/** 调频道具名称 */
const TICKET_NAME = {
  GACHA_TICKET_TYPE_RECHARGE_MONOCHROME: '菲林底片',
  GACHA_TICKET_TYPE_POLYCHROME: '菲林',
  GACHA_TICKET_TYPE_ENCRYPTED_MASTER_TAPE: '加密母带',
  GACHA_TICKET_TYPE_MASTER_TAPE: '原装母带',
  GACHA_TICKET_TYPE_BOOPON: '邦布券'
}

/**
 * 绝区零绳网月报（菲林）查询
 * 数据查询方式与 model/ledger.js 保持一致：
 * 当前月用 MysInfo.get 查询，历史三个月用 MysApi 自动保存，
 * 统计页读取本地保存的 NoteData 数据。
 */
export default class LedgerZzz extends base {
  constructor(e) {
    super(e)
    this.e = e
    this.model = 'ledgerZzz'
    this.e.game = 'zzz'

    this.actionColor = {
      event_rewards: '#FFDE00',
      daily_activity_rewards: '#5CC83D',
      shiyu_rewards: '#2FA3FF',
      mail_rewards: '#C92ADE',
      growth_rewards: '#A2D104',
      hollow_rewards: '#FF4483',
      other_rewards: '#F1AD3D'
    }
    this.actionOrder = [
      'event_rewards',
      'daily_activity_rewards',
      'shiyu_rewards',
      'mail_rewards',
      'growth_rewards',
      'hollow_rewards',
      'other_rewards'
    ]
  }

  /** 菲林月报 */
  async get() {
    this.getMonth()
    if (!this.month) return false

    let res = await MysInfo.get(this.e, 'ledger', { month: this.month })
    if (!res || res.retcode !== 0) return false

    this.e.nowData = res.data
    let data = this.dealData(res.data)
    data.tickets = await this.getTickets()

    await this.saveLedger(this.e.uid)

    return data
  }

  /** 解析查询月份，仅支持最近三个月 */
  getMonth() {
    let now = moment()
    let month = this.parseMonth(this.e.msg || '', now)

    let months = [0, 1, 2].map((i) => moment().subtract(i, 'month').format('YYYYMM'))
    if (!months.includes(month)) {
      this.e.reply('菲林月报仅支持查询最近三个月的数据')
      return false
    }
    this.month = month
  }

  parseMonth(msg = '', now = moment()) {
    let raw = msg.replace(/[#＃]/g, '').replace(/绝区零|菲林|月报|统计/g, '').trim()
    let pad = (num) => String(Number(num)).padStart(2, '0')

    let match = raw.match(/(\d{4})\s*年\s*(\d{1,2})\s*月?/)
    if (match) return `${match[1]}${pad(match[2])}`

    match = raw.match(/(\d{4})(\d{2})/)
    if (match) return `${match[1]}${match[2]}`

    match = raw.match(/(\d{1,2})\s*月/)
    if (match) return `${now.format('YYYY')}${pad(match[1])}`

    match = raw.match(/^(\d{1,2})$/)
    if (match) return `${now.format('YYYY')}${pad(match[1])}`

    match = raw.match(/[一二两三四五六七八九十]+/)
    if (match) {
      let num = this.cnMonth(match[0])
      if (num) return `${now.format('YYYY')}${pad(num)}`
    }

    return now.format('YYYYMM')
  }

  cnMonth(text = '') {
    let cn = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
    let idx = cn.indexOf(text)
    return idx >= 0 ? idx + 1 : 0
  }

  /** 用户头像，优先使用QQ头像 */
  getAvatar(data = {}) {
    let e = this.e || {}
    let userId = e?.user_id
    let avatar = [e?.sender?.avatar, e?.member?.avatar, e?.friend?.avatar].find((item) => {
      return typeof item === 'string' && item
    })
    if (!avatar && userId && /^\d{5,12}$/.test(String(userId))) {
      avatar = `https://q1.qlogo.cn/g?b=qq&nk=${userId}&s=640`
    }
    return avatar || data?.role_info?.avatar || ''
  }

  /** 处理月报数据 */
  dealData(data = {}) {
    let list = data?.month_data?.list || []
    let getCount = (type) => Number(list.find((item) => item.data_type === type)?.count || 0)

    let cards = {
      polychromes: getCount('PolychromesData'),
      tape: getCount('MatserTapeData'),
      boopons: getCount('BooponsData')
    }

    let componentsRaw = data?.month_data?.income_components || []
    let components = this.actionOrder
      .map((key) => {
        let item = componentsRaw.find((v) => v.action === key)
        if (!item) return null
        return {
          name: this.mapActionName(item.action),
          percent: Number(item.percent || 0),
          num: Number(item.num || 0),
          color: this.actionColor[item.action]
        }
      })
      .filter(Boolean)

    let dataMonth = String(data?.data_month || '')
    let monthText = dataMonth ? `${Number(dataMonth.slice(-2))}月` : ''

    let week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

    return {
      ...this.screenData,
      saveId: this.e.uid,
      uid: data?.uid || this.e.uid,
      nickname: data?.role_info?.nickname || '',
      avatar: this.getAvatar(data),
      level: data?.role_info?.level || '',
      server: data?.role_info?.region_name || data?.role_info?.server_name || '',
      month: dataMonth,
      monthText,
      cards,
      components,
      tickets: [],
      pluginName: false,
      nowDay: moment().format('YYYY年MM月DD日'),
      srday: week[moment().day()]
    }
  }

  mapActionName(key) {
    let map = {
      event_rewards: '活动奖励',
      daily_activity_rewards: '日常活跃奖励',
      hollow_rewards: '零号空洞奖励',
      mail_rewards: '邮件奖励',
      other_rewards: '其他奖励',
      shiyu_rewards: '深渊奖励',
      growth_rewards: '成长奖励'
    }
    return map[key] || key
  }

  /** 查询当前调频道具（母带等） */
  async getTickets() {
    let res = await MysInfo.get(this.e, 'tickets')
    if (!res || res.retcode !== 0 || !Array.isArray(res.data?.tickets)) return []

    return res.data.tickets.map((item) => ({
      ticket_type: TICKET_NAME[item.ticket_type] || item.ticket_type,
      ticket_cnt: Number(item.ticket_cnt || 0)
    }))
  }

  /** 保存最近三个月数据 */
  async saveLedger(uid, ck = '', isTask = false) {
    if (!uid) return false

    if (!ck) {
      ck = await MysInfo.checkUidBing(uid, 'zzz')
    }
    if (!ck || lodash.isEmpty(ck)) return false

    let dataPath = `${DATA_DIR}/${uid}.json`
    let NoteData = {}
    if (fs.existsSync(dataPath)) {
      try {
        NoteData = JSON.parse(fs.readFileSync(dataPath, 'utf8')) || {}
      } catch (error) {
        NoteData = {}
      }
    }

    let NowYear = Number(moment().year())
    let NowMonth = Number(moment().month()) + 1
    let monthArr = [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].splice(NowMonth - 1, 3)

    for (let month of monthArr) {
      let year = NowYear
      if (NowMonth <= 2 && month >= 11) year--

      if (!NoteData[year]) NoteData[year] = {}

      if (NoteData[year][month] && NowMonth != month && NoteData[year][month].isUpdate) continue

      let ym = `${year}${String(month).padStart(2, '0')}`
      let ledgerInfo
      if (this.e.nowData && String(this.e.nowData?.data_month) === ym) {
        ledgerInfo = this.e.nowData
      } else {
        ledgerInfo = await this.zzzLedger(uid, ck, ym, isTask)
        if (!ledgerInfo) continue
      }

      if (NowMonth != month) ledgerInfo.isUpdate = true
      NoteData[year][month] = ledgerInfo
      await common.sleep(100)
    }

    try {
      fs.mkdirSync(DATA_DIR, { recursive: true })
      fs.writeFileSync(dataPath, JSON.stringify(NoteData, '', '\t'))
    } catch (error) {
      logger.error(`[菲林月报]保存数据失败：${error.message}`)
      return false
    }

    logger.mark(`[菲林月报][自动保存] uid:${uid} 数据已保存`)
    return NoteData
  }

  /** 查询指定月份数据（任务模式复用 ck） */
  async zzzLedger(uid, ck, month, isTask = false) {
    let ledgerInfo = {}
    if (isTask) {
      let mysApi = new MysApi(uid, ck.ck, { log: false }, '', '', 'zzz')
      ledgerInfo = await mysApi.getData('ledger', { month })
      ledgerInfo = await new MysInfo(this.e).checkCode(ledgerInfo, 'ledger', mysApi, { month }, isTask)
    } else {
      ledgerInfo = await MysInfo.get(this.e, 'ledger', { month })
    }

    if (!ledgerInfo || ledgerInfo.retcode != 0) return false
    return ledgerInfo.data
  }

  /** 菲林统计 */
  async ledgerCount() {
    this.model = 'ledgerZzzCount'

    let mysInfo = await MysInfo.init(this.e, 'ledger')
    let uid = mysInfo?.uid
    if (!uid) return false

    let NoteData = await this.saveLedger(uid)
    if (!NoteData) return false

    let list = []
    let monthCount = 0
    for (let year of Object.keys(NoteData)) {
      monthCount += Object.keys(NoteData[year] || {}).length
    }
    for (let i = 0; i < 12; i++) {
      let m = Number(moment().month()) + 1 - i
      let y = Number(moment().year())
      if (m <= 0) {
        m = 12 + m
        y--
      }
      if (NoteData[y] && NoteData[y][m]) {
        list.push(NoteData[y][m])
      }
    }
    if (list.length === 0) {
      this.e.reply(['暂无菲林数据，请先发送 %菲林', segment.button([
        { text: '菲林月报', callback: '%菲林' }
      ])], false, { at: true })
      return false
    }

    let tickets = await this.getTickets()
    return this.ledgerCountData(list, '', tickets, monthCount >= 12)
  }

  /** 今年/去年/指定年份菲林统计 */
  async ledgerCountHistory() {
    let nowYear
    if (this.e.msg.includes('去年')) {
      nowYear = moment().year() - 1
    } else if (this.e.msg.includes('今年')) {
      nowYear = moment().year()
    } else {
      let match = this.e.msg.match(/(\d{4})/)
      nowYear = match ? match[1] : ''
    }
    if (nowYear) nowYear = parseInt(nowYear)
    if (!nowYear) nowYear = moment().year()

    this.model = 'ledgerZzzCount'

    let mysInfo = await MysInfo.init(this.e, 'ledger')
    let uid = mysInfo?.uid
    if (!uid) return false

    let dataPath = `${DATA_DIR}/${uid}.json`
    let NoteData = {}
    if (fs.existsSync(dataPath)) {
      try {
        NoteData = JSON.parse(fs.readFileSync(dataPath, 'utf8')) || {}
      } catch (error) {
        NoteData = {}
      }
    }

    if (!NoteData || lodash.isEmpty(NoteData)) {
      this.e.reply(['暂无菲林数据，请先发送 %菲林', segment.button([
        { text: '菲林月报', callback: '%菲林' }
      ])], false, { at: true })
      return false
    }

    let yearData = NoteData[nowYear]
    if (!yearData) {
      this.e.reply(`UID：${uid} ${nowYear}年无菲林统计数据！`, false, { at: true })
      return false
    }

    let list = lodash.map(yearData, (val) => val)
    if (list.length === 0) return false

    let tickets = await this.getTickets()
    return this.ledgerCountData(list, `${nowYear}年`, tickets)
  }

  /** 统计数据转渲染数据 */
  ledgerCountData(NoteData = [], yearText = '', tickets = [], hasMore = false) {
    let merge = {}
    let primogemsMonth = []
    let allBoopons = 0

    NoteData.forEach((data) => {
      let components = data?.month_data?.income_components || []
      components.forEach((item) => {
        let key = this.mapActionName(item.action)
        if (!merge[key]) {
          merge[key] = {
            action: key,
            color: this.actionColor[item.action],
            num: 0
          }
        }
        merge[key].num += Number(item.num || 0)
      })

      let list = data?.month_data?.list || []
      let polychromes = Number(list.find((item) => item.data_type === 'PolychromesData')?.count || 0)
      let boopons = Number(list.find((item) => item.data_type === 'BooponsData')?.count || 0)
      allBoopons += boopons

      let dataMonth = String(data?.data_month || '')
      primogemsMonth.push({
        value: polychromes,
        month: String(Number(dataMonth.slice(4)) || ''),
        year: dataMonth.slice(0, 4),
        name: '菲林'
      })
    })

    let groupBy = this.actionOrder
      .map((key) => {
        let name = this.mapActionName(key)
        let found = lodash.find(Object.values(merge), (item) => item.action === name)
        return found || null
      })
      .filter(Boolean)
    groupBy = lodash.orderBy(groupBy, ['num'], ['desc'])

    primogemsMonth = lodash.sortBy(primogemsMonth, (item) => {
      return Number(item.year) * 100 + Number(item.month)
    })

    let allPrimogems = primogemsMonth.reduce((sum, item) => sum + Number(item.value || 0), 0)
    let maxPrimogems = primogemsMonth.length
      ? primogemsMonth.reduce((a, b) => (a.value > b.value ? a : b))
      : { month: '-', value: '-' }

    let first = NoteData[NoteData.length - 1]?.data_month
    let last = NoteData[0]?.data_month
    if (!yearText && first && last) yearText = `${first}-${last}`

    /** 统计页头部随机世界卡 */
    let headImg = `${this._path}/plugins/genshin/resources/ZZZero/img/other/banner.png`
    try {
      let worldcardDir = `${this._path}/plugins/genshin/resources/ZZZero/img/worldcard`
      let files = fs.readdirSync(worldcardDir).filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
      if (files.length > 0) headImg = `${worldcardDir}/${lodash.sample(files)}`
    } catch (error) {
    }

    return {
      ...this.screenData,
      saveId: this.e.uid,
      uid: this.e.uid,
      yearText,
      headImg,
      allPrimogemsShow: allPrimogems.toString(),
      allGacha: Math.floor(allPrimogems / 160),
      maxPrimogems,
      allMora: allBoopons.toFixed(0) + '张',
      maxMora: { month: '-' },
      group_by: groupBy,
      primogemsMonth: JSON.stringify(primogemsMonth),
      color: JSON.stringify(groupBy.map((item) => item.color)),
      pieData: JSON.stringify(groupBy),
      hasMore,
      tickets,
      pluginName: false
    }
  }
}
