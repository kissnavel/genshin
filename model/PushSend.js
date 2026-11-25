const sendTimeout = 60_000 // 每条推送最多等待 60 秒。

export async function sendWithTimeout (action, timeoutMs = sendTimeout) {
  let timer
  try {
    const timeout = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('发送超时，未确认送达')), timeoutMs)
    })
    const result = await Promise.race([Promise.resolve().then(action), timeout])
    // QQBot 可能同时返回部分消息 ID 和错误；有错误仍视为发送失败。
    if (result?.error && (!Array.isArray(result.error) || result.error.length)) {
      const error = Array.isArray(result.error) ? result.error[0] : result.error
      const detail = error?.message || (typeof error === 'string' ? error : '')
      throw new Error(detail ? `适配器报告发送失败或部分成功：${detail}` : '适配器报告发送失败或部分成功')
    }
    return result
  } finally {
    clearTimeout(timer)
  }
}
