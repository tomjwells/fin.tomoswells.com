'use client'
import { Switch } from '@radix-ui/themes'
import { PageParams } from '../page'
import { useRouter } from 'next/navigation'

export default function AllowShortSelling(pageParams: PageParams) {
  const router = useRouter()
  return (
    <Switch
      mt={'4'}
      variant='surface'
      defaultChecked={pageParams.allowShortSelling}
      onCheckedChange={(checked) => {
        const queryParams = new URLSearchParams()
        pageParams.assets.forEach((asset) => queryParams.append('assets', asset))
        queryParams.append('startYear', `${pageParams.startYear}`)
        queryParams.append('endYear', `${pageParams.endYear}`)
        queryParams.append('r', `${pageParams.r}`)
        queryParams.append('allowShortSelling', `${checked}`)
        router.push(`?${queryParams}`, { scroll: false })
      }}
    />
  )
}
