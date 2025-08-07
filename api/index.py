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
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
from sqlalchemy import text
import logging
import anyio

from modules import markowitz
from modules import derivatives


load_dotenv() 
logger = logging.getLogger("app")




ASYNC_DB_URL = os.getenv("DB_CONNECTION_STRING", "").replace("postgresql+psycopg2","postgresql+asyncpg")
if not ASYNC_DB_URL:
    raise RuntimeError("DB_CONNECTION_STRING is not set")


async def get_engine() -> AsyncGenerator[AsyncEngine, None]:
    """
    Dependency that creates and disposes of an engine for each request.
    This is the workaround for Vercel's lack of lifespan support.
    """
    engine = create_async_engine(ASYNC_DB_URL)
    try:
        yield engine
    finally:
        # Gracefully close all connections in the engine's pool
        await engine.dispose()


# Attach the lifespan manager to your FastAPI app
app = FastAPI()

# Useful middleware for debugging 
@app.middleware("http")
async def preview_errors(request, call_next):
  if app.debug:
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
  engine: AsyncEngine = Depends(get_engine),
  assets: List[str] = Query(...),
  start_year: int = Query(..., alias="startYear"),
  end_year: int = Query(..., alias="endYear"),
  r: float = Query(...),
  allowShortSelling: bool = Query(...),
):
  # Ensure all column names are safe
  safe_columns = [col for col in assets if col.isidentifier()]
  cols_sql = ", ".join(f'("{c}")::real AS "{c}"' for c in safe_columns)
  query = text(f"""
    SELECT date, {cols_sql}
    FROM returns_history
    WHERE date BETWEEN make_date(CAST(:start_year AS integer),1,1)
      AND CASE
            WHEN CAST(:end_year AS integer) >= EXTRACT(YEAR FROM CURRENT_DATE)
            THEN CURRENT_DATE
            ELSE make_date(CAST(:end_year AS integer),12,31)
          END
    ORDER BY date
  """)

  t0 = time.perf_counter()
  async with engine.connect() as conn:
    rows = await conn.execute(query, {"start_year": start_year, "end_year": end_year})
  t1 = time.perf_counter()
  result = rows.all()
  print(f"DB Query Time: {(t1-t0):.4f}s, rows: {len(result)}")

  # Verify all columns contain numbers, if not we discard the column
  # This can happen if a ticker began trading after the date range
  rets = pd.DataFrame(result).set_index("date")
  rets_df = rets.apply(pd.to_numeric, errors='coerce').dropna(axis=1) 

  result = markowitz.main(
    list(rets_df.columns),
    rets_df.to_numpy(),
    allowShortSelling,
    R_f=r,
  )
  return result


# ---------  Derivatives   ---------


# Route for option-price
@app.get("/api/derivatives/option-price")
async def get_option_price(
  engine: AsyncEngine = Depends(get_engine),
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


  query = text(f"""
    SELECT "{ticker}"::real AS p
    FROM price_history
    WHERE "{ticker}" IS NOT NULL
    ORDER BY date
  """)

  t0 = time.perf_counter()
  
  async with engine.connect() as conn:
      result = (await conn.execute(query)).all()
  t1 = time.perf_counter()
  print({"total_ms": round((t1 - t0)*1000, 1)})
  prices = np.array([r[0] for r in result], dtype=np.float32)
  print(prices)


  # Calculate initial price and volatility (sigma)
  S_0 = float(prices[-1])
  returns = prices[1:] / prices[:-1] - 1.0
  sigma = float(np.std(returns, ddof=1) * np.sqrt(365.0))
  print({"apg_ms": round((t1 - t0) * 1000, 1)})


  print("S_0: ", S_0, "sigma: ", sigma, "R_f: ", R_f, "K: ", K, "tau: ", tau,
        "method: ", method, "option_type: ", option_type, "instrument: ", instrument)

  # Model Constants
  binomial_num_steps = int(1e3)
  binomial_num_trials = int(1e5)
  monte_carlo_num_timesteps = 100
  longstaff_schwartz_num_trials = int(1e5)
  longstaff_schwartz_num_timesteps = 100

  # Timing the option price calculation
  calc_start_time = time.time()
  match (method, option_type):
      case "binomial", "european":
          result = derivatives.binomial.EUPrice(instrument, S_0, sigma, R_f, K, tau, binomial_num_steps)

      case "binomial", "american":
          result = derivatives.binomial.USPrice(instrument, S_0, sigma, R_f, K, tau, binomial_num_steps)

      case "black-scholes", "european":
          bs = derivatives.black_scholes.black_scholes_option(S_0, K, tau, R_f, sigma)
          result = bs.value(instrument)

      case "black-scholes", "american":
          result = {"error": "American options are not supported"}

      case "monte-carlo", "european":
          result = derivatives.monte_carlo(
              instrument,
              S_0, K, tau, R_f, sigma,
              num_trials=binomial_num_trials,
              num_timesteps=monte_carlo_num_timesteps,
              seed=random.randint(0, int(1e6)),
          )

      case "monte-carlo", "american":
          result = {"error": "American options are not supported"}

      case "longstaff-schwartz", "american":
          result = derivatives.longstaff_schwartz.longstaff_schwartz(
              instrument,
              S_0, K, tau, R_f, sigma,
              num_trials=longstaff_schwartz_num_trials,
              num_timesteps=longstaff_schwartz_num_timesteps,
              seed=random.randint(0, int(1e6)),
          )

      case "longstaff-schwartz", "european":
          result = {"error": "European options are not supported"}

      case _:
          raise ValueError(f"Unsupported method/option_type combination: {method!r}/{option_type!r}")

  calc_duration = time.time() - calc_start_time
  print("Calculation Time: {:.4f}s".format(calc_duration))  # Logging the calculation time

  return result

# ---------  Utility Functions   ---------
@app.get("/api/risk_free_rate")
async def risk_free_rate(engine: AsyncEngine = Depends(get_engine)):
    query = text('SELECT "Adj Close" FROM risk_free_rate ORDER BY date DESC LIMIT 1')
    
    async with engine.connect() as conn:
       result = await conn.execute(query)
    r_f = result.scalar_one_or_none()
    if r_f is None:
        raise HTTPException(404, "Risk-free rate not found.")
    return {"rate": float(r_f)}



@app.get("/api/assets")
async def assets(engine: AsyncEngine = Depends(get_engine)):
    query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'price_history' AND column_name <> 'date'
        ORDER BY ordinal_position
    """)
    
    async with engine.connect() as conn:
       result = await conn.execute(query)
    assets = [row[0] for row in result]
    return assets



@app.get("/api/underlying_price/{ticker}")
async def underlying_price(
  engine: AsyncEngine = Depends(get_engine),
  ticker: str = Path(..., regex=r"^[A-Za-z_][A-Za-z0-9_]*$"),
):
    if not ticker.isidentifier():
        raise HTTPException(400, f"Unknown ticker: {ticker}")
    query = text(f'SELECT "{ticker}" FROM price_history ORDER BY date DESC LIMIT 1')
    
    async with engine.connect() as conn:
        result = await conn.execute(query)
    price = result.scalar_one_or_none()
    if price is None:
        raise HTTPException(status_code=404, detail=f"Price data not found for ticker: {ticker}")
    return {"price": price}
