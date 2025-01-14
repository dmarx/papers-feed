
pdf("regressiondiscontinuitykink.pdf", height = 5, width = 8)
par(mfrow = c(1, 2))
## regression discontinuity
n = 1000
x = runif(n, 0, 100)
x0 = 50
ylower  = x/100 + rnorm(n, 0, 0.2)
yhigher = x/50 + rnorm(n, 0, 0.2)
y = ifelse(x < x0, ylower, yhigher)
plot(y ~ x, pch = 19, cex = 0.2, col = "grey", main = "regression discontinuity")
abline(v = x0, lty =2)
lines(I(seq(0,x0, 0.001)/100) ~ I(seq(0,x0, 0.001)))
lines(I(seq(x0, 100, 0.001)/50) ~ I(seq(x0, 100, 0.001)))


## regression kink
n = 1000
x = runif(n, 0, 100)
x0 = 50
ylower  = x/100 + rnorm(n, 0, 0.2)
yhigher = -0.5 + x/50 + rnorm(n, 0, 0.2)
y = ifelse(x < x0, ylower, yhigher)
plot(y ~ x, pch = 19, cex = 0.2, col = "grey", main = "regression kink")
abline(v = x0, lty =2)
lines(I(seq(0,x0, 0.001)/100) ~ I(seq(0,x0, 0.001)))
lines(I(seq(x0, 100, 0.001)/50 - 0.5) ~ I(seq(x0, 100, 0.001)))
dev.off()