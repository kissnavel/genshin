import puppeteer from '../../../lib/puppeteer/puppeteer.js'
import base from './base.js'

export default class CdkExchange extends base {
  constructor(e) {
    super(e)
    this.model = 'CdkExchange'
  }

  async render(data) {
    let screenData = this.screenData
    screenData.tplFile = `${this._path}/plugins/genshin/resources/CdkExchange/html/exchange/exchange.html`
    screenData.pluResPath = `${this._path}/plugins/genshin/resources/CdkExchange/`

    return puppeteer.screenshot('CdkExchange/exchange', {
      ...screenData,
      saveId: `${this.e.user_id}-${Date.now()}`,
      quality: 100,
      ...data
    })
  }
}
