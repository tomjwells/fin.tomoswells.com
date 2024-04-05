import { Box, Card, Flex, Heading, Text, Link as RadixLink, Spinner } from "@radix-ui/themes"
import { Table } from '@radix-ui/themes';
import Link from "next/link";

type Result = {
  model: string;
  correctDirectionPrediction: number;
  meanPredictionError: number;
}

const results: Result[] = [
  {
    model: "ARIMA",
    correctDirectionPrediction: 0.5,
    meanPredictionError: 0.5
  },
  {
    model: "ARCH",
    correctDirectionPrediction: 0.5,
    meanPredictionError: 0.5
  },
  {
    model: "GARCH",
    correctDirectionPrediction: 0.5,
    meanPredictionError: 0.5
  },
  {
    model: "XGBoost",
    correctDirectionPrediction: 0.7,
    meanPredictionError: 0.3
  },
  {
    model: "Basic LSTM",
    correctDirectionPrediction: 0.6,
    meanPredictionError: 0.4
  },
  {
    model: "LSTM with derived features",
    correctDirectionPrediction: 0.6,
    meanPredictionError: 0.4
  },
  {
    model: "Prophet",
    correctDirectionPrediction: 0.7,
    meanPredictionError: 0.3
  },
]

export default async function MPTPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {

  return <Card className="w-full before:![background-color:transparent] !p-5"  >
    <Heading size="6">Timeseries Forecasting (WIP)</Heading>
    <Flex direction="column" gap="2" my="4">

      <Heading size="3">Introduction</Heading>

      <Text>Unlike the other pages on this website, I have chosen to present this section as a &quot;study&quot;, as oppoed to an interactive tool. The aim of the study is to compare the predictive ability of a wide variety of timerseries forecasting methods which are frequently used in finance.</Text>
      <Text>The task I have set for these models is to predict the stock price of <RadixLink asChild><Link href="https://finance.yahoo.com/quote/TSLA/" target="_blank">TSLA</Link></RadixLink>, from the start to the end of 2023, at the close of each subsequent day for one day only.</Text>
      <Text>Some additional rules for the task are:</Text>
      <ul className="list-disc my-3 ml-6">
        <li>The training data accessible to the model consists of data from the date of TSLA&apos;s IPO, on the June 29, 2010 to the 31st of Dec 2022, inclusive.</li>
        <li>For each trading day we are attempting to model, the model is allowed to use information up to but not including that day. For example, if the model is required to make a prediction for the 31st of January 2023, it may use all data up to and including the 30th of January 2023.</li>
        <li>The model&apos;s performance will be evaluated according to two criteria:  <ul className="list-disc my-3 ml-6">
          <li>Percentage of days for which the price was predicted correctly/</li>
          <li>The mean error (measured in $) of the model&apos;s prediction for the close of each day.</li>
        </ul>
        </li>
      </ul>
      <br />
      <Text>The results of the study for all models considered are presented in the table below. The table can be reordered by clicking on the column headers.</Text>
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
          {
            results.map((result) => (
              <Table.Row key={result.model}>
                <Table.RowHeaderCell>{result.model}</Table.RowHeaderCell>
                <Table.Cell>{result.correctDirectionPrediction}</Table.Cell>
                <Table.Cell>{result.meanPredictionError}</Table.Cell>
              </Table.Row>
            ))
          }
        </Table.Body>
      </Table.Root>
    </Flex>
  </Card >
}