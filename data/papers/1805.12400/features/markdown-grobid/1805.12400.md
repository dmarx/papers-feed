# Tropical Geometry of Phylogenetic Tree Space: A Statistical Perspective

## Abstract

## 

Phylogenetic trees are the fundamental mathematical representation of evolutionary processes in biology. They are also objects of interest in pure mathematics, such as algebraic geometry and combinatorics, due to their discrete geometry. Although they are important data structures, they face the significant challenge that sets of trees form a non-Euclidean phylogenetic tree space, which means that standard computational and statistical methods cannot be directly applied. In this work, we explore the statistical feasibility of a pure mathematical representation of the set of all phylogenetic trees based on tropical geometry for both descriptive and inferential statistics, and unsupervised and supervised machine learning. Our exploration is both theoretical and practical. We show that the tropical geometric phylogenetic tree space endowed with a generalized Hilbert projective metric exhibits analytic, geometric, and topological properties that are desirable for theoretical studies in probability and statistics and allow for well-defined questions to be posed. We illustrate the statistical feasibility of the tropical geometric perspective for phylogenetic trees with an example of both a descriptive and inferential statistical task. Moreover, this approach exhibits increased computational efficiency and statistical performance over the current state-of-the-art, which we illustrate with a real data example on seasonal influenza. Our results demonstrate the viability of the tropical geometric setting for parametric statistical and probabilistic studies of sets of phylogenetic trees.

## Introduction

