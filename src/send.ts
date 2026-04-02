import type { EditMessageParams, RichButton, SendMessageParams, TelegramApiResponse } from './types.js'

const TELEGRAM_API = 'https://api.telegram.org'

function buildKeyboard(buttons: RichButton[][]): Record<string, unknown> {
  return {
    inline_keyboard: buttons.map(row =>
      row.map(btn =>
        btn.copy_text
          ? { text: btn.text, copy_text: btn.copy_text }
          : btn.url
          ? { text: btn.text, url: btn.url }
          : { text: btn.text, callback_data: btn.callback_data ?? btn.text }
      )
    ),
  }
}

/** Raw Telegram sendMessage. Zero dependencies — pure fetch. */
export async function sendMessage(params: SendMessageParams): Promise<TelegramApiResponse> {
  const { token, chatId, text, buttons, threadId, disableNotification } = params

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }

  if (buttons && buttons.length > 0) body['reply_markup'] = buildKeyboard(buttons)
  if (threadId) body['message_thread_id'] = threadId
  if (disableNotification) body['disable_notification'] = true

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json() as Promise<TelegramApiResponse>
}

/** Edit an existing message in-place. Enables live-updating messages. */
export async function editMessage(params: EditMessageParams): Promise<TelegramApiResponse> {
  const { token, chatId, messageId, text, buttons } = params

  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  }

  if (buttons && buttons.length > 0) body['reply_markup'] = buildKeyboard(buttons)

  const res = await fetch(`${TELEGRAM_API}/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json() as Promise<TelegramApiResponse>
}
