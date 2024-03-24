import { Card, Flex, Grid, Heading, Select, Skeleton, Spinner, Text } from "@radix-ui/themes"
import { env } from "~/env"
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "~/shadcn/Tabs";
import SelectExpirationDate from "./_components/SelectExpirationDate";
import SetStrike from "./_components/SetStrike";
import { Asset } from "../markowitz/fancy-multi-select";
import SelectTicker from "./_components/SelectTicker";
import { Suspense } from "react";
import React from "react";
import z from "zod"



type Method = {
  label: string;
  value: "black-scholes" | "monte-carlo" | "binomial";
};
const METHODS: Method[] = [{
  label: "Black-Scholes",
  value: "black-scholes"
}, {
  label: "Monte Carlo",
  value: "monte-carlo"
}, {
  label: "Binomial",
  value: "binomial"
}]

const pageParamsSchema = z.object({
  optionType: z.union([
    z.literal("american"),
    z.literal("european"),
  ]),
  T: z.string().refine(
    v => /\d{4}-\d{2}-\d{2}/.test(v),
  ),
  K: z.string(),
  ticker: z.string(),
})

export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // console.log({ params, searchParams })
  if (!searchParams?.optionType || searchParams?.optionType === "undefined") redirect(`/derivatives?optionType=american`)
  if (!searchParams?.T) redirect(`/derivatives?optionType=${searchParams.optionType}&T=${new Date().getFullYear() + 1}-${new Date().getMonth().toString().padStart(2, '0')}-01`)
  if (!searchParams?.K) redirect(`/derivatives?optionType=${searchParams.optionType}&T=${searchParams.T || 1}&K=100`)
  if (!searchParams?.ticker) redirect(`/derivatives?optionType=${searchParams.optionType}&T=${searchParams.T || 1}&K=${searchParams.K || 100}&ticker=TSLA`)

  const pageParams = pageParamsSchema.parse(searchParams)
  const assets = await fetch(`${env.APP_URL}/api/markowitz/stocks`).then(r => r.json()) as Asset[]
  const methods = pageParams.optionType === "european" ? METHODS : [METHODS[2]] as Method[];




  return <Card className="w-full before:![background-color:transparent] p-6" >
    <Heading size="6">Options Pricing</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading as="h2" size="4">Select an option type.</Heading>
      <div className=" container mx-16 w-full flex  items-center justify-center py-3">
        <Tabs defaultValue="/derivatives?optionType=european" className="w-[400px]">
          <TabsList>
            <TabsTrigger value={
              `/derivatives?${new URLSearchParams({
                ...searchParams,
                optionType: "american"
              }).toString()}`
            } selected={searchParams?.optionType === "american"}>American Option</TabsTrigger>
            <TabsTrigger value={
              `/derivatives?${new URLSearchParams({
                ...searchParams,
                optionType: "european"
              }).toString()}`
            } selected={pageParams.optionType === "european"}>European Option</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Heading size="3" mb="2">Option parameters</Heading>
      <Grid columns="3" gap="3" width="auto">
        <Suspense>
          <SelectTicker ticker={pageParams.ticker} assets={assets} />
        </Suspense>
        <Suspense>
          <SelectExpirationDate T={pageParams.T} />
        </Suspense>
        <Suspense>
          <SetStrike
            optionType={pageParams.optionType}
            T={pageParams.T}
            K={parseFloat(pageParams.K)}
            currentPrice={
              (await fetch(`${env.APP_URL}/api/stock/${pageParams.ticker}`, { next: { revalidate: 60 } }).then(r => r.json()) as { price: number }).price
            }
          />
        </Suspense>
      </Grid>

      <ul className="list-disc my-6 ml-6">
        <li >
          The list of selectable companies is based on the S&P 500 index.
        </li>
        <li >
          <Text>The risk free rate used for the calculation is that of the three-month U.S. Treasury bill (currently: r={(100 * (await fetch(`${env.APP_URL}/api/utils/risk-free-rate`, { next: { revalidate: 3600 } }).then(r => r.json()))).toFixed(2)}%).</Text>
        </li>
      </ul>

      <Heading size="5">Results</Heading>

      {methods.map(async ({ label, value }) => (
        <div key={label} className="flex flex-col gap-4 my-2">
          <Heading size="4" weight="bold">{label}</Heading>
          <div className="flex gap-4">
            <div className="w-1/2">
              <Heading size="4" color="gray">Call Option</Heading>
              <Heading size="6">
                <Suspense fallback={<Skeleton>Loading</Skeleton>}>
                  <FetchOptionPrice optionType={pageParams.optionType}
                    T={pageParams.T}
                    K={pageParams.K}
                    ticker={pageParams.ticker}
                    method={value}
                    instrument="call"
                  />
                </Suspense>
              </Heading>
            </div>
            <div className="w-1/2">
              <Heading size="4" color="gray">Put Option</Heading>
              <Heading size="6">
                <Suspense fallback={<Skeleton>Loading</Skeleton>}>
                  <FetchOptionPrice optionType={pageParams.optionType}
                    T={pageParams.T}
                    K={pageParams.K}
                    ticker={pageParams.ticker}
                    method={value}
                    instrument="put"
                  />
                </Suspense>
              </Heading>
            </div>
          </div>
        </div>
      )
      )}
    </Flex>

  </Card >
}

async function FetchOptionPrice({
  optionType,
  T,
  K,
  ticker,
  method,
  instrument,
}: {
  optionType: "european" | "american",
  T: string,
  K: string,
  ticker: string
  method: "black-scholes" | "monte-carlo" | "binomial"
  instrument: "call" | "put",
}) {
  const optionPrice = await fetchOptionPrice({
    optionType,
    T,
    K,
    ticker,
    method,
    instrument
  })
  return <>
    ${optionPrice.toFixed(2)}
  </>
}

async function fetchOptionPrice({
  optionType,
  T,
  K,
  ticker,
  method,
  instrument,
}: {
  optionType: "european" | "american",
  T: string,
  K: string,
  ticker: string,
  method: "black-scholes" | "monte-carlo" | "binomial"
  instrument: "call" | "put",
}): Promise<number> {
  const requestParams = {
    optionType,
    T,
    K,
    ticker,
    method,
    instrument
  }
  console.log("fetching", `${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(requestParams)}`)
  return fetch(`${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(requestParams)}`, {
    cache: env.NODE_ENV === "development" ? 'no-store' : 'force-cache'
  }).then(async res => {
    // console.log({ res })
    if (!res.ok) {
      console.log("HTTP-Error: " + res.status)
      const message = await res.text()
      console.log({ message })
      if (
        message.includes("less than T")
      ) {
        redirect(
          `?${new URLSearchParams({
            ...requestParams,
            T: new Date().getFullYear() + "-" + (new Date().getMonth() + 2)
          }).toString()}`
        )
      } else {
        console.log("Error URL:", `${env.APP_URL}/api/derivatives/option-price?${new URLSearchParams(requestParams)}`)
      }
    }
    return await res.json() as number
  })
}