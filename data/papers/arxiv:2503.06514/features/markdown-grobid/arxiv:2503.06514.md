# GFlowVLM: Enhancing Multi-step Reasoning in Vision-Language Models with Generative Flow Networks

## Abstract

## 

Vision-Language Models (VLMs) have recently shown promising advancements in sequential decision-making tasks through task-specific fine-tuning. However, common fine-tuning methods, such as Supervised Fine-Tuning (SFT) and Reinforcement Learning (RL) techniques like Proximal Policy Optimization (PPO), present notable limitations: SFT assumes Independent and Identically Distributed (IID) data, while PPO focuses on maximizing cumulative rewards. These limitations often restrict solution diversity and hinder generalization in multi-step reasoning tasks. To address these challenges, we introduce a novel framework, GFlowVLM, a framework that fine-tune VLMs using Generative Flow Networks (GFlowNets) to promote generation of diverse solutions for complex reasoning tasks. GFlowVLM models the environment as a non-Markovian decision process, allowing it to capture long-term dependencies essential for real-world applications. It takes observations and task descriptions as inputs to prompt chain-of-thought (CoT) reasoning which subsequently guides action selection. We use task based rewards to fine-tune VLM with GFlowNets. This approach enables VLMs to outperform prior fine-tuning methods, including SFT and RL. Empirical results demonstrate the effectiveness of GFlowVLM on complex tasks such as card games (NumberLine, BlackJack) and embodied planning tasks (ALFWorld), showing enhanced training efficiency, solution diversity, and stronger generalization capabilities across both in-distribution and out-ofdistribution scenarios.

## Introduction

