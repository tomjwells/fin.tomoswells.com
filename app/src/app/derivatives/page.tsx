import { Box, Card, Flex, Grid, Heading, IconButton, Popover, Skeleton, Text } from '@radix-ui/themes'
import { env } from '~/env'
import { redirect } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '~/shadcn/Tabs'
import SelectExpirationDate from './_components/SelectExpirationDate'
import SetStrike from './_components/SetStrike'
import { Asset } from '../markowitz/_components/fancy-multi-select'
import SelectTicker from './_components/SelectTicker'
import { Suspense } from 'react'
import React from 'react'
import z from 'zod'
import { InfoCircledIcon } from '@radix-ui/react-icons'

type Method = {
  label: string
  value: 'black-scholes' | 'monte-carlo' | 'binomial'
  tooltip?: string
}
const METHODS: Method[] = [
  {
    label: 'Black-Scholes',
    value: 'black-scholes',
  },
  {
    label: 'Monte Carlo',
    value: 'monte-carlo',
    tooltip:
      'Monte Carlo is a statistical method that relies on a large number of random trials. This randomness can be seen by refreshing the page multiple times, which shows the Monte Carlo result jump around with a mean of the correct value. The method can be made arbitrarily accurate by increasing the number of trials (although the computation will take longer).',
  },
  {
    label: 'Binomial',
    value: 'binomial',
  },
]

const pageParamsSchema = z.object({
  optionType: z.union([z.literal('american'), z.literal('european')]),
  T: z.string().refine((v) => /\d{4}-\d{2}-\d{2}/.test(v)),
  K: z.string().refine((v) => /^\d+(\.\d+)?$/.test(v)),
  ticker: z.string(),
})
export type PageParams = z.infer<typeof pageParamsSchema>
type OptionPriceParams = PageParams & {
  method: 'black-scholes' | 'monte-carlo' | 'binomial'
  instrument: 'call' | 'put'
}

export default async function MPTPage({ params, searchParams }: { params: { slug: string }; searchParams: Record<string, string | string[] | undefined> }) {
  const ticker = pageParamsSchema.shape.ticker.safeParse(searchParams.ticker).success ? (searchParams?.ticker as PageParams['ticker']) : 'TSLA'
  // Validate query params
  if (!pageParamsSchema.safeParse(searchParams).success)
    redirect(
      `?${new URLSearchParams({
        optionType: pageParamsSchema.shape.optionType.safeParse(searchParams.optionType).success ? (searchParams?.optionType as PageParams['optionType']) : 'european',
        T: pageParamsSchema.shape.T.safeParse(searchParams.T).success ? (searchParams?.T as PageParams['T']) : `${new Date().getFullYear() + 1}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-01`,
        ticker,
        K: pageParamsSchema.shape.K.safeParse(searchParams.K).success ? (searchParams?.K as PageParams['K']) : (await fetchUnderlyingPrice(ticker)).toFixed(0),
      })}`
    )

  const pageParams = pageParamsSchema.parse(searchParams)

  const methods = pageParams.optionType === 'european' ? METHODS : ([METHODS[2]] as Method[])

  const riskFreeRate = await fetch(`${env.APP_URL}/api/utils/risk-free-rate`, {
    next: { revalidate: 1 * 24 * 60 * 60 },
  }).then((r) => r.json())

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
              <TabsTrigger value={`/derivatives?${new URLSearchParams({ ...searchParams, optionType: 'european' })}`} selected={pageParams.optionType === 'european'}>
                European Option
              </TabsTrigger>
              <TabsTrigger value={`/derivatives?${new URLSearchParams({ ...searchParams, optionType: 'american' })}`} selected={searchParams?.optionType === 'american'}>
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
            <SelectTicker pageParams={pageParams} assets={(await fetch(`${env.APP_URL}/api/markowitz/stocks`).then((r) => r.json())) as Asset[]} />
          </Suspense>
          <Suspense>
            <SelectExpirationDate pageParams={pageParams} />
          </Suspense>
          <Suspense fallback={<Skeleton>Loading</Skeleton>}>
            <SetStrike pageParams={pageParams} currentPrice={await fetchUnderlyingPrice(pageParams.ticker)} />
          </Suspense>
        </Grid>

        <ul className='list-disc my-6 ml-6'>
          <li>The list of selectable companies is based on the S&P 500 index.</li>
          <li>
            <Text>The risk free rate is set by default to that of the three-month U.S. Treasury bill (currently: r = {(100 * riskFreeRate).toFixed(2)}%).</Text>
          </li>
        </ul>

        <Heading size='5'>Results</Heading>

        {methods.map(async ({ label, value, tooltip }) => (
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
                <Heading size='4' color='gray'>
                  Call Option
                </Heading>
                <Heading size='6'>
                  <Suspense fallback={<Skeleton>Loading</Skeleton>}>
                    <FetchOptionPrice {...pageParams} method={value} instrument='call' />
                  </Suspense>
                </Heading>
              </div>
              <div className='w-1/2'>
                <Heading size='4' color='gray'>
                  Put Option
                </Heading>
                <Heading size='6'>
                  <Suspense fallback={<Skeleton>Loading</Skeleton>}>
                    <FetchOptionPrice {...pageParams} method={value} instrument='put' />
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

const FetchOptionPrice = async (props: OptionPriceParams) => '$' + (await fetchOptionPrice(props)).toFixed(2)

const fetchOptionPrice = (props: OptionPriceParams) =>
  fetch(`${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(props)}`, {
    // Don't cache monte-carlo to show randomness
    cache: env.NODE_ENV === 'production' && props.method !== 'monte-carlo' ? 'force-cache' : 'no-store',
  }).then(async (res) => {
    if (!res.ok) {
      console.log('HTTP-Error: ' + res.status)
      const message = await res.text()
      console.log({ message })
      if (message.includes('less than T')) {
        redirect(`?${new URLSearchParams({ ...props, T: new Date().getFullYear() + '-' + (new Date().getMonth() + 2).toString().padStart(2, '0') + '-01' })}`)
      } else {
        console.log('Error URL:', `${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(props)}`)
      }
    }
    return (await res.json()) as number
  })

const fetchUnderlyingPrice = async (ticker: string) =>
  (
    (await fetch(`${env.APP_URL}/api/stock/${ticker}`, {
      next: { revalidate: 60 },
    }).then((r) => r.json())) as { price: number }
  ).price
