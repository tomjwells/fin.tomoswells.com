"use client"

import { Box, Flex, Text, TextField } from "@radix-ui/themes"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

export default function SetStrike({
  optionType,
  T,
  K,
  currentPrice
}: {
  optionType: string,
  T: string,
  K: number
  currentPrice: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  return (
    <Flex direction="column" gap="2"   >
      <label htmlFor="strike-price">Strike Price</label>
      <Box maxWidth="200px">
        <TextField.Root size="2"
          defaultValue={K || 0}
          type="number"
          onChange={
            (e) => {
              startTransition(() => {
                router.push(`?${new URLSearchParams({
                  ...Object.fromEntries(searchParams ?? []),
                  K: e.target?.value,
                })}`)
              })
            }
          }
        >
          <TextField.Slot>
            $
          </TextField.Slot>
        </TextField.Root>
      </Box>
      <Text color="gray" size="2">
        (Current price: ${currentPrice.toFixed(2)})
      </Text>
    </Flex>
  )
}