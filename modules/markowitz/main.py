from typing import List, Any
import numpy as np
import pandas as pd
import yfinance as yf
import numpy.typing as npt
from functools import lru_cache


@lru_cache(maxsize=None)
def get_returns(ticker: str, start_date: str, end_date: str) -> pd.Series:
  stock_data = yf.download(ticker, start=start_date, end=end_date, progress=False)['Adj Close']
  return stock_data.pct_change()


def estimate_ret_and_cov(tickers: List[str], start_date: str, end_date: str) -> tuple[pd.DataFrame, pd.DataFrame]:
  """
  Calculates the mean return and covariance of multiple assets
  """

  # Use ThreadPoolExecutor to download data in parallel
  # with ThreadPoolExecutor() as executor:
  #   results = executor.map(get_returns, tickers)
  results = [get_returns(ticker, start_date, end_date) for ticker in tickers]

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

def main(tickers: List[str], risk_free_rate: float):
  start_date = '2014-01-01'
  end_date = '2024-02-29'
  stock_returns, cov_matrix = estimate_ret_and_cov(tickers, start_date, end_date)
  print(stock_returns)
  print(cov_matrix)

  # Estimate the expected returns
  mu = np.array([(1+ret)**252-1 for ret in stock_returns.mean().values])
  Sigma = cov_matrix.values * 252
  # Todo: verify some properties of Sigma - is it symmetric, positive definite, etc.

  # Calculate the efficient frontier
  max: float = 5.0
  min: float = -5.0
  assert isinstance(min, float), "min should be a float"
  assert isinstance(max, float), "max should be a float"
  R_p_linspace = np.linspace(min, max, num=1000)
  var_p = efficient_frontier(mu, Sigma, R_p_linspace)
  sigma_p = np.sqrt(var_p)
  tangency_portfolio = calculate_tangency_portfolio(mu, Sigma, risk_free_rate)

  # Print the results
  print(f"Mean returns:\n{mu}\n")
  print(f"Std dev:\n{[calculate_annual_std_dev(cov_matrix, ticker) for ticker in tickers]}\n")
  print(f"tangency_portfolio:\n{tangency_portfolio}\n")
  # print(f"Covariance matrix:\n{Sigma}\n")
  # print(f"Efficient frontier:\n{risk_p}\n")
  print([{"ticker": ticker, "return": mu[i], "risk": Sigma[i]} for i, ticker in enumerate(tickers)])
  return {
    "data": [{"return": R_p_linspace[i], "risk":sigma_p[i]} for i in range(len(R_p_linspace))],
    "tangency_portfolio": {
       "weights": tangency_portfolio.tolist(),
        "return": float(tangency_portfolio @ mu),
        "risk": float(np.sqrt(tangency_portfolio @ Sigma @ tangency_portfolio))
      },
      "asset_datapoints": [{"ticker": ticker, "return": mu[i], "risk": np.sqrt(Sigma[i][i])} for i, ticker in enumerate(tickers)]
    }



def calculate_annual_std_dev(cov_matrix, ticker='MSFT'):
    # Get the daily standard deviation for the ticker
    daily_std_dev = np.sqrt(cov_matrix.loc[ticker, ticker])

    # Scale the daily standard deviation to annual standard deviation
    annual_std_dev = daily_std_dev * np.sqrt(252)

    return annual_std_dev

def calculate_tangency_portfolio(mu, Sigma, risk_free_rate: float):
    inv_Sigma = np.linalg.inv(Sigma)
    ones = np.ones(len(mu))
    return (inv_Sigma @ (mu -risk_free_rate*ones) / (ones.T @ inv_Sigma @ (mu - risk_free_rate*ones)))

