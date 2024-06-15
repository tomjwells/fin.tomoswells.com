from cvxopt import matrix, solvers, blas
import os
import time
from typing import Tuple, List, Any
from datetime import datetime
import numpy as np
import pandas as pd
import yfinance as yf
import numpy.typing as npt
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from functools import partial


import redis
import functools
import pickle

r = redis.Redis.from_url(url=os.getenv(
    "REDIS_URL").replace("redis://", "rediss://"))

# Decorator to cache the result of a function using Redis
def cache(func):
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


# Cache the returns data to prevent redundant repeated downloads
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


def download_data(ticker: str) -> pd.Series:
  """
    Downloads the adjusted close prices for a given ticker and calculates the daily returns
  """
  stock_data = yf.download(ticker.replace('.', '-'), progress=False)['Adj Close']
  daily_returns = stock_data.pct_change().dropna()
  return daily_returns


def estimate_rets(symbols: List[str], start_date: str, end_date: str) -> tuple[pd.DataFrame, pd.DataFrame]:
  """
    Calculates the mean return and covariance of multiple assets
  """

  # Download data in parallel
  with ThreadPoolExecutor() as executor:
    results = executor.map(lambda ticker: get_returns(ticker), symbols)
  results = list(results)

  # Create a DataFrame from the results
  stock_returns = pd.concat(results, axis=1, keys=symbols)
  return stock_returns.loc[start_date:end_date]


def efficient_frontier(mu: npt.NDArray[np.floating[Any]], Sigma: np.ndarray[Any, Any], R_p_linspace: npt.NDArray[np.floating[Any]]) -> Tuple[List[float], List[float]]:
  inv_Sigma = np.linalg.inv(Sigma)
  ones = np.ones(len(mu))
  a = mu.T @ inv_Sigma @ mu
  c = mu.T @ inv_Sigma @ ones
  f = ones.T @ inv_Sigma @ ones
  d = a * f - c * c
  one_over_d = d ** -1
  var_p = one_over_d * (f * (R_p_linspace ** 2) - 2 * c * R_p_linspace + a)

  # Vectorized calculation of the portfolio weights along the efficient frontier
  lambda_1 = + one_over_d * (f * R_p_linspace - c)
  lambda_2 = - one_over_d * (c * R_p_linspace - a)
  weights = lambda_1[:, None] * (inv_Sigma @ mu) + lambda_2[:, None] * (inv_Sigma @ ones)

  return weights.tolist(), np.sqrt(var_p).tolist()


def port_sharpe(rets, cov, weights):
  return port_return(rets, weights) / port_volatility(cov, weights)


def port_volatility(cov, weights):
  # annualized
  return np.dot(weights, np.dot(cov, weights)) ** 0.5


def port_return(mu, weights):
  return np.dot(mu, weights)  # annualized


def calculate_portfolio(R_p, S, q, G, h, A):
  return solvers.qp(S, q, G, h, A, matrix([R_p, 1.0]))['x']


def efficient_frontier_numerical(mu, Sigma, symbols, R_p_linspace):
  N = len(symbols)  # The number of assets in a portfolio

  # Quadratic term
  S = matrix(Sigma)

  # The linear term (Zero vector)
  q = matrix(np.zeros((N, 1)))

  # Inequality constraint matrices (this is the no short selling constraint effectively)
  G = -matrix(np.eye(N))   # negative n x n identity matrix
  h = matrix(0.0, (N, 1))

  # Equality constraint
  A = matrix(np.vstack([np.array(mu), np.ones(N)]))

  # Parallelize the quadratic optimization step over each of the R_p linspace
  calculate_portfolio_partial = partial(calculate_portfolio, S=S, q=q, G=G, h=h, A=A)
  # Parallelize the quadratic optimization step over each of the R_p linspace
  with ThreadPoolExecutor() as executor:
    portfolios = list(executor.map(calculate_portfolio_partial, R_p_linspace))
  # CALCULATE RISKS AND RETURNS FOR FRONTIER
  weights = np.array(portfolios).squeeze()
  risks = np.sqrt(np.einsum('ij,ij->i', weights, np.dot(weights, S)))

  return weights, risks


