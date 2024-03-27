import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes"
import { FancyMultiSelect } from "./_components/fancy-multi-select"
import type { Asset } from "./_components/fancy-multi-select"
import { env } from "~/env"
import RiskFreeRateSlider from "./_components/RiskFreeRateSlider"
import z from "zod"
import TangencyPortfolioPieChart from "./_components/TangencyPortfolioPieChart"
import ChartJSChart from "./_components/ChartJSChart"
import { multiply, inv, ones, subtract, dotMultiply, dotDivide } from 'mathjs'
import AdvancedControls from "./_components/AdvancedControls"

export const runtime = "nodejs"


// import {
//   Accordion,
// } from "~/components/ui/accordion"


const pageParamsSchema = z.object({
  assets: z.array(z.string()), // TODO: Handle case of single asset (.or(z.string().transform(v => [v])))
  r: z.coerce.number().min(0),
  // .transform(v => v < 0 ? 0 : v),
  startYear: z.coerce.number().min(2000).max((new Date()).getFullYear()),
  endYear: z.coerce.number().min(2000).max((new Date()).getFullYear()),
})
export type PageParams = z.infer<typeof pageParamsSchema>

export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  console.log(!pageParamsSchema.safeParse(searchParams).success)
  if (!pageParamsSchema.safeParse(searchParams).success) {
    const params = new URLSearchParams();
    ["META", "AAPL", "GOOGL", "AMZN", "MSFT", "AMD"].forEach((asset) => {
      params.append('assets', asset)
    })
    console.log({ r: await getRiskFreeRate() })
    params.append('r', `${await getRiskFreeRate()}`)
    params.append('startYear', `${(new Date()).getFullYear() - 10}`)
    params.append('endYear', `${(new Date()).getFullYear()}`)
    redirect(`?${params.toString()}`)
  }
  const pageParams = pageParamsSchema.parse(searchParams)
  const assets = await fetch(`${env.APP_URL}/api/markowitz/stocks`, { next: { revalidate: 3600 } }).then(r => r.json()) as Asset[]
  const data = await fetchMPT(pageParams)
  const tangencyPortfolioWeights = calculateTangencyPortfolio(data.mu, data.Sigma, pageParams.r)
  const tangencyPortfolio = {
    weights: tangencyPortfolioWeights,
    // TODO
    // return: dotMultiply(tangencyPortfolioWeights, data.asset_datapoints.map(d => d.return)).reduce((a, b) => a + b, 0),
    return: tangencyPortfolioWeights.reduce((a, b, i) => a + b * data.mu[i]!, 0),
    // risk = float(np.sqrt(tangency_portfolio @ Sigma @ tangency_portfolio))
    // @ts-expect-error mathjs 
    risk: Math.sqrt(multiply(tangencyPortfolioWeights, multiply(data.Sigma, tangencyPortfolioWeights))),
  }
  // console.log({
  //   // tangencyPortfolio, 
  //   tangencyPortfolioWeights
  // })

  return <Card className="w-full before:![background-color:transparent] p-5"  >
    <Heading size="6">Modern Portfolio Theory</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading size="3">Choose some assets to consider for your candidate portfolio.</Heading>

      <FancyMultiSelect
        assets={assets}
        pageParams={pageParams}
      />
      <Text>The efficient frontier (the set of portfolios that yield the highest return for a given level of risk) is highlighted in lighter blue.</Text>


      <div className="my-4">
        <Heading size="3">Risk free rate</Heading>
        <Suspense>
          <RiskFreeRateSlider r={pageParams.r} />
          <Text size="2">The default value for risk free rate is chosen to be three-month U.S. Treasury bill, but you can change it to any other rate.</Text>
        </Suspense>
      </div>

      <AdvancedControls
        pageParams={pageParams}

      />

      <Heading size="3">Results</Heading>
      <Box height="700px" width="9" p="4">
        <Suspense>
          <ChartJSChart mptData={data} riskFreeRate={pageParams.r} tangencyPortfolio={tangencyPortfolio} />
        </Suspense>
      </Box>
      {/* <Box height="500px" width="9" p="4">
        <Suspense>
          <PlotlyChart mptData={data} riskFreeRate={pageParams.r} />
        </Suspense>
      </Box>
      <Box height="500px" width="9" p="4">
        <Suspense>
          <Chart mptData={data} riskFreeRate={pageParams.r} />
        </Suspense>
      </Box> */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="w-1/2">
            <Heading size="4" color="gray">Expected Return</Heading>
            <Heading size="6">{formatPercent(tangencyPortfolio.return)}</Heading>
          </div>
          <div className="w-1/2">
            <Heading size="4" color="gray">Volatility</Heading>
            <Heading size="6">{formatPercent(tangencyPortfolio.risk)}</Heading>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-1/2">
            <Heading size="4" color="gray">Sharpe Ratio</Heading>
            <Heading size="6">{formatPercent((tangencyPortfolio.return - pageParams.r) / (tangencyPortfolio.risk - 0))}</Heading>
          </div>
          <div className="w-1/2">
            <Heading size="4" color="gray">Sortino Ratio</Heading>
            <Heading size="6">1.82</Heading>
          </div>
        </div>
      </div>
      <br />
      <Heading size="4">The Tangency Portfolio</Heading>
      <Suspense>
        <TangencyPortfolioPieChart tangencyPortfolio={tangencyPortfolio} pageParams={pageParams} />
      </Suspense>

    </Flex>
  </Card >
}

