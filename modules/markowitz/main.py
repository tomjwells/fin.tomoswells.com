import os
import time
from typing import List, Any
from datetime import datetime
import numpy as np
import pandas as pd
import yfinance as yf
import numpy.typing as npt
from concurrent.futures import ThreadPoolExecutor

import redis
import functools
import pickle

r = redis.Redis.from_url(url=os.getenv("KV_URL").replace("redis://", "rediss://"))


def cache(func):
  """
    Decorator to cache the result of a function using Redis
  """
  @functools.wraps(func)
  def wrapper(*args, **kwargs):
    key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
    if (val := r.get(key)) is not None:
      print("Cache hit!")
      return pickle.loads(val)
    else:
      print("Cache miss!")
      val = func(*args, **kwargs)
      r.set(key, pickle.dumps(val))
      return val
  return wrapper



@cache
def get_returns(ticker: str) -> pd.Series:
  for _ in range(int(1e5)): 
    with ThreadPoolExecutor() as executor:
      future = executor.submit(download_data, ticker)
      try:
        stock_data = future.result(timeout=2)  # Timeout after 2 seconds
        if stock_data is not None:
          break
      except TimeoutError:
        print("yfinance request timed out. Retrying...")
      except Exception as e:
        print(f"An error occurred: {e}. Retrying...")
      time.sleep(1)
  return stock_data


def download_data(ticker: str):
  """
    Downloads the adjusted close prices for a given ticker and calculates the daily returns
  """
  stock_data = yf.download(ticker.replace('.','-'), progress=False)['Adj Close']
  daily_returns = stock_data.pct_change().dropna()
  return daily_returns

def estimate_ret_and_cov(tickers: List[str], start_date: str, end_date: str) -> tuple[pd.DataFrame, pd.DataFrame]:
  """
    Calculates the mean return and covariance of multiple assets
  """

  # Download data in parallel
  with ThreadPoolExecutor() as executor:
    results = executor.map(lambda ticker: get_returns(ticker), tickers)
  results = list(results)

  # Create a DataFrame from the results
  stock_returns = pd.concat(results, axis=1, keys=tickers)
  filtered_stock_returns = stock_returns.loc[start_date:end_date]

  # Calculate the covariance matrix
  cov_matrix = filtered_stock_returns.cov()

  return filtered_stock_returns, cov_matrix

def efficient_frontier(mu: npt.NDArray[np.floating[Any]],Sigma: np.ndarray[Any, Any], R_p_linspace: npt.NDArray[np.floating[Any]]) -> List[float]:
  inv_Sigma = np.linalg.inv(Sigma)
  ones = np.ones(len(mu))
  a = mu.T @ inv_Sigma @ mu
  c = mu.T @ inv_Sigma @ ones
  f = ones.T @ inv_Sigma @ ones
  d = a * f - c * c
  var_p = ((1.0/d) * (f * (R_p_linspace ** 2) - 2 *  c * R_p_linspace + a)).tolist()

  # Also calculate the weights
  weights = []
  for R_p in R_p_linspace:
    lambda_1 = (1.0/d) * (f * R_p - c)
    lambda_2 = (-1.0/d) * (c * R_p - a)
    weights.append((lambda_1 * inv_Sigma @ mu + lambda_2 * inv_Sigma @ ones).tolist())

  return var_p, weights

def main(tickers: List[str], startYear: int, endYear: int):
  start_date = f'{startYear}-01-01'
  end_date = datetime.now().strftime('%Y-%m-%d') if endYear == datetime.now().year else f'{endYear}-01-01'
  stock_returns, cov_matrix = estimate_ret_and_cov(tickers, start_date, end_date)

  # Estimate the expected returns
  print(stock_returns.head())
  print(252 * stock_returns.mean().values)
  mu: npt.NDArray[np.floating[Any]] = 252 * stock_returns.mean().values
  Sigma = 252 * cov_matrix.values

  # Calculate the efficient frontier
  max = 5.0
  min = -5.0
  R_p_linspace = np.linspace(min, max, num=1000)
  var_p, weights = efficient_frontier(mu, Sigma, R_p_linspace)
  sigma_p = np.sqrt(var_p)

  # Check risk is a float
  for i in range(len(tickers)): 
    assert isinstance(np.sqrt(Sigma[i][i]), float), "Risk should be a float"

  return {
    "tickers": tickers,
    "mu": mu.tolist(),
    "Sigma": np.around(Sigma,6).tolist(),
    "Sigma_inverse": np.around(np.linalg.inv(Sigma),6).tolist(),
    "data": [{ "return": round(R_p_linspace[i],4), "risk": round(sigma_p[i],4), "weights": np.around(weights[i],4).tolist() } for i in range(len(R_p_linspace))],
    "asset_datapoints": [{"ticker": ticker, "return": round(mu[i], 4), "risk":round( np.sqrt(Sigma[i][i]), 4)} for i, ticker in enumerate(tickers)],
    "returns": [[round(val, 6) for val in stock_returns[ticker].fillna(0).tolist()] for i, ticker in enumerate(tickers)]
  }
