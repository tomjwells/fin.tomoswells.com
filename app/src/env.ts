import { createEnv } from '@t3-oss/env-nextjs'
import * as z from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: z.string().url(),
    API_URL: z.string().url(),
    TURSO_DATABASE_URL: z.string().url(),
    TURSO_AUTH_TOKEN: z.string(),
    HOME: z.string(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})
