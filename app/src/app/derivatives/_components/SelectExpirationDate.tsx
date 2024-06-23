'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '~/shadcn/Popover'
import { Button } from '~/shadcn/Button'
import cn from '~/shadcn/cn'
import { Calendar } from '~/shadcn/Calendar'
import { Flex } from '@radix-ui/themes'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatISO } from 'date-fns'
import { PageParams } from '../page'

export default function SelectExpirationDate(pageParams: PageParams) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <Flex direction='column' gap='2'>
      <label htmlFor='ticker'>Expiration Date</label>
      <Flex direction='column' gap='2' align='center'>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={'outline'}
              className={cn('w-min justify-start h-8 text-left !border-[var(--gray-a7)] font-normal !bg-[--color-surface]', !pageParams.T && 'text-muted-foreground')}
              // style={{ boxShadow: 'inset 0 0 0 var(--text-field-border-width) var(--gray-a7)' }}
            >
              <CalendarIcon className='mr-2 h-4 w-4' />
              {format(pageParams.T, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0'>
            <Calendar
              mode='single'
              selected={new Date(pageParams.T)}
              defaultMonth={new Date(pageParams.T)}
              onSelect={(date) => {
                if (date) {
                  const params = new URLSearchParams(searchParams)
                  params.delete('T')
                  params.append('T', formatISO(date, { representation: 'date' }))
                  router.push(`?${params}`, { scroll: false })
                }
              }}
              initialFocus
              disabled={{ from: new Date(1970, 1, 1), to: new Date() }}
              className='!border-[var(--gray-a7)] !bg-[--color-surface]'
            />
          </PopoverContent>
        </Popover>
      </Flex>
    </Flex>
  )
}
