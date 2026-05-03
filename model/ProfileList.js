import lodash from 'lodash'
import { getTargetUid } from '../../miao-plugin/apps/profile/ProfileCommon.js'
import { Common, Data } from '../../miao-plugin/components/index.js'
import { ProfileRank, Player } from '../../miao-plugin/models/index.js'

const ProfileList = {
  /**
   * 渲染面板
   * @param e
   * @returns {Promise<boolean|*>}
   */

  async render (e) {
    let uid = await getTargetUid(e)
    if (!uid) {
      e._replyNeedUid || e.reply('请先发送【#绑定+你的UID】来绑定查询目标\n星铁请使用【#星铁绑定+UID】')
      return true
    }

    let isSelfUid = false
    if (e.runtime && e.runtime?.user) {
      let uids = []
      let user = e.runtime.user
      if (typeof user.getCkUidList === 'function') {
        uids = user.getCkUidList(e.game).map(i => i.uid) || []
      } else {
        uids = user.ckUids || []
      }
      isSelfUid = uids.some(ds => ds === uid + '')
    }
    let rank = false

    let hasNew = true
    // let newCount = 0

    let chars = []
    let msg = ''
    // let newChar = {}
    if (e.newChar) {
      msg = '获取角色面板数据成功'
      //  newChar = e.newChar
    }
    const cfg = await Data.importCfg('cfg')
    // 获取面板数据
    let player = Player.create(e)
    let servName = '米游社'
    if (!player.hasProfile) {
      await player.refresh({ profile: true })
    }
    if (!player.hasProfile) {
      e.reply(`本地暂无uid${uid}[${player.game}]的面板数据...`)
      return true
    }
    let profiles = player.getProfiles()

    // 检测标志位
    let qq = (e.at && !e.atBot) ? e.at : e.user_id
    await ProfileRank.setUidInfo({ uid, profiles, qq, uidType: isSelfUid ? 'ck' : 'bind' })

    let groupId = e.group_id
    if (groupId) {
      rank = await ProfileRank.create({ groupId, uid, qq: e.user_id })
    }
    const rankCfg = await ProfileRank.getGroupCfg(groupId)
    const groupRank = rank && (cfg?.diyCfg?.groupRank || false) && rankCfg.status !== 1
    for (let id in profiles) {
      let profile = profiles[id]
      let char = profile.char
      let tmp = char.getData('id,face,name,abbr,element,star')
      let imgs = char.getImgs(profile.costume)
      tmp.face = imgs.qFace || imgs.face
      tmp.level = profile.level || 1
      tmp.cons = profile.cons
      tmp.isNew = 1
      // if (newChar[char.name]) {
        // tmp.isNew = 1
        // newCount++
      // }
      if (rank) {
        tmp.groupRank = await rank.getRank(profile, !!tmp.isNew)
      }
      chars.push(tmp)
    }

    // if (newCount > 0) {
      // hasNew = newCount <= 12
    // }

    chars = lodash.sortBy(chars, ['isNew', 'star', 'level', 'id'])
    chars = chars.reverse()

    player.save()
    // 渲染图像
    let img = await Common.render('character/profile-list', {
      save_id: uid,
      uid,
      chars,
      servName,
      hasNew,
      msg,
      groupRank,
      updateTime: player.getUpdateTime(),
      allowRank: rank && rank.allowRank,
      rankCfg,
      elem: player.isGs ? 'hydro' : 'sr'
    }, { e, scale: 1.6, retType: 'base64' })

    if (chars.length > 15) {
      let gametype = e?.game == 'sr' ? '*' : '#'
      let button = []

      button.push([
        { text: `${chars[0]?.abbr}`, callback: `${gametype}${chars[0]?.abbr}面板` },
        { text: `${chars[1]?.abbr}`, callback: `${gametype}${chars[1]?.abbr}面板` },
        { text: `${chars[2]?.abbr}`, callback: `${gametype}${chars[2]?.abbr}面板` }
      ], [
        { text: `${chars[3]?.abbr}`, callback: `${gametype}${chars[3]?.abbr}面板` },
        { text: `${chars[4]?.abbr}`, callback: `${gametype}${chars[4]?.abbr}面板` },
        { text: `${chars[5]?.abbr}`, callback: `${gametype}${chars[5]?.abbr}面板` }
      ], [
        { text: `${chars[6]?.abbr}`, callback: `${gametype}${chars[6]?.abbr}面板` },
        { text: `${chars[7]?.abbr}`, callback: `${gametype}${chars[7]?.abbr}面板` },
        { text: `${chars[8]?.abbr}`, callback: `${gametype}${chars[8]?.abbr}面板` }
      ], [
        { text: `${chars[9]?.abbr}`, callback: `${gametype}${chars[9]?.abbr}面板` },
        { text: `${chars[10]?.abbr}`, callback: `${gametype}${chars[10]?.abbr}面板` },
        { text: `${chars[11]?.abbr}`, callback: `${gametype}${chars[11]?.abbr}面板` }
      ], [
        { text: `${chars[12]?.abbr}`, callback: `${gametype}${chars[12]?.abbr}面板` },
        { text: `${chars[13]?.abbr}`, callback: `${gametype}${chars[13]?.abbr}面板` },
        { text: `${chars[14]?.abbr}`, callback: `${gametype}${chars[14]?.abbr}面板` }
      ])

      return e.reply([img, segment.button(...button)])
    } else {
      return e.reply(img)
    }
  },

  async reload (e) {
    let uid = await getTargetUid(e)
    if (!uid) {
      return true
    }
    let player = Player.create(e)
    player.reload()
    return ProfileList.render(e)
  }
}
export default ProfileList
