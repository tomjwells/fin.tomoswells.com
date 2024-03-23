from typing import List, Any
import numpy as np
import pandas as pd
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor
import numpy.typing as npt



def estimate_ret_and_cov(tickers: List[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
  """
  Calculates the mean return and covariance of multiple assets
  """
  def get_returns(ticker: str) -> pd.Series:
    stock_data = yf.download(ticker, start='2021-01-01', end='2024-02-29', progress=False)['Adj Close']
    return stock_data.pct_change()

  # Use ThreadPoolExecutor to download data in parallel
  # with ThreadPoolExecutor() as executor:
  #   results = executor.map(get_returns, tickers)
  results = [get_returns(ticker) for ticker in tickers]

  # Create a DataFrame from the results
  stock_returns = pd.concat(results, axis=1, keys=tickers)
  print(stock_returns.head())

  # Calculate the covariance matrix
  cov_matrix = stock_returns.cov()

  return stock_returns, cov_matrix

def efficient_frontier(mu: npt.NDArray[np.floating[Any]],Sigma: np.ndarray[Any, Any], R_p_linspace: npt.NDArray[np.floating[Any]]) -> npt.NDArray[np.floating[Any]]:
  inv_Sigma = np.linalg.inv(Sigma)
  ones = np.ones(len(mu))
  a = mu.T @ inv_Sigma @ mu
  c = mu.T @ inv_Sigma @ ones
  f = ones @ inv_Sigma @ ones
  d = a*f - c*c

  return (1.0/d) * (f* (R_p_linspace ** 2) - 2*c*R_p_linspace + a)

def main(tickers: List[str]):
  # tickers = ['GOOGL', 'MSFT']
  stock_returns, cov_matrix = estimate_ret_and_cov(tickers)
  print(stock_returns)
  print(cov_matrix)

  # Estimate the mean returns
  mu = np.array([(1+ret)**252-1 for ret in stock_returns.mean().values])
  Sigma = cov_matrix.values * 252
  # Todo: Test some properties of Sigma - is it symmetric, positive definite, etc.

  # Calculate the efficient frontier
  max: float = mu.max()
  min: float = -max
  assert isinstance(min, float), "min should be a float"
  assert isinstance(max, float), "max should be a float"
  R_p_linspace = np.linspace(min, max, num=100)
  var_p = efficient_frontier(mu, Sigma, R_p_linspace)
  sigma_p = np.sqrt(var_p)

  # Print the results
  print(f"Mean returns:\n{mu}\n")
  print(f"Std dev:\n{[calculate_annual_std_dev(cov_matrix, ticker) for ticker in tickers]}\n")
  # print(f"Covariance matrix:\n{Sigma}\n")
  # print(f"Efficient frontier:\n{risk_p}\n")
  return sigma_p, R_p_linspace



def calculate_annual_std_dev(cov_matrix, ticker='MSFT'):
    # Get the daily standard deviation for the ticker
    daily_std_dev = np.sqrt(cov_matrix.loc[ticker, ticker])

    # Scale the daily standard deviation to annual standard deviation
    annual_std_dev = daily_std_dev * np.sqrt(252)

    return annual_std_dev