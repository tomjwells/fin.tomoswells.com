"use client"

import { Flex, RadioGroup, Select, Text } from "@radix-ui/themes";
import { useRouter, useSearchParams } from "next/navigation";

type OptionType = "european" | "american"

export default function SelectMethod({ optionType, method }: {
  optionType: OptionType
  method: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const options = optionType === "european" ? [
    { label: "Black Scholes", value: "black-scholes" },
    { label: "Monte Carlo", value: "monte-carlo" },
  ] : [
    { label: "Binomial Tree", value: "binomial-tree" },
    { label: "Monte Carlo", value: "monte-carlo" },
  ]



  return (
    <RadioGroup.Root ml="5" my="4" defaultValue={method} onValueChange={(value) => {
      router.push(
        `?${new URLSearchParams({
          ...Object.fromEntries(searchParams ?? []),
          method: value,
        }).toString()}`,
      )
    }}>
      <Flex gap="2" direction="row">
        {options.map((option) => (
          <Text as="label" size="2"
            key={option.value}
          >
            <Flex gap="2">
              <RadioGroup.Item value={option.value} /> {option.label}
            </Flex>
          </Text>
        ))
        }
      </Flex>
    </RadioGroup.Root>
  )
}