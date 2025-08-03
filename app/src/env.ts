import { createEnv } from '@t3-oss/env-nextjs'
import * as z from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: z.string().url(),
    API_URL: z.string().url(),
    HOME_UID: z.string(),
    TELEGRAM_BOT_TOKEN: z.string(),
    TELEGRAM_CHAT_ID: z.string(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})
