## check functions
uu = seq(-2, 2, 0.001)

par(mfrow = c(1, 3))
tau = 1/3
rho_tau = uu*(tau-(uu<0))
plot(rho_tau ~ uu, type = "l",
     xlab = "", ylab = "", main ="",
     yaxt="n", xaxt = "n", bty="n")  
title( expression(rho[tau](u)), cex.main = 1.5)     
text(2.09, 0, expression(u), cex = 1.5)
arrows(-2, 0, 2, 0, length = 0.1, angle = 15)
arrows(0, -1, 0, 1.38, length = 0.1, angle = 15)
mtext(expression(tau==1/3), 1, line = 2)

tau = 1/2
rho_tau = uu*(tau-(uu<0))
plot(rho_tau ~ uu, type = "l",
     xlab = "", ylab = "", main = "",
     yaxt="n", xaxt = "n", bty="n")  
title( expression(rho[tau](u)), cex.main = 1.5)     
     
text(2.09, 0, expression(u), cex= 1.5)
arrows(-2, 0, 2, 0, length = 0.1, angle = 15)
arrows(0, -1, 0, 1.04, length = 0.1, angle = 15)
mtext(expression(tau==1/2), 1, line = 2)


tau = 2/3
rho_tau = uu*(tau-(uu<0))
plot(rho_tau ~ uu, type = "l",
     xlab = "", ylab = "", main = "",
     yaxt="n", xaxt = "n", bty="n") 
title( expression(rho[tau](u)), cex.main = 1.5)           
text(2.09, 0, expression(u), cex= 1.5)
arrows(-2, 0, 2, 0, length = 0.1, angle = 15)
arrows(0, -1, 0, 1.38, length = 0.1, angle = 15)
mtext(expression(tau==2/3), 1, line = 2)
