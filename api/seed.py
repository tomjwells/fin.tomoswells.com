# Keep seeding logic outside the main API

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

