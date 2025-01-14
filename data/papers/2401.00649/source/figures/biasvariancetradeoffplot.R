n = 200
p = 40
beta = c(rep(1, p/4), rep(0, p*3/4))

x.train = matrix(rnorm(n*p), n, p)
y.train = as.vector(x.train%*%beta) + rnorm(n, 0, 3)
data.train = data.frame(x = x.train, y = y.train)
 
 
 
x.test  = matrix(rnorm(n*p), n, p) 
y.test  = as.vector(x.test%*%beta) + rnorm(n, 0, 3)
x.test  = data.frame(x = x.test)

 
 
index      = 1:p
rms.train  = index 
rms.test   = index
for(j in index)
{
	 x.formula    = paste0("x.", 1:j, collapse = "+")
	 reg.formula  = as.formula(paste("y~", x.formula))
	 reg.train    = lm(reg.formula, data = data.train)
	 rms.train[j] = sum((reg.train$residuals)^2)/n
	 
	 pred.test    = predict(reg.train, newdata = x.test)
	 rms.test[j]  = sum((y.test - pred.test)^2)/n
}

pdf("biasvariancetradeoffplot.pdf", height = 5, width = 6)
y.min = min(rms.train, rms.test)
y.max = max(rms.train, rms.test)
plot(rms.train ~ index, 
     ylim = c(y.min, y.max),
     type = "b", pch = 19, cex = 0.5,
     xlab = "# covariates", ylab = "RSS/n",
     font.main = 1,
     main = "prediction errors", bty = "n")
lines(rms.test ~ index, type = "b", pch = 9, cex = 0.5)  
abline(v = 10, lty = 2, col = "grey")   
legend("topright", c("training data", "testing data"), 
       pch = c(19, 9)) 
dev.off()