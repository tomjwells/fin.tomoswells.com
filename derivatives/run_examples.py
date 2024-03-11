from derivative_valuation import *
from datetime import datetime, timedelta
import yfinance as yf
from tabulate import tabulate
import pandas as pd


def get_risk_free_rate() -> float:
  # Get the risk-free rate
  risk_free_rate: float = yf.download("^IRX",progress=False,)['Adj Close'].mean()/100
  assert isinstance(risk_free_rate, float), "risk_free_rate should be a float"
  return risk_free_rate

def get_stock_data(ticker: str) -> tuple[float, float]:
  # Get the stock data
  stock_data: pd.Series = yf.download(ticker,progress=False,)['Adj Close']
  assert isinstance(stock_data, pd.Series), "stock_data should be a pandas Series"
  returns = stock_data.pct_change()
  meanReturns = returns.mean()
  sigma = returns.std() # Todo

  return stock_data.iloc[-1], sigma

# Init args
t: datetime =  datetime.now()
T: datetime = t + timedelta(days=365)
K: int | float = 133.4
r: float = get_risk_free_rate()

# We will test our functions on the Alphabet stock for a concrete example
ticker = 'GOOG'
S_0, sigma = get_stock_data(ticker)
print(f"Spot price: ${S_0:.2f}, Volatility: {sigma:.2f}%")


# Debug Values
# S_0 = 101.15          #stock price
# K = 98.01           #strike price
# sigma = 0.0991        #volatility (%)
# r = 0.01            #risk-free rate (%)
# T = datetime(2022,3,17)
# t = datetime(2022,1,17)

# 1. Estimate the value of a European call option using the Black-Scholes-Merton model
call_bsm = black_scholes('call', S_0, K, T, t, r, sigma)
put_bsm = black_scholes('put', S_0, K, T, t, r, sigma)
print()
print(
  tabulate(
    [
      ['European call option', call_bsm],
      ['European put option', put_bsm]
    ],
    headers=['Option Type', 'Value']
  )
)

# 2. Estimate the value of a European call option using the Monte Carlo method
num_trials = int(1e5)
call_mc = monte_carlo('call', S_0, K, T, t, r, sigma, num_trials=num_trials)
put_mc = monte_carlo('put', S_0, K, T, t, r, sigma, num_trials=num_trials)
print()
print(
  tabulate(
    [
      ['European call option', call_mc],
      ['European put option', put_mc]
    ],
    headers=['Option Type', 'Value']
  )
)

# num_trials = int(1e6)
# call_mc = monte_carlo('call', S_0, K, T, t, r, sigma, num_trials)
# put_mc = monte_carlo('put', S_0, K, T, t, r, sigma, num_trials)
# print()
# print(
#   tabulate(
#     [
#       ['European call option', call_mc],
#       ['European put option', put_mc]
#     ],
#     headers=['Option Type', 'Value']
#   )
# )

# 3. Calculate Implied Volatility based on the market price of the option
market_price = call_bsm
implied_vol = implied_volatility('call', market_price, S_0, K, T, t, r)
print()
print(
  tabulate(
    [
      ['Implied Volatility', implied_vol]
    ],
    headers=['Metric', 'Value']
  )
)

# 4. Estimate the value of a European call option using the Binomial Tree method
# call_bt = binomial_tree('call', S_0, K, T, t, r, sigma)