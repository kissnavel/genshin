import fs from 'node:fs'
import Cfg from './model/Cfg.js'
import Handler from './model/Handler.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'node:path'

logger.info('*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*')
logger.info('genshin 加载中')
logger.info('仓库地址 https://github.com/kissnavel/genshin')

if (!fs.existsSync(Cfg.file))
  fs.mkdirSync(Cfg.file)

let file = fs.readdirSync(`${Cfg.defile}`).filter(file => file.endsWith('.yaml'))
for (let item of [...file, 'mys.json'])
  if (!fs.existsSync(`${Cfg.file}/${item}`))
    fs.copyFileSync(`${Cfg.defile}/${item}`, `${Cfg.file}/${item}`)

try {
  for (let type of ['white', 'banuid', 'api', 'equip', 'command', 'lable', 'config']) {
    let isNew = true
    let data = Cfg.getConfig(type)
    let defdata = Cfg.getdef(type)

    if (['command', 'lable'].includes(type)) {
      for (let i in defdata)
        if (!(i in data)) isNew = false

      if (!isNew) {
        let config = Cfg.getdef(type, false)
        for (let i in defdata)
          if (i in data)
            config = config.replace(new RegExp(`${i}:(.*)`, 'g'), `${i}: ${data[i]}`)

        Cfg.setConfig(type, config, false)
      }
    } else {
      for (let i in defdata)
        if (!(i in data)) isNew = false

      if (!isNew) {
        for (let i in defdata)
          if (i in data)
            defdata[i] = data[i]

        Cfg.setConfig(type, defdata)
      }
    }
  }
  logger.info('[genshin]配置文件更新完成')
} catch (error) {
  logger.error(error)
}

/** genshin-plugin目录 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const genshinPluginDir = join(__dirname, '..', 'genshin-plugin')

if (!fs.existsSync(genshinPluginDir)) {
  fs.mkdirSync(genshinPluginDir, { recursive: true })
  logger.info(`genshin-plugin目录创建成功: ${genshinPluginDir}`)
  const guobaSupportContent = "export { supportGuoba } from '../genshin/guoba.support.js'"
  fs.writeFileSync(join(genshinPluginDir, 'guoba.support.js'), guobaSupportContent)
  logger.info('guoba.support.js 文件已创建')
  const indexJsContent = 'export { }'
  fs.writeFileSync(join(genshinPluginDir, 'index.js'), indexJsContent)
  logger.info('index.js 文件已创建')
}

Cfg.startGT()
logger.info('*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*')
// 暂时仍保留全局的Gtest以兼容老版本调用，待Handler普及后删除
global.Gtest = new Handler()

const files = fs.readdirSync('./plugins/genshin/apps').filter(file => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
