import os
import time
import random
import numpy as np
import pandas as pd
from fastapi import FastAPI, Query, Path, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import List, Literal, AsyncGenerator
from dotenv import load_dotenv
import logging
import anyio

from modules import markowitz
from modules import derivatives

from api.store import store 



load_dotenv() 
logger = logging.getLogger("app")

try:
    import asyncio, uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
except Exception:
    # Keep default asyncio loop on unsupported platforms, or if uvloop isn't installed
    pass




# Attach the lifespan manager to your FastAPI app
app = FastAPI()

# Init the store
@app.on_event("startup")
async def _startup():
    await store.init()
    import asyncio
    asyncio.create_task(store.refresh_periodically())

# Useful middleware for debugging 
@app.middleware("http")
async def preview_errors(request, call_next):
  if not app.debug:
    try:
      return await call_next(request)
    except anyio.EndOfStream:
      return JSONResponse({"error": "client closed"}, status_code=499)
    except Exception as e:
      logger.exception("Unhandled error for %s %s", request.method, request.url.path)
      return JSONResponse({"error": str(e)}, status_code=500)
  else:
     return await call_next(request)

# Markowitz
@app.get("/api/markowitz/main")
async def markowitz_main(
  assets: List[str] = Query(...),
  start_year: int = Query(..., alias="startYear"),
  end_year: int = Query(..., alias="endYear"),
  r: float = Query(...),
  allowShortSelling: bool = Query(...),
):
  if store.returns is None:
      raise HTTPException(503, "Data not loaded")

  lo = pd.Timestamp(start_year, 1, 1)
  hi = min(pd.Timestamp(end_year, 12, 31), pd.Timestamp.now())

  full_returns = store.returns
  rets = full_returns.loc[(full_returns["date"] >= lo) & (full_returns["date"] <= hi)]

  avail = [c for c in assets if c in rets.columns]
  if not avail:
      raise HTTPException(400, "No valid requested assets found")

  mat = rets[["date"]+avail]
  mat = pd.DataFrame(mat).set_index("date")
  mat = mat.apply(pd.to_numeric, errors='coerce').dropna(axis=1) 

  t0 = time.perf_counter()
  result = markowitz.main(list(mat.columns), mat.to_numpy(), allowShortSelling, R_f=r)
  t1 = time.perf_counter()
  print(f"Markowtiz Computation Time: {(t1-t0):.4f}s, Num Assets: {len(assets)}, Allow Short Selling: {allowShortSelling}")
  return result




# ---------  Derivatives   ---------


# Route for option-price
@app.get("/api/derivatives/option-price")
async def get_option_price(
  option_type: Literal['european', 'american'] = Query(..., alias="optionType"),
  method: Literal['binomial', 'black-scholes', 'monte-carlo', 'longstaff-schwartz'] = Query(...),
  instrument: Literal['call', 'put'] = Query(...),
  T: datetime = Query(..., description="Exercise date in YYYY-MM-DD"),
  K: float = Query(...),
  ticker: str = Query(..., regex=r"^[A-Za-z_][A-Za-z0-9_]*$", description="Ticker symbol"),
  R_f: float = Query(...),
):
  t: datetime = datetime.now()
  if t > T:
      return HTTPException(status_code=400, detail=f"t: {t} should be less than T: {T}")
  tau = (T - t).days / 365

  # --- prices for S0 ---
  s = store.prices[["date", ticker]].dropna().sort_values("date")
  prices = s[ticker].to_numpy(dtype=np.float64)
  if prices.size < 2:
      raise HTTPException(400, f"Not enough price history for {ticker}")
  S_0 = float(prices[-1])

  # --- returns for sigma (use precomputed if present, else derive) ---
  if store.returns is not None and ticker in store.returns.columns:
      rs = store.returns[["date", ticker]].dropna().sort_values("date")[ticker].to_numpy(dtype=np.float64)
  else:
      rs = prices[1:] / prices[:-1] - 1.0  # simple daily returns
  if rs.size < 2:
      raise HTTPException(400, f"Not enough return history for {ticker}")

  # annualized historical vol (match your previous behavior: sqrt(365))
  sigma = float(np.std(rs, ddof=1) * np.sqrt(365.0))

  print("S_0: ", S_0, "sigma: ", sigma, "R_f: ", R_f, "K: ", K, "tau: ", tau, "method: ", method, "option_type: ", option_type, "instrument: ", instrument)

  # Model Constants
  binomial_num_steps = int(1e3)
  binomial_num_trials = int(1e5)
  monte_carlo_num_timesteps = 100
  longstaff_schwartz_num_trials = int(1e5)
  longstaff_schwartz_num_timesteps = 100
  seed = random.randint(0, int(1e6))

  # Dispatch table technique to call the right function
  dispatch = {
    "binomial": {
        "european": lambda: derivatives.binomial.EUPrice(instrument, S_0, sigma, R_f, K, tau, binomial_num_steps),
        "american": lambda: derivatives.binomial.USPrice(instrument, S_0, sigma, R_f, K, tau, binomial_num_steps),
    },
    "black-scholes": {
        "european": lambda: derivatives.black_scholes.black_scholes_option(S_0, K, tau, R_f, sigma).value(instrument),
        "american": lambda: {"error": "American options are not supported"},
    },
    "monte-carlo": {
        "european": lambda: derivatives.monte_carlo(instrument, S_0, K, tau, R_f, sigma, num_trials=binomial_num_trials, num_timesteps=monte_carlo_num_timesteps, seed=seed),
        "american": lambda: {"error": "American options are not supported"},
    },
    "longstaff-schwartz": {
        "european": lambda: {"error": "European options are not supported"},
        "american": lambda: derivatives.longstaff_schwartz(instrument, S_0, K, tau, R_f, sigma, num_trials=longstaff_schwartz_num_trials, num_timesteps=longstaff_schwartz_num_timesteps, seed=seed),
    },
  }

  # Timing the option price calculation
  calc_start_time = time.time()

  try:
      result = dispatch[method][option_type]()
  except KeyError:
      raise ValueError(f"Unsupported method/option_type combination: {method!r}/{option_type!r}")

  calc_duration = time.time() - calc_start_time
  print("Calculation Time: {:.4f}s".format(calc_duration))  # Logging the calculation time

  return result

# ---------  Utility Functions   ---------
@app.get("/api/risk_free_rate")
async def risk_free_rate():
    if store.r_f is None:
        raise HTTPException(404, "Risk-free rate not found")
    return {"rate": float(store.r_f)}

@app.get("/api/assets")
async def assets():
    if store.prices is None:
        return []
    return sorted([c for c in store.prices.columns if c != "date"])

@app.get("/api/underlying_price/{ticker}")
async def underlying_price(ticker: str = Path(..., regex=r"^[A-Z][A-Z0-9_]*$")):
    if store.prices is None or ticker not in store.prices.columns:
        raise HTTPException(404, f"Price data not found for ticker: {ticker}")
    s = store.prices[ticker].dropna()
    if s.empty:
        raise HTTPException(404, f"Price data not found for ticker: {ticker}")
    return {"price": float(s.iloc[-1])}


