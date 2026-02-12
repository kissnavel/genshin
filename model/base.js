import fs from 'node:fs'
import _ from 'lodash'
import Cfg from './Cfg.js'
import cfg from '../../../lib/config/config.js'
import { Common, Version } from '#miao'
import { Character } from '#miao.models'

export default class base {
  constructor(e = {}) {
    this.e = e
    this.userId = e?.user_id
    this.model = 'genshin'
    this.set = Cfg.getConfig('config')
    this.note = Cfg.getConfig('defnote')
    this.white = Cfg.getConfig('white')
    this._path = process.cwd().replace(/\\/g, '/')
  }

  get prefix() {
    return `Yz:genshin:${this.model}:`
  }

  // 统一封装渲染
  async renderImg(tpl, data, cfg = {}) {
    return Common.render('genshin', `html/${tpl}`, data, {
      ...cfg,
      e: this.e
    })
  }

  /**
   * 截图默认数据
   * @param saveId html保存id
   * @param tplFile 模板html路径
   * @param pluResPath 插件资源路径
   */
  get screenData() {
    const layoutPath = process.cwd() + '/plugins/genshin/resources/html/layout/'
    let yunzaiName = cfg.package.name
    if (yunzaiName == 'miao-yunzai') {
      yunzaiName = 'Miao-Yunzai'
    } else if (yunzaiName == 'yunzai') {
      yunzaiName = 'Yunzai-Bot'
    } else if (yunzaiName == 'trss-yunzai') {
      yunzaiName = 'TRSS-Yunzai'
    } else {
      yunzaiName = _.capitalize(yunzaiName)
    }
    let data = {
      saveId: this.userId,
      cwd: this._path,
      yzVersion: `v${Version.yunzai}`,
      yzName: yunzaiName,
      genshinLayout: layoutPath + 'genshin.html',
      defaultLayout: layoutPath + 'default.html'
    }
    if (this.e?.isSr) {
      let char = Character.get('黑天鹅', 'sr')
      return {
        ...data,
        tplFile: `./plugins/genshin/resources/StarRail/html/${this.model}/${this.model}.html`,
        /** 绝对路径 */
        pluResPath: `${this._path}/plugins/genshin/resources/StarRail/`,
        srtempFile: 'StarRail/',
        headImg: char?.imgs?.banner,
        game: 'sr',
      }
    }
    let char = Character.get('闲云', 'gs')
    return {
      ...data,
      tplFile: `./plugins/genshin/resources/html/${this.model}/${this.model}.html`,
      /** 绝对路径 */
      pluResPath: `${this._path}/plugins/genshin/resources/`,
      headImg: char?.imgs?.banner,
      srtempFile: '',
      game: 'gs',
    }
  }

  /**
   * 截图默认数据
   * @param saveId html保存id
   * @param tplFile 模板html路径
   * @param pluResPath 插件资源路径
   */
  get screenNote() {
    let headImg
    if (this.e?.isZzz) {
      return {
        saveId: this.userId,
        cwd: this._path,
        tplFile: `./plugins/genshin/resources/ZZZero/html/${this.model}/${this.model}.html`,
        /** 绝对路径 */
        fontsPath: `${this._path}/plugins/genshin/resources/fonts/`,
        pluResPath: `${this._path}/plugins/genshin/resources/ZZZero/`,
        genshinPath: `${this._path}/plugins/genshin/resources/`,
        headStyle: '',
        gstempFile: 'ZZZero/',
      }
    } else if (this.e?.isSr) {
      headImg = _.sample(fs.readdirSync(`${this._path}/plugins/genshin/resources/StarRail/img/worldcard`).filter(file => file.endsWith('.png')))
      return {
        saveId: this.userId,
        cwd: this._path,
        tplFile: `./plugins/genshin/resources/StarRail/html/${this.model}/${this.model}.html`,
        /** 绝对路径 */
        fontsPath: `${this._path}/plugins/genshin/resources/fonts/`,
        pluResPath: `${this._path}/plugins/genshin/resources/StarRail/`,
        genshinPath: `${this._path}/plugins/genshin/resources/`,
        headStyle: `<style> .head_box { background: url(${this._path}/plugins/genshin/resources/StarRail/img/worldcard/${headImg}) #fff; background-position-x: -10px; background-repeat: no-repeat; background-size: 660px; background-position-y: -100px; </style>`,
        gstempFile: 'StarRail/'
      }
    } else {
      headImg = _.sample(fs.readdirSync(`${this._path}/plugins/genshin/resources/img/namecard`).filter(file => file.endsWith('.png')))
      return {
        saveId: this.userId,
        cwd: this._path,
        tplFile: `./plugins/genshin/resources/genshin/html/${this.model}/${this.model}.html`,
        /** 绝对路径 */
        fontsPath: `${this._path}/plugins/genshin/resources/fonts/`,
        pluResPath: `${this._path}/plugins/genshin/resources/genshin/`,
        genshinPath: `${this._path}/plugins/genshin/resources/`,
        headStyle: `<style> .head_box { background: url(${this._path}/plugins/genshin/resources/img/namecard/${headImg}) #fff; background-position-x: 42px; background-repeat: no-repeat; background-size: auto 101%; }</style>`,
        gstempFile: 'genshin/'
      }
    }
  }
}
