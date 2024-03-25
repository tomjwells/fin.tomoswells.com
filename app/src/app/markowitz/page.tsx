import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes"
import { FancyMultiSelect } from "./_components/fancy-multi-select"
import type { Asset } from "./_components/fancy-multi-select"
import { env } from "~/env"
import RiskFreeRateSlider from "./_components/RiskFreeRateSlider";
import z from "zod"
import TangencyPortfolioPieChart from "./_components/TangencyPortfolioPieChart";
import ChartJSChart from "./_components/ChartJSChart";


const pageParamsSchema = z.object({
  assets: z.array(z.string()), // TODO: Handle case of single asset (.or(z.string().transform(v => [v])))
  r: z.coerce.number().min(0)
  // .transform(v => v < 0 ? 0 : v),
})
export type PageParams = z.infer<typeof pageParamsSchema>

export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (!pageParamsSchema.safeParse(searchParams).success) {
    const params = new URLSearchParams();
    ["META", "AAPL", "GOOGL", "AMZN", "MSFT"].forEach((asset) => {
      params.append('assets', asset);
    });
    params.append('r', `${await getRiskFreeRate()}`);
    redirect(`?${params.toString()}`);
  }
  const pageParams = pageParamsSchema.parse(searchParams)
  const assets = await fetch(`${env.APP_URL}/api/markowitz/stocks`, { next: { revalidate: 3600 } }).then(r => r.json()) as Asset[]
  const data = await fetchMPT(pageParams)

  return <Card className="w-full before:![background-color:transparent] p-5"  >
    <Heading size="6">Modern Portfolio Theory</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading size="3">Choose some assets to consider for your candidate portfolio.</Heading>

      <FancyMultiSelect
        assets={assets}
        pageParams={pageParams}
      />
      <Text>The efficient frontier (the set of portfolios that yield the highest return for a given level of risk) is highlighted in lighter blue.</Text>


      <Suspense>
        <div className="my-4">
          <RiskFreeRateSlider r={pageParams.r} />
          <Text size="2">The default value for risk free rate is chosen to be three-month U.S. Treasury bill, but you can change it to any other rate.</Text>
        </div>
      </Suspense>

      <Heading size="3">Results</Heading>
      <Box height="500px" width="9" p="4">
        <Suspense>
          <ChartJSChart mptData={data} riskFreeRate={pageParams.r} />
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
            <Heading size="6">{formatPercent(data.tangency_portfolio.return)}</Heading>
          </div>
          <div className="w-1/2">
            <Heading size="4" color="gray">Volatility</Heading>
            <Heading size="6">{formatPercent(data.tangency_portfolio.risk)}</Heading>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-1/2">
            <Heading size="4" color="gray">Sharpe Ratio</Heading>
            <Heading size="6">{formatPercent((data.tangency_portfolio.return - pageParams.r) / (data.tangency_portfolio.risk - 0))}</Heading>
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
        <TangencyPortfolioPieChart mptData={data} pageParams={pageParams} />
      </Suspense>

    </Flex>
  </Card >
}

const formatPercent = (num: number) => `${(100 * num).toFixed(1)}%`

async function getRiskFreeRate(): Promise<number> {
  return parseFloat(((await fetch(`${env.APP_URL}/api/utils/risk-free-rate`, { next: { revalidate: 3600 } }).then(r => r.json())) as number).toFixed(2))
}

const MPTSchema = z.object({
  data: z.array(z.object({
    return: z.number(),
    risk: z.number(),
  })),
  tangency_portfolio: z.object({
    weights: z.array(z.number()),
    return: z.number(),
    risk: z.number(),
  }),
  asset_datapoints: z.array(z.object({
    ticker: z.string(),
    return: z.number(),
    risk: z.number(),
  }))
});
export type MPTData = z.infer<typeof MPTSchema>
async function fetchMPT(pageParams: PageParams) {
  console.log({ pageParams, Search: `${new URLSearchParams(pageParams as unknown as string)}` })
  const response = await fetch(`${env.APP_URL}/api/markowitz/main?${new URLSearchParams(pageParams as unknown as string)}`, {
    cache: env.NODE_ENV === "development" ? 'no-store' : 'force-cache'
  });
  const parsedData = MPTSchema.parse(await response.json());
  return parsedData;
}