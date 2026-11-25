import { sendWithTimeout } from './PushSend.js'

const asList = value => Array.isArray(value) ? value : value == null ? [] : [value]
const textId = value => String(value ?? '').trim()

function usableId (id) {
  return Boolean(id) && id !== 'stdin'
}

function findKey (list, id) {
  if (list?.has?.(id)) return id
  // 只转换可无损表示的数字 ID，不转换 OpenID 或超长数字串。
  const numeric = Number(id)
  if (Number.isSafeInteger(numeric) && String(numeric) === id && list?.has?.(numeric)) return numeric
}

function available (account) {
  if (!account || account.online === false) return false
  const state = account.ws?.readyState ?? account.sdk?.ws?.readyState
  return typeof state !== 'number' || state === 1
}

function accounts (bot, multiple) {
  if (!bot) return []
  if (multiple) {
    return bot.uin.map(id => [textId(id), bot.bots?.[id] ?? Object.getOwnPropertyDescriptor(bot, id)?.value])
      .filter(([id, account]) => usableId(id) && account)
  }
  const id = textId(bot.uin || bot.self_id)
  return id === 'stdin' ? [] : [[id, bot]]
}

function findFriend (account, userId) {
  const friend = findKey(account.fl, userId)
  if (friend !== undefined) return friend
  for (const members of account.gml?.values?.() || []) {
    const member = findKey(members, userId)
    if (member !== undefined) return member
  }
}

function scopedKeys (account, botId, id) {
  if (!botId) return [id]
  const separators = [...new Set([account?.adapter?.sep || ':', ':'])]
  const prefixSep = separators.find(sep => id.startsWith(`${botId}${sep}`))
  const bare = prefixSep ? id.slice(botId.length + prefixSep.length) : id
  if (!bare) return []
  return [...new Set([id, bare, ...separators.map(sep => `${botId}${sep}${bare}`)])]
}

function groupKey (account, botId, id) {
  for (const key of scopedKeys(account, botId, id)) {
    const match = findKey(account.gl, key)
    if (match !== undefined) return match
  }
}

// 订阅已有独立的机器人和群字段，不重新拆分群 ID，也不跨账号查找。
export function resolveBoundGroup (botId, groupId, bot = globalThis.Bot) {
  botId = textId(botId)
  groupId = textId(groupId)
  if (!usableId(botId) || !groupId || !bot) return
  const multiple = Array.isArray(bot.uin)
  const account = multiple
    ? accounts(bot, true).find(([id]) => id === botId)?.[1]
    : Object.getOwnPropertyDescriptor(bot, botId)?.value ?? (textId(bot.uin || bot.self_id) === botId ? bot : undefined)
  if (!available(account) || typeof account.pickGroup !== 'function') return
  return { account, key: groupKey(account, botId, groupId) ?? pickerId(groupId) }
}

function parseGroup (target) {
  const raw = textId(target)
  const separator = raw.indexOf(':')
  const preferred = separator === -1 ? '' : raw.slice(0, separator).trim()
  const id = (separator === -1 ? raw : raw.slice(separator + 1)).trim()
  if (id && (separator === -1 || usableId(preferred))) return { preferred, id }
}

// 白名单是授权配置，必须指定机器人，不能跨账号匹配 OpenID。
export function isSignWhitelistGroup (groups, event) {
  const botId = textId(event?.self_id)
  const groupId = textId(event?.group_id)
  if (!usableId(botId) || !groupId) return false
  const keys = scopedKeys(event?.bot, botId, groupId)
  return asList(groups).some(target => {
    const group = parseGroup(target)
    return group?.preferred === botId && scopedKeys(event?.bot, botId, group.id).some(key => keys.includes(key))
  })
}

