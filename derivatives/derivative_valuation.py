import math

import numpy as np
from typing import Literal
from datetime import datetime, timedelta


def norm_cdf(x: float) -> float:
  return 0.5*(1 + math.erf(x / math.sqrt(2.0)))
def norm_pdf(x: float) -> float:
  return (1 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x ** 2)

def black_scholes(option_type: Literal['call', 'put'], S_0: float, K: float,T: datetime, t: datetime,  r: float, sigma: float) -> float:
  """
    Arguments:
      - option_type: call or put
      - S_0: S_0 = S(t=0), the spot price of the underlying asset at time t=0
      - K: K is the strike price
      - T: T is the time to maturity
      - t: t is the current time
      - r: r is the risk-free interest rate
      - sigma: sigma is the standard deviation of the asset's returns
  """
  tau = (T - t).days / 365.0
  d1 = (math.log(S_0 / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * math.sqrt(tau))
  d2 = d1 - sigma * math.sqrt(tau)
  
  if option_type != 'call' and option_type != 'put':
    raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  if option_type == 'call':
    return   S_0 * norm_cdf( d1) - K * norm_cdf( d2) * math.exp(-r * tau)
  elif option_type == 'put':
    return - S_0 * norm_cdf(-d1) + K * norm_cdf(-d2) * math.exp(-r * tau) 


def monte_carlo(option_type: Literal['call', 'put'], S_0: float, K: float,  T: datetime, t: datetime, r: float, sigma: float, num_trials: int = 100, seed: int = 1234, dt: timedelta = timedelta(days=1)) -> float:
  """
    Description:
      The MC simulation consists of three main steps. 
        1) Using the GBM, estimate the stock price at maturity. 
        2) Calculate the payoff of the option based on the stock price.
        3) We discount the payoff at the risk-free rate to today’s price
  """
  # Working with time in unit of years
  tau = (T - t).days / 365.0
  num_timesteps = int((T-t)/dt)
  dt_in_years = tau / num_timesteps
  nudt = (r - 0.5 * sigma ** 2) * (dt_in_years)
  volsdt = sigma * np.sqrt(dt_in_years) 
  lnS_0 = np.log(S_0)

  np.random.seed(seed)
  if option_type != 'call' and option_type != 'put':
    raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  # 1) Simulate asset paths for the geometric Brownian motion.
  Z = np.random.normal(size=(num_timesteps, num_trials))
  delta_lnS_t = nudt + volsdt*Z
  lnS_t = lnS_0 + np.cumsum(delta_lnS_t, axis=0) # axis=0 performs the summation over time steps
  # lnS_t = np.concatenate((np.full(shape=(1, num_trials), fill_value=lnS_0), lnS_T ) )
  lnS_T = lnS_t[-1]
  S_T = np.exp(lnS_T)

  # 2) Calculate the payoff for each path for a call or put.
  if option_type == 'call':
    payoff = np.maximum(S_T - K, 0)
  elif option_type == 'put':
    payoff = np.maximum(K - S_T, 0)
  mean_payoff= np.mean(payoff)

  # 3) Discount the average payoff back to time zero.
  discounted_payoff = np.exp(-r * tau) * mean_payoff
  return discounted_payoff

def implied_volatility(option_type: Literal['call', 'put'], market_price: float, S_0: float, K: float, T: datetime, t: datetime, r: float, sigma_initial_guess: float = 0.2, tolerance: float = 1e-6, max_iterations: int = 10000) -> float:
  sigma = sigma_initial_guess
  # Newton-Raphson method
  for _ in range(max_iterations):
    price = black_scholes(option_type, S_0, K, T, t, r, sigma)
    diff = price - market_price
    # print(abs(diff))
    if abs(diff) < tolerance:
      return sigma
    vega = black_scholes_vega(S_0, K, T, t, r, sigma)
    sigma = sigma - diff/vega
  raise ValueError(f'Implied volatility not found after {max_iterations} iterations')

def black_scholes_vega(S_0: float, K: float, T: datetime, t: datetime, r: float, sigma: float) -> float:
  tau = (T - t).days / 365.0
  d1 = (math.log(S_0 / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * math.sqrt(tau))
  return S_0 * norm_cdf(d1) * math.sqrt(tau)

def black_scholes_delta(S: float, K: float, T: float, r: float, sigma: float, option_type: Literal['call', 'put'] = 'call') -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    if option_type == 'call':
        return norm_cdf(d1)
    else:
        return -norm_cdf(-d1)

def black_scholes_gamma(S: float, K: float, T: float, r: float, sigma: float) -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    return norm_pdf(d1) / (S * sigma * np.sqrt(T))

def black_scholes_theta(S: float, K: float, T: float, r: float, sigma: float, option_type: Literal['call', 'put'] = 'call') -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if option_type == 'call':
        return -S * norm_pdf(d1) * sigma / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm_cdf(d2)
    else:
        return -S * norm_pdf(d1) * sigma / (2 * np.sqrt(T)) + r * K * np.exp(-r * T) * norm_cdf(-d2)

def black_scholes_rho(S: float, K: float, T: float, r: float, sigma: float, option_type: Literal['call', 'put'] = 'call') -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if option_type == 'call':
        return K * T * np.exp(-r * T) * norm_cdf(d2)
    else:
        return -K * T * np.exp(-r * T) * norm_cdf(-d2)