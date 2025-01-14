library("ggplot2")
library("MASS")

my.dnegbin = function(k, mu, theta, log = FALSE)
{
    log.d = lgamma(k+theta) - lgamma(k+1) - lgamma(theta) +
      theta*log(theta/(mu+theta)) + k*log(mu/(mu+theta))
    
    if(log){log.d}else{exp(log.d)}
}

x  = seq(0, 20, 1) 
dat = rbind(data.frame(x = x,
                       y = dpois(x, lambda = 1, log = TRUE),
                       distribution = "Poisson",
                       mu = "mu == 1",
                       theta = "theta == 1"),
            data.frame(x = x,
                       y = my.dnegbin(x, mu = 1, theta = 1, log = TRUE),
                       distribution = "Negbin",
                       mu = "mu == 1",
                       theta = "theta == 1"),
            data.frame(x = x,
                       y = dpois(x, lambda = 1, log = TRUE),
                       distribution = "Poisson",
                       mu = "mu == 1",
                       theta = "theta == 10"),
            data.frame(x = x,
                       y = my.dnegbin(x, mu = 1, theta = 10, log = TRUE),
                       distribution = "Negbin",
                       mu = "mu == 1",
                       theta = "theta == 10"),
            data.frame(x = x,
                       y = dpois(x, lambda = 5, log = TRUE),
                       distribution = "Poisson",
                       mu = "mu == 5",
                       theta = "theta == 1"),
            data.frame(x = x,
                       y = my.dnegbin(x, mu = 5, theta = 1, log = TRUE),
                       distribution = "Negbin",
                       mu = "mu == 5",
                       theta = "theta == 1"),
            data.frame(x = x,
                       y = dpois(x, lambda = 5, log = TRUE),
                       distribution = "Poisson",
                       mu = "mu == 5",
                       theta = "theta == 10"),
            data.frame(x = x,
                       y = my.dnegbin(x, mu = 5, theta = 10, log = TRUE),
                       distribution = "Negbin",
                       mu = "mu == 5",
                       theta = "theta == 10"))
 

ggplot(dat) + 
  geom_point(aes(x=x, y=y, shape = distribution),
             size = 1, alpha = 0.9) + 
  facet_grid(mu ~ theta, scales = "free_y",
             labeller = label_parsed) + 
  theme_bw() + 
  theme(panel.grid.major = element_blank(),
        panel.grid.minor = element_blank(),
        plot.title = element_text(hjust = 0.5)) +
  xlab("y") + ylab("log probability mass function") + 
  ggtitle("comparing Poisson and Negative Binomial")
ggsave("poisson_negbin.pdf", height = 5, width = 8.5)

 