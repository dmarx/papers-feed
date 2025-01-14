lambda = 2
b0 = seq(-5, 5, 0.01)
Soft = sign(b0)*pmax(0, abs(b0)-lambda)
plot(Soft ~ b0, type = "l",
     xlab = expression(b[0]), 
     ylab = expression(S(b[0],lambda)),
     main = expression(lambda==2))   
grid()
lines(Soft ~ b0, lwd = 2)  