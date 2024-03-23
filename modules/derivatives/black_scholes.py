import math

import numpy as np
from typing import Literal


def norm_cdf(x: float) -> float:
  return 0.5*(1 + math.erf(x / math.sqrt(2.0)))
def norm_pdf(x: float) -> float:
  return (1 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x ** 2)

def black_scholes(option_type: Literal['call', 'put'], S_0: float, sigma: float, K: float, tau: float,  r: float) -> float:
  """
    Arguments:
      - option_type: call or put
      - S_0: S_0 = S(t=0), the spot price of the underlying asset at time t=0
      - sigma: sigma is the standard deviation of the asset's returns
      - K: K is the strike price
      - tau: tau is the time to maturity, measured in years
      - r: r is the risk-free interest rate
  """
  d1 = (math.log(S_0 / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * math.sqrt(tau))
  d2 = d1 - sigma * math.sqrt(tau)
  
  if option_type != 'call' and option_type != 'put':
    raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  if option_type == 'call':
    return   S_0 * norm_cdf( d1) - K * norm_cdf( d2) * math.exp(-r * tau)
  elif option_type == 'put':
    return - S_0 * norm_cdf(-d1) + K * norm_cdf(-d2) * math.exp(-r * tau) 



def implied_volatility(option_type: Literal['call', 'put'], market_price: float, S_0: float, K: float, tau: float, r: float, sigma_initial_guess: float = 0.2, tolerance: float = 1e-6, max_iterations: int = 10000) -> float:
  sigma = sigma_initial_guess
  # Newton-Raphson method
  for _ in range(max_iterations):
    price = black_scholes(option_type, S_0, sigma, K, tau, r)
    diff = price - market_price
    if abs(diff) < tolerance:
      return sigma
    vega = black_scholes_vega(S_0, K, sigma, tau, r)
    sigma = sigma - diff/vega
  raise ValueError(f'Implied volatility not found after {max_iterations} iterations')

def black_scholes_vega(S_0: float, K: float, sigma: float, tau: float, r: float) -> float:
  d1 = (math.log(S_0 / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * math.sqrt(tau))
  return S_0 * norm_cdf(d1) * math.sqrt(tau)

def black_scholes_delta(S: float, K: float, T: float, r: float, sigma: float, option_type: Literal['call', 'put'] = 'call') -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    if option_type == 'call':
        return norm_cdf(d1)
    else:
        return -norm_cdf(-d1)

def black_scholes_gamma(S: float, sigma: float, K: float, T: float, r: float, ) -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    return norm_pdf(d1) / (S * sigma * np.sqrt(T))

def black_scholes_theta(S: float, sigma: float, K: float, T: float, r: float, option_type: Literal['call', 'put'] = 'call') -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if option_type == 'call':
        return -S * norm_pdf(d1) * sigma / (2 * np.sqrt(T)) - r * K * np.exp(-r * T) * norm_cdf(d2)
    else:
        return -S * norm_pdf(d1) * sigma / (2 * np.sqrt(T)) + r * K * np.exp(-r * T) * norm_cdf(-d2)

def black_scholes_rho(S: float, sigma: float, K: float, T: float, r: float, option_type: Literal['call', 'put'] = 'call') -> float:
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    if option_type == 'call':
        return K * T * np.exp(-r * T) * norm_cdf(d2)
    else:
        return -K * T * np.exp(-r * T) * norm_cdf(-d2)
    




