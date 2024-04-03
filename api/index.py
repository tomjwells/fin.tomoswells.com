# add the parent directory to the PYTHONPATH programmatically
import os
import sys
sys.path.append('..')
import gzip
import json
import time
from typing import List
from flask import Flask, request
from flask_caching import Cache

import pandas as pd
import numpy as np  
from flask import jsonify, make_response
import yfinance as yf


from modules.markowitz.main import main
from modules.derivatives.binomial_model import EUPrice, USPrice

app = Flask(__name__)
app.config["CACHE_REDIS_URL"] = os.environ.get("KV_URL").replace("redis://", "rediss://")
cache = Cache(app, config={'CACHE_TYPE': 'RedisCache'})
timeout = 7*24*60*60

@app.route("/")
def hello_main():
  return "<p>Hello, World!</p>"

######### Markowitz

@app.route("/api/markowitz/main")
def markowitz_main():
  assets: List[str]=request.args.getlist('assets')
  startYear: int = int(request.args.get('startYear'))
  endYear: int = int(request.args.get('endYear'))
  assert isinstance(assets, list), "assets should be a list"
  assert isinstance(startYear, int), "startYear should be a int"
  assert isinstance(endYear, int), "endYear should be a int"
  result = main(assets, startYear, endYear)
  # Compress the response to enable larger payload
  content = gzip.compress(json.dumps(result).encode('utf8'), 5)
  response = make_response(content)
  response.headers['Content-length'] = str(len(content))
  response.headers['Content-Encoding'] = 'gzip'
  return response

@app.route("/api/markowitz/stocks")
@cache.memoize(timeout=timeout)
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
  tau = (T - t).total_seconds() / 31557600
  K: float = float(request.args.get('K'))
  assert isinstance(K, (float)), "K should be a float"
  ticker = request.args.get('ticker')
  assert isinstance(ticker, str), "ticker should be a string"
  r: float = get_risk_free_rate()
  S_0, sigma = get_stock_data(ticker)

  print("S_0: ",S_0, "sigma: ",sigma, "r: ",r, "K: ",K, "tau: ",tau, "method: ",method, "option_type: ",option_type, "instrument: ",instrument)

  if method == 'binomial':
    if option_type == 'european':
      return jsonify(EUPrice(instrument, S_0, sigma, r, K, tau, int(1e3)))
    elif option_type == 'american':
      return jsonify(USPrice(instrument, S_0, sigma, r, K, tau, int(1e3)))

  if method == 'black-scholes':
    if option_type == 'european':
      return jsonify(black_scholes(instrument, S_0, sigma, K, tau,r))
    if option_type == 'american':
      return jsonify({"error": "American options are not supported"})
    
  if method == 'monte-carlo':
    num_trials = int(1e3)
    if option_type == 'european':
      return jsonify(monte_carlo(instrument, S_0, K, tau,r, sigma, num_trials=num_trials))
    elif option_type == 'american':
      return jsonify({"error": "American options are not supported yet"})


import concurrent.futures

def download_data(ticker: str):
    return yf.download(ticker, progress=False)['Adj Close']

# @cache.memoize(timeout=timeout)
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
  sigma = returns.std()
  return stock_data.iloc[-1], np.sqrt(365) * sigma


@cache.memoize(timeout=timeout)
def get_risk_free_rate() -> float:
  # Get the risk-free rate
  risk_free_rate: float = yf.download("^IRX",progress=False,)['Adj Close'].mean()/100
  assert isinstance(risk_free_rate, float), "risk_free_rate should be a float"
  return risk_free_rate