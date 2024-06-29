import { createClient } from '@libsql/client/web'
import { env } from './env'

if (!env.TURSO_DATABASE_URL) {
  throw new Error('TURSO_DATABASE_URL is not set')
}

if (!env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN is not set')
}

export const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
  fetch: (url: string, options: any) => fetch(url, { ...options, next: { revalidate: env.NODE_ENV === 'production' ? 5 * 60 : 0 } }),
})

// Utils
730
export const fetchRiskFreeRate = db.execute(`SELECT * FROM 'risk_free_rate'`).then(({ rows }) => (rows[rows.length - 1]?.['Adj Close'] ?? 0.05) as number)

export const fetchAssets = db.execute(`PRAGMA table_info(price_history);`).then(({ rows }) =>
  rows
    .slice(1)
    .map((row) => row.name)
    .filter((name): name is string => name !== undefined)
)

export const fetchUnderlyingPrice = (ticker: string) => {
  // Check ticker is safe
  if (!/^[a-zA-Z0-9_]+$/.test(ticker)) throw new Error('Invalid ticker')
  // DB price will be slightly outdated, so use an API instead
  // return db.execute(`SELECT ${ticker} FROM price_history ORDER BY Date DESC LIMIT 1`).then(({ rows }) => rows[0]?.[ticker] as number)
  return fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker.replace('_', '-')}?range=1d&interval=5m`)
    .then((res) => res.json())
    .then((data) => data.chart.result[0].meta.regularMarketPrice as number)
}
