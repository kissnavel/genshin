const prefix = 'genshin:geetest:stats:v1'
const games = {
  gs: '原神', sr: '星穹铁道', zzz: '绝区零', bh3: '崩坏3', bh2: '崩坏学园2',
  wd: '未定事件簿', dby: '大别野', hna: '因缘精灵', planet: '星布谷地', other: '其他'
}
const pageSize = 24
const dayRetention = 7 * 86400
const monthRetention = 32 * 86400

function dayKey (now = new Date()) {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

function keys (game, day) {
  return [`${prefix}:${game}:month:${day.slice(0, 7)}`, `${prefix}:${game}:${day}`]
}

function getLtuid (cookie) {
  const params = new Map(String(cookie || '').split(';').map(part => {
    const i = part.indexOf('=')
    return i < 0 ? [] : [part.slice(0, i).trim(), part.slice(i + 1).trim()]
  }).filter(part => part.length))
  return ['ltuid_v2', 'ltuid', 'account_id_v2', 'account_id', 'stuid']
    .map(key => params.get(key)).find(value => /^\d+$/.test(value || ''))
}

/** 一次验证码流程记一次；内部轮询及手动兜底不单独计数。 */
export async function trackGeetest (api, run, game = api?.game) {
  const ltuid = getLtuid(api?.cookie)
  if (!ltuid) return await run(() => {})
  const [monthKey, todayKey] = keys(Object.hasOwn(games, game) ? game : 'other', dayKey())
  let success = false
  try {
    return await run(() => { success = true })
  } finally {
    const field = `${ltuid}:${success ? 'success' : 'fail'}`
    try {
      await redis.multi()
        .hIncrBy(monthKey, field, 1)
        .expire(monthKey, monthRetention)
        .hIncrBy(todayKey, field, 1)
        .expire(todayKey, dayRetention)
        .exec()
    } catch {
      logger.warn('[genshin] 过码统计写入失败')
    }
  }
}

const empty = () => ({ success: 0, fail: 0, total: 0 })

function add (counts, outcome, value) {
  counts[outcome] += value
  counts.total += value
}

export async function getGeetestStats (requestedPage = 1, now = new Date()) {
  const day = dayKey(now)
  const query = redis.multi()
  for (const game of Object.keys(games)) {
    for (const key of keys(game, day)) query.hGetAll(key)
  }
  const hashes = await query.exec()
  const today = empty()
  const month = empty()
  const sections = Object.entries(games).map(([game, name], i) => {
    const rows = new Map()
    const section = { game, name, today: empty(), month: empty() }
    for (const [period, fields, summary] of [['month', hashes[i * 2], month], ['today', hashes[i * 2 + 1], today]]) {
      for (const [field, raw] of Object.entries(fields || {})) {
        const match = /^(\d+):(success|fail)$/.exec(field)
        const value = Number(raw)
        if (!match || !Number.isSafeInteger(value) || value <= 0) continue
        const [, ltuid, outcome] = match
        if (!rows.has(ltuid)) rows.set(ltuid, { ltuid, today: empty(), month: empty() })
        add(rows.get(ltuid)[period], outcome, value)
        add(section[period], outcome, value)
        add(summary, outcome, value)
      }
    }
    section.rows = [...rows.values()].sort((a, b) => b.today.total - a.today.total || b.month.total - a.month.total || a.ltuid.localeCompare(b.ltuid))
    return section
  }).filter(section => section.rows.length)
  const pages = Math.max(1, ...sections.map(section => Math.ceil(section.rows.length / pageSize)))
  const page = Math.min(pages, Math.max(1, Math.trunc(requestedPage) || 1))
  const offset = (page - 1) * pageSize
  for (const section of sections) {
    section.userCount = section.rows.length
    section.rows = section.rows.slice(offset, offset + pageSize)
  }
  return { day, today, month, sections, page, pages }
}
