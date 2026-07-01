# Random eigenvalues of graphenes and the triangulation of plane

## Abstract

## 

We analyze the numbers of closed paths of length k ∈ N on two important regular lattices: the hexagonal lattice (also called graphene in chemistry) and its dual triangular lattice. These numbers form a moment sequence of specific random variables connected to the distance of a position of a planar random flight (in three steps) from the origin. Here, we refer to such a random variable as a random eigenvalue of the underlying lattice. Explicit formulas for the probability density and characteristic functions of these random eigenvalues are given for both the hexagonal and the triangular lattice. Furthermore, it is proven that both probability distributions can be approximated by a functional of the random variable uniformly distributed on increasing intervals [0, b] as b → ∞. This yields a straightforward method to simulate these random eigenvalues without generating graphene and triangular lattice graphs. To demonstrate this approximation, we first prove a key integral identity for a specific series containing the third powers of the modified Bessel functions I n of nth order, n ∈ Z. Such series play a crucial role in various contexts, in particular, in analysis, combinatorics, and theoretical physics.

## Introduction

In 2010, Sir Konstantin Novoselov and Sir Andre Geim were awarded the Nobel prize in Physics for their method to isolate single layers of graphene. Graphene is a carbon allotrope in which the carbon atoms are arranged in a cut-out of an infinitely large hexagonal lattice. It can be considered as an extreme case of other finite-sized carbon allotropes like fullerenes. The analysis of graphene is a mathematical problem with a long history. The hexagonal lattice is one of the well-known two-dimensional Bravais lattices, cf. [[32, 1.2.5.4]](#). Although many (mathematical) results about graphene and its dual, the triangular lattice, are known and may be found, e.g., in [[25,](#b24)[20]](#b19), many more questions are still open. The similarities and differences between graphene and its finite-sized counterparts are also of great interest.

In this paper, we study the spectral properties of these carbon allotropes. The spectral density of a lattice is linked with its combinatorial properties, like the numbers of closed paths rooted at some vertex. Indeed, let µ k (L) be the number of closed paths of length k on the lattice L starting in an arbitrary vertex of L. For a finite graph G n with n vertices, we denote by µ k (G n ) the average number of closed paths of length k on G n . It can be easily seen that

$µ k (G n ) = 1 n tr A k = 1 n n j=1 λ k j ,$where λ 1 , . . . , λ n are the eigenvalues of the adjacency matrix A describing the graph G n . The term tr A k is often referred to as the Newton polynomial of order k. An in-depth analysis of Newton polynomials of order k ≤ n for (dual) fullerene graphs with n ≤ 150 can be found in [[13]](#b12). Therefore, µ k (G n ) is the k th moment of a probability measure ϱ Gn with empirical distribution function given by

$F ϱ Gn (x) = 1 n n j=1 1{λ j ≤ x}.(1)$Since each eigenvalue λ j is chosen with uniform probability, ϱ Gn is the distribution of a random variable L n which will often be referred to as random eigenvalue of G n . The measure ϱ Gn is often called empirical spectral distribution (ESD) of G n . For lattices L, i.e. infinite graphs with all vertices having a finite degree, one cannot directly define its spectral distribution as in [(1)](#b0), but one can still define ϱ L through its moments:

$R x k dϱ L (x) = µ k (L), k ∈ N.(2)$The measure ϱ L is well-known as the density of states or spectral density of L; it is a probability distribution. Any random variable with law ϱ L will be called random eigenvalue of L.

In both cases, the spectral density of a structure captures many properties of the geometry of the underlying graph or lattice. It is our primary goal to study the spectral properties of graphene. In this paper, we shed light on how the ESD ϱ Fn of large (but finite) fullerenes F n approximates the density of states of graphene, ϱ L , and to analyze ϱ L itself. In particular, we use a notion of graph convergence to show how graphene can be seen as an infinitely large fullerene, and the consequences on their respective spectral densities. Mathematically, the convergence of random fullerenes towards graphene is an open question (Conjecture 1). The main part of the paper then deals with the spectral properties of L. Although ϱ L has been studied in the physics literature mostly under the lens of L's Green function, cf. [[26]](#b25), its explicit expression is not commonly encountered in the literature. In this work, we show several identities and probabilistic representations for ϱ L , involving elegant and striking integral formulas for cylinder functions.

The paper is structured as follows. In the next section, we formally define lattices and graphs under consideration, we also recall the notion of local weak convergence for graphs, and its consequences for the spectrum. Section 3 contains our main results followed by their discussion. There, we propose a novel integral representation of the series of third powers of modified Bessel functions (Theorem 4) which is used to prove a simple approximation of the distribution of a random eigenvalue of the triangular and hexagonal lattices (Theorem 3). We give an independent proof of Theorem 3 elucidating some connections to ergodic theory. Furthermore, we give explicit forms of the densities and the characteristic functions of random eigenvalues for graphene and the triangulation of plane. Section 4 explains the point of view of local weak convergence of fullerenes and gives some details on Conjecture 1. Proofs are given in Section 5. The Python code supporting the results of this paper can be downloaded from [[12]](#b11).

## Spectral properties of graphenes and fullerenes

In this section, we collect known definitions and results on Bessel functions, regular planar lattices, paths on them as well as planar random flights. In the sequel, N 0 denotes the set of natural numbers and zero.

## Lattices and planar graphs

$A graph G = (V (G), E(G)) = (V, E) is a tuple consisting of sets of vertices V and of edges E ⊆ V 2 . If |V | = ∞ and$every vertex has a finite degree the graph G is usually called an infinite graph. An introduction to the general theory of infinite graphs can be found in [[22]](#b21). Here, we consider only infinite non-oriented graphs whose planar embedding forms a tiling of the plane R 2 by convex regular polygons. We call such graphs (convex) lattices.

Let us define two lattices whose random eigenvalues are studied in the sequel. Definition 1. We call the infinite graph (i) H a hexagonal lattice, if its set of vertices is given by

$V (H) := √ 3x + y √ 3 2 , 3y 2 + c ⊺ ∈ R 2 x, y ∈ Z, c ∈ {0, 1} ,(3)$and every vertex is connected with its three nearest neighbors (w.r.t. the Euclidean distance) by an edge;

(ii) T a triangular lattice, if its set of vertices is given by

$V (T ) := {v ∈ V (H) | c = 0}$and every vertex is connected with its six nearest neighbors (w.r.t. the Euclidean distance) by an edge.

Roughly speaking, the hexagonal lattice is composed of two triangular sublattices. Adding three loops to every vertex of T and denoting this modification by T * , yields a simple bijection between the set of closed paths with even length 2k on H and the set of closed paths with length k on T * . These three loops can be mathematically formulated as one loop of weight 3.

Let us now turn to formal definitions of fullerenes. It is well known that Euler's formula and Eberhard's theorem impose hard constraints on the structure of finite planar graphs: for example, there can be no finite planar graph which is 3-regular and with only hexagonal faces. One has to introduce faces with degree smaller than 6 to fulfill these constraints; in fullerenes, one only allows faces with degree 5 or 6 and it turns out that the number of faces of degree 5 (called pentagons) must exactly be 12. Definition 2. A fullerene (graph) is a finite, connected, 3-regular planar graph with faces of degrees both 5 and 6.

## Fullerenes and the planar hexagonal lattice

Local weak convergence, also called Benjamini-Schramm convergence due to the seminal paper [[11]](#b10), is a mode of convergence well suited to graphs with a small number of edges. We refer to [[10,](#b9)[6,](#b5)[9]](#b8) for in-depth presentations; for our purposes, let us simply recall the basic elements.

If H = (V, E) is a graph and v ∈ V , we denote by B H (v, r) the "ball of radius r around v", that is, the subgraph of H induced by all the vertices of H whose graph distance to v is smaller than r. A graph H endowed with a special vertex o is called a rooted graph; the set of all locally finite rooted graphs can be endowed with a Polish space structure. We say that (the law of) a sequence of finite random graphs (G n ) converges locally weakly towards (the law of) a random rooted graph (G, o) if for any fixed integer r and fixed rooted graph (H, o),

$P(B Gn (o n , r) is isomorphic to B H (o, r)) ---→ n→∞ P(B G (o, r) is isomorphic to B H (o, r)),(4)$where o n is itself a random element uniformly distributed over the vertices of G n . This notion of convergence indeed coincides with the local weak convergence of probability measures on the space of rooted graphs mentioned above. The limiting random rooted graph (G, o) can be infinite and always has a property called unimodularity which is very restrictive, see [[10]](#b9). The convergence of random planar graphs has recently been widely studied, especially for uniform random triangulations of the sphere. However, to our knowledge, the following statement remains open.

Conjecture 1. Let F n be a random fullerene, chosen uniformly on the set of fullerenes with n vertices. The sequence (F n ) converges locally weakly towards the planar hexagonal lattice H.

We will comment more thoroughly on this question in Section 4. Conjecture 1 has noticeable consequences on the behavior of the eigenvalues of typical fullerenes. Indeed, the convergence of a sequence of finite graphs (G n ) towards a random rooted graph (G, o) implies the convergence of the empirical spectral distribution ϱ Gn towards a limiting probability measure ϱ, see [[1]](#b0) or [[9]](#b8). This measure ϱ can be defined directly from the law (G, o). The general construction is functional-analytic in essence. Under mild assumptions such as uniform boundedness of the degrees in G, the measure ϱ is the unique Borel measure on an interval I ⊂ R whose k-th moments are equal to Eµ k (G), the expected number of closed walks at the root of (G, o); more precisely, ϱ is the unique probability measure whose Stieltjes transform is given by

$I 1 z -x ϱ(dx) = ∞ k=0 Eµ k (G) z k+1 , z ∈ C \ I.(5)$The measure ϱ is called the spectral density of (the law of) the random graph (G, o); it is also known by the name of averaged density of states in the physics community. For the hexagonal lattice H, the construction given in (2) coincides with [(5)](#b4), since in this case the number of closed paths at the root is nonrandom. The spectral density of H will be systematically denoted by ϱ H . Similarly, the spectral density of the dual lattice T * will be denoted by ϱ T * .

The preceding discussion together with Conjecture 1 directly implies that the ESD of large random fullerenes converges towards the spectral density of H.

Consequence of Conjecture 1. Let ϱ H be the spectral density of H, uniquely defined by [(5)](#b4). The empirical spectral distribution of random fullerenes with n vertices converges weakly towards ϱ H as n → ∞.

Our goal in the sequel will be to thoroughly study the spectral density ϱ H and its various representations. We will start by a careful examination of the sequence µ k (H).

## Paths on the planar hexagonal lattice

Let us discuss the computation of the number of paths on H between two vertices with a given number of steps k. Without loss of generality, let the starting point be the origin and the endpoint a vertex v ∈ V (H).

Finally, set v = (0, 0) to get the number of closed paths of length k. Clearly, it is sufficient to consider even lengths 2k with arbitrary k ∈ N 0 only. In the sequel, we follow [[28]](#b27) in our exposition to prove the following explicit expression for the numbers µ 2k (H). 

Proof. Every path on H can be described as a sequence of the three direction vectors

$x 1 = (0, 1) ⊺ , x 2 = 1 2 , - √ 3 2 ⊺ , x 3 = - 1 2 , - √ 3 2 ⊺ ,$and their inverse vectors

$x -1 1 = (0, -1) ⊺ , x -1 2 = - 1 2 , √ 3 2 ⊺ , x -1 3 = 1 2 , √3 2 ⊺$, compare Figure [1](#fig_0). Thus, a path of length 2k starting at the origin and ending in v can be written as a sequence

$x i 1 x -1 j 1 x i 2 x -1 j 2 . . . x i k x -1 j k(7)$for i 1 , j 1 , . . . , i k , j k ∈ {1, 2, 3}. Note that every odd step on H has to be x 1 , x 2 or x 3 . On the other hand, every even step has to be one of the inverse directions x -1 1 , x -1 2 or x -1 3 . Hence, the total number of directions x 1 , x 2 , x 3 in such sequence has to be equal to the total number of inverse directions x -1 1 , x -1 2 , x -1 3 . Moreover, the specific order of directions is not important for the calculation of the number of paths. Hence, in [(7)](#b6) we can rearrange the elements, cancel directions with their inverses, and write the remaining amount of steps in direction x j for j = 1, 2, 3 as its power. For every destination vertex v, one gets a unique minimal amount of directions one has to go, i.e., the powers k 1 , k 2 , k 3 ∈ Z in the shortened form x k 1 1 x k 2 2 x k 3 3 of (7) are uniquely determined by v. If v = (0, 0) it follows immediately that k 1 = k 2 = k 3 = 0.

One can get the number of paths terminating in v as the coefficient of the term

$x k 1 1 x k 2 2 x k 3 3 in the multinomial expansion of (x 1 + x 2 + x 3 ) x -1 1 + x -1 2 + x -1 3 k ,(8)$or, equivalently, as the constant term in the multinomial expansion of

$(x 1 + x 2 + x 3 ) x -1 1 + x -1 2 + x -1 3 k x -k 1 1 x -k 2 2 x -k 3 3 .$To get this constant term, replace x j by complex number e iφ j , j = 1, 2, 3, and integrate the resulting expression over all possible φ 1 , φ 2 , φ 3 ∈ [0, 2π]. This step is reasonable since x 1 , x 2 , x 3 and their inverses are unit vectors in R 2 and thus can be interpreted as unit complex numbers. In other words, we transform Cartesian coordinates into polar coordinates. Now, the amount of paths of length 2k from the origin to v is given by

$1 (2π) 3 2π 0 2π 0 2π 0 e iφ 1 + e iφ 2 + e iφ 3 e -iφ 1 + e -iφ 2 + e -iφ 3 k e -i(k 1 φ 1 +k 2 φ 2 +k 3 φ 3 ) dφ 1 dφ 2 dφ 3 .$Notice that e iφ 1 + e iφ 2 + e iφ 3 e -iφ 1 + e -iφ 2 + e -iφ 3 = e iφ 1 + e iφ 2 + e iφ 3 2 and set k 1 = k 2 = k 3 = 0 for the number of closed paths of length 2k.

## Special functions

Before going further, we briefly need to recall some definition and well-known results for the (modified) Bessel functions used in the proofs of our next results. For integers n ∈ Z, the Bessel function of the first kind of order n can be defined by the series

$J n (x) := ∞ k=0 (-1) k k!(k + n)! x 2 2k+n , x ∈ C.$The modified Bessel function of the first kind of order n is closely related to J n by

$I n (x) := i -n J n (ix) = ∞ k=0 1 k!(k + n)! x 2 2k+n , x ∈ C.$Results given in [[2]](#b1) imply the following useful relation:

$2 dI n (x) dx = I n-1 (x) + I n+1 (x), x ∈ C, n ∈ Z.(9)$Another important property of the modified Bessel function is the following recursive formula, which is a direct consequence of [[2]](#b1):

$I n (x) = I n+2 (x) + 2(n + 1) x I n+1 (x), x ∈ C, n ∈ Z.$We will occasionally need the Gaussian hypergeometric function 2 F 1 which is defined as

$2 F 1 a 1 , a 2 b ; x := ∞ j=0 a (j) 1 a (j) 2 x j b (j) j! , x ∈ R, for a 1 , a 2 , b ∈ C where a (n) is the rising factorial, i.e., a (n) := n-1 j=0$(a + j).

## Properties of the spectral density of H

In equation ( [6](#formula_8)), the sum e iφ 1 + e iφ 2 + e iφ 3 can be seen as the position W 3 of a planar random flight W after three steps. This provides a surprising connection between the moments of the spectral density ϱ H and the position of a certain random walk in two dimensions. We define the planar random flight as an isotropic

$random walk W = {W t , t ∈ N 0 } on R 2 = C in discrete time starting from the origin (W 0 = (0, 0)) such that W t+1 = W t + e iUt$, where the random angles

$U t ∼ U [0, 2π], t ∈ N form an i.i.d. sequence.$This interpretation yields that ( [6](#formula_8)) is nothing but the (2k) th moment of X := |W 3 |, and in particular the spectral density ϱ H and the probability distribution of X are identical, providing a very surprising representation for ϱ H that will be further exploited in our main results. From now on, we gather some results on the density of X. Theorem 2. The random variable X is absolutely continuously distributed with density

$f X (x) = ∞ 0 txJ 0 (tx)J 3 0 (t) dt, x ≥ 0.$Next we analyze the behavior of f X on the positive real half line.

$Proposition 1. It holds f X (x) =      2 √ 3x π(3+x 2 ) 2 F 1 1 3 , 2 3 1 ; x 2 (9-x 2 ) 2 (3+x 2 ) 3 , if x ∈ [0, 3], 0, if x > 3,$where 2 F 1 is the Gaussian hypergeometric function.

The above formula for x ∈ [0, 3] was derived in [[16]](#b15). See also [[15,](#b14)[Theorem 4.5]](#).

$If x > 3 it follows ∞ 0 tJ 0 (tx)J 0 (t) 3 dt = 0$by [[38]](#b37) where we set a 1 = x, a 2 = a 3 = 1 and ν = 0. The fact that the support of f X lies in the interval

$[0, 3] is very intuitive since X is a distance 0 ≤ |W 3 | ≤ 3.$The even moments of X were derived in [[15]](#b14):

$Proposition 2. For k ∈ N 0 , it holds EX 2k = k 1 +k 2 +k 3 =k k k 1 , k 2 , k 3 2 .$As an immediate consequence, the number of closed walks on graphene H and the triangular lattice T * can be obtained if we notice that µ k (T * ) = µ 2k (H) and µ 2k-1 (H) = 0 for any k ∈ N. The latter relation holds since any path on H with an odd length k ∈ N ends in a vertex with parameter c = 1 in (3) and thus cannot be closed. Proposition 3. The number of closed paths of length k at the root of H are given by

$µ k (H) =    k 1 +k 2 +k 3 =k/2 k/2 k 1 ,k 2 ,k 3 2 if k is even, 0 if k is odd.(10)$Similarly, the number of closed paths of length k at the root of T * are given by

$µ k (T * ) = k 1 +k 2 +k 3 =k k k 1 , k 2 , k 3 2 . (11$$)$Remark 1. For even values of k, formula (10) can be derived in either of the following two ways:

(a) By applying [[21]](#b20) and using Vandermonde's identity [[2]](#b1), along with setting all transition probabilities of the random walk on H in [[21]](#b20) to 1/3.

(b) By employing combinatorial arguments and the multinomial theorem to Formulae (7) and (8), we obtain

$(x 1 + x 2 + x 3 ) x -1 1 + x -1 2 + x -1 3 k =   k 1 +k 2 +k 3 =k k k 1 , k 2 , k 3 x k 1 1 x k 3 1 x k 3 3     l 1 +l 2 +l 3 =k k l 1 , l 2 , l 3 x -l 1 1 x -l 2 2 x -l 3 3   = k 1 +k 2 +k 3 =k l 1 +l 2 +l 3 =k k k 1 , k 2 , k 3 k l 1 , l 2 , l 3 x k 1 -l 1 1 x k 2 -l 2 2$x k 3 -l 3

## 3

.

Since each direction x j and its inverse x -1 j must occur in the path with the same frequency, it follows that k j = l j for j = 1, 2, 3.

## Main results

Here we formulate our main results:

3.1 Distribution of random eigenvalues of graphene H and its dual graph T * Proposition 4. The probability distribution ϱ H is absolutely continuous with respect to the Lebesgue measure, and has a density given by

$f H (x) = 1 2 ∞ 0 t|x|J 0 (|x|t)J 3 0 (t) dt, x ∈ R, =      √ 3|x| π(3+x 2 ) 2 F 1 1 3 , 2 3 1 ; x 2 (9-x 2 ) 2 (3+x 2 ) 3 , if x ∈ [-3, 3], 0, otherwise.$Similarly, the density of the probability law ϱ T * is given by

$f T (x) = 1 2 ∞ 0 tJ 0 (t √ x)J 3 0 (t) dt, x > 0, =      √ 3 π(3+x) 2 F 1 1 3 , 2 3 1 ; x(9-x) 2 (3+x) 3 , if x ∈ [0, 9],$0, otherwise.

-3 -2 -1 0 1 2 3 0 0.1 0.2 0.3 0.4 0.5 0.6 0 1 2 3 4 5 6 7 8 9 0 0.1 0.2 0.3 0.4 0.5 0.6 The density function f H has two logarithmic singularities in x = ±1, cf. [[15]](#b14). By construction it follows that f T has a logarithmic singularity in x = 1, as illustrated in Figure [2](#fig_4).

In the sequel, we will use H and T to denote random variables whose probability distribution is ϱ H or ϱ T * , or equivalently with densities f H or f T . It can be immediately seen from the above densities that the following important relation holds:

$H d = A √ T , (12$$)$where A is a Rademacher distributed random variable taking values ±1 with probability 1/2 each, and d = means the equality of probability laws. A and T must be chosen stochastically independent from each other. The next result provides a handy integral representation for the characteristic functions of H and T . Proposition 5. For the characteristic functions φ H (s) = Ee isH and φ T

$(s) = Ee isT , s ∈ R, it holds φ H (s) = d ds s 1 0 I 3 0 2is t(1 -t) dt ,(13)$$φ T (s) = 1 0 I 3 0 2i is log t dt . (14$$)$Calculating the derivative in (13) and using property [(9)](#b8) we get

$φ H (s) = 1 0 I 3 0 2is t(1 -t) dt + 6is 1 0 t(1 -t)I 2 0 2is t(1 -t) I 1 2is t(1 -t) dt, since I -1 (x) = I 1 (x) for all x ∈ C.$
## Approximation in distribution ϱ H and ϱ T *

Consider the random variable

$Y b := cos(X b ) + cos(βX b ) + cos((1 + β)X b ),(15)$where

$X b ∼ U [0, b], b > 0,$and β > 0 is any irrational number. Interestingly enough, the random variable 3+2Y b approximates the random eigenvalue T of the triangulation T * with density function f T in distribution as b → ∞. Inspired by the Wolfram blog [[37]](#b36), we formulate and prove the following

$Theorem 3. Let X b ∼ U ([0, b]) for some b ∈ R + . For a random variable Y b defined in (15), it holds 3 + 2Y b d -→ b→∞ T,(16)$$A 3 + 2Y b d -→ b→∞ H, (17$$)$where A is a Rademacher distributed random variable independent of X b and d -→ denotes convergence in distribution.

To illustrate the above convergence, we set β = ϕ := 1+ As one can see in Figure [3](#fig_6), the histograms show convergence to f T as b goes to infinity. However, there is an easy direct way of simulation of T and H without any approximations: Remark 2 (Exact simulation of T and H). It holds

$T d = 3 + 2(cos(U 1 -U 2 ) + cos(U 1 -U 3 ) + cos(U 2 -U 3 )), (18$$)$where U 1 , U 2 , U 3 ∼ U [0, 2π] are i.i.d. random variables. Indeed, Theorem 1 implies that the moments of T can be written as 

$ET k = E f (U 1 , U 2 , U 3 ) k , k ∈ N,$$f (U 1 , U 2 , U 3 ) = e iU 1 + e iU 2 + e iU 3 2 = 3 + 2(cos(U 1 -U 2 ) + cos(U 1 -U 3 ) + cos(U 2 -U 3 )).$As stated in Proposition 6 below, the distribution of U 3 can be even chosen arbitrarily, i.e., it need not be uniform. Distribution relation [(12)](#b11) allows us to simulate H, once T is simulated by means of formula [(18)](#b17).

Remark 3. In 1880, Lord Rayleigh posed in [[33]](#b32) a problem about the distribution of a finite Fourier series

$N j=1 a j cos(ω j t + b j X j ),$where X j are random variables and N, a j , b j , ω j , t are deterministic numbers. More than 100 years later, Blevins [[14]](#b13) derived a formula for the probability density of such series in case of independent phases X j . The above remark shows the distribution of such Fourier series with dependent phases

$X j = U k -U l , {j, k, l} = {1, 2, 3}, U 1 , U 2 , U 3 ∼ U [0, 2π] i.i.d. and parameters N = 3, a j = b j ≡ 1, ω j ≡ 0, j = 1, . . . , 3.$Theorem 3 is proven in Section 5.2 by the method of moments using a nontrivial new identity about modified Bessel functions, cf. Theorem 4 below. However, this proof is, in a sense, non-constructive. In what follows, we give an independent direct and constructive proof of Theorem 3 which reveals connections to ergodic theory.

Our goal will be to show Proposition 6. Let β > 0 be any irrational number, and let U 1 , U 2 ∼ U [0, 2π] be independent random variables. Then

$cos(X b ) + cos(βX b ) + cos((1 + β)X b ) d ---→ b→∞ cos(U 1 -U 3 ) + cos(U 3 -U 2 ) + cos(U 2 -U 1 ),$where U 3 is an arbitrary random variable independent of U 1 and U 2 .

The next main statement bears the spirit of Weyl's uniform distribution theory, cf. [[39,](#b38)[31,](#b30)[24]](#b23), thus connecting Proposition 6 to ergodic theory: Proposition 7. Let β > 0 be an irrational number. Then,

$(X b , βX b ) mod 2π d ---→ b→∞ (U 1 , U 2 ), (19$$)$where U 1 , U 2 ∼ U [0, 2π] are independent random variables.

Its proof via the method of moments can be found in Section 5.3. By Proposition 7 and the continuous mapping theorem, we arrive at

$(X b , βX b , (1 + β)X b ) mod 2π d ---→ b→∞ (U 1 , U 2 , U 1 + U 2 ) mod 2π.$The conditional distribution below (when U 3 is given) equals

$((U 1 -U 3 , U 2 + U 3 ) mod 2π) |U 3 d = (U 1 , U 2 ). (20$$)$Since the right-hand side of ( [20](#formula_54)) is independent of U 3 , identity (20) holds also unconditionally. Then

$(U 1 , U 2 , U 1 + U 2 ) mod 2π d = (U 1 -U 3 , U 2 + U 3 , (U 1 -U 3 ) + (U 2 + U 3 )) mod 2π = (U 1 -U 3 , U 2 + U 3 , U 1 + U 2 ) mod 2π d = (U 1 -U 3 , 2π -U 2 + U 3 , U 1 + 2π -U 2 ) mod 2π d = (U 1 -U 3 , -U 2 + U 3 , U 1 -U 2 ) mod 2π,$where we used the obvious relation

$U 2 d = 2π -U 2 .$Using the continuous mapping theorem once again, we finally get

$cos(X b ) + cos(βX b ) + cos((1 + β)X b ) d ---→ b→∞ cos(U 1 ) + cos(U 2 ) + cos(U 1 + U 2 ) d = cos(U 1 -U 3 ) + cos(U 3 -U 2 ) + cos(U 2 -U 1 ),$which finishes the constructive proof of Proposition 6.

## Auxiliary results for modified Bessel functions

Results in this section are instrumental to prove Proposition 5 and Theorem 3. However, they may be also of independent interest (especially Theorem 4 below) since they state some fundamental identities about modified Bessel functions.

For convenience, introduce the notation a k := µ k (T * ), k ∈ N 0 , where the sequence µ(T * ) was given in [(11)](#b10).

Using Vandermonde's identity [[2]](#b1), rewrite a k for every k ∈ N 0 in the following way:

$a k = k k 1 =0 k-k 1 k 2 =0 k k 1 , k 2 , k -k 1 -k 2 2 = k k 1 =0 (k!) 2 (k 1 !) 2 k-k 1 k 2 =0 1 (k 2 !) 2 ((k -k 1 -k 2 )!) 2 • ((k -k 1 )!) 2 ((k -k 1 )!) 2 = k k 1 =0 (k!) 2 (k 1 !) 2 ((k -k 1 )!) 2 k-k 1 k 2 =0 k -k 1 k 2 2 = k k 1 =0 k k -k 1 2 2(k -k 1 ) k -k 1 = k n=0 k n 2 2n n .(21)$The sequence a = {a k } k∈N 0 has number A002893 in the On-Line Encyclopedia of Integer Sequences [[35]](#b34). The following result was communicated to us by Vladeta Jovovic:

$Proposition 8. It holds ∞ k=0 a k x k (k!) 2 = ∞ k=0 x k (k!) 2 3 = I 3 0 2 √ x , x ∈ C.(22)$Our independent proof will be given in Section 5.1. This implies the following form of exponential generating functions of the sequence a and its subsequences containing only terms of even or odd order:

$Corollary 1. For arbitrary x ∈ C, it holds ∞ k=0 a k x k k! = ∞ 0 I 3 0 2 √ xt e -t dt, (23$$) ∞ k=0 a 2k x 2k (2k)! = 1 2 ∞ 0 I 3 0 2 √ xt + I 3 0 2i √ xt e -t dt, (24$$) ∞ k=0 a 2k+1 x 2k+1 (2k + 1)! = 1 2 ∞ 0 I 3 0 2 √ xt -I 3 0 2i √ xt e -t dt.(25)$The following beautiful identity finishes the line of our results: 

## Local weak convergence of graphene and fullerenes

In this section, we explain the difficulties arising in the proof of Conjecture 1.

## Working with duals: triangulations with degree constraints

It is easily seen that the local weak convergence of a sequence of 3-connected planar graphs is equivalent to the local weak convergence of the sequence of its duals; we recall that the dual G ′ of a planar graph G has nodes representing the facets of G, with two nodes being connected by an edge in G ′ if and only if their facets in G have a common edge. The following paragraphs will only deal with the local weak convergence of the duals of fullerenes, which are triangulations with degree constraints. Every fullerene F n has exactly 12 pentagonal faces (and m = n /2 -10 hexagonal faces), so its dual T m has 12 nodes with degree 5 and m with degree 6; moreover, each face of T m is a triangle, since fullerenes are 3-regular. In summary, the set of dual graphs of fullerenes is precisely the set of sphere triangulations with 12 nodes of degree 5 and the rest of degree 6; they must also be 3-connected. We simply call these triangulations f-triangulations. Remark 4. Unlike sphere triangulations with no constraints on the degree, the number F (m) of f-triangulations with m vertices of degree 6 is not amenable to classical analytical methods like the ones worked out by Tutte. Indeed, in the celebrated paper [[36]](#b35), William Thurston proved that F (m) has order m 9 using deep geometric arguments, but no explicit formula is known. The best bounds for this limit known to the authors are presented in [[34]](#b33), which are direct consequences of [[23]](#b22):

$lim inf m→∞ F (m) m 9 = 809 2 15 • 3 13 • 5 2 , lim sup m→∞ F (m) m 9 = 809ζ(9) 2 15 • 3 13 • 5 2 ,$where ζ(9) = 1.002008 . . . is the value of the Riemann zeta function.

## The weak limit of triangulations

We now fix a sequence {T m } of random f-triangulations.

Since the set of graphs with uniformly bounded degree is a precompact subset in the set of rooted graphs endowed with the local distance, see [[10]](#b9), the sequence {T m } has weak limits. Upon extracting a subsequence, we can suppose it has a local weak limit, which is a random rooted graph (G, o). This infinite graph should have the following properties: (i) the root should have degree 6 or 5; (ii) (G, o) should be unimodular, as every local weak limit of graphs.

It turns out that any weak limit of triangulations has a mean degree of exactly 6 at the root; more precisely, E[deg G (o)] = 6, see [[4]](#b3). Consequently, if (G, o) is a weak limit of a sequence of triangulations, the degree of the root is almost surely equal to 6. By a standard argument using unimodularity ( [[5]](#b4)), the degree of all vertices in G must be 6. In other words, any weak limit of f-triangulations must be an infinite 6-regular triangulation. One example is the dual of the planar hexagonal lattice H. However, H is not the unique infinite 6-regular planar triangulation: any folding of H would have the same property. Yet, there is only one unimodular 6-regular infinite triangulation of the plane with only one topological end, and it is H; hence, proving Conjecture 1 is reduced to proving that no weak limit of f-triangulations can have more than one topological end.

Remark 5. (i) It is possible to construct a sequence of f-triangulations that converges towards some folding of H; in chemistry, these structures are known as carbon nanotubes. Conjecture 1 implies that these structures are rare in regard to the whole set of f-triangulations.

(ii) Most generating algorithms, like Buckygen [[17]](#b16), which is the most efficient known complete algorithm, or the approach of Buchstaber and Erokhovets in [[18]](#b17), use a hierarchical trial-and-error approach. By applying carefully chosen finite sequences of expansion and reduction operations to the dodecahedron (the smallest fullerene) and C 28 , ultimately generates the entire set of fullerenes for a given number of vertices. However, not every sequence of operations leads to a (new) fullerene. Therefore, the practical construction of a uniformly distributed sample among all fullerenes with n vertices is a non-trivial problem.

## Isoperimetric properties of triangulations

The proof of the one-endedness of weak limit of planar graphs usually proceeds by contradiction, as demonstrated in the seminal argument of Corollary 3.4 in [[8]](#b7).

Let us denote (T, o) as the weak limit of {T m }, and suppose that the probability of (T, o) having two distinct topological ends is ε > 0. This implies that, for some fixed integer l, with probability ε, there is a closed path of finite length l such that T with this path removed has two unbounded connected components. According to [(4)](#b3), this leads to the following statement: there exists a sequence {c j } j∈N 0 with c j → ∞ as j → ∞, and a fixed integer l such that

$|E(m, l, c j )| |{f-triangulations of size m}| ---→ n→∞ 0, (27$$)$where |A| denotes the cardinality of a set A, and E(m, l, c) represents the set of f-triangulations with a closed path of length l and such that T deprived of this path has two connected components of size greater than c. One can think of E(m, l, c) as graphs with a bottleneck.

Remark 6. The isoperimetric inequality from [[7]](#b6) implies that if a fullerene has a bottleneck path of length l and c j > l 2 /12, then both connected components of the fullerene deprived of the path must have at least one pentagon. It is worth mentioning that in general, the isoperimetric inequality mentioned above fails for triangulations allowed to have degrees strictly smaller than 5 (In Remark 5 we mention the existence of f-triangulations with an arbitrary small isoperimetric constant).

To prove [(27)](#b26), a classical argument is needed, similar to the one in [[8]](#b7). Let us denote by A(m, l, p) the set of all planar graphs with m vertices, in which all faces are triangles except one which must have l faces, and in which all the internal nodes have degree 6 except exactly p having degree 5; then,

$E(m, l, c) ≤ p 1 +p 2 ≤12 m-c k=c A(k, l, p 1 )A(m -k, l, p 2 ).$For triangulations without degree constraints, estimates for the number of triangulations with a nontriangular face were available thanks to Tutte's works; but, this is not the case when degree constraints are added. In conclusion, no efficient bound for A(k, l, p) is known, and we could not extract it from Thurston's paper.

## Proofs

We start proving statements about Bessel functions formulated in Section 3.3.

## Results for modified Bessel functions

Proof of Proposition 8:

Proof. By the convolution formula for two infinite series, it holds for any two complex sequences {a k } k∈N 0 ,

${b k } k∈N 0 that ∞ k=0 a k x k • ∞ k=0 b k x k = ∞ k=0 c k x k , where c k := k n=0 a k-n b n . Hence, it holds ∞ k=0 x k (k!) 2 2 = ∞ k=0 1 (k!) 2 x k • ∞ k=0 1 (k!) 2 x k = ∞ k=0 c k x k = ∞ k=0 1 (k!) 2 2k k x k , since c k = k n=0 1 ((k -n)!) 2 • 1 (n!) 2 • (k!) 2 (k!) 2 = 1 (k!) 2 k n=0 k n 2 = 1 (k!) 2 2k k .$We can compute the middle term in [(22)](#b21) analogously:

$∞ k=0 x k (k!) 2 3 = ∞ k=0 x k (k!) 2 2 • ∞ k=0 x k (k!) 2 = ∞ k=0 x k (k!) 2 2k k • ∞ k=0 x k (k!) 2 = ∞ k=0 d k x k = ∞ k=0 a k x k (k!) 2 ,$where

$d k = k n=0 1 ((k -n)!) 2 2(k -n) k -n 1 (n!) 2 • (k!) 2 (k!) 2 = 1 (k!) 2 k n=0 k k -n 2 2(k -n) k -n = 1 (k!) 2 a k .$The last equality holds due to [(21)](#b20). The second equation of ( [22](#formula_60)) holds due to the definition of the modified Bessel function of first order.

## Proof of Corollary 1:

Proof. Using formula [(22)](#b21) and the identity

$∞ 0 t k k! e -t dt = 1, k ∈ N 0 yields ∞ k=0 x k k! a k = ∞ 0 ∞ k=0 (xt) k (k!) 2 a k e -t dt = ∞ 0 I 3 0 2 √ xt e -t dt,$where we interchanged the order of the sum and the integral above. This proves the relation [(23)](#b22).

To show ( [24](#formula_62)) and ( [25](#formula_63)), notice that

$∞ 0 I 3 0 2 √ xt e -t dt = ∞ k even x k k! a k + ∞ k odd x k k! a k , ∞ 0 I 3 0 2 √ -xt e -t dt = ∞ k even x k k! a k - ∞ k odd x k k! a k .$Summing up the left-and the right-hand sides of the above relations and dividing by two yields

$∞ k even x k k! a k = 1 2 ∞ 0 I 3 0 2 √ xt + I 3 0 2i √ xt e -t dt, ∞ k odd x k k! a k = 1 2 ∞ 0 I 3 0 2 √ xt -I 3 0 2i$√ xt e -t dt, which finishes the proof.

## Proof of Theorem 4:

Proof. Rewrite the statement (26) in a more convenient way by taking e 3x/2 to the right-hand side and evaluating the whole expression at 2x:

$n∈Z I 3 n (2x) = ∞ 0 I 3 0 2 √ xt e -t-3x dt. (28$$)$The main idea of this proof is to show that both sides of (28) are the unique solution of the initial value problem A x u(x) = 0, subject to the initial conditions:

$u(0) = 1, D x u(x)| x=0 = 0, D 2 x u(x) x=0 = 6.$To obtain the differential operator A x , the Wolfram Mathematica package HolonomicFunction, V. 1.7.3 [[29,](#b28)[30]](#b29) is available.

Step 1. We obtain the annihilator for the right-hand side of [(28)](#b27). The command

$ann = Annihilator[Integrate[Exp[-3x -t]BesselI[0, 2 Sqrt[xt]] 3 , {t, 0, Infinity}], Der[x]]$yields the annihilator

$A x = x 2 D 3 x -x 2 -3x D 2 x -24x 2 + 2x -1 D x -36x 2 + 24x ,(29)$where D x = ∂/∂x represents the differential operator with respect to x.

Step 2. We first see that the left-hand side of (

$= n∈Z I 3 n (2x),28), b(x)$exists. Since for n ∈ Z,

$I n (2x) = ∞ m=0 x n+2m m!Γ(n + m + 1) , I -n (2x) = I n (2x), |I n (2x)| ≤ I n (2|x|),$we have for n ≥ 0,

$|I n (2x)| ≤ |x| n n! ∞ m=0 |x| 2m m! = |x| n n! e |x| 2 , |I 3 n (2x)| ≤ |x| 3n n! e 3|x| 2(31)$and hence ( [28](#formula_74)) is bounded above by |b(x)| ≤ 2e |x| 3 +3|x| 2 , x ∈ C. To show that A x is the annihilator for b(x), we use the telescoping method. The command

${ann, Qn} = Simplify[CreativeTelescoping[BesselI[n, 2x] 3 , S[n] -1, Der[x]]] yields A x I n (2x) 3 -g n+1 (x) + g n (x) = 0,$where A x is the same operator given in (29) and

$g n (x) = Q x,n I 3 n (2x) with Q x,n = 1 8 D x 4n 2 + n(25 -12x) + 8x(2x -1) + 1 8 D 2 x (x(25n -4x)) - 3 7n 3 + 4nx(21x + 1) + 48x 3 8x + 24x 2 S n ,$where S n is the shift operator S n f (n) = f (n + 1). Applying the three-term relation

$nI n (2x) = x(I n-1 (2x) -I n+1 (2x)),$g n (x) is simplified as

$g n (x) = 3xn -3 I n-1 (2x) 8n 3 xI 2 n-1 (2x) + n(n 3 -4n 2 x + 16x 3 )I n-1 (2x)I n (2x) + n 2 (n 2 -24x 2 + n(4x -1))I 2 n (2x) .$By [(31)](#b30), we have lim n→∞ g n (x) = 0, and hence

$∞ n=-∞ A x I 3 n (2x) = lim n,n ′ →∞ n ′ m=-n A x I 3 m (2x) = lim n,n ′ →∞ (-g n ′ +1 (x) + g -n (x)) = 0(32)$for each x ∈ C. Next, we will see that

$A x ∞ n=-∞ I 3 n (2x) = ∞ n=-∞ A x I 3 n (2x).(33)$Recall that each term of A x is of the form

$x j D k x , D x = ∂/∂x. It suffices to show that D k x ∞ n=-∞ I 3 n (2x) = ∞ n=-∞ D k x I 3 n (2x).(34)$For h ̸ = 0, let ∆ h x f = (f (x + h) -f (x))/h. Then, by checking the absolute convergence, it holds

$(∆ h x ) k ∞ n=-∞ I 3 n (2x) = ∞ n=-∞ (∆ h x ) k I 3 n (2x),$and because there exists

$F k n (x) such that 1 sup |h|<ε |(∆ h x ) k I 3 n (2x)| ≤ F k n (x), ∞ n=-∞ F k n (x) < ∞,$by the dominated convergence we have lim h→0

$(∆ h x ) k ∞ n=-∞ I 3 n (2x) = ∞ n=-∞ lim h→0 (∆ h x ) k I 3 n (2x).$That is, [(34)](#b33), and hence (33) holds. Now, by combining ( [33](#formula_88)) and (32), we establish

$A x ∞ n=-∞ I 3 n (2x) = 0, x ∈ C.$Step 3. Here we note that the left-and right-hand sides of ( [28](#formula_74)) are entire functions. Let Ω ∋ 0 be a bounded region, e.g., Ω = {x ∈ C | |x| ≤ 1}. The convergence in ( [30](#formula_80)) is uniform on Ω, the limit b 3 is analytic on Ω as well (Weierstrass's theorem, [[3]](#b2)). Moreover, the limit function b(x) has an annihilator A x whose possible singularities are x = 0 and ∞ (since the coefficient of the derivative of the highest degree is x 2 ). Hence, b(x) is an entire function whose singularity is x = ∞ only. The right-hand side of ( [28](#formula_74)) is also an entire function.

$(x) = ∞ n=-∞ I n (2x)$Step 4. We show that both sides of (28) coincide at least as a point up to the second derivatives. If A x is the annihilator for the analytic function [9](#formula_17)) and [(31)](#b30).

$g(x) := ∞ j=0 c j x j , 1 For example, when k = 1, |∆ h x I 3 n (2x)| = 6|In(2(x + θh))| 2 | İn(2(x + θh))| ≤ 6|In(2(|x| + 1))| 2 || İn(2(|x| + 1))| =: F 1 n (x), and ∞ n=-∞ F 1 n (x) < ∞ by ($the coefficients have to satisfy the recurrence relation c j = 1 j 3 (j -1)jc j-1 + 24(j -1)c j-2 + 36c j-3 , j ∈ N 0 .

Therefore, once g(0) = c 0 , g ′ (0) = c 1 , g ′′ (0) = 2c 2 are given, the whole sequence {c j } j∈N 0 is determined uniquely. To prove [(28)](#b27), it remains to show that the initial values of its left-and right-hand sides as well as their first two derivatives at x = 0 coincide. By I n (0) = 1(n = 0) and the derivative formula [(9)](#b8), one gets n∈Z

$I 3 n (2x) x=0 = n∈Z I 3 n (0) = 1, D x n∈Z I 3 n (2x) x=0 = n∈Z 6I 2 n (0)I n+1 (0) = 0, D2$x n∈Z

$I 3 n (2x) x=0 = n∈Z 12I n-1 (0)I 2 n (0)I (0) + 12I n (0)I 2 n+1 (0) + 6I 3 n (0) + 6I 2 n (0)I n+2 (0) = 6.$On the other hand, it is easy to see that

$f (t; 0) = e -t , D x f (t; 0) = 3e -t (t -1), D 2 x f (t; 0) = 3 2 e -t (5t 2 -12t + 6),$and, hence

$∞ 0 f (t; 0) = 1, ∞ 0 D x f (t; 0) = 0, ∞ 0 D 2 x f (t; 0) = 6,$which proves the claim.

## Densities and characteristic functions of H and T

Proof of Proposition 4:

Proof. For k ∈ N, Proposition 2 and Proposition 3 imply that

$µ 2k (H) = R x 2k f X (x) dx.(35)$Next, we need to adjust f X such that (35) also holds for odd orders 2k + 1, k ∈ N 0 . Since µ 2k+1 (H) = 0, the corresponding density has to be symmetric. Therefore, we expand the support of f X onto the whole real line by replacing x by its absolute value. Further, we normalize the density dividing it by 2. It follows immediately that f H is a density, and its k th moment coincides with µ k (H) for k ∈ N. Due to Proposition 1, the support of f H is the interval [-3, -3]. Thus, the distribution of H is uniquely identified by its moment sequence with density f H , cf. e.g., [[27]](#b26).

Using the relationship µ k (T * ) = µ 2k (H), k ∈ N 0 , and changing variables x → √ z we get

$µ k (T * ) = ∞ 0 x 2k f H (x) dx = ∞ 0 x 2k ∞ 0 txJ 0 (tx)J 3 0 (t) dt dx = ∞ 0 z k 2 √ z ∞ 0 t √ zJ 0 (t √ z)J 3 0 (t) dt dz = ∞ 0 z k ∞ 0 1 2 tJ 0 (t √ z)J 3 0 (t) dt dz.$It is easy to see that f T (z) := 1 2 ∞ 0 tJ 0 (t √ z)J 3 0 (t) dt is a density with support [0, 9] and k th moments µ k (T * ) for k ∈ N. Hence, f T is the distribution density of T . By the same change of variables, both expressions for f H and f T via 2 F 1 follow directly from Proposition 1.

## Proof of Proposition 5:

Proof. Let us prove relation [(13)](#b12) by calculating the generating function

$G H (x) := ∞ k=0 a k (2k)! x 2k , x ∈ C,$of the moment sequence µ(H) and then setting x = is. Using the relation

$1 0 t k (1 -t) k dt = (k!) 2 (2k + 1)! , k ∈ N 0 ,$and formula [(22)](#b21), we write

$G H (x) = ∞ k=0 a k (k!) 2 (k!) 2 (2k)! x 2k = ∞ k=0 a k (k!) 2 (k!) 2 (2k + 1)! d dx x 2k+1 = d dx x 1 0 ∞ k=0 a k (k!) 2 t k (1 -t) k x 2k dt = d dx x 1 0 I 3 0 2x t(1 -t) dt ,$where we exchanged the order of the sum, integral and derivative. Relation ( [14](#formula_36)) follows from Corollary 1, formula [(23)](#b22) after the substitution t = -log y in the integral and putting x = is.

## Approximation of random eigenvalues of T

Now, we can show our Theorem 3.

Proof of Theorem 3. In order to prove the claim we notice that the support of 3 + 2Y b is a subset of [0, 9] for every b ∈ R. Hence, the convergence in distribution as b → +∞ is equivalent to the convergence of moments of 3 + 2Y b to those of T , see e.g., [[27]](#b26). For simplicity, let us consider even moments only. The following computation works analogously for odd moments with some changes presented at the end of this proof.

Before we show

$E(3 + 2Y b ) 2k ----→ b→+∞ ET 2k = k 1 +k 2 +k 3 =2k 2k k 1 , k 2 , k 3 2 , k ∈ N 0 ,$let us state two observations. First, for k ∈ N 0 recall the well-known formulae

$cos k (x) =          1 2 k k k/2 + 1 2 k-1 k 2 -1 n=0 k n cos((k -2n)x), if k is even, 1 2 k-1 k-1 2 n=0 k n cos((k -2n)x), if k is odd.(36)$Second, for m 1 , m 2 , m 3 ∈ N 0 the following two cases hold. 

$m 2 β + m 3 (1 + β))b) m 1 -m 2 β + m 3 (1 + β) + sin((m 1 + m 2 β -m 3 (1 + β))b) m 1 + m 2 β -m 3 (1 + β) + sin((m 1 -m 2 β -m 3 (1 + β))b) m 1 -m 2 β -m 3 (1 + β) + sin((m 1 + m 2 β + m 3 (1 + β))b) m 1 + m 2 β + m 3 (1 + β) = 0. (37$$)$Case 2:

$For m := m 1 = m 2 = m 3 ̸ = 0, we get lim b→∞ 1 b b 0 cos(m 1 x) cos(m 2 βx) cos(m 3 (1 + β)x) dx = lim b→∞ 1 4b b + sin(2mb) 2m + sin(2βmb) 2βm + sin(2(1 + β)mb) 2(1 + β)m = 1 4 .(38)$Due to the binomial theorem it holds

$lim b→∞ E(3 + 2Y b ) 2k = lim b→∞ E   2k k 1 =0 2k k 1 3 k 1 2 2k-k 1 Y 2k-k1 b   = 2k k 1 =0 2k k 1 3 k 1 2 2k-k 1 lim b→∞ EY 2k-k 1 b ,$for k ∈ N 0 . Next, we consider the limit separately. We apply the multinomial theorem to Y 2k-k 1 b and get

$lim b→∞ EY 2k-k 1 b = lim b→∞ E(cos X b + cos(βX b ) + cos((1 + β)X b )) 2k-k 1 = lim b→∞ E   2k-k 1 k 2 =0 2k-k 1 -k 2 k 4 =0 2k -k 1 k 2 , k 4 , 2k -k 1 -k 2 -k 4 • (cos X b ) k 2 (cos(βX b )) k 4 (cos((1 + β)X b )) 2k-k 1 -k 2 -k 4 = 2k-k 1 k 2 =0 2k-k 1 -k 2 k 4 =0 2k -k 1 k 2 , k 4 , 2k -k 1 -k 2 -k 4 • lim b→∞ 1 b b 0 (cos x) k 2 (cos(βx)) k 4 (cos((1 + β)x)) 2k-k 1 -k 2 -k 4 dx.$Due to [(36)](#b35), [(37)](#b36), [(38)](#b37) we need to consider both cases when all three k 1 , k 2 , k 4 are either even or odd. Otherwise, the limit of the integral is zero. In the case of even k j , it holds

$lim b→∞ 1 b b 0 (cos x) k 2 (cos(βx)) k 4 (cos((1 + β)x)) 2k-k 1 -k 2 -k 4 dx = 1 2 2k-k 1 k 2 k 2 /2 k 4 k 4 /2 2k -k 1 -k 2 -k 4 2k-k 1 -k 2 -k 4 2 + 1 2 2k-k 1 -1 k 2 2 -1 n=0 k 2 n k 4 k 4 -k 2 2 + n 2k -k 1 -k 2 -k 4 2k-k 1 -2k 2 -k 4 2$+ n .

In the case of odd k j , we get

$lim b→∞ 1 b b 0 (cos x) k 2 (cos(βx)) k 4 (cos((1 + β)x)) 2k-k 1 -k 2 -k 4 dx = 1 2 2k-k 1 -1 k 2 -1 2 n=0 k 2 n k 4 k 4 -k 2 2 + n 2k -k 1 -k 2 -k 4 2k-k 1 -2k 2 -k 4 2$+ n .

In total, it follows that

$lim b→∞ E(3 + 2Y b ) 2k = k 1 +k 2 +k 3 +k 4 =k 3 2k 1 2k 2k 1 , 2k 2 , 2k 3 , 2k 4 2k 2 k 2 2k 3 k 3 2k 4 k 4 =:r k + 2 k 1 +k 2 +k 3 +k 4 =k 3 2k 1 2k 2k 1 , 2k 2 , 2k 3 , 2k 4 k 2 -1 n=0 2k 2 n 2k 3 k 3 -k 2 + n 2k 4 k 4 -k 2 + n =:s k + 2 k 1 +k 2 +k 3 +k 4 =k-2 3 2k 1 +1 2k 2k 1 +1, 2k 2 +1, 2k 3 +1, 2k 4 +1 k 2 n=0 2k 2 +1 n 2k 3 +1 k 3 -k 2 +n 2k 4 +1 k 4 -k 2 +n =:t k ,$where these sums run over indices k 1 , . . . , k 4 ∈ N 0 : k 1 + . . . + k 4 = k or k -2. Here, we tacitly use the convention that the binomial coefficient a b = 0 whenever a = 0 or b < 0. Next, we compute the generating functions of the sequences r k , s k , t k separately. Note that

$∞ k=0 3 2k x k (2k)! = cosh 3 √ x and ∞ k=0 x k (k!) 2 = I 0 2 √ x .$Hence, one gets

$H 1 (x) := ∞ k=0 x k (2k)! r k = cosh 3 √ x I 3 0 2 √ x .$Further, recall that for a :

$= k 2 -n it holds ∞ k=|a| x k (k -a)!(k + a)! = I 2a 2 √ x and ∞ n=0 x n n!(n + 2a)! = I 2a 2 √ x x -a .$This yields

$H 2 (x) := ∞ k=0 x k (2k)! s k = 2 cosh(3 √ x) ∞ k 2 =0 k 2 -1 n=0 x k 2 n!(2k 2 -n)! I 2 2(k 2 -n) 2 √ x = 2 cosh(3 √ x) ∞ n=0 ∞ k 2 =n+1 x k 2 n!(2k 2 -n)! I 2 2(k 2 -n) 2 √ x = 2 cosh 3 √ x ∞ a=1 ∞ n=0 x n n!(n + 2a)! x a I 2 2a (2 √ x) = 2 cosh 3 √ x ∞ a=1 I 3 2a 2 √ x .$Next define a := 2(k 2 -n) + 1, and note that

$∞ k 1 =0 3 2k 1 +1 x k 1 (2k 1 + 1)! = sinh(3 √ x)x -1/2 , ∞ k 3 =max{a,-a-1} x k 3 (k 3 -a)!(k 3 + a + 1)! = I 2a-1 (2 √ x)x -1/2 ,$as well as

$∞ n=0 1 n!(n + a)! x n = I a (2 √ x)x -a/2 .$Hence, we get

$H 3 (x) := ∞ k=0 x k (2k)! t k = 2 sinh(3 √ x)x -1/2 ∞ k 2 =0 k 2 n=0 x k 2 n!(2k 2 -n + 1)! I 2 2(k 2 -n)-1 (2 √ x)x = 2 sinh(3 √ x)x -1/2 ∞ n=0 ∞ k 2 =n x k 2 n!(2k 2 -n + 1)! I 2 2(k 2 -n)-1 (2 √ x)x = 2 sinh(3 √ x)x -1/2 ∞ k ′ 2 =0 ∞ n=0 x n n!(n + 2k ′ 2 + 1)! x k ′ 2 I 2 2k ′ 2 +1 (2 √ x)x = 2 sinh(3 √ x) ∞ k ′ 2 =0 I 3 2k ′ 2 +1 (2 √ x),$where k ′ 2 := k 2 -n. Finally, we have

$H(x) =H 1 (x) + H 2 (x) + H 3 (x) = cosh 3 √ x I 3 0 2 √ x + 2 cosh 3 √ x ∞ k=1 I 3 2k 2 √ x + 2 sinh 3 √ x ∞ k=1 I 3 2k-1 2 √ x = cosh 3 √ x n∈Z I 3 2n 2 √ x + sinh 3 √ x n∈Z I 3 2n+1 2 √ x . It remains to prove that ∞ k=0 x k (2k)! a 2k = H(x), or, equivalently, ∞ k=0 x 2k (2k)! a 2k = H x 2 .$Using representation (24) from Corollary 1 and Theorem 4 yields Due to [(36)](#b35), [(37)](#b36), [(38)](#b37), it follows that It remains to prove that ∞ k=0

$∞ k=0 x 2k (2k)! a 2k = 1 2 ∞ 0 I 3 0 2 √ xt e -t dt + 1 2 ∞ 0 I 3 0 2 √ -xt e -t dt (26) = 1 2 e 3x n∈Z I 3 n (2x) + 1 2 e -3x n∈Z I 3 n (-2x) = 1 2 e 3x n∈Z I 3 2n (2x) + 1 2 e 3x n∈Z I3$$lim b→∞ E(3 + 2Y b ) 2k+1 = k k 1 =0 k-k 1 k 2 =0 k 3 k 4 =0 3 2k 1 +1 2k + 1 2k 1 + 1 k k 1 , k 2 , k 4 , k 3 -k 4 2 2k k 2k 1 k 1 -1 =: r k + 2 k k 1 =0 k-k 1 k 2 =0 k 3 -1 k 4 =0 k 2 n=0 3 2k 1 2k+1 2k 1 2(k-k 1 )+1 2k 2 +1,2k 4 +1,2(k 3 -k 4 )-1 2k 2 +1 n 2k 4 +1 k 4 -k 2 +n 2(k 3 -k 4 )-1 k 3 -k 2 -k 4 -1+n =: s k + 2 k k 1 =0 k-k 1 k 2 =0 k 3 k 4 =0 k 2 -1 n=0 3 2k 1 +1 2k+1$x 2k+1 (2k + 1)! a 2k+1 = H x 2 .

Formula ( [25](#formula_63)) and the identity (26) yield This can be confirmed using relations ( [36](#formula_106))-( [38](#formula_109)) similar to the proof of Theorem 3.

## Summary

This paper investigates the distribution of a randomly chosen eigenvalue H (T , respectively) of the adjacency matrix of two infinite regular lattices on the plane: hexagonal lattice (graphene) and its dual, the triangulation of the plane. Explicit formulae for the probability densities, moment generating functions, and characteristic functions have been obtained. A connection to symmetric random walks on these lattices as well as planar random flights was established. We presented a direct simulation approach for generating random eigenvalues T and H. Additionally, we provide an approximation theorem, which approximates these eigenvalues by a simple function involving the sum of three cosines of a uniformly distributed random variable with irrational frequencies. It was also shown how this approximation is related to the ergodic theory. As a side effect of this research, a new identity for the series of third powers of modified Bessel functions I n (•), n ∈ Z, was proven. This series can be thus expressed as an integral of I 3 0 (•).

![Figure 1: Illustration of the relationship between H and T . The set V (H) consists of both blue and redcolored vertices, whereas V (T ) contains only the red-colored ones. Edges of H and T are colored in black and green, respectively.]()

![[19], Theorem 3). For k ∈ N 0 it holds µ 2k (iφ 1 + e iφ 2 + e iφ 3 2k dφ 1 dφ 2 dφ 3 .]()

![Borwein et al. presented in [15, Theorem 2.1] a formula for the density of |W t | in case of a spatial random flight W in R d for arbitrary dimension d ≥ 2 and any number of steps t ∈ N. Let us formulate their result in our specific case d = 2, t = 3:]()

![Figure 2: Density functions f H (left) and f T (right) of the random eigenvalue H, T of the hexagonal lattice H and triangular lattice T * , respectively.]()

![61805 . . . to be the golden ratio. Since ϕ 2 -ϕ -1 = 0, it follows 1 + β = ϕ 2 . Hence, we simulateY b = cos(X b ) + cos(ϕX b ) + cos(ϕ 2 X b ),generating 10 5 realizations of a uniformly distributed random variable X b on the interval [0, b] for b = 1, 10, 10 2 , 10 5 . Then we compare the empirical density function of 3 + 2Y b with f T given in Proposition 4.]()

![Figure 3: Density f T (red line) and normalized histograms of simulated 3 + 2Y b (blue bars) for b = 1 (upper left), b = 10 (upper right), b = 10 2 (lower left), b = 10 5 (lower right) with sample size 10 5 and β = ϕ.]()

![For every x ∈ C, it holds e]()

![If m i ̸ = m j for (at least) one pair (i, j) ∈ {(1,1 x) cos(m 2 βx) cos(m 3 (1 + β)x) dx = limb→∞ 1 4b sin((m 1 -]()

![which finishes the proof of convergence in(16). Analogously, one gets in the odd caseE(3 + 2Y b ) 2k+1 ---→ b→∞ ET 2k+1 = k 1 +k 2 +k 3 =2k+1 2k + k ∈ N 0 .]()

![-k 2 -k 4 +n =: t k , where k 3 := kk 1 -k 2 .The generating functions of r k , s k , t k are given asH 1 (x) := ∞ k=0 x k+1/2 (2k + 1)! r k = sinh 3 √ ) := H 1 (x) + H 2 (x) + H 3 (x) = sinh 3]()

![) = H x 2 ,which finishes the proof of the odd case.Approximation(17) follows from (16) by the continuous mapping theorem taking distributional equality (12) into account.Proof of Proposition 7. Interpret independent random variables U 1 , U 2 ∼ U [0, 2π] as polar angles on a unit circle. Then convergence(19) is equivalent toe iX b , e iβX b d ---→ b→∞ e iU 1 , e iU 2 . (39)Taking the real and the imaginary parts of both sides of (39) leads to showing(cos(X b ), sin(X b ), cos(βX b ), sin(βX b )) d ---→ b→∞ (cos U 1 , sin U 1 , cos U 2 , sin U 2 ), or equivalently lim b→∞ Φ b (s, t, u, v) = I 0 ( s 2 + t 2 )I 0 ( u 2 + v 2 ), s, t, u, v ∈ R,whereΦ b (s, t, u, v) : = E[exp{s cos(X b ) + t sin(X b ) + u cos(βX b ) + v sin(βX b )}], I 0 ( s 2 + t 2 ) = E[exp{s cos U 1 + t sin U 1 }]are the corresponding characteristic functions. Now we check the convergence of moments. Noting thatΦ b (s, t, u, v) = j,k,l,m≥0 s j t k u l v m j!k!l!m! E[cos j (X b ) sin k (X b ) cos l (βX b ) sin m (βX b )]andI 0 ( s 2 + t 2 ) = m≥0 m even (s 2 + t 2 ) m/2 (m/2)!(m/2)!2 m = even s j t k ((j + k)/2)!(j/2)!(k/2)!2 j+k , it suffices to show that lim b→∞ E[cos j (X b ) sin k (X b ) cos l (βX b ) sin m (βX b )]!l!m! (j + k)/2)!(j/2)!(k/2)!((l + m)/2)!(l/2)!(m/2)!2 j+k+l+m , j, k, l, m even, 0, otherwise.]()

