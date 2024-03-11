# Derivatives Valuation Model

This toolkit provides a comprehensive suite of tools to price derivatives, specifically European options. The toolkit uses Monte Carlo simulations and the risk-neutral pricing method to accurately estimate option prices.
## Structure

Currently, all function definitions are implemented in the file `derivative_valuation.py`.

The file `run_examples.py` contains examples of pricing a European option using the Black-Scholes formula, Monte Carlo, and calculating the implied volatility.

## Features

- **Monte Carlo Simulations**: This method involves running a large number of trials to model the price of an underlying asset, taking into account factors such as volatility and time to expiration. 

- **Risk-Neutral Pricing**: This is a method used to price derivatives when the risk-free rate is known. It assumes that the expected return of the underlying asset is the risk-free rate.

- **European Options**: The toolkit can price both European options, which can only be exercised at expiration

- **Implied Volatility**: The Newton-Raphson method is used in conjunction with the Black-Scholes formula to estimate the implied volatility of an asset.

## Installation

All Python dependencies can be readily installed with:

```bash
pip install -r requirements.txt
```






## Contact
If you have any questions or suggestions, please feel free to get in touch.