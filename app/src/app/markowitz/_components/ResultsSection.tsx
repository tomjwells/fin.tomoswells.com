import { Suspense } from 'react'
import NextLink from 'next/link'
import { Box, Card, Flex, Heading, Text, Link } from '@radix-ui/themes'
import { PageParams } from '../page'
import { env } from '~/env'
import z from 'zod'

import TangencyPortfolioPieChart  from './TangencyPortfolioPieChart'
import ChartJSChart               from './ChartJSChart'



export default async function ResultsSection({ pageParams }: { pageParams: PageParams }) {
  try {
    const data = await fetchMPT(pageParams)

    return (
      <Flex direction='column' gap='6'>
        {data.tickers.length < 2 && <Flex justify='center'>Enter two or more ticker symbols to see the efficient frontier.</Flex>}
        <Card className='!p-4' style={{ background: 'linear-gradient(145deg, hsl(260deg 4.23% 8.0%), hsl(260deg 4.23% 3.5%))' }}>
          <Box height='600px' width='9' p='4'>
            <Suspense>
              <ChartJSChart mptData={data} riskFreeRate={pageParams.r} tangencyPortfolio={data.tangency_portfolio} allowShortSelling={pageParams.allowShortSelling} />
            </Suspense>
          </Box>
        </Card>
        {data.tickers.length >= 2 && (
          <>
            <Flex direction='column' gap='4'>
              <Heading size='5'>Tangency Portfolio Metrics</Heading>
              <Flex gap='4'>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>Expected Return</Heading>
                  <Heading size='6'>{`${(100 * data.tangency_portfolio.return_).toFixed(1)}%`}</Heading>
                </div>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>Volatility</Heading>
                  <Heading size='6'>{`${(100 * data.tangency_portfolio.risk).toFixed(1)}%`}</Heading>
                </div>
              </Flex>
              <Flex gap='4'>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>Sharpe Ratio</Heading>
                  <Heading size='6'>{((data.tangency_portfolio.return_ - pageParams.r) / (data.tangency_portfolio.risk - 0)).toFixed(2)}</Heading>
                </div>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>Sortino Ratio</Heading>
                  <Heading size='6'>{((data.tangency_portfolio.return_ - pageParams.r) / Math.sqrt(data.sortino_variance)).toFixed(2)}</Heading>
                </div>
              </Flex>
            </Flex>
            <Suspense>
              <Heading size='4'>Tangency Portfolio Weights</Heading>
              <TangencyPortfolioPieChart mptData={data} pageParams={pageParams} />
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
          Something went wrong on the server. Large number of equities may cause the server to timeout before the request can be completed. Please either{' '}
          <Link asChild>
            <NextLink href={`?` + new URLSearchParams(pageParams as unknown as string).toString()}>try again</NextLink>
          </Link>
          , or reduce the number of equities.
        </Text>
        {env.NODE_ENV === 'development' && <Text>Error: {JSON.stringify(error)}</Text>}
      </Flex>
    )
  }
}

const MPTSchema = z.object({
  tickers: z.array(z.string()),
  efficient_frontier: z.array(
    z.object({
      weights: z.array(z.number()),
      return_: z.number(),
      risk: z.number(),
    })
  ),
  asset_datapoints: z.array(
    z.object({
      ticker: z.string(),
      return_: z.number(),
      risk: z.number(),
    })
  ),
  tangency_portfolio: z.object({
    weights: z.array(z.number()),
    return_: z.number(),
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

    const fetchURL = `${env.APP_URL}/api/markowitz/main?${queryParams}`
    console.log({ fetching: fetchURL })
    const response = await fetch(fetchURL, { next: { revalidate: env.NODE_ENV === 'production' ? 5 * 60 : 0 }, signal: AbortSignal.timeout(60_000) })
    try {
      void fetch(`${env.APP_URL}/api/tg/${encodeURIComponent(fetchURL + ' ' + "Request succeeded")}`)
      return MPTSchema.parse(await response.json())
    } catch (error) {
      console.error(JSON.stringify(error))
      void fetch(`${env.APP_URL}/api/tg/${encodeURIComponent(fetchURL + ' ' + JSON.stringify(error))}`)
      throw new Error('Failed to fetch MPT data')
    } 
  } else {
    return {
      tickers: [],
      efficient_frontier: [],
      asset_datapoints: [],
      tangency_portfolio: {
        weights: [],
        return_: 0,
        risk: 0,
      },
      sortino_variance: 0,
    }
  }
}