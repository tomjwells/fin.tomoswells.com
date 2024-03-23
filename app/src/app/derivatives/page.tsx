import { Card, Flex, Heading, Select, Slider, Text } from "@radix-ui/themes"
import { env } from "~/env"
import { redirect } from "next/navigation";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "~/shadcn/Tabs";
import SelectExpirationDate from "./_components/SelectExpirationDate";
import SetStrike from "./_components/SetStrike";
import { Asset } from "../markowitz/fancy-multi-select";
import SelectTicker from "./_components/SelectTicker";
import { Suspense } from "react";
import React from "react";


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



export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // console.log({ params, searchParams })
  if (!searchParams?.optionType || searchParams?.optionType === "undefined") redirect(`/derivatives?optionType=american`)
  if (!searchParams?.T) redirect(`/derivatives?optionType=${searchParams.optionType}&T=${new Date().getFullYear() + 1}-${new Date().getMonth()}-01`)
  if (!searchParams?.K) redirect(`/derivatives?optionType=${searchParams.optionType}&T=${searchParams.T || 1}&K=100`)
  if (!searchParams?.ticker) redirect(`/derivatives?optionType=${searchParams.optionType}&T=${searchParams.T || 1}&K=${searchParams.K || 100}&ticker=TSLA`)


  const assets = await fetch(`${env.APP_URL}/api/markowitz/stocks`).then(r => r.json()) as Asset[]
  const methods = searchParams?.optionType === "european" ? METHODS : [METHODS[2]] as Method[];




  return <Card className="w-full" style={{ backgroundColor: 'transparent' }} >
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
            } selected={searchParams?.optionType === "european"}>European Option</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Heading size="3" mb="2">Option parameters</Heading>
      <Flex gap="6" >
        <SelectTicker ticker={searchParams?.ticker as string} assets={assets} />
        <SelectExpirationDate
          T={searchParams?.T as string}

        />
        <SetStrike
          optionType={searchParams?.optionType as string}
          method={searchParams?.method as string}
          T={searchParams?.T as string}
          K={parseFloat(searchParams?.K as string)}
          currentPrice={
            (await fetch(`${env.APP_URL}/api/stock/${searchParams?.ticker as string}`, { next: { revalidate: 60 } }).then(r => r.json())).price
          }
        />
      </Flex>


      <Text my="3">The risk free rate used for the calculation is that of the three-month U.S. Treasury bill (r={(100 * (await fetch(`${env.APP_URL}/api/utils/risk-free-rate`, { next: { revalidate: 60 } }).then(r => r.json()))).toFixed(2)}%).</Text>

      <Heading size="5">Results</Heading>

      {methods.map(async ({ label, value }) => <div key={label} className="flex flex-col gap-4">
        <Heading size="4">{label}</Heading>
        <div className="flex gap-4">
          <div className="w-1/2">
            <Heading size="4">Call Option</Heading>
            <Heading size="6">
              <Suspense fallback={<>Fetching...</>}>
                <FetchOptionPrice optionType={searchParams?.optionType as "european" | "american"}
                  T={searchParams?.T as string}
                  K={searchParams?.K as string}
                  ticker={searchParams?.ticker as string}
                  method={value}
                  instrument="call"
                />
              </Suspense>
            </Heading>
          </div>
          <div className="w-1/2">
            <Heading size="4">Put Option</Heading>
            <Heading size="6">
              <Suspense fallback={<>Fetching...</>}>
                <FetchOptionPrice optionType={searchParams?.optionType as "european" | "american"}
                  T={searchParams?.T as string}
                  K={searchParams?.K as string}
                  ticker={searchParams?.ticker as string}
                  method={value}
                  instrument="put"
                />
              </Suspense>
            </Heading>
          </div>
        </div>
      </div>
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
}) {
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
    return await res.json()
  })
}