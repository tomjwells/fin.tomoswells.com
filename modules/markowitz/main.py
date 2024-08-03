from cvxopt import matrix, solvers
import os
from typing import Dict, TypedDict, Tuple, List, Any
import numpy as np
import numpy.typing as npt
from concurrent.futures import ThreadPoolExecutor
from functools import partial

# Switch to True to show the progress of the optimization in the server logs
solvers.options['show_progress'] = False if os.environ.get("DEBUG") else False


def main(tickers: List[str], rets: npt.NDArray[np.float64], allowShortSelling: bool, R_f: float):

  # Notation: rets are daily, mu and Sigma are annualized
  mu: npt.NDArray = 252 * np.nanmean(rets, axis=0)
  Sigma: npt.NDArray = 252 * np.cov(rets, rowvar=False)
  inv_Sigma: npt.NDArray = np.linalg.inv(Sigma)

  # Calculate the efficient frontier
  if allowShortSelling:
    max = 1
    min = -0.2
    R_p_linspace = np.linspace(min, max, num=60)
    weights, sigma_p = efficient_frontier(mu, inv_Sigma, R_p_linspace)
  else:
    max = np.max(mu)
    min = np.min(mu)
    R_p_linspace = np.linspace(min, max, num=60)
    weights, sigma_p = efficient_frontier_numerical(mu, Sigma, R_p_linspace)

  tangency_portfolio = find_tangency_portfolio(mu, Sigma, inv_Sigma, R_f, allow_short_selling=allowShortSelling)
  sortino_variance = calculate_sortino_variance(rets, tangency_portfolio['weights'], R_f)

  return {
      "tickers": tickers,
      "efficient_frontier": [{"return": R_p_linspace[i], "risk": sigma_p[i], "weights": weights[i].tolist()} for i in range(len(R_p_linspace))],
      "asset_datapoints": [{"ticker": ticker, "return": ret, "risk": risk} for ticker, ret, risk in zip(tickers, mu, np.sqrt(np.diag(Sigma)))],
      "tangency_portfolio": tangency_portfolio,
      "sortino_variance": sortino_variance
  }


def efficient_frontier(
    mu: npt.NDArray[np.float64],
    inv_Sigma: npt.NDArray[np.float64],
    R_p_linspace: npt.NDArray[np.float64]
) -> Tuple[npt.NDArray[np.float64], npt.NDArray[np.float64]]:
  """
    Calculate the efficient frontier using the analytic solution.
  """
  ones = np.ones(len(mu))
  inv_Sigma_at_mu = inv_Sigma @ mu
  inv_Sigma_at_ones = inv_Sigma @ ones
  a = mu.T @ inv_Sigma_at_mu
  c = mu.T @ inv_Sigma_at_ones
  f = ones.T @ inv_Sigma_at_ones
  d = a * f - c ** 2
  one_over_d = 1 / d
  risk = np.sqrt(one_over_d * (f * (R_p_linspace ** 2) - 2 * c * R_p_linspace + a))

  # Vectorized calculation (over the linspace of returns) of the portfolio weights along the efficient frontier
  lambda_1 = + one_over_d * (f * R_p_linspace - c)
  lambda_2 = - one_over_d * (c * R_p_linspace - a)
  weights = lambda_1[:, None] * (inv_Sigma_at_mu) + lambda_2[:, None] * (inv_Sigma_at_ones)

  return weights, risk


def calculate_sortino_variance(
    rets: npt.NDArray[np.float64],
    weights: List[float],
    T: float
) -> np.float64:
  """
    Calculate the Sortino variance of a portfolio. Calculated using the definition in
    https://www.cmegroup.com/education/files/rr-sortino-a-sharper-ratio.pdf.
    The Sortino variance measures the downside volatility of a portfolio below a target return
      - rets: DataFrame of daily returns
      - weights: Portfolio weights
      - T: Target return (annualized)
  """
  # Calculate the portfolio's return (mean of portfolio returns)
  daily_portfolio_returns = (rets * weights).sum(axis=1)

  # Calculate the downside deviation
  downside_variance_annualized = 252 * np.mean(np.square(np.minimum(0, daily_portfolio_returns - (T/252))))

  if os.environ.get("DEBUG"):
    R_p_annualized = 252 * np.mean(daily_portfolio_returns)
    variance_annualized = 252 * np.var(daily_portfolio_returns)
    print(f"Sharpe Ratio: {(R_p_annualized - T) / np.sqrt(variance_annualized)} Sortino Ratio: {(R_p_annualized - T) / np.sqrt(downside_variance_annualized)}")

  return downside_variance_annualized


def calculate_portfolio(R_p, S, q, G, h, A):
  return solvers.qp(S, q, G, h, A, matrix([R_p, 1.0]))['x']


def efficient_frontier_numerical(
    mu: npt.NDArray[np.float64],
    Sigma: npt.NDArray[np.float64],
    R_p_linspace: npt.NDArray[np.float64]
) -> Tuple[npt.NDArray[np.float64], npt.NDArray[np.float64]]:
  N = len(mu)  # The number of assets in a portfolio

  # Quadratic term
  S = matrix(Sigma)

  # The linear term (Zero vector)
  q = matrix(np.zeros((N, 1)))

  # Inequality constraint matrices (this is the no short selling constraint effectively)
  G = -matrix(np.eye(N))   # negative n x n identity matrix
  h = matrix(0.0, (N, 1))

  # Equality constraint
  A = matrix(np.vstack([mu, np.ones(N)]))

  # Parallelize the quadratic optimization step over the R_p linspace
  with ThreadPoolExecutor() as executor:
    portfolios = list(executor.map(partial(calculate_portfolio, S=S, q=q, G=G, h=h, A=A), R_p_linspace))

  # Calculate the weights and risks of the portfolios
  weights = np.array(portfolios).squeeze()
  risks = np.sqrt(np.sum(weights * (weights @ S), axis=1))

  return weights, risks


class TangencyPortfolio(TypedDict):
  return_: npt.NDArray[np.float64]
  risk: npt.NDArray[np.float64]
  weights: List[float]


TangencyPortfolio = TypedDict('TangencyPortfolio', {
    'return_': npt.NDArray[np.float64],
    'risk': npt.NDArray[np.float64],
    'weights': List[float]
})

def find_tangency_portfolio(
    mu: npt.NDArray[np.float64],
    Sigma: npt.NDArray[np.float64],
    inv_Sigma: npt.NDArray[np.float64],
    R_f: float,
    allow_short_selling: bool = False
) -> TangencyPortfolio:
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
    inv_Sigma_at_subtracted = inv_Sigma @ subtracted
    tangency_weights = inv_Sigma_at_subtracted / (ones.T @ inv_Sigma_at_subtracted)
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

  return {
      "return_": mu @ tangency_weights,
      "risk": np.sqrt(tangency_weights.T @ Sigma @ tangency_weights),
      "weights": tangency_weights.tolist(),
  }
