from typing import List, Any
import time
from datetime import datetime
import numpy as np
import pandas as pd
import yfinance as yf
import numpy.typing as npt
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor


def download_data(ticker: str, start_date: str, end_date: str):
  stock_data = yf.download(ticker.replace('.','-'), start=start_date, end=end_date, progress=False)['Adj Close']
  # Calculate the daily returns
  daily_returns = stock_data.pct_change().dropna()
  return daily_returns

@lru_cache(maxsize=None)
def get_returns(ticker: str, start_date: str, end_date: str) -> pd.Series:
  """
  Downloads the adjusted close prices for a given ticker and calculates the daily returns
  """
  for _ in range(10): 
    with ThreadPoolExecutor() as executor:
      future = executor.submit(download_data, ticker, start_date, end_date)
      try:
        stock_data = future.result(timeout=2)  # Timeout after 1 second
        if stock_data is not None:
          break
      except TimeoutError:
          print("yfinance request timed out. Retrying...")
      except Exception as e:
          print(f"An error occurred: {e}. Retrying...")
      time.sleep(1)
  return stock_data



def estimate_ret_and_cov(tickers: List[str], start_date: str, end_date: str) -> tuple[pd.DataFrame, pd.DataFrame]:
  """
  Calculates the mean return and covariance of multiple assets
  """

  # Use ThreadPoolExecutor to download data in parallel
  # with ThreadPoolExecutor() as executor:
  #   results = executor.map(get_returns, tickers)
  # Use ThreadPoolExecutor to download data in parallel
  with ThreadPoolExecutor() as executor:
    results = executor.map(lambda ticker: get_returns(ticker, start_date, end_date), tickers)
  results = list(results)

  # Create a DataFrame from the results
  stock_returns = pd.concat(results, axis=1, keys=tickers)
  print(stock_returns.head())

  # Calculate the covariance matrix
  cov_matrix = stock_returns.cov()

  return stock_returns, cov_matrix

# @lru_cache(maxsize=None)
def efficient_frontier(mu: npt.NDArray[np.floating[Any]],Sigma: np.ndarray[Any, Any], R_p_linspace: npt.NDArray[np.floating[Any]]) -> List[float]:
  inv_Sigma = np.linalg.inv(Sigma)
  ones = np.ones(len(mu))
  a = mu.T @ inv_Sigma @ mu
  c = mu.T @ inv_Sigma @ ones
  f = ones @ inv_Sigma @ ones
  d = a*f - c*c
  # return ((1.0/d) * (f* (R_p_linspace ** 2) - 2*c*R_p_linspace + a)).tolist()
  var_p = ((1.0/d) * (f* (R_p_linspace ** 2) - 2*c*R_p_linspace + a)).tolist()

  # Also calculate the weights
  weights = []
  for R_p in R_p_linspace:
    lambda_1 = (1.0/d) * (f - c*R_p)
    lambda_2 = (1.0/d) * (a - c*R_p)
    weights.append((0.5 * lambda_1 * inv_Sigma @ mu + 0.5 * lambda_2 * inv_Sigma @ ones).tolist())

  return var_p, weights

def main(tickers: List[str], startYear: int, endYear: int):
  start_date = f'{startYear}-01-01'
  end_date = datetime.now().strftime('%Y-%m-%d') if endYear == datetime.now().year else f'{endYear}-01-01'
  stock_returns, cov_matrix = estimate_ret_and_cov(tickers, start_date, end_date)
  # print(stock_returns)
  # print(cov_matrix)

  # Estimate the expected returns
  # mu = np.array([(1+ret)**252-1 for ret in stock_returns.mean().values])
  mu = 252 * stock_returns.mean().values
  Sigma = 252 * cov_matrix.values
  # Todo: verify some properties of Sigma - is it symmetric, positive definite, etc.

  # Calculate the efficient frontier
  max: float = 5.0
  min: float = -5.0
  assert isinstance(min, float), "min should be a float"
  assert isinstance(max, float), "max should be a float"
  R_p_linspace = np.linspace(min, max, num=1000)
  print(Sigma)
  var_p, weights = efficient_frontier(mu, Sigma, R_p_linspace)
  sigma_p = np.sqrt(var_p)
  print(var_p)
  # tangency_portfolio = calculate_tangency_portfolio(mu, Sigma, risk_free_rate)

  # Print the results
  print(f"Mean returns:\n{mu}\n")
  print(f"Std dev:\n{[calculate_annual_std_dev(cov_matrix, ticker) for ticker in tickers]}\n")
  # print(f"tangency_portfolio:\n{tangency_portfolio}\n")
  # print(f"Covariance matrix:\n{Sigma}\n")
  # print(f"Efficient frontier:\n{risk_p}\n")
  print([{"ticker": ticker, "return": mu[i], "risk": Sigma[i]} for i, ticker in enumerate(tickers)])
  # Check risk is a float
  for i in range(len(tickers)): 
    risk = np.sqrt(Sigma[i][i])
    assert isinstance(risk, float), "Risk should be a float"
  return {
    "tickers": tickers,
    "mu": mu.tolist(),
    "Sigma": Sigma.tolist(),
    "data": [{"return": R_p_linspace[i], "risk": sigma_p[i], 
              "weights": weights[i]
              } for i in range(len(R_p_linspace))],
    # "tangency_portfolio": {
    #    "weights": tangency_portfolio.tolist(),
    #     "return": float(tangency_portfolio @ mu),
    #     "risk": float(np.sqrt(tangency_portfolio @ Sigma @ tangency_portfolio))
    #   },
      "asset_datapoints": [{"ticker": ticker, "return": mu[i], "risk": np.sqrt(Sigma[i][i])} for i, ticker in enumerate(tickers)]
    }



def calculate_annual_std_dev(cov_matrix, ticker='MSFT'):
    # Get the daily standard deviation for the ticker
    daily_std_dev = np.sqrt(cov_matrix.loc[ticker, ticker])

    # Scale the daily standard deviation to annual standard deviation
    annual_std_dev = daily_std_dev * np.sqrt(252)

    return annual_std_dev

# def calculate_tangency_portfolio(mu, Sigma, risk_free_rate: float):
#     inv_Sigma = np.linalg.inv(Sigma)
#     ones = np.ones(len(mu))
#     return (inv_Sigma @ (mu -risk_free_rate*ones) / (ones.T @ inv_Sigma @ (mu - risk_free_rate*ones)))

