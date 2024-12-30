
\chapter{Pretraining}
\label{ch:tools}

\epigraph{My strongest memory of the class is the very beginning, when he started, not with some deep principle of nature, or some experiment, but with a review of Gaussian integrals. Clearly, there was some calculating to be done.}{Joe Polchinski, reminiscing about Richard Feynman's\index{Feynman, Richard} quantum mechanics class \cite{Polchinski:2017vik}.\index{Polchinski, Joseph}}


\noindent{}The goal of this book is to develop principles that enable a theoretical understanding of deep learning.
Perhaps the most important principle is that wide and deep neural networks are governed by nearly-Gaussian distributions.\index{nearly-Gaussian distribution}\index{perturbation theory}
Thus, to make it through the book, you will need to achieve mastery of Gaussian integration and perturbation theory.
Our \neo{pretraining} in this chapter consists of whirlwind introductions to these  toolkits as well as a brief overview of some key concepts in statistics that we'll need.
The only prerequisite is fluency in linear algebra, multivariable calculus, and rudimentary probability theory.\index{probability (branch of mathematics)}\index{probability (branch of mathematics)|seealso{frequentist probability}}\index{probability (branch of mathematics)|seealso{Bayesian probability}}

With that in mind, we begin in \S\ref{sec:Gauss} with an extended discussion of
Gaussian integrals. Our emphasis will be on calculational tools for computing averages of monomials against Gaussian distributions, culminating in a derivation of \neo{Wick's theorem}.

Next, in~\S\ref{sec:not-Gauss}, we begin by giving a general discussion of \emph{expectation values}\index{expectation value} and \emph{observables}\index{observable}. 
Thinking of observables as a way of learning about a \terminate{probability distribution} through repeated experiments, we're led to the statistical concepts of moment and cumulant and the corresponding physicists' concepts of 
full $M$-point correlator and connected $M$-point correlator. 
A particular emphasis is placed on the connected correlators as they directly characterize a distribution's deviation from Gaussianity.

In~\S\ref{sec:perturbation}, we introduce the negative log probability or \neo{action} representation of a \terminate{probability distribution} and explain how the action lets us systematically deform Gaussian distributions in order to give a compact representation of non-Gaussian distributions. In particular, we specialize to nearly-Gaussian distributions, for which deviations from Gaussianity are implemented by small \emph{couplings}\index{coupling} in the action, and show how perturbation theory can be used to connect the non-Gaussian couplings to observables such as the connected correlators.
By treating such couplings perturbatively, we can transform any correlator of a nearly-Gaussian distribution into a sum of
Gaussian integrals; each integral can then be evaluated by the tools we developed in~\S\ref{sec:Gauss}.
This will be one of our most important tricks, as the neural networks we'll study are all governed by nearly-Gaussian distributions, with non-Gaussian couplings that become perturbatively small as the networks become wide.

Since all these manipulations need to be on our fingertips, in this first chapter we've erred on the side of being verbose -- in words and equations and examples -- 
with the goal of making these materials as transparent and comprehensible as possible.









\section{Gaussian Integrals}\label{sec:Gauss}
\index{probability distribution}\index{Gaussian distribution}
The goal of this section is to introduce Gaussian integrals and Gaussian probability distributions, and ultimately derive Wick's theorem~\eqref{eq:Wick-multi}. This theorem provides an operational formula for computing any moment of a multivariable Gaussian distribution, and will be used throughout the book.



\subsubsection{Single-variable Gaussian integrals}
Let's take it slow and start with the simplest single-variable \terminate{Gaussian function}, %
\be\label{eq:Gaussian-function-single-variable}
e^{-\frac{z^2}{2}}\, .
\ee
The graph of this function depicts the famous \neo{bell curve}\index{bell curve|seealso{Gaussian function}}, symmetric around the peak at $z=0$ and quickly tapering off for large $\vert z \vert\gg1$. By itself, \eqref{eq:Gaussian-function-single-variable} cannot serve as a \terminate{probability distribution} since it's not normalized. In order to find out the proper normalization, we need to perform the \terminate{Gaussian integral}
\be\label{eq:single-variable-gaussian}
\GI{1} \equiv \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2}}\, .
\ee

As an ancient object, there exists a neat trick to evaluate such an integral. To begin, consider its square
\be
\GI{1}^2 = \le(\int_{-\infty}^{\infty}  d z\ e^{-\frac{z^2}{2}}\ri)^2=\int_{-\infty}^{\infty}  d x\ e^{-\frac{x^2}{2}}\int_{-\infty}^{\infty}  d y\ e^{-\frac{y^2}{2}}=\int_{-\infty}^{\infty}  \int_{-\infty}^{\infty}  d x d y\ e^{-\frac{1}{2}\le(x^2+y^2\ri)}\,  ,
\ee
where in the middle we just changed the names of the dummy integration variables. Next, we change variables to polar coordinates $(x,y)= (r \cos \phi,r \sin \phi )$, 
which transforms the integral measure as $dx dy = r d r d\phi$ and gives us two elementary integrals to compute:
\begin{align}
\GI{1}^2 = \int_{-\infty}^{\infty}  \int_{-\infty}^{\infty}  d x d y\ e^{-\frac{1}{2}\le(x^2+y^2\ri)}=&\int_{0}^{\infty} r d r \int_{0}^{2\pi} d \phi\ e^{-\frac{r^2}{2}}\, \\
=&2\pi \int_{0}^{\infty} d r \ r e^{-\frac{r^2}{2}}=2\pi \le\vert -e^{-\frac{r^2}{2}}\ri\vert_{r=0}^{r=\infty}=2\pi \,. \nonumber
\end{align}
Finally, by taking a square root we can evaluate the Gaussian integral \eqref{eq:single-variable-gaussian} as
\be
\GI{1} = \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2}}=\sqrt{2\pi}\, .
\ee
Dividing the Gaussian function with this normalization factor, we define the \textbf{Gaussian probability distribution}\index{Gaussian distribution!single-variable} with unit variance as
\be
p\!\le(z\ri)\equiv\frac{1}{\sqrt{2\pi}}e^{-\frac{z^2}{2}}\, ,
\ee
which is now properly normalized, i.e., $\int_{-\infty}^{\infty} d z\, p\!\le(z\ri)=1$. Such a distribution with zero mean and unit variance is sometimes called the \emph{standard normal distribution}.\index{Gaussian distribution!normal distribution, standard}\index{normal distribution|see{Gaussian distribution}}


Extending this result to a Gaussian distribution with \term{variance}\index{variance|seealso{cumulant}} $\ker>0$ is super-easy. The corresponding \terminate{normalization factor}\index{normalization factor|seealso{partition function}} is given by 
\be\label{eq:single_Gauss}
\GI{\ker}\equiv  \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}}=\sqrt{\ker}\int_{-\infty}^{\infty} d u\ e^{-\frac{u^2}{2}}=\sqrt{2\pi \ker}\, ,
\ee
where in the middle we rescaled the integration variable as $u=z/\sqrt{\ker}$. We can then define the Gaussian distribution with variance $\ker$ as
\be\label{eq:single_Gauss_with_mean}
p\!\le(z\ri)\equiv\frac{1}{\sqrt{2\pi\ker}}e^{-\frac{z^2}{2\ker}}\, .
\ee
The graph of this distribution again depicts a \terminate{bell curve} symmetric around $z=0$, but it's now equipped with a scale $\ker$ characterizing its broadness, tapering off for $\vert z \vert\gg\sqrt{\ker}$.
More generally, we can shift the center of the bell curve as
\be\label{eq:Gaussian-with-mean}
p\!\le(z\ri)\equiv\frac{1}{\sqrt{2\pi\ker}}e^{-\frac{\le(z-s\ri)^2}{2\ker}}\, ,
\ee
so that it is now symmetric around $z=s$.
This center value $s$ is called the \textbf{mean}\index{mean}\index{mean|seealso{moment}}\index{mean|seealso{cumulant}} of the distribution, because it is:
\begin{align}
\E{z}\equiv \int_{-\infty}^{\infty} d z\ p\!\le(z\ri) z=&\frac{1}{\sqrt{2\pi\ker}} \int_{-\infty}^{\infty}d z\  e^{-\frac{\le(z-s\ri)^2}{2\ker}} z\, \\
=&\frac{1}{\GI{\ker}} \int_{-\infty}^{\infty}d w\ e^{-\frac{w^2}{2\ker}} \le(s+w\ri)\, \nonumber\\
=&\frac{s\GI{\ker}}{\GI{\ker}}+\frac{1}{\GI{\ker}}  \int_{-\infty}^{\infty}d w \le(e^{-\frac{w^2}{2\ker}}w\ri)\, \nonumber\\
=&s\, ,\nonumber
\end{align}
where in the middle we shifted the variable as $w=z-s$ and in the very last step noticed that the integrand of the second term is odd with respect to the sign flip  of the integration variable $w\leftrightarrow -w$ and hence integrates to zero.


Focusing on Gaussian distributions with zero mean, let's consider other \textbf{expectation values}\index{expectation value|textbf} for general functions $\mathcal{O}\!\le(z\ri)$, i.e.,
\be
\E{\mathcal{O}\!\le(z\ri)}\equiv \int_{-\infty}^{\infty} d z\ p\!\le(z\ri) \mathcal{O}\!\le(z\ri)= \frac{1}{\sqrt{2\pi\ker}}\int_{-\infty}^{\infty}d z\  e^{-\frac{z^2}{2\ker}} \mathcal{O}\!\le(z\ri)\, .
\ee
We'll often refer to such functions $\mathcal{O}\!\le(z\ri)$ as \textbf{observables}\index{observable|textbf}, since they can correspond to measurement outcomes of experiments.
A special class of expectation values are called \textbf{moments}\index{moment|textbf}\index{moment|seealso{full correlator}} 
and correspond to the insertion of $z^M$ into the integrand for any integer $M$:
\be
\E{z^{M}}=\frac{1}{\sqrt{2\pi\ker}} \int_{-\infty}^{\infty}d z\  e^{-\frac{z^2}{2\ker}} z^{M}\, .
\ee
Note that the integral vanishes for any odd exponent $M$, because then the integrand is odd with respect to the sign flip $z\leftrightarrow -z$. As for the even number $M=2m$ of $z$ insertions, we will need to evaluate integrals of the form
\be\label{eq:single-variable-z-insertions}
\GI{\ker,m} \equiv \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}} z^{2m}\, .
\ee
As objects almost as ancient as \eqref{eq:single-variable-gaussian}, again there exists a neat trick to evaluate them:
\begin{align}
\GI{\ker,m}=&\int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}} z^{2m}=\le(2\ker^2\frac{d}{d\ker}\ri)^m \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}}=\le(2\ker^2\frac{d}{d\ker}\ri)^m \GI{\ker}\, \\
=&\le(2\ker^2\frac{d}{d\ker}\ri)^m \sqrt{2\pi} \ker^{\frac{1}{2}}=\sqrt{2\pi}K^{\frac{2m+1}{2}} (2m-1)(2m-3)\cdots 1   \, ,\nonumber
\end{align}
where in going to the second line we substituted in our expression \eqref{eq:single_Gauss} for $\GI{\ker}$. Therefore, we see that the even moments are given by the simple formula\footnote{This equation with $2m=2$ makes clear why we called $K$ the variance, since for zero-mean Gaussian distributions with variance $K$ we have $\text{var}(z)\equiv\E{\le(z-\E{z}\ri)^2}=\E{z^2} - \E{z}^2 = \E{z^2} =K$.}
\be\label{eq:single_Wick}
\E{z^{2m}}=\frac{\GI{\ker,m}}{\sqrt{2\pi\ker}} = K^m \le(2m-1\ri)!!\, ,
\ee
where we have introduced the \terminate{double factorial}
\be
\le(2m-1\ri)!!\equiv(2m-1)(2m-3)\cdots 1 = \frac{\le(2m\ri) !}{2^m m!}\, .
\ee 
The result~\eqref{eq:single_Wick} is \terminate{Wick's theorem} for single-variable Gaussian distributions.

There's actually another nice way to derive~\eqref{eq:single_Wick}, which can much more naturally be extended to multivariable Gaussian distributions.
This derivation starts with the consideration of a Gaussian integral with a \term{source term}\index{source term|seealso{generating function}} $J$, which we define as
\be\label{eq:partition-function-single-variable-definition}
\PF{\ker,J} \equiv \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}+J z}\, .
\ee
Note that when setting the source to zero we recover the normalization of the Gaussian integral, giving the relationship $\PF{K,J=0}=\GI{K}$.
In the physics literature $\PF{K,J}$ is sometimes called a \textbf{partition function with source}\index{partition function!with source}\index{partition function!with source|seealso{generating function}} and, as we will soon see, this integral serves as a \term{generating function} for the moments\index{moment}. 
We can evaluate $\PF{K,J}$ by completing the square in the exponent
\be
-\frac{z^2}{2\ker}+J z=-\frac{\le(z-J\ker\ri)^2}{2\ker}+\frac{\ker J^2}{2} \, ,
\ee
which lets us rewrite the integral \eqref{eq:partition-function-single-variable-definition} as
\be
\PF{\ker,J} = e^{\frac{K J^2}{2}}\int_{-\infty}^{\infty} d z\ e^{-\frac{\le(z-JK\ri)^2}{2K}}
 =e^{\frac{K J^2}{2}} \GI{K} 
 =e^{\frac{K J^2}{2}} \sqrt{2\pi\ker} \, ,
