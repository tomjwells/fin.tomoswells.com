'use client'

import { Table } from '@radix-ui/themes'
import { PageParams } from '../page'
import { Bar } from 'react-chartjs-2'
import { Chart, BarElement, BarController, CategoryScale, LinearScale } from 'chart.js'
import { getRandomColor } from './ChartJSChart'
import { tickers } from '~/data'
import { MPTData } from './ResultsSection'

Chart.register(BarController, BarElement, CategoryScale, LinearScale)

export default function TangencyPortfolioPieChart({ mptData, pageParams }: { mptData: MPTData; pageParams: PageParams }) {
  // Prepare the data for the bar chart
  const chartData = {
    labels: mptData.tickers,
    datasets: [
      {
        label: 'Weighting',
        data: mptData.tangency_portfolio.weights,
        borderColor: mptData.tickers.map((ticker) => getRandomColor(ticker)),
        backgroundColor: mptData.tickers.map((ticker) => getRandomColor(ticker)),
      },
    ],
  }

  // Prepare the options for the bar chart
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Weighting of each asset in the tangency portfolio',
      },
    },
    scales: {
      y: {
        ticks: {
          // Include a percent sign in the ticks
          callback: function (value: number) {
            return (100 * value).toFixed(0) + '%'
          },
        },
      },
    },
  }

  return (
    <>
      {/* @ts-expect-error chartjs */}
      <Bar data={chartData} options={options} />
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Asset</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Portfolio Weight</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Expected Return</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Standard Deviation</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Sharpe Ratio</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {mptData.asset_datapoints
            .map((asset_datapoint, index) => ({
              asset_datapoint,
              weight: mptData.tangency_portfolio.weights[index]!,
            }))
            .sort((a, b) => b.weight - a.weight) // Sort by weight in descending order
            .map(({ asset_datapoint, weight }) => (
              <Table.Row key={asset_datapoint.ticker}>
                <Table.RowHeaderCell>{tickers[asset_datapoint.ticker]?.longName || asset_datapoint.ticker}</Table.RowHeaderCell>
                <Table.Cell>{(100 * weight).toFixed(2)}%</Table.Cell>
                <Table.Cell>{(100 * asset_datapoint.return_).toFixed(1)}%</Table.Cell>
                <Table.Cell>{(100 * asset_datapoint.risk).toFixed(1)}%</Table.Cell>
                <Table.Cell>{((asset_datapoint.return_ - pageParams.r) / (asset_datapoint.risk - 0)).toFixed(2)}</Table.Cell>
              </Table.Row>
            ))}
        </Table.Body>
      </Table.Root>
    </>
  )
}
