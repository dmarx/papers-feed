fpositive = function(beta, b0, lambda) 0.5*(beta - b0)^2 + lambda*beta
fnegative = function(beta, b0, lambda) 0.5*(beta - b0)^2 - lambda*beta
fwhole    = function(beta, b0, lambda) 0.5*(beta - b0)^2 + lambda*abs(beta) 
 
 
lambda = 2

par(mfrow = c(1,2))
b0 = 3
xx = seq(-1, 3, 0.01)
yy = sapply(xx,
       function(x){
       	   fpositive(x, b0, lambda)
       })
plot(yy[xx>0] ~ xx[xx>0], type = "l", lty = 1,
     xlim = range(xx), ylim = range(yy), 
     xaxt = "n", yaxt = "n",
     xlab = expression(b), ylab = expression(f(b)),
     main = expression(b[0]>=lambda))
lines(yy[xx<0] ~ xx[xx<0], lty = 2)   
axis(1, 0)  
axis(1, 1, expression(b[0]-lambda)) 
 
 
b0 = 1
xx = seq(-5, 3, 0.01)
yy = sapply(xx,
       function(x){
       	   fpositive(x, b0, lambda)
       })
plot(yy[xx>0] ~ xx[xx>0], type = "l", lty = 1,
     xlim = range(xx), ylim = range(yy),
     xaxt = "n", yaxt = "n",
     xlab = expression(b), ylab = expression(f(b)),
     main = expression(b[0]<lambda))
lines(yy[xx<0] ~ xx[xx<0], lty = 2)   
axis(1, 0)  
axis(1, -1, expression(b[0]-lambda)) 


par(mfrow = c(1,2))
b0 = -3
xx = seq(-5, 3, 0.01)
yy = sapply(xx,
       function(x){
       	   fnegative(x, b0, lambda)
       })
plot(yy[xx<0] ~ xx[xx<0], type = "l", lty = 1,
     xlim = range(xx), ylim = range(yy),
     xaxt = "n", yaxt = "n",
     xlab = expression(b), ylab = expression(f(b)),
     main = expression(b[0]<=-lambda))
lines(yy[xx>0] ~ xx[xx>0], lty = 2)   
axis(1, 0)  
axis(1, -1, expression(b[0]+lambda))   
 
 
b0 = -1
xx = seq(-3, 3, 0.01)
yy = sapply(xx,
       function(x){
       	   fnegative(x, b0, lambda)
       })
plot(yy[xx<0] ~ xx[xx<0], type = "l", lty = 1,
     xlim = range(xx), ylim = range(yy),
     xaxt = "n", yaxt = "n",
     xlab = expression(b), ylab = expression(f(b)),
     main = expression(b[0]>-lambda))
lines(yy[xx>0] ~ xx[xx>0], lty = 2)  
axis(1, 0)  
axis(1, 1, expression(b[0]+lambda))   


## plot f(b): three cases
par(mfrow = c(1, 3))
b0 = 3
xx = seq(-3, 5, 0.01)
yy = sapply(xx,
       function(x){
       	   fwhole(x, b0, lambda)
       })
plot(yy ~ xx, type = "l", 
     xlab = expression(b), ylab = expression(f(b)),
     xaxt = "n", yaxt = "n",
     main = expression(b[0]>=lambda), 
     cex.main = 1.5)  
abline(v = 1, lty = 2)     
axis(1, 0)  
axis(1, 1, expression(b[0]-lambda), cex.axis = 1.5)   
       
       
b0 = -3
xx = seq(-5, 3, 0.01)
yy = sapply(xx,
       function(x){
       	   fwhole(x, b0, lambda)
       })
plot(yy ~ xx, type = "l", 
     xlab = expression(b), ylab = expression(f(b)),
     xaxt = "n", yaxt = "n",
     main = expression(b[0]< -lambda), 
     cex.main = 1.5)  
abline(v = -1, lty = 2)           
axis(1, 0)  
axis(1, -1, expression(b[0]+lambda), cex.axis = 1.5)  



b0 = 1
xx = seq(-3, 3, 0.01)
yy = sapply(xx,
       function(x){
       	   fwhole(x, b0, lambda)
       })
plot(yy ~ xx, type = "l", 
     xlab = expression(b), ylab = expression(f(b)),
     xaxt = "n", yaxt = "n",
     main = expression(-lambda<b[0]~phantom()<lambda), 
     cex.main = 1.5)  
abline(v = 0, lty = 2, cex.axis = 1.5)   
axis(1, 0)  





 