import type { SendMessageParams, TelegramApiResponse } from './types.js'

const TELEGRAM_API = 'https://api.telegram.org'

/** Raw Telegram sendMessage. Zero dependencies — pure fetch. */
export async function sendMessage(params: SendMessageParams): Promise<TelegramApiResponse> {
  const { token, chatId, text, buttons } = params

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  }

  if (buttons && buttons.length > 0) {
    body['reply_markup'] = {
      inline_keyboard: buttons.map(row =>
        row.map(btn =>
          btn.url
            ? { text: btn.text, url: btn.url }
            : { text: btn.text, callback_data: btn.callback ?? btn.text }
        )
      ),
    }
  }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json() as Promise<TelegramApiResponse>
}
