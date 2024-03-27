"use client"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/shadcn/Accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/shadcn/Select"
import { PageParams } from "../page"
import { Flex, Grid, Heading } from "@radix-ui/themes"
import { useTransition } from "react"

const YEARS = Array.from({ length: (new Date().getFullYear()) - 2000 + 1 }, (_, i) => {
  const year = 2000 + i
  return { value: year.toString(), name: year.toString() }
})

export default function AdvancedControls({ pageParams }: { pageParams: PageParams }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  console.log({ pageParams, searchParams })
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>Advanced controls</AccordionTrigger>
        <AccordionContent>
          <Grid columns="2" gap="4" align="center">
            <Flex gap="4" align="center">
              <Flex justify="end">
                <Heading size="3" weight="bold">Start Year</Heading>
              </Flex>
              <Select defaultValue={pageParams.startYear.toString()} onValueChange={(value) => {
                startTransition(() => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('startYear', value)
                  router.push(`?${params.toString()}`, { scroll: false })
                })

              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Start Year" />
                </SelectTrigger>
                <SelectContent >
                  {
                    YEARS.map(({ value, name }) => (
                      <SelectItem key={value} value={value}>{name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </Flex>
            <Flex gap="4" align="center">
              <Flex justify="end">
                <Heading size="3" weight="bold">End Year</Heading>
              </Flex>
              <Select defaultValue={pageParams.endYear.toString()} onValueChange={(value) => {
                startTransition(() => {
                  if (parseInt(value) > pageParams.startYear) {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('endYear', value)
                    router.push(`?${params.toString()}`, { scroll: false })
                  }
                })
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="End Year" />
                </SelectTrigger>
                <SelectContent >
                  {
                    YEARS.map(({ value, name }) => (
                      <SelectItem key={value} value={value}>{name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </Flex>
          </Grid>
        </AccordionContent>
      </AccordionItem>
    </Accordion >
  )
}