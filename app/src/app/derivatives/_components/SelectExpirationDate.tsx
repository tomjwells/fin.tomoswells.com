"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "~/shadcn/Popover"
import { Button } from "~/shadcn/Button"
import cn from "~/shadcn/cn"
import { Calendar } from "~/shadcn/Calendar"
import { Flex } from "@radix-ui/themes"
import { useRouter, useSearchParams } from "next/navigation"
import { formatISO } from 'date-fns'
import { PageParams } from "../page"



export default function SelectExpirationDate({ pageParams }: { pageParams: PageParams }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const date = new Date(pageParams.T)

  return (
    <Flex direction="column" gap="2">
      <label htmlFor="ticker">Expiration Date</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-min justify-start text-left font-normal",
              !pageParams.T && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(pageParams.T, "PPP")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => date && router.push(
              `?${new URLSearchParams({
                ...Object.fromEntries(searchParams),
                T: formatISO(date, { representation: 'date' }),
              })}`,
              { scroll: false }
            )}
            initialFocus
            disabled={{ from: new Date(1970, 1, 1), to: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </Flex>
  )
}
