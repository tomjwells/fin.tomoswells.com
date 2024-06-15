import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Box, Card, Flex, Heading, Text, Link, Spinner } from '@radix-ui/themes'
import { FancyMultiSelect } from './_components/fancy-multi-select'
import type { Asset } from './_components/fancy-multi-select'
import { env } from '~/env'
import RiskFreeRateSlider from './_components/RiskFreeRateSlider'
import z from 'zod'
import TangencyPortfolioPieChart from './_components/TangencyPortfolioPieChart'
import ChartJSChart from './_components/ChartJSChart'
import AdvancedControls from './_components/AdvancedControls'
import NextLink from 'next/link'
import { Vector, Matrix } from 'ts-matrix'
import AllowShortSelling from './_components/AllowShortSellingSwitch'

const pageParamsSchema = z.object({
  assets: z.array(z.string()),
  r: z.coerce
    .number()
    .min(0)
    .transform((v) => (v < 0 ? 0 : v)),
  startYear: z.coerce.number().min(2000).max(new Date().getFullYear()),
  endYear: z.coerce.number().min(2000).max(new Date().getFullYear()),
  allowShortSelling: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true'),
})
export type PageParams = z.infer<typeof pageParamsSchema>

const formatPercent = (num: number) => `${(100 * num).toFixed(1)}%`
const fetchRiskFreeRate = async () =>
  parseFloat(
    (
      (await fetch(`${env.APP_URL}/api/utils/risk-free-rate`).then((r) =>
        r.json()
      )) as number
    ).toFixed(6)
  )
const fetchAssets = async () =>
  (await fetch(`${env.APP_URL}/api/markowitz/stocks`).then((r) =>
    r.json()
  )) as Asset[]

export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const parsedParams = pageParamsSchema.safeParse(searchParams)
  if (!parsedParams.success) {
    const params = new URLSearchParams()
    const defaultAssets = [
      'META',
      'AAPL',
      'TSLA',
      'MSFT',
      'NFLX',
      'PYPL',
      'ABNB',
      'GOOG',
      'BKR',
    ]
    defaultAssets.forEach((asset) => params.append('assets', asset))
    params.append('r', `${await fetchRiskFreeRate()}`)
    params.append('startYear', `${new Date().getFullYear() - 10}`)
    params.append('endYear', `${new Date().getFullYear()}`)
    params.append('allowShortSelling', `${true}`)
    redirect(`?${params.toString()}`)
  }
  const pageParams = parsedParams.data
  const assets = await fetchAssets()

  return (
    <Card className='w-full before:![background-color:transparent] !p-5'>
      <Flex direction='column' gap='2' mb='4'>
        <Heading size='6'>Modern Portfolio Theory</Heading>
        <Text size='1'>
          A derivation of the formulae used in this implementation of
          Markowtiz’s Modern Portfolio Theory (MPT) is available{' '}
          <Link asChild>
            <NextLink
              target='_blank'
              href={`https://github.com/tomjwells/finance/blob/master/mathematics/Markowitz_Theory.pdf`}
            >
              here
            </NextLink>
          </Link>
          . The Python code for the implementation can be found{' '}
          <Link asChild>
            <NextLink
              target='_blank'
              href={`https://github.com/tomjwells/finance/blob/master/modules/markowitz/main.py`}
            >
              here
            </NextLink>
          </Link>
          .
        </Text>
      </Flex>
      <Flex direction='column' gap='2' my='4'>
        <Heading size='3'>
          Choose a collection of assets to consider for a candidate portfolio.
        </Heading>
        <Text size='1' color='gray'>
          Hint: Start typing to find a particular ticker. Use backspace to
          remove tickers quickly. The list of selectable tickers comes from the
          stocks in the S&P 500.
        </Text>

        <FancyMultiSelect assets={assets} pageParams={pageParams} />
        <Text>
          The efficient frontier (the set of portfolios that yield the highest
          return for a given level of risk) is indicated by the solid white
          line.
        </Text>

        <div className='flex flex-col my-4'>
          <Heading size='3'>Allow Short Selling</Heading>
          <Text size='2'>
            Select whether to allow short positions within the portolio.
          </Text>
          <Suspense>
            <AllowShortSelling {...pageParams} />
          </Suspense>
        </div>

        <div className='my-4'>
          <Heading size='3'>Risk free rate</Heading>
          <Text size='2'>
            The risk free rate is set by default to the yield of the three-month
            U.S. Treasury bill, but it can be changed to any other value.
          </Text>
          <Suspense>
            <RiskFreeRateSlider {...pageParams} />
          </Suspense>
        </div>

        <AdvancedControls pageParams={pageParams} />

        <Suspense
          fallback={
            <Flex justify='center' align='center' height='400px'>
              <Spinner size='3' />
            </Flex>
          }
        >
          <Heading size='5' mt='4'>
            Results
          </Heading>
          <ResultsSection pageParams={pageParams} searchParams={searchParams} />
        </Suspense>
      </Flex>
    </Card>
  )
}

