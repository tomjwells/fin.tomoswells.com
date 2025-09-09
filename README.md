# Financial Mathematics Toolkit

A collection of tools I have created while studying financial mathematics.

The goal is to produce a collection of interactive demos based of concepts in mathematical finance, which can be tried out and tested at [fin.tomoswells.com](https://fin.tomoswells.com).

# Options Pricing ([link](https://fin.tomoswells.com/derivatives))

The options pricing page applies various pricing techniques to the pricing of European and American options.

See [./modules/derivatives](https://github.com/tomjwells/finance/tree/master/modules/derivatives) for the Python files implementing these algorithms.

The following methods are applied to the pricing of European options:
  - [Black-Scholes analytical solution](https://github.com/tomjwells/finance/blob/master/modules/derivatives/black_scholes.py) 
  - [Monte Carlo simulations](https://github.com/tomjwells/finance/blob/master/modules/derivatives/monte_carlo.py) of geometric Brownian motion
  - [The Binomial Tree method](https://github.com/tomjwells/finance/blob/master/modules/derivatives/binomial_model.py)

The following methods are applied to the pricing of American options:
  - [The Binomial Tree method](https://github.com/tomjwells/finance/blob/master/modules/derivatives/binomial_model.py)


# Modern Portfolio Theory ([link](https://fin.tomoswells.com/markowitz))

The formulae used to find the efficient frontier analytically are derived in [Markowitz_Theory.pdf](https://github.com/tomjwells/fin.tomoswells.com/blob/master/mathematics/Markowitz_Theory.pdf).

Python code implementing that algebra to find the efficient frontier and optimal portfolio weights in Python can be found at [./modules/markowitz/main.py](https://github.com/tomjwells/finance/blob/master/modules/markowitz/main.py).

# Repository Structure

The repository is structured to group related code together.

1. `modules` - Contains the more interesting numerical Python algorithms implementing the financial calculations.
1. `app` - Hosts a Next.js frontend for the application.
1. `api` - A simple fastapi server acting as the backend for the application (importing from the `modules` directory).

# Running the Project

`aliases.sh` contains useful aliases for common tasks. To load these in your shell, run
```
source aliases.sh
```

## fastapi

Python dependencies can be installed using the alias
```
pyenv
```

The fastapi application may be launched using
```
runpy
```
making it accessible on port `8000`.

## Next.js

To install dependencies use the alias `i`. To run the application, use the alias `r`.



# Contact
If you have any questions or suggestions, please feel free to get in touch.
