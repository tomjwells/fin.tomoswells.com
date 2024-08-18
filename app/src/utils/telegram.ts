import TelegramBot from 'node-telegram-bot-api'
import { env } from '~/env'

class TGLogBot<T> {
  tg: TelegramBot

  constructor() {
    this.tg = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
      filepath: false,
    })
  }
  async log(...args: T[]) {
    const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 4) : arg)).join(' ')
    try {
      await this.tg.sendMessage(env.TELEGRAM_CHAT_ID, message)
    } catch (e) {
      if (e instanceof Error && e.message === 'message is too long') {
        const chunks = message.match(/.{1,4096}/g)
        if (chunks) {
          for (const chunk of chunks) {
            await this.tg.sendMessage(env.TELEGRAM_CHAT_ID, chunk)
          }
        }
      }
    }
  }
  async error(where: string, ...args: T[]) {
    const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 4) : arg)).join(' ')
    await this.tg.sendMessage(env.TELEGRAM_CHAT_ID, `🛑 ERROR OCURRED (${where}): ${message}`)
  }
}

const tg = new TGLogBot()
export { tg }