def find_tangency_portfolio(mu, Sigma, allow_short_selling=False, R_f=0.0436):
  """
    Function to find the tangency portfolio
    If short selling is allowed, the analytic solution is used
    If short selling is not allowed, a quadratic programming method is used
  """

  N = len(mu)

  # Calculate the tangency portfolio
  if allow_short_selling:
    # Analytic solution
    Sigma_inv = np.linalg.inv(Sigma)
    ones = np.ones(N)
    tangency_weights = Sigma_inv @ (mu - R_f * ones) / (ones.T @ Sigma_inv @ (mu - R_f * ones))
    # tangency_weights = tangency_weights.tolist()
  else:
    # See https://bookdown.org/compfinezbook/introcompfinr/Quadradic-programming.html#no-short-sales-tangency-portfolio for the mathematical formulation
    # Quadratic term
    S = matrix(2*Sigma)

    # Linear term (negative expected excess returns)
    q = matrix(np.zeros((N, 1)))

    # Equality constraint
    A = matrix(np.vstack([mu - R_f]))
    b = matrix(np.array([1.0]))

    # Inequality constraint
    G = -matrix(np.eye(N))
    h = matrix(0.0, (N, 1))

    # Solve the quadratic optimization problem
    x = solvers.qp(S, q, G, h, A, b)['x']
    # x is the unnormalized weights, which need to be normalized
    tangency_weights = np.array(x).squeeze()/np.sum(x)

  # Calculate the portfolio return and risk
  tangency_return = np.dot(mu, tangency_weights)
  tangency_risk = np.sqrt(np.dot(tangency_weights.T, np.dot(Sigma, tangency_weights)))

  return {
      "return": tangency_return,
      "risk": tangency_risk,
      "weights": [float(x) for x in tangency_weights],
  }


def main(symbols: List[str], startYear: int, endYear: int, allowShortSelling: bool, R_f: float):
  start_date = f'{startYear}-01-01'
  end_date = datetime.now().strftime(
      '%Y-%m-%d') if endYear == datetime.now().year else f'{endYear}-01-01'
  # Notation: rets are daily, mu and Sigma are annualized
  rets = estimate_rets(symbols, start_date, end_date)

  # Estimate the expected annualized returns
  print(rets.head())
  mu = 252 * rets.mean().values
  Sigma = 252 * rets.cov().values

  # Calculate the efficient frontier
  if allowShortSelling:
    max = 5.0
    min = -5.0
    R_p_linspace = np.linspace(min, max, num=1000)
    weights, sigma_p = efficient_frontier(mu, Sigma, R_p_linspace)
  else:
    max = np.max(mu)
    min = np.min(mu)
    R_p_linspace = np.linspace(min, max, num=300)
    weights, sigma_p = efficient_frontier_numerical(mu, Sigma, symbols, R_p_linspace)

  tangency_portfolio = find_tangency_portfolio(
      mu, Sigma, allow_short_selling=allowShortSelling, R_f=R_f)
  # Check risk is a float
  for i in range(len(symbols)):
    assert isinstance(np.sqrt(Sigma[i][i]), float), "Risk should be a float"

  return {
      "tickers": symbols,
      "mu": mu.tolist(),
      "Sigma": np.around(Sigma, 6).tolist(),
      "Sigma_inverse": np.around(np.linalg.inv(Sigma), 6).tolist(),
      "data": [{"return": round(R_p_linspace[i], 4), "risk": round(sigma_p[i], 4), "weights": np.around(weights[i], 4).tolist()} for i in range(len(R_p_linspace))],
      "asset_datapoints": [{"ticker": ticker, "return": round(mu[i], 4), "risk": round(np.sqrt(Sigma[i][i]), 4)} for i, ticker in enumerate(symbols)],
      "returns": [[round(val, 6) for val in rets[ticker].fillna(0).tolist()] for ticker in symbols],
      "tangency_portfolio": tangency_portfolio
  }
