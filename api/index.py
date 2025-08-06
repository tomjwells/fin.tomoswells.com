import os
import time
import random
import numpy as np
import pandas as pd
import asyncpg
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, Path, HTTPException, Depends, Request
from datetime import date, datetime
from modules.derivatives.monte_carlo import monte_carlo
from modules.derivatives.black_scholes import black_scholes_option
from modules.derivatives.longstaff_schwartz import longstaff_schwartz
from modules.derivatives.binomial_model import EUPrice, USPrice
from modules.markowitz.main import main
from typing import List, Literal
from concurrent.futures import ThreadPoolExecutor
from dotenv import load_dotenv

load_dotenv() 
# import redis
# import functools
# import pickle

# r = redis.Redis.from_url(url=os.getenv("REDIS_URL").replace("redis://", "rediss://"))

# Decorator to cache the result of a function using Redis


# def cache(func):
#   @functools.wraps(func)
#   def wrapper(*args, **kwargs):
#     key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
#     if (val := r.get(key)) is not None:
#       print("Cache hit!")
#       return pickle.loads(val)
#     else:
#       print("Cache miss!")
#       val = func(*args, **kwargs)
#       r.set(key, pickle.dumps(val))
#       return val
#   return wrapper



ASYNC_DB_URL = os.getenv("DB_CONNECTION_STRING", "").replace("postgresql+psycopg2","postgresql").replace("postgres://","postgresql://",1)
if not ASYNC_DB_URL:
    raise RuntimeError("DB_CONNECTION_STRING is not set")

apg_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()

VALID_PRICE_COLUMNS: set[str] = set()
_cols_loaded_at = 0.0
_COLS_TTL = 600.0  # refresh every 10 minutes (tune)

async def _ensure_pool() -> asyncpg.Pool:
    global apg_pool
    if apg_pool and not apg_pool._closed:
        return apg_pool
    async with _pool_lock:
        if apg_pool and not apg_pool._closed:
            return apg_pool
        apg_pool = await asyncpg.create_pool(
            dsn=ASYNC_DB_URL,
            min_size=1, max_size=6,
            timeout=5, command_timeout=15,
            max_inactive_connection_lifetime=60,
            # If PgBouncer is in TRANSACTION mode, uncomment:
            # statement_cache_size=0,
        )
        return apg_pool

