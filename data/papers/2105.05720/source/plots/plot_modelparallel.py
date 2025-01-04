import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import csv

x = [1, 2, 4, 8, 16]
X = np.arange(len(x))
width = 0.35
y = []
with open('../data/megatron.csv', 'r') as f:
    reader = csv.reader(f,delimiter=' ',)
    for index, row in enumerate(reader):
        y.append([100.0/ float(i) for i in row])

fig, ax = plt.subplots()
ax.bar(X-width/2, y[0], width=0.33, label='Baseline')
ax.bar(X+width/2, y[1], width=0.33, label='COCONUT')

ax.set_ylabel('Speedup of Model Parallel MegatronLM over 1 GPU')
ax.set_xticks(X)
ax.set_xticklabels(['%iGPUs'%i for i in x])
ax.legend()
ax.grid()

fig.savefig("../figures/megatron.pdf")
