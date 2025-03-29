# When Large Vision-Language Model Meets Large Remote Sensing Imagery: Coarse-to-Fine Text-Guided Token Pruning

## Abstract

## 

Efficient vision-language understanding of large Remote Sensing Images (RSIs) is meaningful but challenging. Current Large Vision-Language Models (LVLMs) typically employ limited pre-defined grids to process images, leading to information loss when handling gigapixel RSIs. Conversely, using unlimited grids significantly increases computational costs. To preserve image details while reducing computational complexity, we propose a text-guided token pruning method with Dynamic Image Pyramid (DIP) integration. Our method introduces: (i) a Region Focus Module (RFM) that leverages text-aware region localization capability to identify critical vision tokens, and (ii) a coarse-to-fine image tile selection and vision token pruning strategy based on DIP, which is guided by RFM outputs and avoids directly processing the entire large imagery. Additionally, existing benchmarks for evaluating LVLMs' perception ability on large RSI suffer from limited question diversity and constrained image sizes. We construct a new benchmark named LRS-VQA, which contains 7,333 QA pairs across 8 categories, with image length up to 27,328 pixels. Our method outperforms existing high-resolution strategies on four datasets using the same data. Moreover, compared to existing token reduction methods, our approach demonstrates higher efficiency under high-resolution settings.

## Introduction

