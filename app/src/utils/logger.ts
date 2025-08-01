import { env } from '~/env'

type TgPayload = { type: 'ERROR' | 'SUCCESS'; message: string }

const TG_URL = env.APP_URL && env.APP_URL.length > 0 ? `${env.APP_URL}/api/tg` : '/api/tg'

async function send(payload: TgPayload): Promise<void> {
  try {
    await fetch(TG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout?.(500), // 0.5 s hard cap
      keepalive: true as unknown as boolean,
    })
  } catch {
    /* never throw – logging must not break the caller */
  }
}

function serialise(arg: unknown): string {
  if (arg instanceof Error) return arg.stack ?? arg.toString()
  if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg, null, 2)
  return String(arg)
}

export const logger = {
  /** Usage: `await logger.success('OK')` */
  async success(...args: unknown[]): Promise<void> {
    await send({ type: 'SUCCESS', message: args.map(serialise).join(' ') })
  },

  /** Usage: `await logger.error('Boom', err)` */
  async error(...args: unknown[]): Promise<void> {
    await send({ type: 'ERROR', message: args.map(serialise).join(' ') })
  },
} as const