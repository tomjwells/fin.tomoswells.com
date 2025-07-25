import { Box, Card, Flex, Grid, Heading, IconButton, Popover, Skeleton, Text } from '@radix-ui/themes'
import { env } from '~/env'
import { redirect } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '~/shadcn/Tabs'
import SelectExpirationDate from './_components/SelectExpirationDate'
import SetStrike from './_components/SetStrike'
import SelectTicker from './_components/SelectTicker'
import React, { Suspense } from 'react'
import z from 'zod'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { fetchAssets, fetchRiskFreeRate, fetchUnderlyingPrice } from '~/sqlite'

export const runtime = 'edge' 

type Method = {
  label: string
  method: 'black-scholes' | 'monte-carlo' | 'binomial' | 'longstaff-schwartz'
  tooltip?: string
}
const METHODS: Method[] = [
  {
    label: 'Black-Scholes',
    method: 'black-scholes',
  },
  {
    label: 'Monte Carlo',
    method: 'monte-carlo',
    tooltip:
      'Monte Carlo is a statistical method that relies on a large number of random trials. This randomness can be seen by refreshing the page multiple times, which shows the Monte Carlo result jump around with a mean of the correct value. The method can be made arbitrarily accurate by increasing the number of trials (although the computation will take longer).',
  },
  {
    label: 'Binomial',
    method: 'binomial',
  },
  // {
  //   label: 'Longstaff-Schwartz',
  //   method: 'longstaff-schwartz',
  // },
]

const pageParamsSchema = z.object({
  optionType: z.union([z.literal('american'), z.literal('european')]),
  T: z.string().refine((v) => /\d{4}-\d{2}-\d{2}/.test(v)),
  K: z.string().refine((v) => /^\d+(\.\d+)?$/.test(v)),
  ticker: z.string(),
  R_f: z.string().refine((v) => /^\d+(\.\d+)?$/.test(v)),
})
export type PageParams = z.infer<typeof pageParamsSchema>
type OptionPriceParams = PageParams & {
  method: 'black-scholes' | 'monte-carlo' | 'binomial' | 'longstaff-schwartz'
  instrument: 'call' | 'put'
}

