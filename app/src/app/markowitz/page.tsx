import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card, Flex, Heading, Text } from "@radix-ui/themes"
import { FancyMultiSelect } from "./fancy-multi-select"
import type { Asset } from "./fancy-multi-select"
import { env } from "~/env"
import RiskFreeRateSlider from "./RiskFreeRateSlider";


export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const selectedAssets = searchParams?.assets ? JSON.parse(searchParams.assets as string) as string[] : [] as string[]
  if (selectedAssets.length === 0) redirect(`/markowitz?assets=${JSON.stringify(["FB", "AAPL", "GOOGL", "AMZN", "MSFT"])}`)
  const assets = await fetch(`${env.APP_URL}/api/markowitz/stocks`, { next: { revalidate: 3600 } }).then(r => r.json()) as Asset[]


  return <Card className="w-full before:![background-color:transparent] p-5"  >
    <Heading size="6">Modern Portfolio Theory</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading size="3">Choose some assets to consider for your candidate portfolio.</Heading>

      <FancyMultiSelect
        assets={assets}
        selected={selectedAssets.map((s: string) => ({ value: s, label: s }))}
      />
      <Text>The efficient frontier (the set of portfolios that yield the highest return for a given level of risk) is highlighted in lighter blue.</Text>


      <Suspense>
        <div className="my-4">
          <RiskFreeRateSlider defaultValue={100 * (await getRiskFreeRate())} />
          <Text size="2">The default value for risk free rate is chosen to be three-month U.S. Treasury bill, but you can change it to any other rate.</Text>
        </div>
      </Suspense>

      <Heading size="3">Results</Heading>
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="w-1/2">
            <Heading size="4">Expected Return</Heading>
            <Heading size="6">12.5%</Heading>
          </div>
          <div className="w-1/2">
            <Heading size="4">Volatility</Heading>
            <Heading size="6">8.2%</Heading>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="w-1/2">
            <Heading size="4">Sharpe Ratio</Heading>
            <Heading size="6">1.52</Heading>
          </div>
          <div className="w-1/2">
            <Heading size="4">Sortino Ratio</Heading>
            <Heading size="6">1.82</Heading>
          </div>
        </div>
      </div>
    </Flex>
  </Card >
}

async function getRiskFreeRate(): Promise<number> {
  return parseFloat(((await fetch(`${env.APP_URL}/api/utils/risk-free-rate`, { next: { revalidate: 3600 } }).then(r => r.json()))).toFixed(2))
}