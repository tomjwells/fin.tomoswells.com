import numpy as np
from sklearn.linear_model import LinearRegression

# Reference: https://people.math.ethz.ch/~hjfurrer/teaching/LongstaffSchwartzAmericanOptionsLeastSquareMonteCarlo.pdf

def generate_paths(S0: float, r: float, sigma: float, T: float, M: int, I: int):
    dt = T / M
    paths = np.zeros((M + 1, I))
    paths[0] = S0
    for t in range(1, M + 1):
        rand = np.random.standard_normal(I)
        paths[t] = paths[t - 1] * np.exp((r - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * rand)
    return paths

def exercise_value(S: float, K: float):
    return np.maximum(K - S, 0)

def longstaff_schwartz(S0: float, K: float, r: float, sigma: float, T: float, M: int, I: int):
    paths = generate_paths(S0, r, sigma, T, M, I)
    h = np.zeros_like(paths)
    h[-1] = exercise_value(paths[-1], K)
    df = np.exp(-r * T / M)
    for t in range(M - 1, 0, -1):
        regression = LinearRegression()
        in_the_money = paths[t] < K
        X = paths[t][in_the_money].reshape(-1, 1)
        Y = h[t + 1][in_the_money] * df
        regression.fit(X, Y)
        continuation_value = regression.predict(X)
        h[t][in_the_money] = np.where(exercise_value(paths[t][in_the_money], K) > continuation_value,
                                       exercise_value(paths[t][in_the_money], K),
                                       h[t + 1][in_the_money] * df)
        h[t][~in_the_money] = h[t + 1][~in_the_money] * df
    return np.sum(h[1] * df) / I

# Parameters
S0 = 36.  # initial stock price
K = 40.  # strike price
T = 1.0  # time-to-maturity
r = 0.06  # short rate
sigma = 0.2  # volatility
M = 50  # number of time steps
I = 25000  # number of paths

# Run Longstaff-Schwartz
price = longstaff_schwartz(S0, K, r, sigma, T, M, I)
print('American put option price:', price)