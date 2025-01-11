import matplotlib.pyplot as plt
import numpy as np

# Data from the table
configs = [
    "StyleGAN2", "Stripped StyleGAN2", "Well-behaved Loss (RpGAN loss)", "Well-behaved Loss (R2 grad penalty)",
    "ConvNeXt-ify pt.1 (ResNet-ify)", "ConvNeXt-ify pt.1 (Output skips)", "ConvNeXt-ify pt.2 (ResNeXt-ify)",
    "ConvNeXt-ify pt.2 (Inverted bottleneck)"
]
fids = np.array([7.516, 12.46, 11.77, 11.71, 10.17, 9.950, 7.507, 7.045])
total_params = np.array([48.768, 42.886, 42.886, 42.886, 46.682, 46.660, 46.279, 46.068])  # G params + D params in millions
markers = ['o', 's', '^', 'p', '*', 'X', 'D', 'v']  # Different shapes for each point

# Fit a line to the data points excluding "ConvNeXt-ify pt.2"
mask = np.array([True] * 6 + [False, False])
z = np.polyfit(total_params[mask], fids[mask], 1)
p = np.poly1d(z)

# Plotting
fig, ax = plt.subplots(figsize=(12, 8))
for i, txt in enumerate(configs):
    ax.scatter(total_params[i], fids[i], label=txt, s=100, marker=markers[i])  # Use different markers

# Add best fit line
xp = np.linspace(42, 50, 100)
ax.plot(xp, p(xp), '-', color='gray')

# Highlight the deviation of "ConvNeXt-ify pt.2"
for i in [6, 7]:
    ax.scatter(total_params[i], fids[i], color='red', marker=markers[i], s=150)  # Highlight points in red with larger size
    ax.plot([total_params[i], total_params[i]], [fids[i], p(total_params[i])], 'r--')  # Dashed line for deviation

ax.set_xlabel('Total Parameters (Millions)', fontsize=14)
ax.set_ylabel('FID (lower is better)', fontsize=14)
ax.set_title('FID vs Total Parameters with Best Fit Line', fontsize=16)
ax.invert_yaxis()
ax.grid(True)
ax.legend(title="Configurations", bbox_to_anchor=(1.05, 1), loc='upper left')
plt.tight_layout()
plt.show()
