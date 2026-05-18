- **Problem Statement**: Efficient vision-language understanding of large Remote Sensing Images (RSIs) is challenging due to limited pre-defined grids leading to information loss and high computational costs with unlimited grids.

- **Proposed Method**: Introduces a text-guided token pruning method integrated with a Dynamic Image Pyramid (DIP) to balance resolution and computational efficiency.

- **Key Components**:
  - **Region Focus Module (RFM)**: Identifies critical vision tokens using text-aware region localization.
  - **Dynamic Image Pyramid (DIP)**: Facilitates coarse-to-fine image tile selection and vision token pruning based on RFM outputs.

- **Benchmark Creation**: Developed LRS-VQA, a new benchmark with 7,333 QA pairs across 8 categories, featuring images up to 27,328 pixels, addressing the limitations of existing benchmarks.

- **Performance Improvement**: The proposed method outperforms existing high-resolution strategies on four datasets while demonstrating higher efficiency in high-resolution settings.

- **Attention Mechanism**: Utilizes a self-attention mechanism defined as:
  \[
  A = Attention(Q, K) = Softmax \left( \frac{QK^T}{\sqrt{d}} \right)
  \]
  where \( A \) is the attention score matrix, \( Q \) and \( K \) are query and key matrices, \( n \) is the input sequence length, and \( d \) is the feature dimension.

- **Dynamic Image Pyramid Construction**:
  - Downsample the original image \( I_{img} \) iteratively to create a series of images \( \{I_{1}^{init}, I_{2}^{init}, \ldots, I_{P}^{init}\} \).
  - Calculate the number of image tiles:
    \[
    N_{p}^{h} = \lceil \frac{H_{p}}{B} \rceil, \quad N_{p}^{w} = \lceil \frac{W_{p}}{B} \rceil
    \]
  - Scale factor:
    \[
    r_{p} = \min \left( N_{p}^{h} \times \frac{B}{H_{p}}, N_{p}^{w} \times \frac{B}{W_{p}} \right)
    \]

- **RFM Architecture**: RFM consists of \( R \) layers initialized from selected layers of the LLM, distilling attention scores to guide vision token pruning.

- **Layer-wise Distillation**: Selects \( K \) pairs from RFM and LLM as student-teacher pairs to avoid rigid alignment, enhancing the RFM's ability to localize text-related key regions.

- **Efficiency Gains**: The architecture-agnostic nature of the proposed method allows for significant performance improvements while maintaining computational efficiency.