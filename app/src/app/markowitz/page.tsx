import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Box, Card, Flex, Heading, Text, Link, Spinner } from '@radix-ui/themes'
import { FancyMultiSelect } from './_components/fancy-multi-select'
import { env } from '~/env'
import RiskFreeRateSlider from './_components/RiskFreeRateSlider'
import z from 'zod'
import ChartJSChart from './_components/ChartJSChart'
import AdvancedControls from './_components/AdvancedControls'
import NextLink from 'next/link'
import AllowShortSelling from './_components/AllowShortSellingSwitch'
import { fetchAssets, fetchRiskFreeRate } from '~/sqlite'
import TangencyPortfolioPieChart from './_components/TangencyPortfolioPieChart'

const pageParamsSchema = z.object({
  assets: z.array(z.string()).optional().default([]),
  r: z.coerce
    .number()
    .min(0)
    .transform((v) => (v < 0 ? 0 : v)),
  startYear: z.coerce.number().min(2000).max(new Date().getFullYear()),
  endYear: z.coerce.number().min(2000).max(new Date().getFullYear()),
  allowShortSelling: z.enum(['true', 'false']).transform((value) => value === 'true'),
})
export type PageParams = z.infer<typeof pageParamsSchema>

const formatPercent = (num: number) => `${(100 * num).toFixed(1)}%`

export default async function MPTPage({ params, searchParams }: { params: { slug: string }; searchParams?: Record<string, string | string[] | undefined> }) {
  const parsedParams = pageParamsSchema.safeParse(searchParams)
  if (!parsedParams.success) {
    const params = new URLSearchParams()
    // const defaultAssets = ['META', 'AAPL', 'TSLA', 'MSFT', 'NFLX', 'PYPL', 'ABNB', 'GOOG', 'BRK']
    const [assets, riskFreeRate] = await Promise.all([fetchAssets, fetchRiskFreeRate])
    getRandomElements(assets, 80).forEach((asset) => params.append('assets', asset))
    params.append('r', `${riskFreeRate}`)
    params.append('startYear', `${new Date().getFullYear() - 10}`)
    params.append('endYear', `${new Date().getFullYear()}`)
    params.append('allowShortSelling', `${false}`)
    redirect(`?${params.toString()}`)
  }
  const pageParams = parsedParams.data

  return (
    <Card className='w-full before:![background-color:transparent] !p-5'>
      <Flex direction='column' gap='2' mb='4'>
        <Heading size='6'>Modern Portfolio Theory</Heading>
        <Text size='1'>
          A derivation of the formulae used for this implementation of Markowtiz’s Modern Portfolio Theory (MPT) can be found{' '}
          <Link asChild>
            <NextLink target='_blank' href={`https://github.com/tomjwells/finance/blob/master/mathematics/Markowitz_Theory.pdf`}>
              here
            </NextLink>
          </Link>
          . The code (Python) for the implementation is available{' '}
          <Link asChild>
            <NextLink target='_blank' href={`https://github.com/tomjwells/finance/blob/master/modules/markowitz/main.py`}>
              here
            </NextLink>
          </Link>
          .
        </Text>
      </Flex>

      <Flex direction='column' gap='2' my='4'>
        <Heading size='3'>Choose a collection of assets to consider for a candidate portfolio.</Heading>
        <Text size='1' color='gray'>
          Hint: Start typing to find a particular ticker. Use backspace to remove tickers quickly. The list of selectable tickers comes from the stocks in the S&P 500.
        </Text>
        <Suspense>
          <FancyMultiSelect assets={await fetchAssets} pageParams={pageParams} />
        </Suspense>
        <Text>The efficient frontier (the set of portfolios that yield the highest return for a given level of risk) is indicated by the solid white line.</Text>

        <div className='flex flex-col my-4'>
          <Heading size='3'>Allow Short Selling</Heading>
          <Text size='2'>Select whether to allow short positions within the portolio.</Text>
          <Suspense>
            <AllowShortSelling {...pageParams} />
          </Suspense>
        </div>

        <div className='my-4'>
          <Heading size='3'>Risk free rate</Heading>
          <Text size='2'>The risk free rate is set by default to the yield of the three-month U.S. Treasury bill, but it can be changed to any other value.</Text>
          <Suspense>
            <RiskFreeRateSlider {...pageParams} />
          </Suspense>
        </div>

        <AdvancedControls pageParams={pageParams} />

        <Heading size='5' mt='4'>
          Results
        </Heading>
        <Suspense
          fallback={
            <Flex justify='center' align='center' height='400px'>
              <Spinner size='3' />
            </Flex>
          }
        >
          <ResultsSection pageParams={pageParams} searchParams={searchParams} />
        </Suspense>
      </Flex>
    </Card>
  )
}

