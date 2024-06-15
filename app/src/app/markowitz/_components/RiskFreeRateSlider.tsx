'use client'
import React from 'react'
import { Flex, Slider, Spinner, TextField } from '@radix-ui/themes'
import { useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'
import { PageParams } from '../page'

const SLIDER_MIN = 0
const SLIDER_MAX = 10
const DEBOUNCE_TIME = 150

export default function RiskFreeRateSlider(pageParams: PageParams) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  const [value, setValue] = React.useState<number>(100 * pageParams.r)
  const handleInputChange = (value: number) => {
    if (value >= 0) {
      setValue(value)
      if (timer) {
        clearTimeout(timer)
      }

      setTimer(
        setTimeout(() => {
          startTransition(() => {
            const queryParams = new URLSearchParams()
            pageParams.assets.forEach((asset) => queryParams.append('assets', asset))
            queryParams.append('startYear', `${pageParams.startYear}`)
            queryParams.append('endYear', `${pageParams.endYear}`)
            queryParams.set('r', (value / 100).toFixed(6))
            queryParams.append('allowShortSelling', `${pageParams.allowShortSelling}`)
            router.push(`?${queryParams}`, { scroll: false })
          })
        }, DEBOUNCE_TIME)
      )
    }
  }

  return (
    <Flex direction='row' align='center' gap='4' my='4'>
      <TextField.Root size='2' value={value.toFixed(2)} className='w-32' onChange={(e) => handleInputChange(parseFloat(e.target.value))} type='number'>
        <TextField.Slot>r</TextField.Slot>
        <TextField.Slot>{isPending ? <Spinner /> : `%`}</TextField.Slot>
      </TextField.Root>
      <Slider
        variant='classic'
        defaultValue={[value * (SLIDER_MAX - SLIDER_MIN)]}
        value={[value * (SLIDER_MAX - SLIDER_MIN)]}
        style={{ width: 300 }}
        draggable
        onValueChange={(value) => {
          setValue(value[0]! / (SLIDER_MAX - SLIDER_MIN))
          handleInputChange(value[0]! / (SLIDER_MAX - SLIDER_MIN))
        }}
      />
    </Flex>
  )
}
