## problem of population OLS
x = seq(-1, 1, 0.001)
y = x^2
## approximation 1 when x ~ unif(-1,1)
ols1 = rep(1/3, length(x))
## approximation 2 when x ~ unif(0,1)
x2   = seq(0, 1, 0.001)
ols2 = -1/6 + x2
## approximation 3 when x ~ unif(-1,0)
x3   = seq(-1, 0, 0.001)
ols3 = -1/6 - x3

pdf("populationOLS.pdf", height = 5, width = 6)
plot(y ~ x, type = "l",
     xlab = expression(x), ylab = expression(y),
     ylim = c(-1/5, 1), lwd = 3, lty = 2, 
     col = "grey", bty = "n")
lines(ols1 ~ x)     
lines(ols2 ~ x2)
lines(ols3 ~ x3)

text(-0.18, -0.1, expression(F[3]))
text(0.18, -0.1, expression(F[2]))
text(0, 0.38, expression(F[1]))
legend("top", c("true response curve", "best linear approximations"), 
       lty = c(2, 1), lwd = c(3, 1),
       col = c("grey", "black"))
dev.off()       
       