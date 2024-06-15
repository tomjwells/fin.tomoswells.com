/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

createJiti(fileURLToPath(import.meta.url))('./src/env.ts')

/** @type {import("next").NextConfig} */
const config = {
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/api/:path*'
            : `${process.env.API_URL}/api/:path*`,
      },
    ]
  },
}

export default config;
