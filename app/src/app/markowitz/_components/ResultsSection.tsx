import { Suspense } from 'react'
import NextLink from 'next/link'
import { Box, Card, Flex, Heading, Text, Link, Spinner } from '@radix-ui/themes'
import z from 'zod'
import { MPTData, PageParams } from '../page'
import TangencyPortfolioPieChart  from './TangencyPortfolioPieChart'
import ChartJSChart               from './ChartJSChart'
import { env } from '~/env'

const formatPercent = (num: number) => `${(100 * num).toFixed(1)}%`


export default async function ResultsSection({ mptPromise, pageParams, }: { mptPromise: Promise<MPTData>; pageParams: PageParams }) {
  try {
    const data = await mptPromise

    return (
      <Flex direction='column' gap='6'>
        {data.tickers.length < 2 && <Flex justify='center'>Enter two or more ticker symbols to see the efficient frontier.</Flex>}
        <Card
          className='!p-4'
          style={{ background: 'linear-gradient(145deg, hsl(260deg 4.23% 8.0%), hsl(260deg 4.23% 3.5%))' }}
        >
          <Box height='600px' width='9' p='4'>
            <Suspense>
              <ChartJSChart mptData={data} riskFreeRate={pageParams.r} tangencyPortfolio={data.tangency_portfolio} allowShortSelling={pageParams.allowShortSelling} />
            </Suspense>
          </Box>
        </Card>
        {data.tickers.length >= 2 && (
          <>
            <Flex direction='column' gap='4'>
              {/* <div className='flex flex-col gap-4'> */}
              <Heading size='5'>Tangency Portfolio Metrics</Heading>
              <Flex gap='4'>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Expected Return
                  </Heading>
                  <Heading size='6'>{formatPercent(data.tangency_portfolio.return_)}</Heading>
                </div>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Volatility
                  </Heading>
                  <Heading size='6'>{formatPercent(data.tangency_portfolio.risk)}</Heading>
                </div>
              </Flex>
              <Flex gap='4'>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Sharpe Ratio
                  </Heading>
                  <Heading size='6'>{((data.tangency_portfolio.return_ - pageParams.r) / (data.tangency_portfolio.risk - 0)).toFixed(2)}</Heading>
                </div>
                <div className='w-1/2'>
                  <Heading size='4' color='gray'>
                    Sortino Ratio
                  </Heading>
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
