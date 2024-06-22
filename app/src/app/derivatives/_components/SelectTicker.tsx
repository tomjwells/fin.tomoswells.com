'use client'
import { Flex, Select } from '@radix-ui/themes'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PageParams } from '../page'

export default function SelectTicker({ pageParams, assets }: { pageParams: PageParams; assets: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <Flex direction='column' gap='2'>
      <label htmlFor='ticker'>Ticker</label>
      <Select.Root
        defaultValue={pageParams.ticker}
        onValueChange={(ticker) => {
          const params = new URLSearchParams(searchParams)
          params.set('ticker', ticker)
          router.push(`?${params}`, { scroll: false })
        }}
      >
        <Select.Trigger className='w-36' />
        <Select.Content>
          <Select.Group>
            {assets.map((asset) => (
              <Select.Item key={asset} value={asset}>
                {asset}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select.Root>
    </Flex>
  )
}
