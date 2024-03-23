"use client"
import { Flex, Select, TextField } from "@radix-ui/themes"
import { useRouter, useSearchParams } from "next/navigation"
import type { Asset } from "app/markowitz/fancy-multi-select";

export default function SelectTicker({ ticker, assets }: {
    ticker: string;
    assets: Asset[]
}) {
    const router = useRouter()
    const searchParams = useSearchParams()

    return (
        <Flex direction="column" gap="2">
            <label htmlFor="ticker">Ticker</label>
            <Select.Root defaultValue={ticker}
                onValueChange={(value) => {
                    console.log(value)
                    router.push(
                        `?${new URLSearchParams({
                            ...Object.fromEntries(searchParams ?? []),
                            ticker: value,
                        }).toString()}`,
                    )
                }}
            >
                <Select.Trigger />
                <Select.Content>
                    <Select.Group>
                        {
                            assets.map((asset) => (
                                <Select.Item key={asset.value} value={asset.value}>{asset.label}</Select.Item>
                            ))
                        }
                    </Select.Group>
                </Select.Content>
            </Select.Root>
        </Flex>
    )
}