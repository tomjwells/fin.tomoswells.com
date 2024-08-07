'use client'

import * as React from 'react'
import { tickers } from '~/data'
import { ShuffleIcon, Cross2Icon as X } from '@radix-ui/react-icons'
import { Command, CommandGroup, CommandItem } from '~/shadcn/Command'
import { Command as CommandPrimitive } from 'cmdk'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageParams } from '../page'
import { Spinner, Badge, Flex, Button } from '@radix-ui/themes'
import { Trash2 } from 'lucide-react'

const DEBOUNCE_TIME = 150

export function getRandomElements(arr: string[], count: number): string[] {
  let result: Set<string> = new Set()
  while (result.size < count && result.size < arr.length) {
    let randomIndex = Math.floor(Math.random() * arr.length)
    result.add(arr[randomIndex] || '')
  }
  return Array.from(result)
}

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

  React.useEffect(() => {
    !open && update()
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
    <Flex direction='column' gap='2'>
      <Flex gap='2' justify='end'>
        <Button size='1' style={{ width: 120 }} onClick={() => setSelected(getRandomElements(assets, 30))}>
          <ShuffleIcon /> Randomize
        </Button>
        <Button size='1' style={{ width: 120 }} className="!text-red-400 dark:hover:!bg-red-500/20 !bg-neutral-200/10  !border-neutral-700" onClick={() => setSelected([])} variant='surface' color='gray'>
          <Trash2 size={12} /> Clear
        </Button>
      </Flex>
      <Command onKeyDown={handleKeyDown} className='overflow-visible bg-transparent'>
        <div className='group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'>
          <div className='flex gap-1 flex-wrap'>
            {selected.map((asset) => (
              <Badge key={asset} variant='soft'>
                {asset}
                <button
                  className='ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                  onClick={() => setSelected((prev) => prev.filter((s) => s !== asset))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSelected((prev) => prev.filter((s) => s !== asset))
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                >
                  <X className='h-3 w-3 text-muted-foreground hover:text-foreground' />
                </button>
              </Badge>
            ))}
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
                        {tickers[asset]?.longName} ({asset})
                      </CommandItem>
                    )
                  })}
              </CommandGroup>
            </div>
          ) : null}
        </div>
      </Command>
    </Flex>
  )
}
