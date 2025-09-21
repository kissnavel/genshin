import NoteUser from './mys/NoteUser.js'
import MysUser from './mys/MysUser.js'
import common from '../../../lib/common/common.js'
import { promisify } from 'node:util'
import MysApi from './mys/mysApi.js'
import fs from 'node:fs'
import yaml from 'yaml'
import _ from 'lodash'
let sqlite3
try {
  sqlite3 = (await import('sqlite3')).default
} catch (err) {
  logger.error('导入sqlite3失败，本插件不支持Yunzai-Bot，非Yunzai-Bot请检查依赖')
}

const _path = process.cwd().replace(/\\/g, '/')
class Cfg {
  constructor() {
    this.file = `${_path}/plugins/genshin/config`
    this.defile = `${_path}/plugins/genshin/defSet`
    this.resfile = `${_path}/plugins/genshin/resources/`
    this.dir = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml/`
  }

  /** 用户配置 */
  getConfig(app, y = true) {
    if (y)
      return yaml.parse(fs.readFileSync(`${this.file}/${app}.yaml`, 'utf8'))
    else
      return fs.readFileSync(`${this.file}/${app}.yaml`, 'utf8')
  }

  getdef(app, y = true) {
    if (y)
      return yaml.parse(fs.readFileSync(`${this.defile}/${app}.yaml`, 'utf8'))
    else
      return fs.readFileSync(`${this.defile}/${app}.yaml`, 'utf8')
  }

  setConfig(app, data, y = true) {
    if (y) data = yaml.stringify(data)
    return fs.writeFileSync(`${this.file}/${app}.yaml`, data, 'utf8')
  }

  setCk(ck, device_id) {
    return _.trim(ck, ';') + `; _MHYUUID=${device_id}; `
  }

  async signCk() {
    let white = this.getConfig('white')
    let config = this.getConfig('config')

    if (white['QQ']?.length > 0 || white.Group?.length > 0) {
      let signck = _.fromPairs(config.game.map((game) => [game, {}]))
      let signuid = _.fromPairs(config.game.map((game) => [game, {}]))

      if (config.whiteGroup)
        if (white.Group?.length > 0) {
          logger.mark('[自动签到]查询群白名单ck')
          let { cks } = await this.getcks(true)
          for (let g of config.game)
            cks: for (let i in cks[g])
              for (let group of white.Group) {
                if (signck[g][i]) continue cks
                let user_id = Number(cks[g][i].qq) || String(cks[g][i].qq)
                let split = group.split(':')
                let group_id = Number(split[1]) || split[1]
                try {
                  if (Array.isArray(Bot.uin)) {
                    if (!Bot[split[0]].pickMember(group_id, user_id).nickname) continue
                  } else {
                    if (!Bot.pickMember(group_id, user_id).card) continue
                  }

                  signck[g] = Object.assign({}, signck[g], { [i]: cks[g][i] })
                } catch (error) {
                  logger.error(error)
                }
              }
        }

      if (white['QQ']?.length > 0) {
        logger.mark('[自动签到]查询QQ白名单ck')
        for (let i of white['QQ']) {
          let { cks } = await this.getcks(false, i)
          if (_.every(cks, _.isEmpty)) {
            logger.mark(`[自动签到]QQ:${i}：无cookie`)
            continue
          }
          for (let g of config.game)
            for (let i in cks[g])
              if (!signck[g][i])
                signck[g] = Object.assign({}, signck[g], { [i]: cks[g][i] })
        }
      }

      for (let g of config.game)
        signuid[g] = _.map(signck[g], 'uid')

      return { cks: signck, uids: signuid }
    } else {
      logger.mark('[自动签到]查询全部ck')
      return await this.getcks(true)
    }
  }

  async getcks(all, qq = '', note = false) {
    if (qq) qq = Number(qq) || String(qq)
    this.banUid = this.getConfig('banuid')
    let config = this.getConfig('config')
    this.white = this.getConfig('white')

    this.Game = note ? ['gs', 'sr', 'zzz'] : config.game
    let cks = _.fromPairs(this.Game.map((game) => [game, {}]))
    let uids = _.fromPairs(this.Game.map((game) => [game, {}]))

    const dbPath = `${_path}/data/db/data.db`
    const db = new sqlite3.Database(dbPath)
    const Users = `select id as qq, ltuid, ck, device, uids  from Users 
	 left join MysUsers on Users.ltuids Like '%' ||MysUsers.ltuid||'%'
	 where ${all ? `` : `Users.id = '${qq}' and`}
	Users.id is not null and MysUsers.ck is not null;`
    try {
      const rows = await new Promise((resolve, reject) => {
        db.all(Users, [], (err, rows) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        })
      })

      for (let key of this.Game) {
        for (let row of rows) {
          const Data = JSON.parse(row.uids)
          for (let i in Data[key]) {
            if (this.banUid[key]?.includes(Number(Data[key][i]))) continue
            let uid = String(Data[key][i])
            let ck = {
              [uid]: {
                qq: row.qq,
                uid: uid,
                ck: this.setCk(row.ck, row.device),
                skid: `${row.ltuid}_${row.qq}`,
                game_biz: '',
                region: '',
                device_id: row.device,
                ltuid: row.ltuid
              }
            }
            cks[key] = Object.assign({}, cks[key], ck)
          }
          if (!note) cks = await this.otherck(row, cks)
        }
      }
      for (let game of this.Game)
        uids[game] = _.map(cks[game], 'uid')

      return { cks, uids }
    } catch (err) {
      logger.mark(`抛出异常: ${err.message}`)
      return { cks, uids }
    } finally {
      db.close()
    }
  }

  async otherck(row, cks) {
    let ck = this.setCk(row.ck, row.device)
    for (let game of this.Game) {
      if (['gs', 'sr', 'zzz', 'wd'].includes(game)) continue
      let mysApi = new MysApi('', ck, { log: false }, '', '', game)
      let res
      if (game == 'bh2') {
        res = await mysApi.getData('bh2_cn')
        if (res?.retcode !== 0) return cks
        if (res?.data?.list.length == 0) continue
      } else {
        res = await mysApi.getData('bh3_cn')
        if (res?.retcode !== 0) res = await mysApi.getData('bh3_global')
        if (res?.retcode !== 0) return cks
        if (res?.data?.list.length == 0) continue
      }

      for (let data of res?.data?.list) {
        if (this.banUid[game]?.includes(Number(data.game_uid))) continue
        let uid = String(data.game_uid)
        let CK = {
          [uid]: {
            qq: row.qq,
            uid: uid,
            ck: ck,
            skid: `${row.ltuid}_${row.qq}`,
            game_biz: data.game_biz,
            region: data.region,
            device_id: row.device,
            ltuid: row.ltuid
          }
        }
        cks[game] = Object.assign({}, cks[game], CK)
      }
    }
    await common.sleep(_.random(500, 1000))
    return cks
  }

  async signSk() {
    let white = this.getConfig('white')
    let config = this.getConfig('config')
    if (white.bbsQQ?.length > 0 || white.Group?.length > 0) {
      let signSks = {}
      if (config.whiteGroup)
        if (white.Group?.length > 0) {
          logger.mark('[社区自动签到]查询群白名单sk')
          let sks = await this.getsks(true)
          sks: for (let i in sks)
            for (let group of white.Group) {
              if (signSks[sks[i].id]) continue sks
              let user_id = Number(sks[i].userId) || String(sks[i].userId)
              let split = group.split(':')
              let group_id = Number(split[1]) || split[1]
              try {
                if (Array.isArray(Bot.uin)) {
                  if (!Bot[split[0]].pickMember(group_id, user_id).nickname) continue
                } else {
                  if (!Bot.pickMember(group_id, user_id).card) continue
                }
                signSks = Object.assign({}, signSks, { [i]: sks[i] })
              } catch (error) {
                logger.error(error)
              }
            }
        }

      if (white.bbsQQ?.length > 0) {
        logger.mark('[社区自动签到]查询QQ白名单sk')
        for (let i of white.bbsQQ) {
          let sks = await this.getsks(false, i)
          if (_.isEmpty(sks)) {
            logger.mark(`[社区签到]QQ:${i}：无stoken`)
            continue
          }
          for (let i in sks)
            if (!signSks[sks[i].id])
              signSks = Object.assign({}, signSks, { [i]: sks[i] })
        }
      }

      return { sks: signSks, ltuids: _.map(signSks, 'id') }
    } else {
      logger.mark('[社区自动签到]查询全部sk')
      let sks = await this.getsks(true)
      return { sks, ltuids: _.map(sks, 'id') }
    }
  }

  async getsks(all, qq) {
    let list = {}
    try {
      let sks = []
      if (all) {
        let files = fs.readdirSync(this.dir).filter(file => file.endsWith('.yaml'))

        const readFile = promisify(fs.readFile)

        let promises = []

        files.forEach((v) => promises.push(readFile(`${this.dir}${v}`, 'utf8')))
        const res = await Promise.all(promises)
        res.forEach((v, index) => {
          let tmp = yaml.parse(v)
          sks.push(tmp)
        })
        sks = Object.assign({}, ...sks)
      } else {
        if (!fs.existsSync(`${this.dir}${String(qq)}.yaml`))
          return list
        sks = yaml.parse(fs.readFileSync(`${this.dir}${String(qq)}.yaml`, 'utf-8'))
      }

      for (let i in sks) {
        if (!sks[i].stoken || !sks[i].stuid || !sks[i].ltoken) continue
        let id = `${sks[i].stuid}_${sks[i].userId}`
        if (list[id]) continue
        let sk = {
          [id]: {
            userId: sks[i].userId,
            ltoken: sks[i].ltoken,
            stuid: sks[i].stuid,
            id: id,
            sk: `stuid=${sks[i].stuid};stoken=${sks[i].stoken};${sks[i].mid ? `mid=${sks[i].mid}` : `ltoken=${sks[i].ltoken}`};`
          }
        }
        list = Object.assign({}, list, sk)
      }
    } catch (error) {
      logger.error('stoken获取失败：' + error)
    }
    return list
  }

  async user(e) {
    return await NoteUser.create(e)
  }

  async delck(ltuid, qq) {
    qq = Number(qq) || String(qq)
    let e = {
      user_id: qq,
      qq,
      msg: "删除ck",
      isSr: false,
      isZzz: false
    }

    let user = await this.user(e)
    let mys = await MysUser.create(ltuid)
    if (!mys) return

    await user.delMysUser(ltuid)
  }

  async delsk(qq, stuid) {
    if (!stuid) return
    let sks = yaml.parse(fs.readFileSync(`${this.dir}${String(qq)}.yaml`, 'utf-8'))
    for (let i in sks)
      if (sks[i].stuid == stuid) delete sks[i]
    logger.mark(`[qq:${qq}][stuid:${stuid}]删除失效sk`)
    fs.writeFileSync(`${this.dir}${String(qq)}.yaml`, yaml.stringify(sks), 'utf8')

    if (_.isEmpty(sks))
      fs.unlinkSync(`${this.dir}${String(qq)}.yaml`)
    return
  }

  countTime(time) {
    let hour = Math.floor((time / 3600) % 24)
    let min = Math.floor((time / 60) % 60)
    let sec = Math.floor(time % 60)
    let msg = ''
    if (hour > 0) msg += `${hour}小时`
    if (min > 0) msg += `${min}分钟`
    if (sec > 0) msg += `${sec}秒`
    return msg
  }
}

export default new Cfg()