\ee
where in the middle equality we noticed that the integrand is just a shifted Gaussian function with variance $\ker$.

We can now relate the Gaussian integral with a source $\PF{\ker, J}$ to the Gaussian integral with insertions $\GI{K,m}$. By differentiating $\PF{\ker, J}$ with respect to the source $J$ and \emph{then} setting the source to zero, we observe that
\be
\GI{\ker,m}= \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}} z^{2m}=\le[\le(\frac{d}{dJ}\ri)^{2m} \int_{-\infty}^{\infty} d z\ e^{-\frac{z^2}{2\ker}+J z}\ri]\Bigg\vert_{J=0}=\le[\le(\frac{d}{dJ}\ri)^{2m} \PF{\ker,J} \ri]\Bigg\vert_{J=0}\, .
\ee
In other words, the integrals $\GI{\ker,m}$ are simply related to the even Taylor coefficients of the \terminate{partition function}\index{partition function|seealso{normalization factor}} $\PF{\ker,J}$ around $J=0$.
For instance, for $2m=2$ we have
\be
\E{z^{2}}=\frac{\GI{K,1}}{\sqrt{2\pi K}} = \le[\le(\frac{d}{dJ}\ri)^{2} e^{\frac{K J^2}{2}}\ri]\Bigg\vert_{J=0}=\le[e^{\frac{K J^2}{2}}\le(K+K^2J^2\ri)\ri]\Bigg\vert_{J=0}=K\, ,
\ee
and for $2m=4$ we have
\be
\E{z^{4}}=\frac{\GI{K,2}}{\sqrt{2\pi K}} = \le[\le(\frac{d}{dJ}\ri)^{4} e^{\frac{K J^2}{2}}\ri]\Bigg\vert_{J=0}=\le[e^{\frac{K J^2}{2}}\le(3K^2+6K^3J^2+K^4 J^4\ri)\ri]\Bigg\vert_{J=0}=3K^2\, .
\ee
Notice that any terms with dangling sources $J$ vanish upon setting $J=0$. This observation gives a simple way to evaluate correlators for general $m$: Taylor-expand the exponential $\PF{\ker,J}/\GI{\ker} = \exp\!\le(\frac{K J^2}{2}\ri)$ and keep the term with the right amount of sources such that the expression doesn't vanish. Doing exactly that, we get
\begin{align}\label{eq:gaussian-single-variable-insertions}
\E{z^{2m}}=&\frac{\GI{K,m}}{\sqrt{2\pi K}}  =\le[\le(\frac{d}{dJ}\ri)^{2m} e^{\frac{K J^2}{2}}\ri]\Bigg\vert_{J=0}=\le\{\le(\frac{d}{dJ}\ri)^{2m}\le[ \sum_{k=0}^{\infty}\frac{1}{k!} \le(\frac{K}{2}\ri)^{k} J^{2k}\ri]\ri\}\Bigg\vert_{J=0}\, \\
=&\le(\frac{d}{dJ}\ri)^{2m}\le[ \frac{1}{m!} \le(\frac{K}{2}\ri)^m J^{2m}\ri]= K^m\frac{\le(2m\ri) !}{2^m m!}=K^m (2m-1)!!\, ,\nonumber
\end{align}
which completes our second derivation of \terminate{Wick's theorem}~\eqref{eq:single_Wick} for the single-variable Gaussian distribution. This derivation was much longer than the first neat derivation, but can be very naturally extended to the multivariable Gaussian distribution, which we turn to next.


\index{indices!vectorial|see{vectorial indices}}
\index{indices!sample|see{sample indices}}
\index{indices!neural|see{neural indices}}
\index{indices!layer|see{layer indices}}
\index{indices!feature|see{feature indices}}

\subsubsection{Multivariable Gaussian integrals}
Picking up speed, we are now ready to handle multivariable Gaussian integrals for an $\dimpre$-dimensional variable $z_{\mu}$ with $\mu=1,\ldots,\dimpre$.\footnote{Throughout this book, we will explicitly write out the component indices of vectors, matrices, and tensors\index{tensor} as much as possible, except on some occasions when it is clear enough from context.}
The multivariable \terminate{Gaussian function} is defined as
\be\label{eq:multi-gauss-fn}
  \exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} (\ker^{-1})_{\mu\nu}\,z_{\nu}\ri]\, ,
\ee
where the \terminate{variance} or \textbf{covariance matrix}\index{covariance}\index{covariance|seealso{cumulant}} $K_{\mu\nu}$ is an $\dimpre$-by-$\dimpre$ symmetric positive definite matrix\index{positive semidefinite matrix!positive definite matrix}, and its inverse $(\ker^{-1})_{\mu\nu}$
is defined so that their matrix product gives the $\dimpre$-by-$\dimpre$ identity matrix
\be\label{eq:inverse-kernel}
\sum_{\rho=1}^{\dimpre}(\ker^{-1})_{\mu\rho}\,\ker_{\rho\nu}=\delta_{\mu\nu}\, .
\ee
Here we have also introduced the \term{Kronecker delta} $\delta_{\mu\nu}$,
which satisfies
\be\label{eq:Kronecker-delta}
\delta_{\mu \nu} \equiv 
    \begin{cases}
  1 \, , & \mu = \nu  \, , \\
    0 \, , & \mu \neq \nu \, .
    \end{cases}
\ee
The Kronecker delta
is just a convenient representation of the \terminate{identity matrix}. 

Now, to construct a \terminate{probability distribution} from the Gaussian function~\eqref{eq:multi-gauss-fn}, we again need to evaluate the \terminate{normalization factor}
\begin{align}\label{eq:multivariable-gaussian-integral}
\GI{\ker} \equiv& \int d^\dimpre\! z\, \exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} (\ker^{-1})_{\mu\nu}\, z_{\nu}\ri]\, \\
=& \int_{-\infty}^{\infty} dz_1  \int_{-\infty}^{\infty} dz_2 \cdots \int_{-\infty}^{\infty} dz_\dimpre \, \exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} (\ker^{-1})_{\mu\nu}\, z_{\nu}\ri]\, .\nonumber
\end{align}
To compute this integral, first recall from linear algebra that, given an $\dimpre$-by-$\dimpre$ symmetric matrix $K_{\mu\nu}$, there is always an orthogonal matrix\footnote{An \neo{orthogonal matrix} $O_{\mu\nu}$  is a matrix whose transpose $\le(O^T\ri)_{\mu\nu}$ equals its inverse, i.e.,
$(O^T O)_{\mu\nu}=\delta_{\mu\nu}$.
}
$O_{\mu\nu}$ that diagonalizes $K_{\mu\nu}$ as $(OK O^T)_{\mu\nu}=\lambda_{\mu} \delta_{\mu\nu}$ with eigenvalues $\lambda_{\mu=1,\ldots,\dimpre}$ and diagonalizes its inverse as $(OK^{-1} O^T)_{\mu\nu}=\le(1/\lambda_{\mu}\ri) \delta_{\mu\nu}$.
With this in mind, after twice inserting the identity matrix as $\delta_{\mu\nu} = (O^T O)_{\mu\nu}$,
the sum in the exponent of the integral can be expressed in terms of the eigenvalues as
\begin{align}
\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} (\ker^{-1})_{\mu\nu}z_{\nu}
&=\sum_{\mu,\rho,\sigma,\nu=1}^{\dimpre} z_{\mu} \, (O^T O)_{\mu\rho} (\ker^{-1})_{\rho\sigma}(O^T O)_{\sigma\nu}\, z_{\nu}  \\ \notag
&=\sum_{\mu,\nu=1}^{\dimpre}(Oz)_{\mu} (O \ker^{-1} O^T)_{\mu\nu} (Oz)_{\nu}\\ \notag
&=\sum_{\mu=1}^{\dimpre} \frac{1}{\lambda_{\mu}}(Oz)_{\mu}^2\, ,
\end{align}
where to reach the final line we used the \terminate{diagonalization} property of the inverse covariance matrix.
Remembering that for a positive definite matrix $K_{\mu\nu}$ the eigenvalues\index{eigenvalue} are all positive $\lambda_\mu > 0$, we see that the $\lambda_\mu$ sets the scale of the falloff of the Gaussian function in each of the eigendirections.
Next, recall from multivariable calculus that a change of variables $u_{\mu}\equiv (O z)_{\mu}$ with an orthogonal matrix $O$ leaves the integration measure invariant, i.e., $d^{\dimpre}\! z=d^{\dimpre}\!u$. All together, this lets us factorize the multivariable Gaussian integral \eqref{eq:multivariable-gaussian-integral} into a product of single-variable Gaussian integrals~\eqref{eq:single_Gauss}, yielding
\begin{align}
\GI{\ker} =&\int_{-\infty}^{\infty} du_1\int_{-\infty}^{\infty} du_2\cdots \int_{-\infty}^{\infty} du_{\dimpre}\ \exp\!\le(-\frac{u_1^2}{2\lambda_1}-\frac{u_2^2}{2\lambda_2}-\ldots-\frac{u_\dimpre^2}{2\lambda_\dimpre}\ri)\, \\
=&\prod_{\mu=1}^{\dimpre}\le[ \int_{-\infty}^{\infty} du_{\mu}\ \exp\!\le(-\frac{u_{\mu}^2}{2\lambda_{\mu}}\ri)\ri]
=\prod_{\mu=1}^{\dimpre} \sqrt{2\pi \lambda_{\mu}}= \sqrt{\prod_{\mu=1}^{\dimpre}\le(2\pi \lambda_{\mu}\ri)}\, . \nonumber
\end{align}
Finally, recall one last fact from linear algebra that the product of the eigenvalues of a matrix is equal to the matrix \terminate{determinant}. Thus, compactly, we can express the value of the multivariable Gaussian integral as
\be\label{eq:det_formula}
\GI{\ker} = \int d^\dimpre\! z\ \exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} (K^{-1})_{\mu\nu}z_{\nu}\ri]=  \sqrt{\dete{2\pi K}}\, ,
\ee
where $\dete{A}$ denotes the determinant of a square matrix $A$.


