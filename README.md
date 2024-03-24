# Financial Mathematics Toolkit

A collection of tools I have produced while studying financial mathematics.

The goal is to produce a collection of demos based on the different models and techniques, which can be tried out and tested at [fin.tomoswells.com](https://fin.tomoswells.com)

# Repository Structure

The repository is split into three directories serving different purposes. Understanding the structure will help you quickly find any code you are interested in:

1. `modules` - Contains the Python functions implementing the financial calculations.
1. `app` - Hosts a Next.js frontend for the application.
2. `api` - A flask server acting as the backend for the application (importing from the `modules` directory).
2. `math` - Contains pdfs explaining any maths I consider "non-obvious" which is implemented in the code.

# Topics

## Options Pricing

Options pricing is implemented using the Black-Scholes model, a monte-carlo model and a binomial tree model. All three methods are applied to pricing European options, and only the binomial model is applied to pricing American options since American options are path dependent.

- **Monte Carlo Simulations**: This method involves running a large number of trials to model the price of an underlying asset, taking into account factors such as volatility and time to expiration. 

- **Implied Volatility**: The Newton-Raphson method is used in conjunction with the Black-Scholes formula to estimate the implied volatility of an asset.

# Running the Project

It is worth noting that many generic tasks have aliases already created for them, in the file `aliases.sh`. 

To make these available in your shell, run
```
source aliases.sh
```

In general these aliased commands can involve changing the directory, so it is best to run them from the root of the project if unsure.

## Flask

To install the Python dependencies, use the alias
```pyenv```
which will set up a new environment using `pip`.

The flask application may be run using
```
runflask
```
which causes it to be accessible on port `8000`.

## Next.js

Bun is used as the package manager. To install dependencies use the alias `i`. To run Next, use the alias `r`.





## Contact
If you have any questions or suggestions, please feel free to get in touch.