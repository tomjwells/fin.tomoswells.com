from cvxopt import matrix, solvers, blas
import os
import time
from typing import Tuple, List, Any
from datetime import datetime
import numpy as np
import pandas as pd
# import modin.pandas as pd
import numpy.typing as npt
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from functools import partial


def efficient_frontier(mu: npt.NDArray[np.floating[Any]], inv_Sigma: np.ndarray[Any, Any], R_p_linspace: npt.NDArray[np.floating[Any]]) -> Tuple[np.floating[Any], np.floating[Any]]:
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
  weights = lambda_1[:, None] * \
      (inv_Sigma @ mu) + lambda_2[:, None] * (inv_Sigma @ ones)

  return weights, np.sqrt(var_p)


def calculate_sortino_variance(rets, weights, T):
  """
    Calculate the Sortino variance of a portfolio. Calculated according to the definition in
    https://www.cmegroup.com/education/files/rr-sortino-a-sharper-ratio.pdf.
    The Sortino variance measures the downside volatility of a portfolio below a target return
      - rets: DataFrame of daily returns
      - weights: Portfolio weights
      - T: Target return (assumed annualized)
  """
  # Calculate the portfolio's return (mean of portfolio returns)
  daily_portfolio_returns = (rets * weights).sum(axis=1)

  # Calculate the downside deviation
  squared_deviations = np.square(np.minimum(0, daily_portfolio_returns - T/252))
  downside_variance_annualized = 252 * np.mean(squared_deviations)

  R_p_annualized = 252 * np.mean(daily_portfolio_returns)
  varianve_annualized = 252 * np.var(daily_portfolio_returns)
  print(f"Sharpe Ratio: {(R_p_annualized - T) / np.sqrt(varianve_annualized)} Sortino Ratio: {(R_p_annualized - T) / np.sqrt(downside_variance_annualized)}")

  return downside_variance_annualized


def calculate_portfolio(R_p, S, q, G, h, A):
  return solvers.qp(S, q, G, h, A, matrix([R_p, 1.0]))['x']


def efficient_frontier_numerical(mu, Sigma, R_p_linspace):
  N = len(mu)  # The number of assets in a portfolio

  # Quadratic term
  S = matrix(Sigma.values)

  # The linear term (Zero vector)
  q = matrix(np.zeros((N, 1)))

  # Inequality constraint matrices (this is the no short selling constraint effectively)
  G = -matrix(np.eye(N))   # negative n x n identity matrix
  h = matrix(0.0, (N, 1))

  # Equality constraint
  A = matrix(np.vstack([np.array(mu), np.ones(N)]))

  # Parallelize the quadratic optimization step over each of the R_p linspace
  calculate_portfolio_partial = partial(
      calculate_portfolio, S=S, q=q, G=G, h=h, A=A)
  with ThreadPoolExecutor() as executor:
    portfolios = list(executor.map(calculate_portfolio_partial, R_p_linspace))
  # CALCULATE RISKS AND RETURNS FOR FRONTIER
  weights = np.array(portfolios).squeeze()
  risks = np.sqrt(np.einsum('ij,ij->i', weights, np.dot(weights, S)))

  return weights, risks


def find_tangency_portfolio(mu, Sigma, inv_Sigma, R_f, allow_short_selling=False):
  """
    Function to find the tangency portfolio
    If short selling is allowed, the analytic solution is used
    If short selling is not allowed, a quadratic programming method is used
  """

  N = len(mu)

  # Calculate the tangency portfolio
  if allow_short_selling:
    # Analytic solution
    ones = np.ones(N)
    subtracted = mu - R_f * ones
    tangency_weights = inv_Sigma @ subtracted / (ones.T @ inv_Sigma @ subtracted)
  else:
    # See https://bookdown.org/compfinezbook/introcompfinr/Quadradic-programming.html#no-short-sales-tangency-portfolio for the mathematical formulation
    # Quadratic term
    S = matrix(2*Sigma.values)

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
  tangency_return = mu @ tangency_weights
  tangency_risk = np.sqrt(tangency_weights.T @ Sigma @ tangency_weights)

  return {
      "return": tangency_return,
      "risk": tangency_risk,
      "weights": tangency_weights.tolist(),
  }


def main(rets, allowShortSelling: bool, R_f: float):

  # Verify all columns contain numbers, if not we discard the column
  # This can happen if a ticker started trading after the date range
  rets = rets.apply(pd.to_numeric, errors='coerce').dropna(axis=1)

  # Notation: rets are daily, mu and Sigma are annualized
  print(rets.head())
  mu = 252 * rets.mean()
  Sigma = 252 * rets.cov()
  inv_Sigma = np.linalg.inv(Sigma)

  # Calculate the efficient frontier
  if allowShortSelling:
    max = 5.0
    min = -5.0
    R_p_linspace = np.linspace(min, max, num=1000)
    weights, sigma_p = efficient_frontier(mu, inv_Sigma, R_p_linspace)
  else:
    max = np.max(mu)
    min = np.min(mu)
    R_p_linspace = np.linspace(min, max, num=300)
    weights, sigma_p = efficient_frontier_numerical(mu, Sigma, R_p_linspace)

  tangency_portfolio = find_tangency_portfolio(mu, Sigma, inv_Sigma, R_f, allow_short_selling=allowShortSelling)

  print(weights)
  return {
      "tickers": rets.columns.tolist(),
      "efficient_frontier": [{"return": round(R_p_linspace[i], 4), "risk": round(sigma_p[i], 4), "weights": np.around(weights[i], 4).tolist()} for i in range(len(R_p_linspace))],
      "asset_datapoints": [{"ticker": rets.columns[i], "return": round(mu[i], 4), "risk": round(np.sqrt(Sigma.values[i][i]), 4)} for i in range(rets.shape[1])],
      "returns": [[round(val, 6) for val in rets[ticker].fillna(0).tolist()] for ticker in rets.columns],
      "tangency_portfolio": tangency_portfolio,
      "sortino_variance": calculate_sortino_variance(rets, tangency_portfolio['weights'], R_f)
  }
