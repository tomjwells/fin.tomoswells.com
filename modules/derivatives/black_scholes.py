import math

from typing import Literal


def norm_cdf(x: float) -> float:
  return 0.5*(1 + math.erf(x / math.sqrt(2.0)))


def norm_pdf(x: float) -> float:
  return (1 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x ** 2)


type OptionType = Literal['call', 'put']


class black_scholes_option(object):
  S0: float
  K: float
  tau: float
  r: float
  sigma: float
  d1: float
  d2: float

  def __init__(self, S0: float, K: float, tau: float, r: float, sigma: float):
    """
      Arguments:
        - option_type: OptionType ('call' | 'put')
        - S_0: S_0 = S(t=0), the spot price of the underlying asset at time t=0
        - sigma: The standard deviation of the asset's returns
        - K: K is the strike price
        - tau: tau is the time to maturity, measured in years
        - r: r is the risk-free interest rate
    """
    self.S0 = S0
    self.K = K
    self.tau = tau
    self.r = r
    self.sigma = sigma

    self.d1 = (math.log(S0 / K) + (r + 0.5 * sigma ** 2) * tau) / (sigma * math.sqrt(tau))
    self.d2 = self.d1 - sigma * math.sqrt(tau)

  def value(self, option_type: OptionType) -> float:
    match option_type:
      case 'call':
        return self.S0 * norm_cdf(self.d1) - self.K * norm_cdf(self.d2) * math.exp(-self.r * self.tau)
      case 'put':
        return - self.S0 * norm_cdf(-self.d1) + self.K * norm_cdf(-self.d2) * math.exp(-self.r * self.tau)
      case _:
        raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  def delta(self, option_type: OptionType) -> float:
    match option_type:
      case 'call':
        return norm_cdf(self.d1)
      case 'put':
        return norm_cdf(self.d1) - 1
      case _:
        raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  def gamma(self) -> float:
    return norm_pdf(self.d1) / (self.S0 * self.sigma * math.sqrt(self.tau))

  def theta(self, option_type: OptionType) -> float:
    match option_type:
      case 'call':
        return -self.S0 * norm_pdf(self.d1) * self.sigma / (2 * math.sqrt(self.tau)) - self.r * self.K * math.exp(-self.r * self.tau) * norm_cdf(self.d2)
      case 'put':
        return -self.S0 * norm_pdf(self.d1) * self.sigma / (2 * math.sqrt(self.tau)) + self.r * self.K * math.exp(-self.r * self.tau) * norm_cdf(-self.d2)
      case _:
        raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  def rho(self, option_type: OptionType) -> float:
    match option_type:
      case 'call':
        return self.K * self.tau * math.exp(-self.r * self.tau) * norm_cdf(self.d2)
      case 'put':
        return -self.K * self.tau * math.exp(-self.r * self.tau) * norm_cdf(-self.d2)
      case _:
        raise ValueError("Invalid option type. Choose either 'call' or 'put'")

  def vega(self) -> float:
    return self.S0 * norm_pdf(self.d1) * math.sqrt(self.tau)

  def implied_volatility(self, market_price: float, tolerance: float = 1e-6, max_iterations: int = 10_000) -> float:
    sigma = self.sigma
    for _ in range(max_iterations):
      price = self.value('call')
      diff = price - market_price
      if abs(diff) < tolerance:
        return sigma
      vega = self.vega()
      sigma = sigma - diff/vega
    raise ValueError(f'Implied volatility not found after {max_iterations} iterations')
