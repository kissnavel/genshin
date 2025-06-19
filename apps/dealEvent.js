import lodash from 'lodash'
import cfg from '../../../lib/config/config.js'
import loader from '../../../lib/plugins/loader.js'
import Runtime from '../../../lib/plugins/runtime.js'

let yunzaiName = cfg.package.name

if (yunzaiName == 'trss-yunzai' || yunzaiName == 'miao-yunzai') {
/** 劫持deal */
  loader.deal = async function (e) {
    this.count(e, 'receive', e.message)
    /** 检查黑白名单 */
    if (!this.checkBlack(e)) return
    /** 冷却 */
    if (!this.checkLimit(e)) return
    /** 处理事件 */
    this.dealEvent(e)
    /** 处理回复 */
    this.reply(e)
    /** 注册runtime */
    await Runtime.init(e)

    const priority = []
    for (const i of this.priority) {
    /** 判断是否启用功能，过滤事件 */
      if (this.checkDisable(Object.assign(i.plugin, { e })) && this.filtEvent(e, i.plugin)) { priority.push(i) }
    }

    for (const i of priority) {
    /** 上下文hook */
      if (!i.plugin.getContext) continue
      const context = {
        ...i.plugin.getContext(),
        ...i.plugin.getContext(false, true)
      }
      if (!lodash.isEmpty(context)) {
        let ret
        for (const fnc in context) { ret ||= await Object.assign(new i.class(e), { e })[fnc](context[fnc]) }
        if (ret === 'continue') continue
        return
      }
    }

    /** 是否只关注主动at */
    if (!this.onlyReplyAt(e)) return
    /** 设置冷却 */
    this.setLimit(e)

    /** 判断是否是星铁命令，若是星铁命令则标准化处理 */
    /** e.isSr = true，且命令标准化为 #星铁 开头 */
    Object.defineProperty(e, 'isSr', {
      get: () => e.game === 'sr',
      set: (v) => e.game = v ? 'sr' : 'gs'
    })
    Object.defineProperty(e, 'isGs', {
      get: () => e.game === 'gs',
      set: (v) => e.game = v ? 'gs' : 'sr'
    })
    /** 星铁命令前缀 */
    const srReg = /^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/
    /** 绝区零命令前缀 */
    const zzzReg = /^#?(%|％|绝区零|绝区)+/
    /** 未定事件簿命令前缀 */
    const wdReg = /^#?(&|未定事件簿|未定)+/
    /** 崩坏三命令前缀 */
    const bh3Reg = /^#?(！|!|崩坏三|崩三)+/
    /** 崩坏二命令前缀 */
    const bh2Reg = /^#?(￥|崩坏学园2|崩坏二|崩二)+/
    if (srReg.test(e.msg)) {
      e.game = 'sr'
      e.msg = e.msg.replace(srReg, '#星铁')
    } else if (zzzReg.test(e.msg)) {
      e.game = 'zzz'
      e.msg = e.msg.replace(zzzReg, '#绝区零')
    } else if (wdReg.test(e.msg)) {
      e.game = 'wd'
      e.msg = e.msg.replace(wdReg, '#未定')
    } else if (bh3Reg.test(e.msg)) {
      e.game = 'bh3'
      e.msg = e.msg.replace(bh3Reg, '#崩三')
    } else if (bh2Reg.test(e.msg)) {
      e.game = 'bh2'
      e.msg = e.msg.replace(bh2Reg, '#崩二')
    }

    /** 优先执行 accept */
    for (const i of priority) {
      if (i.plugin.accept) {
        const res = await Object.assign(new i.class(e), { e }).accept(e)
        if (res === 'return') return
        if (res) break
      }
    }

    for (const i of priority) {
      if (i.plugin.rule) {
        for (const v of i.plugin.rule) {
          /** 判断事件 */
          if (v.event && !this.filtEvent(e, v)) continue

          /** 正则匹配 */
          if (!v.reg.test(e.msg)) continue
          const plugin = Object.assign(new i.class(e), { e })
          e.logFnc = `${logger.blue(`[${plugin.name}(${v.fnc})]`)}`

          Bot.makeLog(v.log === false ? 'debug' : 'info', `${e.logText}${e.logFnc}${logger.yellow('[开始处理]')}`, false)

          /** 判断权限 */
          if (this.filtPermission(e, v)) {
            try {
              const start_time = Date.now()
              const res = plugin[v.fnc] && (await plugin[v.fnc](e))
              if (res === false) continue
              Bot.makeLog(v.log === false ? 'debug' : 'mark', `${e.logText}${e.logFnc}${logger.green(`[完成${Bot.getTimeDiff(start_time)}]`)}`, false)
            } catch (err) {
              Bot.makeLog('error', [`${e.logText}${e.logFnc}`, err], false)
            }
          }
          return
        }
      }
    }

    Bot.makeLog('debug', `${e.logText}${logger.blue('[暂无插件处理]')}`, false)
  }
} else {
  loader.deal = async function (e) {
    Object.defineProperty(e, 'bot', {
      value: Bot[e?.self_id || Bot.uin]
    })
    /** 检查频道消息 */
    if (this.checkGuildMsg(e)) return

    /** 冷却 */
    if (!this.checkLimit(e)) return
    /** 处理消息 */
    this.dealMsg(e)
    /** 检查黑白名单 */
    if (!this.checkBlack(e)) return
    /** 处理回复 */
    this.reply(e)
    /** 注册runtime */
    await Runtime.init(e)

    const priority = []
    for (const i of this.priority) {
      const p = new i.class(e)
      p.e = e
      /** 判断是否启用功能，过滤事件 */
      if (this.checkDisable(p) && this.filtEvent(e, p)) { priority.push(p) }
    }

    for (const plugin of priority) {
      /** 上下文hook */
      if (!plugin.getContext) continue
      const context = {
        ...plugin.getContext(),
        ...plugin.getContext(false, true)
      }
      if (!lodash.isEmpty(context)) {
        let ret
        for (const fnc in context) {
          ret ||= await plugin[fnc](context[fnc])
        }
        /** 返回continue时，继续响应后续插件 */
        if (ret === 'continue') continue
        return
      }
    }

    /** 是否只关注主动at */
    if (!this.onlyReplyAt(e)) return

    /** 判断是否是星铁命令，若是星铁命令则标准化处理 */
    /** e.isSr = true，且命令标准化为 #星铁 开头 */
    Object.defineProperty(e, 'isSr', {
      get: () => e.game === 'sr',
      set: (v) => e.game = v ? 'sr' : 'gs'
    })
    Object.defineProperty(e, 'isGs', {
      get: () => e.game === 'gs',
      set: (v) => e.game = v ? 'gs' : 'sr'
    })
    /** 星铁命令前缀 */
    const srReg = /^#?(\*|星铁|星轨|穹轨|星穹|崩铁|星穹铁道|崩坏星穹铁道|铁道)+/
    /** 绝区零命令前缀 */
    const zzzReg = /^#?(%|％|绝区零|绝区)+/
    /** 未定事件簿命令前缀 */
    const wdReg = /^#?(&|未定事件簿|未定)+/
    /** 崩坏三命令前缀 */
    const bh3Reg = /^#?(！|!|崩坏三|崩三)+/
    /** 崩坏二命令前缀 */
    const bh2Reg = /^#?(￥|崩坏学园2|崩坏二|崩二)+/
    if (srReg.test(e.msg)) {
      e.game = 'sr'
      e.msg = e.msg.replace(srReg, '#星铁')
    } else if (zzzReg.test(e.msg)) {
      e.game = 'zzz'
      e.msg = e.msg.replace(zzzReg, '#绝区零')
    } else if (wdReg.test(e.msg)) {
      e.game = 'wd'
      e.msg = e.msg.replace(wdReg, '#未定')
    } else if (bh3Reg.test(e.msg)) {
      e.game = 'bh3'
      e.msg = e.msg.replace(bh3Reg, '#崩三')
    } else if (bh2Reg.test(e.msg)) {
      e.game = 'bh2'
      e.msg = e.msg.replace(bh2Reg, '#崩二')
    }
    /** 优先执行 accept */
    for (const plugin of priority) {
      if (plugin.accept) {
        const res = await plugin.accept(e)
        if (res == 'return') return
        if (res) break
      }
    }

    a: for (const plugin of priority) {
      /** 正则匹配 */
      if (plugin.rule) {
        for (const v of plugin.rule) {
        /** 判断事件 */
          if (v.event && !this.filtEvent(e, v)) continue
          if (!new RegExp(v.reg).test(e.msg)) continue
          e.logFnc = `[${plugin.name}][${v.fnc}]`

          if (v.log !== false) { logger.info(`${e.logFnc}${e.logText} ${lodash.truncate(e.msg, { length: 100 })}`) }

          /** 判断权限 */
          if (!this.filtPermission(e, v)) break a

          try {
            const start = Date.now()
            const res = plugin[v.fnc] && (await plugin[v.fnc](e))
            if (res !== false) {
            /** 设置冷却cd */
              this.setLimit(e)
              if (v.log !== false) { logger.mark(`${e.logFnc} ${lodash.truncate(e.msg, { length: 100 })} 处理完成 ${Date.now() - start}ms`) }
              break a
            }
          } catch (error) {
            logger.error(`${e.logFnc}`)
            logger.error(error.stack)
            break a
          }
        }
      }
    }
  }
}
