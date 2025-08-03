// utils/fetchers.ts
import { env } from '~/env'

const CACHE_DURATION = 5 * 60

/** helper that applies ISR-style caching to any GET */
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: env.NODE_ENV === 'production' ? CACHE_DURATION : 0 },
  })
  if (!res.ok) throw new Error(`[fetchers] ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

/* ------------------------------------------------------------------ */
/* 1. Risk-free rate (single value)                                   */
/* ------------------------------------------------------------------ */
export const fetchRiskFreeRate: Promise<number> = getJSON<{ rate: number }>(
  `${env.APP_URL}/api/risk_free_rate`,
).then((d) => d.rate ?? 0.05)

/* ------------------------------------------------------------------ */
/* 2. List of asset columns                                           */
/* ------------------------------------------------------------------ */
export const fetchAssets: Promise<string[]> = getJSON<string[]>(
  `${env.APP_URL}/api/assets`,
)

/* ------------------------------------------------------------------ */
/* 3. Latest price for a given column                                 */
/* ------------------------------------------------------------------ */
export async function fetchUnderlyingPrice(ticker: string): Promise<number> {
  if (!/^[A-Za-z0-9_]+$/.test(ticker)) throw new Error('Invalid ticker')
  const data = await getJSON<{ price: number }>(
    `${env.APP_URL}/api/underlying_price/${ticker}`,
  )
  return data.price
}
