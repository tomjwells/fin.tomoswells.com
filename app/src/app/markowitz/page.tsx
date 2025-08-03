import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import NextLink from 'next/link'
import { Card, Flex, Heading, Text, Link, Spinner } from '@radix-ui/themes'
import z from 'zod'

import FancyMultiSelect           from './_components/FancyMultiSelect'
import RiskFreeRateSlider         from './_components/RiskFreeRateSlider'
import DateRangeSlider            from './_components/DateRangeSlider'
import AllowShortSelling          from './_components/AllowShortSellingSwitch'
import ResultsSection             from './_components/ResultsSection'

import { fetchAssets, fetchRiskFreeRate } from '~/utils/fetchers'

export const dynamic = 'force-dynamic'
export const runtime = 'edge' 

const pageParamsSchema = z.object({
  assets: z.array(z.string()).optional().default([]),
  r: z.coerce.number().min(0).transform((v) => (v < 0 ? 0 : v)),
  startYear: z.coerce.number().min(1980).max(new Date().getFullYear()),
  endYear: z.coerce.number().min(1980).max(new Date().getFullYear()),
  allowShortSelling: z.enum(['true', 'false']).transform((value) => value === 'true'),
})
export type PageParams = z.infer<typeof pageParamsSchema>


export default async function MPTPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = await searchParams
  const { data: pageParams, success } = pageParamsSchema.safeParse(resolvedSearchParams)

  if (!success) {
    console.log({searchParams: resolvedSearchParams, pageParams, success}) // Log to server
    const params = new URLSearchParams()
    const [assets, riskFreeRate] = await Promise.all([fetchAssets(), fetchRiskFreeRate()])
    getRandomElements(assets, 40).forEach((asset) => params.append('assets', asset))
    params.append('r', `${riskFreeRate}`)
    params.append('startYear', `${new Date().getFullYear() - 10}`)
    params.append('endYear', `${new Date().getFullYear()}`)
    params.append('allowShortSelling', `${false}`)
    redirect(`?${params.toString()}`)
  }

  return (
    <Card className='w-full before:![background-color:transparent] !p-5'>
      <Flex direction='column' gap='2' mb='4'>
        <Heading size='6'>Modern Portfolio Theory</Heading>
        <Text size='1'>
          Derivations of the formulae used in this implementation of Markowtiz’s Modern Portfolio Theory (MPT) are provided in{' '}
          <Link asChild>
            <NextLink target='_blank' href='https://github.com/tomjwells/finance/blob/master/mathematics/Markowitz_Theory.pdf'>
              this document
            </NextLink>
          </Link>
          . Their Python implementation is available{' '}
          <Link asChild>
            <NextLink target='_blank' href='https://github.com/tomjwells/finance/blob/master/modules/markowitz/main.py'>
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
          <FancyMultiSelect assetsPromise={fetchAssets()} pageParams={pageParams} />
        </Suspense>

        <div className='flex flex-col my-4'>
          <Heading size='3'>Allow Short Selling</Heading>
          <Text size='2'>Select whether to allow short positions within the portolio.</Text>
          <Suspense>
            <AllowShortSelling {...pageParams} />
          </Suspense>
        </div>

        <Flex direction='column' gap='2' className='my-4'>
          <div>
            <Heading size='3'>Risk free rate</Heading>
            <Suspense>
              <Text size='2'>
                The risk free rate is used to calculate the tangency portfolio. The current yield of the 3-month U.S. Treasury bill is {(100 * (await fetchRiskFreeRate())).toFixed(2)}%.
              </Text>
            </Suspense>
          </div>
          <Suspense>
            <RiskFreeRateSlider {...pageParams} />
          </Suspense>
        </Flex>

        <Flex direction='column' gap='2' className='my-4'>
          <div>
            <Heading size='3'>Date Range</Heading>
            <Text size='2'>Asset statistics are calculated based on price action during a date range. Use the slider to adjust the date range used for the calculation.</Text>
          </div>
          <DateRangeSlider pageParams={pageParams} />
        </Flex>

        <Flex direction='column' gap='2' className='my-4'>
          <Text>The efficient frontier, or set of efficient portfolios is indicated by the solid white line. These portfolios are "efficient"/optimal in the sense that they achieve the minimized risk (volatility) for a given level of expected return.</Text>
        </Flex>

        <Heading size='5' mt='4'>Results</Heading>
        <Suspense fallback={<Flex justify='center' align='center' height='400px'><Spinner size='3' /></Flex>}>
          <ResultsSection pageParams={pageParams} />
        </Suspense>
      </Flex>
    </Card>
  )
}

function getRandomElements(arr: string[], count: number): string[] {
  const result = new Set<string>()
  while (result.size < count && result.size < arr.length) {
    const randomIndex = Math.floor(Math.random() * arr.length)
    result.add(arr[randomIndex] || '')
  }
  return Array.from(result)
}
