import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Box, Card, Flex, Heading, Text, Link as RadixLink, Spinner } from "@radix-ui/themes"
import { FancyMultiSelect } from "./_components/fancy-multi-select"
import type { Asset } from "./_components/fancy-multi-select"
import { env } from "~/env"
import RiskFreeRateSlider from "./_components/RiskFreeRateSlider"
import z from "zod"
import TangencyPortfolioPieChart from "./_components/TangencyPortfolioPieChart"
import ChartJSChart from "./_components/ChartJSChart"
import AdvancedControls from "./_components/AdvancedControls"
import Link from "next/link"
import { Vector, Matrix } from 'ts-matrix';


const pageParamsSchema = z.object({
  assets: z.array(z.string()),
  r: z.coerce.number().min(0).transform(v => v < 0 ? 0 : v),
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
  let pageParams = {} as PageParams
  try {
    pageParams = pageParamsSchema.parse(searchParams)
  } catch (e) {
    const params = new URLSearchParams();
    const defaultAssets = ["META", "AAPL", "GOOGL", "TSLA", "MSFT", "AMD"]
    defaultAssets.forEach((asset) => params.append('assets', asset))
    params.append('r', `${await getRiskFreeRate()}`)
    params.append('startYear', `${(new Date()).getFullYear() - 10}`)
    params.append('endYear', `${(new Date()).getFullYear()}`)
    redirect(`?${params.toString()}`)
  }

  return <Card className="w-full before:![background-color:transparent] !p-5"  >
    <Heading size="6">Modern Portfolio Theory</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading size="3">Choose some assets to consider for your candidate portfolio.</Heading>

      <FancyMultiSelect
        assets={await fetchAssets()}
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

      <AdvancedControls pageParams={pageParams} />



      <Suspense fallback={<Flex justify="center" align="center" height="400px"><Spinner size="3" /></Flex>}>
        <Heading size="3">Results</Heading>
        <ResultsSection pageParams={pageParams} searchParams={searchParams} />
      </Suspense>


    </Flex>
  </Card >
}

const formatPercent = (num: number) => `${(100 * num).toFixed(1)}%`
const getRiskFreeRate = async () => parseFloat(((await fetch(`${env.APP_URL}/api/utils/risk-free-rate`).then(r => r.json())) as number).toFixed(6))
const fetchAssets = async () => await fetch(`${env.APP_URL}/api/markowitz/stocks`).then(r => r.json()) as Asset[]

const MPTSchema = z.object({
  tickers: z.array(z.string()),
  mu: z.array(z.number()),
  Sigma: z.array(z.array(z.number())),
  Sigma_inverse: z.array(z.array(z.number())),
  data: z.array(z.object({
    weights: z.array(z.number()),
    return: z.number(),
    risk: z.number(),
  })),
  asset_datapoints: z.array(z.object({
    ticker: z.string(),
    return: z.number(),
    risk: z.number(),
  })),
  returns: z.array(z.array(z.number())),
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
    cache: env.NODE_ENV == 'development' ? "no-cache" : 'force-cache'
    // cache: 'force-cache'
  })
  const data = await response.json() as string
  // console.log({ data })
  const parsedData = MPTSchema.parse(data)
  return parsedData
}


function calculateTangencyPortfolio(mu: number[], Sigma_inverse: number[][], riskFreeRate: number): number[] {
  const invSigma = new Matrix(Sigma_inverse.length, Sigma_inverse.length, Sigma_inverse);
  const onesVector = new Matrix(mu.length, 1, mu.map(() => [1]))
  const subtracted = new Matrix(mu.length, 1, mu.map((v) => [v - riskFreeRate]))

  const numerator = new Vector((invSigma.multiply(subtracted)).transpose().values[0])
  const denominator = (onesVector.transpose().multiply(invSigma).multiply(subtracted)).values[0]![0]!

  return numerator.scale(1 / denominator).values
}

function calculateRisk(tangencyPortfolioWeights: number[], Sigma: number[][]) {
  const tangencyPortfolioWeightsMatrix = new Matrix(tangencyPortfolioWeights.length, 1, tangencyPortfolioWeights.map(v => [v]))
  const SigmaMatrix = new Matrix(Sigma.length, Sigma.length, Sigma)

  const variance = (tangencyPortfolioWeightsMatrix.transpose().multiply(SigmaMatrix.multiply(tangencyPortfolioWeightsMatrix)))

  return Math.sqrt(
    variance.values[0]![0]!
  )
}

async function ResultsSection({ pageParams, searchParams }: { pageParams: PageParams; searchParams?: Record<string, string | string[] | undefined> }) {
  try {
    const data = await fetchMPT(pageParams)
    const tangencyPortfolioWeights = calculateTangencyPortfolio(data.mu, data.Sigma_inverse, pageParams.r)
    const tangencyPortfolio = {
      weights: tangencyPortfolioWeights,
      return: new Vector(data.mu).dot(new Vector(tangencyPortfolioWeights)),
      risk: calculateRisk(tangencyPortfolioWeights, data.Sigma)
    }

    // Calculate Sortino Ratio
    const dailyPortfolioReturns = []
    for (let i = 0; i < data.returns[0]!.length; i++) {
      dailyPortfolioReturns.push(
        tangencyPortfolioWeights.reduce((acc, weight, j) => acc + weight * data.returns[j]![i]!, 0)
      )
    }
    const sortinoVariance = (252 / data.returns[0]!.length) * dailyPortfolioReturns.reduce((acc, returnVal) => acc + Math.min(0, returnVal) ** 2, 0)


    return (
      <>
        <Box height="600px" width="9" p="4">
          <Suspense>
            <ChartJSChart mptData={data} riskFreeRate={pageParams.r} tangencyPortfolio={tangencyPortfolio} />
          </Suspense>
        </Box>
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
              <Heading size="6">{((tangencyPortfolio.return - pageParams.r) / (tangencyPortfolio.risk - 0)).toFixed(2)}</Heading>
            </div>
            <div className="w-1/2">
              <Heading size="4" color="gray">Sortino Ratio</Heading>
              <Heading size="6">{((tangencyPortfolio.return - pageParams.r) / (Math.sqrt(sortinoVariance))).toFixed(2)}</Heading>
            </div>
          </div>
        </div>
        <br />
        <Heading size="4">The Tangency Portfolio</Heading>
        <Suspense>
          <TangencyPortfolioPieChart tangencyPortfolio={tangencyPortfolio} pageParams={pageParams} />
        </Suspense>
      </>
    )
  } catch (error) {
    console.error(JSON.stringify(error))
    return (
      <Flex direction="column" justify="center">
        <Text color="red">Something went wrong on the server. The server can time out(after 10s) if a large number of equities are passed as arguments. Please either <RadixLink asChild><Link href={`?` + (new URLSearchParams(searchParams as unknown as string)).toString()}>try again</Link></RadixLink>, or reduce the number of equities.</Text>
        {env.NODE_ENV === 'development' && <Text>Error: {JSON.stringify(error)}</Text>}
      </Flex>
    )
  }
} 