const MPTSchema = z.object({
  tickers: z.array(z.string()),
  efficient_frontier: z.array(
    z.object({
      weights: z.array(z.number()),
      return: z.number(),
      risk: z.number(),
    })
  ),
  asset_datapoints: z.array(
    z.object({
      ticker: z.string(),
      return: z.number(),
      risk: z.number(),
    })
  ),
  returns: z.array(z.array(z.number())),
  tangency_portfolio: z.object({
    weights: z.array(z.number()),
    return: z.number(),
    risk: z.number(),
  }),
  sortino_variance: z.number(),
})
export type MPTData = z.infer<typeof MPTSchema>

async function fetchMPT(pageParams: PageParams) {
  if (pageParams.assets.length >= 2) {
    const queryParams = new URLSearchParams()
    pageParams.assets.forEach((asset) => queryParams.append('assets', asset))
    queryParams.append('startYear', pageParams.startYear.toString())
    queryParams.append('endYear', pageParams.endYear.toString())
    queryParams.append('r', pageParams.r.toString())
    queryParams.append('allowShortSelling', pageParams.allowShortSelling.toString())

    // Custom timeout to allow fetch to wait longer
    AbortSignal.timeout ??= function timeout(ms) {
      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), ms)
      return ctrl.signal
    }

    console.log({ fetching: `${env.APP_URL}/api/markowitz/main?${queryParams}` })
    const response = await fetch(`${env.APP_URL}/api/markowitz/main?${queryParams}`, { cache: 'no-cache', signal: AbortSignal.timeout(60_000) })
    return MPTSchema.parse(await response.json())
  } else {
    return {
      tickers: [],
      efficient_frontier: [],
      asset_datapoints: [],
      returns: [],
      tangency_portfolio: {
        weights: [],
        return: 0,
        risk: 0,
      },
      sortino_variance: 0,
    }
  }
}

async function ResultsSection({ pageParams, searchParams }: { pageParams: PageParams; searchParams?: Record<string, string | string[] | undefined> }) {
  try {
    const data = await fetchMPT(pageParams)

    return (
      <Flex direction='column' gap='6'>
        {data.tickers.length < 2 && <Flex justify='center'>Enter two or more ticker symbols to see the efficient frontier.</Flex>}
        <Card
          className='!p-4'
          style={{
            background: 'linear-gradient(145deg, hsl(260deg 4.23% 8.0%), hsl(260deg 4.23% 3.5%))',
          }}
        >
          <Box height='600px' width='9' p='4'>
            <Suspense>
              <ChartJSChart mptData={data} riskFreeRate={pageParams.r} tangencyPortfolio={data.tangency_portfolio} allowShortSelling={pageParams.allowShortSelling} />
            </Suspense>
          </Box>
        </Card>
        {data.tickers.length >= 2 && (
          <>
            <div className='flex flex-col gap-4'>
              <Heading size='5'>Metrics</Heading>
              <div className='flex gap-4'>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Expected Return
                  </Heading>
                  <Heading size='6'>{formatPercent(data.tangency_portfolio.return)}</Heading>
                </div>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Volatility
                  </Heading>
                  <Heading size='6'>{formatPercent(data.tangency_portfolio.risk)}</Heading>
                </div>
              </div>
              <div className='flex gap-4'>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Sharpe Ratio
                  </Heading>
                  <Heading size='6'>{((data.tangency_portfolio.return - pageParams.r) / (data.tangency_portfolio.risk - 0)).toFixed(2)}</Heading>
                </div>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Sortino Ratio
                  </Heading>
                  <Heading size='6'>{((data.tangency_portfolio.return - pageParams.r) / Math.sqrt(data.sortino_variance)).toFixed(2)}</Heading>
                </div>
              </div>
            </div>
            <Suspense>
              <Heading size='4'>The Tangency Portfolio</Heading>
              <TangencyPortfolioPieChart mptData={data} />
            </Suspense>
          </>
        )}
      </Flex>
    )
  } catch (error) {
    console.error(JSON.stringify(error))
    return (
      <Flex direction='column' justify='center'>
        <Text color='red'>
          Something went wrong on the server. The server can time out (after 10s) if a large number of equities are passed as arguments. Please either{' '}
          <Link asChild>
            <NextLink href={`?` + new URLSearchParams(searchParams as unknown as string).toString()}>try again</NextLink>
          </Link>
          , or reduce the number of equities.
        </Text>
        {env.NODE_ENV === 'development' && <Text>Error: {JSON.stringify(error)}</Text>}
      </Flex>
    )
  }
}

function getRandomElements(arr: string[], count: number): string[] {
  let result: Set<string> = new Set()
  while (result.size < count && result.size < arr.length) {
    let randomIndex = Math.floor(Math.random() * arr.length)
    result.add(arr[randomIndex] || '')
  }
  return Array.from(result)
}
