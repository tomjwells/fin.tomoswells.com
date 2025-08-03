import { env } from '~/env'

const CACHE_DURATION = 5 * 60

const getJSON = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    next: { revalidate: env.NODE_ENV === 'production' ? CACHE_DURATION : 0 },
  })
  if (!res.ok) throw new Error(`[fetchers] ${url} → ${res.status}`)
  return res.json() as Promise<T>
}

export const fetchRiskFreeRate = () =>
  getJSON<{ rate: number }>(`${env.APP_URL}/api/risk_free_rate`).then((d) => d.rate ?? 0.05)

export const fetchAssets = () =>
  getJSON<string[]>(`${env.APP_URL}/api/assets`)

export const fetchUnderlyingPrice = (ticker: string) => {
  if (!/^[A-Za-z0-9_]+$/.test(ticker)) throw new Error('Invalid ticker')
  return getJSON<{ price: number }>(`${env.APP_URL}/api/underlying_price/${ticker}`).then((d) => d.price)
}