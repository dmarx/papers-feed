# Exclude "Ours---Config E" and "StyleGAN3-R + ADA" for the best fit line calculation
params_linefit_exclude = [param for model, param in zip(models_full_corrected, params_full_corrected) if model not in ["Ours---Config E", "StyleGAN3-R + ADA"]]
fids_linefit_exclude = [fid for model, fid in zip(models_full_corrected, fids_full_corrected) if model not in ["Ours---Config E", "StyleGAN3-R + ADA"]]

# Calculate the best fit line excluding the specified models
slope_exclude, intercept_exclude = np.polyfit(params_linefit_exclude, fids_linefit_exclude, 1)
x_line_exclude = np.linspace(min(params_linefit_exclude), max(params_linefit_exclude), 100)
y_line_exclude = slope_exclude * x_line_exclude + intercept_exclude

# Plot setup with all models shown
plt.figure(figsize=(10, 6))
for model, fid, param, marker in zip(models_full_corrected, fids_full_corrected, params_full_corrected, markers[:len(params_full_corrected)]):
    plt.scatter(param, fid, label=model, s=100, marker=marker)

# Plotting the best fit line that excludes "Ours---Config E" and "StyleGAN3-R + ADA"
plt.plot(x_line_exclude, y_line_exclude, "r--", label='Best Fit Line (excluding "Ours" and StyleGAN3)')

plt.title("Scatterplot of Number of Parameters vs FID-50K on CIFAR10")
plt.xlabel("Number of Parameters (Millions)")
plt.ylabel("FID-50K Score (Lower is Better)")
plt.grid(True)
plt.legend(title="Models")
plt.show()