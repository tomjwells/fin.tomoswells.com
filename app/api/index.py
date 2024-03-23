# add the parent directory to the PYTHONPATH programmatically
import sys
sys.path.append('..')
import time
from flask import Flask, request
from flask_caching import Cache

import pandas as pd
from flask import jsonify, send_file
import yfinance as yf
import io
# import matplotlib
# matplotlib.use('Agg')
# import matplotlib.pyplot as plt
# from matplotlib.ticker import FuncFormatter

from typing import List

from modules.markowitz.main import main
from modules.derivatives.binomial_model import EUPrice, USPrice

app = Flask(__name__)
cache = Cache(app, config={'CACHE_TYPE': 'simple'})
timeout = 600

@app.route("/")
def hello_main():
    return "<p>Hello, World!</p>"
@app.route("/api/python")
def hello_world():
    return "<p>Hello, World!</p>"



# @app.route("/api/markowitz/main")
# def markowitz_main():
#   risk, returns = main(['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META'])

#   # Create a plot
#   plt.figure()
#   plt.plot(risk, returns) # Convert returns to percentage
#   plt.title('Markowitz Portfolio Optimization')
#   plt.xlabel('Risk')
#   plt.ylabel('Return (per annum)')

#   # Format y-ticks to be a percentage
#   formatter = FuncFormatter(lambda y, _: '{:.1%}'.format(y))
#   plt.gca().yaxis.set_major_formatter(formatter)
#   plt.gca().xaxis.set_major_formatter(formatter)

#   # Reduce the plot y-axis range
#   min_risk_index = risk.argmin()
#   min_risk_return_value = returns[min_risk_index]
#   EXTEND_Y_RANGE = 0.025
#   EXTEND_X_RANGE = 0.05
#   plt.ylim(2*min_risk_return_value-returns.max()-EXTEND_Y_RANGE, returns.max()+EXTEND_Y_RANGE)
#   plt.xlim(0, risk[-1]+EXTEND_X_RANGE)

#   # Save the plot to a bytes buffer
#   bytes_image = io.BytesIO()
#   plt.savefig(bytes_image, format='png')
#   bytes_image.seek(0)

#   # Return the plot as a PNG image
#   return send_file(bytes_image, mimetype='image/png')

@app.route("/api/markowitz/stocks")
def markowitz_stocks():
  tickers = pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')[0]
  tickers_list: List[str] = tickers['Symbol'].to_list()
  assert isinstance(tickers_list, list) and all(isinstance(i, str) for i in tickers_list), "tickers_list should be a list of strings"
  return [{"value": ticker, "label": ticker} for ticker in tickers_list]

@app.route("/api/utils/risk-free-rate")
@cache.memoize(timeout=timeout)
def get_risk_free():
  # Get the risk-free rate
  risk_free_rate: float = yf.download("^IRX",progress=False,)['Adj Close'].mean()/100 
  assert isinstance(risk_free_rate, float), "risk_free_rate should be a float"
  return jsonify(risk_free_rate)

@app.route("/api/stock/<ticker>")
def get_stock_price(ticker: str):
    if not isinstance(ticker, str):
        return jsonify({'error': 'Invalid ticker'}), 400
    try:
        stock = yf.Ticker(ticker)
        # print(stock.info)
        price = stock.info['currentPrice']
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({'ticker': ticker, 'price': price})


######### Derivatives

from modules.derivatives.black_scholes import black_scholes
from modules.derivatives.monte_carlo import monte_carlo
from modules.derivatives.binomial_model import EUPrice, USPrice
from datetime import datetime
from typing import Literal