export default async function MPTPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = await searchParams
  const ticker = pageParamsSchema.shape.ticker.safeParse(resolvedSearchParams.ticker).success ? (resolvedSearchParams?.ticker as PageParams['ticker']) : 'TSLA'
  
  // Validate query params
  console.log({
    searchParams: resolvedSearchParams, ticker
  })
  if (!pageParamsSchema.safeParse(resolvedSearchParams).success) redirect(`?${new URLSearchParams({
        optionType: pageParamsSchema.shape.optionType.safeParse(resolvedSearchParams.optionType).success ? (resolvedSearchParams?.optionType as PageParams['optionType']) : 'european',
        T: pageParamsSchema.shape.T.safeParse(resolvedSearchParams.T).success ? (resolvedSearchParams?.T as PageParams['T']) : `${new Date().getFullYear() + 1}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-01`,
        ticker,
        K: pageParamsSchema.shape.K.safeParse(resolvedSearchParams.K).success ? (resolvedSearchParams?.K as PageParams['K']) : (await fetchUnderlyingPrice(ticker)).toFixed(0),
        R_f: pageParamsSchema.shape.R_f.safeParse(resolvedSearchParams.R_f).success ? (resolvedSearchParams?.R_f as PageParams['R_f']) : (await fetchRiskFreeRate).toString(),
      })}`)
  

  const pageParams = pageParamsSchema.parse(resolvedSearchParams)

  const methods = pageParams.optionType === 'european' ? ([METHODS[0], METHODS[1], METHODS[2]] as Method[]) : ([METHODS[2]] as Method[])




  return (
    <Card className='w-full before:![background-color:transparent] !p-6'>
      <Heading size='6'>Options Pricing</Heading>
      <Flex direction='column' gap='2' my='4'>
        <Heading as='h2' size='4'>
          Select an option type.
        </Heading>
        <div className=' container mx-16 w-full flex  items-center justify-center py-3'>
          <Tabs defaultValue='/derivatives?optionType=european' className='w-[400px]'>
            <TabsList>
              <TabsTrigger value={`/derivatives?${new URLSearchParams({ ...resolvedSearchParams, optionType: 'european' })}`} selected={pageParams.optionType === 'european'}>
                European Option
              </TabsTrigger>
              <TabsTrigger value={`/derivatives?${new URLSearchParams({ ...resolvedSearchParams, optionType: 'american' })}`} selected={resolvedSearchParams?.optionType === 'american'}>
                American Option
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Heading size='3' mb='2'>
          Option parameters
        </Heading>
        <Grid columns={{ initial: '1', sm: '3' }} gap='3' width='auto'>
          <Suspense fallback={<Skeleton>Loading</Skeleton>}>
            <SelectTicker pageParams={pageParams} assetsPromise={fetchAssets} />
          </Suspense>
          <Suspense>
            <SelectExpirationDate {...pageParams} />
          </Suspense>
          <Suspense fallback={<Skeleton>Loading</Skeleton>}>
            <SetStrike pageParams={pageParams} currentPricePromise={fetchUnderlyingPrice(ticker)} />
          </Suspense>
        </Grid>

        <ul className='list-disc my-6 ml-6'>
          <li>The list of selectable companies is based on the S&P 500 index.</li>
          <li>
            <Suspense>
              <Text>The risk free rate is set by default to that of the three-month U.S. Treasury bill (currently: r = {(100 * parseFloat(pageParams.R_f)).toFixed(2)}%).</Text>
            </Suspense>
          </li>
        </ul>

        <Heading size='5'>Results</Heading>

        {methods.map(async ({ label, method, tooltip }) => (
          <div key={label} className='flex flex-col gap-4 my-2'>
            <Flex gap='3'>
              <span className='flex flex-col gap-1 w-fit'>
                <Heading size='4' weight='bold' className='w-fit'>
                  {label}
                </Heading>
                <Box
                  style={{
                    height: '1px',
                    backgroundImage: 'linear-gradient(to right, transparent, var(--gray-a5) 30%, var(--gray-a5) 70%, transparent)',
                  }}
                />
              </span>
              {tooltip && (
                <Popover.Root>
                  <Popover.Trigger>
                    <IconButton variant='ghost' color='gray'>
                      <InfoCircledIcon />
                    </IconButton>
                  </Popover.Trigger>
                  <Popover.Content width='360px'>
                    <Text size='2'>{tooltip}</Text>
                  </Popover.Content>
                </Popover.Root>
              )}
            </Flex>
            <div className='flex gap-4'>
              <div className='w-1/2'>
                <Heading size='4' color='gray'>Call Option</Heading>
                <Heading size='6'>
                  <Suspense fallback={<Skeleton>Loading</Skeleton>}>
                    <OptionPrice {...pageParams} method={method} instrument='call' />
                  </Suspense>
                </Heading>
              </div>
              <div className='w-1/2'>
                <Heading size='4' color='gray'>Put Option</Heading>
                <Heading size='6'>
                  <Suspense fallback={<Skeleton>Loading</Skeleton>}>
                    <OptionPrice {...pageParams} method={method} instrument='put' />
                  </Suspense>
                </Heading>
              </div>
            </div>
          </div>
        ))}
      </Flex>
    </Card>
  )
}

async function OptionPrice(params: OptionPriceParams) {
  const price = await fetchOptionPrice(params)
  return `$${price.toFixed(2)}`
}

const fetchOptionPrice = (params: OptionPriceParams) =>
  fetch(`${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(params)}`, {
    cache: 'no-store',
  }).then(async (res) => {
    const clone = res.clone()

    if (!res.ok) {
      console.log('HTTP-Error: ' + res.status)
      const message = await clone.text()
      console.log({ message })
      if (message.includes('less than T')) {
        redirect(`?${new URLSearchParams({ ...params, T: new Date().getFullYear() + '-' + (new Date().getMonth() + 2).toString().padStart(2, '0') + '-01' })}`)
      } else {
        console.log('Error URL:', `${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(params)}`)
      }
    }
    return (await res.json()) as number
  })
