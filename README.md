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

The formulae used to find the efficient frontier analytically are derived in [Markowitz_Theory.pdf](https://github.com/tomjwells/finance/blob/master/modules/markowitz/Markowitz_Theory.pdf).

The Python code implementing that algebra to find the efficient frontier and optimal portfolio weights in Python can be found at [./modules/markowitz/main.py](https://github.com/tomjwells/finance/blob/master/modules/markowitz/main.py).

# Running the Project

I have created aliases for common tasks, which are defined in the file `aliases.sh`. 

To load these in your shell, run
```
source aliases.sh
```

## Flask

The necessary Python dependencies can be installed using the alias
```
pyenv
```

The flask application may be launched using
```
runflask
```
making it accessible on port `8000`.

## Next.js

To install dependencies use the alias `i`. To run the application, use the alias `r`.

## Contact
If you have any questions or suggestions, please feel free to get in touch.
