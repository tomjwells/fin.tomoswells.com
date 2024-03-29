"use client"

import { Table } from '@radix-ui/themes';
import { PageParams } from '../page';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, BarController, CategoryScale, LinearScale } from 'chart.js';
import { getRandomColor } from './ChartJSChart';
Chart.register(BarController, BarElement, CategoryScale, LinearScale);

type TangencyPortfolio = {
  weights: number[];
  return: number;
  risk: number;
}
// Define colors for the Pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function TangencyPortfolioPieChart({ tangencyPortfolio, pageParams }: { tangencyPortfolio: TangencyPortfolio; pageParams: PageParams }) {
  // console.log({ MPTData: mptData })
  const tickers = pageParams.assets


  // Prepare the data for the Pie chart
  const pieData = tickers.map((ticker, index) => ({
    name: ticker,
    value: tangencyPortfolio.weights[index]
  }));

  // Prepare the data for the bar chart
  const chartData = {
    labels: tickers,
    datasets: [
      {
        label: 'Returns',
        data: tangencyPortfolio.weights,
        borderColor: tickers.map((ticker) => getRandomColor(ticker)),
        backgroundColor: tickers.map((ticker) => getRandomColor(ticker)),
      },
    ],
  };

  // Prepare the options for the bar chart
  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Portfolio Weights by Ticker',
      },
    },
    scales: {
      y: {
        ticks: {
          // Include a percent sign in the ticks
          callback: function (value: number) {
            return (100 * value).toFixed(0) + '%';
          }
        }
      }
    },
  };

  return (
    <>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Ticker</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Portfolio Weighting</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {
            tickers.map((ticker, index) => (
              <Table.Row key={ticker}>
                <Table.RowHeaderCell>{ticker}</Table.RowHeaderCell>
                <Table.Cell>{(100 * tangencyPortfolio.weights[index]!).toFixed(2)}%</Table.Cell>
              </Table.Row>
            ))
          }
        </Table.Body>
      </Table.Root>
      {/* @ts-expect-error chartjs */}
      <Bar data={chartData} options={options} />
    </>
  );

}

