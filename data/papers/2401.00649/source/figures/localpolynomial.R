library("KernSmooth")

n = 500
x = seq(0, 1, length.out = n)
fx= sin(8*x)
y = fx + rnorm(n, 0, 0.5)

pdf("localpolynomialplot.pdf", height = 4, width = 7)
par(mfrow = c(1, 2), mar = c(4, 4, 2, 0.05))
plot(y ~ x, pch = 19, cex = 0.2, col = "grey", bty = "n",
     main = "local linear approximation", font.main = 1)
lines(fx ~ x, lwd = 2, col = "grey")

x0 = 0.4
y0 = sin(8*x0)
segments(x0, -3, x0, y0, lty = 2, col = "grey")
segments(-4, y0, x0, y0, lty = 2, col = "grey")

ylinear = sin(8*x0) + 8*cos(8*x0)*(x - x0)
lines(ylinear ~ x, lty = 2)
abline(v = x0 - 0.05, col = "grey")
abline(v = x0 + 0.05, col = "grey")


plot(y ~ x, pch = 19, cex = 0.2, col = "grey", bty = "n",
     main = "local linear fit", font.main = 1)
lines(fx ~ x, lwd = 2, col = "grey")
h <- dpill(x, y)
locp.fit = locpoly(x, y, bandwidth = h)
lines(locp.fit, lty = 2)
dev.off()