const MPTSchema = z.object({
  tickers: z.array(z.string()),
  mu: z.array(z.number()),
  Sigma: z.array(z.array(z.number())),
  Sigma_inverse: z.array(z.array(z.number())),
  data: z.array(
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
})
export type MPTData = z.infer<typeof MPTSchema>

async function fetchMPT(pageParams: PageParams) {
  const queryParams = new URLSearchParams()
  pageParams.assets.forEach((asset) => queryParams.append('assets', asset))
  queryParams.append('startYear', pageParams.startYear.toString())
  queryParams.append('endYear', pageParams.endYear.toString())
  queryParams.append('r', pageParams.r.toString())
  queryParams.append(
    'allowShortSelling',
    pageParams.allowShortSelling.toString()
  )

  console.log({ fetching: `${env.APP_URL}/api/markowitz/main?${queryParams}` })
  const response = await fetch(
    `${env.APP_URL}/api/markowitz/main?${queryParams}`,
    {
      cache: env.NODE_ENV == 'development' ? 'no-cache' : 'force-cache',
    }
  )
  return MPTSchema.parse(await response.json())
}

function calculateTangencyPortfolio(
  mu: number[],
  Sigma_inverse: number[][],
  riskFreeRate: number
): number[] {
  const invSigma = new Matrix(
    Sigma_inverse.length,
    Sigma_inverse.length,
    Sigma_inverse
  )
  const onesVector = new Matrix(
    mu.length,
    1,
    mu.map(() => [1])
  )
  const subtracted = new Matrix(
    mu.length,
    1,
    mu.map((v) => [v - riskFreeRate])
  )

  const numerator = new Vector(
    invSigma.multiply(subtracted).transpose().values[0]
  )
  const denominator = onesVector
    .transpose()
    .multiply(invSigma)
    .multiply(subtracted).values[0]![0]!

  return numerator.scale(1 / denominator).values
}

function calculateRisk(tangencyPortfolioWeights: number[], Sigma: number[][]) {
  const tangencyPortfolioWeightsMatrix = new Matrix(
    tangencyPortfolioWeights.length,
    1,
    tangencyPortfolioWeights.map((v) => [v])
  )
  const SigmaMatrix = new Matrix(Sigma.length, Sigma.length, Sigma)

  const variance = tangencyPortfolioWeightsMatrix
    .transpose()
    .multiply(SigmaMatrix.multiply(tangencyPortfolioWeightsMatrix))

  return Math.sqrt(variance.values[0]![0]!)
}

async function ResultsSection({
  pageParams,
  searchParams,
}: {
  pageParams: PageParams
  searchParams?: Record<string, string | string[] | undefined>
}) {
  try {
    const data = await fetchMPT(pageParams)
    const tangencyPortfolioWeights = calculateTangencyPortfolio(
      data.mu,
      data.Sigma_inverse,
      pageParams.r
    )
    const tangencyPortfolio = data.tangency_portfolio

    // Calculate Sortino Ratio
    const dailyPortfolioReturns = []
    for (let i = 0; i < data.returns[0]!.length; i++) {
      dailyPortfolioReturns.push(
        tangencyPortfolioWeights.reduce(
          (acc, weight, j) => acc + weight * data.returns[j]![i]!,
          0
        )
      )
    }
    const sortinoVariance =
      (252 / data.returns[0]!.length) *
      dailyPortfolioReturns.reduce(
        (acc, returnVal) => acc + Math.min(0, returnVal) ** 2,
        0
      )

    return (
      <Flex direction='column' gap='6'>
        <Card
          className='!p-4'
          style={{
            background: 'linear-gradient(hsl(260deg 4.23% 9.0%), transparent)',
          }}
        >
          <Box height='600px' width='9' p='4'>
            <Suspense>
              <ChartJSChart
                mptData={data}
                riskFreeRate={pageParams.r}
                tangencyPortfolio={tangencyPortfolio}
                allowShortSelling={pageParams.allowShortSelling}
              />
            </Suspense>
          </Box>
        </Card>
        <div className='flex flex-col gap-4'>
          <Heading size='5'>Metrics</Heading>
          <div className='flex gap-4'>
            <div className='w-1/2'>
              <Heading size='4' color='gray'>
                Expected Return
              </Heading>
              <Heading size='6'>
                {formatPercent(tangencyPortfolio.return)}
              </Heading>
            </div>
            <div className='w-1/2'>
              <Heading size='4' color='gray'>
                Volatility
              </Heading>
              <Heading size='6'>
                {formatPercent(tangencyPortfolio.risk)}
              </Heading>
            </div>
          </div>
          <div className='flex gap-4'>
            <div className='w-1/2'>
              <Heading size='4' color='gray'>
                Sharpe Ratio
              </Heading>
              <Heading size='6'>
                {(
                  (tangencyPortfolio.return - pageParams.r) /
                  (tangencyPortfolio.risk - 0)
                ).toFixed(2)}
              </Heading>
            </div>
            <div className='w-1/2'>
              <Heading size='4' color='gray'>
                Sortino Ratio
              </Heading>
              <Heading size='6'>
                {(
                  (tangencyPortfolio.return - pageParams.r) /
                  Math.sqrt(sortinoVariance)
                ).toFixed(2)}
              </Heading>
            </div>
          </div>
        </div>
        <Suspense>
          <Heading size='4'>The Tangency Portfolio</Heading>
          <TangencyPortfolioPieChart
            tangencyPortfolio={tangencyPortfolio}
            pageParams={pageParams}
          />
        </Suspense>
      </Flex>
    )
  } catch (error) {
    console.error(JSON.stringify(error))
    return (
      <Flex direction='column' justify='center'>
        <Text color='red'>
          Something went wrong on the server. The server can time out (after
          10s) if a large number of equities are passed as arguments. Please
          either{' '}
          <Link asChild>
            <NextLink
              href={
                `?` +
                new URLSearchParams(
                  searchParams as unknown as string
                ).toString()
              }
            >
              try again
            </NextLink>
          </Link>
          , or reduce the number of equities.
        </Text>
        {env.NODE_ENV === 'development' && (
          <Text>Error: {JSON.stringify(error)}</Text>
        )}
      </Flex>
    )
  }
}