Benefiting from the rapid advancement of Large Language Models (LLMs) [[1,](#b0)[9,](#b8)[12,](#b11)[15,](#b14)[67]](#b66), Large Visual-Language Models (LVLMs) have demonstrated strong capabilities in * indicates interns at Ant Group. ‡ Corresponding author. perceiving and understanding visual information in textbased multimodal interactions [[7,](#b6)[25,](#b24)[35,](#b34)[57]](#b56). Currently, LVLMs have been extensively studied and applied across various fields like remote sensing (RS) intelligent interpretation [[10,](#b9)[28,](#b27)[43,](#b42)[46,](#b45)[65,](#b64)[75,](#b74)[79]](#b78).

Advances in satellite imaging technology allow for the acquisition of large remote sensing images (RSIs) that cover extensive ground areas and contain detailed land use information. Therefore, natural language-based intelligent analysis of large RSIs is valuable for applications such as com-plex scene understanding [[33]](#b32), urban planning [[31,](#b30)[56]](#b55), infrastructure development [[62]](#b61), and monitoring [[85]](#b84).

Some RS LVLMs handle high-resolution input through position embedding interpolation [[24,](#b23)[78]](#b77). Additionally, various dynamic high-resolution strategies designed for general LVLMs [[29,](#b28)[35,](#b34)[72]](#b71) can be adapted to RS LVLMs, such as EarthDial [[53]](#b52) (based on InternVL1.5 [[8]](#b7)) and GeoPixel [[49]](#b48) (using InternLM-XComposer2.5 [[76]](#b75)). However, these approaches for high-resolution image processing are limited when handling large RSIs exceeding 10,000×10,000 pixels. As depicted in Fig. [1](#fig_0), these methods typically employ limited pre-defined grid partitions, leading to detail loss when large RSIs are excessively downsampled. Conversely, unlimited grids suffer from prohibitive time and memory costs (e.g., over 5 million vision tokens for a large RSI in LLaVA-1.5 [[35]](#b34)). This necessitates balancing resolution and computational efficiency when processing large RSI.

To overcome the above limitations of existing strategies in handling large RSIs, we propose a text-guided token pruning strategy that consists of two key components: a Region Focus Module (RFM) and a Dynamic Image Pyramid (DIP). The RFM identifies text-relevant key vision tokens by leveraging the capability distilled from the LLM component. Based on the RFM's output, we select critical image tiles and conduct token pruning in a coarse-to-fine manner within the DIP. This enables the LVLM to focus and zoom in key areas, avoiding to process all visual tokens, thereby facilitating flexible and efficient inference.

Moreover, benchmarks for LVLMs in understanding large RSIs remain insufficiently developed. Although MME-Realworld [[83]](#b82) includes large RSIs with high-quality manually annotated questions, its RS subset suffers from limited question diversity and image sizes. To more comprehensively characterize the challenges of large RSI perception, we construct a new benchmark called LRS-VQA (Large Remote Sensing image Visual Question Answering). LRS-VQA features larger size images with lengths up to 27,328 pixels and 8 distinct question types. Our key contributions are as follows:

• We introduce a Region Focus Module (RFM) that distills the ability from LLM part of LVLM to efficiently identify text-related key vision tokens. • Based on RFM and DIP, we propose an efficient coarseto-fine inference strategy for large RSIs, which achieves a balance between resolution and efficiency through key tile selection and vision token pruning. • We construct a new benchmark named LRS-VQA, featuring larger image sizes and more diverse question types than existing benchmarks, to reflect the challenges of large RSIs perception. • The proposed method is architecture-agnostic and shows performance improvements and efficiency gains.

## Related Work

## LVLMs for High-Resolution Comprehension

Numerous LVLMs designed for high-resolution image or video perception have recently emerged. They can be primarily categorized into the following paradigms: Methods that carefully design image cropping and padding strategy. Methods like [[8,](#b7)[16,](#b15)[25,](#b24)[34,](#b33)[35,](#b34)[38,](#b37)[72,](#b71)[82]](#b81) traverse pre-defined partition grids and obtain the most suitable grid, to divide the high-resolution image into image tiles. These methods encounter limitations when processing large RSIs as in Fig. [1](#fig_0).

Methods based on multiple visual branches. These approach [[30,](#b29)[42,](#b41)[55]](#b54) employ additional high-resolution visual encoders like SAM [[22]](#b21) encoder or ConvNext [[39]](#b38) to process images with higher input resolution.

Visual chain-of-thoughts methods. These approaches utilize a search-and-focus strategy [[51,](#b50)[52,](#b51)[58,](#b57)[61]](#b60) or external RAG pipeline [[84]](#b83) to identify text-related key image regions. However, such pipelines require multiple LVLM inferences, making them more complex and cumbersome.

## Vision Token Reduction in LVLMs

Visual token pruning for transformers has been a classic research topic, it aims to accelerate computation by dynamically reducing less important tokens. It has been extensively studied in both natural language processing [[21,](#b20)[71]](#b70) and computer vision domains [[14,](#b13)[23,](#b22)[44,](#b43)[48,](#b47)[60]](#b59).

Recently, a variety of token pruning methods have been proposed for LVLMs, which can be categorized into three main types: token pruning conducted in the vision encoder [[4,](#b3)[29,](#b28)[50,](#b49)[59,](#b58)[69,](#b68)[70]](#b69), token pruning performed in the LLM component [[6,](#b5)[17,](#b16)[18,](#b17)[64,](#b63)[73,](#b72)[80]](#b79), and collaborative approaches that integrate both [[5,](#b4)[26,](#b25)[27,](#b26)[32,](#b31)[66,](#b65)[74,](#b73)[77]](#b76).

Although vision-part pruning methods efficiently reduce vision tokens, when processing large images, it's highly time-consuming to traverse pre-defined grids and handle numerous image tiles with the vision encoder. Moreover, the absence of language guidance makes it hard to identify foreground regions in complex RSIs. The LLM-part pruning methods require feeding all vision tokens into the LLM. Therefore, long visual sequences from large images may exceed LLM length limits and incur high computational costs for attention score ranking.

Among the collaborative approaches, the methods most closely related to ours are LLaVA-Mini [[77]](#b76) and FlexAttention [[27]](#b26). The former employs modality pre-fusion to compress visual information; however, its LLM-like pre-fusion module still struggles with handling extremely long vision sequences. The latter integrates text-guided high-resolution features within the LLM component. Nevertheless, the allowable image size for its high-resolution view remains limited, and it can only index high-resolution features once. 

## Preliminaries

In this section, we present the foundational concepts of text-image attention within the LLM component of highresolution LVLMs. The proposed RFM leverages this mechanism to guide the text-related key image tile selection and the vision token pruning.

Mainstream modular LVLMs include three components [[41]](#b40): a pre-trained vision encoder, a feature projector, and a pre-trained decoder-only LLM. Conventional highresolution strategies [[8,](#b7)[16]](#b15) process the original image I img into a thumbnail view I thumb and a set of image tiles I tiles . Then the vision encoder and the projector transforms I thumb and I tiles into vision token embeddings T vis = [T lr vis , T hr vis ], which contain low-resolution tokens T lr vis from the I thumb and higher-resolution T hr vis from the I tiles . T vis are concatenated with text token embeddings T txt from the tokenized text instruction, forming a multimodal token sequence T = [T vis , T txt ]. The LVLM processes T via transformer-based decoder layers with causal self-attention, where the attention score A can be represented as:

$A = Attention(Q, K) = Softmax ( QK ⊺ √ d ) ,(1)$where A ∈ R n×n is the self-attention map, Q, K ∈ R n×d are the query and key matrices derived from the input embeddings through linear transformations, n is the input sequence length, and d is the feature dimension. As A determines the weight each token assigns to the former tokens in the sequence, by analyzing the attention from text tokens to vision tokens, we can identify text-related important vision tokens. Some studies [[20,](#b19)[73]](#b72) observe that in the deep layers of LLM part in LVLMs, attention is predominantly allocated to text-related vision tokens compared to other vision tokens. This insight inspired us to design a coarse-to-fine mechanism to focus on key image regions.

## Method and Benchmark

## Method

To achieve efficient high-resolution image understanding, we propose a method that combines text-guided key region localization with a multi-level dynamic image pyramid (DIP), as shown in Fig. [2](#fig_1). Initially, the DIP is constructed based on the input large image. At the low-resolution DIP level, the Region Focus Module (RFM) provides attention distribution for the initial vision tokens. These result guides the retrieval of corresponding image tiles from 

## The Construction of Dynamic Image Pyramid

Given an original large RSI I img , we construct an imagelevel pyramid with a variable number of layers to generate a series of image tiles at different ground sample distances (GSDs), enabling coarse-to-fine inference. First, we iteratively downsampling I img by a factor of 2, generating a series of images {I 1 init , I 2 init , . . . , I P init } until the shorter side reaches a pre-defined minimum length. Let a basic image tile size be B × B (e.g., 336 × 336 for CLIP-L14), for the p-th scaled image I p init , we calculate the number of image tiles along the height and width as follows:

$N p h = ⌈H p /B⌉, N p w = ⌈W p /B⌉,(2)$where H p , W p are the height and width of I p init , respectively. For proper tiling, we compute a scale factor r p as:

$r p = min ( N p h × B H p , N p w × B W p ) .(3)$The image I p init is then resized to I p using r p , followed by padding to preserve the original aspect ratio. After resizing, I p is partitioned into non-overlap tiles I p tiles . Tiles from all scaled images are combined in reverse order, and integrated with the thumbnail view I thumb to form the final pyramid: I DIP = {I thumb , I 1 tiles , I 2 tiles , . . . , I P tiles }, which consists of P + 1 layers with progressively increasing resolutions. During training, we select the thumbnail I thumb and I 1 tiles as visual inputs for computational efficiency. During inference, all pyramid layers become accessible to enable multi-scale inference, as in the left part of Fig. [2](#fig_1).

## Attention Distillation for Key Region Focus

In this section, we introduce the core idea and details of the Region Focus Module (RFM), a lightweight module designed to replicate the text-guided region localization capability inherent in LVLM's LLM part. RFM can be seamlessly integrated during the supervised fine-tuning (SFT) stage of LVLM, and generates attention scores for vision tokens during inference.

Prior findings [[20,](#b19)[64,](#b63)[73]](#b72) demonstrate that the deep layers in the LLM part of LVLM could accurately localize textrelated key regions in the image through cross-model attention. Inspired by this observation, our core idea is to distill this text-guided key region focus capability from the LLM, as shown in the left part of Fig. [3](#fig_2). After distillation, the trained RFM can help to select text-related key image tiles and prune vision tokens before the LLM, reducing computational overhead from the image encoding stage.

Specifically, assuming the LLM has M layers l 1 , l 2 , . . . , l M , the proposed RFM adopts the same architecture with R layers r 1 , r 2 , . . . , r R , where R<M . Each RFM layer r i is initialized from a selected LLM layer l mi , where {m 1 , m 2 , . . . , m R } forms a sparse subset of LLM layer indices. For layer-wise distillation, we select K pairs (K<R) from RFM and LLM as student-teacher pairs, represented as {(r k , l m k ) | k = 1, 2, . . . , K}. This strategy avoids rigidly aligning each r i with l mi , which would neglect the non-teacher layers in the LLM, resulting in inconsistency between adjacent RFM layers when training.

As depicted in the right part of Fig. [3](#fig_2), the concatenated multimodal tokens T = [T vis , T txt ] are fed into both the RFM and the LLM during training. For the k-th studentteacher layer pair (r k , l m k ), we extract the attention scores between the last text token and all vision tokens from the multi-head self attention (MHSA). For the h-th head, the self-attention is represented as A k,h stu , A k,h tea ∈ R j×nv , where j is the number of dialogue turns for multi-turn instruction and n v is the length of vision tokens. We apply the Kullback-Leibler (KL) divergence loss for distillation:

$L h kl = K ∑ k=1 [D KL (A k,h tea ∥ A k,h stu ) + λ hr D KL (A k,h,hr tea ∥ A k,h,hr stu )] ,(4)$where A k,h,hr tea , A k,h,hr stu denote attention corresponding to T hr vis , and λ hr is the weighting factor. Additionally, we enforce stronger alignment constraints to the attention of T hr vis by using an additional Mean Squared Error (MSE) loss:

$L h mse = K ∑ k=1 MSE (A k,h,hr stu , A k,h,hr tea ) .(5)$The total distillation loss is computed as:

$L distill = 1 KH H ∑ h=1 (λ mse L h mse + λ kl L h kl ) , (6$$)$where K is the number of selected student-teacher layer pairs, H is the number of attention heads, and λ mse , λ kl are hyperparameters. For the flash-attention [[11]](#b10), we employ a specialized value matrix to extract attention maps like [[80]](#b79) to ensure compatibility.

## Text-Guided Token Pruning with Pyramid

Given the extensive irrelevant background content in large RSIs, the core of our strategy lies in iteratively selecting text-related key image tiles and performing token pruning, thereby achieving a coarse-to-fine inference, as illustrated in the below part of Fig. [2](#fig_1). Specifically, we integrate DIP and RFM for inference, as detailed in Alg. 1. For simplicity, the tokens from the system prompt are omitted. We initialize the vision input using I thumb and I p tiles to generate the initial T vis = [T lr vis , T p,hr vis ], where p = 1, then the concatenated tokens T are fed into the RFM. From the last layer of the RFM, we compute the average attention scores from all heads in the MHSA, and extract the attention scores A K,hr stu of T p,hr vis . By selecting the top-λ proportion from A K,hr stu , we identify the indices of key tokens and map their coordinates to image tile-level coordinates, to select key image tiles I p+1 key from I p+1 tiles . Based Algorithm 1 Coarse-to-Fine Token Pruning with DIP Require: {I 1 tiles , I 2 tiles , . . . , I P tiles } in I DIP , K-layer RFM, initial multimodal tokens T , vision encoder and projector V(⋅), token saving ratio α, tile number threshold N max Ensure: Retained tokens T retain vis 1: Definition: Top-α(X) selects elements in X with values in the top α proportion. 2: for p = 1 to P do Normalize:

5:

Identify key positions: P K,hr key ← Top-α(A

K,hr stu ) 6: if p < P then 7: Map coordinates and select key tiles: I p+1 key ← {t ∈ I p+1 tiles | mapped from P K,hr key } 8: if |I p+1 key | > N max then 9: Prune tokens: T retain vis ← {t ∈ T p,hr vis | P K,hr key } 10: break 11: else 12: Encode selected tiles: T p+1,hr vis ← V(I p+1 key ) 13: Update T ← [T lr vis , T p+1,hr vis , T txt ] 14: end if 15: else 16: Prune tokens at final layer: T retain vis ← {t ∈ T p,hr vis | P K,hr key } 17:

end if 18: end for 19: return T retain vis on the number of I p+1 key , we determine whether to prune the T p,hr vis directly or replace it with vision tokens T p+1,hr vis from higher-resolution tiles. If T p+1,hr vis is obtained, the tile selection process is repeated recursively until the last layer of DIP is reached. This approach enables LVLM to focus only on processing a few high-resolution image tiles in a coarseto-fine manner, thereby reducing computational complexity while preserving critical text-related image details.

## The Construction of LRS-VQA Benchmark

Considering the limitations of existing benchmarks for evaluating LVLMs' perception of RSIs in terms of question diversity and image size, we propose a new benchmark for more comprehensively evaluation.

## Annotation Pipeline

The annotation pipeline of LRS-VQA is illustrated in Fig. [4](#fig_4). We collect 3 publicly remote sensing datasets: FAIR1M-1.0 [[54]](#b53), GLH-Bridge [[31]](#b30), and STAR [[33]](#b32), and identify all unique targets based on the object detection labels to generate unique references from them (e.g., "the top-most ship" and "the largest dock"). Subsequently, we crop the region with the unique target from the original image, and feed it, along with a prompt containing the unique reference, into  GPT-4V [[47]](#b46) to generate question-answer pairs about the target's color, shape, status, etc. Details of the overall construction process are provided in the Appendix A.1.

## Visual-Centric Quality Check and Refinement

To ensure the quality of the generated question-answer pairs, we employ powerful Qwen2-VL [[57]](#b56) for quality assessment. Qwen2-VL supports manual adjustment of the maximum pixel resolution, allowing us to evaluate whether increased resolution improves accuracy while keeping the LLM unchanged. Using this approach, we filter out question types where accuracy can not improve with resolution. Through iterative filtering, manual review, and prompt refinement, we obtain the LRS-VQA dataset, which could effectively assess the large RSI perception capability of LVLMs, as shown in Fig.

5. LRS-VQA contains eight question-answer types: count, color, category, shape, status, reasoning, rural/urban classification, and target background. It features greater diversity in question types and larger image sizes than MME-Realworld-RS as in Tab. 1, highlighting the complexities of large RSI perception. 

## Experiments

## Experimental Details

Data. During the pre-training (PT) phase, we utilized the same 558K data used in LLaVA-1.5 [[36]](#b35). For the SFT phase, we collect 484K samples, including 300K sampled from LLaVA-1.5-665K, 146K sampled from RSVQA-HR [[40]](#b39), and 38K template-based samples from 3 RS datasets [[13,](#b12)[31,](#b30)[33]](#b32) using their labels. Note some images in this 38k data are from the same source as LRS-VQA, but there is no overlap or duplication between them. Details can be found in the Appendix A.2.1. Benchmarks and evaluation metrics: i) MME-RealWorld-RS: the RS part of MME-Realworld [[83]](#b82), containing 1,298 RSIs with expert-annotated questions in three types: color, count, and position. We follow the official evaluation script but modify the prompt by removing "The best answer is:" to address Vicuna-1.5-based models' tendency to respond with only option A. ii) LRS-VQA: it consists of 3 parts: LRS-FAIR, LRS-Bridge, and LRS-STAR, containing 2,272, 1,062, and 3,999 QA pairs, respectively.

For the short open-ended format, we adopt a structured evaluation metric following [[19,](#b18)[63]](#b62), using WordNet [[45]](#b44), with a semantic similarity threshold of 0.8.

Experimental settings. We employ existing LVLMs' official weights or api for evaluation. For comparison, Table 4. Comparison of computational efficiency with different token reduction methods based on LLaVA-Next-Qwen2. We assume inferring a 4000×4000 pixel image (anyres-p144) and report the theoretical TFLOPs of vision tokens after the vision projector.

respectively. The RFM-LLM layer pairs are [[1,](#b0)[5,](#b4)[11,](#b10)[14]](#b13) with distillation applied to the first and last pairs. More experimental details are in the Appendix A.2.2.

## Leaderboard and Comparison

Leaderboard on LRS-VQA. We evaluate a total of 11 open-source LVLMs, including methods for high-resolution [[27,](#b26)[36,](#b35)[76,](#b75)[82]](#b81), chain-of-thought reasoning [[61]](#b60), multiple visual encoders [[30]](#b29), and RS LVLMs [[24,](#b23)[37]](#b36). We also Comparison with token reduction methods. As shown in Tab. 3 and Tab. 4, we reproduce 4 plug-and-play methods for comparison on MME-RealWorld-RS. For Prune-Merge++ [[50]](#b49) and our RFM-based pruning, the retain ratio is 25%. For VisionZip [[69]](#b68), the number of retained tokens is 64. For PDrop [[64]](#b63) under Qwen2, pruning layers are set to [[7,](#b6)[14,](#b13)[21]](#b20). Additionally, we employ 3-layer DIP, supporting up to 2,016×2,016 pixels, which improves accuracy by 1.46% and boosts FPS by 39% compared to other methods. For Tab. 4, we consistently use a 4-layer DIP. Since our method dynamically selects image tiles, we calculate the average number of tiles selected from similar size images in the dataset. Above results indicate that existing methods often overlook the high cost of processing many text-irrelevant image tiles in large images.

## Ablation Results

We conducted ablation studies on the MME-RealWorld-RS, from the following aspects to perform an in-depth analysis:

Different ratios for RFM-based pruning. As shown in Tab. 5, a key finding is that in large RSIs, the complex background and the small foreground regions enable high pruning rates to deliver performance benefits.

Fixed DIP layers for inference. As shown in Tab. 6, we fix the number of DIP layers reached during inference. If an image's DIP is shallower than the specified number, the last layer is used. Results show that forcing traversal to higher resolutions can degrade performance since not all questions require image details. Therefore, our strategy dynamically selects the termination DIP layer based on the input text, balancing accuracy and efficiency.

Distillation settings for the RFM module. We explore the impact of different RFM-LLM layer-pairs in Tab. 7. Results show that introducing too many layers may hinder effective distillation and increase training and inference time, while too few layers may prevent RFM from effectively learning text-aware localization ability.

Visualization results. In Fig. [6](#fig_6), we visualize the attention maps generated by the trained RFM for vision tokens from initial input image tiles. The results demonstrate that text references to targets effectively guide the RFM's attention output, supporting our coarse-to-fine inference.

## Conclusion

This paper presents a text-guided token pruning method tailored for efficiently processing large remote sensing images (RSIs). To address the limitations of existing high-resolution approaches when handling large RSIs, our method integrates the Region Focus Module (RFM) and Dynamic Image Pyramid (DIP) to focus on text-relevant key vision tokens while reducing computational overhead. Furthermore, we introduce a new benchmark, LRS-VQA, with 7,333 QA pairs covering 8 question types, and features larger image sizes and a diverse range of question types.

Future work. Vision-language understanding of large RSIs remains challenging. Exploring alternative perspectives, such as long-context transfer from LLMs to LVLMs, to seek solutions is also meaningful.

![Figure 1. High-resolution strategy comparison for modular LVLMs. (a) and (b) show existing grid-based cropping methods face challenges when processing large RSIs. (c) The proposed dynamic pyramid-based token pruning strategy can dynamically select image tiles of key regions related to the input text, balancing image detail and computational cost.]()

![Figure 2. The pipeline of the proposed method. The entire process iterates in a coarse-to-fine manner, dynamically retrieving highresolution features from the next DIP level (leftward orange arrow) or performing token pruning at the current level (rightward orange arrow) based on the output of the RFM module at each iteration. During training, the RFM distillation text-related attention from the LLM; during inference, RFM generates the attention scores for the input vision tokens. GSD means ground sample distance.]()

![Figure 3. The proposed RFM and attention distillation strategy. The left part indicates our core idea: distill accurate text-related key region localization ability from the LLM part of the LVLM. The right part shows the distillation details. We only select specific layer pairs for distillation to avoid hidden state discontinuities. "sys token" represents the tokens from the system prompt.higher-resolution DIP levels or trigger token pruning at the current level. This iterative process could continue through the pyramid until reaching the original resolution. Below, we introduce our approach in three components: DIP construction in Sec. 4.1.1, RFM and attention distillation in Sec. 4.1.2, and their integration in Sec. 4.1.3.]()

![Compute attention: A K,hr stu ← RFM(T )[T p,hr vis ]4:]()

![Figure 4. The construction pipeline of the proposed LRS-VQA dataset. The visual prompt (red box) is inspired by SoM [68].]()

![Figure 5. The accuracy trends of Qwen2-VL across varying input maximum pixels. This demonstrates that accuracy on both the manually annotated MME-RealWorld-RS and our proposed LRS-VQA exhibit a positive correlation with resolution improvement, proving the effectiveness of LRS-VQA in evaluating LVLM's high-resolution RSI perception capabilities.]()

![Figure 6. Text-related visual attention localization in the last layer if trained RFM under LLaVA-Next-Qwen2.]()

![Comparison of existing benchmarks for evaluating LVLMs' perception capabilities in large RSIs.]()

![Leaderboard and performance comparison on LRS-VQA and MME-RealWorld-RS. "MME-RW-RS" indicates the MME-RealWorld-RS. "Data" refers to the total instruction data used during PT and SFT. "pX" indicates the max number is X for the pre-defined grids. "method*" indicates we reproduce the SFT stage of existing methods using the 484k instruction data.For our method, the minimum length for DIP is 1,008 pixels. For Vicuna-1.5 and Qwen2, the N max is set to 40 and 80, respectively. The vision token saving ratio α is 0.25, λ hr , λ mse , λ kl are 2.0, 1.0, 1.0,]()

![25% 42.47 31.08 47.41 40.40 50% 42.39 31.24 48.45 40.77 75% 43.98 30.42 49.16 41.28 90% 41.51 29.77 46.70 39.41 Ablation study on different prune ratios with LLaVA-Next-Qwen2, when pruning vision tokens based on RFM results without DIP. This table demonstrates that pruning irrelevant tokens in high-resolution RSIs can improve performance.]()

![Ablation study on fixing the number of DIP layers reached in inference with LLaVA-Next-Qwen2. Rows 1-4 correspond to fixing the number of DIP layers being 2-5, respectively.]()

