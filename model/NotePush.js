import { sendWithTimeout } from './PushSend.js'

export async function sendNoteReminder (contact, message, timeoutMs) {
  const result = await sendWithTimeout(() => contact.sendMsg(message), timeoutMs)
  const ids = result?.message_id
  const hasReceipt = Array.isArray(ids) ? ids.some(Boolean) : Boolean(ids || result?.id)
  if (result !== true && !hasReceipt) throw new Error('适配器未返回成功凭证')
}