Having figured out the normalization factor, we can define the zero-mean \textbf{multivariable Gaussian probability distribution}\index{Gaussian distribution!multivariable} with variance $K_{\mu\nu}$ as
\be\label{eq:multi-gauss-dis}
p\!\le(z\ri)=\frac{1}{ \sqrt{\dete{2\pi \ker}}}\exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} (\ker^{-1})_{\mu\nu}\, z_{\nu}\ri] \, .
\ee 
While we're at it, let us also introduce the conventions of suppressing the superscript ``$-1$'' for the inverse covariance $(K^{-1})_{\mu\nu}$, instead placing the component indices upstairs as
\be\label{eq:Einstein}
K^{\mu\nu}\equiv (K^{-1})_{\mu\nu}\, .
\ee
This way, we 
distinguish the covariance $K_{\mu\nu}$ and the inverse covariance $K^{\mu\nu}$ by whether or not component indices are lowered or raised. With this notation, inherited from \neo{general relativity}, the defining equation for the inverse covariance~\eqref{eq:inverse-kernel} is written instead as
\be\label{eq:inverse-kernel-compacter}
\sum_{\rho=1}^{\dimpre}\ker^{\mu\rho}\ker_{\rho\nu}=\delta^{\mu}_{\ \nu}\, ,
\ee
and the multivariable Gaussian distribution~\eqref{eq:multi-gauss-dis} is written as
\be\label{eq:multi-gauss-dis-compacter}
p\!\le(z\ri)=\frac{1}{ \sqrt{\dete{2\pi \ker}}}\exp\!\le(-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} \ker^{\mu\nu}z_{\nu}\ri)\, .
\ee
Although it might take some getting used to, this notation saves us some space and saves you some handwriting pain.\footnote{If you like, in your notes you can also go full general-relativistic mode and adopt \neo{Einstein summation convention}, suppressing the summation symbol any time indices are repeated in upstair-downstair pairs. For instance, if we adopted this convention we would write the defining equation for inverse simply as $\ker^{\mu\rho}\ker_{\rho\nu}=\delta^{\mu}_{\ \nu}$ and the Gaussian function as $\exp\!\le(-\frac{1}{2}z_{\mu} \ker^{\mu\nu}z_{\nu}\ri)$. 

Specifically for neural networks, you might find the Einstein summation convention helpful for \emph{sample} indices, but sometimes confusing for \emph{neural} indices.  For extra clarity, we won't adopt this convention in the text of the book, but we mention it now since we do often use such a convention to simplify our own calculations in private.}
Regardless of how it's written, the zero-mean multivariable Gaussian \terminate{probability distribution}~\eqref{eq:multi-gauss-dis-compacter} peaks at $z=0$, and its falloff is direction-dependent, determined by the covariance matrix $K_{\mu\nu}$.
More generally, we can shift the peak of the Gaussian distribution to $s_{\mu}$
\be\label{eq:multi-gauss-dis-compacter-with-mean}
p\!\le(z\ri)= \frac{1}{ \sqrt{\dete{2\pi \ker}}}\exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} \le(z-s\ri)_{\mu} \ker^{\mu\nu}\le(z-s\ri)_{\nu}\ri]\, ,
\ee
which defines a general multivariable Gaussian distribution with mean $\E{z_{\mu}}=s_{\mu}$ and covariance $\ker_{\mu\nu}$. This is the most general version of the Gaussian distribution.


Next, let's consider the moments\index{moment} of the mean-zero multivariable Gaussian distribution
\begin{align}
\E{z_{\mu_1}\cdots z_{\mu_M}}\equiv&  \int d^\dimpre\! z\ p\!\le(z\ri) z_{\mu_1}\cdots z_{\mu_M}\, \\
=& \frac{1}{ \sqrt{\dete{2\pi \ker}}} \int d^\dimpre\! z\  \exp\!\le(-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} \ker^{\mu\nu}z_{\nu}\ri)\, z_{\mu_1}\cdots z_{\mu_M}=\frac{\GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}}{\GI{K}}\, , \nonumber
\end{align}
where we introduced multivariable Gaussian integrals with insertions
\be\label{eq:multi_insertions}
\GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}\equiv \int d^\dimpre\! z\  \exp\!\le(-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} \ker^{\mu\nu}z_{\nu}\ri)\, z_{\mu_1} \cdots  z_{\mu_{M}} \, .
\ee
Following our approach in the single-variable case, let's construct the \terminate{generating function} for the integrals $\GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}$ by including a source term $J^{\mu}$ as %
\be\label{eq:multi-variate-gaussian-partition}
\PF{K,J} \equiv \int d^\dimpre\! z\ \exp\!\le(-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} K^{\mu\nu}z_{\nu}+\sum_{\mu=1}^{\dimpre}J^{\mu} z_{\mu}\ri)\, .
\ee
As the name suggests, differentiating the \terminate{generating function} $\PF{K,J} $ with respect to the source\index{source term} $J^\mu$ brings down a power of $z_\mu$ such that after $M$ such differentiations we have
 \begin{align}\label{eq:multi-gaussian-insertions-and-partition-function}
&\le[ \frac{d}{d J^{\mu_1}}  \frac{d}{d J^{\mu_2}}\cdots  \frac{d}{d J^{\mu_{M}}} \PF{\ker,J}\ri]\Bigg\vert_{J=0}\, \\
=& \int d^\dimpre\! z\  \exp\!\le(-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} K^{\mu\nu}z_{\nu}\ri)\, z_{\mu_1} \cdots  z_{\mu_{M}} = \GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}\, .\nonumber
 \end{align}
So, as in the single-variable case, the Taylor coefficients of the \terminate{partition function} $\PF{K,J}$ expanded around $J^\mu=0$ are simply related to the integrals with insertions $\GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}$. Therefore, if we knew a closed-form expression for  $\PF{K,J}$, we could easily compute the values of the integrals $\GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}$.

\index{complete the square}
To evaluate the \terminate{generating function} $\PF{K,J}$ in a closed form, again we follow the lead of the single-variable case and complete the square in the exponent of the integrand in \eqref{eq:multi-variate-gaussian-partition} as
\begin{align}
&-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} z_{\mu} K^{\mu\nu}z_{\nu}+\sum_{\mu=1}^{\dimpre}J^{\mu} z_{\mu}\, \\
=&-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} \le(z_{\mu}-\sum_{\rho=1}^{\dimpre}K_{\mu\rho}J^{\rho}\ri) K^{\mu\nu} \le(z_{\nu}-\sum_{\lambda=1}^{\dimpre}K_{\nu\lambda}J^{\lambda}\ri)+\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\, \nonumber\\
=&-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} w_{\mu}K^{\mu\nu}w_{\nu}+\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\, , \nonumber
\end{align}
where we have introduced the shifted variable $w_{\mu} \equiv z_{\mu}-\sum_{\rho=1}^{\dimpre}K_{\mu\rho}J^{\rho}$. Using this substitution, the generating function can be evaluated explicitly
\begin{align}\label{eq:multi-gaussian-Z-J}
\PF{\ker,J} =& \exp\!\le(\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\ri)  \int d^\dimpre\! w\ \exp\!\le[-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre} w_{\mu}\ker^{\mu\nu}w_{\nu}\ri]\, \\
 =& \sqrt{\dete{2\pi K}} \exp\!\le(\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\ri) \, ,\nonumber
\end{align}
where at the end we used our formula for the multivariable integral $\GI{\ker}$,  \eqref{eq:det_formula}.
With our closed-form expression~\eqref{eq:multi-gaussian-Z-J} for the generating function $\PF{K,J}$, we can compute the Gaussian integrals with insertions $\GI{K, \le(\mu_1,\ldots,\mu_{M}\ri)}$ by differentiating it, using~\eqref{eq:multi-gaussian-insertions-and-partition-function}. For an even number $M=2m$ of insertions, we find a really nice formula
\begin{align}\label{eq:nice-formula-for-multivariable-moments}
\E{z_{\mu_1}\cdots z_{\mu_{2m}}}=&\frac{\GI{\ker, \le(\mu_1,\ldots,\mu_{2m}\ri)}}{\GI{\ker}}=\frac{1}{\GI{\ker}}\le[ \frac{d}{d J^{\mu_1}}\cdots  \frac{d}{d J^{\mu_{2m}}} \PF{K,J}\ri]\Bigg\vert_{J=0}\, \\
=&\frac{1}{2^m m!} \frac{d}{d J^{\mu_1}}  \frac{d}{d J^{\mu_2}}\cdots  \frac{d}{d J^{\mu_{2m}}}\le(\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\ri)^m\, .\nonumber
\end{align}
For an odd number $M=2m+1$ of insertions, there is dangling source upon setting $J=0$, and so those integrals vanish. You can also see this by looking at the integrand for any odd moment and noticing that it is odd with respect to the sign flip of the integration variables $z_\mu \leftrightarrow -z_\mu$.

Now,
let's
take a few moments to
evaluate a few moments\index{moment} using this formula.
For $2m=2$, we have
\be\label{eq:Wick-second-moment}
\E{z_{\mu_1}z_{\mu_{2}}} = \frac{1}{2} \frac{d}{d J^{\mu_1}}  \frac{d}{d J^{\mu_2}}\le(\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\ri)=K_{\mu_1\mu_2} .
 \ee
  Here, there are $2!=2$ ways to apply the product rule for derivatives and differentiate the two $J$'s, both of which evaluate to the same expression due to the symmetry of the covariance, $K_{\mu_1 \mu_2}=K_{\mu_2 \mu_1}$. This expression \eqref{eq:Wick-second-moment} validates in the multivariable setting why we have been calling $\ker_{\mu\nu}$ the covariance, because we see explicitly that it is the covariance.


Next, for $2m=4$ we get a more complicated expression
\begin{align}\label{eq:Wick-fourth-moment}
\E{z_{\mu_1}z_{\mu_2}z_{\mu_{3}} z_{\mu_{4}}}=& \frac{1}{2^2 2!} \frac{d}{d J^{\mu_1}}  \frac{d}{d J^{\mu_2}} \frac{d}{d J^{\mu_3}}  \frac{d}{d J^{\mu_4}}\le(\sum_{\mu,\nu=1}^{\dimpre}J^{\mu} K_{\mu\nu}J^{\nu}\ri)\le(\sum_{\rho,\lambda=1}^{\dimpre}J^{\rho} K_{\rho\lambda}J^{\lambda}\ri)\, \notag\\
=& K_{\mu_1\mu_2}K_{\mu_3\mu_4}+K_{\mu_1\mu_3}K_{\mu_2\mu_4}+K_{\mu_1\mu_4}K_{\mu_2\mu_3}\, .
 \end{align}
Here we note
that there are now $4!=24$ ways to differentiate the four $J$'s, though only three distinct ways to pair the four auxiliary indices $1,2,3,4$ that sit under $\mu$. This gives $24/3=8=2^2 2!$ equivalent terms for each of the three pairings, which cancels against the overall factor $1/(2^2 2!)$.


For general $2m$, there are $(2m)!$ ways to differentiate the sources, of which $2^m m!$ of those ways are equivalent. This gives $(2m)!/(2^m m!) = (2m-1)!!$ distinct terms, corresponding to the $(2m-1)!!$ distinct pairings of $2m$ auxiliary indices $1,\ldots,2m$ that sit under $\mu$. The factor of $1/(2^m m!)$ in the denominator of \eqref{eq:nice-formula-for-multivariable-moments} ensures that the coefficient of each of these terms is normalized to unity.
Thus, most generally, we can express the moments\index{moment} of the multivariable Gaussian with the following formula
 \begin{align}\label{eq:Wick-multi}
\E{z_{\mu_1}\cdots z_{\mu_{2m}}}=\sum_{\text{all pairing}}K_{\mu_{k_1}\mu_{k_2}}\cdots K_{\mu_{k_{2m-1}}\mu_{k_{2m}}} \, ,
 \end{align}
