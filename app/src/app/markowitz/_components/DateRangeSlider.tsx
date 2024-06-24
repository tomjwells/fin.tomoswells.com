'use client'
import React, { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/shadcn/Select'
import { PageParams } from '../page'
import { Flex, Grid, Heading, Slider, Spinner } from '@radix-ui/themes'
import cn from '~/shadcn/cn'

const YEARS = Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => (new Date().getFullYear() - i).toString())
const SLIDER_MIN = 2000
const SLIDER_MAX = new Date().getFullYear()
const DEBOUNCE_TIME = 200

function getSliderValue(value: number) {
  return (100 * (value - SLIDER_MIN)) / (SLIDER_MAX - SLIDER_MIN)
}
function getYearValue(value: number) {
  return Math.round(0.01 * value * (SLIDER_MAX - SLIDER_MIN)) + SLIDER_MIN
}

export default function AdvancedControls({ pageParams }: { pageParams: PageParams }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sliderRange, setSliderRange] = useState<number[]>([getSliderValue(pageParams.startYear), getSliderValue(pageParams.endYear)])
  const [isPending, startTransition] = useTransition()
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  React.useEffect(() => handleYearChange(sliderRange[0] ? getYearValue(sliderRange[0]) : pageParams.startYear, sliderRange[1] ? getYearValue(sliderRange[1]) : pageParams.endYear), [sliderRange])

  function handleYearChange(startYear: number, endYear: number) {
    if (timer) clearTimeout(timer)

    if (startYear < endYear) {
      setTimer(
        setTimeout(() => {
          startTransition(() => {
            const params = new URLSearchParams(searchParams)
            params.set('startYear', `${startYear}`)
            params.set('endYear', `${endYear}`)
            router.push(`?${params}`, { scroll: false })
          })
        }, DEBOUNCE_TIME)
      )
    }
  }

  return (
    <>
      <Grid columns='3' gap='4' align='center'>
        <Flex gap='4' align='center' justify='center'>
          <Heading size='3' weight='bold'>
            Start Year: {sliderRange[0] !== undefined && getYearValue(sliderRange[0])}
          </Heading>
        </Flex>

        <Flex gap='4' align='center' justify='center'>
          <Slider defaultValue={sliderRange} onValueChange={(v) => setSliderRange(v)} />
          <Spinner style={{ visibility: isPending ? 'visible' : 'hidden' }} />
        </Flex>
        <Flex gap='4' align='center' justify='center'>
          <Heading size='3' weight='bold'>
            End Year: {sliderRange[1] !== undefined && getYearValue(sliderRange[1])}
          </Heading>
        </Flex>
      </Grid>
      {/* <Grid columns='2' gap='4' align='center'>
            <Flex gap='4' align='center'>
              <Flex justify='end'>
                <Heading size='3' weight='bold'>
                  Start Year
                </Heading>
              </Flex>

              <Select
                defaultValue={pageParams.startYear.toString()}
                onValueChange={(value) => {
                  parseInt(value) < pageParams.endYear ? handleYearChange(parseInt(value), pageParams.endYear) : setError('start-year')
                }}
              >
                <SelectTrigger className={cn('w-[180px]', error === 'start-year' && '!border-red-500')}>
                  <SelectValue placeholder='Start Year' />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Flex>

            <Flex gap='4' align='center'>
              <Flex justify='end'>
                <Heading size='3' weight='bold'>
                  End Year
                </Heading>
              </Flex>
              <Select
                defaultValue={pageParams.endYear.toString()}
                onValueChange={(value) => {
                  parseInt(value) > pageParams.startYear ? handleYearChange(pageParams.startYear, parseInt(value)) : setError('end-year')
                }}
              >
                <SelectTrigger className={cn('w-[180px]', error === 'end-year' && '!border-red-500')}>
                  <SelectValue placeholder='End Year' />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Flex>
          </Grid> */}
    </>
  )
}