async def _ensure_columns():
    global VALID_PRICE_COLUMNS, _cols_loaded_at
    now = time.time()
    if VALID_PRICE_COLUMNS and (now - _cols_loaded_at) < _COLS_TTL:
        return
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='price_history' AND column_name <> 'date'
            ORDER BY ordinal_position
        """)
    VALID_PRICE_COLUMNS = {r["column_name"] for r in rows}
    _cols_loaded_at = now

# FastAPI deps
async def get_conn():
    pool = await _ensure_pool()
    async with pool.acquire() as conn:
        yield conn




app = FastAPI()

from urllib.parse import urlparse
import socket

@app.get("/__status")
async def status():
    dsn_ok = bool(ASYNC_DB_URL)
    host = urlparse(ASYNC_DB_URL).hostname if dsn_ok else None
    try:
        resolved = bool(socket.getaddrinfo(host, None)) if host else False
    except Exception:
        resolved = False
    pool_ready = bool(apg_pool and not apg_pool._closed)
    return {
        "env_has_dsn": dsn_ok,
        "dsn_host": host,
        "dns_resolved": resolved,
        "pool_ready": pool_ready,
    }
from fastapi.responses import JSONResponse

@app.middleware("http")
async def show_errors_in_preview(request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        import os, traceback
        if os.getenv("VERCEL_ENV") != "production":
            tb = traceback.format_exc()
            print("UNHANDLED:", tb)
            return JSONResponse({"error": str(e)}, status_code=500)
        raise


# Markowitz
@app.get("/api/markowitz/main")
async def markowitz_main(
  assets: List[str] = Query(...),
  start_year: int = Query(..., alias="startYear"),
  end_year: int = Query(..., alias="endYear"),
  r: float = Query(...),
  allowShortSelling: bool = Query(...),
):

  # Ensure all column names are safe
  safe_columns = [col for col in assets if col.isidentifier()]
  
  cols_sql = ", ".join(f'("{c}")::real AS "{c}"' for c in safe_columns)
  sql = f"""
    SELECT date, {cols_sql}
    FROM returns_history
    WHERE date BETWEEN make_date($1::int,1,1)
      AND CASE
            WHEN $2::int >= EXTRACT(YEAR FROM CURRENT_DATE)
            THEN CURRENT_DATE
            ELSE make_date($2::int,12,31)
          END
    ORDER BY date
  """

  import io
  buf = io.BytesIO()
  t0 = time.perf_counter()
  async with apg_pool.acquire() as apg:
    await apg.copy_from_query(sql, start_year, end_year, output=buf, format="csv", header=True)
  t1 = time.perf_counter()
  buf.seek(0)
  rets = pd.read_csv(buf, parse_dates=["date"]).set_index("date")
  print(f"DB Query Time: {(t1-t0):.4f}s, rows: {len(rets)}")

  # Verify all columns contain numbers, if not we discard the column
  # This can happen if a ticker began trading after the date range
  rets_df = rets.apply(pd.to_numeric, errors='coerce').dropna(axis=1) 

  result = main(
    list(rets_df.columns),
    rets_df.to_numpy(),
    allowShortSelling,
    R_f=r,
  )
  return result

@app.get("/api/seed_db")
async def seed_db():
    """
    Seeds the Turso DB from local price_history.csv and returns_history.csv.
    Assumes both files are small enough to load fully into memory.
    """
    if not app.debug:
        raise HTTPException(status_code=400, detail="Cannot seed database in production")



    print("Load and clean price_history")
    try:
        price_history = pd.read_csv("../price_history.csv", parse_dates=["Date"])
        price_history.columns = [
            c.replace(".", "_").replace("-", "_") if c != "Date" else c
            for c in price_history.columns
        ]
        price_history.set_index("Date", inplace=True)

        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: price_history.to_sql("price_history", con=sync_conn, if_exists="replace", index_label="date")
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed loading price_history.csv: {e}")

    try:
        returns_history = pd.read_csv("../returns_history.csv", parse_dates=["Date"])
        returns_history.columns = [
            c.replace(".", "_").replace("-", "_") if c != "Date" else c
            for c in returns_history.columns
        ]
        returns_history.set_index("Date", inplace=True)
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: returns_history.to_sql("returns_history", con=sync_conn, if_exists="replace", index_label="date")
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed loading returns_history.csv: {e}")

    try:
        risk_free_rate = pd.read_csv("../risk_free_rate.csv", parse_dates=["Date"])
        risk_free_rate.columns = [
            c.replace(".", "_").replace("-", "_") if c != "Date" else c
            for c in risk_free_rate.columns
        ]
        risk_free_rate.set_index("Date", inplace=True)
        async with engine.begin() as conn:
            await conn.run_sync(
                lambda sync_conn: risk_free_rate.to_sql(
                    "risk_free_rate",
                    con=sync_conn,
                    if_exists="replace",
                    index_label="date",
                )
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed loading risk_free_rate.csv: {e}")

    return {"message": "Database seeded successfully"}



# @app.get("/api/seed_db")
# def seed_db():
#   if app.debug == True:
#     import yfinance as yf
#     # con = libsql.connect(database=os.getenv('TURSO_DATABASE_URL'), auth_token=os.getenv("TURSO_AUTH_TOKEN"))
#     risk_free_rate = yf.download("^IRX", progress=False,)['Adj Close'].tail(1)/100
#     risk_free_rate.to_sql(name='risk_free_rate', con=con, if_exists='replace')
#     price_history = download_symbols(pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')[0]['Symbol'].to_list())
#     returns_history = price_history.pct_change(fill_method=None).iloc[1:]
#     print(price_history.columns)
#     price_history.to_sql(name='price_history', con=con, if_exists='replace', chunksize=500)
#     # May need to adjust chunksize, or con timeout
#     returns_history.to_sql(name='returns_history', con=con, if_exists='replace', chunksize=500)

#     return jsonify({"message": "Database seeded successfully"})
#   else:
#     return jsonify({"error": "Cannot seed database in production"}), 400


def get_market_cap(symbol):
  import yfinance as yf
  return symbol, yf.Ticker(symbol.replace('.', '-')).info.get('marketCap')


def download_symbols(symbols: List[str]) -> pd.DataFrame:
  # Fetch market caps in parallel
  with ThreadPoolExecutor() as executor:
    market_caps = list(executor.map(get_market_cap, symbols))

  # Sort symbols by market cap, descending order
  print(market_caps)
  sorted_ticker_market_caps = sorted(market_caps, key=lambda x: x[1], reverse=True)
  sorted_symbols = [ticker for ticker, _ in sorted_ticker_market_caps]

  # Download data in parallel for sorted symbols
  with ThreadPoolExecutor() as executor:
    results = executor.map(lambda ticker: get_returns(ticker), sorted_symbols)

  # Create a DataFrame from the results, with symbols as columns
  df = pd.concat(list(results), axis=1)
  df.columns = [sym.replace('.', '_').replace('-', '_') for sym in sorted_symbols]
  return df


# @cache
def get_returns(ticker: str) -> pd.Series:
  # yfinance.download frequently errors, this wrapper makes downloading reliable
  for _ in range(int(1e5)):
    with ThreadPoolExecutor() as executor:
      future = executor.submit(download_data, ticker)
      try:
        price_data = future.result(timeout=2)  # Timeout after 2 seconds
        if price_data is not None:
          return price_data['Adj Close']
      except TimeoutError:
        print("yfinance request timed out. Retrying...")
      except Exception as e:
        print(f"An error occurred: {e}. Retrying...")
      time.sleep(2)


# @cache
def download_data(ticker: str) -> pd.Series:
  """
    Downloads the adjusted close prices for a given ticker and calculates the daily returns
  """
  import yfinance as yf
  return yf.download(ticker.replace('.', '-'), progress=False)


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

    import io, numpy as np

    sql = f"""
      SELECT "{ticker}"::real AS p
      FROM price_history
      WHERE "{ticker}" IS NOT NULL
      ORDER BY date
    """
    buf = io.BytesIO()
    t0 = time.perf_counter()
    async with apg_pool.acquire() as apg:
        await apg.copy_from_query(sql, output=buf, format="csv", header=True)
    t1 = time.perf_counter()
    print({"total_ms": round((t1 - t0)*1000, 1)})

    buf.seek(0)
    # Calculate initial price and volatility (sigma)
    prices = np.loadtxt(buf, delimiter=",", skiprows=1, dtype=np.float32)  # one column
    S_0 = float(prices[-1])
    returns = prices[1:] / prices[:-1] - 1.0
    sigma = float(np.std(returns, ddof=1) * np.sqrt(365.0))
    print({"apg_ms": round((t1 - t0) * 1000, 1)})


    print("S_0: ", S_0, "sigma: ", sigma, "R_f: ", R_f, "K: ", K, "tau: ", tau,
          "method: ", method, "option_type: ", option_type, "instrument: ", instrument)

    binomial_num_steps = int(1e3)
    binomial_num_trials = int(1e5)
    monte_carlo_num_timesteps = 100
    longstaff_schwartz_num_trials = int(1e5)
    longstaff_schwartz_num_timesteps = 100

    # Timing the option price calculation
    calc_start_time = time.time()
    match (method, option_type):
        case "binomial", "european":
            result = EUPrice(instrument, S_0, sigma, R_f, K, tau, binomial_num_steps)

        case "binomial", "american":
            result = USPrice(instrument, S_0, sigma, R_f, K, tau, binomial_num_steps)

        case "black-scholes", "european":
            bs = black_scholes_option(S_0, K, tau, R_f, sigma)
            result = bs.value(instrument)

        case "black-scholes", "american":
            result = {"error": "American options are not supported"}

        case "monte-carlo", "european":
            result = monte_carlo(
                instrument,
                S_0, K, tau, R_f, sigma,
                num_trials=binomial_num_trials,
                num_timesteps=monte_carlo_num_timesteps,
                seed=random.randint(0, int(1e6)),
            )

        case "monte-carlo", "american":
            result = {"error": "American options are not supported"}

        case "longstaff-schwartz", "american":
            result = longstaff_schwartz(
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
async def risk_free_rate(conn = Depends(get_conn)):
    val = await conn.fetchval('SELECT "Adj Close" FROM risk_free_rate ORDER BY date DESC LIMIT 1')
    if val is None:
        raise HTTPException(404, "Risk-free rate not found.")
    return {"rate": float(val)}



@app.get("/api/assets")
async def assets(conn = Depends(get_conn)):
    rows = await conn.fetch("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'price_history' AND column_name <> 'date'
        ORDER BY ordinal_position
    """)
    return [r["column_name"] for r in rows]



@app.get("/api/underlying_price/{ticker}")
async def underlying_price(
    ticker: str = Path(..., regex=r"^[A-Za-z_][A-Za-z0-9_]*$"),
    conn = Depends(get_conn),
):
    if ticker not in VALID_PRICE_COLUMNS:
        raise HTTPException(400, f"Unknown ticker: {ticker}")
    sql = f'SELECT "{ticker}" FROM price_history ORDER BY date DESC LIMIT 1'
    price = await conn.fetchval(sql)
    if price is None:
        raise HTTPException(404, f"Price not found for ticker: {ticker}")
    return {"price": float(price)}
