# DPGLM: A Semiparametric Bayesian GLM with Inhomogeneous Normalized Random Measures

## Abstract

## 

We introduce a varying weight dependent Dirichlet process (DDP) model to implement a semi-parametric GLM. The model extends a recently developed semi-parametric generalized linear model (SPGLM) by adding a nonparametric Bayesian prior on the baseline distribution of the GLM. We show that the resulting model takes the form of an inhomogeneous completely random measure that arises from exponential tilting of a normalized completely random measure. Building on familiar posterior simulation methods for mixtures with respect to normalized random measures we introduce posterior simulation in the resulting semi-parametric GLM model. The proposed methodology is validated through a series of simulation studies and is illustrated using data from a speech intelligibility study.

## Introduction

We introduce a non-parametric Bayesian extension of the semi-parametric GLM defined in [Rathouz and Gao [2009]](#b17). Under the proposed model, the marginal distribution of the response, conditional on a given covariate takes the (approximate -to be made more precise later) form of an inhomogeneous normalized random measure (NRM) [[Regazzini et al., 2003](#b18)].

The joint model (across covariates x) is a variation of the popular dependent Dirichlet process (DDP) model [[MacEachern, 2000;](#b11)[Quintana et al., 2022]](#b16), replacing the marginal DP by an exponentially tilted DP with varying weights across covariates. We discuss the model construction, including representations as NRM and DDP models, and characterize the posterior law. Appropriate extensions of the results in [James et al. [2009]](#b6) allow for straightforward posterior simulation. We validate the proposed model with a simulation study and illustrate it with an application on speech intelligibiliy development in children across ages 30 to 96 months.

We build on the semi-parametric GLM introduced in Rathouz and Gao [[2009]](#). Consider a GLM p x (y) ≡ p(y | x) ∝ exp(θ x y)µ(y)

(1)

with continuous response y ∈ Y ⊂ R and a p-dimensional covariate vector x ∈ X and (log)

$normalization constant b(θ x ) = log Y exp(θ x y)µ(dy).(2)$In anticipation of the upcoming discussion, we allow µ(y) to be an un-normalized positive measure, implying a baseline density (i.e., when θ x = 0 in (2)) f µ = µ/µ(Y) in the GLM

(1). While in the classical GLM, the baseline distribution is assumed to be in a parametric family, in the semi-parametric SPGLM model the measure µ(y) itself becomes an unknown parameter. As in the classical GLM, we introduce a linear predictor η = x T β, and a link function g to implicitly define θ by requiring λ ≡ E(y | x) = g -1 (η). That is,

$λ(x) = E(y | x) = b ′ (θ x ) = Y y exp{θ x y -b(θ x )}µ(dy). (3$$)$Noting that, for given µ, b ′ (θ) is a strictly increasing function of θ and invertible we have

$θ x = b ′ -1 (λ; µ) def = θ(β, µ, x).$Here we added µ to the arguments of b ′ -1 to highlight the dependence on µ. Alternatively, when we want to highlight dependence on β and x, indirectly through λ, we write θ x = θ(β, µ, x).

The defining characteristic of the SPGLM is a nonparametric baseline or reference distri-bution f µ that replaces a parametric specification in the classical GLM such as a binomial or Poisson model. Keeping f µ nonparametric instead, the analyst needs to only specify the linear predictor and link function, even avoiding a variance function, leaving model specification less onerous than even with quasilikehood (QL) models, while still yielding a valid likelihood function. Beyond the initial introduction of the SPGLM by [Rathouz and Gao [2009]](#b17), which focused primarily on the finite support case, [Huang [2014]](#b4) characterized the SPGLM in the infinite support case, and [Maronge et al. [2023]](#b13) discussed the use with outcome-dependent or generalized case-control sampling. In [Rathouz and Gao [2009]](#b17) and [Wurm and Rathouz [2018]](#), the SPGLM model is referred to as generalized linear density ratio model (GLDRM),

and Wurm and [Rathouz [2018]](#) fully develop the current ML computational algorithm and, including a working package gldrm on CRAN [Wurm and [Rathouz, 2024]](#). Despite these developments, there are still many important gaps in the literature. These include inference for application-driven functionals of the fitted models such as exceedance probabilities, which are crucial in clinical diagnosis [[Paul et al., 2021]](#b15); natural hazard detection [[Kossin et al., 2020]](#b8); financial risk management [[Taylor and Yu, 2016]](#); conditional quartiles [[Davino et al., 2022]](#) or in general, any decision-making setting. These inference problems are not straightforward to address with maximum likelihood based approaches. In this paper, we set the table to address these gaps by developing a non-parametric Bayesian (BNP) extension of the SPGLM. In this BNP model we introduce µ as an (un-normalized) positive random measure. We use a prior on µ to implicitly define an exponentially tilted DP prior for p x in (1).

In Section 2.1, we introduce the proposed semiparametric Bayesian extension of the SPGLM, and characterize it as a variation of the popular DDP model in Section 2.2, and in Section 2.3 we show a representation of the implied marginal for one covariate as an inhomogeneous NRM. In Section 3 we characterize the posterior distribution under the DPGLM by showing it to be conditionally conjugate given auxiliary variables similar to the construction used in [James et al. [2009]](#b6). Section 4 summarizes a simulation study.

Section 5 discusses an application, and Section 6 concludes with a final discussion.

2 The DPGLM Model 2.1 A Bayesian semiparametric SPGLM

We extend (1)-( [3](#formula_1)) to a Bayesian inference model by adding a prior probability model for all unknown parameters, including in particular the baseline density f µ (•) ≡ µ µ(Y). Prior models for random probability measures like f µ are known as non-parametric Bayesian models (BNP) [[Ghosal and Van der Vaart, 2017]](#b3). The most widely used BNP model is the Dirichlet process (DP) prior introduced in the the seminal work of [Ferguson [1973]](#b1). The DP prior is characterized by two parameters: a concentration parameter α and a base distribution G 0 . We write G ∼ DP(α, G 0 ). One of the many defining properties of the DP is the stick-breaking representation of [Sethuraman [1994]](#b19) for G ∼ DP(α, G 0 ) as

$G(•) ≡ ∞ h=1 s h δ z h (•) (4)$with atoms z h iid ∼ G 0 , and weights

$s h = v h ℓ<h (1 -v ℓ ), where v h iid ∼ Be(1, α).$An alternative defining property of the DP prior is as a normalized completely random measure. A completely random measure (CRM) is a random measure µ with the property that the random measures assigned to any two non-overlapping events A, B are independent, [Kingman, 1967]](#b7). A CRM is characterized by its

$that is µ(A) ⊥ µ(B) when A ∩ B = ∅ [$Laplace transform E[exp{-h(y)µ(dy)}] for any measurable function h, which in turn is completely characterized by the Lévy intensity ν(ds, dy) that appears in the Lévy-Khintchine representation E e -Y h(y)µ(dy) = exp -

$R + ×Y$1 -e -sh(y) ν(ds, dy) .

(5)

If ν factors as ν(s, y) = ρ(s) G 0 (y) the CRM is known as a homogeneous CRM. [Regazzini et al. [2003]](#b18) introduced the wide class of normalized random measures (NRM) by defining a BNP prior for a random probability measure f µ as µ/µ(Y), with a CRM µ. The DP is a special case of NRM, using a normalized gamma CRM with Lévy intensity ν(ds, dy) = e -s s ds • αG 0 (dy) (6)

for a DP (α, G 0 ). We use a gamma CRM as prior model for µ in the SPGLM (1), with base measure G 0 on the support Y and concentration parameter α, implying a DP prior on the baseline density f µ . We add a normal prior on β to complete the prior specification

$µ ∼ Gamma CRM(ν) with ν(ds, dy) = e -s s ds • αG 0 (dy) β ∼ MVN(µ β , Σ β ).(7)$The two lines of (7) jointly imply a prior on F = {p x : x ∈ X }. We add one more extension by adding a convolution with a continuous kernel K(y i | z i ) and a latent variable z i to define a continuous sampling model for y. Using a symmetric kernel K(•), this does not change the mean regression structure of the GLM, as E(

$y i | x i ) = E z i |x i {E(y i | x i , z i )} = g -1 (x ′ i β).$For reference, we state the complete hierarchical model: In the model statement we introduce notation G x (z) for the sampling model p(z | x) for the latent z i (similar to p x for observed y i in (1)).

$y i | z i ∼ K(y i | z i ), conditionally independent of x i , µ, β(8)$$z i | x i = x, µ, β ∼ G x (z i ) ∝ exp(θ x z i )µ(z i ), with b ′ (θ x ) = g -1 (x ′ β) = λ(x) µ ∼ Gamma CRM(ν), with ν(ds, dz) = e -s s ds • αG 0 (dz) β ∼ MVN(µ β , Σ β ) .$Recall that θ x = θ x (β, µ) is a derived parameter. We refer to the proposed model (8) as DPGLM. Also, we refer to µ i = µ(z; θ x i ) ≡ exp(θ x i z)µ(z) as the tilted CRM, with tilting parameter θ x i .

Finally, a note on identifiability in model ( [8](#formula_10)). Consider a pair µ, {θ x ; x ∈ X}, and another one with µ ′ ≡ µ • e cz and {θ ′ x = θ x -c}. All else being equal, the two sets of parameters have identical likelihood. For a meaningful report of inference on µ we will use post-processing to replace µ with µ ≡ µ • e cz , with c to ensure z df µ (z) = m 0 for a fixed m 0 , specified by the analyst. An interesting alternative could be to restrict the prior on µ using a generalized notion of conditioning a DP prior that is introuced in current work by [Lee and Lee [2024]](#b9).

## A varying weights DDP

MacEachern [2000] first introduced the dependent Dirichlet process (DDP) by extending the DP model to a family of random distributions {G x : x ∈ X }. The construction starts by assuming marginally, for each x, a DP prior for each G x = w xh δ m xh . The desired dependence can then be accomplished by using shared w xh = w h and defining a dependent prior for {m xh , x ∈ X} while maintaning independence across h, as required for the marginal DP prior. This defines the common weights DDP. Alternatively one can use common atoms z h with a dependent prior on varying weights {w xh , x ∈ X} (common atoms DDP), or use varying weights and atoms. See, for example, Quintana et al. [2022] for a review of the many different instances of DDP models. A commonly used version are common weights and Gaussian process (GP) priors for {m xh , x ∈ X}, independently across h [MacEachern, 2000].

In the proposed DPGLM approach (8), dependence is introduced naturally through weights w xh (defined below) while keeping atoms z h constant across x. Starting from the representation (4) for a (single) DP prior we define G x (z) as follows:

$G x (z) = exp {θ x z -b(θ x )} µ(z) = exp {θ x z -b(θ x )} ∞ h=1 s h δ z h (z) = ∞ h=1 [exp {θ x z h -b(θ x )} s h ] δ z h (z) = ∞ h=1 w xh δ z h (z), (9$$)$where w xh = exp {θ x z -b(θ x )} s h , depends on x implicitly through θ x . That is, w xh are introduced by exponential tilting of one random measure µ which is shared across all x. The model defines a variation of a DDP model using comon atoms and varying weights. However, the exponential tilting in (9) defines a marginal prior G x beyond a DP model, as we shall discuss next in more detail.

## The marginal model

The implied marginal model G x (z) for given covariate x in (8) can be shown to be an NRM again. This is seen by noting that the Laplace transform of G x takes the form of (5) again, allowing us to recognize the NRM by inspection of the Lévy intensity in (8).

Proposition 1. [Nieto- [Barajas et al., 2004]](#b14) Consider the DPGLM with implied marginal distribution G x (z) ∝ exp(θ x z)µ(z), assuming a gamma CRM (6), i.e., µ µ(Y) = f µ ∼ DP(α, G 0 ), and given θ x . Then G x is an inhomogeneous normalized random measure (NRM) with Lévy intensity,

$ν(ds, dz) = 1 s e -s exp(-θxz) ds • αG 0 (dz)(10)$The Lévy intensity ν in (10) characterizes an inhomogeneous NRM, with ρ(ds | z) =

1 s e -s exp (-θxz) ds varying with z.

The use of the DP prior for f µ makes the result in (10) particularly simple, allowing a closed form expression. A similar result, albeit not necessarily in closed form anymore, is true under any other NRM prior for f µ . For example, [Lijoi et al. [2007]](#b10) argue for the richer class of normalized generalized gamma, which includes the DP as a special case. One common reason to consider alternatives to the DP prior is the lack of flexibility in modeling the random partition implied by ties of a sample from a DP random measure. In more detail, in the context of ( [8](#formula_10)) the discrete nature of µ(•) gives rise to ties among the z i . Using a DP prior, under θ x = 0 the random partition characterized by the configuration of ties is known as the Chinese restaurant process. It is indexed by a single hyperparameter, α. De Blasi et al. [[2013]](#), for example, argue that the nature of this random partition is too restrictive for many applications. However, in the context of the DPGLM, the random partition is not an inference target, and we shall never interpret the corresponding clusters, leaving the DP prior as an analytically and computationally appealing prior choice for µ.

The BNP prior for G x (z) and the kernel in the first two levels of the DPGLM model ( [8](#formula_10)) define a variation of popular BNP mixture models. The use of the particular NRM with Lévy intensity (10) arises naturally in the context of the GLM-style regression with the exponential tilting. Posterior simulation for BNP mixtures with NRM priors on the mixing measure is discussed, for example, in Argiento et al. [[2010]](#), [Barrios et al. [2013]](#) or [Favaro and Teh [2013]](#b0). However, the GLM regression introduces a complication by applying different exponential tilting for each unique covariate x i . This leads to some variations in the posterior characterization and the corresponding posterior simulation algorithms. We next discuss those changes.

## Posterior characterization

$Let D n denote the observed data {x i , y i } n i=1 , with x i ∈ X ⊂ R p and y i ∈ Y ⊂ R, and(8)$adds the latent variables z i . For simplicity we write θ i for θ x i , and define T i as the total mass for the tilted and un-normalized CRM µ i as T i = Y exp(θ i z)µ(dz). We can then adapt the results from Section 2 in [James et al. [2009]](#b6) to characterize the posterior distribution under the DPGLM model ( [8](#formula_10)).

We first introduce a data augmentation scheme with auxiliary variables u i , using one auxiliary variable for each unique covariate vector x i . For the moment we assume n unique covariate vectors (and shall comment later on simple modifications to accommodate the more general case). We define

$u i | T i ≡ T (θ i , µ) ∼ γ i /T i$for independent (across i and also from T i ) exponential random variables γ i , implying p(u i |

$T i ) = Ga(1, T i ) with the parameterization such that E(u i | T i ) = 1/T i .$Recall that as a normalizing constant, T i is a function of all model parameters including µ. We first state the conditional posterior for u = (u 1 , . . . , u n ), conditional on z i , but marginalizing w.r.t. µ

(and thus T i ).

$Proposition 2. Let θ = (θ 1 , . . . , θ n ) and z = (z 1 , . . . , z n ). Then p(u | θ, z) ∝ exp - Y log 1 + n i=1 u i exp(θ i v) G n (dv) ,$where

$G n = αG 0 + n i=1 δ z i .$The proof is implied as part of the proof for the next result. As mentioned, the discrete nature of µ introduces ties in z i . Let {z ⋆ 1 , . . . , z ⋆ k } denote the unique values among the currently imputed {z 1 , . . . , z n }, with multiplicity {n ⋆ 1 , . . . , n ⋆ k }. Then G n in Proposition 2 can be written as

$G n = αG 0 + k ℓ=1 n ⋆ ℓ δ z ⋆ ℓ . Clearly, k ℓ=1 n ⋆ ℓ = n.$Conditional on u and for fixed θ the posterior on µ is a inhomogeneous CRM (but in the following statement, by a slight abuse of notation, we still include θ in the conditioning subset).

Proposition 3. Let θ = (θ 1 , . . . , θ n ), and z = (z 1 , . . . , z n ) with k unique values z ⋆ ℓ , ℓ = 1, . . . , k, with multiplicities n ⋆ ℓ . Then µ includes atoms at the z ⋆ ℓ with random probability masses J ℓ . Letting µ o denote the remaining part of µ we have

$µ | u, z, θ d = µ o + k ℓ=1 J ℓ δ z ⋆ ℓ , where 1. µ o d = CRM (ν o ) with Lévy intensity ν o (ds, dz) = 1 s e -{1+ n i=1 u i exp(θ i z)}s ds • αG 0 (dz). 2. Let ψ(z ⋆ ℓ ; u, θ) = 1 + n i=1 u i exp(θ i z ⋆ ℓ ). Then p (J ℓ | u, θ, z ⋆ ℓ , n ⋆ ℓ ) ∝ s n ⋆ ℓ -1 e -{1+ n i=1 u i exp(θ i z ⋆ ℓ )}s ≡ Ga (n ⋆ ℓ , ψ(z ⋆ ℓ ; u, θ)) . ℓ = 1, . . . , k,$and µ o and J ℓ are independent given u, θ.

Proposition 3 shows that given z and u, and for fixed θ, a posteriori µ is again a CRM.

To be precise, it is a sum of two components. One part is an inhomogeneous CRM µ o = ∞ ℓ=1 J ℓ δ z ℓ with Lévy intensity ν o . The random atoms z ℓ and weights J ℓ can be generated using, for example, the [Ferguson and Klass [1972]](#b2) algorithm. The second component is a finite discrete measure with gamma distributed random weights J ℓ at fixed atoms z ⋆ ℓ . We update the latent variables z i using their complete conditional distribution:

$p(z i | µ, θ i ) ∝ K(y i | z i ) ℓ exp(θ i z i ) Jℓ δ zℓ (z i ), where {z ℓ } ℓ≥1 = {z ℓ } ℓ≥1 ∪ {z ⋆ ℓ } k ℓ=1 and { Jℓ } ℓ≥1 = { Jℓ } ℓ≥1 ∪ {J ℓ } k ℓ=1 .$There is one important detail about Proposition 3. The result holds for fixed θ. However, in (8) we use instead the derived parameter θ x = θ x (µ). This adds more information on µ, indirectly through θ x (µ). Unfortunately, the result of Proposition 3 hinges on independent sampling with given, fixed exponential tilting, and is not easily extended to using θ x (µ). Instead, we exploit Proposition 3 to implement a Metropolis-Hastings (MH) transition probability. Let θ x = θ x (µ) denote the derived parameters θ x = θ x (µ) implied by the currently imputed CRM µ. Let then q(µ ⋆ | µ) denote the inhomogeneous CRM described in Proposition 3 with fixed θ x = θ x (µ). That is, the described distribution on µ ⋆ under fixed θ implied by the currently imputed µ. We then treat µ ⋆ as a proposal in a MH transition probability and follow up with a MH rejection step with acceptance ratio r. See Appendix A.2 for details of evaluating r.

Finally, in the general case with possible ties of the covariate vectors x i , one could still use the same results, with n auxiliary variables u i . Alternatively, the following construction could be used with fewer auxiliary variables. Let ξ j , j = 1, . . . , J denote the unique covariate combinations with multiplicities a j . Let then T j denote the normalization constant under covariate x = ξ j . Similar results as above hold, starting with latent variables u j ∼ Ga(a j , T j ).

We list details of the posterior MCMC simulation in Appendix A.2. Finally, for reporting posterior inference we use post-processing to address lack of likelihood identifiability for f µ .

Recall the note at the end of Section 2.1 about likelihood identifiability of µ. For more meaningful posterior summaries we report inference on f µ subject to y df µ (y) = m 0 for a fixed m 0 . In practice, the choice of m 0 can be based on prior judgement, or alternatively one can use any measure of central tendency of y, such as the mean or median.

## Simulation Studies

We proceed with simulation studies to evaluate the frequentist operating characteristics inference under the DPGLM model. We aim to address the following key questions: (Q1)

How does the model perform in terms of predictive accuracy when estimating the baseline density, f µ (y), or the corresponding cumulative distribution function, F µ (y), under various scenarios? (Q2) Do the credible intervals for f µ (y) achieve coverage rates close to their nominal levels? (Q3) Do the credible intervals for β j attain nominal coverage? How is their predictive accuracy?

We study these questions under realistic sample sizes and simulation truths mimicking the data analysis presented later, in Section 5 using the Speech Intelligibility dataset, with outcomes y ∈ [0, 1].

Data generating mechanism. We consider the following three scenarios. For each setting, we generate covariates X i ∼ Unif(a, b), with a = -√ 12/4 and b = √ 12/4, implying sd(X i ) = 1/2. We use D n to refer to the observed data {x i , y i } n i=1 .

• Null case (scenario I): Let f (kde) µ denote a kernel density estimate based on the response data y from the Speech Intelligibility dataset (ignoring covariates). We use f (kde) µ as the simulation truth for the baseline density f µ . We sample y independent of x i.e,

$y i ∼ f (kde) µ$. This setting aims to address Q1 and Q2.

• Regression (scenario II): We consider the same framework as in setting I, with one modification: The sampling of y now depends on x. Specifically, we sample

$y i ∼ p(y i | x i ) ∝ exp(θ x i y i )f (kde) µ (y i ), where θ x = b ′ -1 {g -1 (η x )}, with η x = β 0 + x T β.$We set β 0 = 0.2 and β 1 = 0.7. This setting aims to address Q1, Q2 and Q3.

In the following discussion, recall that under the DPGLM the baseline density is a derived

$parameter f µ = µ/µ(Y).$For each setting and under sample sizes n = 25, 50, 100, 250, we generate 100 datasets.

For each data set we fit the proposed DPGLM model, using a Unif(z -c, z + c) kernel K with c = 0.025 and the prior distributions as in ( [8](#formula_10)) with α = 1 and G 0 = uniform(0, 1).

We implement MCMC posterior simulation for β and µ using the transition probabilities detailed in A.2; a total of 2, 000 MCMC samples are generated for each data replicate. We discard the first 1, 000 iterations as initial burn-in and use the remaining R = 1, 000 Monte Carlo samples for the results.

To formalize the questions Q1-Q3 we employ the following performance metrics. For (Q1), we use the Kolmogorov-Smirnov (KS) test statistic D n = sup y |F µ,n (y) -F µ (y)| to measure the goodness of fit in estimating F µ (y). In addition, we calculate the mean integrated squared error (MISE) for the estimation of f µ (y), defined as: MISE = ( fµ (y) -f µ (y)) 2 dy. To ensure valid comparisons, we tilt the posterior samples of f µ (y) to have a common reference mean m 0 , which we set as the simulation ground truth. For (Q2), we compute coverage rates of 95% credible intervals for f µ (y) on a grid of y values, and similarly for β j in (Q3).

The credible intervals (CIs) are constructed using symmetric quantiles based on posterior samples. Additionally, we introduce the integrated coverage probability (ICP) for a function h(y), defined as ICP = CP(y) F (dy), where CP(y) denotes the coverage probability for h(y) at the point y. This metric, similar to MISE, assesses overall coverage across the range of y. To quantify frequentist bias (or lack thereof), we report posterior estimates averaged across data replicates. For assessing statistical efficiency in frequentist terms, we calculate root-mean-square error (RMSE) and lengths of credible intervals. Additionally, we compare the β estimates under the DPGLM versus those obtained from a beta probability model using the brms [Bayesian Regression Models using 'Stan'] package [[Bürkner et al., 2024]](#),

facilitating a evaluation of the more flexible semiparametric GLM structure in the DPGLM as compared to this parametric alternative.

Results. Figure [1](#) shows box plots (over 100 repeat simulations) of KS statistics for both the simulation scenarios, for varying sample sizes. The decrease with increasing sample size is evidence for consistency for F µ (y). Figure [2](#) shows Mean Integrated Squared Error   [Gao [2009]](#b17) as the simulation truth may influence these results; a parametric model as the simulation truth might yield more comparable performance between the two approaches.

## Null Case Regression

## Application to Speech Intelligibility Data

We implement inference under the DPGLM for a data set from a speech intelligibility study for typically developing (TD) children from 30 to 96 months of age (see Figure [4](#fig_2)). The  on the dataset, we refer to [Mahr et al. [2020]](#b12) and [Hustad et al. [2021]](#b5).

Multi Word Single Word 36 48 60 72 84 96 36 48 60 72 84 96 25 50 75 100 Age (in months) Observed Speech Intelligibility (in %) We carry out two separate analyses for the SW-and MW-MSI, respectively. In both cases, MSI is the response y i for child i, i = 1, . . . , n. Covariates x i are defined to allow for a non-linear regression of y i on age. We use the basis functions of a 3-df natural cubic spline to model MSI as a function of age. This allows the mean to vary flexibly with age.

We use a logit link in the GLM regression. Next, considering a uniform(z -c, z + c) kernel K with c = 0.025 and the prior distributions as in ( [8](#formula_10)) with α = 1 and G 0 = uniform(0, 1), we fit the proposed DPGLM model for the speech intelligibility study using the MCMC algorithm detailed in A.2, generating a total of 6, 000 MCMC samples. We discard the first 1, 000 iterations as initial burn-in and use the remaining R = 500 Monte Carlo samples, after thinning by a factor of 10, for the following results.

Results. Figure [5](#fig_3) illustrates the quantile regression curves, q α (x), based on the proposed model for single-word and multi-word intelligibility, accompanied by 95% point-wise uncer-tainty intervals. The curves represent various quantiles (α = 5%, 10%, 25%, 50%, 75%, 90%, and 95%) of speech intelligibility as a function of age in months, indicating that intelligibility improves with age. The wider uncertainty intervals at younger ages reflect greater variability, underscoring the model's effectiveness in capturing nuances of speech development and providing valuable insights for pediatric speech-language pathology. Figure [6](#) presents the fitted densities, p(y | x), illustrating the relationship between speech intelligibility (in percentage) as the response variable y and age as the covariate x.

The heatmap shows how these densities vary across ages, with a gradient from white to blue indicating increased p(y | x). This visualization complements the quantile regression analysis from Figure [5](#fig_3) by reinforcing the trend that older children achieve higher intelligibility scores.

Multi Word Single Word 36 48 60 72 84 96 36 48 60 72 84 96 25 50 75 100 Age (in months) Speech Intelligibility (in %) Quantiles 5% 10% 25% 50% 75% 90% 95%  intelligibility y meets or exceeds a threshold y 0 . Figure [8](#) enhances this analysis by incorporating 95% point-wise uncertainty intervals, providing a clearer understanding of variability in exceedance probabilities at different ages. Together, these visualizations underscore developmental trends in speech intelligibility, highlighting that older children are more likely to achieve higher levels of intelligibility. More importantly, for this methodological development, these results show how, once fitted, our Bayesian implementation of the SPGLM can produce inferences on a variety of useful derived model parameters.

## Discussion

We have introduced an extension of the GLM family for continuous response data to a semiparametric model with a BNP prior on the baseline distribution. Using a NRM with

Multi Word Single Word 0 25 50 75 100 0 25 50 75 100 0.00 0.25 0.50 0.75 1.00 Speech Intelligibility (in %) Excceedance Probability Age (in months) 30 60 90 Figure 7: Estimate for exceedance probabilities, p(y ≥ y 0 | x), with speech intelligibility (in percentage) as response y 0 and age (in months) as covariate x. homogeneous Levy intensity as prior model we characterized the posterior distribution using an inhomogeneous NRM. While NRM priors, in particular, the special case of DP priors, are widely used in BNP inference, only few applications naturally give rise to inhomogeneous NRM's. It is interesting to note that this naturally happens with the exponential tilting in the GLM model. One of the limitations of the model is the restricted structure implied by the GLM framework which assumes that the sampling model indexed by different covariates changes only by exponential tilting of the same underlying baseline distribution. While the parsimony of this structure is often desirable, it is also introducing a limitation, by making it more difficult to model certain scenarios. For example, if the sampling model were to include multimodality for extreme values of the covariate, as it might happen for some clinical outcomes, this would be more naturally modeled with more flexible dependent DP models, and difficult to capture with the proposed DPGLM. Multi Word Single Word 0 25 50 75 100 0 25 50 75 100 0.00 0.25 0.50 0.75 1.00 Speech Intelligibility (in %) Excceedance Probability Age (in months) 30 40 50 60 70 80 90 Figure 8: Estimate for exceedance probabilities, p(y ≥ y 0 | x), with 95% point-wise uncertainty intervals for varying ages. Here mean speech intelligibility (in percentage) is considered as response y 0 and age (in months) as covariate x. Several extensions and generalizations of the proposed model could be considered, including extension to multivariate outcomes and for repeated measurements. The latter could include subject specific random effects. For inference with latent variables such as random effects, Bayesian inference is typically more natural and allows easier implementation than, say, maximum likelihood estimation, which can require onerous numerical integration and poses greater challenges in extracting derived parameters, such as marginal (over random effects) trends. Finally, we believe that the Bayesian DPGLM could be an attractive option in data analysis for clinical studies, including planning and sample size arguments for future studies. One particular advantage is the straightforward inference for any desired summary or function of the unknown quantities. One can report inference or plan study designs with focus on any clinically relevant summary, such as exceedance probabilities etc. Taylor, J. W. and Yu, K. (2016). Using auto-regressive logit models to forecast the exceedance probability for financial risk management. Journal of the Royal Statistical Society Series A: Statistics in Society, 179(4):1069-1092. Wurm, M. and Rathouz, P. J. (2024). gldrm: Generalized Linear Density Ratio Models. R package version 1.6. Wurm, M. J. and Rathouz, P. J. (2018). Semiparametric generalized linear models with the gldrm package. The R journal, 10(1):288.

## A Appendix

A.1 Proofs

We include proofs for Propositions 1 through 3. The proof for proposition 1 is summarized from Nieto- [Barajas et al. [2004]](#b14).

Proof of proposition 1. μ is a gamma completely random measure (CRM) with base measure G 0 on support Y and concentration parameter α. This CRM can be expressed

$as μ(•) = ∞ ℓ=1 s ℓ δ z ℓ (•)$with Levy intensity, ν(ds, dz) = e -s s ds • αG 0 (dz). We thus have μ(Y) ∼ Ga(α, 1), and μ μ(Y) := f µ ∼ DP (α, G 0 ). Under DPGLM, the implied marginal G x (z) for a given x: G x (z) ∼ exp(θ x z)µ(z). For given θ x , we can express the exponentially tilted dz) , where g ⋆ (z) = exp(θ x z)g(z). For any measurable function g, we also have g ⋆ measurable. Using the Levy-Khintchine representation for µ, we get E e -Y g ⋆ (z)µ(dz) = exp -R + ×Y 1 -e -sg ⋆ (z) ν(ds, dz) . Using change of variables s → s ⋆ such that s ⋆ = s exp(θ x z), exp -

$CRM as µ ⋆ = exp(θ x z)µ(z) = ∞ ℓ=1 s ⋆ ℓ δ z ℓ , where s ⋆ ℓ = exp (θz ℓ ) s ℓ . Note that E e -Y g(z)μ ⋆ (dz) = E e -Y g ⋆ (z)µ($$R + ×Y 1 -e -sg ⋆ (z) ν(ds, dz) = exp - R + ×Y 1 -e -s ⋆ g(z) e -s ⋆ / exp(θxz) s ⋆ ds ⋆ • αG 0 (dz)$Combining above, we get the Levy-Khintchine representation for µ ⋆ as This further implies that G x is a non-homogeneous normalized random measure (NRM), which completes the proof.

$E e -Y g(z)μ ⋆ (dz) = exp - R + ×Y 1 -e -s ⋆ g(z) ν ⋆ (ds ⋆ , dz) ,$Proof of proposition 3. We start by defining

$T i ≡ T i (Y) = T (θ x i ) = exp{b(θ x i )},$where b(θ x ) is given in (2). For simplicity, we consider the case of no ties in {z i } n i=1 , which is extended to a general case in later part. First consider n disjoint subsets C 1 , . . . , C n of Y, where we take C i := {z ∈ Y : d(z, z i ) < ϵ}, where d is a distance function and C n+1

$= Y \ ∪ n i=1 C i . We next denote T i = T i (C i ) = C i exp(θ x i z)µ(dz). We then have E e -Y h(z)µ(dz) | z 1 ∈ C 1 , . . . , z n ∈ C n = e -Y h(z)µ(dz) n i=1 T i (C i ) T i (Y) p(µ)d(µ) n i=1 T i (C i ) T i (Y) p(µ)d(µ) = E e -Y h(z)µ(dz) n i=1 T i T i E n i=1 T i T i = E µ (N ) E µ (D) . (11$$)$We shall get the Laplace functional for the posterior of µ by pushing ϵ → 0 in (11). Next, we derive an explicit expression for the numerator, where by taking h(z) = 0, we get the denominator. Noting that 1

$T i = R + e -T i u i du i = R + e -Y u i exp(θ i z)µ(dz) du i , we have n i=1 1 T i = R + n n+1 j=1 e -C j n i=1 u i exp(θ i z)µ(dz) du .$We can then write N as

$= n+1 j=1 e -C j h(z)µ(dz) n i=1 T i R + n n+1 j=1 e -C j n i=1 u i exp(θ i z)µ(dz) du = n i=1 T i R + n n+1 j=1 e -C j (h(z)+ n i=1 u i exp(θ i z))µ(dz) du = R + n e -C n+1 (h(z)+ n i=1 u i exp(θ i z))µ(dz) n j=1 - d du j e -C j (h(z)+ n i=1 u i exp(θ i z))µ(dz) du$The last line follows from d du j e

$-C j (h(z)+ n i=1 u i exp(θ i z))µ(dz) = -T j e -C j (h(z)+ n i=1 u i exp(θ i z))µ(dz) .$Using Fubini's theorem and choosing ϵ close enough to 0 such that µ(C j ) is independent over where ∆

⋆(1) u) ρ(ds | z j ), and similarly, C j ∆

$θ j (u, z) = exp(θ j z) R + se -sη ⋆ (z,u) ρ(ds | z). Upon pushing ϵ → 0, we get C j ∆ ⋆(1) θ j (u, z)• αG 0 (dz) → α exp(θ j z j ) R + se -sη ⋆ (z j ,$(1) u) ,

$θ j (u, z) • αG 0 (dz) → α exp(θ j z j ) R + se -sη(z j ,u) ρ(ds | z j ). Next, noting that 1 -e -sη(z,u) = 1 -e -h(z)s e -{ n i=1 u i exp(θ i z)}s + 1 -e -{ n i=1 u i exp(θ i z)}s , we get exp - S 1 -e -sη(z,u) ν(ds, dz) = exp - S 1 -e -h(z)s ν o (ds, dz) • e -ψ($where ν o (ds, dz) = e -η ⋆ (z,u)s ν(ds, dz) and e -ψ(u) = e [-S {1-e -η ⋆ (z,u)s }ν(ds,dz)] . Let z denote (z 1 , . . . , z n ). Plugging everything in (12), we get

$E e -Y h(z)µ(dz) | z, u, θ = R + n E µ o e -Y h(z)µ o (dz) n j=1 E J j e -h(z j )J j D(u)e -ψ(u) du R + n D(u)e -ψ(u) du ,(13)$where

$D(u) = n j=1 R + se -sη ⋆ (z j ,u) ρ(ds | z j ). Writing µ ⋆ = µ | z, u, θ d = µ o + n j=1 J j δ z j , (13$) can be expressed as:

$E e -Y h(z)µ(dz) | z, u, θ = R + n E µ ⋆ e -Y h(z)µ ⋆ (dz) D(u)e -ψ(u) R + n D(u)e -ψ(u) du du,(14)$where µ o d = CRM (ν o ) with Lévy intensity ν o (ds, dz) = e -η ⋆ (z,u)s ν(ds, dz) = 1 s e -(1+ n i=1 u i exp(θ i z))s ds• αG 0 (dz), and

$P J j (s | z, u, θ) ∝ se -sη ⋆ (z j ,u) ρ(ds | z j ) = e -s{1+η ⋆ (z j ,u)} . The discrete na- ture of µ introduces ties in z i . Let {z ⋆ 1 , . . . , z ⋆ k } denote the unique values among the cur- rently imputed {z 1 , . . . , z n }, with multiplicity {n ⋆ 1 , . . . , n ⋆ k }. Then P J ℓ (s | u, θ, z ⋆ ℓ , n ⋆ ℓ ) ∝ s n ⋆ ℓ -1 e -(1+ n i=1 u i exp(θ i z ⋆ ℓ ))s ≡ Ga (n ⋆ ℓ , ψ(z ⋆ ℓ ; u, θ)) , ℓ = 1, . . . , k, where ψ(z ⋆ ℓ ; u, θ) = 1 + n i=1 u i exp(θ i z ⋆ ℓ )$. This completes the proof.

constant is b(θ x , µ) = log exp(θ x z)µ(dz), and θ x = b ′ -1 {λ(x)} is the derived parameter.

Let H denote the CRM finite truncation point in the Ferguson-Klaas algorithm. In the following discussion we use ". . ." in the conditioning set of complete conditional posterior distributions to indicate all other (currently imputed) parameters and the data.

Step where G n = αG 0 + n j=1 δ z j . Let {z ⋆ 1 , . . . , z ⋆ k } denote the unique values among the currently imputed {z 1 , . . . , z n }, with multiplicity {n ⋆ 1 , . . . , n ⋆ k }. Then G n can be written as G n = αG 0 + k ℓ=1 n ⋆ ℓ δ z ⋆ ℓ . Following [Barrios et al. [2013]](#), we generate a proposal using a random walk, u j ∼ Gamma δ, δ u j and follow up with a MH acceptance step. The tuning parameter δ(≥ 1) controls the acceptance rate of the MH step.

Step 3: µ update. Conditional on u and for fixed θ the posterior on µ is a inhomogeneous CRM, as described in Proposition 3. However, θ depends on µ. We therefore can not use the result for a Gibbs sampling transition probability (updating µ by a draw from the complete conditional posterior). Instead we use Proposition 3 to implement a MH transition probability. For the following discussion let π(µ) denote the target posterior distribution of µ. We assume that µ o in Proposition 3 is generated using the Ferguson-Klaas algorithm truncated at a fixed number of H atoms selected by decreasing weights. In that case q as well as the target posterior distribution π(µ) reduce to finite-dimensional distributions with density w.r.t. Lesbegue measure, allowing us to construct a MH transition probability. Let then q(µ ⋆ | µ) denote the inhomogeneous CRM described in Proposition 3. We generate a proposal µ ⋆ ∼ q. In the following expression we will need normalization constants with different combinations of the CRM µ and exponential tilting based on arbitrary θ x , with θ x ̸ = θ x (µ x ), that is, different from the dervived parameter under µ x . We therefore need notation b(θ x , µ) = log Y exp(θ x y)µ(dy) to denote the log normalization constant when CRM µ is used with exponential tilting based on θ x . The proposal µ ⋆ ∼ q is then followed up with a Metropolis-Hastings acceptance step with acceptance ratio s ds αG 0 (dz), where ψ(z) = n i=1 u i exp(θ i z). We write µ o = H h=1 s h δ zh . The random atom locations zh and weights s h are generated using the [Ferguson and Klass [1972]](#b2) algorithm: it first generates the random weights s h in decreasing order. For that, we sample ξ h ∼ standard Poisson process (PP) of unit rate i.e. ξ 1 , ξ 2 -ξ 1 , . . . iid ∼ Exp(1). Then solve for s h = N -1 (ξ h ), with

$N (v) = ν o ([v, ∞], Y) = ∞ v Y ν o (ds, dz) = α ∞ v Y$e -(ψ(z)+1)s s G 0 (dz) ds .

![Figure 1: Kolmogorov-Smirnov (KS) statistic values in estimating the baseline CDF, F µ (y), for both the scenarios given in the text. 100 simulation replicates.]()

![Figure 3: (Left panel) Pointwise coverage probabilities for F µ (y), on a grid of y values, for varying sample sizes, under simulation scenario II. (Top right panel) The true baseline cumulative distribution function (CDF) F µ along with the corresponding posterior estimates, averaged over 100 data replicates. (Bottom right panel) The same plot presented on a logarithmic scale for better visualization.]()

![Figure 4: Observed data. Mean speech intelligibility (in percentage) for single-word (SW, right panel) and multi-word (MW, left panel) utterances, with age (in months) as a predictor.]()

![Figure 5: Quantile growth curves (solid lines) based on DPGLM model for multi-word (left panel) and single-word (right panel) intelligibility, with 95% point-wise uncertainty intervals (shaded ribbon).]()

![Figure 7 displays estimates for exceedance probabilities, p(y ≥ y 0 | x), across varying ages x (color shades) and thresholds y 0 (horizontal axis), indicating the likelihood that speech]()

![with the Levy intensity ν ⋆ (ds, dz) = e -s/ exp(θxz)s ds•αG 0 (dz) = ρ ⋆ (ds | z)•αG 0 (dz). Here ρ ⋆ (ds | z) = e -s/ exp(θxz)s ds depends on atom location z, which characterizes a non-homogeneous CRM.]()

![1: β update. The complete conditional for β is π(β | µ, . . .), withlog π(β | µ, . . .) = n i=1 {θ i z i -b(θ i , µ) + log µ(z i )} + log p(β),where p(β) ≡ Normal(µ β , Σ β ) is the β prior. We update β by first obtaining the posterior mode, β ⋆ = arg max β log π(β | µ, . . .), and using the proposalβ ∼ Normal(β ⋆ , Σ ⋆ )1 A β , where Σ ⋆ = n i=1 x i x T i (g ′ (λ i )) 2 b ′′ (θ i ) -1is the inverse Fisher information at (β ⋆ , µ) and A = {β ∈ R p : λ i ∈ Y, for all i}. The proposal is then accepted or rejected via a Metropolis-Hastings (MH) step.Step 2: u update. The complete conditional for u is p(u | µ, . . .) ∝ exp -(θ i v) G n (dv) ,]()

![i -θ i )z i -b(θ ⋆ i , µ ⋆ ) + b(θ i , µ) -b(θ ⋆ i , µ) + b(θ i , µ ⋆ )},where θ ⋆ i = θ x i (β, µ ⋆ ) and accept the proposal with probability r ∧ 1. See section A.2.1 for a derivation of r. The details of generating µ ⋆ ∼ q are as follows. In Proposition 3, for fixedθ we generate [µ | u, . . .] d = µ o + k ℓ=1 J ℓ δ z ⋆ ℓ , where(a) µ o ∼ CRM (ν o ) with ν o (ds, dz) = e -(ψ(z)+1)s]()

![Integrated coverage probability (ICP) for F µ across various sample sizes under simulation scenario II given in the text. 100 simulation replicates.]()

![Comparison of β estimates across various sample sizes under simulation scenario II given in the text. 100 simulation replicates for the Proposed DPGLM approach and the Beta probability model using the brms package. 100 simulation replicates.]()

