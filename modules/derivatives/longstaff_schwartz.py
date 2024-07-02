import numpy as np
import math
from typing import Literal

type OptionType = Literal['call', 'put']


def gen_sn(num_timesteps: int, num_trials: int, anti_paths: bool = True, mo_match: bool = True) -> np.ndarray:
  """
      Generate random numbers for simulation
  """
  if anti_paths is True:
    sn = np.random.standard_normal((num_timesteps + 1, int(num_trials / 2)))
    sn = np.concatenate((sn, -sn), axis=1)
  else:
    sn = np.random.standard_normal((num_timesteps + 1, num_trials))
  if mo_match is True:
    sn = (sn - sn.mean()) / sn.std()
  return sn


def longstaff_schwartz(option_type: OptionType, S_0: float, K: float,  tau: float, r: float, sigma: float, num_trials: int = 100, seed: int = 1234, num_timesteps: int = 100) -> float:
  """
    Valuation of American option in Black-Scholes-Merton by least squares Monte Carlo (LSM) algorithm
  """
  np.random.seed(seed)
  dt = tau / num_timesteps
  df = np.exp(-r * dt)
  S = np.zeros((num_timesteps + 1, num_trials))
  S[0] = S_0
  sn = gen_sn(num_timesteps, num_trials)

  for t in range(1, num_timesteps + 1):
    S[t] = S[t - 1] * np.exp((r - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * sn[t])

  if option_type == 'call':
    h = np.maximum(S - K, 0)
  elif option_type == 'put':
    h = np.maximum(K - S, 0)
  else:
    raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  # LSM algorithm
  V = np.copy(h)
  for t in range(num_timesteps - 1, 0, -1):
    reg = np.polyfit(S[t], V[t + 1] * df, 2)
    C = np.polyval(reg, S[t])
    V[t] = np.where(h[t] > C, h[t], V[t + 1] * df)
  # MCS estimator
  return np.mean(V[1] * df)
