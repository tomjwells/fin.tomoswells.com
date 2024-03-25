"use client"
import React, { useState } from 'react';
import MPTPage, { MPTData } from '../page';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
} from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ScatterController
);

export default function ChartJSChart({ mptData, riskFreeRate }: { mptData: MPTData; riskFreeRate: number }) {
  const [hoveredDot, setHoveredDot] = useState<number | null>(null);

  // console.log({ MPTData: mptData })
  const data = mptData.data
  const tangency_portfolio = mptData.tangency_portfolio
  const slope = (tangency_portfolio.return - riskFreeRate) / (tangency_portfolio.risk - 0)
  console.log({ tangency_portfolio })

  // const Y_MIN = -0.5;
  // const Y_MAX = 1;
  // const X_MIN = 0;
  // const X_MAX = 0.8;
  const X_MIN = 0
  const X_MAX = 0.7;
  const Y_MIN = Math.min(...data
    .filter(d => d.risk < X_MAX)
    .map(d => d.return));
  const Y_MAX = Math.max(...data.filter(d => d.risk < X_MAX).map(d => d.return));

  const segment = [{ x: 0, y: riskFreeRate }, {
    x: slope * X_MAX + riskFreeRate > Y_MAX ?
      (Y_MAX - riskFreeRate) / slope : X_MAX, y: slope * X_MAX + riskFreeRate > Y_MAX ? Y_MAX : slope * X_MAX + riskFreeRate
  }]



  const minRiskDataPoint = data.reduce((min, current) => current.risk < min.risk ? current : min, data[0]!)
  const chartData = {
    labels: data.map(d => d.risk),
    datasets: [
      {
        label: 'Tangency Portfolio',
        data: [{ x: tangency_portfolio.risk, y: tangency_portfolio.return }], // replace with your actual data
        type: 'scatter', // set type to scatter
        mode: 'markers',
        borderColor: '#003362',
        backgroundColor: '#003362',
        pointBorderColor: '#003362',
        pointBackgroundColor: '#003362',
        pointBorderWidth: 1,
        pointHoverRadius: 10,
        pointHoverBackgroundColor: '#003362',
        pointHoverBorderColor: '#003362',
        pointHoverBorderWidth: 5,
        pointRadius: 5,
        pointHitRadius: 10,
        fill: false,
        showLine: false // no line for this dataset
      },
      {
        label: 'Capital Asset Line',
        data: [{ x: 0, y: riskFreeRate }, {
          x: slope * X_MAX + riskFreeRate > Y_MAX ?
            (Y_MAX - riskFreeRate) / slope : X_MAX, y: slope * X_MAX + riskFreeRate > Y_MAX ? Y_MAX : slope * X_MAX + riskFreeRate
        }], // assuming this is an array of {x, y} points
        borderColor: '#0075FF57', // customize as needed
        backgroundColor: 'transparent',
        fill: false,
        borderDash: [5, 5],
        borderWidth: 2
      },
      {
        label: 'Efficient frontier',
        data: data.filter(d => d.return >= minRiskDataPoint.return).map(d => ({ x: d.risk, y: d.return })),
        borderColor: 'white',
        backgroundColor: 'transparent',
        pointBackgroundColor: 'white',
        pointBorderWidth: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'white',
        pointHoverBorderColor: 'rewhite',
        pointHoverBorderWidth: 2,
        pointRadius: 0.1,
        pointHitRadius: 10,
        borderWidth: 1,
        fill: false
      },
      {
        label: 'Inefficient frontier',
        // data: data.map(d => d.return),
        data: data.filter(d => d.return <= minRiskDataPoint.return).map(d => ({ x: d.risk, y: d.return })),
        borderColor: 'white',
        backgroundColor: 'transparent',
        pointBackgroundColor: 'white',
        pointBorderWidth: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: 'white',
        pointHoverBorderColor: 'white',
        pointHoverBorderWidth: 2,
        pointRadius: 0.1,
        borderWidth: 1,
        pointHitRadius: 10,
        fill: false,
        borderDash: [5, 5],

      },

      ...mptData.asset_datapoints.map((d, i) => ({
        label: d.ticker,
        data: [{ x: d.risk, y: d.return }], // replace with your actual data
        type: 'scatter', // set type to scatter
        mode: 'markers',
        backgroundColor: 'blue', // customize as needed
        pointRadius: 6,
        fill: false
      }))
      // {
      //   label: 'Scatter Data',
      //   //     x: mptData.asset_datapoints.map(d => d.risk),
      //   // y: mptData.asset_datapoints.map(d => d.return),
      //   // data: scatterData.x.map((x, i) => ({ x: x, y: scatterData.y[i] })), // transform scatterData into {x, y} format
      //   data: mptData.asset_datapoints.map(d => ({ x: d.risk, y: d.return, label: d.ticker })),
      //   type: 'scatter', // set type to scatter
      //   mode: 'markers',
      //   backgroundColor: 'blue', // customize as needed
      //   pointRadius: 6,
      //   fill: false
      // },
    ]
  };

  const options = {
    responsive: true,
    backgroundColor: 'transparent',
    height: 500,
    scales: {
      x: { // 'x' for x-axis
        border: { dash: [4, 4] }, // for the grid lines
        title: {
          display: true,
          text: 'Risk',
          color: 'rgba(256, 256, 256, 0.9)', // grey color
          font: {
            size: 16, // set font size to 14
          },
        },
        grid: {
          color: 'rgba(256, 256, 256, 0.3)', // for the grid lines
          tickColor: 'rgba(256, 256, 256, 0.3)', // for the tick mark
          tickBorderDash: [4, 4], // also for the tick, if long enough
          tickLength: 0, // just to see the dotted line
          tickWidth: 1,
          // offset: true,
          drawTicks: true, // true is default 
          drawOnChartArea: true // true is default 
        },
        type: 'linear',
        min: X_MIN, // set minimum value
        max: X_MAX, // set maximum value
        ticks: {
          stepSize: 0.1, // set increment size
          color: 'rgba(256, 256, 256, 0.7)', // grey color
          borderDash: [5, 5], // dashed lines
          callback: function (value: number, index: number, values: number[]) {
            return Math.round(value * 10) * 10 + '%'; // convert to percentage
          },
          font: {
            size: 14,
          },
        }
      },
      y: { // 'y' for y-axis
        type: 'linear',
        min: Y_MIN, // set minimum value
        max: Y_MAX, // set maximum value
        title: {
          display: true,
          text: 'Return',
          color: 'rgba(256, 256, 256, 0.9)', // grey color
          font: {
            size: 16,
          },
        },
        ticks: {
          stepSize: 0.1, // set increment size
          color: 'rgba(256, 256, 256, 0.8)', // grey color
          borderDash: [5, 5], // dashed lines
          callback: function (value: number, index: number, values: number[]) {
            // Don't display the label for Y_MIN and Y_MAX
            if (value === Y_MIN || value === Y_MAX) {
              // return Math.round(value * 10) * 10 + '%';
              return ''
            }
            return Math.round(value * 10) * 10 + '%'; // convert to percentage
          },
          font: {
            size: 14,
          },
        },
        border: { dash: [4, 4] }, // for the grid lines
        grid: {

          color: function (context: { tick: { value: number; }; }) {
            return context.tick.value === Y_MIN || context.tick.value === Y_MAX ? 'transparent' : 'rgba(128, 128, 128, 0.5)';
          },
          // color: 'rgba(256, 256, 256, 0.3)', // for the grid lines
          // tickColor: 'rgba(256, 256, 256, 0.3)', // for the tick mark
          tickBorderDash: [4, 4], // also for the tick, if long enough
          tickLength: 10, // just to see the dotted line
          tickWidth: 1,
          // offset: true,
          drawTicks: true, // true is default 
          drawOnChartArea: true // true is default 
        },
      }
    },
    plugins: {
      legend: {
        display: false
      }
    },
    tooltips: {
      callbacks: {
        label: function (tooltipItem: { yLabel: string; }) {
          return tooltipItem.yLabel + '%';
        }
      }
    },
    elements: {
      line: {
        tension: 0
      }
    },
    maintainAspectRatio: false
  };

  return (
    // @ts-expect-error ChartJS
    <Line data={chartData} options={options} />
  );
}

