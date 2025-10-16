# store.py
import asyncio
import io
import os
import sys
import time
from dataclasses import dataclass
from typing import Optional

import pandas as pd
from cache_pandas import cache_to_csv


# Hardcoded for now
PRICE_URL = "https://minio-api.tjwpier.uk/data/price_history.csv"
RETURNS_URL = "https://minio-api.tjwpier.uk/data/returns_history.csv"
RFR_URL   = "https://minio-api.tjwpier.uk/data/risk_free_rate.csv"
REFRESH_SECS = 24*3600

@dataclass
class Store:
    prices: Optional[pd.DataFrame] = None   
    returns: Optional[pd.DataFrame] = None  
    r_f: Optional[float] = None             # latest risk-free rate
    last_loaded: float = 0.0
    _lock: asyncio.Lock = asyncio.Lock()

    @cache_to_csv("rfr.csv", refresh_time=REFRESH_SECS)
    def fetch_rfr(self) -> pd.DataFrame:
        print("[STORE] Fetching risk_free_rate")
        rfr = pd.read_csv(RFR_URL)
        print("[STORE] Risk free rate fetched")
        return rfr

    @cache_to_csv("price_history_.csv", refresh_time=REFRESH_SECS)
    def fetch_price_history(self) -> pd.DataFrame:
        print("[STORE] Fetching price_history")
        df = pd.read_csv(PRICE_URL, parse_dates=["date"])
        print("[STORE] price_history fetched")
        return df


    async def load_once(self) -> None:
        rfr, prices = await asyncio.gather(
            asyncio.to_thread(self.fetch_rfr),
            asyncio.to_thread(self.fetch_price_history),
        )

        r_f_val = float(rfr.iloc[-1]["Adj Close"])

        # Derive returns df from the price_history
        returns = prices.copy()
        returns["date"] = pd.to_datetime(returns["date"], errors="coerce")
        returns = returns.dropna(subset=["date"]).sort_values("date").drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)
        returns = returns.set_index("date").pct_change(fill_method=None).iloc[1:].reset_index()

        async with self._lock:
            self.prices = prices
            self.returns = returns
            self.r_f = r_f_val
            self.last_loaded = time.time()

    async def init(self) -> None:
        print("[STORE] Fetching data")
        await self.load_once()
        print("[STORE] Data retrieved successfully")

    async def refresh_periodically(self, period: int = REFRESH_SECS) -> None:
        while True:
            await asyncio.sleep(period)
            try:
                await self.load_once()
            except Exception:
                # keep serving previous data if refresh fails
                pass

store = Store()
