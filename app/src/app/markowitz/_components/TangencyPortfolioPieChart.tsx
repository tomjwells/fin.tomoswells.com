"use client"

import { MPTData, PageParams } from '../page';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';


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

