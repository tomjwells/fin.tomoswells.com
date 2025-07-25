'use client'

import { Spinner } from '@radix-ui/themes'
import { Box, Flex, Text, TextField } from '@radix-ui/themes'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, use } from 'react'
import type { PageParams } from '../page'

const DEBOUNCE_TIME = 250

export default function SetStrike({ pageParams, currentPricePromise }: { pageParams: PageParams; currentPricePromise: Promise<number> }) {
  const currentPrice = use(currentPricePromise)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null)

  return (
    <Flex direction='column' gap='2'>
      <label htmlFor='strike-price'>Strike Price</label>
      <Box maxWidth='200px'>
        <TextField.Root
          size='2'
          defaultValue={pageParams.K}
          type='number'
          onChange={(e) => {
            if (timer) {
              clearTimeout(timer)
            }
            
            const value = e.target?.value
            if (typeof value === 'string') {
              setTimer(
                setTimeout(() => {
                  startTransition(() => {
                    const params = new URLSearchParams(searchParams)
                    params.set('K', value)
                    router.push(`?${params}`, { scroll: false })
                  })
                }, DEBOUNCE_TIME)
              )
            }
            
          }}
        >
          <TextField.Slot>$</TextField.Slot>
          <TextField.Slot>{isPending && <Spinner />}</TextField.Slot>
        </TextField.Root>
      </Box>
      <Text color='gray' size='2'>
        (Current price: ${currentPrice.toFixed(2)})
      </Text>
    </Flex>
  )
}
