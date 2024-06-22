'use client'

import * as React from 'react'
import { Cross2Icon as X } from '@radix-ui/react-icons'
import { Command, CommandGroup, CommandItem } from '~/shadcn/Command'
import { Command as CommandPrimitive } from 'cmdk'
// import { Badge } from "~/shadcn/Badge"
import { useRouter, useSearchParams } from 'next/navigation'
import { PageParams } from '../page'
import { Spinner, Badge } from '@radix-ui/themes'

const DEBOUNCE_TIME = 150

export function FancyMultiSelect({ assets, pageParams: pageParams }: { assets: string[]; pageParams: PageParams }) {
  const selectedAssets = pageParams.assets
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<PageParams['assets']>(selectedAssets)
  const [inputValue, setInputValue] = React.useState('')
  const [isPending, startTransition] = React.useTransition()
  const [timer, setTimer] = React.useState<NodeJS.Timeout | null>(null)

  const update = () => {
    if (timer) clearTimeout(timer)

    setTimer(
      setTimeout(() => {
        startTransition(() => {
          const params = new URLSearchParams(searchParams)
          params.delete('assets')
          selected.forEach((asset) => {
            params.append('assets', asset)
          })
          router.push(`?${params}`, { scroll: false })
        })
      }, DEBOUNCE_TIME)
    )
  }

  const handleUnselect = (asset: string) => {
    setSelected((prev) => prev.filter((s) => s !== asset))
  }
  React.useEffect(() => {
    if (!open) update()
  }, [open, selected])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (input.value === '') {
          setSelected((prev) => {
            const newSelected = [...prev]
            newSelected.pop()
            return newSelected
          })
          if (!open) {
            update()
          }
        }
      }
      // This is not a default behaviour of the <input /> field
      if (e.key === 'Escape') {
        input.blur()
      }
    }
  }

  return (
    <Command onKeyDown={handleKeyDown} className='overflow-visible bg-transparent'>
      <div className='group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'>
        <div className='flex gap-1 flex-wrap'>
          {selected
            .map((asset) => {
              return (
                <Badge key={asset} variant='soft'>
                  {asset}
                  <button
                    className='ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnselect(asset)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={() => handleUnselect(asset)}
                  >
                    <X className='h-3 w-3 text-muted-foreground hover:text-foreground' />
                  </button>
                </Badge>
              )
            })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={(e) => {
              setInputValue(e)
              update()
            }}
            onBlur={() => {
              setOpen(false)
              update()
            }}
            onFocus={() => setOpen(true)}
            placeholder='Select assets...'
            className='ml-2 bg-transparent border-none outline-none placeholder:text-muted-foreground flex-1'
            style={{ background: 'transparent' }}
          />
          {isPending && <Spinner />}
        </div>
      </div>
      <div className='relative mt-2'>
        {open && assets.filter((asset) => !selected.includes(asset)).length > 0 ? (
          <div className='absolute w-full z-50 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in'>
            <CommandGroup className='h-full max-h-96 overflow-auto'>
              {assets
                .filter((asset) => !selected.includes(asset))
                .map((asset) => {
                  return (
                    <CommandItem
                      key={asset}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onSelect={(value) => {
                        setInputValue('')
                        setSelected((prev) => [...prev, asset])
                      }}
                      className={'cursor-pointer'}
                    >
                      {asset}
                    </CommandItem>
                  )
                })}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  )
}
