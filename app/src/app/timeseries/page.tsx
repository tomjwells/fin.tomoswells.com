import { Box, Card, Flex, Heading, Text, Link as RadixLink, Spinner } from "@radix-ui/themes"
import z from "zod"
import { Table } from '@radix-ui/themes';
import Link from "next/link";


export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {

  return <Card className="w-full before:![background-color:transparent] !p-5"  >
    <Heading size="6">Timeseries Forecasting</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading size="3">Choose some assets to consider for your candidate portfolio.</Heading>

      <Text>Unlike the other pages on this website, I believe this section is be best presented as a "study", rather than as an interactive tool. The goal of the study is to compare the predictive ability of a wide variety of timerseries forecasting methods which are frequently used in finance. The task I have set for these models is to predict the stock price of <RadixLink asChild><Link href="https://finance.yahoo.com/quote/TSLA/" target="_blank">TSLA</Link></RadixLink>, from the start to the end of 2023, at the close of each subsequent day for one day only. Some additional rules for the task are:</Text>
      <ul className="list-disc my-3 ml-6">
        <li>The training data accessible to the model consists of data from the date of TSLA's IPO, on the June 29, 2010 to the 31st of Dec 2022, inclusive.</li>
        <li>On each trading day, it is allowed to use information up to that preceeding day. For example, if the model is required to make a prediction for the 2nd of January 2023, it may use all data up to and including the 1st of January 2023.</li>
        <li>The model's performance will be evaluated according to two criteria:  <ul className="list-disc my-3 ml-6">
          <li>Percentage of days for which the price was predicted correctly/</li>
          <li>The mean error (measured in $) of the model's prediction for the close of each day.</li>
        </ul>
        </li>
      </ul>
      <br />
      <Text>The results of the study for all models considered are presented in the table below. Click on any column to order the table by that column.</Text>
      <br />
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Correct direction prediction (%)</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Mean prediction error ($)</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          <Table.Row >
            <Table.RowHeaderCell>ARIMA </Table.RowHeaderCell>
            <Table.Cell>Foo2</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>


    </Flex>
  </Card >
}