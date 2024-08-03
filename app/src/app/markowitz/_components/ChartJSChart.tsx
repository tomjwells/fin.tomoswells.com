// @ts-nocheck
'use client'
import React from 'react'
import type { MPTData } from '../page'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ScatterController } from 'chart.js'
import { Line } from 'react-chartjs-2'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ScatterController)
import { blue, indigo, jade, amber, cyan, sky, iris, grass, teal } from '@radix-ui/colors'
const colors = [blue, indigo, jade, cyan, sky, iris, grass, teal]

const tangentPortfolioColour = '#FFF'

export default function ChartJSChart({
  mptData,
  riskFreeRate,
  tangencyPortfolio,
  allowShortSelling,
}: {
  mptData: MPTData
  riskFreeRate: number
  tangencyPortfolio: MPTData['tangency_portfolio']
  allowShortSelling: boolean
}) {
  const data = mptData.efficient_frontier
  const slope = (tangencyPortfolio.return - riskFreeRate) / (tangencyPortfolio.risk - 0)
  console.log({ tangency_portfolio: tangencyPortfolio })

  const X_MIN = 0
  const X_MAX = 0.7
  // const Y_MIN = Math.min(...data
  //   .filter(d => d.risk < X_MAX)
  //   .map(d => d.return))
  const Y_MIN = -0.2
  const Y_MAX = 0.1 + Math.max(...data.filter((d) => d.risk < X_MAX).map((d) => d.return))
  // const Y_MAX = 0.7

  const externalTooltipHandler = (context) => {
    // Tooltip Element
    const { chart, tooltip } = context
    const tooltipEl = getOrCreateTooltip(chart)

    // Hide if no tooltip
    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0
      return
    }

    // Set Text
    if (tooltip.body) {
      const titleLines = tooltip.title || []
      const bodyLines = tooltip.body.map((b) => b.lines)

      const tableHead = document.createElement('thead')

      // @ts-expect-error any
      titleLines.forEach((title) => {
        const tr = document.createElement('tr')
        tr.style.borderWidth = '0'

        const th = document.createElement('th')
        th.style.borderWidth = '0'

        // Square
        const span = document.createElement('span')
        const colors = tooltip.labelColors[0]
        span.style.background = colors.backgroundColor
        span.style.borderColor = colors.borderColor
        span.style.borderWidth = '2px'
        span.style.marginRight = '10px'
        span.style.height = '10px'
        span.style.width = '10px'
        span.style.display = 'inline-block'
        th.appendChild(span)

        if (tooltip.dataPoints[0]?.raw.weights) {
          th.appendChild(document.createTextNode('Efficient Frontier'))
        } else {
          if (tooltip.dataPoints[0]?.raw.status) {
            th.appendChild(document.createTextNode(tooltip.dataPoints[0]?.raw.status))
          } else if (tooltip.dataPoints[0]?.raw.title) {
            th.appendChild(document.createTextNode(tooltip.dataPoints[0]?.raw.title))
          } else {
            th.appendChild(document.createTextNode(title))
          }
        }

        tr.appendChild(th)
        tableHead.appendChild(tr)
      })

      const tableBody = document.createElement('tbody')
      // @ts-expect-error any
      bodyLines.forEach((body, i) => {
        const tr2 = document.createElement('tr')
        const td2 = document.createElement('td')
        const text2 = document.createTextNode(`Expected Return: ${(tooltip.dataPoints[0]?.raw.y * 100).toFixed(2)}%`)
        td2.appendChild(text2)
        tr2.appendChild(td2)

        const tr = document.createElement('tr')
        tr.style.backgroundColor = 'inherit'
        tr.style.borderWidth = '0'
        const td = document.createElement('td')
        td.style.borderWidth = '0'
        const text1 = document.createTextNode(`Volatility: ${(tooltip.dataPoints[0]?.raw.x * 100).toFixed(2)}%`)
        td.appendChild(text1)
        tr.appendChild(td)

        const tr3 = document.createElement('tr')
        const td3 = document.createElement('td')
        const text3 = document.createTextNode(`Sharpe Ratio: ${((tooltip.dataPoints[0]?.raw.y - riskFreeRate) / tooltip.dataPoints[0]?.raw.x).toFixed(2)}`)
        td3.appendChild(text3)
        tr3.appendChild(td3)

        tableBody.appendChild(tr2)
        tableBody.appendChild(tr)
        tableBody.appendChild(tr3)
      })

      // Remove old children
      const tableRoot = tooltipEl.querySelector('table')
      while (tableRoot.firstChild) {
        tableRoot.firstChild.remove()
      }

      // Add new children
      tableRoot.appendChild(tableHead)
      tableRoot.appendChild(tableBody)
    }

    // Remove old children
    const tableRoot = tooltipEl.querySelector('#tooltip-table')
    while (tableRoot.firstChild) {
      tableRoot.firstChild.remove()
    }
    // Add weights
    if (tooltip.dataPoints[0]?.raw.weights) {
      // console.log({ tooltipItems: tooltip.dataPoints[0]?.raw.weights })
      const weights = tooltip.dataPoints[0]?.raw.weights

      if (weights) {
        // Create the table head
        const thead = document.createElement('thead')
        thead.style.width = '400px'
        const headerRow = document.createElement('tr')
        const tickerHeader = document.createElement('th')
        tickerHeader.textContent = 'Ticker'
        const weightHeader = document.createElement('th')
        weightHeader.textContent = 'Weight'
        headerRow.appendChild(tickerHeader)
        headerRow.appendChild(weightHeader)
        thead.appendChild(headerRow)
        const table = document.createElement('table')
        table.appendChild(thead)

        // Create the table body
        const tbody = document.createElement('tbody')
        const sortedEntries = Object.entries(weights).sort((a, b) => b[1] - a[1])
        for (const [k, v] of sortedEntries) {
          const row = document.createElement('tr')
          // Create a colored square
          const colorSquare = document.createElement('span')
          const color = getRandomColor(k)
          colorSquare.style.background = color
          colorSquare.style.borderColor = color
          colorSquare.style.borderWidth = '2px'
          colorSquare.style.marginRight = '10px'
          colorSquare.style.height = '10px'
          colorSquare.style.width = '10px'
          colorSquare.style.display = 'inline-block'

          const tickerDiv = document.createElement('div')
          tickerDiv.style.width = '100px'
          tickerDiv.style.whiteSpace = 'nowrap'

          // Add the color square and the text to the div
          tickerDiv.appendChild(colorSquare)
          tickerDiv.appendChild(document.createTextNode(k))

          // Add the div to the ticker cell
          const tickerCell = document.createElement('td')
          tickerCell.appendChild(tickerDiv)
          const weightCell = document.createElement('td')
          weightCell.textContent = `${(100 * parseFloat(v as string)).toFixed(2)}%`
          row.appendChild(tickerCell)
          row.appendChild(weightCell)
          tbody.appendChild(row)
        }
        table.appendChild(tbody)

        // Append
        const tooltipBody = tooltipEl.querySelector('#tooltip-table')
        tooltipBody.appendChild(table)
      }
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas

    // Display, position, and set styles for font
    tooltipEl.style.opacity = 1
    tooltipEl.style.left = positionX + tooltip.caretX + 'px'
    tooltipEl.style.top = positionY + tooltip.caretY + 'px'
    tooltipEl.style.font = tooltip.options.bodyFont.string
    tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px'
  }

  const minRiskDataPoint = data.reduce((min, current) => (current.risk < min.risk ? current : min), data[0]!)
  const chartData = {
    labels: data.map((d) => d.risk),
    datasets: [
      {
        label: 'Tangency Portfolio',
        data: [{ x: tangencyPortfolio.risk, y: tangencyPortfolio.return, title: 'Tangency Portfolio' }], // replace with your actual data
        type: 'scatter', // set type to scatter
        mode: 'markers',
        borderColor: tangentPortfolioColour,
        backgroundColor: tangentPortfolioColour,
        pointBorderColor: tangentPortfolioColour,
        pointBackgroundColor: tangentPortfolioColour,
        pointBorderWidth: 1,
        pointHoverRadius: 10,
        pointHoverBackgroundColor: tangentPortfolioColour,
        pointHoverBorderColor: tangentPortfolioColour,
        pointHoverBorderWidth: 5,
        pointRadius: 5,
        pointHitRadius: 10,
        fill: false,
        showLine: false, // no line for this dataset
      },
      {
        label: 'Capital Market Line',
        data: [
          { x: 0, y: riskFreeRate, title: 'Risk-free Rate' },
          {
            x: slope * X_MAX + riskFreeRate > Y_MAX ? (Y_MAX - riskFreeRate) / slope : X_MAX,
            y: slope * X_MAX + riskFreeRate > Y_MAX ? Y_MAX : slope * X_MAX + riskFreeRate,
          },
        ],
        borderColor: tangentPortfolioColour,
        backgroundColor: 'transparent',
        fill: false,
        borderDash: [5, 5],
        borderWidth: 2,
      },

      {
        label: 'Efficient frontier',
        data: data
          .filter((d) => d.return >= minRiskDataPoint.return)
          .map((d) => ({ x: d.risk, y: d.return, weights: d.weights.reduce((acc, w, i) => ({ ...acc, [`${mptData.tickers[i]}`]: w }), {}) })),
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
        fill: false,
      },
      {
        label: 'Inefficient frontier',
        hidden: !allowShortSelling,
        data: data
          .filter((d) => d.return <= minRiskDataPoint.return)
          .map((d) => ({ x: d.risk, y: d.return, weights: d.weights.reduce((acc, w, i) => ({ ...acc, [`${mptData.tickers[i]}`]: w }), {}) })),
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

      ...mptData.asset_datapoints.map((d, i) => {
        const color = getRandomColor(d.ticker) // Generate a random color

        return {
          label: d.ticker,
          data: [{ x: d.risk, y: d.return, status: d.ticker }], // replace with your actual data
          type: 'scatter', // set type to scatter
          mode: 'markers',
          backgroundColor: 'blue', // customize as needed
          pointRadius: 6,
          fill: false,
          borderColor: color,
          pointBackgroundColor: color,
          pointBorderColor: color,
          pointHoverRadius: 10,
          pointHoverBackgroundColor: color,
        }
      }),
    ],
  }

  const scatterDataLabelsPlugin = {
    id: 'scatterDataLabels',
    afterDatasetsDraw(chart, args, options) {
      const { ctx } = chart
      ctx.save()

      ctx.font = '12px sans-serif'
      ctx.fillStyle = 'red'

      for (let x = 0; x < chart.config._config.data.datasets.length; x++) {
        const dataset = chart.config._config.data.datasets[x]
        if (dataset.data.length > 0) {
          const textWidth = ctx.measureText(dataset.data[0].status).width
          for (let i = 0; i < dataset.data.length; i++) {
            if (chart.config.data.datasets[x].data[i].status) {
              const meta = chart.getDatasetMeta(x)

              // Set the fillStyle to the color of the current datapoint
              ctx.fillStyle = dataset.pointBackgroundColor

              ctx.fillText(chart.config.data.datasets[x].data[i].status, meta.data[i].x - textWidth / 2, meta.data[i].y + 25)
            }
          }
        }
      }
      ctx.restore()
    },
  }

  const options = {
    responsive: true,
    backgroundColor: 'transparent',
    height: 500,
    scales: {
      x: {
        // 'x' for x-axis
        border: { dash: [4, 4] }, // for the grid lines
        title: {
          display: true,
          text: 'Expected Volatility',
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
          drawTicks: true, // true is default
          drawOnChartArea: true, // true is default
        },
        type: 'linear',
        min: X_MIN, // set minimum value
        max: X_MAX, // set maximum value
        ticks: {
          stepSize: 0.1, // set increment size
          color: 'rgba(256, 256, 256, 0.7)', // grey color
          borderDash: [5, 5], // dashed lines
          callback: function (value: number, index: number, values: number[]) {
            return Math.round(value * 10) * 10 + '%' // convert to percentage
          },
          font: {
            size: 14,
          },
        },
      },
      y: {
        // 'y' for y-axis
        type: 'linear',
        min: Y_MIN, // set minimum value
        max: Y_MAX, // set maximum value
        title: {
          display: true,
          text: 'Expected Return',
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
              return ''
            }
            return Math.round(value * 10) * 10 + '%' // convert to percentage
          },
          font: {
            size: 14,
          },
        },
        border: { dash: [4, 4] }, // for the grid lines
        grid: {
          color: function (context: { tick: { value: number } }) {
            return context.tick.value === Y_MIN || context.tick.value === Y_MAX ? 'transparent' : 'rgba(128, 128, 128, 0.5)'
          },
          tickBorderDash: [4, 4], // also for the tick, if long enough
          tickLength: 10, // just to see the dotted line
          tickWidth: 1,
          drawTicks: true, // true is default
          drawOnChartArea: true, // true is default
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        position: 'nearest',
        external: externalTooltipHandler,
      },
    },
    tooltips: {
      enabled: true,
      callbacks: {
        label: function (tooltipItem: { yLabel: string }) {
          return tooltipItem.yLabel + '%'
        },
      },
    },
    elements: {
      line: {
        tension: 0,
      },
    },
    maintainAspectRatio: false,
  }

  return (
    // @ts-expect-error ChartJS
    <Line data={chartData} options={options} plugins={[scatterDataLabelsPlugin]} />
  )
}

