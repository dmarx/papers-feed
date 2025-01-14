library(ggplot2)
## regression discontinuity
n = 1000
x = runif(n, 0, 100)
x0 = 50
ylower  = x/100 + rnorm(n, 0, 0.2)
yhigher = x/50 + rnorm(n, 0, 0.2)
y = ifelse(x < x0, ylower, yhigher)

dat_disc = data.frame(factor = "regression discontinuity",
                      x = x,
                      y = y,
                      x0 = x0)
true_disc1 = data.frame(factor = "regression discontinuity",
                       x = seq(0, x0, 0.1),
                       y = seq(0, x0, 0.1)/100)
true_disc2 = data.frame(factor = "regression discontinuity",
                        x = seq(x0, 100, 0.1),
                        y = seq(x0, 100, 0.1)/50)

 

## regression kink
n = 1000
x = runif(n, 0, 100)
x0 = 50
ylower  = x/100 + rnorm(n, 0, 0.2)
yhigher = -0.5 + x/50 + rnorm(n, 0, 0.2)
y = ifelse(x < x0, ylower, yhigher)

dat_kink = data.frame(factor = "regression kink",
                      x = x,
                      y = y,
                      x0 = x0)
true_kink1 = data.frame(factor = "regression kink",
                        x = seq(0, x0, 0.1),
                        y = seq(0, x0, 0.1)/100)
true_kink2 = data.frame(factor = "regression kink",
                        x = seq(x0, 100, 0.1),
                        y = seq(x0, 100, 0.1)/50 - 0.5)

dat_ggplot = rbind(dat_disc, dat_kink)
true1_ggplot = rbind(true_disc1, true_kink1)
true2_ggplot = rbind(true_disc2, true_kink2)


ggplot(dat_ggplot) + 
  geom_point(aes(x = x, y = y), 
             pch = 19, cex = 0.3, col = "grey", alpha = 0.5) +
  geom_line(data = true1_ggplot,  aes(x= x, y = y)) +
  geom_line(data = true2_ggplot,  aes(x= x, y = y)) +
  facet_wrap(~ factor, scales = "free_y") +
  geom_vline(xintercept = x0, linetype = 2, alpha = 0.5) + 
  theme_bw() + 
  theme(panel.grid.major = element_blank(),
        panel.grid.minor = element_blank())
ggsave("regressiondiscontinuitykink_ggplot.pdf", 
       height = 4, width = 6)