const formatPercent = (num: number) => `${(100 * num).toFixed(1)}%`

async function getRiskFreeRate(): Promise<number> {
  return parseFloat(((await fetch(`${env.APP_URL}/api/utils/risk-free-rate`, { next: { revalidate: 3600 } }).then(r => r.json())) as number).toFixed(6))
}

const MPTSchema = z.object({
  tickers: z.array(z.string()),
  mu: z.array(z.number()),
  Sigma: z.array(z.array(z.number())),
  data: z.array(z.object({
    weights: z.array(z.number()),
    return: z.number(),
    risk: z.number(),
  })),
  // tangency_portfolio: z.object({
  //   weights: z.array(z.number()),
  //   return: z.number(),
  //   risk: z.number(),
  // }),
  asset_datapoints: z.array(z.object({
    ticker: z.string(),
    return: z.number(),
    risk: z.number(),
  }))
})
export type MPTData = z.infer<typeof MPTSchema>
async function fetchMPT(pageParams: PageParams) {
  const queryParams = new URLSearchParams()
  pageParams.assets.forEach(asset => {
    queryParams.append('assets', asset)
  })
  queryParams.append('startYear', pageParams.startYear.toString())
  queryParams.append('endYear', pageParams.endYear.toString())
  console.log({ fetching: `${env.APP_URL}/api/markowitz/main?${queryParams}` })
  const response = await fetch(`${env.APP_URL}/api/markowitz/main?${queryParams}`, {
    cache: env.NODE_ENV === "development" ? 'no-store' : 'force-cache'
    // cache: 'force-cache'  
  })
  const data = await response.json() as string
  console.log({ data })
  const parsedData = MPTSchema.parse(data)
  return parsedData
}


function calculateTangencyPortfolio(mu: number[], Sigma: number[][], riskFreeRate: number): number[] {
  console.log("Calculating tangency portfolio")
  const invSigma = inv(Sigma)
  const onesArray = ones(mu.length)
  const numerator = multiply(invSigma, subtract(mu, dotMultiply(riskFreeRate, onesArray)))
  const denominator = multiply(multiply(onesArray, invSigma), subtract(mu, dotMultiply(riskFreeRate, onesArray)))
  console.log({ denominator })
  // @ts-expect-error mathjs
  const result = dotDivide(numerator, denominator)
  return result.valueOf() as number[]
}