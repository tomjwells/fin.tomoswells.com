"use client"

import { MPTData, PageParams } from '../page';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';



// Define colors for the Pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function TangencyPortfolioPieChart({ mptData, pageParams }: { mptData: MPTData; pageParams: PageParams }) {
  // console.log({ MPTData: mptData })
  const tickers = pageParams.assets
  const data = mptData.data
  const tangency_portfolio = mptData.tangency_portfolio
  const slope = (tangency_portfolio.return - pageParams.r) / (tangency_portfolio.risk - 0)
  console.log({ tangency_portfolio })

  // Prepare the data for the Pie chart
  const pieData = tickers.map((ticker, index) => ({
    name: ticker,
    value: tangency_portfolio.weights[index]
  }));

  return (
    <PieChart width={400} height={400}>
      <Pie
        data={pieData}
        cx={200}
        cy={200}
        labelLine={false}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
      >
        {
          pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
        }
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );

}