where, to reiterate, the sum is over all the possible distinct pairings of the $2m$ auxiliary indices under $\mu$ such that the result has the $(2m-1)!!$ terms that we described above.
Each factor of the covariance $K_{\mu\nu}$ in a term in sum is called a \term{Wick contraction}, corresponding to a particular pairing of auxiliary indices. Each term then is composed of $m$ different Wick contractions, representing a distinct way of pairing up all the auxiliary indices.
To make sure you understand how this pairing works, look back at the $2m=2$ case~\eqref{eq:Wick-second-moment} -- with a single Wick contraction -- and the $2m=4$ case~\eqref{eq:Wick-fourth-moment} -- with three distinct ways of making two Wick contractions -- and try to work out the $2m=6$ case, which yields $(6-1)!!=15$ distinct ways of making three Wick contractions:
\begin{align}
\E{z_{\mu_1}z_{\mu_2}z_{\mu_{3}} z_{\mu_{4}}z_{\mu_5} z_{\mu_{6}}}=&\ker_{\mu_1 \mu_2}\ker_{\mu_3 \mu_4}\ker_{\mu_5 \mu_6}+\ker_{\mu_1 \mu_3}\ker_{\mu_2 \mu_4}\ker_{\mu_5 \mu_6}+\ker_{\mu_1 \mu_4}\ker_{\mu_2 \mu_3}\ker_{\mu_5 \mu_6}\, \nonumber\\
+&\ker_{\mu_1 \mu_2}\ker_{\mu_3 \mu_5}\ker_{\mu_4 \mu_6}+\ker_{\mu_1 \mu_3}\ker_{\mu_2 \mu_5}\ker_{\mu_4 \mu_6}+\ker_{\mu_1 \mu_5}\ker_{\mu_2 \mu_3}\ker_{\mu_4 \mu_6}\, \nonumber\\
+&\ker_{\mu_1 \mu_2}\ker_{\mu_5 \mu_4}\ker_{\mu_3 \mu_6}+\ker_{\mu_1 \mu_5}\ker_{\mu_2 \mu_4}\ker_{\mu_3 \mu_6}+\ker_{\mu_1 \mu_4}\ker_{\mu_2 \mu_5}\ker_{\mu_3 \mu_6}\, \nonumber\\
+&\ker_{\mu_1 \mu_5}\ker_{\mu_3 \mu_4}\ker_{\mu_2 \mu_6}+\ker_{\mu_1 \mu_3}\ker_{\mu_5 \mu_4}\ker_{\mu_2 \mu_6}+\ker_{\mu_1 \mu_4}\ker_{\mu_5 \mu_3}\ker_{\mu_2 \mu_6}\, \nonumber\\
+&\ker_{\mu_5 \mu_2}\ker_{\mu_3 \mu_4}\ker_{\mu_1 \mu_6}+\ker_{\mu_5 \mu_3}\ker_{\mu_2 \mu_4}\ker_{\mu_1 \mu_6}+\ker_{\mu_5 \mu_4}\ker_{\mu_2 \mu_3}\ker_{\mu_1 \mu_6}\, .\nonumber
\end{align}

The formula~\eqref{eq:Wick-multi} is \term{Wick's theorem}. Put a box around it.
Take a few moments for reflection. 

\begin{center}
\ldots\\

\ldots\\

\ldots\\
\end{center}

\noindent Good.
You are now a Gaussian sensei. %
Exhale, and then say as Neo\index{Anderson, Thomas A. ``Neo''} would say,
``I know Gaussian integrals." 

Now that the moments have passed, it is an appropriate time to transition to the next section where you will learn about more general probability distributions.


\section{Probability, Correlation and Statistics, and All That}\label{sec:not-Gauss}






\index{expectation value}\index{moment}
In introducing the \terminate{Gaussian distribution} in the last section we briefly touched upon the concepts of 
expectation and moments.
These are defined for non-Gaussian
probability distributions too, so now let us reintroduce these concepts and expand on their definitions, with an eye towards understanding the nearly-Gaussian distributions that describe wide neural networks. %











Given a \term{probability distribution} $p(z)$ of an $\dimpre$-dimensional random variable $z_\mu$, we can learn about its statistics\index{statistics (of a random variable)}\index{statistics (of a random variable)|seealso{probability distribution}} by measuring functions of $z_{\mu}$. We'll refer to such measurable functions in a generic sense as \textbf{observables}\index{observable|textbf} and denote them as $\mathcal{O}(z)$. The \term{expectation value} of an observable
\be\label{eq:expectation-value-definition}
\E{\mathcal{O}(z)}\equiv \int d^\dimpre\! z\ p(z) \, \mathcal{O}(z)\, %
\ee
characterizes the 
mean value of the random function $\mathcal{O}(z)$. %
Note that the observable $\mathcal{O}(z)$ needs not be a scalar-valued function, e.g.~the second moment of a distribution is a matrix-valued observable given by $\mathcal{O}(z) = z_\mu z_\nu$.

Operationally, an observable is a quantity that we measure by conducting experiments in order to connect to a theoretical model for the underlying probability distribution describing $z_\mu$. In particular, we repeatedly measure the observables that are naturally accessible to us as experimenters, collect their statistics, and then compare them with predictions for the expectation values of those observables computed from some theoretical model of $p(z)$.

With that in mind, it's very natural to ask: what kind of information can we learn about an underlying distribution $p(z)$ by measuring an observable $\mathcal{O}(z)$? For an a priori unknown distribution, is there a set of observables that can serve as a sufficient probe of $p(z)$ such that we could use that information to predict the result of all future experiments involving $z_\mu$?









Consider a
class of observables that we've already encountered, the  \textbf{moments}\index{moment|textbf} or \textbf{\emph{M}-point correlators}\index{correlator!$M$-point} of $z_\mu$, given by the expectation\footnote{In the rest of this book, we'll often use the physics term \emph{$M$-point correlator} rather than the statistics term \emph{moment}, though they mean the same thing and can be used interchangeably.}
\be
\E{z_{\mu_{1}}z_{\mu_{2}}\cdots z_{\mu_{M}}} = \int d^\dimpre\! z\ p(z)\, z_{\mu_{1}}z_{\mu_{2}}\cdots z_{\mu_{M}} \, .
\ee
In principle, knowing the $M$-point correlators of a distribution lets us compute the expectation value of any analytic observable $\mathcal{O}(z)$ via Taylor expansion
\begin{align}\label{eq:observables-and-moments}
\E{\mathcal{O}(z)}=&\E{\sum_{M=0}^{\infty}\frac{1}{M!}\sum_{\mu_1,\ldots,\mu_M=1}^{\dimpre}\frac{\partial^M \mathcal{O}}{\partial z_{\mu_1}\cdots\partial z_{\mu_M}}\Bigg\vert_{z=0} z_{\mu_{1}}z_{\mu_{2}}\cdots z_{\mu_{M}}}\, \\
=&\sum_{M=0}^{\infty}\frac{1}{M!}\sum_{\mu_1,\ldots,\mu_M=1}^{\dimpre}\frac{\partial^M \mathcal{O}}{\partial z_{\mu_1}\cdots\partial z_{\mu_M}}\Bigg\vert_{z=0}\E{ z_{\mu_{1}}z_{\mu_{2}}\cdots z_{\mu_{M}}}\, , \notag
\end{align}
where on the last line we took the Taylor coefficients out of the expectation by using the linearity property of the expectation, inherited from the linearity property of the integral in \eqref{eq:expectation-value-definition}. As such, it's clear that the collection of all the $M$-point correlators completely characterizes a \terminate{probability distribution} for all intents and purposes.\footnote{In fact, the moments offer a dual description of the probability distribution through either the \terminate{Laplace transform} or the \terminate{Fourier transform}. For instance, the Laplace transform of the \terminate{probability distribution} $p(z)$ is given by
\be
Z_{J}\equiv\E{\exp\!\le(\sum_\mu J^\mu z_\mu\ri)}=\int \le[\prod_{\mu}dz_{\mu}\ri]\ p(z)\exp\!\le(\sum_\mu J^\mu z_\mu\ri). 
\ee
As in the Gaussian case, this integral gives a \terminate{generating function} for the $M$-point correlators of $p(z)$, %
which means that $Z_{J}$ can be reconstructed from these correlators.
The probability distribution can then be obtained through the inverse Laplace transform. %
}



 

\index{correlator!$M$-point}
However, this description in terms of all the correlators is somewhat cumbersome and operationally infeasible. To get a reliable estimate of the $M$-point correlator, we must simultaneously measure $M$ components of a random variable for each draw and repeat such measurements many times.
As $M$ grows, this task quickly becomes impractical.
In fact, if we could easily perform such measurements for all $M$, then our theoretical model of $p(z)$ would no longer be a useful abstraction; from \eqref{eq:observables-and-moments} we would already know the outcome of all possible experiments that we could perform, leaving nothing for us to predict.

\index{Gaussian distribution!zero-mean, defined by variance}
To that point, essentially all useful distributions can be effectively described in terms of a finite number of quantities, giving them a parsimonious representation.
For instance, consider the zero-mean $n$-dimensional Gaussian distribution with the variance $K_{\mu\nu}$. %
The nonzero $2m$-point correlators are given by Wick's theorem~\eqref{eq:Wick-multi} as
\be\label{eq:Wick_compact}
\E{z_{\mu_{1}}z_{\mu_{2}}\cdots z_{\mu_{2m}}}=\sum_{\text{all pairing}}K_{\mu_{k_1}\mu_{k_2}}\cdots K_{\mu_{k_{2m-1}}\mu_{k_{2m}}}\, ,
\ee
and are determined entirely by
the $\dimpre(\dimpre+1)/2$ independent components of the variance $K_{\mu\nu}$. The variance itself can be estimated by measuring the two-point correlator
\be
\E{z_{\mu}z_{\nu}}=K_{\mu\nu}\, .
\ee
This is consistent with our description of the distribution itself as ``the zero-mean $\dimpre$-dimensional Gaussian distribution with the variance $K_{\mu\nu}$'' in which we only had to specify these same set of numbers, $K_{\mu\nu}$, to pick out the particular distribution we had in mind.
For zero-mean Gaussian distributions, there's no reason to measure or keep track of any of the higher-point correlators as they are completely constrained by the variance through \eqref{eq:Wick_compact}.



More generally, it would be nice if there were a systematic way for learning about non-Gaussian \terminate{probability distribution}s without performing an infinite number of experiments. 
For nearly-Gaussian distributions\index{nearly-Gaussian distribution}, a useful set of observables is given by
what statisticians call \textbf{cumulants}\index{cumulant|textbf}\index{cumulant|seealso{connected correlator}} and physicists call \textbf{connected correlators}\index{connected correlator|textbf}.\footnote{Outside of this chapter, just as we'll often use the term $M$-point correlator rather than the term moment, we'll use the term $M$-point connected correlator rather than the term cumulant. When we want to refer to the moment and not the cumulant, we might sometimes say \emph{full correlator}\index{full correlator|see{correlator}} to contrast with \emph{connected correlator}.\index{correlator!full}\index{correlator!full|seealso{moment}}} As the formal definition of these quantities is somewhat cumbersome and unintuitive, let's start with a few simple examples.