Evolutionary relationships describing how organisms are related by a common ancestor are represented in a branching diagram known as a phylogenetic tree. Phylogenetic trees model many important and diverse biological phenomena, such as speciation, the spread of pathogens, and cancer evolution. Methodology to analyze phylogenetic datasets has been under active research for several decades for two important reasons. First, explicit computations directly on collections of phylogenetic trees are challenging due to high dimensionality in terms of a large number of leaves, a long evolutionary history, and an intricate branching pattern. Second, standard statistical methodologies are not directly applicable due to the non-Euclidean nature of the trees themselves as well as the set that they make up. Significant previous work addresses various classical statistical interests, however a fundamental breakthrough for quantitative studies on sets of trees emerged through studying the geometry of the set of all phylogenetic trees [(Billera et al., 2001)](#b14).

Referred to in the literature as BHV tree space-after the authors Billera, Holmes, and Vogtmannthe set of all phylogenetic trees is studied in a setting where each tree is represented as an individual point. The geometry is characterized by a unique geodesic between any two points; its length defines a metric on the space. Since its introduction in 2001, it has been actively studied in various wide-reaching domains, including algebraic geometry (e.g., [Devadoss and Morava, 2015)](#b19), category theory (e.g., [Baez and Otter, 2017)](#b8), computational biology (e.g., [Weyenberg and Yoshida, 2016)](#b61), and statistical genetics (e.g., [Nye et al., 2017)](#b43). Despite its indisputable significance, the BHV geometry nevertheless poses significant dataanalytic complications for both descriptive and inferential statistics and unsupervised and supervised machine learning. Although the non-Euclidean aspect of tree space cannot be avoided, considering an alternative approach from pure mathematics based on tropical geometry-a variant of algebraic geometry-alleviates some of these complications and is a promising alternative approach for probability-based statistics on sets of phylogenetic trees. The first formal connection between tropical geometry and mathematical phylogenetics arises in the space of phylogenetic trees in relation to a particular tropical algebraic variety [(Speyer and Sturmfels, 2004)](#b53). This coincidence has been further studied in theoretical research (e.g., [Ardila and Klivans, 2006;](#b7)[Manon, 2011)](#b41), however, its implication and potential in applied work remain largely understudied and untapped.

In this paper, we explore the tropical geometric perspective of phylogenetic tree space with the aim of enabling descriptive and inferential statistics as well as unsupervised and supervised machine learning. Specifically, we study the subspace of the tropical projective torus corresponding to the space of phylogenetic trees equipped with a generalized projective Hilbert metric, which we refer to as the tropical metric. We refer to this metric space as palm tree space (tropical tree space) and show that it satisfies fundamental assumptions to ensure that probabilistic and parametric statistical questions are valid and well-defined, which establishes the grounds for future development of parametric studies in the tropical geometric setting for phylogenetic trees. We give a concrete example of both a descriptive and inferential task in statistics: principal component analysis (PCA) and linear discriminant analysis (LDA), respectively. We study these tasks in the context of both simulated and real-world seasonal influenza data. Our real data application demonstrates that the tropical geometric approach exhibits improvements in computational efficiency and improved statistical performance over the BHV setting.

The remainder of this paper is organized as follows. In Section 2, we provide background and motivation for our study. In Section 3, we discuss properties of the tropical metric on the space of phylogenetic trees and formally define palm tree space. We study its geometry, topology, and analytic properties in relation to BHV space. We also give some examples of theoretical probability measures used in statistics and that are important in probability theory. In Section 4, we give examples of statistical techniques on palm tree space, including numerical experiments and an application to real data in both palm tree and BHV space. We close in Section 5 with a discussion, and some directions for future research.

## Background and Motivation

Phylogenetic trees are symbolic objects that model evolutionary divergence from a common ancestor. In computational biology, the reconstruction of a phylogenetic tree from an input of sequence alignment data (e.g., DNA and RNA) is a challenging problem; reconstruction methods are known to be highly sensitive to the input sequences (different genes or coding regions will give rise to different trees), measurement errors (alignment or sequencing errors), and noise typical to this type of biological data (e.g., [Leaché and Rannala, 2010)](#b36). This sensitivity naturally invites the question of how to compare trees, for example, arising from different reconstruction methods. Mathematically, comparing objects entails measuring the distance between them; in the context of phylogenetic trees, this gives rise to a tree space equipped with a metric between trees. One of the most significant challenges in computational work with phylogenetic trees as data objects is that their graphical structure gives rise to a non-Euclidean tree space.

In this section, we provide the mathematical background to phylogenetic trees from the pure mathematical perspective and the statistical motivation for studying this perspective.

## Defining Phylogenetic Trees

In what follows, we consider N ∈ N. A tree is an acyclic connected graph T = (V, E), defined by a set of vertices V and a set of edges E. An N -tree is a tree with N labeled terminal nodes called leaves. Edges connecting to leaves are called external edges, other edges are called internal edges. A binary N -tree is an N -tree with the following conditions on the degree of a vertex v ∈ V : if deg(v) = 2, then v is the root of the tree and it is unique; if deg(v) = 1, then v is a leaf; and if deg(v) = 3, then v is an internal vertex. A tree topology is the "shape" of the tree; it is a branching configuration of edges together with a leaf labelling scheme. There are (2N -3)!! binary tree topologies on N leaves [(Schröder, 1870)](#b51). A metric N -tree is a tree with zero or positive lengths on all edges; metric N -trees are also known as phylogenetic trees. We denote the space of phylogenetic trees with N leaves by T N .

A phylogenetic tree may be represented by all pairwise distances between leaves. Let w ij denote the distance between leaves i and j, given by the sums of edge lengths along the unique path between i and j. The N × N matrix W with entries w ij then represents a phylogenetic tree. Since W is symmetric with zeros along the diagonal, the upper-triangular portion of the matrix contains all of the unique information needed to specify a phylogenetic tree in terms of its pairwise distances. Thus W represents a phylogenetic tree as, in essence, a distance matrix. However, in order for the distance matrix W to represent a phylogenetic tree, the following additional condition must be satisfied.

Proposition 1. (Four-Point Condition [(Buneman, 1974, Theorem 1)](#), [(Maclagan and Sturmfels, 2015, Lemma 4.3.6)](#)). A distance matrix W represents a phylogenetic tree if it satisfies the conditions to be a metric and the maximum among the following Plücker relations is attained at least twice for 1 ≤ i < j < k < ℓ ≤ N :

$w ij + w kℓ , w ik + w jℓ , w iℓ + w jk ,(1)$or equivalently, that

$w ij + w kℓ ≤ max(w ik + w jℓ , w iℓ + w jk ) (2)$for all i, j, k, ℓ ∈ {1, 2, . . . , N }.

A distance matrix W satisfying the conditions of Proposition 1 is known as a tree metric. Note that tree metrics represent phylogenetic trees; these differ from metrics between trees. For W representing a phylogenetic tree (that is, satisfying the conditions in Proposition 1), we may also represent the upper triangular portion of the matrix in vector form by setting n := N 2 and defining the following map:

$W : T N → R n , W → w = (w 12 , w 13 , . . . , w 1N , w 23 , . . . , w 2N , . . . , w (N -1)N ),(3)$where the entries are ordered lexicographically.

Example 2. The tree metric w ∈ R 6 for the tree in Figure [1](#fig_0) expressed as a vector is (w P Q , w P R , w P S , w QR , w QS , w RS ). As a matrix W , it is

$    0 w P Q w P R w P S 0 w QR w QS 0 w RS 0     =     0 a + b a + c + d a + c + e 0 b + c + d b + c + e 0 d + e 0     .$The Plücker relations (1) associated with W are The four-point condition for trees may be further tightened to give rise to an important subclass of trees as follows.

$A := w P Q + w RS = a + b + d + e, B := w QR + w P S = a + b + 2c + d + e, C := w P R + w QS = a + b + 2c + d + e. Since P < Q < R < S,$Proposition 3 (Three-Point Condition [(Jardine et al., 1967;](#b31)[Maclagan and Sturmfels, 2015)](#b39)). A distance matrix W represents an ultrametric tree if it satisfies the conditions to be a tree metric and the maximum among w(i, j), w(i, k), w(j, k) is achieved at least twice for 1 ≤ i < j < k ≤ N , or equivalently, that w(i, k) ≤ max(w(i, j), w(j, k)) for all i, j, k ∈

$[N ].$Denote the space of all phylogenetic trees satisfying the three-point condition with N leaves by U N . Ultrametric trees are also equidistant trees; i.e., rooted trees where the distance from the root to every leaf is equal. Proposition 4. A phylogenetic tree T is an ultrametric tree if and only if T is equidistant.

Proof. For any two points X, Y on a tree, we denote by w(X, Y ) the length of the unique path connecting X and Y . Suppose a tree T is equidistant with root R. Then for any three leaves A, B, C, we have that w(R, A) = w(R, B) = w(R, C). Since R, A, B, C satisfies the four-point condition, the maximum among (1), w(R, A)+w(B, C), w(R, B)+w(A, C), and w(R, C)+w(A, B) is attained at least twice. Thus, the maximum among w(B, C), w(A, C), w(A, B) is also attained at least twice, satisfying the three-point condition, and T is therefore an ultrametric.

Conversely, suppose T is an ultrametric. Then there are finitely many leaves in T , so we can choose a pair of leaves A, B such that w(A, B) is maximal among all such pairs. Along the unique path from A to B, there is a unique point R such that w(R, A) = w(R, B). For any other leaf C, consider the distance w(R, C): Since the paths from R to A and B only intersect at R, the path from R to C intersects at least one of them only at R. Suppose without loss of generality that the path from R to A is such a path. Then

$w(A, C) = w(R, A)+w(R, C). Since w(A, C) ≤ w(A, B), we have w(R, C) ≤ w(R, B). If w(R, C) < w(R, B), then w(A, C) < w(R, A) + w(R, B) = 2w(R, B), and w(B, C) ≤ w(R, B) + w(R, C) < 2w(R, B), so the maximum among w(A, B), w(A, C), w(B, C) is w(A, C) = 2w(R, B)$and it is only attained once -a contradiction, since T was assumed an ultrametric. Hence w(R, C) = w(R, B), and R has equal distance to all leaves of T . Therefore T is equidistant with root R.

## Metrics on Tree Spaces: BHV Space

Various metrics between trees have been derived in biology. A notable class of metrics strives to retain the inner product property akin to Euclidean distance, which makes them popular due to their integrability into a wide range of statistical approaches, such as functional and nonparametric modeling. One metric from this class extensively used in biology is the Robinson-Foulds metric [(Robinson and Foulds, 1981)](#b48). This metric (and other inner-product distances between trees) is known to suffer from structural and interpretive errors. For example, many pairs of trees measure the same distance apart; also, large distances between trees, counterintuitively, do not necessarily indicate a disparity in ancestral heritage [(Steel and Penny, 1993)](#b55). Other commonly-occurring distances include the nearest neighbor interchange metric [(Waterman et al., 1976)](#b60), subtree transfer distance [(Allen and Steel, 2001)](#b3), and variational distance [(Steel and Székely, 2006)](#b56). For a detailed review of metrics between trees, see [Weyenberg and Yoshida (2016)](#b61); [St. John (2016)](#b54). A pioneering approach that bypasses difficulties and limitations of these metrics focuses on the geometry of tree space [(Billera et al., 2001)](#b14).

Specifically, the space of phylogenetic trees is modeled as a moduli space, where each point in the space represents a phylogenetic tree. Trees are expressed only by the lengths of their internal edges, which are recorded as entries in a vector of dimension N -2 since in a binary tree with N leaves, there are at most N -2 internal edges; see Figure [2](#fig_1) for an illustration. External edges are not considered, since taking them into account does not affect the geometry of the space: including external edges simply amounts to taking the product of tree space with an N -dimensional Euclidean space. A nonnegative Euclidean orthant R N -2 ≥0 is associated to each tree topology. BHV space may also be interpreted combinatorially: For each orthant, the link of the origin

$L N := (x 1 , . . . , x N -2 ) | i x i = 1 (4)$gives rise to a simplicial complex of dimension N -3 [(Billera et al., 2001)](#b14). BHV space is an infinite cone over L N . The (2N -3)!! orthants are grafted at right-angles to make up the tree space, which gives rise to a property of nonpositive curvature known as CAT [(0)](#b1). In CAT(0) spaces, there is a unique shortest path between any two points; here, this is the BHV geodesic. To compute BHV geodesics, first, the geodesic distance between two trees (represented by only internal edge lengths as in the original reference [(Billera et al., 2001)](#b14)) is computed, and then the external branch lengths are factored in to compute the overall geodesic distance between two trees in full generality (where external branch lengths are included, as opposed to the original reference [(Billera et al., 2001)](#b14)), by taking the differences between external branch lengths. Since each orthant is locally viewed as a Euclidean space, the shortest path between two points within a single orthant is a straight Euclidean line. The difficulty appears in establishing which sequence of orthants joining the two topologies contains the geodesic. In the case of four leaves, this can be readily determined using a systematic grid search, but such a search is intractable with larger trees. Currently, the fastest available algorithm to compute geodesic paths between any two points in this tree space has a time complexity of O(N 4 ) [(Owen and Provan, 2011)](#b45). The length structure of the BHV geodesic induces the BHV metric d BHV on this space. This setup has come to be known as BHV space T BHV N and is ubiquitous even in non-biological fields, including computer vision, combinatorics, and category theory. It has also been proposed as the definitive setting for computational studies on sets of phylogenetic trees [(Gavryushkin and Drummond, 2016)](#b27).

It turns out that BHV space poses considerable limitations for classical descriptive and inferential statistics. On the descriptive front, the convex hull of finitely many points in tree space with edges given by BHV geodesics is unbounded in dimension [(Lin et al., 2017)](#b37), so there exists no obvious subspace for projections and no lower dimensional representations of data. This is restrictive for classical dimensionality reduction and data visualization methods, such as principal component analysis (PCA). An important challenge in inferential statistics in BHV space concerns the Fréchet mean, which is a fundamental quantity in statistics: the Fréchet mean is the generalization of the classical arithmetic mean to arbitrary metric spaces; see also Section 3.5.1 further on. In BHV space, Fréchet means are sticky: the mean fails to be injective and "sticks" to lower dimensional strata [(Hotz et al., 2013)](#b30); see Example 5. Thus, perturbing points in a sample results in no change in the mean, meaning that exact parametric asymptotic results cannot be derived, which prohibits classical exact statistical inference.

Example 5. In Figure [3](#), we position three unit masses on the 3-spider as shown below, which is the stratified space of three R ≥0 rays joined at the origin. Two of the masses are at distance 1 from the origin, while the remaining mass is at distance a from the origin. This is precisely the BHV space of phylogenetic trees with three leaves and fixed external edge lengths. The position x of the barycenter (Fréchet mean) is calculated by minimizing 2(1 + x) 2 + (a -x) 2 . The solution is x = 0 for a < 2, and x = (a -2)/3 for a ≥ 2. The Fréchet mean tends to stick to lower-dimensional strata.

Sophisticated methods have been developed to bypass these difficulties: a locus of BHV Fréchet means has well-behaved dimensionality and serves as a suitable lower dimensional projective space (Nye et al., 2017), and a central limit theorem for BHV Fréchet means exists via a generalized delta method [(Barden et al., 2018)](#b9). Inferential techniques have also been proposed based on this generalized delta method strategy (e.g., [Willis, 2019;](#b62)[Willis and Bell, 2018)](#b63). These, and other proposed methods, are largely approximate, rather than exact statistical methods; additionally, they tend to be nonparametric, rather than parametric. These statistical challenges have spurred recent proposals of alternative tree spaces [(Garba et al., 2021)](#b26).

## Tropical Geometry and Phylogenetic Tree Space

In this work, we focus on the appearance of phylogenetic tree space in tropical geometry in groundbreaking work that formally connects the space of phylogenetic trees and the tropical Grassmannian [(Speyer and Sturmfels, 2004)](#b53). We now outline the connection between tropical geometry and phylogenetic tree space.

To do this, we return to the map W (3). Specifically, we would like to understand what the image of W is: if it is a linear space, then theory from linear algebra is applicable; if it is a manifold, then principles of Riemannian geometry may be applied. It turns out that the image of W is tropical geometric, so new tools for statistics are needed.

To see this, notice that the embedding (3) of trees into Euclidean space may be refined: if we do not wish to distinguish between phylogenetic trees differing by a constant on each external edge, we may consider the quotient space R n /R1, where 1 is the all-one vector (1, 1, . . . , 1), which gives a reduction in dimension. The quotient space R n /R1 is known as the tropical projective torus and it is generated by an equivalence relation ∼ specifying that for two points x, y ∈ R n , x ∼ y if and only if all coordinates of their difference x -y are equal. In the context of trees, the quotient normalizes evolutionary time between trees. The tropical projective torus is the ambient space of the space of phylogenetic trees; T N is a proper subset of R n /R1. The tropical projective torus R n /R1 may also be generated by a group action: Let G := {(c, c, . . . , c) ∈ R n | c ∈ R} with coordinate-wise addition, then G is an additive group. G acts on R n as follows: for g ∈ G and x ∈ R,

$g • x = (x 1 + g 1 , x 2 + g 2 , . . . , x n + g n ).$Each point in R n /R1 is then exactly one orbit under the group action of G on R n .

Furthermore, if we disregard differences on external edges, we may consider the quotient space R n / im(ϕ) where the map ϕ : R N → R n is given by ϕ(x 1 , . . . , x N ) = (x 1 + x 2 , x 1 + x 3 , . . . , x N -1 + x N ). This map has the geometric intuition that two trees are identified if the lengths of the N edges adjacent to the leaves are the only difference between them, which gives intuition on why this map is well-defined; for further technical details on why this map is well-defined, please see page 396 of [Speyer and Sturmfels (2004)](#b53). We thus obtain the following sequence of maps:

$T N -1 → R n → R n /R1 → R n / im(ϕ).$(5)

In algebraic geometry, the solution sets of systems of polynomial equations-referred to as algebraic varieties-are studied. In tropical geometry, these polynomial equations are defined in the tropical semiring, (R ∪ {∞}, ⊕, ) where a ⊕ b := min(a, b) and a b := a + b. Tropical mathematics involves studying various mathematical objects and problems which are defined using these operations. For example, let a N denote the tropical product of a with itself N times; let A ⊂ N N . Tropical polynomials are piecewise linear functions:

$f (x 1 , . . . , x N ) = a∈A c a x a1 1 • • • x a N N = min a∈A (c a + a 1 x 1 + • • • + a N x N ).$A tropical hypersurface H(f ) is the set of all (x 1 , . . . , x N ) ∈ R N where f is attained at least twice as a runs over A.  [G 2,4 , G 2,4 ,  G 2,4 ,](#) and [G 2,4 under (5). Notice that G 2,4 is T BHV   3](#) and [G 2,4 is L 3](#) .

Notice that the Plücker relations (1) given in Proopsition 1 are tropical polynomials, and thus, the set of all phylogenetic trees constitutes a tropical hypersurface with min replaced by max. Note also that the max-plus semiring (R ∪ {-∞}, , ), where a b := max(a, b), is isomorphic to the tropical semiring. Thus, the four-point condition defining phylogenetic trees is tropical.

In algebraic geometry, the real Grassmannian G 2,N is the following projective variety in the projective space P N -1 :

$G 2,N = (x 12 , x 13 , . . . , x (N -1)N ) ∈ P n-1 | x ij x kℓ -x ik x jℓ + x iℓ x jk = 0 for 1 ≤ i < j < k < ℓ ≤ N .$The tropical Grassmannian G 2,N is then obtained by replacing the polynomial by its equivalent with standard operations replaced by their tropical equivalents (a process often referred to as "tropicalization") and the vanishing set by intersections of tropical hypersurfaces. In other words, G 2,N is given by the intersection of tropical hypersurfaces

$H(x ij x kℓ ⊕ x ik x jℓ ⊕ x iℓ x jk ) for 1 ≤ i < j < k < ℓ ≤ N .$To visualize G 2,N , we have the following behavior of images through the sequence of maps (5

$): the image of G 2,N in R n /R1 is a fan G 2,N of dimension (2N -2); the image of G 2,N in R n / im(ϕ) is a fan G 2,N$of dimension N -3; and intersecting G 2,N with the unit sphere yields a polyhedral complex G 2,N , where each facet G 2,N is a polytope of dimension N -4. It turns out that G 2,N coincides with T BHV N -1 , G 2,N coincides with L N -1 (4), and the image of W is precisely the tropical Grassmannian G 2,N [(Speyer and Sturmfels, 2004)](#b53).

Example 6. As an illustrative example, we study the case of N = 4 leaves: G 2,4 is the hypersurface H(x 12 x 34 ⊕ x 13 x 24 ⊕ x 14 x 23 ), which is the collection of points such that at least one of the following systems holds: x 12 +x 34 = x 13 +x 24 ≤ x 14 +x 23 , x 12 +x 34 = x 14 +x 23 ≤ x 13 +x 24 , x 14 +x 23 = x 13 +x 24 ≤ x 12 +x 34 .

For each system, equality determines a 5-dimensional hyperplane in R 6 , while inequality determines a closed half-space in R 6 . Their intersection is isomorphic to R 4 × R ≥0 . Since there are three systems, G 2,4 is the union of three copies of R 4 × R ≥0 glued along the space x 12 + x 34 = x 13 + x 24 = x 14 + x 23 , which is the image of ϕ : R 4 → R 6 . G 2,4 then consists of three copies of R ≥0 (i.e., T BHV 3 ; see also Example 5) and G 2,4 consists of three points (i.e., L 3 ).

## Palm Tree Space

A fundamental requirement to comparative and statistical studies on the tropical geometric interpretation of phylogenetic tree space is a metric. On the tropical projective torus, a generalized Hilbert projective metric has been used in other settings (e.g., [Joswig et al., 2007;](#b32)[Akian et al., 2011;](#b1)[Cohen et al., 2004)](#b18). We adapt this metric in our studies and refer to it as the tropical metric.

In this section, we review the tropical metric and study its properties, especially in relation to the BHV metric. We then present our main contribution, which is a formal and theoretical study of mathematical properties of the metric space (T N , d tr ) which we refer to as palm tree space (tropical tree space). We show that palm tree space possesses fundamental characteristics for studies in probability and statistics to be well-defined; namely, that it is a Polish space.

## The Tropical Metric

Definition 7. For two points [x], [y] ∈ R n /R1, consider the distance between [x] and [y] given by

$d tr ([x], [y]) := max 1≤i<j≤n (x i -y i ) -(x j -y j ) = max 1≤i≤n (x i -y i ) -min 1≤i≤n (x i -y i ).$We refer to the function d tr as the tropical metric.

Proposition 8. The function d tr is a well-defined metric function on R n /R1.

Proof. We verify that the defining properties of metrics are satisfied. By definition, for

$[u], [v] ∈ R n /R1, d tr ([u], [v]) = d tr ([v], [u]), satisfying symmetry. The tropical metric is nonnegative, since (u i -v i ) -(u j - v j ) ≥ 0, so is d tr ([u], [v]) ≥ 0. If d tr ([u], [v]) = 0, then u i -v i are equal for all 1 ≤ i ≤ n, thus [u] = [v], so indiscernibles are identifiable. For [u], [v], [w] ∈ R n /R1$, we now show that triangle inequality is satisfied:

$d tr ([u], [w]) ≤ d tr ([u], [v]) + d tr ([v], [w]). Suppose 1 ≤ i < j ≤ n such that (u i -w i ) -(u j -w j ) = max 1≤i<j≤n |u i -w i -u j + w j |, then d tr ([u], [w]) = |u i -w i -u j + w j |. Note that u i -w i -u j + w j = (u i -v i -u j + v j ) + (v i - w i -v j + w j ). Hence d tr ([u], [w]) = |u i -w i -u j + w j | ≤ |u i -v i -u j + v j | + |v i -w i -v j + w j | ≤ d tr ([u], [v]) + d tr ([v], [w]).$Thus, d tr is a well-defined metric function on R n /R1.

Notice that the metric space (R n /R1, d tr ) can be identified with the normed linear space R n-1 via the linear isomorphism π : R n /R1 → R n-1 with [x] → (x 2 -x 1 , . . . , x n -x 1 ). π is in fact an isometry: define a norm on R n-1 by x tr := max(max |x i -x j |, max |x i |) and denote the induced distance by dtr , then

$d tr ([x], [y]) = max max 2≤i<j≤n |(x i -y i ) -(x j -y j )|, max 2≤i≤n |(x i -x 1 ) -(y i -y 1 )| = π([x]) -π([y]) tr = dtr (π([x]), π([y])).(6)$by choosing representatives such that x 1 = y 1 , allowing us to drop indices and simplify the expression. Note that • tr is a well-defined norm, since we may always add an extra 0-valued coordinate to each x to obtain an element [x] in the tropical projective torus. The norm x tr is then d tr ([x], 0) and the triangle inequality is satisfied; homogeneity under usual scalar multiplication and positive definiteness are also satisfied.

Restricting to the subspace of phylogenetic trees equipped with the tropical metric gives the following construction.

Definition 9. For a positive integer N , let T N be the space of phylogenetic trees with N leaves. The metric space P N := (T N , d tr ) is called the palm tree space.

The spaces T BHV N and P N are not isometric, meaning that absolute lengths measured by each metric are not consistent. To understand the variation in length discrepancy, we study the stability of the tropical metric d tr and find that perturbations of points in BHV space, measured by the BHV metric d BHV , correspond to bounded perturbations of their images in palm tree space, measured by the tropical metric. This stability property is desirable, since it allows for interpretable comparisons between the two spaces, and allows for "translations" in the widely-used BHV framework over to palm tree space.

The following lemma ensures coordinate-wise stability of the tropical metric in P N .

$Lemma 10. Let u ∈ R n . For 1 ≤ i ≤ n, if we perturb the ith coordinate of u by ε > 0 to obtain another point u ∈ R n , then in R n /R1 we have d tr ([u], [u ]) = ε.$Proof. For 1 ≤ j ≤ n, the difference u j -u j = 0 if j = i, and u i -u i = ±ε. The set of these differences is then either {0, ε} or {0, -ε}. By Definition 7,

$d tr ([u], [u ]) = |0 -±ε| = |ε|.$Theorem 11 (Stability). Let N be the number of leaves for phylogenetic trees in palm tree space and BHV space. Let u and u be two phylogenetic trees with N leaves. Then

$d tr (u, u ) ≤ √ N + 1 • d BHV (u, u ).$Moreover, the smallest possible constant is √ N + 1.

Proof. We first prove that for any two trees u, u in vector representation (3) with N leaves,

$d tr (u, u ) ≤ √ N + 1 • d BHV (u, u ).$First, assume that u, u belong to the same orthant in BHV space. Then no matter what the tree topology is, if we denote the differences of the lengths of the N -2 internal edges in u and u (see ( [4](#))) by d 1 , d 2 , . . . , d N -2 , and the differences of the length of the N external edges by p 1 , p 2 , . . . , p N , we

$always have d BHV (u, u ) = N -2 i=1 d 2 i + N i=1 p 2 i .$For every pair of leaves i, j in both trees, the distance between them is a sum of the length of some internal edges and two external edges. In other words, all differences w u ij -w u ij are of the form of the sum between some d k , and p i + p j . Thus, the maximum of these differences is at most the sum of all positive d i values, plus the two greatest p i values (take these to be p i1 and p i2 ), while the minimum of these differences is at least the sum of all negative d i values, plus two smallest p i values (take these to be p i3 and p i4 ). By definition, d tr (u, u ) is the maximum minus the minimum of these differences, so we have

$d tr (u, u ) ≤ N -2 i=1 |d i | + |p i1 | + |p i2 | + |p i3 | + |p i4 |.$By the Cauchy-Schwarz inequality,

$(N + 1) • N -2 i=1 |d i | 2 + |p i1 | 2 + |p i2 | 2 + |p i3 | 2 + |p i4 | 2 ≥ N -2 i=1 |d i | + |p i1 | + |p i2 | + |p i3 | + |p i4 | 2 . Hence d tr (u, u ) ≤ N -2 i=1 |d i | + |p i1 | + |p i2 | + |p i3 | + |p i4 | ≤ √ N + 1 • N -2 i=1 |d i | 2 + |p i1 | 2 + |p i2 | 2 + |p i3 | 2 + |p i4 | 2 ≤ √ N + 1 • N -2 i=1 |d i | 2 + N i=1 p 2 i = √ N + 1 • d BHV (u, u ).$Now, for u, u with distinct tree topologies, we consider the unique geodesic connecting them: there exist finitely many points u 1 , . . . , u k-1 in BHV space such that u i and u i+1 belong to the same orthant corresponding to a tree topology for 0 ≤ i ≤ k -1, where u 0 = u and u k = u , and

$d BHV (u, u ) = k-1 i=0 d BHV (u i , u i+1 ). For 1 ≤ i ≤ k -1, by the proof above, we have that d tr (u i , u i+1 ) ≤ √ N + 1 • d BHV (u i , u i+1 ) ∀ 1 ≤ i ≤ k -1. Thus, d tr (u, u ) ≤ k-1 i=0 d tr (u i , u i+1 ) ≤ k-1 i=0 √ N + 1 • d BHV (u i , u i+1 ) = √ N + 1 • d BHV (u, u ).$Next, we consider the case where the equality holds: consider two trees t and t with N leaves and the same tree topology, given by the following nested sets {1, 2}, {1, 2, 3}, . . . , {1, 2, . . . , N -2} . Let e i be the internal edge labeled by the ith clade in the nested sets listed previously. Suppose in t, the internal edges have lengths

$b t (e i ) = 2, if 1 ≤ i ≤ N -4; 1, if i = N -3.$Similarly, in t , the internal edges have lengths

$b t (e i ) = 1, if 1 ≤ i ≤ N -4; 2, if i = N -3.$The external edge lengths of t and t are

$p i j = 1, if (i, j) = (1, 2), (1, N -2), (2, N -1), (2, N ); 0, otherwise. Then d BHV (t, t ) = (N -4) • (2 -1) 2 + (1 -2) 2 + 2 • (1 -0) 2 + 2 • (0 -1) 2 = √ N + 1.$For 1 ≤ i < j ≤ N , in either tree the distance w ij is the sum of the edge lengths of p i , e max(i-1,1) , e max(i-1,1)+1 , . . . , e max(j-2,N -2) , p j . Since b t (e i ) > b t (e i ) for i < N -3 and b 1 (e i ) < b 2 (e i ) for i = N -3, the maximum of all differences

$w t ij -w t ij is w t 2(N -2) -w t 2(N -2) = ((N -4) • 2 + 2 • 1) -(N -4) • 1 = N -2; and the minimum of all differences w t ij -w t ij is w t (N -2)(N -1) -w t (N -2)(N -1) = 1 -(2 + 1 + 1) = -3. By definition, d tr (t, t ) = (N -2) -(-3) = N + 1 = √ N + 1 • d BHV (t, t$) in this case. Thus, √ N + 1 is the smallest possible stability constant.

In general, and especially data applications, the number of leaves is fixed prior to the study so the stability constant √ N + 1 is indeed a constant. We note that explicit calculations involving geodesics between trees in the original reference by [Billera et al. (2001)](#b14) do not include external edges, since these do not modify the geometry of the space. Indeed, their inclusion only amounts to an additional Euclidean factor, since the tree space then becomes the cross product of BHV space of trees with internal edges only, and R N ≥0 . Geodesic distances, which depend directly on geodesic paths (the former is the length of the latter), considered in [Billera et al. (2001)](#b14) also do not include external edges. In the proof of Theorem 11, we follow the quartic-time algorithm of [Owen and Provan (2011)](#b45) to compute BHV distances which includes external edge lengths, not only because it is the fastest algorithm to date but also necessary in this comparative setting, since the tropical distance is defined by external edge lengths.

In terms of interpretation, Theorem 11 provides an important comparative measure and guarantees that quantitative results from BHV space are bounded in palm tree space. For example, in single-linkage clustering, where clusters are fully determined by distance thresholds, the stability result means that a given clustering pattern in BHV space will be preserved in palm tree space, thus maintaining interpretability of clustering behavior.

Note also that the reverse inequality does not hold in palm tree space: there is no general bound for the BHV distance in terms of the tropical distance. Consider trees in T BHV T 1 with a coordinate representing the length of the internal edge of the {12} clade at a distance k 1 from the origin, while the coordinate representing the length of the internal edge of the {34} clade is at distance k 2 from the origin. Similarly, take a tree T 2 with the coordinate representing the length of the internal edge of the {1, 2} clade at a distance k 2 from the origin, while the coordinate representing the length of the internal edge of the {34} clade is at distance k 1 from the origin. Then T 1 can be vectorized to (k 1 , k 2 ) while T 2 can be vectorized to (k 2 , k 1 ) and

$d tr (T 1 , T 2 ) = 0, but d BHV (T 1 , T 2 ) = (k 1 -k 2 ) 2 + (k 1 -k 2 ) 2 = 2(k 1 -k 2 ) 2 = √ 2(k 1 -k 2 ) > 0.$This example also shows that the tropical metric and BHV metric are not isometric.

## Geometry of Palm Tree Space

The uniqueness property of geodesics in BHV space, used in the proof of Theorem 11, leads naturally to the study of similar geometric properties that characterize palm tree space as well as important differences between the two spaces. These characteristics will now be developed in this section.

## Geodesics in Palm Tree Space

In palm tree space, geodesics are in general not unique, which is a common occurrence in various metric spaces. There exists, however, a unique path connecting two points in ultrametric tree space within palm tree space, which is also a geodesic: the tropical line segment.

Definition 12. Given [x], [y] ∈ R n /R1, the tropical line segment with endpoints [x] and [y] is the set

${a [x] ⊕ b [y] ∈ R n /R1 | a, b ∈ R},$where is tropical multiplication and tropical addition ⊕ for two vectors is performed coordinate-wise.

Proposition 13. For two trees t, t ∈ U N , the tropical line segment connecting t and t is a geodesic.

Proof. It suffices to show that for any a, b ∈ R, we have that d tr (z, t) + d tr (z, t ) = d tr (t, t ), where z = a t ⊕ b t lies on the tropical line segment. We may assume that t i -t i ≤ t i+1 -t i+1 for 1 ≤ i ≤ n -1. Under this assumption, d tr (t, t ) = (t n -t n ) -(t 1 -t 1 ). Now if 0 ≤ j ≤ n is the largest index such that t j -t j ≤ b -a, then for some i ≥ j + 1, z i = b + t i and for i ≤ j, z i = a + t i . If j = 0 or j = n, then z is equal to either t or t and the claim is apparent. We may thus assume 1 ≤ j ≤ n -1.

The set of all differences t i -z i contains -a and the greater values

$t i -t i -b > -a for i ≥ j + 1. So, d tr (z, t) = (t n -t n -b) -(-a) = (t n -t n ) + (a -b).$Similarly, the set of all differences z i -t i contains b and the smaller values

$(t i -t i ) + a ≤ b for i ≤ j. So, d tr (z, t ) = b -(t 1 -t 1 + a) = (b -a) -(t 1 -t 1 )$. Therefore, d tr (z, t) + d tr (z, t ) = d tr (t, t ), and the tropical line segment connecting t and t is a geodesic.

In addition, it turns out that tropical line segments are easy and fast to compute. In particular, the time complexity to compute them is lower than the state-of-the-art in BHV space [(Owen and Provan, 2011)](#b45). Proposition 14. (Maclagan and Sturmfels, 2015, Proposition 5.2.5) The time complexity to compute the tropical line segment connecting two points in

$R n /R1 is O(n log n) = O(N 2 log N ).$
## Structure of Palm Tree Space

In the same way that T BHV N is constructed as the union of orthants, the geometry of P N is also given by such a union. Proposition 15. [(Maclagan and Sturmfels, 2015, Proposition 4.3.10)](#) The space T N is the union of (2N -5)!! polyhedra in R n /R1, each of dimension N -3.

## Topology of Palm Tree Space

The measure of a space is relevant in probabilistic studies, since the topology of a space may be interpreted in terms of measures. For example, Radon measures may also be interpreted as linear functionals on the space of continuous functions with compact support, which is locally convex, by e.g., [(Bourbaki, 2004, Chapter 3)](#). This motivates our study of the topology of palm tree space.

The following two lemmas allow us to characterize the topology of palm tree space. Recall that for x ∈ R n , the set B(x, r) = {y ∈ R n | |y -x| < r}, with | • | taken to be the Euclidean norm, is the open ball centered at x with radius r. By identifying R n /R1 with R n-1 via (6), an equivalent set may be correspondingly defined in palm tree space by considering the tropical norm as follows.

Definition 16. Under the tropical metric d tr , we define

$B tr (x, r) = {y ∈ R n | d tr ((0, y), (0, x)) < r}$to be the open tropical ball centered at x ∈ R n with radius r.

Lemma 17. For x, y ∈ R n-1 and r > 0, the open tropical ball B tr (x, r) is the open convex polytope defined by the following strict inequalities for 1 ≤ i < j ≤ n -1:

$y i > x i -r, y i < x i + r, y i -y j > x i -x j -r, y i -y j < x i -x j + r. (7)$Proof. For y ∈ R n-1 , y ∈ B tr (x, r) if and only if d tr ((0, x), (0, y)) < r. Definition 7 admits the strict inequalities in (7).

Lemma 18. For r > 0 and x ∈ R n-1 , B(x, r) ⊆ B tr (x, 2r) and B tr (x, r) ⊆ B(x, √ n -1r).

Proof. By Lemma 17, if a point y lies in B tr (x, r), then for 1

$≤ i ≤ n-1, |y i -x i | < r, thus y ∈ B(x, √ n -1r). Conversely, if a point y lies in B(x, r), then for 1 ≤ i ≤ n -1, we have that |y i -x i | < r. Therefore, (y i -y j ) -(x i -x j ) = (y i -x i ) -(y j -x j ) < 2r.$Hence y ∈ B tr (x, 2r). Therefore, B tr (y, s) is also an open set. The other direction is proved in the same manner.

Example 20. Figure [6](#) illustrates the unit balls in Euclidean, BHV, and palm tree space. Here, the number of leaves is fixed to be 3. There are three 1-dimensional cones in BHV space, and they share the origin. The palm tree space P 3 = {w = (w 12 , w 13 , w 23 ) ∈ R 3 /R1 | max(w) is attained at least twice} may be embedded in R 2 .

(0, 0) (0, 0, 0)

${1, 2} {1, 3} {2, 3} [(0, 0, 0)]$Figure [6](#): Comparison of unit balls in Euclidean, BHV, and palm tree space for N = 3 leaves. The leftmost figure is the unit ball B((0, 0), 1) in R 2 ; the center figure is the unit ball centered at the origin with radius 1 in a BHV space with 3 leaves; the rightmost figure is the unit ball B tr ([(0, 0, 0)], 1) in P 3 .

## Palm Tree Space is a Polish Space

We now show that additional analytic properties of palm tree space that are desirable for probabilistic and statistical analysis are satisfied. Specifically, we prove that palm tree space is a separable, completely metrizable topological space, and thus a Polish space, by definition. Polish spaces are important settings for studies in probability due to the fact that classical results may be formulated and generalized in a well-behaved manner; some examples are the construction of conditional expectations, Kolmogorov's extension theorem (which guarantees the definition of a stochastic process from a series of finite-dimensional distributions), and Prokhorov's theorem (which guarantees weak convergence by relating tightness of measures to compactness in a probability space) [(Parthasarathy, 1967)](#b47).

Proposition 21. P N is complete.

Proof. For convenience, when considering points in P N , we always choose their unique preimage in R n whose first coordinate is 0. Then, we may denote each point in P N by an (n-1)-tuple in R n-1 . Let t 1 , t 2 , . . . ∈ R n-1 be a Cauchy sequence of points in P N . For 1 ≤ i ≤ n -1, we claim that (t i k ) k≥1 also form a Cauchy sequence in R: For any ε > 0, there exists M such that for k 1 , k 2 > M , we have d tr (t k1 , t k2 ) < ε. By Definition 7,

$d tr (t k1 , t k2 ) ≥ |0 -0 -t i k2 + i k1 | = |t i k1 -t i k2 |. Thus, for k 1 , k 2 > M ,$we have t i k1 -t i k2 < ε. Suppose now that the Cauchy sequence (t i k ) k≥1 converges in the Euclidean metric to t i 0 ∈ R. It suffices to show (i) t 0 = (t 1 0 , t 2 0 , . . . , t n-1 0

) represents a point in P N ;

(ii) lim

$k→∞ d tr (t k , t 0 ) = 0.$To show (ii), we argue that since (t i k ) k≥1 converges to t i 0 for all 1 ≤ i ≤ n -1, then for any ε > 0 there exists M such that for k > M , we have

$|t i k -t i 0 | < ε 2 for all 1 ≤ i ≤ n -1.$Then by Definition 7,

$d tr (t k , t 0 ) = max 1≤i≤n-1 0, t i k -t i 0 -min 1≤i≤n-1 0, t i k -t i 0 < ε 2 -- ε 2 = ε. So lim k→∞ d tr (t k -t 0 ) = 0.$To show (i), note that each coordinate of t 0 , including the first, is the limit of the corresponding coordinates of (t k ) k≥1 . Suppose t 0 / ∈ P N , then there exists 1 ≤ i < j < k < l ≤ N such that one term of t 0 in (1) is strictly greater than the remaining two. Then there exists M 2 such that for all k > M 2 , the one term of t k in (1) is also strictly greater than the remaining two, thus t k / ∈ P N -a contradiction. Hence (i) holds, and P N is complete.

Proposition 22. P N is separable.

Proof. We claim that the set of all trees with all rational coordinates is dense in P N : Fix any tree t = (w ij ) ∈ P N . By Proposition 15, t belongs to a polyhedron and there exists a tree topology with (N -3) internal edges. Then the distance between any two leaves is the sum of the lengths of the edges along the unique path connecting them. The number of edges along each path is at most (N -1). For any ε > 0 and length b k of each edge of the tree t, since Q is dense in R, we can find a rational number q k such that |q k -b k | < 1 2(N -1) ε. Now, construct another tree t = (w ij ) with the same topology as t, and with corresponding edge lengths q k . Then for any 1

$≤ i < j ≤ N we have that |w ij -w ij | < ε 2 . Thus d tr (t , t) = max 1≤i<j≤n (w ij -w ij ) -min 1≤i<j≤n (w ij -w ij ) < ε,$and all coordinates of q k are rational. Thus, P N is separable.

The above results on completeness and separability are proved by definition. An alternative perspective that demonstrates completeness and separability is to identify the tropical projective torus and its corresponding tropical metric with R n and the ℓ ∞ distance. This identification has been used by [Ardila (2005)](#b6) and [Bernstein and Long (2017)](#b11); [Bernstein (2020)](#b10): Consider a linear mapping from R N to R n where (x 1 , . . . , x N ) → (x i -x j ) for all pairs i < j. The image of such a map is isomorphic to the tropical projective torus and the tropical metric is then the ℓ ∞ distance on R n restricted to the image of this map. Palm tree space forms a closed subset of R n , since the four-point condition (Proposition 1) defines a closed subset and R n equipped with the ℓ ∞ distance is complete and separable. This formulation also provides insight into the topology of palm tree space described in Theorem 19.

Finally, compact subsets in palm tree space exist. As an example, consider the space of ultrametric trees U N . Let compact tree space U

[1]

N to be the image of U N of the set of ultrametrics W satisfying max i,j (w(i, j)) = 1. Now, notice that the union of U

## [k]

N for 1 ≤ k ≤ N is still compact and a subset is bounded if and only if it is contained in this union; in particular, if it is also closed, then it is compact.

## Probability Measures and Means in Palm Tree Space

We showed in Section 3.4 that palm tree space is a Polish space, and thus exhibits desirable properties for rigorous probability and statistics. Such properties ensure well-behaved measure-theoretic properties, and in particular, allow for classical probabilistic and statistical studies, such as convergence in various modes, as well as ensuring that stochastic processes are well defined. We now study the existence of probabilistic and statistical quantities for parametric data analysis, such as probability measures and Fréchet means and variances.

## Tropical Measures of Central Tendency

For distributions in general metric spaces, there are various measures of central tendency. These may be framed in palm tree space as follows (and may be generalized by replacing the tropical metric d tr with any well-defined metric).

Definition 23. Given a probability space (T N , B(T N ), P T N )-where T N is the set of all possible outcomes, B(T N ) is the event space or set of outcomes in T N (taken here to be the σ-algebra generated by the open tropical balls B tr of T N ), and P T N ) is a probability function that assigns a proability to each event in the event space-the quantity

$Var P T N (t) = T N d tr (t, t ) 2 dν(t ) < ∞ (8)$is known as the tropical Fréchet variance. The minimizer of the quantity ( [8](#)) is the tropical Fréchet population mean or barycenter µ F of a distribution ν:

$µ F tr = arg min t T N d tr (t, t ) 2 dν(t ) < ∞.(9)$For general metric spaces, neither existence nor uniqueness of ( [9](#formula_45)) is guaranteed. The following condition ensures the existence of barycenters [(Ohta, 2012)](#b44) .

Lemma 24. [(Ohta, 2012, Lemma 3.2](#)) If (M, d) is a proper metric space-that is, a metric space where every closed, bounded subspace is compact-then any distribution ν where M d(t, t ) 2 dν(t ) < ∞ has a barycenter.

Palm tree space is a proper metric space, since in order for every subspace to be bounded, the height of the tree must be fixed which automatically gives a compactification of the subspace as well. Thus, (9) evaluated according to the tropical metric is guaranteed to exist. However, since geodesics are not unique in palm tree space, Fréchet means will also, in general, not be unique.

## Tropical Probability Measures

Probability measures on combinatorial and phylogenetic trees have been previously discussed, for example by [Aldous (1996)](#b2) and [Billera et al. (2001)](#b14). This section is dedicated to an analogous discussion on palm tree space. In P N , the Borel σ-algebra B(T N ) is the σ-algebra generated by the open tropical balls B tr of T N , given in Definition 16. We begin by providing the existence of probability measures on P N . Definition 25. A finite tropical Borel measure on T N is a map µ : B(T N ) → [0, ∞) such that µ(∅) = 0, and for mutually disjoint Borel sets Alternatively, the existence of probability measures on T N can be seen by considering an arbitrary probability space (Ω, F, P) together with a measurable map X : Ω → T N . Such maps exist, since we have shown in Section 3 that T N is a Polish space and thus (T N , B(T N )) is a standard measurable space (e.g., [Taylor (2012)](#b58)). The probability space (Ω, F, P) is a measure space by assumption, thus also measurable. In this case, the map X is a random variable taking values in T N . Then, X induces a probability measure P T N on (T N , B(T N )) by the pushforward measure X * P of P under X, known as the distribution, for all Borel sets A ∈ B(T N ):

$A 1 , A 2 , . . . ∈ B(T N ) implies that µ( ∞ i=1 B (i) tr ) = ∞ i=1 µ(B (i) tr ). If in addition µ(T N ) = 1,$$X * P(A) := P(X -1 (A)) = P({ω ∈ Ω | X(ω) ∈ A}).$
## Statistical and Geometric Comparisons Between Tree Spaces

We close this section with a summary of the properties discussed thus far in a comparative manner between palm tree space and BHV space. With respect to the statistical and probabilistic properties, we note that barycenters and probability measures exist in both palm tree space, as we have shown above, and in BHV space [(Garba et al., 2021)](#b26). The differences in geometric properties of both palm tree and BHV space in Table [1](#tab_1). Here, we note that the depth of a geodesic is the largest codimension among all polyhedra traversed by the geodesic; specifically, for a point x belonging to the interior of a polyhedron of dimension k, the depth of the point x is N -2 -k. The high depth of a geodesic path in BHV space is conjectured to play a role in the stickiness of BHV Fréchet means [(Lin et al., 2017)](#b37).

## Classification and Exploratory Data Analysis in Palm Tree Space: A Numerical Experiment and Real Data Application

We now give concrete demonstrations of both inferential and descriptive statistical tasks in palm tree space to showcase its viability. Specifically, to demonstrate the viability of statistical inference in palm tree space, we propose and develop a tropical version of linear discriminant analysis and demonstrate the method on simulated data. To demonstrate the viability of descriptive statistics in palm tree space, we study a real data application of the seasonal influenza virus. Here, we moreover provide a performance comparison to the BHV case with these real, large-scale data.

In this section, we focus on the setting of rooted phylogenetic trees.

## Descriptive Statistics: Dimension Reduction in Tree Spaces

We now provide an example of a descriptive study in palm tree space by applying the tropical PCA method of [Yoshida et al. (2019)](#b65) to real data. We compare the performance of tropical versus BHV principal component analysis (PCA) of the seasonal influenza virus by studying its diversity over twenty years of collected longitudinal data.

## Influenza Data

We study the influenza type A virus, which is an RNA virus that is classified by subtype according to the two proteins occurring on the surface of the virus: hemagglutinin (HA) and neuraminidase (NA). Here, we focus on HA, which tends to be the most variable protein in genomic evolution, in terms of changing the antigenic make-up of surface proteins. Such antigenic variability (known as antigenic drift) is an important driving factor behind vaccine failure. We restrict our study to the subtype H3N2, which is becoming increasingly abundant, and a dominant factor studied in developing flu vaccines due to its recently increasing resistance to standard antiviral drugs [(Altman, 2006)](#b4). It was also the cause of an epidemic due to vaccine failure in [2002](#)[-2003](#b17)[(CDC, 2004))](#b17). Genomic data for 1089 full length sequences of hemagglutinin (HA) for influenza A H3N2 from 1993 to 2017 in the state of New York were obtained from the GI-SAID EpiFlu TM database ([www.gisaid.org](www.gisaid.org)) and aligned with muscle [(Edgar, 2004](#b22)) using default settings. HA sequences from each season were related to those of the preceding season. We then applied tree dimensionality reduction Zairis et al. ( [2016](#)) using temporal windows of 5 consecutive seasons to create 21 datasets: The influenza virus is assumed to emerge and evolve from a common ancestor: although the virus mutates each season and within each patient, each of these seasonal and patient-specific mutations can be traced back to a single virus (e.g., [Liu et al., 2009)](#b38). This evolutionary pattern is depicted in a large phylogenetic tree. Tree dimensionality reduction produces a collection of smaller trees that faithfully represents the evolutionary behavior of the single large tree, and thus allows the evolutionary information to be treated as a dataset with multiple points akin to bootstrapping, rather than viewing the large tree as a single datum [(Zairis et al., 2016)](#b67). Among the 21 datasets, the date of each dataset corresponds to the first season; for example, the dataset dated 2013 consists of 5-leaved trees where the leaves come from seasons 2013 through 2017. Each tree in these datasets was constructed using the neighbor-joining method [(Saitou and Nei, 1987)](#b49) with Hamming distance. Outliers were then removed from each season using kdetrees [(Schardl et al., 2014)](#b50). On average, there were approximately 20,000 remaining trees in each dataset. Finally, PCA was performed under the tropical metric [(Yoshida et al., 2019)](#b65) and under the BHV metric [(Nye et al., 2017)](#b43).

## Principal Component Analysis in Tree Spaces

PCA is a fundamental technique in descriptive and exploratory statistics that visualizes relationships within the data and reduces dimension. As such, PCA has many important implications-for example, it projects to the subspace of the solution of k-means clustering [Ding and He (2004)](#b21)-and may be interpreted in several different ways. One interpretation may be seen as searching for a lower-dimensional plane that minimizes the sum of squared distances from the data points to the plane, and then finding an orthogonal projection from the data points onto the plane to visualize them. This is the approach adapted by [Nye et al. (2017)](#b43); [Yoshida et al. (2019)](#b65), which we implement here.

Respective adaptations of the above-mentioned interpretation of PCA to palm tree space and BHV space are given by [Nye et al. (2017)](#b43) and [Yoshida et al. (2019)](#b65): convex, triangular regions-the tropical triangle and the locus of weighted Fréchet means computed with respect to the BHV metric, respectively-define notions of second principal components in the respective spaces. We refer the reader to these references for details and here, we apply these methods to the influenza virus data to explore and compare the performance of both methods in large-scale real data.

## Interpretation of Tree PCA

In the tropical case, the second principal component represented by the tropical triangle-whose vertices are given by three ultrametric trees, and whose edges are given by the tropical line segments between them-divides into cells, which are determined by the tree topologies that an edge (tropical line segment) traverses. Trees in the dataset are then projected into the cells corresponding to their topologies in the PCA visualization. The simplest case in both BHV and tropical PCA is where all three vertices of the triangle are of the same tree topology, then there will only be one cell and all projections will be of the same topology; if two points are trees of the same tree topology, then every point on the tropical line segment connecting them will also be of the same tree topology. An example can be seen in the 1993 data set, available at [https://github.com/antheamonod/FluPCA/Figures](https://github.com/antheamonod/FluPCA/Figures).  The BHV locus, which represents the second principal component in BHV space, is also generated by three vertices (ultrametric trees), and depicted in the BHV PCA plots by a triangle. Here, varying tree topologies are depicted by the multicolored patches within the triangular region, indicating that the locus straddles several orthants in BHV space. In the 2008 dataset in Figure [8](#fig_8), the locus straddles two BHV orthants and we see two tree topologies occurring among the projected points.

In the 2008 dataset, palm tree space and the tropical geometric approach to computations in phylogenetic tree space appears to allow for occurrences of richer and more subtle structures and methods: in these examples, we see tropical PCA projections of six different topologies, versus two in the BHV case.

## Results: Proportion of Standard Deviation Explained R

In terms of standard deviation explained given in Table [2](#), we see that in general, tropical PCA is able to explain more of the standard deviation in the data than does BHV PCA. To compute the fraction of standard deviation explained, we used the approach of [Page et al. (2020)](#b46) as presented in Section 4.1. BHV PCA results also have a higher variability over a wider range than tropical PCA: BHV PCA explains between 3.7% and 97% of the standard deviation, while tropical PCA explains between 46% and 96%.

## Inferential Statistics: Tropical Linear Discriminant Analysis

We now present an example of an inferential task in statistics in palm tree space. Classification on gene trees and phylogenetic trees is an important task in phylogenomics, such as comparative gene analysis and analysis on convergence on Bayesian inference on phylogenetic tree reconstruction [(Haws et al., 2012)](#b29). Here, we propose tropical linear discriminant analysis (LDA), akin to classical LDA as a generalization of Fisher's linear discriminant [(Fisher, 1936)](#b25), to perform linear classification on gene trees. LDA is a method in classical statistics which finds a linear combination of features to distinguish between two or more classes of objects or events, resulting in a linear classifier. It is a supervised learning model that classifies categorical response variables from given explanatory variables and is constructed from a similar perspective as PCA described above in Section 4.1.2, which is to search for an explanatory linear subspace for variables.

Definition 26 (Tropical Convex Hull). Take a finite subset V = {v 1 , . . . , v m } ⊂ R n /R1. The tropical convex hull or tropical polytope of V is the smallest tropically-convex subset containing V , in the sense that the tropical line segment between any two points in V is contained in V . It can be written as the set of all tropical linear combinations of V such that:

$tconv(V ) = {a 1 v 1 ⊕ a 2 v 2 ⊕ • • • ⊕ a m v m | a 1 , . . . , a m ∈ R}.$Notice that a tropical polytope of a set of two points {v 1 , v 2 } ⊂ R n /R1 is the tropical line segment between v 1 , v 2 .

Let Γ u,v be the tropical line segment between u, v ∈ U N and consider a tropical polytope

$P = tconv(w 1 , w 2 , . . . , w m ) ⊂ R n /R1,$where w 1 , . . . , w m are vertices of the tropical polytope P. Then, by formula 5.2.3 in [Maclagan and Sturmfels (2015)](#b39), the projection map proj P sending any point x ∈ R n /R1 to a closest point in the tropical polytope

$P ⊂ R n /R1 such that proj P (x) = λ 1 w 1 ⊕ λ 2 w 2 ⊕ • • • ⊕ λ m w m , where λ k = min(x -w k ).$Here, suppose we have a sample {(x 1 , y 1 ), . . . , (x m , y m )} where x 1 , . . . , x m ∈ R n /R1 and y 1 , . . . , y m ∈ {1, 2}. Let S := {x 1 , . . . , x m } ⊂ R n /R1. Definition 27. A tropical Fermat-Weber point F S of S is defined as

$F W S := arg min x∈R n /R1 m i=1 d tr (x, x i ).$Further, suppose we have u, v ∈ U N and the tropical line segment between them Γ u,v . Then a tropical Fermat-Weber point F W (S,Γu,v) of S over Γ u,v is defined as

$F W (S,Γu,v) := arg min x∈Γu,v m i=1 d tr (x, x i ),$where x i is the projection of x i ∈ S onto the tropical line segment Γ u,v . 

$F W F W x 2 x m x m-1 x k+1 • • • x k x 1 x 3 • • •$$. , x m } ⊂ Γ u,v , where Γ u,v is the tropical line segment between u, v ∈ R n /R1. Then a Fermat-Weber point F W S of S is in Γ u,v . Proof. Let F W ∈ Γ u,v be the points such that m i=1 d tr (F W, x i ) = min x∈Γu,v m i=1 d tr (x, x i ) and suppose there exists F W ∈ R n /R1 -Γ u,v such that m i=1 d tr (F , x i ) < m i=1 d tr (F, x i ). (10$$)$As seen in Figure [9](#fig_9), by the fact that d tr is a metric over R n /R1, notice that

$d tr (F W, x i ) ≤ d tr (F W , x i ) + d tr (F W, F W ) for all i = 1, . . . , m. Then we have m i=1 d tr (F W, x i ) ≤ m i=1 d tr (F W , x i ) + d tr (F W, F W ) .$Since d tr (F W, F W ) ≥ 0, we have contradiction to (10).

In our proposed tropical LDA, we follow suit of a classical linear discriminant analysis over a Euclidean space; here we assume we have only two labels (classes) in the response variable. A classical LDA for predicting the binary response variable based on given explanatory variables finds a linear function which maximizes the distance between one centroid of projected points onto the linear function from observations in one group and another centroid of projected points from the other group. Using Lemma 28, we adapt the classical LDA procedure to the tropical setting by learning a tropical line segment between two points over U N , Γ u,v , which is a geodesic by Proposition 13. In particular, we maximize the tropical distance between F W (S1,Γu,v) and F (S2, [Γu,v)](#) , where S 1 is a sample with label in the response variable y i = 1 and S 2 is a sample with label in the response variable y i = 2. More specifically, the problem is to find u, v ∈ U n such that max u,v,∈Un

$d tr (F W (S1,Γu,v) , F W (S2,Γu,v) ).$The algorithms for training and predicting a tropical LDA are given in Algoithms 1 and 2.

## Numerical Experiments: Mixture of Coalescent Models

We simulated data following [Page et al. (2020)](#b46); we generated gene trees with a species tree under a coalescent model via the software Mesquite [(Maddison and Maddison, 2009)](#b40). We fixed the effective population size m = 100, 000 and varied r := sd m , where sd is the species depth. We generated simulated data sets as described in Algorithm 5.1 of [Page et al. (2020)](#b46).

The number of leaves was set to N = 10. We used the ratio between species depth sd and effective population size r to vary r = {0.25, 0.5, 1, 2, 5, 10}. We took an 80-20 split for training and test sets; the sample size of a training set was set to 120 and the sample size for a test set was set to 30. The classification accuracy rates are shown in Table [3](#). In our simulations, we approximated the tropical LDA by sampling random points in U N and approximated the projection of a tropical Fermat-Weber point by sampling random points for increased computational efficiency. The number of iterations was set to 500. Larger r results in more accurate classification results [(Page et al., 2020)](#b46).

## Software and Data Availability

Software to compute tropical LDA and both tropical and BHV PCA is publicly available in R and Java code. The implementation of tree PCA to the pre-processed influenza data described in this paper is located on the FluPCA GitHub repository at [https://github.com/antheamonod/FluPCA](https://github.com/antheamonod/FluPCA). The resulting figures from both BHV and tropical PCA projections for all 21 data sets are also available on the FluPCA GitHub repository.

## Discussion

In this paper, we defined palm tree space as the space of phylogenetic trees with N leaves, endowed with the tropical metric. We gave results on its analytic, topological, geometric, and combinatorial properties and showed that they are conducive to both descriptive and inferential statistics, as well as unsupervised and supervised machine learning. We have also shown that it is a setting amenable to rigorous treatments and studies in probability. We performed both descriptive and inferential statistical analysis on real and simulated data and showed that the tropical setting is viable for such studies, and moreover, in our real data application, we see that the tropical approach outperforms the BHV approach.

## Biological and Statistical Implications

Despite the statistical challenges of arbitrariness of dimension of BHV polytopes and stickiness which affect descriptive and inferential statistics, the BHV parameterization has been successfully implemented to reveal important biological findings (e.g., [Zairis et al. (2014)](#b66)). In terms of interpretation, the unresolved singularities of BHV Fréchet means translate to "indecisiveness" of which branching patterns or tree topologies are "preferred," which is consistent with what is often seen in some biological settings where the trees arise from sequence alignment. However, mathematically, trees are used to model other biological phenomena, such as pulmonary paths as airway trees (e.g., [Feragen et al., 2013](#b23)[Feragen et al., , 2015))](#b24); brain growth and structure (e.g., [Yan and Yan, 2013)](#b64); and neuronal morphologies (e.g., [Kanari et al., 2018)](#b33). Such a probabilistic assumption may not be reasonable in these other settings. Given recent research interest in developing methods to bypass these difficulties support the goal of our work, which is that exploring alternative representations is an important research direction (e.g., [Anaya et al., 2020;](#b5)[Skwerer et al., 2018)](#b52). An important and interesting direction for future research is the identification of non-uniform probability distributions in the tropical setting, which is challenging yet promising; various ways in which tropical Gaussian distributions may be constructed have been previously outlined [(Tran, 2018)](#b59).

In the context of shape statistics [(Kendall, 1989](#b34)) and computational anatomy [(Grenander and Miller, 1998)](#b28), the data objects of interest are often modeled as elements of algebraic spaces. In particular, these algebraic spaces are quotient spaces generated by group actions. Recent work has studied the behavior of estimators on such spaces, uncovering undesirable properties, such as biasedness and inconsistency when the group actions are random (that is, when the quotient spaces are generated by elements of the group are chosen at random to act on the topological space) or continuous (as in the case of Lie groups acting on Riemannian manifolds) [(Devilliers et al., 2017;](#b20)[Miolane and Pennec, 2015)](#b42). Nonparametric methods have been developed to bypass the problem of inconsistency [(Bhattacharya and Patrangenaru, 2014)](#b13). As previously mentioned, the tropical projective torus R n /R1 is a quotient space that may be generated by a group action, however the biasedness and inconsistency in previous work arise due to the poor behavior of the transformed metric after it is mapped into the quotient space, which results in a pseudometric. In our case, the tropical metric is well-behaved and defined directly on the quotient space, therefore differing in setting to previous work.

It should also be noted that the non-uniqueness property of geodesics in palm tree space poses computational difficulties, but does not prohibit statistical analysis and can still yield useful descriptive as well as inferential information, for example, on clustering behavior. Another important setting where geodesics are not unique is that of positively-curved spaces. The asymptotic behavior and distributions on Riemannian manifolds, including positively curved manifolds, has been studied in existing work [(Bhattacharya and Bhattacharya, 2008)](#b12). Recent work develops techniques for data analysis on curved spaces by tuning the geodesic metrics accordingly [(Kobayashi and Wynn, 2019)](#b35). In particular, a general Fréchet function is defined, and its parameters are chosen accordingly, depending on the goal: for example, one geodesic metric may be transformed into another to control the curvature of the space for data analysis. There are large bodies of existing work in related areas on curved spaces, for example, in the case of manifold learning; shape statistics; Wasserstein spaces for probability measures; and information geometry. Though these domains each have their own specific goals and studies, data analysis and computation play a central role in these settings. Moreover, there are known settings in these related areas where positive curvature, and thus non-uniqueness of geodesics, arises (for example, the 2-Wasserstein space for Gaussian measures is positively curved [(Takatsu, 2011)](#b57)). Adapting existing techniques in these settings to statistical analysis in palm tree space is an important direction of research that merits exploration.

## Future Work

Our work invites the reinterpretation of existing statistical methods in terms of the tropical metric to make a wider array of exact analyses readily available and interpretable to phylogenetic research with potential impact for biological discoveries. Two important directions for future work include the search for explicit parametric probability distributions in order to reinterpret classical probability-based statistical approaches on sets of phylogenetic trees, based on, for example, the classical central limit theorem. Another is the formal definition and computation of tropical Fréchet means and a study of the extent of its stickiness. Finally, a complete and systematic comparative study between palm tree and BHV space would be an interesting study to conduct.

![Figure 1: Example of an unrooted phylogenetic tree to illustrate the four-point condition.]()

![Figure 2: Some orthants in T BHV 4 . The axes D ijk represent the coordinate corresponding to the length of the internal edge leading to the {ijk} clade.]()

![Figure 3: 3-spider to illustrate stickiness.]()

![Figure 4: Visualizing the tropical Grassmannian G 2,4 . From left to right, we have the images ofG 2,4 , G 2,4 , G 2,4 , and G 2,4 under (5). Notice that G 2,4 is T BHV]()

![Figure 5: An example for non-isometry. T 1 and T 2 .]()

![On R n-1 , the family of open balls B(x, r) and the family of open tropical balls B tr (x, r) define the same topology. Proof. Suppose for all r > 0 and x ∈ R n-1 that the open balls B(x, r) form a topological basis. For any y ∈ R n-1 and s > 0, we consider the ball B tr (y, s): For any point z ∈ B tr (y, s), we have that d tr (z, y) < s. Let ε = s -d tr (z, y) 2 > 0. Then B tr (z, 2ε) ⊆ B tr (y, s). By Lemma 18, we have B(z, ε) ⊆ B tr (z, 2ε) ⊆ B tr (y, s).]()

![Figure 7: 2008: The tropical triangle as the second tropical principal component. (a) Tropical triangle and projected data points; (b) Vertices of the tropical triangle and projected tree topologies, where the numbers appearing in parentheses are the frequencies for each tree topology.]()

![Figure 8: 2008: The locus of BHV Fréchet means as the second principal component. (a) The simplex shaded by topology of corresponding points on the affine subspace; (b) Trees 1, 2, and 3 correspond to three weighted Fréchet means, where the numbers appearing in parentheses are the frequencies for each tree topology.]()

![Figure 9: Sample points on the tropical line segment and their tropical Fermat-Weber points]()

![then µ is a tropical Borel probability measure on T N .Summary of Geometric Comparisons Between Palm Tree Space and BHV SpaceSince T N is a finite union of polyhedra in R n /R1 (see Proposition 15), tropical Borel probability measures exist if finite tropical Borel measures µ exist on T N by an appropriate scaling of the value of µ on each polyhedron.]()

leaves depicted in Figure2. In particular, consider the upper righthand orthant defined by the axes D 34 and D 12 . In Figure

5, take a tree

