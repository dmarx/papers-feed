# Deep Unsupervised Learning using Nonequilibrium Thermodynamics

## Abstract

## 

A central problem in machine learning involves modeling complex data-sets using highly flexible families of probability distributions in which learning, sampling, inference, and evaluation are still analytically or computationally tractable. Here, we develop an approach that simultaneously achieves both flexibility and tractability. The essential idea, inspired by non-equilibrium statistical physics, is to systematically and slowly destroy structure in a data distribution through an iterative forward diffusion process. We then learn a reverse diffusion process that restores structure in data, yielding a highly flexible and tractable generative model of the data. This approach allows us to rapidly learn, sample from, and evaluate probabilities in deep generative models with thousands of layers or time steps, as well as to compute conditional and posterior probabilities under the learned model. We additionally release an open source reference implementation of the algorithm.

1. extreme flexibility in model structure, 2. exact sampling,

## Introduction

Historically, probabilistic models suffer from a tradeoff between two conflicting objectives: tractability and flexibility. Models that are tractable can be analytically evaluated and easily fit to data (e.g. a Gaussian or Laplace). However, Proceedings of the 32 nd International Conference on Machine Learning, Lille, France, 2015. JMLR: W&CP volume 37. Copyright 2015 by the author(s).

these models are unable to aptly describe structure in rich datasets. On the other hand, models that are flexible can be molded to fit structure in arbitrary data. For example, we can define models in terms of any (non-negative) function φ(x) yielding the flexible distribution p (x) = φ(x) Z , where Z is a normalization constant. However, computing this normalization constant is generally intractable. Evaluating, training, or drawing samples from such flexible models typically requires a very expensive Monte Carlo process.