\index{cumulant!first (mean)}\index{cumulant!first (mean)|seealso{mean}}\index{connected correlator!one-point}\index{connected correlator!one-point|seealso{mean}}\index{correlator!connected|see{connected correlator}}
The first cumulant or the connected one-point correlator is the same as the full one-point correlator
\be\label{eq:C1}
\Ec{z_\mu}{\big|} \equiv  \E{z_\mu}\, .
\ee
This is just the \neo{mean} of the distribution. The second cumulant or the connected two-point correlator is given by
\begin{align}\label{eq:C2}
\Ec{z_\mu z_\nu}{\big|} \equiv&  \E{z_\mu z_\nu} - \E{z_\mu}\E{z_\nu}\, \\
=&\E{\le(z_{\mu}-\E{z_{\mu}}\ri)\le(z_{\nu}-\E{z_{\nu}}\ri)}\equiv \cov{z_\mu}{z_\nu} \, ,\nonumber
\end{align}
which is also known as the \neo{covariance}\index{cumulant!second (covariance)}\index{cumulant!second (covariance)|seealso{covariance}}\index{connected correlator!two-point}\index{connected correlator!two-point|seealso{covariance}}\index{connected correlator!two-point|seealso{metric}} of the distribution. Note how the mean is subtracted from the random variable $z_\mu$ before taking the square in the connected version. The quantity $\widehat{\Delta z}_\mu \equiv z_{\mu}-\E{z_{\mu}}$ represents a \textbf{fluctuation}\index{fluctuations|textbf} of the random variable around its mean. Intuitively, such fluctuations are equally likely to contribute positively as they are likely to contribute negatively, $\E{\widehat{\Delta z}_\mu} = \E{z_{\mu}}-\E{z_{\mu}}=0$, so it's necessary to take the square in order to get an estimate of the magnitude of such fluctuations.


\index{nearly-Gaussian distribution}\index{connected correlator!odd-point vanish with parity}
At this point, let us restrict our focus to distributions that are invariant under a sign-flip symmetry $z_\mu \to - z_\mu$, which holds for the zero-mean Gaussian distribution \eqref{eq:multi-gauss-dis-compacter}.
Importantly, this \neo{parity symmetry} will also hold for the nearly-Gaussian distributions that we will study in order to describe neural networks. For all such even distributions with this symmetry, all odd moments\index{moment} and all odd-point connected correlators vanish.


With this restriction, the next simplest observable is the fourth cumulant or the connected four-point correlator, given by the formula\index{connected correlator!four-point|textbf}\index{connected correlator!four-point|seealso{kurtosis, excess}}\index{connected correlator!four-point|seealso{four-point vertex}}
\begin{align}\label{eq:C4}
&\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}\big|_{\text{connected}}\, \\
=&\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}\,\nonumber\\
&-\E{z_{\mu_1} z_{\mu_2}}\E{z_{\mu_3} z_{\mu_4}}-\E{z_{\mu_1} z_{\mu_3}}\E{z_{\mu_2} z_{\mu_4}}-\E{z_{\mu_1} z_{\mu_4}}\E{z_{\mu_2} z_{\mu_3}}\, .\nonumber
\end{align}
For the Gaussian distribution, recalling the Wick theorem~\eqref{eq:Wick_compact}, the last three terms precisely subtract off the three pairs of Wick contractions used to evaluate the first term, meaning
\be\label{eq:C4-gaussian}
\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}\big|_{\text{connected}} = 0. 
\ee
Essentially by design, the connected four-point correlator vanishes for the Gaussian distribution, and a nonzero value signifies a deviation from Gaussian statistics.\footnote{In statistics, the connected four-point correlator for a single random variable $z$ is called the \emph{excess kurtosis}\index{kurtosis, excess}\index{kurtosis, excess|seealso{connected correlator}} when normalized by the square of the variance. It is a natural measure of the tails of the distribution, as compared to a Gaussian distribution, and also serves as a measure of the potential for outliers. In particular, a positive value indicates fatter tails while a negative value indicates thinner tails.\label{footnote-kurtosis}} 
In fact, the connected four-point correlator is perhaps the simplest measure of non-Gaussianity.


\index{cumulant!general definition}\index{connected correlator!general definition}
Now that we have a little intuition, we are as ready as we'll ever be to discuss the definition for the $M$-th cumulant or the $M$-point connected  correlator. For completeness, we'll give the general definition, before restricting again to distributions that are symmetric under parity $z_\mu \to - z_\mu$. 
The definition is \emph{inductive} and somewhat counterintuitive, expressing the $M$-th moment in terms of connected correlators from degree $1$ to $M$: 
\begin{align}\label{eq:cumu}
&\E{z_{\mu_1} z_{\mu_2}\cdots z_{\mu_{M} }}\, \\
\equiv&\E{z_{\mu_1} z_{\mu_2}\cdots z_{\mu_{M}}}\big|_{\text{connected}}\, \nonumber\\
&+\sum_{\text{all\ subdivisions}}\E{z_{\mu_{k^{[1]}_1}}\cdots z_{\mu_{k^{[1]}_{\nu_1}}}}\Bigg|_{\text{connected}}\cdots\E{z_{\mu_{k^{[s]}_1}} \cdots z_{\mu_{k^{[s]}_{\nu_s}}}}\Bigg|_{\text{connected}}\, , \nonumber
\end{align}
where the sum is over all the possible subdivisions of $M$ variables into $s>1$ clusters of sizes $(\nu_1,\ldots,\nu_s)$ as $(k^{[1]}_1,\ldots,k^{[1]}_{\nu_1}),\ldots,(k^{[s]}_1,\ldots,k^{[s]}_{\nu_s})$. 
By decomposing the $M$-th moment into a sum of products of connected correlators of degree $M$ and lower, we see that the connected $M$-point correlator corresponds to a \emph{new} type of correlation that cannot be expressed by the connected correlators of a lower degree. We saw an example of this above when discussing the connected four-point correlator as a simple measure of non-Gaussianity.





To see how this abstract definition actually works, let's revisit the examples. First, we trivially recover the relation between the mean and the one-point connected correlator
\be
\Ec{z_\mu}{\big|}=\E{z_\mu}\, ,
\ee
as there is no subdivision of a $M=1$ variable into any smaller pieces. For $M=2$, the definition~\eqref{eq:cumu} gives
\begin{align}
\E{z_{\mu_1}z_{\mu_2}}=&\Ec{z_{\mu_1} z_{\mu_2}}{\big|}+\Ec{z_{\mu_1}}{\big|}\Ec{z_{\mu_2}}{\big|}\, \\
=&\Ec{z_{\mu_1} z_{\mu_2}}{\big|}+\E{z_{\mu_1}}\E{z_{\mu_2}}\, .\nonumber
\end{align}
Rearranging to solve for the connected two-point function in terms of the moments, we see that this
is equivalent to our previous definition for the covariance~\eqref{eq:C2}. %

\index{parity symmetry}
At this point, let us again restrict to parity-symmetric distributions invariant under $z_\mu \to - z_\mu$, remembering that this means that all the odd-point connected correlators will vanish. For such distributions, evaluating the definition~\eqref{eq:cumu} for $M=4$ gives
\begin{align}\label{eq:C4-reversed}
\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}=&\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}\big|_{\text{connected}}\, \\
&+\E{z_{\mu_1} z_{\mu_2}}\big|_{\text{connected}}\E{z_{\mu_3} z_{\mu_4}}\big|_{\text{connected}}\, \nonumber\\
&+\E{z_{\mu_1} z_{\mu_3}}\big|_{\text{connected}}\E{z_{\mu_2} z_{\mu_4}}\big|_{\text{connected}}\, \nonumber\\
&+\E{z_{\mu_1} z_{\mu_4}}\big|_{\text{connected}}\E{z_{\mu_2} z_{\mu_3}}\big|_{\text{connected}}\, .\nonumber
\end{align}
Since $\E{z_{\mu_1} z_{\mu_2}}=\E{z_{\mu_1} z_{\mu_2}}\big|_{\text{connected}}$ when the mean vanishes, this is also just a rearrangement of our previous expression \eqref{eq:C4} for the connected four-point correlator for such zero-mean distributions. 

In order to see something new, let us carry on for $M=6$:
\begin{align}\label{eq:six-point-moment-in-terms-of-connected}
\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}z_{\mu_5}z_{\mu_6}}=&\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}z_{\mu_5}z_{\mu_6}}\big|_{\text{connected}}\, \\
&+\E{z_{\mu_1} z_{\mu_2}}\big|_{\text{connected}}\E{z_{\mu_3} z_{\mu_4}}\big|_{\text{connected}}\E{z_{\mu_5} z_{\mu_6}}\big|_{\text{connected}}\, \nonumber\\
&+\le[14 \ \text{other}\ (2,2,2)\ \text{subdivisions}\ri]\, \nonumber\\
&+\E{z_{\mu_1} z_{\mu_2}z_{\mu_3} z_{\mu_4}}\big|_{\text{connected}}\E{z_{\mu_5} z_{\mu_6}}\big|_{\text{connected}}\, \nonumber\\
&+\le[14 \ \text{other}\ (4,2)\ \text{subdivisions}\ri]\, ,\nonumber
\end{align}
in which we have expressed the full six-point correlator in terms of a sum of products of connected two-point, four-point, and six-point correlators.
Rearranging the above expression and expressing the two-point and four-point connected correlators in terms of their definitions,  \eqref{eq:C2} and \eqref{eq:C4}, we obtain an expression for the connected six-point correlator:
\begin{align}\label{eq:C6}
&\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}z_{\mu_5}z_{\mu_6}}\big|_{\text{connected}}\, \\
=&\E{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}z_{\mu_5}z_{\mu_6}}\,\nonumber\\
&-\le\{\E{z_{\mu_1} z_{\mu_2}z_{\mu_3} z_{\mu_4}}\E{z_{\mu_5}z_{\mu_6}}+\le[14 \ \text{other}\ (4,2)\ \text{subdivisions}\ri]\ri\}\, \nonumber\\
&+2\le\{\E{z_{\mu_1} z_{\mu_2}}\E{z_{\mu_3} z_{\mu_4}}\E{z_{\mu_5} z_{\mu_6}}+\le[14 \ \text{other}\ (2,2,2)\ \text{subdivisions}\ri]\ri\}\, .\nonumber
\end{align}
The rearrangement is useful for computational purposes, in that it's simple to first compute the moments of a distribution and then organize the resulting expressions in order to evaluate the connected correlators.