export function createSignWhitelistMatcher (groups, { bot = globalThis.Bot, log = globalThis.logger } = {}) {
  const bots = new Map(accounts(bot, Array.isArray(bot?.uin)))
  const routes = []
  for (const target of asList(groups)) {
    try {
      const group = parseGroup(target)
      if (!group?.preferred) throw new Error('配置应为机器人ID:群号')
      const { preferred, id } = group
      const account = bots.get(preferred)
      if (!available(account)) throw new Error(`指定账号 ${preferred} 不可用`)
      const members = scopedKeys(account, preferred, id).map(key => {
        const match = findKey(account.gml, key)
        return match === undefined ? undefined : account.gml.get(match)
      }).filter(map => typeof map?.has === 'function')
      if (!members.length) throw new Error('未找到该群的成员缓存')
      routes.push({ account, botId: preferred, members })
    } catch (error) {
      log?.warn?.(`[genshin][签到群白名单] 群 ${target}：${error?.message ?? error}，已跳过`)
    }
  }
  return user => {
    const id = textId(user)
    return usableId(id) && routes.some(({ account, botId, members }) =>
      available(account) && scopedKeys(account, botId, id).some(key => members.some(map => findKey(map, key) !== undefined)))
  }
}

function pickerId (id) {
  const numeric = Number(id)
  return Number.isSafeInteger(numeric) && String(numeric) === id ? numeric : id
}

export async function sendSignTaskNotice (msg, {
  manual = false, event, groups, masterQQ, master, label, waitForGroup,
  bot = globalThis.Bot, log = globalThis.logger, timeoutMs
} = {}) {
  async function send (target, action) {
    try {
      const result = await sendWithTimeout(action, timeoutMs)
      // 部分宿主的发送接口不返回回执；签到通知仍兼容 undefined。
      if (result === false || result === null) throw new Error('消息发送失败')
      return true
    } catch (error) {
      log?.warn?.(`[genshin][${label}] ${target}：${error?.message ?? error}`)
      return false
    }
  }

  function sendTo (contact) {
    if (typeof contact?.sendMsg !== 'function') throw new Error('找不到可用的发送对象，已跳过')
    return contact.sendMsg(msg)
  }

  if (manual) {
    return send('手动回复', () => {
      if (typeof event?.reply !== 'function') throw new Error('回复对象不可用，已跳过')
      return event.reply(msg)
    })
  }

  const multiple = Array.isArray(bot?.uin)
  const bindings = new Map()
  for (const [botId, users] of Object.entries(master ?? {})) {
    const id = textId(botId)
    if (!usableId(id)) continue
    for (const user of asList(users)) {
      const userId = textId(user)
      if (!usableId(userId)) continue
      if (!bindings.has(userId)) bindings.set(userId, new Set())
      bindings.get(userId).add(id)
    }
  }

  // 优先按 masterQQ 的顺序尝试，补上只在账号映射中配置的主人 ID；成功即停止私聊回退。
  const masterIds = new Set([...asList(masterQQ).map(textId).filter(usableId), ...bindings.keys()])
  for (const userId of masterIds) {
    const binding = bindings.get(userId)
    const sent = await send(`主人 ${userId}`, () => {
      const candidates = accounts(bot, multiple).filter(([id, account]) =>
        (!binding || binding.has(id)) && available(account) && typeof (account.pickFriend ?? account.pickUser) === 'function')
      for (const [, account] of candidates) {
        const id = findFriend(account, userId)
        if (id !== undefined) return sendTo((account.pickFriend ?? account.pickUser).call(account, id))
      }
      // 显式映射和单账号允许联系人列表未收录；多账号全局主人不随机选号。
      const account = (binding || !multiple) ? candidates[0]?.[1] : undefined
      if (!account) throw new Error('没有可用的主人通知账号，已跳过')
      return sendTo((account.pickFriend ?? account.pickUser).call(account, pickerId(userId)))
    })
    if (sent) break
  }

  for (const target of asList(groups)) {
    await send(`群 ${target}`, async () => {
      const group = parseGroup(target)
      if (!group) throw new Error('配置应为机器人ID:群号或群号')
      const { preferred, id } = group
      if (waitForGroup) await waitForGroup()
      const candidates = accounts(bot, multiple).filter(([botId, account]) =>
        (!preferred || preferred === botId) && available(account) && typeof account.pickGroup === 'function')
      for (const [botId, account] of candidates) {
        const key = groupKey(account, botId, id)
        if (key !== undefined) return sendTo(account.pickGroup(key))
      }
      // 指定账号不换号；单账号保留不用群列表的兼容行为。
      const account = (preferred || !multiple) ? candidates[0]?.[1] : undefined
      if (!account) throw new Error(preferred ? `指定账号 ${preferred} 不可用，已跳过` : '未找到目标群所属账号，已跳过')
      return sendTo(account.pickGroup(pickerId(id)))
    })
  }
}