function stringToHash(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  return hash
}

export function getRandomColor(str: string) {
  // Convert the string to a hash
  const hash = stringToHash(str)

  // Use the absolute value of the hash modulo the length of the colors array to get a consistent index
  const colorClassIndex = Math.abs(hash) % colors.length

  // Select a color class
  const colorClass = colors[colorClassIndex]!

  // Get an array of the keys of the color class object
  const keys = Object.keys(colorClass)

  // Filter the keys to only include those with integer values greater than 4 and less than 10
  const filteredKeys = keys.filter((key) => {
    const intValue = parseInt(key.replace(/\D/g, ''))
    return intValue > 8 && intValue < 11
  })

  // Use the hash to select a key from the filtered keys array
  const keyIndex = Math.abs(hash) % filteredKeys.length
  const randomKey = filteredKeys[keyIndex]!

  // Use the random key to get a color from the color class object
  const color = (colorClass as Record<string, string>)[randomKey]

  return color
}

// Tooltip
const getOrCreateTooltip = (chart) => {
  let tooltipEl = chart.canvas.parentNode.querySelector('div')

  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.style.background = 'rgba(0, 0, 0, 0.7)'
    tooltipEl.style.borderRadius = '3px'
    tooltipEl.style.color = 'white'
    tooltipEl.style.opacity = 1
    tooltipEl.style.pointerEvents = 'none'
    tooltipEl.style.position = 'absolute'
    tooltipEl.style.transform = 'translate(-50%, 0)'
    tooltipEl.style.transition = 'all .1s ease'

    const table = document.createElement('table')
    const table2 = document.createElement('table')
    table2.id = 'tooltip-table'
    table.style.margin = '0px'

    tooltipEl.appendChild(table)
    tooltipEl.appendChild(table2)
    chart.canvas.parentNode.appendChild(tooltipEl)
  }

  return tooltipEl
}