Focusing back on \eqref{eq:six-point-moment-in-terms-of-connected}, it's easy to see that the connected six-point correlator vanishes for Gaussian distributions.
Remembering that the connected four-point correlator also vanishes for Gaussian distributions, we see that the fifteen $(2,2,2)$ subdivision terms are exactly equal to the fifteen terms generated by the Wick contractions resulting from evaluating the full correlator on the left-hand side of the equation. In fact, applying the general definition of connected correlators \eqref{eq:cumu} to the zero-mean Gaussian distribution, we see inductively that all $M$-point connected correlators for $M > 2$ will vanish.\footnote{To see this, 
note that if all the higher-point connected correlators vanish, then the definition~\eqref{eq:cumu} is equivalent to Wick's theorem~\eqref{eq:Wick_compact}, with nonzero terms in \eqref{eq:cumu} -- the subdivisions into clusters of sizes (2, \dots, 2) --  corresponding exactly to the different pairings in \eqref{eq:Wick_compact}.} %
Thus, the connected correlators are a very natural measure of how a distribution deviates from  Gaussianity.


With this in mind, we can finally define a \term{nearly-Gaussian distribution} as a distribution for which all the connected correlators for $M>2$ are \emph{small}.\footnote{
As we discussed in \S\ref{sec:Gauss}, the variance sets the scale of the Gaussian distribution. For nearly-Gaussian distributions, we require that all $2m$-point connected correlators be parametrically small when compared to an appropriate power of the variance, i.e., $\vert \E{z_{\mu_1} \cdots z_{\mu_{2m}}}|_{\text{connected}}\vert \ll \vert K_{\mu\nu}\vert^m$, schematically.}
In fact, the non-Gaussian distributions that describe neural networks generally have the 
property that, as the network becomes wide, the connected four-point correlator becomes small and the
higher-point connected correlators become even smaller.
For these nearly-Gaussian distributions, a few leading connected correlators give a concise and accurate description of the distribution, just as a few leading Taylor coefficients can give a good description of a function near the point of expansion.







































\section{Nearly-Gaussian Distributions}\label{sec:perturbation}







\index{nearly-Gaussian distribution!connected correlators as observables}\index{connected correlator!relation to nearly-Gaussian distributions}
Now that we have defined nearly-Gaussian distributions in terms of measurable deviations from Gaussian statistics, i.e.~via small but nonzero connected correlators, it's natural to ask how we can link these observables to the actual functional form of the distribution, $p(z)$.
We can make this connection through the action.




The \term{action} $\ac(z)$ is a function that defines a \terminate{probability distribution} $p(z)$ through the relation
\be\label{eq:action-representation-of-distribution}
p(z)\propto e^{-\ac(z)}\, .
\ee
In the
statistics literature, the action $\ac(z)$ is sometimes called the \emph{negative log probability}\index{negative log probability|see{action}}, but we will again follow the physics literature and call it the action.
In order for \eqref{eq:action-representation-of-distribution} to make sense as a \terminate{probability distribution}, $p(z)$ needs be normalizable so that we can satisfy
\be
\int d^\dimpre\! z\ p(z)=1\, .
\ee
That's where the \neo{normalization factor}or \term{partition function}
\be
Z\equiv \int d^\dimpre\! z\ e^{-\ac(z)}\, 
\ee
comes in.
After computing the partition function, we can define a \terminate{probability distribution} for a particular action $S(z)$ as
\be\label{eq:general-prob-ac-map}
p(z)\equiv \frac{e^{-\ac(z)}}{Z}\, .
\ee
Conversely, given a \terminate{probability distribution} we can associate an action, $\ac(z)=-\log \le[p(z)\ri]$, up to an additive ambiguity: the ambiguity arises because a constant shift in the action can be offset by the multiplicative factor in the partition function.\footnote{One convention is to pick the constant such that the \terminate{action} vanishes when evaluated at its global minimum.}

The action is a very convenient way to approximate certain types of statistical processes, particularly those with nearly-Gaussian statistics. To demonstrate this, we'll first start with the simplest action, which describes the Gaussian distribution, and then we'll show how to systematically perturb it in order to include various non-Gaussianities.
















\subsubsection{Quadratic action and the Gaussian distribution}
\index{partition function!quadratic action}\index{Gaussian distribution!action}
Since we already know the functional form of the Gaussian distribution, it's simple to identify the action by reading it off from the exponent in \eqref{eq:multi-gauss-dis-compacter}
\be\label{eq:intro-quadratic-action-reprint}
\ac(z)=\frac{1}{2}\sum_{\mu,\nu=1}^\dimpre \ker^{\mu\nu}z_{\mu}z_{\nu}\, ,
\ee
where, as a reminder, the matrix $K^{\mu\nu}$ is the inverse of the variance matrix $K_{\mu\nu}$. The partition function is given by the normalization integral~\eqref{eq:det_formula} that we computed in~\S\ref{sec:Gauss}
\be
Z=\int d^\dimpre\! z\ e^{-\ac(z)} =\GI{\ker}= \sqrt{\dete{2\pi \ker}}\, .
\ee
This \textbf{quadratic action}\index{action!quadratic|textbf}\index{action!quadratic|seealso{Gaussian distribution}} is the simplest normalizable action and serves as a starting point for defining other distributions.




\index{bra-ket notation}\index{bra-ket notation|seealso{Gaussian expectation}}
As we will show next, integrals against the Gaussian distribution are a primitive for evaluating expectations against nearly-Gaussian distributions. Therefore, in order to differentiate between a general expectation and an integral against the Gaussian distribution, let us introduce a special \emph{bra-ket}, or $\bra \Vdot \ket$ notation for computing \emph{Gaussian} expectation values.
For an observable $\O(z)$, define a \textbf{Gaussian expectation}\index{Gaussian expectation|textbf}\index{Gaussian expectation|seealso{bra-ket notation}} as
\be\label{eq:gauss-braket}
\bra \O(z)\ket_{\ker}\equiv\frac{1}{ \sqrt{\dete{2\pi \ker}}}\int\le[ \prod_{\mu=1}^{\dimpre}dz_{\mu}\ri] \exp\!\le(-\frac{1}{2}\sum_{\mu,\nu=1}^{\dimpre}K^{\mu\nu} z_{\mu}z_{\nu}\ri)\O(z)\, .
\ee
In particular, with this notation we can write \terminate{Wick's theorem} as
\be\label{eq:Wick_compacter}
\bra z_{\mu_{1}}z_{\mu_{2}}\cdots z_{\mu_{2m}}\ket_{K}=\sum_{\text{all pairing}}K_{\mu_{k_1}\mu_{k_2}}\cdots K_{\mu_{k_{2m-1}}\mu_{k_{2m}}}\, .
\ee
If we're talking about a Gaussian distribution with variance $K_{\mu\nu}$, then we can use the notation $\E{\,\Vdot\,}$ and $\bra \Vdot \ket_K$ interchangeably.
If instead we're talking about a \terminate{nearly-Gaussian distribution} $p(z)$, then $\E{\,\Vdot\,}$ indicates expectation with respect to $p(z)$, \eqref{eq:expectation-value-definition}. However, in the evaluation of such an expectation, we'll often encounter Gaussian integrals, for which we'll use this bra-ket notation $\bra\Vdot \ket_K$ to simplify expressions.














\subsubsection{Quartic action and perturbation theory}
Now, let's find an action that represents a nearly-Gaussian distribution with a connected four-point correlator that is \emph{small} but non-vanishing
\be\label{eq:C4epsilon}
\Ec{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}{\big|} = \o{\epsilon}\,  .
\ee
Here we have introduced a small parameter  $\epsilon\ll 1$ and indicated that the correlator should be of order $\epsilon$. For %
neural networks, we will later find that the role of the small parameter $\epsilon$ is played by $1/\text{width}$.

We should be able to generate a small connected four-point correlator  by \emph{deforming}\index{deformation!Gaussian distribution} the Gaussian distribution through the addition of a small quartic term to the quadratic action~\eqref{eq:intro-quadratic-action-reprint}, giving us a \textbf{quartic action}\index{action!quartic|textbf}\index{action!quartic|seealso{nearly-Gaussian distribution}}
\be\label{eq:quartic-action-intro}
\ac(z)=\frac{1}{2}\sum_{\mu,\nu=1}^\dimpre K^{\mu\nu}z_{\mu}z_{\nu} + \frac{\epsilon}{4!}\sum_{\mu,\nu,\rho,\lambda=1}^\dimpre V^{\mu\nu\rho\lambda}z_{\mu}z_{\nu}z_{\rho}z_{\lambda} \, ,
\ee
where the \textbf{quartic coupling}\index{coupling!quartic} $\epsilon V^{\mu\nu\rho\lambda}$ is an $(\dimpre \times \dimpre \times \dimpre \times \dimpre)$-dimensional \textbf{tensor}\index{tensor} that is completely symmetric in all of its four indices.
The factor of $1/4!$ is conventional
in order to compensate for the overcounting in the sum due to the symmetry of the indices. While it's not a proof of the connection, note that the coupling $\epsilon V^{\mu\nu\rho\lambda}$ has the right number of components to faithfully reproduce the four-point connected correlator~\eqref{eq:C4epsilon}, which is also an $(\dimpre \times \dimpre \times \dimpre \times \dimpre)$-dimensional symmetric  tensor. At least from this perspective we're off to a good start.

\index{connected correlator!four-point}\index{coupling!quartic} 
Let us now establish this correspondence between the quartic coupling and connected four-point correlator. 
Note that in general it is impossible to compute any expectation value in closed form with a non-Gaussian action -- this includes even the \terminate{partition function}. Instead, in order to compute the connected four-point correlator we'll need to employ \term{perturbation theory} to expand everything to first order in the small parameter $\epsilon$, each term of which can then be evaluated in a closed form. As this is easier done than said, let's get to the computations.












To start, let's evaluate the \terminate{partition function}:
\begin{align}
Z=& \int \le[\prod_{\mu}d z_{\mu}\ri]\ e^{-\ac(z)}\, \\
=&\int \le[\prod_{\mu}d z_{\mu}\ri] \exp\!\le(-\frac{1}{2}\sum_{\mu,\nu}K^{\mu\nu}z_{\mu}z_{\nu}%
-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ri)\, \nonumber\\
=&\sqrt{\dete{2\pi\ker}}\bra\exp\!\le(-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ri)\ket_{\ker}\, .\nonumber
\end{align}
In the second line we inserted our expression for the quartic action\index{action!quartic} \eqref{eq:quartic-action-intro}, and in the last line we used our \terminate{bra-ket notation}~\eqref{eq:gauss-braket} for a Gaussian expectation with variance $K_{\mu\nu}$. As advertised, the Gaussian expectation in the final line cannot be evaluated in closed form.
However, since our parameter $\epsilon$ is small, we can Taylor-expand the exponential to express the partition function as a sum of simple Gaussian expectations that can be evaluated using \terminate{Wick's theorem}~\eqref{eq:Wick_compacter}:
\begin{align}\label{eq:first-order-perturbation-theory-partition-function}
Z=&\sqrt{\dete{2\pi\ker}}\bra 1-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}+\o{\epsilon^2}\ket_{\ker}\, \\
=&\sqrt{\dete{2\pi\ker}}\le[1-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}\bra z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ket_{\ker}+\o{\epsilon^2}\ri]\, \nonumber\\
=&\sqrt{\dete{2\pi\ker}}\le[1-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}\le(K_{\rho_1\rho_2}K_{\rho_3\rho_4} +K_{\rho_1\rho_3}K_{\rho_2\rho_4}+ K_{\rho_1\rho_4}K_{\rho_2\rho_3} \ri)+\o{\epsilon^2}\ri]\, \nonumber\\
=&\sqrt{\dete{2\pi K}}\le[1-\frac{1}{8}\epsilon  \sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4} K_{\rho_1\rho_2}K_{\rho_3\rho_4}+\o{\epsilon^2}\ri]\, .\nonumber
\end{align}
In the final line, we 
 were able to combine the three $K^2$ terms together by using the total symmetry of the quartic coupling and then relabeling some of the summed-over dummy indices.\index{coupling!quartic}

Similarly, let's evaluate the two-point correlator:
\begin{align}\label{eq:second-moment-interaction}
&\E{z_{\mu_1}z_{\mu_2}}=\frac{1}{Z}\int \le[\prod_{\mu}d z_{\mu}\ri]\ e^{-\ac(z)}\,  z_{\mu_1}z_{\mu_2}\,  \\
=&\frac{\sqrt{\dete{2\pi\ker}}}{Z}\bra z_{\mu_1}z_{\mu_2}\exp\!\le(-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ri)\ket_{\ker}\, \notag \\
=&\frac{\sqrt{\dete{2\pi\ker}}}{Z}\le[\bra z_{\mu_1}z_{\mu_2}\ket_{\ker}-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}\bra z_{\mu_1}z_{\mu_2}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ket_{\ker}+\o{\epsilon^2}\ri]\, \nonumber\\
=&\le[1+\frac{1}{8}\epsilon  \sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4} K_{\rho_1\rho_2}K_{\rho_3\rho_4}\ri]K_{\mu_1\mu_2}\, \nonumber\\
&-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}\le(3K_{\mu_1\mu_2}K_{\rho_1\rho_2}K_{\rho_3\rho_4}+12K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\rho_3\rho_4} \ri)+\o{\epsilon^2}  \, \nonumber\\
=&K_{\mu_1\mu_2}-\frac{\epsilon}{2}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\rho_3\rho_4}+\o{\epsilon^2}\, .\nonumber
\end{align}
Here, to go from the first line to the second line we inserted our expression for the quartic action\index{action!quartic} \eqref{eq:quartic-action-intro} and rewrote the integral as a Gaussian expectation. Then, after expanding in $\epsilon$ to first order, in the next step
we substituted \eqref{eq:first-order-perturbation-theory-partition-function} in for the partition function  $Z$ in the denominator and expanded $1/Z$ to the first order in $\epsilon$ using the expansion $1/(1-x)=1+x+\o{x^2}$. In that same step, we also noted that, of the fifteen terms coming from the Gaussian expectation $\bra z_{\mu_1}z_{\mu_2}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ket_{\ker}$,
there are three ways in which $z_{\mu_1}$ and $z_{\mu_2}$ contract with each other but twelve ways in which they don't. Given again the symmetry of $V^{\rho_1\rho_2\rho_3\rho_4}$, this is the only distinction that matters.