Vision-Language Models (VLMs) have achieved remarkable results in generalized tasks such as image captioning and visual question answering [[15,](#b14)[20,](#b19)[45]](#b44). However, they struggle with structured reasoning in sequential decision making tasks that require causal understanding data [[3]](#b2), especially in long horizon planning for tasks such as embod-ied AI, where agent must capture long term dependencies.

Recent advancements in large language models demonstrate emergent reasoning capabilities by leveraging Chainof-Thought (CoT) [[35]](#b34) reasoning, that enhances decisionmaking in multi-step interactive environments [[7,](#b6)[25,](#b24)[35]](#b34). Typically, these models are fine-tuned using specialized visual instruction-following datasets through Supervised Fine Tuning (SFT) methods [[18,](#b17)[20]](#b19), without active interaction with the environment, or optimized through Reinforcement Learning (RL) approaches, such as Proximal Policy Optimization (PPO) [[29,](#b28)[41]](#b40). However, SFT approaches often limits generalization to unseen scenarios, as training relies on maximizing the likelihood over a limited, specialized dataset, thereby restricting diversity in the solution space [[17]](#b16). Furthermore, for cases where RL methods tend to focus on immediate rewards, can hinder the model's ability to consider long-term outcomes. Consequently, limited exploration in these models can result in an oversight of more optimal long-term strategies, leading to suboptimal performance in complex tasks [[44]](#b43).

Unlike traditional reinforcement learning (RL) methods, which focus on maximizing cumulative rewards [[5,](#b4)[6]](#b5), Generative Flow Networks (GFlowNets) [[1]](#b0) train stochastic policies to sample diverse, high-reward sequences (e.g., token sequences) with probabilities proportional to a specified reward function R(x) [[2]](#b1). This approach samples sequences based on the reward function's distribution, enabling it to find a broader range of high-reward solutions beyond those typically identified by reward-maximizing techniques. Recent studies have applied GFlowNets to multi-step reasoning within the Large Language Models (LLMs) framework, demonstrating their effectiveness over maximum likelihood training and traditional reward-maximization methods [[8,](#b7)[33,](#b32)[40]](#b39). However, these methods lack the multimodal capabilities essential for embodied AI tasks that require integrated visual and textual inputs. Additionally, related works, such as FoR [[40]](#b39), assume Markovian structures within this framework, which may not capture the dependencies necessary for complex, long-horizon, real-world reasoning tasks.

To address these gaps in VLMs, we propose a novel approach GFlowVLM-that leverages GFlowNets for endto-end fine-tuning in sequential tasks, explicitly modeling non-Markovian flows for richer multimodal reasoning. This framework is, to our knowledge, the first to integrate GFlowNets with VLMs in an end-to-end setting, tackling the unique challenges of multimodal, sequential reasoning essential for complex planning tasks. Our approach initializes policy with a pretrained VLM and fine-tunes it using GFlowNets, guiding VLMs toward structured reasoning processes that capture logical dependencies between successive states. By implicitly representing reasoning as a tree structure-where nodes correspond to states with prior actions and observations, and edges represent actions leading to the next state-GFlowVLM enhances efficient learning of diverse and complex reasoning sequences. Empirical results demonstrate that our method outperforms standard fine-tuning techniques, such as SFT and RL methods like PPO, in achieving structured, multimodal reasoning.

Our main contributions are as follows: • We introduce a novel framework that integrates GFlowNets with common-sense capabilities of VLMs for multi-step decision making tasks, enhancing their reasoning abilities. To the best of our knowledge, this is the first work to explore this integration. • By fine-tuning VLMs with GFlowNets, we improve their capacity to handle complex reasoning tasks, enabling better exploration of reasoning paths, generating diverse solutions, achieving stronger generalization to out of distribution tasks. • Through extensive experimentation, we demonstrate that our framework achieves better training efficiency, higher success rate and diversity in solution generation tasks compared to existing methods.

## Related Works Multi-Step Reasoning with Vision Language Models

Recent research has advanced the reasoning capabilities of large foundation models through specialized prompting techniques [[4,](#b3)[28,](#b27)[[34]](#b33)[[35]](#b34)[[36]](#b35)[[37]](#b36)[39]](#b38) and fine-tuning methods [[3,](#b2)[25,](#b24)[32]](#b31) that often add MLP or transformer layers to frozen models to interface with action spaces. Reinforcement learning from human feedback (RLHF) also aids in developing reward models [[26]](#b25). The RL4VLM approach [[41]](#b40) uses PPO to train VLMs but lacks the structured reasoning enabled by our GFlowNets method, which is designed for deeper understanding of complex tasks. VLM reasoning in interactive environments, particularly embodied AI, has gained attention [[25,](#b24)[35,](#b34)[38,](#b37)[41]](#b40), but our GFlowNets approach uniquely enables structured reasoning, enhancing task comprehension.

GFlowNets GFlowNets [[1]](#b0) were originally created to learn sampling policies from unnormalized distributions, primarily aiding scientific discovery by generating diverse, high-reward samples [[10,](#b9)[11,](#b10)[30]](#b29). They have since been applied in recommendation systems [[21]](#b20), domain adaptation [[46]](#b45), combinatorial optimization [[14,](#b13)[42]](#b41), and enhancing neural network interpretability [[16]](#b15). GFlowNets also support sampling from complex posteriors [[9]](#b8), sparse reward RL [[27]](#b26), and multi-objective optimization [[12]](#b11). Recent adaptations fine-tune LLMs for multi-step reasoning tasks [[40]](#b39), yet lack the multimodal capability for embodied AI planning, which we address in this paper.

## Preliminaries

GFlowNets GFlowNets are models that amortize the cost of sampling from a target distribution over terminal states X by learning an approximation of this distribution based on its reward function. Given a directed acyclic graph (DAG) G = (S, A) with states S and directed actions A, there is an initial state s 0 and terminal states X ⊂ S. A trajectory τ = (s 0 → . . . → s n ) represents a complete sequence ending in a terminal state x ∈ X . The trajectory flow F : T → R + defines flows over trajectories, with state flow F (s) = s∈τ F (τ ). A forward policy P F (•|s), often parametrized by a neural network, induces a distribution over trajectories and a marginal distribution over terminal states, with probabilities given by: P

$F (τ ) = P F (s 0 → . . . → s n ) = n-1 t=0 P F (s t+1 |s t ) ∀τ ∈ T . Similarly, a backward policy P B (τ ) = P B (s n → . . . → s 0 ) = n-1$t=0 P B (s t |s t+1 ) ∀τ ∈ T . Given a non-negative reward function R : X → R + , GFlowNets aim to estimate a policy where the likelihood of sampling x ∈ X is proportional to R(x). Thus, there exists a constant Z such that: R(x) = Z τ =(s0→...→sn=x) P F (τ ) ∀x ∈ X , where Z = F (s 0 ) = τ ∈T F (τ ) is total flow at the initial state.

## Off-Policy Training

An advantage of GFlowNets is their ability to leverage off-policy training data by reusing transitions from past trajectories to update the forward policy P F [[1]](#b0). Unlike on-policy reinforcement learning methods, GFlowNets handle diverse, multimodal distributions effectively, using off-policy samples to approximate R(x). This approach improves sample efficiency and accelerates convergence, especially in settings where generating trajectories is costly or where leveraging prior data is beneficial.

## Motivating Experiment

To demonstrate the limitations of traditional approaches and highlight the dependencies captured by GFlowNets, we design a toy experiment combining two types of numerical sequences: (i) the Fibonacci sequence, defined by

$F (n) = F (n -1) + F (n -2)$, where each term is the sum of the previous two, and (ii) an arithmetic sequence with a constant increment, S(n) = S(n -1) + k, where k is a

1, 2, 3 Prompt: Given the sequence of numbers in the image, predict the next number. First, read and list the numbers from the image, and format them as follows: State 0: [first number in the sequence]; State 1: [second number in the sequence]; State 2: [third number in the sequence]; A er reading the numbers, output your predic on for the next number in the sequence in this format: State 3: [predicted number]; PPO GFlownets State 0: 1; State 1: 2; State 2: 3; State 3: 4; State 0: 1; State 1: 2; State 2: 3; State 3: 4; State 3: 5; x 1 x 2 Fabonacci Arithmetic Figure 1. Overview of the prediction of diverse sequence using Gflownets as compared to PPO. The model takes the image of sequence and prompt as input, and generates the next number of sequence by implicitly modeling the causality. Methods Temp. α SR (%) # Solutions w/o fine tuning 1 15.7 1.10 w/o fine tuning 1.2 16.1 1.12 SFT 1 21.7 1.03 SFT 1.2 22.0 1.09 PPO 1 50.2 1.13 PPO 1.2 49.8 1.15 GFlowVLM 1 76.4 1.60 GFlowVLM 1.2 77.9 1.61 Table 1. Results of motivating experiments. α denotes the temperature parameter of decoding. fixed step size (e.g., k = 2 for sequences like [2, 4, 6, . . . ]).

The task presents the model with an image of a partial sequence and a prompt (as shown in Fig. [1](#)), to predict the next number in the sequence. We evaluate the performance of fine-tuning VLM (LLAVA-v1.6-Mistral-7B [[19]](#b18)) using SFT, PPO, and GFlowNets, with temperature parameters α = 1 and α > 1 to assess stochastic performance, as shown in Tab.

1. Success rate (SR), measured as the percentage of correct next-number predictions across 1,000 samples, shows GFlowVLM outperform PPO by 26% and generate 40% more diverse solutions. Compared to SFT, GFlowVLM achieves a 54% higher success rate and yield 59% more diversity in responses, underscoring their strength in learning and generalizing causal structures. This advantage stems from GFlowNets' ability to infer underlying causal reasoning structure of sequence by sequentially sampling reasoning paths, in contrast to the limited diversity observed with SFT and PPO.

## Methodology

This work utilizes GFlowNet's structure learning to enhance the VLM's ability to obtain high-quality, diverse solutions whose distribution is proportional to the reward function. By fine tuning VLMs using GFlowNets, it allows the solutions to be sampled from the distribution of the reward function, which prevents learning policies settled around a small number of modes. Fig. [2](#) shows the overall pipeline of our proposed framework.

The model takes current observation image o t and designed task specific prompt p t as the input. p t contains the description of the goal, history actions a 1:t-1 , history states s 1:t-1 and admissible action space corresponding to the current observation o t . To incorporate Non-Markovian assumption, input z 0:t include history actions a 0:t and states s 0:t , respectively along with the input image o t . * The desired output format includes the CoT reasoning c t and action a t , where a t directly interacts with the environment.

## VLM as a policy: Fine tuning VLMs using GFlowNets to estimate actions

We use a non-Markovian approach, essential for reasoning tasks that depend on multiple past states to capture long-term dependencies, and tackle longer sequences-challenges that the Markovian assumption cannot adequately address. We fine tune VLM of LLaVA [[19]](#b18) as a policy for structured reasoning, where VLM serves as the forward policy P F , selecting the next action a t that advance the reasoning chain at every step t. For each task W, the model takes the visual observation o t and prompt p t as inputs, and outputs the CoT and action.

Prompt Design We retain the same prompt format as [[41]](#b40) for a fair comparison. However, to incorporate historical context in decision-making, we modify the prompt template to include the history of states and actions predicted by the VLM, as shown in Table [Tab](#). 2. The textual prompt p t contains the goal description g, the history of states s 0:t and actions a 0:t , and the action space A t+1 available after interacting with the environment. For certain tasks q that may contain observation-dependent information, such as the textual description d(o t+1 ) of the observation o t+1 , the function f generates the prompt p t+1 as:

$p t+1 = f (d(o t+1 ) • I {Task=q} ,$s 0:t , a 0:t , A t+1 ), where I is an indicator function which is 1 only for a certain task q if the observation-dependent information is available. Action Selection Before selecting an action at each step t, we incorporate a CoT reasoning mechanism, where the model generates intermediate reasoning steps to guide the action selection process. At time t, the VLM first generates Language model MLP Projector Vision Encoder Text Tokenizer Environment Terminal Rewards Gflownet Update VLM Buffer Action CoT Goal Description History states History actions Action space Desired output: 1. CoT 2. Action Figure 2. Overall framework of proposed method: We propose a framework for fine-tuning large VLMs using Gflownets.The input z0:t at time step t consists of a visual observation ot and an input prompt pt containing goal description, history states s0:t, history actions a0:t, and admissible actions At, and outputs CoT reasoning ct, and action at. The at is executed in the environment to obtain reward rt(st, at), next observation ot+1, and action space At+1. f generates the next prompt pt+1 using description of next observation ot+1 (if applicable), history of states s0:t and actions a0:t and next admissible actions At+1. The sequence of transitions < st, at, rt, ct > is added to buffer to update the forward policy PF using Gflownets. xn represents the terminal state of a sequence. a reasoning CoT c t , which includes a description of the image and intermediate thoughts. Since VLMs are pre-trained on large-scale image-caption data, CoT steps provide additional context and help the model explicitly consider dependencies between different states before selecting the next action. The CoT then guides the action selection. The probabilities for the CoT and action sequences of tokens are defined as follows: P CoT (c t |z 0:t , g; θ) = (1) nc j=1 log P VLM (w j |w <j , z 0:t , g; θ) (2) P Action (a t |c t , z 0:t , g; θ) = (3) na i=1 log P VLM (w i |w <i , c t , z 0:t , g; θ)

where n c and n a represent the number of tokens in the CoT sequence c t and action sequence a t , respectively, and w i represents the i-th text token in a sequence. Here, P VLM (w i |w <i , z 0:t , c t , g; θ) and P VLM (w j |w <j , z 0:t , g; θ) denote the VLM's token-level log probabilities for the action and CoT sequences, conditioned on previous tokens, the history of states z 0:t , the history of actions a 0:t-1 and goal description g. Then, the final forward policy P F (z t+1 |z 0:t , g; θ) is then computed as a weighted sum of the action probabilities P CoT (c t |z 0:t , g; θ), based on the CoT reasoning, and the original action probabilities P Action (a t |z 0:t , g; θ):

$P F (z t+1 |z 0:t , g; θ) = P Action (a t |z 0:t , c t , g; θ)+ λP CoT (c t |z 0:t , g; θ),(5)$where λ ∈ [0, 1] is a weighting factor that controls the influence of the CoT reasoning on the final action selection. The CoT probabilities P CoT (c t |z 0:t , g; θ) provide a structured, intermediate reasoning context that refines the decision-making process, ensuring that the final action is selected with consideration of both direct state information and the model's internal thought process. We perform an ablation study on the effect of λ, and we selected λ = 0.4 in our work, as discussed in Supplementary material.

## Training Objectives

We adopt three different objective functions of GFlowNets, Variance Trajectory-Balanced (TB) [[23]](#b22), Subtrajectory-

CoT prompt pt for task M You are trying to solve a task M. {Description of the task}. The action space of M is {all legal actions a ∈ A}. Use [DONE] when you think you have completed the task. Task: {Task description} State 0: {Initial observation} Action 0: {First action} State 1: {Observation for step 1} Admissible Next Actions: {"action1", "action2", " [DONE]" (if applicable)} Your response should be a valid JSON file in the following format: { "thoughts": "first describe what you see in the image using the text description, then carefully think about which action to take to complete the task.", "action": "an admissible action." } Formatted text output { "thoughts": "Given the current state and previous steps, I should choose [at] as the next action.", "action": "at" } Table 2. A template showing the input prompt and corresponding output. The green text highlights the chain-of-thought reasoning which may contain task-specific descriptions, while the red text indicates the action based on the description.

Balanced (SubTB) [[22]](#b21), and Detailed-Balanced (DB) [[2]](#b1), to finetune a VLM. We define z t as the state in the trajectory sequence that includes both a t , s t , and o t .

## Variance Trajectory Balanced (Var-TB) Loss

The Trajectory-Balanced (TB) objective ensures that the probability of generating a complete trajectory τ = (z 0 →

$z 1 → • • • → z n → x) is proportional to the reward R(x).$This objective is given by:

$L VarTB (τ ; θ) = 1 N N i=1 ζ(τ i ; θ) -E τ ζ(τ ; θ) 2 ,(6)$where ζ(•) is the estimated initial flow (see Eq. 13 for details) and N represents the number of sampled trajectories. The details are available in the Supplementary material. This loss ensures that the high-reward trajectories are sampled more frequently by the policy.

## Subtrajectory Balanced (SubTB) Loss

The Subtrajectory-Balanced (SubTB) loss operates on subtrajectories of the form

$z 0:m = (z 0 → z 1 → • • • → z m ).$It ensures that each segment of the reasoning path or structure remains consistent, where the flows are balanced locally between forward and backward transitions. We use a modified version of SubTB loss [[8]](#b7) as follows:

$L SubTB (z 0:m , g; θ) = 0≤i<j≤m log R(z 0:i ⊤) j k=i+1 P F (z k |z 0:k-1 , g; θ)P F (⊤|z 0:j , g; θ) R(z 0:i ⊤)P F (⊤|z 0:i , g; θ) 2 (7$$)$where ⊤ is the [DONE] symbol, and process continues until [DONE] symbol ⊤ is generated similar to [[8]](#b7). This loss penalizes discrepancies in local transitions and ensures that all subsegments of a trajectory follow the correct balance conditions, reducing variance in smaller parts of the trajectory.

## Detailed Balanced (DB) Loss

The Detailed-Balanced (DB) loss is used to ensure that each transition z t → z t+1 between two states is balanced by matching the forward and backward flows at every step of the trajectory. Since it takes transition as input, we need dense rewards. The DB loss is formulated as:

$L DB (z 0:t → z t+1 , g; θ) = log R(z 0:t ⊤)P F (z t+1 |z 0:t , g; θ)P F (⊤|z 0:t+1 , g; θ) R(z 0:t+1 ⊤)P F (⊤|z 0:t , g; θ) 2 .(8)$This loss ensures that every state-to-state transition follows the correct flow, preventing inconsistencies in the trajectory construction.

Remark One challenge when implementing both the SubTB and DB losses is accurately estimating the termination probability, P F (⊤|z 0:t , g; θ), which represents the likelihood of reaching a terminal state at any point in the trajectory. Incorrect estimation of this probability can lead to suboptimal training and unbalanced flows.

To address this, we introduce a new token, [DONE], into the tokenizer to explicitly model the terminal state, and use distinct prompt designs as shown in the Tab. 2. Moreover, we perform an additional SFT step on correctly labeled examples before applying GFlowNets training. This initialization helps the model better estimate termination probabilities, resulting in improved overall performance (See ablation study in Sec. 6).

## Experiments

We evaluate the performance of GFlowVLM on three distinct tasks that require multi-step visual-language reasoning. The Numberline and Blackjack tasks assess GFlowVLM's arithmetic reasoning capabilities with maximum steps set as 10, while Alfworld focuses on decisionmaking tasks that demand visual-semantic understanding with max steps set as 35 in a sequence. We mainly compare

Algorithm 1 Training VLM with GFlowNets Input: An environment env, an initial VLM with parameters θ0, a CoT reasoning scaling factor λ, maximum episode length T , number of tasks W , number of collected trajectories per task K. for w = 1, . . . , W do Bw = ∅ for k = 1, . . . , K do t = 0 g, ot, At = env.reset() pt = f (ot, At) while t ≤ T do z0:t = ⟨ot, pt⟩ ct, at = arg max PF (zt+1|z0:t, g; θw-1) rt, ot+1, At+1 = env.step(at) Bw = Bw ∪ {(st, ct, at, rt} pt+1 = f d(ot+1) • I {q} , s0:t, a0:t, At+1 t = t + 1 if t = T or task w is completed then break end if end while end for Update θw-1 on the collected trajectories Bw for task w to obtain θw end for Output: Updated parameters θW after W tasks.

the performance with RL4VLM [[41]](#b40) and SFT methods. For fair comparison, we use the same base VLM of LLAVA-v1.6-Mistral-7B [[19]](#b18). We conduct 4 independent runs with different random seeds, reporting mean and standard deviation. Episode success rate measures reasoning performance across tasks, while the diversity metric (Div@N) [[40]](#b39) quantifies unique correct solutions across N samples. The minimum for Div@N is 1. GFlowNets' reward function is modified for Numberline and Blackjack as outlined in Sec. 5.2. RL4VLM We compare with RL4VLM [[41]](#b40), which uses PPO to fine-tune the VLM. RL4VLM follows the same environment reward scheme as used in the GymCards tasks, where rewards are set to [0, -1, 1]. Additionally, it em-ploys a Markovian approach by excluding history information from the prompt. To ensure a fair comparison, we modify the original setup with two additional configurations: one that replaces the default environment reward function with our custom reward function, and another that includes history information in the prompt in a non-Markovian manner. These adjustments allow us to evaluate the model's performance under different reward functions and prompt history settings.

## Baselines

## Environments

Numberline. This task involves moving a current number "Current: y t " to a "Target: t". The agent's goal is to align y t with t by outputting an action a t from the discrete set {"+", "-", [DONE](if applicable)}. In-distribution examples include numbers from 0 to 5, and OOD examples range from 10 to 50. We revise the reward function to replace the original discrete rewards of -1, 0, and 1 with non-negative values as follows: R(target, current) = c |target-current|+1 , where c is a scaling constant set to 100. This reward incentivizes the model to bring the current number closer to the target, progressively increasing the reward as the gap decreases. For fair comparison, we run RL4VLM [[41]](#b40) with revised reward structure.

Blackjack. The Blackjack task requires VLM to reason with visual information and adapt to stochastic outcomes. The agent aims to win by selecting an action a t from {"stand", "hit", [DONE](if applicable)}. We revise the reward function to replace the original discrete rewards of -1, 0, and 1 with non-negative values as follows: R(s t , a t ) = max(1 × 10 -10 , (r(s t , a t ) + 1) × 10), where r(s t , a t ) represents the environment's original reward for state s t and action a t . This scales the rewards and ensures they are strictly non-negative. For fair comparison, we run RL4VLM [[41]](#b40) with revised reward structure.

ALFWorld ALFWorld [[31]](#b30) is an embodied AI environment combining a text-based interactive setup with a vision-language planning dataset. ALFWorld has a state-dependent action space A t ; Our prompt instructs the VLM to choose from the admissible actions A t , and we evaluate out-of-distribution (OOD) performance using a test set of previously unseen scenes. We use the same non-negative reward function as used in [[41]](#b40), making it suitable for Var-TB and SubTB losses. However, since it lacks dense rewards for every transition, DB does not perform effectively.

## Results Analysis

Improved VLM Reasoning abilities on In-distribution samples. Our experiments show that GFlowVLM significantly enhances VLM reasoning in tasks like NumberLine, Diverse Solutions Our method generates more diverse solutions than other baselines. In ALFWorld, GFlowNets achieve 25% and 33% higher diversity than RL4VLM and SFT ( Tab. 4), as measured by diversity metric, capturing a wider range of plausible solutions, offering a distinct advantage in scenarios that benefit from broader strategy exploration.

Improved Generalization on OOD samples Our method enhances VLM reasoning on OOD examples, with GFlowNets achieving higher OOD success rates than RL4VLM in NumberLine and ALFWorld tasks by 322% and 156%, respectively. This demonstrates GFlowNets' capacity for robust generalization through diverse, accurate trajectory sampling, enabling effective handling of complex, unseen scenarios.

Benefits from Off-policy data Since GFlowNets allow for off-policy [[13,](#b12)[24,](#b23)[40]](#b39) along with on-policy learning unlike PPO [[29]](#b28), we adopt an off-policy data generation approach to evaluate the impact of using more accurate trajectories during training.

• Numberline: During training, if the on-policy trajectory produced by the model fails to correctly move the current number towards the target, we add to buffer an additional trajectory with an off-policy ground-truth trajectory. This ensures that the model learns from successful trajectories, even when its own predictions deviate from the correct trajectory. By integrating these ground-truth trajectories, we aim to improve the model's ability to generalize to new instances by leveraging more accurate training data. • Blackjack: Due to the stochastic nature of this task, deterministic ground-truth trajectories are unavailable. Instead, we generate high-quality off-policy trajectories using a rule-based approach: the agent "stands" if the hand value is 17 or higher; otherwise, it "hits". This aligns with basic Blackjack strategy, where drawing on a hand of 17 or more risks exceeding 21, balancing improvement chances with busting risk.

Tab. 3 shows results for NumberLine (NL), out-ofdistribution NumberLine (NL-OOD), and BlackJack (BJ) tasks. GFlowVLM with Var-TB, SubTB, and DB, demonstrate improvements with offline data , averaging a 36.2% performance increase over online-only approaches. These results indicate that each loss function benefits from offpolicy high-quality data, leveraging both correct and incorrect solutions to enhance performance, even in challenging OOD scenarios.

Method Assump. Pick Look Clean Heat Cool Pick2 Avg. OOD Div@16 SFT-w/o-[DONE] -39.2 0 14.4 11.1 0 28.6 17.1 3.3 1.06 SFT-w/-[DONE] -32.7 0 10.3 10.8 0 21.8 15.9 3.0 1.02 RL4VLM [41] M 47.4 14.7 10.4 14.4 18.8 18.0 21.7 4.8 1.12 RL4VLM [41] NM 49.1 13.5 9.8 15.2 20.1 20.6 22.1 6.1 1.11 GFlowVLM w/ SubTB NM 50.0 23.1 10.0 18.7 24.3 23.7 26.1 12.3 1.40 GFlowVLM w/ Var-TB NM 50.0 22.2 10.2 16.1 22.7 21.9 25.7 10.9 1.41 Table [4](#). Results of ALFWorld. Since Alfworld does not provide dense rewards, we can not not using DB loss here. Furthermore, while RL4VLM and GFVLM with SubTB are trained with SFT initialization, GFVLM with TB-Var is without STF initialization since we do not need to model the flow.

Figure [3](#). The training curves of in-distribution episode success rates (%) of different methods across three tasks. For the Numberline and BlackJack, RL4VLM has been trained with original reward function, while the GFlowVLM with various loss functions have been trained with revised reward function. This is because RL4VLM serves a strong baseline when trained with original rewards. Since, we did not revise the rewards for ALFWorld, we used the same reward function across all the methods. These models are trained with On-policy sampling method.

Training Efficiency As shown in Fig. [3](#), GFlowNets converge faster than RL4VLM on NumberLine, Blackjack, and ALFWorld, reaching optimal performance with significantly fewer environment steps-about 10,000 fewer than RL4VLM. This efficiency reduces training time and computational demands, supporting scalability for complex reasoning tasks.

Comparisons with different loss functions As shown in the training curves, all three loss functions-DB, Var-TB, and SubTB-converge at a similar rate. DB, which requires dense rewards for every transition since it utilize transitions as input, demonstrates the best generalization, as evidenced in Tab. 3, in the NumberLine and Blackjack tasks. Both SubTB and TB achieve comparable performance in terms of in-distribution and OOD generalization, making them equally effective for a wide range of reasoning tasks.

## SFT Initialization for SubTB and DB Losses

The termination probability P F (⊤|•) in DB and SubTB losses estimates the modified flow in GFlowNet [[27]](#b26), which Var-TB lacks. To enable VLMs to accurately model this for DB and SubTB, we first apply SFT on correctly completed trajecto-ries before fine tuning with GFlowNets. As shown in Tab. 3, SFT initialization significantly boosts SubTB and DB performance on the NumberLine and Blackjack tasks. Without SFT, both losses perform poorly, especially on NL and BJ tasks. With SFT, SubTB and DB improve by 50% and 36% for NumberLine and by 107% and 103% for Blackjack, largely due to better estimation of terminal probability P F (⊤|•).

Markovian and non-Markovian assumptions GFlowVLM outperforms RL4VLM in Non-Markovian settings, excelling in complex, long-horizon tasks. In ALFWorld (Tab. 4), GFlowVLM achieves higher average performance by 18%, OOD robustness by 100%, and diversity by 27%. It also achieves better success rates in gym tasks (Tab. 3), where history aids decision-making, underscoring GFlowNets' advantage over PPO-based methods.

## Conclusion, Limitation, Future Works

We introduced a novel framework using GFlowNets to enhance structured reasoning in Vision Language Models (VLMs), to capture relationships among reasoning steps for improved generalization. Unlike traditional methods like Supervised Fine-Tuning and Proximal Policy Optimization, which are limited by certain assumptions, our approach supports complex, long-term reasoning tasks. Experiments in card games and embodied planning showed enhanced training efficiency, diversity, and generalization. We focus on a single-agent task setting, leaving multi-agent task and alternative prompting methods as future directions. Limited computational resources led us to use small sized VLMs, but larger models may further benefit from GFlowNets.

## A. Environments

## A.1. ALFWorld

ALFWorld [[31]](#b30) is an embodied AI environment combining a text-based interactive setup with a vision-language planning dataset. It includes six goal-conditioned tasks: "Pick & Place", "Examine in Light", "Clean & Place", "Heat & Place", "Cool & Place", and "Pick Two & Place". The agent must plan and act based on visual cues and textual instructions (e.g., "go to shelf 1") that specify the task. Unlike gym cards, where all states share the same action space, ALFWorld has a state-dependent action space A t ; actions are context-dependent (e.g., "put some pillows on the armchair", the agent can only place a pillow after picking it up). Our prompt instructs the VLM to choose from the admissible actions A t , and we evaluate Out-Of-Distribution (OOD) performance using a test set of previously unseen scenes (see detailed prompt templates in Tab. 9 and Tab. 10). We use the same non-negative components of the reward function used in [[41]](#b40), which includes sub-goal and goal rewards: r(s t , a t , s t+1 |g task ) = 50 * 1{s t+1 = g task } + 1{s t+1 = g task }. We do not include the negative component of the reward function represented as -1{a t / ∈ A t (s t )} in [[41]](#b40), since the actions are always selected from the admissible actions provided in the input prompt p t . The rewards are nonnegative, making it suitable for Var-TB and SubTB losses. However, since it lacks dense rewards for every transition, we didn't GFlowVLM with DB loss.

## A.2. NumberLine

This task involves moving a number along a synthetic number line to reach a target. NumberLine requires identifying two numbers in an image: "Target: x" and "Current: y t ", where x and y t are both integers such that x, y t ∈ [n min , n max ]. The agent's goal is to align y t with x by outputting an action a t from the discrete set {"+", "-", [DONE](if applicable)}. Actions "+" and "-" adjust y t ± 1, while [DONE] signals task completion (see detailed prompt template in Tab. [7](#)). An episode ends when the y t = x, or when the maximum step T = 2n max is reached, which is the default setup of the environment. We set n min and n max as 0 and 5, respectively for the in-distribution examples, and set n min and n max as 10 and 50 for generating OOD examples. In the reward function used in [[41]](#b40), an agent receives a reward of r(s t , a t ) = 1 when y t+1 = x, a penalty of r(s t , a t ) = -1 upon taking an action that does not move the current number y t to the target x, and a reward of r(s t , a t ) = 0, otherwise. For GFlowVLM, we revise the reward function with non-negative values as follows:

$R(x, y t ) = c |x -y t | + 1 (9$$)$where c is a scaling constant set to 100. This reward incentivizes the model to bring the current number closer to the target, progressively increasing the reward as the gap decreases. For fair comparison, we run RL4VLM [[41]](#b40) with revised reward structure.

## A.3. Blackjack

The Blackjack task requires the VLM to reason with visual information and adapt to stochastic outcomes. The observation o t includes two dealer cards (one face-down) and the player's cards. The agent aims to win by selecting an action a t from {"stand", "hit", [DONE](if applicable)} (see detailed prompt template in Tab. 8). In the reward function used in [[41]](#b40), an agent receives a reward of r(s t , a t ) = 1, 0, -1 upon win, draw and loss, respectively. We revise the reward function to replace non-negative values as follows: R(s t , a t ) = max(1 × 10 -10 , (r(s t , a t ) + 1) × 10), [(10)](#b9) where r(s t , a t ) represents the environment's original reward for state s t and action a t . This scales the rewards and ensures they are strictly non-negative. For fair comparison, we run RL4VLM [[41]](#b40) with revised reward structure.

## B. Training Objectives

We adopt three different objective functions of GFlowNets, Trajectory-Balance (TB), Subtrajectory-Balance (SubTB), and Detailed-Balance (DB), to fine tune the VLM.

## B.1. Variance Trajectory Balanced (Var-TB) Loss

The Trajectory-Balanced (TB) objective [[23]](#b22) ensures that the probability of generating a complete trajectory τ = (s 0 → s 1 → • • • → s n → x) is proportional to the reward R(τ ). Under the Markovian assumption, the forward policy P F (s t |s t-1 ) transitions from state s t-1 to s t , while the backward policy P B (s t-1 |s t ) ensures consistency between forward and backward flows. This objective is given by: [(11)](#b10) where Z is the partition function that normalizes the distribution.

$Z n t=1 P F (s t |s t-1 ; θ) = R(x) n t=1 P B (s t-1 |s t ; θ),$We now change s to z to match our definition of state in the main paper, where z 0:t consists of a visual observation o t and an input prompt p t containing goal description, history states s 0:t-1 , history actions a 0:t-1 , and admissible actions A t . We use ⊤, which is the [DONE] symbol, to represent the terminal state x of a trajectory. We adopt this notation because, in practice, the VLM predicts the action ⊤ to signify termination. This practical adaptation ensures consistency between the theoretical representation of terminal states and the actual predictions made by the VLM during inference.

Under the non-Markovian assumption of generating a complete trajectory τ = (z 0 → z 1 → • • • → z n → x), and after adding goal into condition, we have:

$Z n t=1 P F (z t |z 0:t-1 , g; θ) = R(x) n t=1 P B (z t-1 |z t:n , g; θ),(12)$From [[43]](#b42), an estimation Z for each trajectory τ can be expressed as:

$ζ(τ ; θ, g) = log n t=1 P F (z t |z 0:t-1 ), g; θ) R(x) n t=1 P B (z t-1 |z t:n , g; θ) = log n t=1 P F (z t |z 0:t-1 , g; θ) R(x)(13)$where P B = 1 in our case since we formulate the trajectories as a tree structure, where a child state has only one parent state. In the optimal case, ζ(τ ; θ, g) is equal to true logZ. The Variance-Trajectory-Balanced loss function aim to minimize the variance of ζ(τ ; θ, g) across trajectories to make the balance of the trajectories. The final Variance-Trajectory-Balanced loss is then defined as:

$L VarTB (τ ; θ) = 1 N N i=1 ζ(τ i ; θ, g) -E τ ζ(τ ; θ, g) 2 ,(14)$where N represents the number of sampled trajectories. This loss ensures that high-reward trajectories are sampled more frequently by the policy.

## B.2. Subtrajectory Balanced (SubTB) Loss

The Subtrajectory-Balanced (SubTB) loss [[22]](#b21) operates on subtrajectories of the form τ

$= (z 0 → z 1 → • • • → z m ).$The subtrajectory balance ensures that each segment of the reasoning path or structure remains consistent, where the flows are balanced locally between forward and backward transitions. Under the non-Markovian assumption and after adding goal into conditions, the subtrajectory balance condition is expressed as:

$F (z 0 ) m t=1 P F (z t |z 0:t-1 ), g; θ) = F (z m ) m t=1 P B (z t-1 |z t:m ), g; θ),(15)$where F (z 0 ) and F (z m ) represent the flow into the initial (z 0 ) and final state (z m ) of the subtrajectory, respectively. Following [[27]](#b26), when all states z t are terminable with ⊤, we have F (z t )P F (⊤|z 0:t ) = R(⊤). Then the SubTB loss can be formulated as:

$L SubTB (z 0:m , g; θ) = 0≤i<j≤m log R(z 0:i ⊤) j k=i+1 P F (z k |z 0:k-1 , g; θ)P F (⊤|z 0:j , g; θ) R(z 0:i ⊤)P F (⊤|z 0:i , g; θ) 2 (16$$)$where ⊤ is the [DONE] symbol, denoting the terminal state, and process continues until [DONE] symbol ⊤ is generated similar to [[8]](#b7). This loss penalizes discrepancies in local transitions and ensures that all subsegments of a trajectory follow the correct balance conditions, reducing variance in smaller parts of the trajectory.

## B.2.1. Detailed Balanced (DB) Loss

The Detailed-Balanced (DB) loss [[2]](#b1) is used to ensure that each transition s t → s t+1 between two states is balanced by matching the forward and backward flows at every step of the trajectory. The detailed balance condition is expressed as:

$F (s t )P F (s t+1 |s t ) = F (s t+1 )P B (s t |s t+1 ),(17)$where F (s t ) and F (s t+1 ) represent the flow at states s t and s t+1 , respectively. Under the non-Markovian assumption of generating a complete trajectory τ = (z 0 → z 1 → • • • → z n → ⊤), where ⊤ is the terminal state of the sequence, DB loss is formulated as:

$L DB (z 0:t → z 0:t+1 , g; θ) = log R(z 0:t ⊤)P F (z t+1 |z 0:t , g; θ)P F (⊤|z 0:t+1 , g; θ) R(z 0:t+1 ⊤)P F (⊤|z 0:t , g; θ) 2 .(18)$This loss ensures that every state-to-state transition follows the correct flow, preventing inconsistencies in the trajectory construction.

## C. Details of Experimental Setup

In this section, we outline the experimental setup used to evaluate our approach across various tasks. We describe the key components of our implementation, including the data collection, diversity metric, and hyperparameters. By providing these details, we aim to ensure reproducibility and clarify how the proposed method integrates into different experimental frameworks.

## C.1. Off-Policy Data Collection

In this section, we describe our approach to off-policy data collection used in GFlowVLM for two distinct tasks, Numberline and Blackjack, emphasizing the integration of highquality trajectories to enhance model training. These strategies ensure that the model learns from both successful and diverse trajectories, even when its on-policy performance falls short.

Numberline During training, if the on-policy trajectory generated by the model fails to move the current number correctly towards the target, we augment the dataset by adding an off-policy, ground-truth trajectory to the buffer. These ground-truth trajectories represent successful paths that the model can follow to achieve the goal. By incorporating these accurate trajectories, we provide the model with additional supervision, which helps it learn to generalize better to unseen instances. This ensures the model benefits from examples of correct behavior, even when its predictions deviate from the optimal path. Fig. [5](#fig_2) illustrates the generation of both correct and incorrect trajectories, highlighting how diversity in training trajectories is encouraged to improve robustness.

Blackjack For the stochastic Blackjack task, deterministic ground-truth trajectories are not directly available due to the probabilistic outcomes of card draws. Instead, we generate high-quality off-policy trajectories using a rulebased heuristic: The agent "stands" when the hand value is 17 or higher and "hits" otherwise. This strategy aligns with fundamental Blackjack principles, balancing the risk of exceeding a hand value of 21 against the potential for improvement by drawing additional cards. By leveraging this rule-based approach, we ensure that the training buffer includes trajectories that reflect a realistic yet principled decision-making process. Figure [6](#fig_3) demonstrates how both correct and incorrect trajectories are generated in a tree structure, promoting diversity in the training data and enabling the model to better handle a range of scenarios.

## C.2. SFT Dataset Collection

To create the SFT dataset, we iteratively interact with the environment to generate successful trajectories. For each successful trajectory, we manually append the "[DONE]" token as the final action in the last state, explicitly marking the completion of the task. This approach aims to teach the model to predict the "[DONE]" token as the appropriate action when the goal state is achieved.

Numberline For the Numberline task, we execute ground-truth actions in the environment until the current state matches the target state. At this point, we append the "[DONE]" token to indicate task completion. This process generated 8,000 data points with "[DONE]" actions and 20,000 additional data points for other actions, using the base SFT dataset in [[41]](#b40).

Blackjack For Blackjack, we adhere to the standard 17point rule to determine actions. When the optimal decision is to take no further action, we append the "[DONE]" token to the trajectory. This yielded 15,000 data points with "[DONE]" actions and 50,000 for other actions, utilizing the SFT dataset from [[41]](#b40).

ALFWorld For ALFWorld, we rely on expert actions derived from a heuristic [[31]](#b30). At the end of each successful trajectory, we append the "[DONE]" token to signify task completion. This resulted in 15,000 data points with "[DONE]" actions and 45,000 for other actions using the SFT dataset from [[41]](#b40).

## C.3. Diversity Metric

The diversity metric introduced in [[40]](#b39) calculates the diversity of successful trajectories found by a policy under the same number of samplings at inference time. Specifically, it is defined as follows:

$Div = n i=1 S i • I(S i ≥ 1) n i=1 I(S i ≥ 1) ≥ 1 (19$$)$where n is the total number of tasks, S i is the number of successful trajectories found for the i-th task, and I(S i ≥ 1) is an indicator function that equals 1 if at least one successful trajectory is found for the i-th task, and 0 otherwise. The denominator represents the number of tasks where the model finds at least one successful trajectory, while the numerator sums the total number of successful trajectories across all tasks. The smallest possible Div is 1, indicating that a method finds at least one successful trajectory on average. For example, a Div = 1.2 suggests that, on average, a method finds 1.2 different successful trajectories. The (Div@N) metric used in the main paper represents the diversity of successful trajectories after sampling N trajectories' samples.

## C.4. General Setup for Baselines and GFlowVLM

All experiments are conducted on an H100 DGX machine with 80GB of memory. During VLM training, we directly optimize all trainable components, including the vision encoder, LLM, and MLP projector. For baseline methods, we utilize the open-source implementations provided in the original papers for SFT and RL4VLM [[41]](#b40). A CosineAn-nealingLR scheduler is adopted, starting with an initial learning rate of 1 × 10 -5 , decaying to a final learning rate of 1 × 10 -9 , and reaching its maximum learning rate at step 25. For GFlowVLM, a buffer size of 4 is used across all tasks. To ensure a fair comparison, we report the number of environment steps for each method.

C.5. CoT Weighting Factor λ P F (z t+1 |z 0:t , g; θ) = P Action (a t |z 0:t , c t , g; θ)+ λP CoT (c t |z 0:t , g; θ),

The CoT weighting factor, λ ∈ [0, 1], controls the influence of CoT reasoning within our framework, as discussed briefly in the main paper (rewritten here in Eq. ( [20](#formula_25))). To assess the impact of λ, we compute the average performance of our proposed framework, GFlowVLM, using three loss functions, each evaluated with four random seeds. As shown in Figure [4](#fig_1), a moderate λ (e.g., 0.4) yields the best performance on NumberLine tasks across three different loss functions. When λ is too high (0.8) or too low (0.2), P CoT (c t |z 0:t , g; θ) or P Action (a t |z 0:t , c t , g; θ) overly influences the estimation of P F , respectively, leading to imbalanced learning dynamics. Thus, setting λ = 0.4 effectively balances CoT and action learning, enhancing reasoning performance. We use the same value of λ = 0.4 across all experiments in this work.

## D. Qualitative Results

We present an example in ALFWorld in Tab. 11, with the goal of "put some keychains on the ottoman" to illustrate key insights into our method.

Our method encourages exploration by sampling proportional to the reward, allowing it to avoid getting stuck in suboptimal states-a common limitation observed in PPO. This exploration not only prevents suboptimal convergence  but also enables the model to generate more diverse solutions, as demonstrated by the multiple trajectories shown in Tab. 11. Through repeated sampling, our method effectively considers a wider range of potential paths to achieve the goal.

PPO, in contrast, tends to rely on superficial semantic Table 6. Ablations of GFlowVLM with Markovian assumption for ALFWorld. Since Alfworld does not provide dense rewards, we can not not using DB loss here. Furthermore, while RL4VLM and GFlowVLM with SubTB are trained with SFT initialization, GFVLM with TB-Var is without STF initialization since we do not need to model the flow. M and NM stands for Markovian and Non-Markovian assumption respectively.

patterns to make decisions. For instance, it may prioritize reaching the "ottoman" directly without first retrieving the keychains, as the term "ottoman" semantically aligns with the goal. This behavior highlights the risk of overfitting to pattern recognition rather than aligning actions with the ultimate reward. { "current number": "x", "target number": "x", "thoughts": "first read out the current and target number, then think carefully about which action to choose", "action": "-" or "+" or "[DONE]" } NumberLine prompt template with history information (Non-Markovian) You are playing a game called number line. You will see a target number and a current number in the image. And your goal is to move the current number closer to the target by choosing either adding or subtracting one to the current number. Below are the history actions and states you've done. { "current number": "x", "target number": "x", "thoughts": "first read out the current and target number, then think carefully about which action to choose", "action": "-" or "+"or "[DONE]" } Table [7](#). Prompt Template with Markovian and Non-Markovian assump. for NumberLine. The sentence in brown is only applicable for SubTB and DB losses. Based on the history information, you need to first give an explanation and then you can choose between [''stand", ''hit"]. Use "[DONE]" when you think you have completed the task. Your response should be a valid JSON file in the following format: { "thoughts": "first describe your total points and the dealer's total points then think about which action to choose", "action": "stand" or "hit" or "[DONE]" }

Table 8. Prompt Templates with Markovian and Non-Markovian assump. for BlackJack. The sentence in brown is only applicable for SubTB and DB losses.

Goal: put some keychains on ottoman. PPO Ours-Traj. 1 Ours-Traj. 2 Action: go to coffeetable 1 Action: open drawer 6 Action: open drawer 7 Action: go to ottoman 1 Action: close drawer 6 Action: close drawer 7 Action: take pillow 1 from ottoman 1 Action: go to drawer 5 Action: go to drawer 5 Action: inventory Action: open drawer 5 Action: open drawer 5

Action: go to drawer 7

Action: take keychain 1 from drawer 5

Action: take keychain 1 from drawer 5

Action: look Action: go to ottoman 1

Action: go to ottoman 1

Action: go to coffeetable 1

Action: put keychain 1 in/on ottoman 1

Action: put keychain 1 in/on ottoman 1

Table 11. Qualitative results for ALFWorld task. GFlowVLM generates diverse trajectories in contrast to PPO.

## E. Ablation Study of Markovian and Non-Markovian

To evaluate the impact of Markovian and Non-Markovian assumptions on performance, we conduct an ablation study with our method, GFlowVLM with both On-Policy and Off-Policy training, and RL4VLM [[41]](#b40) across 3 tasks: Number-Line and Blackjack and ALFWorld. The primary difference between these two assumptions lies in the prompt template used during training. Under the Markovian assumption, the model operates with prompts that do not include historical information about prior actions and states, relying solely on the current state. Conversely, the Non-Markovian assumption incorporates the history of actions and states into the prompt, providing richer contextual information (see prompt templates in Tab. 7, Tab. 8, Tab. 10, Tab. 9 for details).

As shown in Tab. 5, the Non-Markovian assumption leads to consistently better performance across all tasks. In NumberLine and Blackjack, GFlowVLM achieves substantial improvements in both in-distribution and out-ofdistribution scenarios under the Non-Markovian assumption.For instance, in the Numberline task, GFlowVLM with the DB loss demonstrates improved out-of-distribution performance when transitioning from Markovian to Non-Markovian assumptions. Specifically, with on-policy training, the performance increases from 5.3 to 9.1, while with off-policy training, it rises from 16.3 to 18.6. Similarly, in Blackjack, Non-Markovian prompts result in a higher average success rate.

In ALFWorld tasks, as demonstrated in Tab. 6, the Non-Markovian assumption yields marked gains in both average performance and out-of-distribution generalization. For instance, GFlowVLM with SubTB achieves an average success rate of 26.1 under the Non-Markovian assumption compared to 22.1 under the Markovian setup. These results highlight the importance of historical context in improving task performance, particularly for challenging scenarios requiring long-term dependencies.

Interestingly, the Non-Markovian assumption also benefits the baselines, including RL4VLM, resulting in a performance increase from 3.1 to 4.4 for Numberline for OOD tasks. This suggests that GFlowVLM is better equipped to leverage the additional context provided by Non-Markovian prompts, enabling it to capture richer dependencies and improve both accuracy and diversity. Overall, the findings confirm that the Non-Markovian assumption provides a more effective framework for reasoning-based tasks, particularly when combined with GFlowVLM's structured learning approach.

![We employ two versions of SFT in our baseline: SFT-w/o-[DONE] and SFT-w/-[DONE]. SFT-w/o-DONE uses the same GPT-4o dataset as in [41]. For SFT-w/-DONE, we include the [DONE] action in the training inputs and add correct examples where outputs explicitly contain [DONE]. We fine-tune the LLaVA-1.6-7B model on this dataset for 1 epoch using the official script. To ensure consistency, downstream GFlowNets training for both SubTB and DB losses starts from the same SFT checkpoint that includes [DONE].]()

![Figure 4. Average success rates (%) of our method under different CoT weighting factor λ on NumberLine across three loss functions.]()

![Figure 5. An example of off-policy data collection for Number-Line in a tree structure.]()

![Figure 6. An example of off-policy data collection for BlackJack in a tree structure.]()

![without history information (Markovian)You are playing a game called number line. You will see a target number and a current number in the image. And your goal is to move the current number closer to the target by choosing either adding or subtracting one to the current number. You need to first give the thoughts and then you can choose between ["+", "-"]. Use "[DONE]" when you think you have completed the task. Your response should be a valid JSON file in the following format:]()

!["+"State 1: 2 Based on the history information, you need to first give the thoughts and then you can choose between ["+", "-"]. Use "[DONE]" when you think you have completed the task.Your response should be a valid JSON file in the following format:]()

![Image input:BlackJack prompt template without history information (Markovian) You are a blackjack player. You are observing the current game state. You need to first give an explanation and then you can choose between ["stand", "hit"]. Use "[DONE]" when you think you have completed the task. Your response should be a valid JSON file in the following format: { "thoughts": "first describe your total points and the dealer's total points then think about which action to choose", "action": "stand" or "hit" or "[DONE]" } BlackJack prompt template with history information (Non-Markovian) You are a blackjack player. You are observing the current game state. Below are the history actions and states. State 0: 14 points Action 1: "hit" State 1: 15 points]()

![]()

![Performance comparisons across baseline models for NumberLine (NL) and BlackJack (BJ) tasks for in-distribution and out-ofdistributions (OOD) tasks. * We use the same reward function as ours. † We use the same prompt as ours to include history information for Non-Markovian setting. NL-OOD stands for Number line with out-of-distribution tasks. On and Off represent On-Policy and Off-Policy, respectively. M and NM stands for Markovian and Non-Markovian assumption respectively.]()

![Ablations of GFlowVLM with Markovian assumption for NumberLine (NL) and BlackJack (BJ) tasks for in-distribution and out-of-distributions (OOD) tasks.]()

* Only the current input image ot is used, as including every intermediate image would be computationally costly, and current VLMs do not perform optimally with multiple images as input.

