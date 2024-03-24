"use client";

import * as React from "react";
import { Cross2Icon as X } from "@radix-ui/react-icons"


import {
  Command,
  CommandGroup,
  CommandItem,
} from "~/shadcn/Command";

import { Command as CommandPrimitive } from "cmdk";
import { Badge } from "~/shadcn/Badge";
import { useRouter } from "next/navigation";

export type Asset = Record<"value" | "label", string>;



export function FancyMultiSelect({ assets, selected: selectedAssets }: {
  assets: Asset[]
  selected: Asset[]
}) {
  // A nicer UX could be to keep the selected stocks in the state and have a "save" button
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Asset[]>(selectedAssets);
  // React.useEffect(() => {
  //   setSelected(selectedAssets)
  // }, [selectedAssets])
  const [inputValue, setInputValue] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    if (!open) router.push("/markowitz?assets=" + JSON.stringify(selected.map(s => s.value)))
  }, [open])

  const handleUnselect = (asset: Asset) => {
    setSelected(prev => prev.filter(s => s.value !== asset.value));
    // console.log(JSON.stringify(selected.filter(s => s.value !== asset.value).map(s => s.value)))
    router.push("/markowitz?assets=" + JSON.stringify(selected.filter(s => s.value !== asset.value).map(s => s.value)))
    // console.log(JSON.stringify(selected.map(s => s.value)))
    // router.push("/markowitz?assets=" + JSON.stringify(selected.map(s => s.value)))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "") {
          setSelected(prev => {
            const newSelected = [...prev];
            newSelected.pop();
            return newSelected;
          })
          router.push("/markowitz?assets=" + JSON.stringify(selected.slice(0, -1).map(s => s.value)))
        }
      }
      // This is not a default behaviour of the <input /> field
      if (e.key === "Escape") {
        input.blur();
      }
    }
  }

  const selectables = assets.filter(asset => !selected
    .map(s => s.value)
    .includes(asset.value));

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
      >
        <div className="flex gap-1 flex-wrap">
          {selected.map((asset) => {
            return (
              <Badge key={asset.value} variant="secondary">
                {asset.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnselect(asset);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(asset)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            )
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder="Select assets..."
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ?
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {selectables.map((asset) => {
                return (
                  <CommandItem
                    key={asset.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={(value) => {
                      setInputValue("")
                      setSelected(prev => [...prev, asset])
                      // router.push("/markowitz?assets=" + JSON.stringify([...selected, asset].map(s => s.value)))
                    }}
                    className={"cursor-pointer"}
                  >
                    {asset.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
          : null}
      </div>
    </Command >
  )
}