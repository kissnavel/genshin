import plugin from '../../../lib/plugins/plugin.js'
import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import Cfg from '../model/Cfg.js'
import srChallenge from '../model/challenge.js'

export class Challenge extends plugin {
  constructor () {
    super({
      name: 'genshin-星铁深渊',
      dsc: '星穹铁道深渊信息',
      event: 'message',
      priority: Cfg.getConfig('config').priority,
      rule: [
        {
          reg: '^#*星铁?(上期|本期)?(简易)?(深渊)',
          fnc: 'challenge'
        },
        {
          reg: '^#*星铁?(最新|当期)(简易)?(深渊)',
          fnc: 'challengeCurrent'
        },
        {
          reg: '^#*星铁?(上期|本期)?(简易)?(忘却|忘却之庭|混沌|混沌回忆)',
          fnc: 'challengeForgottenHall'
        },
        {
          reg: '^#*星铁?(上期|本期)?(简易)?(虚构|虚构叙事)',
          fnc: 'challengeStory'
        },
        {
          reg: '^#*星铁?(上期|本期)?(简易)?(末日|末日幻影)',
          fnc: 'challengeBoss'
        },
        {
          reg: '^#*星铁?(上期|本期)?(简易)?(异乡|异相|异向|仲裁|异相仲裁)',
          fnc: 'challengePeak'
        }
      ]
    })
  }

  async challengeForgottenHall (e) {
    await e.reply('正在获取忘却之庭数据，请稍后……')
    let res = await srChallenge.get(e, 2)
    if (!res) return false
    let img = await puppeteer.screenshot('StarRail/challenge', res)
    return await e.reply(img)
  }

  async challengeStory (e) {
    await e.reply('正在获取虚构叙事数据，请稍后……')
    let res = await srChallenge.get(e, 1)
    if (!res) return false
    let img = await puppeteer.screenshot('StarRail/challenge', res)
    return await e.reply(img)
  }

  async challengeBoss (e) {
    await e.reply('正在获取末日幻影数据，请稍后……')
    let res = await srChallenge.get(e, 0)
    if (!res) return false
    let img = await puppeteer.screenshot('StarRail/challenge', res)
    return await e.reply(img)
  }

  async challengePeak (e) {
    await e.reply('正在获取异相仲裁数据，请稍后……')
    let res = await srChallenge.get(e, 3)
    if (!res) return false
    let img = await puppeteer.screenshot('StarRail/challenge', res)
    return await e.reply(img)
  }

  async challenge (e) {
    await e.reply('正在获取全部深渊数据，请稍后……')
    let res = await srChallenge.get(e, '', true)
    if (!res) return false
    let img = await puppeteer.screenshot('StarRail/challenge', res)
    return await e.reply(img)
  }

  async challengeCurrent (e) {
    await e.reply('正在获取最新深渊数据，请稍后……')
    let res = await srChallenge.get(e, this.getCurrentChallengeType())
    if (!res) return false
    let img = await puppeteer.screenshot('StarRail/challenge', res)
    return await e.reply(img)
  }

  getCurrentChallengeType () {
    // 获取当前时间
    let currentTime = new Date()

    // 获取第一期混沌回忆的时间
    let firstTime = new Date('2024-06-24T04:00:00')

    // 计算时间差距（以毫秒为单位）
    if (currentTime < firstTime) {
      logger.error('当前系统时间早于第一期末日幻影时间，请检查系统配置！')
    }
    let timeDiff = currentTime - firstTime
    // 2周（14天）为一个周期
    let periodNum = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 14))
    // 0: 末日
    // 1: 虚构
    // 2: 混沌
    return periodNum % 3
  }
}