# Route for option-price
@app.route("/api/derivatives/option-price")
def get_option_price():
  option_type = request.args.get('optionType')
  assert option_type in ['european', 'american'], "option_type should be either 'european' or 'american'"
  method = request.args.get('method')
  assert method in ['binomial', 'black-scholes', 'monte-carlo'], "method should be either 'binomial', 'black-scholes', 'monte-carlo'"
  instrument: Literal['call','put'] = request.args.get('instrument')
  assert instrument in ['call', 'put'], "instrument should be either 'call' or 'put'"

  t: datetime =  datetime.now()
  T: datetime = datetime.strptime(request.args.get('T'), '%Y-%m-%d')
  if t > T:
    return jsonify({"error": f"t: {t} should be less than T: {T}"}), 400
  K: float = float(request.args.get('K'))
  assert isinstance(K, (float)), "K should be a float"
  ticker = request.args.get('ticker')
  assert isinstance(ticker, str), "ticker should be a string"
  # ticker = 'GOOG'
  r: float = get_risk_free_rate()
  print(f"r: {r}")
  S_0, sigma = get_stock_data(ticker)

  # Time until expiration
  # print(f"t: {t}, T: {T}")
  tau = (T - t).seconds / 31557600
  # tau = 1
  print(f"tau: {tau}")
  print(f"volatility: {sigma}")

  # print(f"option_type: {option_type}, pricing_method: {pricing_method}, t: {t}, T: {T}, K: {K}, ticker: {ticker}, r: {r}, S_0: {S_0}, sigma: {sigma}")
  print(f"{option_type=}")
  if method == 'binomial':
    if option_type == 'european':
      call_eu = EUPrice(instrument,S_0, sigma, r, K, tau, int(1e3))
      return jsonify(call_eu)
    elif option_type == 'american':
      call_us = USPrice(instrument,S_0, sigma, r, K, tau, int(1e3))
      return jsonify(call_us)


  if method == 'black-scholes':
    if option_type == 'european':
      if instrument == 'call':
        call_bsm = black_scholes('call', S_0, sigma, K, tau,r)
        return jsonify(call_bsm)
      elif instrument == 'put':
        put_bsm = black_scholes('put', S_0, sigma, K, tau,r)
        return jsonify(put_bsm)
    if option_type == 'american':
      return jsonify({"error": "American options are not supported"})
    
  if method == 'monte-carlo':
    num_trials = int(1e3)
    if option_type == 'european':
      if instrument == 'call':
        call_mc = monte_carlo('call', S_0, K, tau,r, sigma, num_trials=num_trials)
        return jsonify(call_mc)
      elif instrument == 'put':
        put_mc = monte_carlo('put', S_0, K, tau, r, sigma, num_trials=num_trials)
        return jsonify(put_mc)
    elif option_type == 'american':
      return jsonify({"error": "American options are not supported yet"})


import concurrent.futures

def download_data(ticker: str):
    return yf.download(ticker, progress=False)['Adj Close']

@cache.memoize(timeout=timeout)
def get_stock_data(ticker: str) -> tuple[float, float]:
  # Get the stock data
  print("ticker: ",ticker)
  stock_data: pd.Series | None = None
  for _ in range(10): 
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future = executor.submit(download_data, ticker)
        try:
            stock_data = future.result(timeout=1)  # Timeout after 1 second
            if stock_data is not None:
                break
        except concurrent.futures.TimeoutError:
            print("yfinance request timed out. Retrying...")
        except Exception as e:
            print(f"An error occurred: {e}. Retrying...")
        time.sleep(1)

  if stock_data is None:
    print("Failed to download stock data after 10 attempts.")
  assert isinstance(stock_data, pd.Series), "stock_data should be a pandas Series"
  returns = stock_data.pct_change()
  meanReturns = returns.mean()
  sigma = returns.std() # Todo
  return stock_data.iloc[-1], sigma


@cache.memoize(timeout=timeout)
def get_risk_free_rate() -> float:
  # Get the risk-free rate
  risk_free_rate: float = yf.download("^IRX",progress=False,)['Adj Close'].mean()/100
  assert isinstance(risk_free_rate, float), "risk_free_rate should be a float"
  return risk_free_rate