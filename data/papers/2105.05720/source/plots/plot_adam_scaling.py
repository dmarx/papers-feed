import matplotlib
import matplotlib.pyplot as plt
import numpy as np
import csv

x = []
y = []
with open('../data/DGX-2-Experiments/results-varying-gpus.csv', 'r') as f:
    reader = csv.reader(f)
    for index, row in enumerate(reader):
        if index > 0: # skip header
            data = [float(i) for i in row[0].split()]
            x.append(int(data[0]) * 4)
            y.append((
                data[1] / data[5],
                data[2] / data[6],
                data[3] / data[7],
                data[4] / data[8]
            ))

fig, ax = plt.subplots()
#ax.plot(x, y)
ax.semilogx(x,y,'o-')

ax.set(xlabel='Tensor Size (Bytes)',
       ylabel='Allreduce/fuse(split(ReduceScatter,AllGather))')
ax.grid()

legend = ax.legend(("16 GPUs","8 GPUs","4 GPUs","2 GPUs"), loc='upper left', shadow=True, fontsize='large')

fig.savefig("../figures/varying-gpus.pdf")
#plt.show()
