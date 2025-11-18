import express from 'express'
import Cfg from '../Cfg.js'
import _ from 'lodash'

let tmp = {}
let isRegister = {}
let result = {}
const Path = 'https://img-hut.top/gt/'
export default class GT_Manual {
  constructor() {
    this.cfg = Cfg.api
    this.app = express()
  }

  load () {
    this.app.listen(this.cfg.Port)
    this.app.use(express.static(process.cwd()))
    this.app.use(express.urlencoded({ extended: false }))
    this.app.use(express.json())
    this.app.get('/GTest/:key', this.index)
    this.app.post('/GTest/register', this.register)
    this.app.get('/GTest/register/:key', this.get_register)
    this.app.post('/GTest/validate/:key', this.validate)
    this.app.get('/GTest/validate/:key', this.get_validate)
    this.app.use(this.invalid)
    this.app.use(this.error)
    logger.info(`[genshin]手动接口启动, http://${this.cfg.Host}:${this.cfg.Port}/GTest/register`)
  }

  index (req, res, next) {
    let { key } = req.params
    if (!key || !isRegister[key]) return next('验证信息不存在或已失效。')
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>GTest</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
    <link rel="stylesheet" href="${Path}style.css">
  </head>
  <body>
    <h1></h1><br>
    <div id="captcha" key="${key}">
      <button id="btn"><span>点击验证</span></button>
      <div id="wait" class="show">
        <div class="progress"></div>
      </div>
    </div>
    <footer id="footer">
      <p class="copyright">Copyright GT-Manual</p>
    </footer>
    <script src="${Path}jquery.min.js"></script>
    <script src="${Path}gt.js"></script>
    <script src="${Path}script.js"></script>
  </body>
</html>`)
  }

  /** 验证信息, post传mys接口res.data */
  register (req, res, next) {
    let key; let { gt, challenge } = req.body || {}
    if (!gt || !challenge) return next('0')
    for (let i = 0; i < 10; i++) {
      key = _.sampleSize('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6).join('')
      if (isRegister[key] || result[key]) continue
      break
    }
    tmp[key] = req.body
    isRegister[key] = 1
    /** 未点击2分钟后删除 */
    setTimeout(() => delete tmp[key] && delete isRegister[key], 120000)
    GT_Manual.send(res, {
      link: `${Cfg.api.Address}/GTest/${key}`,
      result: `${Cfg.api.Address}/GTest/validate/${key}`
    })
  }

  /** 浏览器获取gt参数 */
  get_register (req, res, next) {
    let { key } = req.params
    if (!key || !tmp[key]) return next('该验证信息已被使用，若非本人操作请重新获取')
    res.send(tmp[key] || {})
    delete tmp[key]
  }

  /** 浏览器返回validate */
  validate (req, res, next) {
    let { key } = req.params
    if (!key || !req.body) return next('0')
    result[key] = req.body
    setTimeout(() => delete result[key], 30000)
    GT_Manual.send(res, {})
    delete isRegister[key]
  }

  /** 获取验证结果validate */
  get_validate (req, res, next) {
    let { key } = req.params
    if (!key) return next('0')
    GT_Manual.send(res, result[key] || null)
  }

  static send (res, data, message = 'OK') {
    res.send({
      status: Number(!data),
      message,
      data
    })
  }

  invalid (res) {
    if (!res.finished) res.status(404).end()
  }

  error (err, res) {
    let message = err?.message || (err && err !== '0' && `${err}`) || 'Invalid request'
    if (!res.finished) res.send({ status: 1, message })
  }
}
