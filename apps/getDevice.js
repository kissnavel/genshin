import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import getDeviceFp from '../model/getDeviceFp.js'
import MysInfo from '../model/mys/mysInfo.js'

export class getDevice extends plugin {
  constructor () {
    super({
      name: '绑定设备',
      dsc: '绑定设备',
      event: 'message',
      priority: 300,
      rule: [
        {
            reg: '^#*(原神|星铁|未定)?绑定设备$',
            fnc: 'bindDevice'
        },
        {
            reg: '^#*(原神|星铁|未定)?解绑设备$',
            fnc: 'deleteBind'
        },
        {
            reg: '^#*(原神|星铁|未定)?绑定设备帮助$',
            fnc: 'bindDeviceHelp'
        }
      ]
    })
  }

  async bindDevice(e) {
    const uid = await MysInfo.getUid(e, false)
    if (!uid) return false
    const game = e.game
    if ((game == 'wd' ? /^(10|20)[0-9]{7}/i : /^(1[0-9]|[6-9])[0-9]{8}/i).test(uid)) {
      await this.reply('国际服不需要绑定设备')
      return false
    }
    await redis.set(`genshin:getDevice:${e.user_id}:uid`, uid, {
      EX: 120
    })
    await redis.set(`genshin:getDevice:${e.user_id}:game`, game, {
      EX: 120
    })
    //先throw一步
    this.setContext('toBindDevice')
    await this.reply(`为UID ${uid}绑定设备，请发送设备信息(建议私聊发送)，或者发送“取消”取消绑定`, false, { at: true, recallMsg: 100 })
  }
  async toBindDevice() {
    const uid = await redis.get(`genshin:getDevice:${this.e.user_id}:uid`)
    const game = await redis.get(`genshin:getDevice:${this.e.user_id}:game`)
    const ck = await MysInfo.checkUidBing(uid, game)
    const ltuid = ck.ltuid
    if (!ltuid) {
      this.reply('无ltuid信息，请重新绑定cookie')
      this.finish('toBindDevice')
      return false
    }
    const msg = this.e.msg.trim()
    if (msg.includes('取消')) {
      await this.reply('已取消', false, { at: true, recallMsg: 100 })
      this.finish('toBindDevice')
      return false
    }
    try {
      const info = JSON.parse(msg)
      if (!info) {
        this.reply('设备信息格式错误', false, { at: true, recallMsg: 100 })
        return false
      }
      if (!!info?.device_id && !!info.device_fp) {
        await redis.set(`genshin:device_fp:${ltuid}:fp`, info.device_fp)
        await redis.set(`genshin:device_fp:${ltuid}:id`, info.device_id)
        await this.reply(`绑定设备成功${this.e.isGroup ? '\n请撤回设备信息' : ''}`, false, { at: true, recallMsg: 100 })
        this.finish('toBindDevice')
        return false
      }
      if (
        !info?.deviceName ||
        !info?.deviceBoard ||
        !info?.deviceModel ||
        !info?.oaid ||
        !info?.androidVersion ||
        !info?.deviceFingerprint ||
        !info?.deviceProduct
      ) {
        this.reply('设备信息格式错误', false, { at: true, recallMsg: 100 })
        return false
      }
      await redis.del(`genshin:device_fp:${ltuid}:fp`)
      await redis.set(`genshin:device_fp:${ltuid}:bind`, JSON.stringify(info))
      const { deviceFp } = await getDeviceFp.Fp(uid, ck, game)
      if (!deviceFp) {
        await this.reply('绑定设备失败')
        return false
      }
      logger.debug(`[LTUID:${ltuid}]绑定设备成功，deviceFp:${deviceFp}`)
      await this.reply(`绑定设备成功${this.e.isGroup ? '\n请撤回设备信息' : ''}`, false, { at: true, recallMsg: 100 })
    } catch (error) {
      this.reply('设备信息格式错误', false, { at: true, recallMsg: 100 })
      return false
    } finally {
      this.finish('toBindDevice')
      return false
    }
  }
  async deleteBind(e) {
    const uid = await MysInfo.getUid(e, false)
    if (!uid) return false
    if ((e.game == 'wd' ? /^(10|20)[0-9]{7}/i : /^(1[0-9]|[6-9])[0-9]{8}/i).test(uid)) return false
    const ck = await MysInfo.checkUidBing(uid, e)
    const ltuid = ck.ltuid
    await redis.del(`genshin:device_fp:${ltuid}:fp`)
    await redis.del(`genshin:device_fp:${ltuid}:bind`)
    await redis.del(`genshin:device_fp:${ltuid}:id`)
    await redis.del(`genshin:device_fp:${uid}:fp`)
    await this.reply('解绑设备成功', false, { at: true, recallMsg: 100 })
  }
  async bindDeviceHelp(e) {
    const msgs = [
        '[绑定设备]',
        '方法一：',
        '1. 使用抓包软件抓取米游社APP的请求',
        '2. 在请求头内找到【x-rpc-device_id】和【x-rpc-device_fp】',
        '3. 自行构造如下格式的设备信息：',
        '    {"device_id": "x-rpc-device_id的内容", "device_fp": "x-rpc-device_fp的内容"}',
        '4. 给机器人发送"(#/*/&)绑定设备"指令',
        '5. 机器人会提示发送设备信息',
        '6. 粘贴自行构造的设备信息，并发送',
        '7. 提示绑定成功', 
        '--------------------------------',
        '方法二（仅适用于安卓设备）：',
        '1. 使用常用米游社手机下载下面链接的APK文件，并安装',
        'https://ghproxy.mihomo.me/https://raw.githubusercontent.com/forchannot/get_device_info/main/app/build/outputs/apk/debug/app-debug.apk',
        '2. 打开后点击按钮复制',
        '3. 给机器人发送"(#/*/&)绑定设备"指令',
        '4. 机器人会提示发送设备信息',
        '5. 粘贴已复制的设备信息，并发送',
        '6. 提示绑定成功',
        '--------------------------------',
        '[解绑设备]',
        '发送 (#/*/&)解绑设备 即可'
      ],
      msg = msgs.join('\n')
    await this.reply(await common.makeForwardMsg(e, msg, '绑定设备帮助'))
  }
}
