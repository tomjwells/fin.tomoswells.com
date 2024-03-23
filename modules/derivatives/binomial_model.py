import numpy as np
from typing import Literal

def call_payoff(S: float, K: float) -> float:
  return max(S - K, 0)
def put_payoff(S: float, K: float) -> float:
  return max(K - S, 0)

def EUPrice(instrument: Literal["call","put"], S_0: float, sigma: float, r: float, K: float, tau: float, NoSteps: int) -> float:
  if instrument == "call":
    payoff = call_payoff
  elif instrument == "put":
    payoff = put_payoff
  else:
    raise ValueError("Invalid instrument. Choose either 'call' or 'put'")
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
  print(f"u: {u}, d: {d}, p: {p}")
  S[0] = S_0
  for n in range(1, NoSteps + 1):
    for j in range(n, 0, -1):
      S[j] = u * S[j - 1]
    S[0] = d * S[0]
    # S[n:] = u * S[n-1:-1]
    # S[0] = d * S[0]
  for j in range(NoSteps + 1):
    V[j] = payoff(S[j], K)
  for n in range(NoSteps, 0, -1):
    V[:n] = (p * V[1:n+1] + (1 - p) * V[:n]) * discount_factor
    # for j in range(n):
    #   V[j] = max((p * V[j + 1] + (1 - p) * V[j]) * discount_factor, payoff(S[j], K))
  print(f"V: {V[0]}")
  return V[0]

def USPrice(instrument: Literal["call","put"], S_0: float, sigma: float, r: float, K: float, tau: float, NoSteps: int) -> float:
  if instrument == "call":
    payoff = call_payoff
  elif instrument == "put":
    payoff = put_payoff
  else:
    raise ValueError("Invalid instrument. Choose either 'call' or 'put'")
  S = np.zeros((NoSteps + 1, NoSteps + 1))
  V = np.zeros((NoSteps + 1, NoSteps + 1))
  dt = tau / NoSteps
  discount_factor = np.exp(-r * dt)
  temp1 = np.exp((r + sigma ** 2) * dt)
  temp2 = 0.5 * (discount_factor + temp1)

  u: float = temp2 + np.sqrt(temp2 * temp2 - 1)
  d: float = 1 / u
  p: float = (np.exp(r * dt) - d) / (u - d)

  S[0, 0] = S_0
  for n in range(1, NoSteps + 1):
    for j in range(n, 0, -1):
      S[j, n] = u * S[j - 1, n - 1]
    S[0, n] = d * S[0, n - 1]
  for j in range(NoSteps + 1):
    V[j, NoSteps] = payoff(S[j, NoSteps], K)
  for n in range(NoSteps, 0, -1):
    for j in range(n):
      V[j, n - 1] = max((p * V[j + 1, n] + (1 - p) * V[j, n]) * discount_factor, payoff(S[j, n - 1], K))
  print(f"V: {V[0,0]}")
  return V[0, 0]