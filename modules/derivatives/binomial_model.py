import numpy as np
from typing import Literal, List
from numpy.typing import NDArray


type OptionType = Literal['call', 'put']


def option_payoff(S: float | NDArray[np.float64], K: float, instrument: OptionType) -> float | NDArray[np.float64]:
  """
    Vectorized option payoff function
      :param S: Stock price
      :param K: Strike price
      :param instrument: Option type
  """
  if instrument == "call":
    return np.maximum(S - K, 0)
  elif instrument == "put":
    return np.maximum(K - S, 0)
  else:
    raise ValueError("Invalid instrument. Choose either 'call' or 'put'")


def EUPrice(instrument: OptionType, S_0: float, sigma: float, r: float, K: float, tau: float, NoSteps: int) -> float:

  S = np.zeros(NoSteps + 1)
  V = np.zeros(NoSteps + 1)
  dt = tau / NoSteps
  discount_factor = np.exp(-r * dt)
  temp1 = np.exp((r + sigma ** 2) * dt)
  temp2 = 0.5 * (discount_factor + temp1)

  # Calculate u, d, and p
  u: float = temp2 + np.sqrt(temp2 * temp2 - 1)
  d: float = 1 / u
  p: float = (np.exp(r * dt) - d) / (u - d)
  S[0] = S_0
  for n in range(1, NoSteps + 1):
    for j in range(n, 0, -1):
      S[j] = u * S[j - 1]
    S[0] = d * S[0]
    # S[n:] = u * S[n-1:-1]
    # S[0] = d * S[0]
  for j in range(NoSteps + 1):
    V[j] = option_payoff(S[j], K, instrument)
  for n in range(NoSteps, 0, -1):
    V[:n] = (p * V[1:n+1] + (1 - p) * V[:n]) * discount_factor
    # Non-vectorized version:
    # for j in range(n):
    #   V[j] = max((p * V[j + 1] + (1 - p) * V[j]) * discount_factor, payoff(S[j], K))
  return V[0]


def USPrice(instrument: OptionType, S_0: float, sigma: float, r: float, K: float, tau: float, N: int) -> float:

  dt = tau / N
  discount_factor = np.exp(-r * dt)
  temp1 = np.exp((r + sigma ** 2) * dt)
  temp2 = 0.5 * (discount_factor + temp1)

  u: float = temp2 + np.sqrt(temp2 * temp2 - 1)
  d: float = 1 / u
  p: float = (np.exp(r * dt) - d) / (u - d)

  mode: Literal["scalar", "vectorized"] = "vectorized"

  if mode == "scalar":
    S = np.zeros(N+1)
    for j in range(N+1):
      S[j] = S_0 * (u ** j) * (d ** (N - j))

    # Option Payoff
    C = np.zeros(N + 1)
    for j in range(N + 1):
      C[j] = option_payoff(S[j], K, instrument)

    # Backward recursion through the tree
    for i in np.arange(N - 1, -1, -1):
      for j in range(0, i + 1):
        S = S_0 * (u ** j) * (d ** (i - j))
        C[j] = discount_factor * (p * C[j + 1] + (1 - p) * C[j])
        C[j] = max(C[j], option_payoff(S, K, instrument))
    return C[0]

  elif mode == "vectorized":
    S = S_0 * d ** np.arange(N, -1, -1) * u ** np.arange(N + 1)

    # Option Payoff
    C = np.maximum(option_payoff(S, K, instrument), np.zeros(N + 1))

    # Backward recursion through the tree
    for i in range(N - 1, -1, -1):
      S = S_0 * d ** np.arange(i, -1, -1) * u ** np.arange(i + 1)
      C[:i+1] = discount_factor * (p * C[1:i+2] + (1 - p) * C[0:i+1])
      C = C[:-1]
      C = np.maximum(C, option_payoff(S, K, instrument))

    return C[0]
