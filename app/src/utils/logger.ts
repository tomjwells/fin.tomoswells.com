import { env } from '~/env'

type TgPayload = {
  type: 'ERROR' | 'SUCCESS'
  message: string
}

async function send(payload: TgPayload) {
  try {
    const url = typeof env.APP_URL === 'string' && env.APP_URL.length > 0 ? `${env.APP_URL}/api/tg` : '/api/tg'

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    //   signal: AbortSignal.timeout?.(1_000), // 1-second timeout so it can’t hang an Edge function
    })
  } catch {
    /* silent – logging must never throw */
  }
}

function serialise(arg: unknown): string {
  if (arg instanceof Error) return arg.stack ?? arg.toString()
  if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg, null, 2)
  return String(arg)
}

export const logger = {
  success(...args: unknown[]) {
    void send({ type: 'SUCCESS', message: args.map(serialise).join(' ') })
  },
  error(...args: unknown[]) {
    void send({ type: 'ERROR', message: args.map(serialise).join(' ') })
  },
} as const
