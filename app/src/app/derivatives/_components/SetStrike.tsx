"use client"

import { Flex, Text, TextField } from "@radix-ui/themes"
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
    <Flex direction="column" gap="2" >
      <label htmlFor="strike-price">Strike Price</label>
      <TextField.Root>
        <TextField.Slot>
          $
        </TextField.Slot>
        <TextField.Input size="2" defaultValue={K || 0}
          onChange={
            (e) => {
              startTransition(() => {
                // use router.push to add the strike price to the query string with the key "K"
                const value = e.target.value
                console.log({ value })
                router.push(
                  `?${new URLSearchParams({
                    ...Object.fromEntries(searchParams ?? []),
                    K: value,
                  }).toString()}`,

                )
              })
            }
          }
          type="number" />
      </TextField.Root>
      <Text color="gray" size="2">

        (Current price: ${currentPrice.toFixed(2)})
      </Text>
    </Flex>
  )
}