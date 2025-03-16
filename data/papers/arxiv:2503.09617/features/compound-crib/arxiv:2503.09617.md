# Factorio Learning Environment (FLE) Overview

## Novel Evaluation Framework for LLMs

The Factorio Learning Environment (FLE) is designed as a novel evaluation framework for Large Language Models (LLMs) that focuses on long-term planning, program synthesis, and resource optimization. The choice of Factorio as the underlying game is significant due to its complexity and the need for strategic thinking, which are essential for evaluating the capabilities of LLMs in a dynamic environment. 

### Rationale for Game Selection
Factorio is a resource management and automation game that requires players to build and optimize factories, manage resources, and navigate a complex technology tree. This environment is particularly suitable for evaluating LLMs because:
- **Complexity**: The game features over 200 entity types and a vast technology tree, providing a rich set of challenges for LLMs to tackle.
- **Long-term Planning**: Players must plan their factory layouts and resource flows over extended periods, which aligns with the evaluation of LLMs' abilities to think ahead and strategize.
- **Program Synthesis**: The game allows for the creation of automation scripts, enabling LLMs to demonstrate their programming capabilities in a practical context.

## Key Contributions

The FLE framework is open-source and includes several key components:
1. **High-level Python API for Factorio**: This API allows researchers to interact with the game programmatically, facilitating the evaluation of LLMs in a controlled manner.
2. **Persistent Coding Environment**: The environment supports iterative program synthesis, enabling LLMs to write, test, and refine their code in real-time.
3. **Python Object Model of Game Entities**: This model abstracts the complexities of the game, allowing LLMs to interact with game entities in a more intuitive way.

### Justification for Open-source Framework
The decision to make FLE open-source is crucial for fostering collaboration and innovation within the research community. By providing an accessible platform, researchers can build upon the framework, contribute new features, and share their findings, ultimately advancing the field of AI evaluation.

## Environment Dynamics

The FLE operates in a procedurally generated, deterministic environment with a massive size of 4×10^12 square tiles. This scale allows for extensive exploration and experimentation, which is essential for evaluating LLMs' capabilities.

### Procedural Generation and Determinism
- **Procedural Generation**: This feature ensures that each run can present unique challenges, preventing LLMs from overfitting to specific scenarios.
- **Deterministic Runtime**: By setting a random seed, researchers can replicate experiments, ensuring that results are consistent and reliable.

## Agent Interaction

Agents interact with the FLE using a Read-Eval-Print Loop (REPL), which mirrors the workflow of human programmers. This interaction model allows LLMs to:
- **Execute Commands**: Agents can issue commands to manipulate the game state, such as placing entities or querying resources.
- **Receive Feedback**: The REPL provides immediate feedback, enabling LLMs to learn from their actions and adjust their strategies accordingly.

### Rationale for REPL Design
The REPL design is intentional, as it encourages a cycle of experimentation and learning. This mirrors real-world programming practices, where developers iteratively refine their code based on feedback from the system.

## Reward Structure

The FLE employs a dual reward structure:
1. **Production Score (PS)**: A continuous measure of economic activity that reflects the complexity of automation. This score scales exponentially, providing a nuanced metric for evaluating LLM performance.
2. **Milestones**: Discrete achievements that track the production of novel item types and the completion of research tasks. This structure encourages exploration and innovation.

### Justification for Reward Structure
The combination of PS and milestones allows for a comprehensive evaluation of LLMs. PS provides a continuous measure of performance, while milestones capture the diversity of an agent's capabilities. This dual approach helps to identify strengths and weaknesses in LLMs' strategies.

## Evaluation Findings

The evaluation of LLMs in the FLE revealed several insights:
- LLMs demonstrated promising short-horizon skills but struggled with spatial reasoning and complex automation tasks.
- In lab-play, the best-performing model, Claude-3.5-Sonnet, completed only 7 out of 24 tasks, highlighting significant room for improvement.
- In open-play, capable agents showed varying growth rates, indicating differences in strategic investment in technological research.

### Implications of Findings
These findings suggest that while LLMs have made strides in certain areas, there are still critical gaps in their capabilities, particularly in spatial reasoning and complex task coordination. This highlights the need for further research and development in these areas.

## Error Correction and Long-term Planning

The evaluation identified gaps in LLMs' abilities to perform intelligent error correction and long-term planning. Agents struggled to coordinate multiple machines for complex tasks, indicating limitations in their ability to manage intricate automation processes.

### Rationale for Focusing on Error Correction
Error