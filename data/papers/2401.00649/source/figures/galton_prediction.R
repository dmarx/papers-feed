library("HistData")
## OLS fit by the "lm" function
galton_fit = lm(childHeight ~ midparentHeight,
                data = GaltonFamilies)
## OLS coefficients and inference
summary(galton_fit)$coef
## predictions: confidence and prediction intervals
new_mph  = seq(60, 80, by = 0.5)
new_data = data.frame(midparentHeight = new_mph)
new_ci   = predict(galton_fit, new_data, 
                        interval = "confidence")
new_pi   = predict(galton_fit, new_data, 
                        interval = "prediction")
head(round(new_ci, 2))
head(round(new_pi, 2))
## plots
pdf("galton_prediction.pdf", height = 5, width = 5)
plot(jitter(childHeight) ~ jitter(midparentHeight), 
     data = GaltonFamilies,
     pch = 19, cex = 0.3, col = "grey",
     xlab = "mid-parent height", 
     ylab = "height of child",
     main = "Prediction based on Galton's regression",
     xlim = c(60, 80))
lines(new_ci[, 1] ~ new_mph, lty = 1)
lines(new_ci[, 2] ~ new_mph, lty = 2)
lines(new_ci[, 3] ~ new_mph, lty = 2)
lines(new_pi[, 2] ~ new_mph, lty = 3)
lines(new_pi[, 3] ~ new_mph, lty = 3)
legend("bottomright", 
       c("fitted value", "predict mean", "predict y"),
       lty = c(1, 2, 3))
dev.off()