At last,
let's compute the full four-point correlator: 
\begin{align}\label{eq:full-four-point-intro}
&\E{z_{\mu_1}z_{\mu_2}z_{\mu_3}z_{\mu_4}} =\frac{1}{Z}\int \le[\prod_{\mu}d z_{\mu}\ri]\ e^{-\ac(z)}\,  z_{\mu_1}z_{\mu_2}z_{\mu_3}z_{\mu_4}\, \\
=&\frac{\sqrt{\dete{2\pi\ker}}}{Z}\le[\bra z_{\mu_1}z_{\mu_2}z_{\mu_3}z_{\mu_4}\ket_{\ker}-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}\bra z_{\mu_1}z_{\mu_2}z_{\mu_3}z_{\mu_4}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ket_{\ker}+\o{\epsilon^2}\ri]\, \nonumber\\
=&\le[1+\frac{1}{8}\epsilon  \sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4} K_{\rho_1\rho_2}K_{\rho_3\rho_4}\ri]\le[K_{\mu_1\mu_2}K_{\mu_3\mu_4}+K_{\mu_1\mu_3}K_{\mu_2\mu_4}+K_{\mu_1\mu_4}K_{\mu_2\mu_3}\ri]\, \nonumber\\
&-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4} \nonumber\\
 &\times\Big(3K_{\mu_1\mu_2}K_{\mu_3\mu_4}K_{\rho_1\rho_2}K_{\rho_3\rho_4}+12K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\mu_3\mu_4}K_{\rho_3\rho_4}+12K_{\mu_3\rho_1}K_{\mu_4\rho_2}K_{\mu_1\mu_2}K_{\rho_3\rho_4}\, \nonumber\\
 &\ \ +3K_{\mu_1\mu_3}K_{\mu_2\mu_4}K_{\rho_1\rho_2}K_{\rho_3\rho_4}+12K_{\mu_1\rho_1}K_{\mu_3\rho_2}K_{\mu_2\mu_4}K_{\rho_3\rho_4}+12K_{\mu_2\rho_1}K_{\mu_4\rho_2}K_{\mu_1\mu_3}K_{\rho_3\rho_4}\, \nonumber\\
  &\ \ +3K_{\mu_1\mu_4}K_{\mu_2\mu_3}K_{\rho_1\rho_2}K_{\rho_3\rho_4}+12K_{\mu_1\rho_1}K_{\mu_4\rho_2}K_{\mu_2\mu_3}K_{\rho_3\rho_4}+12K_{\mu_2\rho_1}K_{\mu_3\rho_2}K_{\mu_1\mu_4}K_{\rho_3\rho_4}\, \nonumber\\
 &\quad +24K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\mu_3\rho_3}K_{\mu_4\rho_4}\Big)+\o{\epsilon^2}  \, .\nonumber
\end{align}
To go from the first line to the second line we inserted our expression for the quartic action\index{action!quartic} \eqref{eq:quartic-action-intro}, expanded to first order in $\epsilon$, and rewrote in the \terminate{bra-ket notation} \eqref{eq:gauss-braket}. On the third line, we again substituted in the expression~\eqref{eq:first-order-perturbation-theory-partition-function} for the partition function $Z$, expanded $1/Z$ to first order in $\epsilon$, and then used \terminate{Wick's theorem} \eqref{eq:Wick_compacter} to evaluate the fourth and eighth Gaussian moments. (Yes, we know that the evaluation of $\bra z_{\mu_1}z_{\mu_2}z_{\mu_3}z_{\mu_4}z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}\ket_{\ker}$ is not fun. The breakdown of the terms depends again on whether or not the $\mu$-type indices are contracted with the $\rho$-type indices or not.)
We can simplify this expression by noticing that some terms cancel due to $\frac{1}{8}-\frac{3}{24}=0$ and some other terms can be nicely regrouped once we notice  through the expression for the two-point correlator~\eqref{eq:second-moment-interaction} that
\begin{align}
&K_{\mu_1\mu_2}K_{\mu_3\mu_4}-\frac{\epsilon}{24}\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4}\le(12K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\mu_3\mu_4}K_{\rho_3\rho_4}+12K_{\mu_3\rho_1}K_{\mu_4\rho_2}K_{\mu_1\mu_2}K_{\rho_3\rho_4}\ri)\, \nonumber\\
&=\E{z_{\mu_1}z_{\mu_2}}\E{z_{\mu_3}z_{\mu_4}}+\o{\epsilon^2}\, ,
\end{align}
yielding in the end
\begin{align}
&\E{z_{\mu_1}z_{\mu_2}z_{\mu_3}z_{\mu_4}}\, \\
=&\E{z_{\mu_1}z_{\mu_2}}\E{z_{\mu_3}z_{\mu_4}}+\E{z_{\mu_1}z_{\mu_3}}\E{z_{\mu_2}z_{\mu_4}}+\E{z_{\mu_1}z_{\mu_4}}\E{z_{\mu_2}z_{\mu_3}}\, \nonumber\\
&-\epsilon\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4} K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\mu_3\rho_3}K_{\mu_4\rho_4}+\o{\epsilon^2}\, .\nonumber
\end{align}

\index{connected correlator!four-point}\index{action!quartic}\index{coupling!quartic}\index{nearly-Gaussian distribution}
Given the full four-point correlator \eqref{eq:full-four-point-intro} and the two-point correlator \eqref{eq:second-moment-interaction},
we can finally evaluate the connected four-point correlator~\eqref{eq:C4} 
as
\begin{align}\label{eq:single-variable-connected-four-point}
\Ec{z_{\mu_1} z_{\mu_2}z_{\mu_3}z_{\mu_4}}{\big|} = -\epsilon\sum_{\rho_1,\ldots,\rho_4}V^{\rho_1\rho_2\rho_3\rho_4} K_{\mu_1\rho_1}K_{\mu_2\rho_2}K_{\mu_3\rho_3}K_{\mu_4\rho_4}+\o{\epsilon^2}\, .
\end{align}
This makes explicit the relationship between the connected four-point correlator and the quartic coupling in the action, when both are small.
We see that for the nearly-Gaussian distribution realized by the quartic action \eqref{eq:quartic-action-intro}, the distribution is -- as promised -- \emph{nearly} Gaussian: the strength of the coupling $\epsilon V^{\rho_1\rho_2\rho_3\rho_4}$ directly controls the distribution's deviation from Gaussian statistics, as measured by the connected four-point correlator. This also shows that the four-index tensor $V^{\rho_1\rho_2\rho_3\rho_4}$ creates nontrivial correlations between the components $z_{\rho_1}z_{\rho_2}z_{\rho_3}z_{\rho_4}$ that cannot otherwise be built up by the  correlation $K_{\mu\nu}$ in any pair of random variables $z_{\mu}z_{\nu}$.

\index{coupling!quartic}
Finally, note that the connected two-point correlator \eqref{eq:second-moment-interaction} -- i.e.~the covariance of this \terminate{nearly-Gaussian distribution} -- is also shifted from its Gaussian value of $K_{\mu_1\mu_2}$ by the quartic coupling $\epsilon V^{\rho_1\rho_2\rho_3\rho_4}$. Thus, the nearly-Gaussian deformation not only creates complicated patterns of four-point correlation as measured by the connected four-point correlator \eqref{eq:single-variable-connected-four-point}, it also can modify the details of the Gaussian two-point correlation.










Now that we see how to compute the statistics of a \terminate{nearly-Gaussian distribution}, let's take a step back and think about what made this possible.
We can perform these perturbative calculations any time there exists in the problem a dimensionless parameter~$\epsilon$ that is small $\epsilon \ll 1$, but nonzero $\epsilon > 0$.
This makes \terminate{perturbation theory} an extremely powerful tool for theoretical analysis any time a problem has any extreme scales, small \emph{or} large.


\index{$1/n$ expansion}\index{large-$n$ expansion|see{$1/n$ expansion}}\index{nearly-Gaussian distribution}\index{non-Gaussian distribution}\index{non-Gaussian distribution|seealso{nearly-Gaussian distribution}}
Importantly, this is directly relevant to theoretically understanding neural networks in practice. 
As we will explain in the following chapters, real networks have a parameter $n$ -- the number of neurons in a layer -- that is typically large $n \gg 1$, but certainly not infinite $n < \infty$.  This means that we can expand the distributions that describe such networks in the inverse of the large parameter as $\epsilon =1/n$.
Indeed, when the parameter $n$ is large -- as is typical in practice -- the distributions that describe neural networks become nearly-Gaussian and thus theoretically tractable.
This type of expansion is known as the \textbf{1/\emph{n} expansion} or \textbf{large-\emph{n} expansion} and will be one of our main tools for learning the principles of deep learning theory.



\subsubsection{\emph{Aside}: statistical independence and interactions}
\index{interactions!connection to statistical (in)dependence}\index{statistical independence|textbf}\index{action!quartic}\index{coupling!quartic}\index{statistical independence!absence of interactions and connection to Gaussian distribution}

The quartic action~\eqref{eq:quartic-action-intro} is one of the simplest models of an \term{interacting theory}\index{interacting theory|seealso{non-Gaussian distribution}}. We showed this explicitly by connecting the quartic coupling to the non-Gaussian statistics of the non-vanishing connected four-point correlator. Here, let us try to offer an intuitive meaning of \emph{interaction} by appealing to the notion of \emph{statistical independence}. 


Recall from the probability\index{probability (branch of mathematics)} theory that two random variables $x$ and $y$ are statistically independent if their joint distribution factorizes as
\be\label{eq:independence-random-variables}
p(x, y) = p(x)p(y) \, .
\ee
For the \terminate{Gaussian distribution}, if the variance matrix $K_{\mu\nu}$ is diagonal, there is no correlation at all between different components of $z_{\mu}$; they are manifestly statistically independent from each other. 

Even if $K_{\mu\nu}$ is not diagonal, we can still unwind the correlation of a Gaussian distribution by rotating to the right basis. As discussed in~\S\ref{sec:Gauss}, there always exists an \terminate{orthogonal matrix} $O$ that diagonalizes\index{diagonalization} the covariance as $(OK O^T)_{\mu\nu}=\lambda_{\mu} \delta_{\mu\nu}$. In terms of the variables $u_{\mu}\equiv (O z)_{\mu}$, the distribution looks like
\begin{align}\label{eq:gaussian-statistical-independence-day}
p(z) &= \frac{1}{\sqrt{\dete{2\pi K}}} \exp\!\le(-\sum_{\mu=1}^\dimpre\frac{u_\mu^2}{2\lambda_\mu}\ri)=\prod_{\mu=1}^\dimpre  \le( \frac{e^{-\frac{u_\mu^2}{2\lambda_\mu}}}{\sqrt{2\pi \lambda_\mu}}  \ri) =p\!\le(u_1\ri)\cdots p(u_\dimpre) \, .
\end{align}
Thus, we see that in the $u$-coordinate basis the original multivariable Gaussian distribution factorizes into $\dimpre$ single-variable Gaussians that are statistically independent.\index{statistical independence}

