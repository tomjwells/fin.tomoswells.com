# Financial Mathematics Toolkit

A collection of tools I have created while studying financial mathematics.

The goal is to produce a collection of interactive demos based of concepts in mathematical finance, which can be tried out and tested at [fin.tomoswells.com](https://fin.tomoswells.com).

# Repository Structure

Each subdirectory of this repository serves a different purpose. Understanding the structure will help you quickly find any code you are interested in:

1. `modules` - Contains the Python functions/algorithms implementing the financial calculations.
1. `app` - Hosts a Next.js frontend for the application.
2. `api` - A flask server acting as the backend for the application (importing from the `modules` directory).

# Options Pricing ([link](https://fin.tomoswells.com/derivatives))

The options pricing page applies various pricing techniques to the pricing of European and American options.

The following methods are applied to the pricing of European options:
  - [Black-Scholes analytical solution](https://github.com/tomjwells/finance/blob/master/modules/derivatives/black_scholes.py) 
  - [Monte Carlo simulations](https://github.com/tomjwells/finance/blob/master/modules/derivatives/monte_carlo.py) of geometric Brownian motion
  - [The Binomial Tree method](https://github.com/tomjwells/finance/blob/master/modules/derivatives/binomial_model.py)

The following methods are applied to the pricing of American options:
  - [The Binomial Tree method](https://github.com/tomjwells/finance/blob/master/modules/derivatives/binomial_model.py)

The user may select an equity from the S&P500, a maturity date and a strike price for the option.

See [./modules/derivatives](https://github.com/tomjwells/finance/tree/master/modules/derivatives) for the Python files implementing these algorithms.


# Modern Portfolio Theory ([link](https://fin.tomoswells.com/markowitz))

Modern Portfolio Theory (MPT) is a model that provides a way of finding the most  *efficient* portfolios given a basked of possible assets. An efficient potfolio in this context, is one that provides the highest possible expected return for a given level of volatility, or "risk".

This tool calculates the efficient frontier of portfolios based on a user-selected basket of equities. The capital market line is plotted and the tangency portfolio for the basket of assets is calculated, along with relevant metrics such as the Sharpe and Sortino ratios. The user may also specify their own parameters for the calculation, such as the risk-free rate, and the number of years to be considered when evaluating the historical mean return and volatility of the asset.

A derivation of the necessary algebra to find the efficient frontier analytically is provided in [Markowitz_Theory.pdf](https://github.com/tomjwells/finance/blob/master/modules/markowitz/Markowitz_Theory.pdf).

The code implementing that algebra to find the efficient frontier and optimal portfolio weights in Python can be found at [./modules/markowitz/main.py](https://github.com/tomjwells/finance/blob/master/modules/markowitz/main.py).

# Running the Project

Commonly run tasks related have aliases created for them, which are defined in the file `aliases.sh`. 

To load these in your shell, run
```
source aliases.sh
```

## Flask

To install the Python dependencies, use the alias
```
pyenv
```
which installs the necessary libraries using `pip` and activates the new environment.

The flask application may be launched using
```
runflask
```
making it accessible on port `8000`.

## Next.js

To install dependencies use the alias `i`. To run the application, use the alias `r`.

## Contact
If you have any questions or suggestions, please feel free to get in touch.