A variety of analytic approximations exist which ameliorate, but do not remove, this tradeoff-for instance mean field theory and its expansions [(T, 1982;](#b47)[Tanaka, 1998)](#b48), variational Bayes [(Jordan et al., 1999)](#b22), contrastive divergence [(Welling & Hinton, 2002;](#b54)[Hinton, 2002)](#b16), minimum probability flow [(Sohl-Dickstein et al., 2011b;](#)[a)](#), minimum KL contraction [(Lyu, 2011)](#b31), proper scoring rules [(Gneiting & Raftery, 2007;](#b12)[Parry et al., 2012)](#b36), score matching [(Hyvärinen, 2005)](#b18), pseudolikelihood [(Besag, 1975)](#b4), loopy belief propagation [(Murphy et al., 1999)](#b33), and many, many more. Non-parametric methods [(Gershman & Blei, 2012)](#b11) can also be very effective[foot_0](#foot_0) .

## Diffusion probabilistic models

We present a novel way to define probabilistic models that allows:

3. easy multiplication with other distributions, e.g. in order to compute a posterior, and 4. the model log likelihood, and the probability of individual states, to be cheaply evaluated.

Our method uses a Markov chain to gradually convert one distribution into another, an idea used in non-equilibrium statistical physics [(Jarzynski, 1997)](#b19) and sequential Monte Carlo [(Neal, 2001)](#b34). We build a generative Markov chain which converts a simple known distribution (e.g. a Gaussian) into a target (data) distribution using a diffusion process. Rather than use this Markov chain to approximately evaluate a model which has been otherwise defined, we explicitly define the probabilistic model as the endpoint of the Markov chain. Since each step in the diffusion chain has an analytically evaluable probability, the full chain can also be analytically evaluated.

Learning in this framework involves estimating small perturbations to a diffusion process. Estimating small perturbations is more tractable than explicitly describing the full distribution with a single, non-analytically-normalizable, potential function. Furthermore, since a diffusion process exists for any smooth target distribution, this method can capture data distributions of arbitrary form.

We demonstrate the utility of these diffusion probabilistic models by training high log likelihood models for a twodimensional swiss roll, binary sequence, handwritten digit (MNIST), and several natural image (CIFAR-10, bark, and dead leaves) datasets.

## Relationship to other work

The wake-sleep algorithm [(Hinton, 1995;](#b17)[Dayan et al., 1995)](#b8) introduced the idea of training inference and generative probabilistic models against each other. This approach remained largely unexplored for nearly two decades, though with some exceptions [(Sminchisescu et al., 2006;](#b40)[Kavukcuoglu et al., 2010)](#b23). There has been a recent explosion of work developing this idea. In [(Kingma & Welling, 2013;](#b24)[Gregor et al., 2013;](#b14)[Rezende et al., 2014;](#b37)[Ozair & Bengio, 2014)](#) variational learning and inference algorithms were developed which allow a flexible generative model and posterior distribution over latent variables to be directly trained against each other.

The variational bound in these papers is similar to the one used in our training objective and in the earlier work of [(Sminchisescu et al., 2006)](#b40). However, our motivation and model form are both quite different, and the present work retains the following differences and advantages relative to these techniques:

1. We develop our framework using ideas from physics, quasi-static processes, and annealed importance sampling rather than from variational Bayesian methods.

2. We show how to easily multiply the learned distribution with another probability distribution (eg with a conditional distribution in order to compute a posterior) 3. We address the difficulty that training the inference model can prove particularly challenging in variational inference methods, due to the asymmetry in the objective between the inference and generative models. We restrict the forward (inference) process to a simple functional form, in such a way that the reverse (generative) process will have the same functional form. 4. We train models with thousands of layers (or time steps), rather than only a handful of layers. 5. We provide upper and lower bounds on the entropy production in each layer (or time step)

There are a number of related techniques for training probabilistic models (summarized below) that develop highly flexible forms for generative models, train stochastic trajectories, or learn the reversal of a Bayesian network. Reweighted wake-sleep [(Bornschein & Bengio, 2015)](#b6) develops extensions and improved learning rules for the original wake-sleep algorithm. Generative stochastic networks [(Bengio & Thibodeau-Laufer, 2013;](#b1)[Yao et al., 2014)](#b55) train a Markov kernel to match its equilibrium distribution to the data distribution. Neural autoregressive distribution estimators [(Larochelle & Murray, 2011)](#b27) (and their recurrent [(Uria et al., 2013a)](#) and deep [(Uria et al., 2013b)](#) extensions) decompose a joint distribution into a sequence of tractable conditional distributions over each dimension. Adversarial networks [(Goodfellow et al., 2014)](#b13) train a generative model against a classifier which attempts to distinguish generated samples from true data. A similar objective in [(Schmidhuber, 1992](#b39)) learns a two-way mapping to a representation with marginally independent units. In [(Rippel & Adams, 2013;](#b38)[Dinh et al., 2014)](#b9) bijective deterministic maps are learned to a latent representation with a simple factorial density function. In [(Stuhlmüller et al., 2013)](#b45) stochastic inverses are learned for Bayesian networks. Mixtures of conditional Gaussian scale mixtures (MCGSMs) [(Theis et al., 2012](#b49)) describe a dataset using Gaussian scale mixtures, with parameters which depend on a sequence of causal neighborhoods. There is additionally significant work learning flexible generative mappings from simple latent distributions to data distributions -early examples including [(MacKay, 1995)](#b32) where neural networks are introduced as generative models, and [(Bishop et al., 1998)](#b5) where a stochastic manifold mapping is learned from a latent space to the data space. We will compare experimentally against adversarial networks and MCGSMs.

Related ideas from physics include the Jarzynski equality [(Jarzynski, 1997)](#b19), known in machine learning as An-  T ) . The data distribution (left) undergoes Gaussian diffusion, which gradually transforms it into an identity-covariance Gaussian (right). The middle row shows the corresponding time slices from the trained reverse trajectory p x (0•••T ) . An identity-covariance Gaussian (right) undergoes a Gaussian diffusion process with learned mean and covariance functions, and is gradually transformed back into the data distribution (left). The bottom row shows the drift term, fµ x (t) , t -x (t) , for the same reverse diffusion process.

$t = 0 t = T 2 t = T q x (0•••T ) 2 0 2 2 0 2 2 0 2 2 0 2 2 0 2 2 0 2 p x (0•••T ) 2 0 2 2 0 2 2 0 2 2 0 2 2 0 2 2 0 2 f µ x (t) , t -x (t)$nealed Importance Sampling (AIS) [(Neal, 2001)](#b34), which uses a Markov chain which slowly converts one distribution into another to compute a ratio of normalizing constants. In [(Burda et al., 2014)](#b7) it is shown that AIS can also be performed using the reverse rather than forward trajectory. Langevin dynamics [(Langevin, 1908)](#b26), which are the stochastic realization of the Fokker-Planck equation, show how to define a Gaussian diffusion process which has any target distribution as its equilibrium. In [(Suykens & Vandewalle, 1995)](#b46) the Fokker-Planck equation is used to perform stochastic optimization. Finally, the Kolmogorov forward and backward equations [(Feller, 1949)](#b10) show that for many forward diffusion processes, the reverse diffusion processes can be described using the same functional form.

## Algorithm

Our goal is to define a forward (or inference) diffusion process which converts any complex data distribution into a simple, tractable, distribution, and then learn a finite-time reversal of this diffusion process which defines our generative model distribution (See Figure [1](#fig_0)). We first describe the forward, inference diffusion process. We then show how the reverse, generative diffusion process can be trained and used to evaluate probabilities. We also derive entropy bounds for the reverse process, and show how the learned distributions can be multiplied by any second distribution (e.g. as would be done to compute a posterior when inpainting or denoising an image).

## Forward Trajectory

We label the data distribution q x (0) . The data distribution is gradually converted into a well behaved (analytically tractable) distribution π (y) by repeated application of a Markov diffusion kernel T π (y|y ; β) for π (y), where β is the diffusion rate, π (y) = dy T π (y|y ; β) π (y )

(1)

$q x (t) |x (t-1) = T π x (t) |x (t-1) ; β t .$(2) The forward trajectory, corresponding to starting at the data distribution and performing T steps of diffusion, is thus

$t = 0 t = T 2 t = T p x (0•••T ) 0 5$$q x (0•••T ) = q x (0) T t=1 q x (t) |x (t-1) (3)$For the experiments shown below, q x (t) |x (t-1) corresponds to either Gaussian diffusion into a Gaussian distribution with identity-covariance, or binomial diffusion into an independent binomial distribution. Table [App](#).1 gives the diffusion kernels for both Gaussian and binomial distributions.

## Reverse Trajectory

The generative distribution will be trained to describe the same trajectory, but in reverse,

$p x (T ) = π x (T ) (4) p x (0•••T ) = p x (T ) T t=1 p x (t-1) |x (t) . (5)$For both Gaussian and binomial diffusion, for continuous diffusion (limit of small step size β) the reversal of the diffusion process has the identical functional form as the forward process [(Feller, 1949)](#b10). Since q x (t) |x (t-1) is a Gaussian (binomial) distribution, and if β t is small, then q x (t-1) |x (t) will also be a Gaussian (binomial) distribution. The longer the trajectory the smaller the diffusion rate β can be made.

During learning only the mean and covariance for a Gaussian diffusion kernel, or the bit flip probability for a binomial kernel, need be estimated. As shown in Table [App](#).1, f µ x (t) , t and f Σ x (t) , t are functions defining the mean and covariance of the reverse Markov transitions for a Gaussian, and f b x (t) , t is a function providing the bit flip probability for a binomial distribution. The computational cost of running this algorithm is the cost of these functions, times the number of time-steps. For all results in this paper, multi-layer perceptrons are used to define these functions. A wide range of regression or function fitting techniques would be applicable however, including nonparameteric methods.

## Model Probability

The probability the generative model assigns to the data is

$p x (0) = dx (1•••T ) p x (0•••T ) .(6)$Naively this integral is intractable -but taking a cue from annealed importance sampling and the Jarzynski equality, we instead evaluate the relative probability of the forward and reverse trajectories, averaged over forward trajectories,

$p x (0) = dx (1•••T ) p x (0•••T ) q x (1•••T ) |x (0) q x (1•••T ) |x (0) (7) = dx (1•••T ) q x (1•••T ) |x (0) p x (0•••T ) q x (1•••T ) |x (0) (8) = dx (1•••T ) q x (1•••T ) |x (0) • p x (T ) T t=1 p x (t-1) |x (t) q x (t) |x (t-1) .(9)$This can be evaluated rapidly by averaging over samples from the forward trajectory q x (1•••T ) |x (0) . For infinitesimal β the forward and reverse distribution over trajectories can be made identical (see Section 2.2). If they are identical then only a single sample from q

$x (1•••T ) |x (0)$is required to exactly evaluate the above integral, as can be seen by substitution. This corresponds to the case of a quasi-static process in statistical physics [(Spinney & Ford, 2013;](#b44)[Jarzynski, 2011)](#b20).

## Training

Training amounts to maximizing the model log likelihood,

$L = dx (0) q x (0) log p x (0) (10) = dx (0) q x (0) • log   dx (1•••T ) q x (1•••T ) |x (0) • p x (T ) T t=1 p(x (t-1) |x (t) ) q(x (t) |x (t-1) )   ,(11)$which has a lower bound provided by Jensen's inequality,

$L ≥ dx (0•••T ) q x (0•••T ) • log p x (T ) T t=1 p x (t-1) |x (t) q x (t) |x (t-1) .(12)$As described in Appendix B, for our diffusion trajectories this reduces to,

$L ≥ K (13) K = - T t=2 dx (0) dx (t) q x (0) , x (t) • D KL q x (t-1) |x (t) , x (0) p x (t-1) |x (t) + H q X (T ) |X (0) -H q X (1) |X (0) -H p X (T ) . (14$$)$where the entropies and KL divergences can be analytically computed. The derivation of this bound parallels the derivation of the log likelihood bound in variational Bayesian methods.

As in Section 2.3 if the forward and reverse trajectories are identical, corresponding to a quasi-static process, then the inequality in Equation 13 becomes an equality.

Training consists of finding the reverse Markov transitions which maximize this lower bound on the log likelihood,

$p x (t-1) |x (t) = argmax p(x (t-1) |x (t) ) K. (15$$)$The specific targets of estimation for Gaussian and binomial diffusion are given in Table [App](#).1.

Thus, the task of estimating a probability distribution has been reduced to the task of performing regression on the functions which set the mean and covariance of a sequence of Gaussians (or set the state flip probability for a sequence of Bernoulli trials).

## SETTING THE DIFFUSION RATE β t

The choice of β t in the forward trajectory is important for the performance of the trained model. In AIS, the right schedule of intermediate distributions can greatly improve the accuracy of the log partition function estimate [(Grosse et al., 2013)](#b15). In thermodynamics the schedule taken when moving between equilibrium distributions determines how much free energy is lost [(Spinney & Ford, 2013;](#b44)[Jarzynski, 2011)](#b20).

In the case of Gaussian diffusion, we learn[foot_1](#foot_1) the forward diffusion schedule β 2•••T by gradient ascent on K. The variance β 1 of the first step is fixed to a small constant to prevent overfitting. The dependence of samples from

$q x (1•••T ) |x (0) on β 1•••$T is made explicit by using 'frozen noise' -as in [(Kingma & Welling, 2013)](#b24) the noise is treated as an additional auxiliary variable, and held constant while computing partial derivatives of K with respect to the parameters.

For binomial diffusion, the discrete state space makes gradient ascent with frozen noise impossible. We instead choose the forward diffusion schedule β 1•••T to erase a constant fraction 1 T of the original signal per diffusion step, yielding a diffusion rate of β t = (T -t + 1)

-1 .

## Multiplying Distributions, and Computing Posteriors

Tasks such as computing a posterior in order to do signal denoising or inference of missing values requires multiplication of the model distribution p x (0) with a second distribution, or bounded positive function, r x (0) , producing a new distribution p x (0) ∝ p x (0) r x (0) .

Multiplying distributions is costly and difficult for many techniques, including variational autoencoders, GSNs, NADEs, and most graphical models. However, under a diffusion model it is straightforward, since the second distribution can be treated either as a small perturbation to each step in the diffusion process, or often exactly multiplied into each diffusion step. Figures [3](#) and [5](#fig_3) demonstrate the use of a diffusion model to perform denoising and inpainting of natural images. The following sections describe how to multiply distributions in the context of diffusion probabilistic models.

## MODIFIED MARGINAL DISTRIBUTIONS

First, in order to compute p x (0) , we multiply each of the intermediate distributions by a corresponding function r x (t) . We use a tilde above a distribution or Markov transition to denote that it belongs to a trajectory that has been modified in this way. p x (0•••T ) is the modified reverse trajectory, which starts at the distribution p x (T ) = 1 ZT p x (T ) r x (T ) and proceeds through the sequence of intermediate distributions

$p x (t) = 1 Zt p x (t) r x (t) , (16$$)$where Zt is the normalizing constant for the tth intermediate distribution.

## MODIFIED DIFFUSION STEPS

The Markov kernel p x (t) | x (t+1) for the reverse diffusion process obeys the equilibrium condition

$p x (t = dx (t+1) p x t) | x (t+1) p x t+1) . (17$$)$We wish the perturbed Markov kernel p x (t) | x (t+1) to instead obey the equilibrium condition for the perturbed distribution,

$p x (t) = dx (t+1) p x (t) | x (t+1) p x t+1) ,(18)$$p x (t) r x (t) Zt = dx (t+1) p x (t) | x (t+1) • p x (t+1) r x (t+1) Zt+1 ,(19)$$p x (t) = dx (t+1) p x (t) | x (t+1) • Zt r x (t+1) Zt+1 r x (t) p x (t+1) .(20)$Equation 20 will be satisfied if

$p x (t) |x (t+1) = p x (t) |x (t+1) Zt+1 r x (t) Zt r x (t+1) .(21)$Equation 21 may not correspond to a normalized probability distribution, so we choose p x (t) |x (t+1) to be the corresponding normalized distribution where Zt x (t+1) is the normalization constant.

$p x (t) |x (t+1) = 1 Zt x (t+1) p x (t) |x (t+1) r x (t) ,(22)$For a Gaussian, each diffusion step is typically very sharply peaked relative to r x (t) , due to its small variance. This means that r(x (t) ) r(x (t+1) )

can be treated as a small perturbation to p x (t) |x (t+1) . A small perturbation to a Gaussian effects the mean, but not the normalization constant, so in this case Equations 21 and 22 are equivalent (see Appendix C).

## APPLYING r x (t)

If r x (t) is sufficiently smooth, then it can be treated as a small perturbation to the reverse diffusion kernel p x (t) |x (t+1) . In this case p x (t) |x (t+1) will have an identical functional form to p x (t) |x (t+1) , but with perturbed mean for the Gaussian kernel, or with perturbed flip rate for the binomial kernel. The perturbed diffusion kernels are given in Table [App](#).1, and are derived for the Gaussian in Appendix C.

If r x (t) can be multiplied with a Gaussian (or binomial) distribution in closed form, then it can be directly multiplied with the reverse diffusion kernel p x (t) |x (t+1) in closed form. This applies in the case where r x (t) consists of a delta function for some subset of coordinates, as in the inpainting example in Figure [5](#fig_3).

## CHOOSING r x (t)

Typically, r x (t) should be chosen to change slowly over the course of the trajectory. For the experiments in this paper we chose it to be constant,

$r x (t) = r x (0) . (23$$)$Another convenient choice is r

$x (t) = r x (0)$T -t

T . Under this second choice r x (t) makes no contribution to the starting distribution for the reverse trajectory. This guarantees that drawing the initial sample from p x (T ) for the reverse trajectory remains straightforward.

## Entropy of Reverse Process

Since the forward process is known, we can derive upper and lower bounds on the conditional entropy of each step in the reverse trajectory, and thus on the log likelihood,

$H q X (t) |X (t-1) + H q X (t-1) |X (0) -H q X (t) |X (0) ≤ H q X (t-1) |X (t) ≤ H q X (t) |X (t-1) , (24$$)$where both the upper and lower bounds depend only on q x (1•••T ) |x (0) , and can be analytically computed. The derivation is provided in Appendix A.

## Experiments

We train diffusion probabilistic models on a variety of continuous datasets, and a binary dataset. We then demonstrate sampling from the trained model and inpainting of missing data, and compare model performance against other techniques. In all cases the objective function and gradient were computed using Theano [(Bergstra & Breuleux, 2010)](#b3). Model training was with SFO [(Sohl-Dickstein et al., 2014)](#b43), except for CIFAR-10. CIFAR-10 results used the  [(Lazebnik et al., 2005)](#b28). (b) The same image with the central 100×100 pixel region replaced with isotropic Gaussian noise. This is the initialization p x (T ) for the reverse trajectory. (c) The central 100×100 region has been inpainted using a diffusion probabilistic model trained on images of bark, by sampling from the posterior distribution over the missing region conditioned on the rest of the image. Note the long-range spatial structure, for instance in the crack entering on the left side of the inpainted region. The sample from the posterior was generated as described in Section 2.5, where r x (0) was set to a delta function for known data, and a constant for missing data.

## Dataset

K K -L null Swiss Roll 2.35 bits 6.45 bits Binary Heartbeat -2.414 bits/seq.

12.024 bits/seq. Bark -0.55 bits/pixel 1.5 bits/pixel Dead Leaves 1.489 bits/pixel 3.536 bits/pixel CIFAR-10 3 5.4 ± 0.2 bits/pixel 11.5 ± 0.2 bits/pixel MNIST See table [2](#tab_0) Table [1](#). The lower bound K on the log likelihood, computed on a holdout set, for each of the trained models. See Equation [12](#formula_9). The right column is the improvement relative to an isotropic Gaussian or independent binomial distribution. L null is the log likelihood of π x (0) . All datasets except for Binary Heartbeat were scaled by a constant to give them variance 1 before computing log likelihood.

open source implementation of the algorithm, and RM-Sprop for optimization. The lower bound on the log likelihood provided by our model is reported for all datasets in Table [1](#). A reference implementation of the algorithm utilizing Blocks [(van Merriënboer et al., 2015)](#b53) is available at [https://github.com/Sohl-Dickstein/ Diffusion-Probabilistic-Models](https://github.com/Sohl-Dickstein/Diffusion-Probabilistic-Models).

## Toy Problems

## SWISS ROLL

A diffusion probabilistic model was built of a two dimensional swiss roll distribution, using a radial basis function network to generate f µ x (t) , t and f Σ x (t) , t . As illustrated in Figure [1](#fig_0), the swiss roll distribution was successfully learned. See Appendix Section D.1.1 for more details.  [(Theis et al., 2012)](#b49). MNIST log likelihoods were estimated using the Parzen-window code from [(Goodfellow et al., 2014)](#b13), with values given in bits, and show that our performance is comparable to other recent techniques. The perfect model entry was computed by applying the Parzen code to samples from the training data.

## Model

## BINARY HEARTBEAT DISTRIBUTION

A diffusion probabilistic model was trained on simple binary sequences of length 20, where a 1 occurs every 5th time bin, and the remainder of the bins are 0, using a multilayer perceptron to generate the Bernoulli rates f b x (t) , t of the reverse trajectory. The log likelihood under the true distribution is log 2 1 5 = -2.322 bits per sequence. As can be seen in Figure [2](#) and Table [1](#) learning was nearly perfect. See Appendix Section D.1.2 for more details.

## Images

We trained Gaussian diffusion probabilistic models on several image datasets. The multi-scale convolutional archi-tecture shared by these experiments is described in Appendix Section D.2.1, and illustrated in Figure D.1.

## DATASETS

MNIST In order to allow a direct comparison against previous work on a simple dataset, we trained on MNIST digits [(LeCun & Cortes, 1998)](#b29). Log likelihoods relative to [(Bengio et al., 2012;](#b2)[Bengio & Thibodeau-Laufer, 2013;](#b1)[Goodfellow et al., 2014)](#b13) are given in Table [2](#tab_0). Samples from the MNIST model are given in Appendix Figure App.1. Our training algorithm provides an asymptotically consistent lower bound on the log likelihood. However most previous reported results on continuous MNIST log likelihood rely on Parzen-window based estimates computed from model samples. For this comparison we therefore estimate MNIST log likelihood using the Parzenwindow code released with [(Goodfellow et al., 2014)](#b13).

CIFAR-10 A probabilistic model was fit to the training images for the CIFAR-10 challenge dataset [(Krizhevsky & Hinton, 2009)](#b25). Samples from the trained model are provided in Figure [3](#).

Dead Leaf Images Dead leaf images [(Jeulin, 1997;](#b21)[Lee et al., 2001)](#b30) consist of layered occluding circles, drawn from a power law distribution over scales. They have an analytically tractable structure, but capture many of the statistical complexities of natural images, and therefore provide a compelling test case for natural image models. As illustrated in Table [2](#tab_0) and Figure [4](#fig_2), we achieve state of the art performance on the dead leaves dataset.

Bark Texture Images A probabilistic model was trained on bark texture images (T01-T04) from [(Lazebnik et al., 2005)](#b28). For this dataset we demonstrate that it is straightforward to evaluate or generate from a posterior distribution, by inpainting a large region of missing data using a sample from the model posterior in Figure [5](#fig_3).

## Conclusion

We have introduced a novel algorithm for modeling probability distributions that enables exact sampling and evaluation of probabilities and demonstrated its effectiveness on a variety of toy and real datasets, including challenging natural image datasets. For each of these tests we used a similar basic algorithm, showing that our method can accurately model a wide variety of distributions. Most existing density estimation techniques must sacrifice modeling power in order to stay tractable and efficient, and sampling or evaluation are often extremely expensive. The core of our algorithm consists of estimating the reversal of a Markov diffusion chain which maps data to a noise distribution; as the number of steps is made large, the reversal distribution of each diffusion step becomes simple and easy to estimate. The result is an algorithm that can learn a fit to any data distribution, but which remains tractable to train, exactly sample from, and evaluate, and under which it is straightforward to manipulate conditional and posterior distributions. 

## B.4. Rewrite in terms of KL divergences and entropies

We then recognize that several terms are conditional entropies,

$K = T t=2 dx (0•••T ) q x (0•••T ) log p x (t-1) |x (t) q x (t-1) |x (t) , x (0) + T t=2 H q X (t) |X (0) -H q X (t-1) |X (0) -H p X (T ) (49) = T t=2 dx (0•••T ) q x (0•••T ) log p x (t-1) |x (t) q x (t-1) |x (t) , x (0) + H q X (T ) |X (0) -H q X (1) |X (0) -H p X (T ) . (50$$)$Finally we transform the log ratio of probability distributions into a KL divergence, T ) .

$K = - T t=2 dx (0) dx (t) q x (0) , x (t) D KL q x (t-1) |x (t) , x (0) p x (t-1) |x (t) (51) + H q X (T ) |X (0) -H q X (1) |X (0) -H p X($Note that the entropies can be analytically computed, and the KL divergence can be analytically computed given x (0) and x (t) .

## Gaussian Binomial

Well behaved (analytically tractable) distribution π x (T ) = N x (T ) ; 0, I B x (T ) ; 0.5

$Forward diffusion kernel q x (t) |x (t-1) = N x (t) ; x (t-1) √ 1 -β t , Iβ t B x (t) ; x (t-1) (1 -β t ) + 0.5β t Reverse diffusion kernel p x (t-1) |x (t) = N x (t-1) ; f µ x (t) , t , f Σ x (t) , t B x (t-1) ; f b x (t) , t Training targets f µ x (t) , t , f Σ x (t) , t , β 1•••T f b x (t) , t Forward distribution q x (0•••T ) = q x (0) T t=1 q x (t) |x (t-1) Reverse distribution p x (0•••T ) = π x (T ) T t=1 p x (t-1) |x (t) Log likelihood L = dx (0) q x (0) log p x (0)$Lower bound on log likelihood K = -

$T t=2 E q(x (0) ,x (t) ) D KL q x (t-1) |x (t) , x (0) p x (t-1) |x (t) + H q X (T ) |X (0) -H q X (1) |X (0) -H p X (T )$Perturbed reverse diffusion kernel p x (t-1) |x (t) = N x (t-1) ; f µ x (t) , t + f Σ x (t) , t

$∂ log r x (t-1) ∂x (t-1) x (t-1) =fµ(x (t) ,t) , f Σ x (t) , t B x (t-1) i ; c t-1 i d t-1 i x t-1 i d t-1 i +(1-c t-1 i )(1-d t-1 i ) Table App.1.$The key equations in this paper for the specific cases of Gaussian and binomial diffusion processes. N (u; µ, Σ) is a Gaussian distribution with mean µ and covariance Σ. B (u; r) is the distribution for a single Bernoulli trial, with u = 1 occurring with probability r, and u = 0 occurring with probability 1 -r. Finally, for the perturbed Bernoulli

$trials b t i = x (t-1) (1 -βt) + 0.5βt, c t i = f b x (t+1) , t i ,and$$d t i = r x (t) i = 1$, and the distribution is given for a single bit i.

## D. Experimental Details

D.1. Toy Problems D.1.1. SWISS ROLL A probabilistic model was built of a two dimensional swiss roll distribution. The generative model p x (0•••T ) consisted of 40 time steps of Gaussian diffusion initialized at an identity-covariance Gaussian distribution. A (normalized) radial basis function network with a single hidden layer and 16 hidden units was trained to generate the mean and covariance functions f µ x (t) , t and a diagonal f Σ x (t) , t for the reverse trajectory. The top, readout, layer for each function was learned independently for each time step, but for all other layers weights were shared across all time steps and both functions. The top layer output of f Σ x (t) , t was passed through a sigmoid to restrict it between 0 and 1. As can be seen in Figure [1](#fig_0), the swiss roll distribution was successfully learned.

## D.1.2. BINARY HEARTBEAT DISTRIBUTION

A probabilistic model was trained on simple binary sequences of length 20, where a 1 occurs every 5th time bin, and the remainder of the bins are 0. The generative model consisted of 2000 time steps of binomial diffusion initialized at an independent binomial distribution with the same mean activity as the data (p x (T ) i

= 1 = 0.2). A multilayer perceptron with sigmoid nonlinearities, 20 input units and three hidden layers with 50 units each was trained to generate the Bernoulli rates f b x (t) , t of the reverse trajectory. The top, readout, layer was learned independently for each time step, but for all other layers weights were shared across all time steps. The top layer output was passed through a sigmoid to restrict it between 0 and 1. As can be seen in Figure [2](#), the heartbeat distribution was successfully learned. The log likelihood under the true generating process is log 2 1 5 = -2.322 bits per sequence. As can be seen in Figure [2](#) and Table [1](#) learning was nearly perfect.

## D.2. Images

## D.2.1. ARCHITECTURE

Readout In all cases, a convolutional network was used to produce a vector of outputs y i ∈ R 2J for each image pixel i. The entries in y i are divided into two equal sized subsets, y µ and y Σ .

Temporal Dependence The convolution output y µ is used as per-pixel weighting coefficients in a sum over timedependent "bump" functions, generating an output z µ i ∈ R

for each pixel i,

$z µ i = J j=1 y µ ij g j (t) .(62)$The bump functions consist of

$g j (t) = exp -1 2w 2 (t -τ j ) 2 J k=1 exp -1 2w 2 (t -τ k ) 2 , (63$$)$where τ j ∈ (0, T ) is the bump center, and w is the spacing between bump centers. z Σ is generated in an identical way, but using y Σ .

For all image experiments a number of timesteps T = 1000 was used, except for the bark dataset which used T = 500.

Mean and Variance Finally, these outputs are combined to produce a diffusion mean and variance prediction for each pixel i,

$Σ ii = σ z Σ i + σ -1 (β t ) , (64$$) µ i = (x i -z µ i ) (1 -Σ ii ) + z µ i .(65)$where both Σ and µ are parameterized as a perturbation around the forward diffusion kernel T π x (t) |x (t-1) ; β t , and z µ i is the mean of the equilibrium distribution that would result from applying p x (t-1) |x (t) many times. Σ is restricted to be a diagonal matrix.

## Multi-Scale Convolution

We wish to accomplish goals that are often achieved with pooling networks -specifically, we wish to discover and make use of long-range and multi-scale dependencies in the training data. However, since the network output is a vector of coefficients for every pixel it is important to generate a full resolution rather than down-sampled feature map. We therefore define multi-scale-convolution layers that consist of the following steps:

1. Perform mean pooling to downsample the image to multiple scales. Downsampling is performed in powers of two. 2. Performing convolution at each scale. 3. Upsample all scales to full resolution, and sum the resulting images. 4. Perform a pointwise nonlinear transformation, consisting of a soft relu (log [1 + exp (•)]).

The composition of the first three linear operations resembles convolution by a multiscale convolution kernel, up to blocking artifacts introduced by upsampling. This method of achieving multiscale convolution was described in [(Barron et al., 2013)](#b0).

![Figure 1. The proposed modeling framework trained on 2-d swiss roll data. The top row shows time slices from the forward trajectory q x (0•••T ) . The data distribution (left) undergoes Gaussian diffusion, which gradually transforms it into an identity-covariance Gaus-]()

![Figure2. Binary sequence learning via binomial diffusion. A binomial diffusion model was trained on binary 'heartbeat' data, where a pulse occurs every 5th bin. Generated samples (left) are identical to the training data. The sampling procedure consists of initialization at independent binomial noise (right), which is then transformed into the data distribution by a binomial diffusion process, with trained bit flip probabilities. Each row contains an independent sample. For ease of visualization, all samples have been shifted so that a pulse occurs in the first column. In the raw sequence data, the first pulse is uniformly distributed over the first five bins.]()

![Figure 4. The proposed framework trained on dead leaf images (Jeulin, 1997; Lee et al., 2001). (a) Example training image. (b) A sample from the previous state of the art natural image model (Theis et al., 2012) trained on identical data, reproduced here with permission. (c) A sample generated by the diffusion model. Note that it demonstrates fairly consistent occlusion relationships, displays a multiscale distribution over object sizes, and produces circle-like objects, especially at smaller scales. As shown in Table 2, the diffusion model has the highest log likelihood on the test set.]()

![Figure 5. Inpainting. (a) A bark image from(Lazebnik et al., 2005). (b) The same image with the central 100×100 pixel region replaced with isotropic Gaussian noise. This is the initialization p x (T ) for the reverse trajectory. (c) The central 100×100 region has been inpainted using a diffusion probabilistic model trained on images of bark, by sampling from the posterior distribution over the missing region conditioned on the rest of the image. Note the long-range spatial structure, for instance in the crack entering on the left side of the inpainted region. The sample from the posterior was generated as described in Section 2.5, where r x (0) was set to a delta function for known data, and a constant for missing data.]()

![Figure App.1. Samples from a diffusion probabilistic model trained on MNIST digits. Note that unlike many MNIST sample figures, these are true samples rather than the mean of the Gaussian or binomial distribution from which samples would be drawn.]()

![Log likelihood comparisons to other algorithms. Dead leaves images were evaluated using identical training and test data as in]()

Non-parametric methods can be seen as transitioning smoothly between tractable and flexible models. For instance, a non-parametric Gaussian mixture model will represent a small amount of data using a single Gaussian, but may represent infinite data as a mixture of an infinite number of Gaussians.

Recent experiments suggest that it is just as effective to instead use the same fixed βt schedule as for binomial diffusion.

An earlier version of this paper reported higher log likelihood bounds on CIFAR-10. These were the result of the model learning the 8-bit quantization of pixel values in the CIFAR-10 dataset. The log likelihood bounds reported here are instead for data that has been pre-processed by adding uniform noise to remove pixel quantization, as recommended in[(Theis et al., 2015)](#b50).