\index{coupling!non-Gaussian}\index{statistical independence}\index{interactions}
We also see that in terms of the action, statistical independence is characterized by the action breaking into a sum over separate terms.
This unwinding of interaction between variables is generically impossible when there are nonzero non-Gaussian couplings.
For instance, there are $\sim \dimpre^2$ components of an orthogonal matrix $O_{\mu\nu}$ to change basis, while there are $\sim \dimpre^4$ components of the quartic coupling $\epsilon V^{\mu\nu\rho\lambda}$ that correlate random variables, so it is generically impossible to re-express  the quartic action as a sum of functions of $\dimpre$ different variables. Since the action cannot be put into
a sum over $\dimpre$ separate terms,
the joint distribution cannot factorize, and the components will not be independent from each other.
Thus, it is impossible to factor the nearly-Gaussian distribution into the product of $\dimpre$ statistically independent distributions.
In this sense, what is meant by \emph{interaction} is the breakdown of \neo{statistical independence}.\footnote{
An astute reader might wonder if there is any interaction when we consider a single-variable distribution with $\dimpre = 1$, since there's no other variables to interact with. For nearly-Gaussian distributions, even if $\dimpre=1$, we saw in~\eqref{eq:second-moment-interaction} that the variance of the distribution is shifted from its Gaussian value, $K$, and depends on the quartic coupling $\epsilon V$. In physics, we say that
this shift is due to the \emph{self-interaction}\index{self-interaction|see{interactions}}\index{interactions!self-interactions} induced by the quartic coupling $\epsilon V$,
since it modifies the value of observables from the \emph{free} Gaussian theory that we are comparing to, even though there's no notion of statistical independence to appeal to here.\index{nearly-Gaussian distribution}

Said another way, even though the action just involves one term, such a non-Gaussian distribution does not have a closed-form solution for its partition function or correlators; i.e.~there's no trick that lets us compute integrals of the form $e^{-\ac(z)}$ exactly, when $\ac(z) = \frac{z^2}{2K} + \frac{1}{4!} \epsilon Vz^4$. This means that we still have to make use of \terminate{perturbation theory} to analyze the self-interaction in such distributions.
\label{footnote:self-interaction}
}






































\subsubsection{Nearly-Gaussian actions}
\index{nearly-Gaussian distribution}\index{nearly-Gaussian distribution!action}\index{action}
Having given a concrete example in which we illustrated how to deform the quadratic action to realize the simplest nearly-Gaussian distribution, we now give a more general perspective on nearly-Gaussian distributions. 
In what follows, we will continue to require that our distributions are invariant under the \terminate{parity symmetry} that takes $z_\mu \to -z_\mu$. In the action representation, this corresponds to including only terms of even degree.\footnote{The imposition of such a \terminate{parity symmetry}, and thus the absence of odd-degree terms in the action, means that all of the odd moments and hence all of the odd-point connected correlators will vanish.}
 



With that caveat in mind, though otherwise very generally, we can express a \term{non-Gaussian distribution} by \emph{deforming}\index{deformation!Gaussian distribution} the Gaussian action as
\be\label{eq:schematic-action-decomposition}
\ac(z) = \frac{1}{2}\sum_{\mu,\nu=1}^\dimpre \ker^{\mu\nu}z_{\mu}z_{\nu} +  \sum_{m=2}^{k} \frac{1}{(2m)!} \sum_{\mu_1, \ldots, \mu_{2m}=1}^\dimpre s^{\mu_1 \cdots \mu_{2m}} z_{\mu_1} \cdots z_{\mu_{2m}} \, ,
\ee
where the factor of $1/(2m)!$ is conventional in order to compensate for the overcounting in the sum due to the implied symmetry of the indices $\mu_1, \ldots, \mu_{2m}$ in the coefficients $s^{\mu_1 \cdots \mu_{2m}}$, given the permutation symmetry of the product of variables $z_{\mu_1} \cdots z_{\mu_{2m}}$.
The number of terms in the non-Gaussian part of the action is controlled by the integer $k$.
If $k$ were unbounded, then $S(z)$ would be an arbitrary even function, and $p(z)$ could be any parity-symmetric distribution. %
The action is most useful when the expanded polynomial  $S(z)$ truncated to reasonably small degree $k$ -- like $k=2$ for the quartic action -- yields a good representation for the statistical process of interest.

\index{coupling!non-Gaussian}
The coefficients $s^{\mu_1 \cdots \mu_{2m}}$ are generally known as \textbf{non-Gaussian couplings}, and they control the \term{interactions} of the $z_\mu$.\footnote{
    In the similar vein, the coefficient $K^{\mu\nu}$ in the \terminate{action} is sometimes called a \emph{quadratic coupling}\index{coupling!quadratic} since the \emph{coupling} of the component $z_\mu$ with the component $z_\nu$ in the quadratic action leads to a nontrivial \emph{correlation}, i.e.~$\cov{z_\mu}{z_\nu} = K_{\mu\nu}$.
} In particular, there is a direct correspondence between the product of the specific components $z_\mu$ that appear together in the action and the presence of connected correlation between those variables, with the degree of the term in \eqref{eq:schematic-action-decomposition} directly contributing to connected correlators of that degree.
We saw an example of this in~\eqref{eq:single-variable-connected-four-point}, which connected the quartic term to the connected four-point correlator.
In this way, the couplings give a very direct way of controlling the degree and pattern of non-Gaussian correlation,
and the overall degree of the action offers a way of systematically including more and more complicated patterns of such correlations.



\index{connected correlator!}


If you recall from \S\ref{sec:not-Gauss}, we defined nearly-Gaussian distributions as ones for which all these connected correlators are small. Equivalently, from the action perspective, a \terminate{nearly-Gaussian distribution} is a non-Gaussian distribution with an \terminate{action} of the form \eqref{eq:schematic-action-decomposition} for which all the couplings $s^{\mu_1 \cdots \mu_{2m}}$ are parametrically small for all $1 \leq m \leq k$:
\be\label{eq:parametrical-small-world}
\vert s^{\mu_1 \cdots \mu_{2m}}\vert \ll |K^{\mu\nu}|^{m} \, ,
\ee
where this equation is somewhat schematic given the mismatch of the indices.\footnote{
This schematic equation is, nonetheless, dimensionally consistent.\label{foot:dimensional-analysis} To support that remark, let us give a brief introduction to \emph{dimensional analysis}\index{dimensional analysis|textbf}: let the random variable $z_\mu$ have dimension $\ZU$, which we denote as $[z_{\mu}]=\ZU^1$. By \emph{dimension}, you should have in mind something like a unit of length, so e.g.~we read the expression $[z_{\mu}]=\ZU^1$ as ``a component of $z$ is measured in units of $\ZU$.'' The particular units are arbitrary: e.g.~for length, we can choose between \texttt{meters} or \texttt{inches} or \texttt{parsecs} as long as we use a unit of length but \emph{not}, say, \texttt{meters}$^2$, which instead would be a unit of area. Importantly, we cannot add or equate quantities that have different units: it doesn't make any logical sense to add a length to an area. This is similar to the concept of \neo{type safety}\index{type safety|seealso{dimensional analysis}} in computer science, e.g.~we should not add a type \texttt{str}\index{str@\texttt{str}|see{type (data)}}\index{type (data)!string} variable to a type \texttt{int}\index{int@\texttt{int}|see{type (data)}}\index{type (data)!integer} variable.

Now, since the action $S(z)$ is the argument of an exponential $p(z) \propto e^{-S(z)}$, it must be \emph{dimensionless}; otherwise, the exponential $e^{-S}=1-S+\frac{S^2}{2}+\ldots$ would violate the addition rule that we just described. From this dimensionless requirement for the action, we surmise that the inverse of the covariance matrix has dimension $[K^{\mu\nu}]=\ZU^{-2}$, and that the covariance itself has dimension $[K_{\mu\nu}]=\ZU^{2}$. Similarly, all the non-Gaussian couplings in \eqref{eq:schematic-action-decomposition} have dimensions $[s^{\mu_1 \cdots \mu_{2m}}]=\ZU^{-2m}$. Thus, both sides of~\eqref{eq:parametrical-small-world} have the same dimension, making this equation dimensionally consistent.  

Even more concretely, consider the quartic action \eqref{eq:quartic-action-intro}. If we let the tensorial part of the quartic coupling have dimensions $[V^{\mu\nu\rho\lambda}]=\ZU^{-4}$, then the parameter $\epsilon$ is dimensionless, as claimed. This means that we can consistently compare $\epsilon$ to unity, and its parametric smallness $\epsilon\ll 1$ means that the full quartic coupling $\epsilon V^{\mu\nu\rho\lambda}$ is much smaller than the square of the quadratic coupling, and that the connected four-point correlator \eqref{eq:single-variable-connected-four-point} is much smaller than the square of the connected two-point correlator \eqref{eq:second-moment-interaction}. 
\index{action!quartic}\index{coupling!quartic}\index{dimensional analysis}\index{coupling!quadratic}
}
Importantly the comparison is with an appropriate power of the inverse variance or quadratic coupling $K^{\mu\nu}$ since, as we already explained, the variance sets the scale of the Gaussian distribution to which we are comparing these nearly-Gaussian distributions.






















\index{connected correlator!higher-point}\index{nearly-Gaussian distribution}\index{Gaussian distribution}\index{statistical independence}\index{hierarchical scaling}
As we will see in \S\ref{ch:ngp}, wide neural networks are described by nearly-Gaussian distributions. In particular, we will find that such networks are described by a special type of nearly-Gaussian distribution where the connected correlators are \emph{hierarchically} small, scaling as
\be\label{eq:connected-correlator-hierarchy}
\Ec{z_{\mu_1} \cdots z_{\mu_{2m}}}{\big|} = O(\epsilon^{m-1})\, ,
\ee
with the same parameter $\epsilon$ controlling the different scalings for each of the $2m$-point connected correlators.
Importantly, the non-Gaussianities coming from higher-point connected correlators become parametrically less important as $\epsilon$ becomes smaller.



\index{action!truncation}\index{nearly-Gaussian distribution}\index{action!truncation|seealso{hierarchical scaling}}
This means that for a \terminate{nearly-Gaussian distribution} with hierarchical scalings~\eqref{eq:connected-correlator-hierarchy}, we can consistently approximate the distribution by \emph{truncating} the action at some fixed order in $\epsilon$. To be concrete, we can use an action of the form~\eqref{eq:schematic-action-decomposition} to faithfully represent all the correlations up to order $O(\epsilon^{k-1})$, neglecting connected correlations of order $O(\epsilon^k)$ and higher. The resulting action offers a useful and effective description for the statistical process of interest, as long as $\epsilon$ is small enough and $k$ is high enough that $O(\epsilon^k)$ is negligible.

\index{Gaussian distribution}\index{statistical dependence}\index{statistical dependence|seealso{interactions}}\index{statistical dependence|seealso{nearly-Gaussian distribution}}
In practice, a quartic action~\eqref{eq:quartic-action-intro} truncated to $k=2$  will let us model realistic finite-width neural networks.
This quartic action captures the important \emph{qualitative} difference between nearly-Gaussian distributions and the Gaussian distribution, incorporating nontrivial \terminate{interactions} between the different components of the random variable.
In addition, the difference between the statistics \eqref{eq:connected-correlator-hierarchy} of a nearly-Gaussian distribution truncated to $\o{\epsilon}$ versus one truncated to $\o{\epsilon^2}$ is mostly \emph{quantitative}: in both cases there are nontrivial non-Gaussian correlations, but the pattern of higher-order correlation differs only in a small way, with the difference suppressed as $\o{\epsilon^2}$.
In this way, the distribution represented by the quartic action is complex enough to capture the most salient non-Gaussian effects in neural networks while still being simple enough to be analytically tractable. 



























