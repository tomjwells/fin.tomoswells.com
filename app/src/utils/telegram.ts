import TelegramBot from 'node-telegram-bot-api'
import { env } from '~/env'

class TGLogBot<T> {
  tg: TelegramBot
  private readonly MAX_MESSAGE_LENGTH = 4096

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
    const truncatedIfNecessary = message.length > this.MAX_MESSAGE_LENGTH ? message.substring(0, this.MAX_MESSAGE_LENGTH - (40+3)) + '...' : message
    await this.tg.sendMessage(env.TELEGRAM_CHAT_ID, `🛑 ERROR OCURRED (${where}): ${truncatedIfNecessary}`)
  }
  async success(where: string, ...args: T[]) {
    const message = args.map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 4) : arg)).join(' ')
    const truncatedIfNecessary = message.length > this.MAX_MESSAGE_LENGTH ? message.substring(0, this.MAX_MESSAGE_LENGTH - (40+3)) + '...' : message
    await this.tg.sendMessage(env.TELEGRAM_CHAT_ID, `🟢 SUCCESS OCURRED (${where}): ${truncatedIfNecessary}`)
  }
}

const tg = new TGLogBot()
export { tg }
