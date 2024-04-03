"use client"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, } from "~/shadcn/Accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "~/shadcn/Select"
import { PageParams } from "../page"
import { Flex, Grid, Heading } from "@radix-ui/themes"
import cn from "~/shadcn/cn"

const YEARS = Array.from({ length: (new Date().getFullYear()) - 2000 + 1 }, (_, i) => {
  const year = 2000 + i
  return { value: year.toString(), name: year.toString() }
})

export default function AdvancedControls({ pageParams }: { pageParams: PageParams }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<"start-year" | "end-year" | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleYearChange(startYear: number, endYear: number) {
    if (startYear < endYear) {
      setError(null)
      startTransition(() => {
        const params = new URLSearchParams(searchParams)
        params.set('startYear', `${startYear}`)
        params.set('endYear', `${endYear}`)
        router.push(`?${params}`, { scroll: false })
      })
    }

  }

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
              <Select defaultValue={pageParams.startYear.toString()} onValueChange={(value) => { parseInt(value) < pageParams.endYear ? handleYearChange(parseInt(value), pageParams.endYear) : setError("start-year") }}>
                <SelectTrigger className={cn("w-[180px]", error === "start-year" && "!border-red-500")}>
                  <SelectValue placeholder="Start Year" />
                </SelectTrigger>
                <SelectContent >
                  {YEARS.map(({ value, name }) => <SelectItem key={value} value={value}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Flex>
            <Flex gap="4" align="center">
              <Flex justify="end">
                <Heading size="3" weight="bold">End Year</Heading>
              </Flex>
              <Select defaultValue={pageParams.endYear.toString()} onValueChange={(value) => { parseInt(value) > pageParams.startYear ? handleYearChange(pageParams.startYear, parseInt(value)) : setError("end-year") }}>
                <SelectTrigger className={cn("w-[180px]", error === "end-year" && "!border-red-500")}>
                  <SelectValue placeholder="End Year" />
                </SelectTrigger>
                <SelectContent >
                  {YEARS.map(({ value, name }) => <SelectItem key={value} value={value}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Flex>
          </Grid>
        </AccordionContent>
      </AccordionItem>
    </Accordion >
  )
}