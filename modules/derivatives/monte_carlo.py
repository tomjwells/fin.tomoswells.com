import math

import numpy as np
from typing import Literal


def norm_cdf(x: float) -> float:
  return 0.5*(1 + math.erf(x / math.sqrt(2.0)))
def norm_pdf(x: float) -> float:
  return (1 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x ** 2)

def monte_carlo(option_type: Literal['call', 'put'], S_0: float, K: float,  tau: float, r: float, sigma: float, num_trials: int = 100, seed: int = 1234, num_timesteps: int = 100) -> float:
  """
    Description:
      The MC simulation consists of three main steps. 
        1) Using the GBM, estimate the stock price at maturity. 
        2) Calculate the payoff of the option based on the stock price.
        3) We discount the payoff at the risk-free rate to today’s price
  """
  # The time unit is years
  dt = tau / num_timesteps
  nudt = (r - 0.5 * sigma ** 2) * (dt)
  volsdt = sigma * np.sqrt(dt) 
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







