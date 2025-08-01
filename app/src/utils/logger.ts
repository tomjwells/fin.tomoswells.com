import { env } from '~/env'

type TgPayload = {
  type: 'ERROR' | 'SUCCESS'
  message: string
}

async function send(payload: TgPayload) {
  try {
    const url = typeof env.APP_URL === 'string' && env.APP_URL.length > 0 ? `${env.APP_URL}/api/tg` : '/api/tg'

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout?.(1_000), // 1-second timeout so it can’t hang an Edge function
    })
  } catch {
    /* silent – logging must never throw */
  }
}

function serialise(arg: unknown): string {
  // Handle Errors specifically to get a useful message and stack trace
  if (arg instanceof Error) {
    return arg.stack ?? arg.toString()
  }
  // Use JSON for other non-null objects and arrays
  if (typeof arg === 'object' && arg !== null) {
    return JSON.stringify(arg, null, 2)
  }
  // Primitives, null, and undefined can be safely converted to a string
  return String(arg)
}

export const logger = {
  /**
   * Report a success.  
   * Usage: `void logger.success('Request OK')`
   */
  success(...args: unknown[]) {
    void send({ type: 'SUCCESS', message: args.map(serialise).join(' ') })
  },

  /**
   * Report an error.  
   * Usage: `void logger.error(err)` or `void logger.error('Bad stuff', err)`
   */
  error(...args: unknown[]) {
    void send({ type: 'ERROR', message: args.map(serialise).join(' ') })
  },
} as const
