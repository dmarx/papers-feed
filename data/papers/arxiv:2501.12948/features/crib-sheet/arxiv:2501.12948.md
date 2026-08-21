- **Models Introduced**: 
  - DeepSeek-R1-Zero: Trained via large-scale RL without SFT, exhibits strong reasoning capabilities but suffers from readability and language mixing.
  - DeepSeek-R1: Enhances DeepSeek-R1-Zero with multi-stage training and cold-start data, achieving performance comparable to OpenAI-o1-1217.

- **Key Contributions**:
  - First open research validating reasoning capabilities of LLMs through pure RL without SFT.
  - Development pipeline includes two RL stages and two SFT stages for improved reasoning and alignment with human preferences.

- **Reinforcement Learning Framework**:
  - **Algorithm**: Group Relative Policy Optimization (GRPO) used to optimize the policy model without a critic model.
  - **Objective Function**:
    \[
    J_{GRPO}(\theta) = E[q \sim P(Q), \{o_i\}_{i=1}^G \sim \pi_{\theta_{old}}(O|q)] \frac{1}{G} \sum_{i=1}^G \min \left( \frac{\pi_{\theta}(o_i|q)}{\pi_{\theta_{old}}(o_i|q)} A_i, 1 + \epsilon \right) - \beta D_{KL}(\pi_{\theta} || \pi_{ref})
    \]

- **Training Process**:
  - **Cold-Start Data**: Initial fine-tuning of DeepSeek-V3-Base with thousands of CoT examples before RL.
  - **SFT Data Generation**: New SFT data created through rejection sampling on RL checkpoints.

- **Performance Metrics**:
  - DeepSeek-R1 achieves 79.8% Pass@1 on AIME 2024, surpassing OpenAI-o1-1217.
  - Scores 97.3% on MATH-500, demonstrating expert-level performance in coding tasks with a 2,029 Elo rating on Codeforces.

- **Distillation Results**:
  - Smaller models distilled from DeepSeek-R1 outperform models trained solely with RL.
  - Notable scores: 
    - DeepSeek-R1-Distill-Qwen-7B: 55.5% on AIME 2024.
    - DeepSeek-R1-Distill-Qwen-32B: 72.6% on AIME 2024, 94.3% on MATH-500.

- **Reward Modeling**:
  - **Types of Rewards**:
    - Accuracy rewards for correctness verification.
    - Format rewards to enforce structured reasoning output (e.g., using `<think>` and `<answer>` tags).

- **Evaluation Summary**:
  - DeepSeek-R1 excels in creative writing, QA, summarization, and long-context understanding, achieving a win-rate of 87.6% on AlpacaEval 2.0.

- **Future Directions**:
  - Open-sourcing of models and APIs to facilitate further research and development in reasoning capabilities of LLMs.