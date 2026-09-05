# Factorio Learning Environment

## Abstract

## 

Large Language Models (LLMs) are rapidly saturating existing benchmarks, necessitating new open-ended evaluations. We introduce the Factorio Learning Environment (FLE), based on the game of Factorio, that tests agents in long-term planning, program synthesis, and resource optimization. FLE provides exponentially scaling challenges-from basic automation to complex factories processing millions of resource units per second. We provide two settings: (1) lab-play consisting of 24 structured tasks with fixed resources, and (2) open-play with the unbounded task of building the largest factory on an procedurally generated map. We demonstrate across both settings that models still lack strong spatial reasoning. In lab-play, we find that LLMs exhibit promising short-horizon skills, yet are unable to operate effectively in constrained environments, reflecting limitations in error analysis. In open-play, while LLMs discover automation strategies that improve growth (e.g electricpowered drilling), they fail to achieve complex automation (e.g electronic-circuit manufacturing). We release FLE as an open-source platform 1 .

## Introduction

Large Language Models (LLMs) have demonstrated remarkable capabilities at solving complex question-answer (QA) problems, saturating benchmarks in factual recollection [(Hendrycks et al., 2021)](#b13), reasoning [(Cobbe et al., 2021)](#b6) and code prediction [(Chen et al., 2021)](#b4).

The strong performance across these diverse tasks suggests that LLMs have developed sophisticated reasoning capabilities, leading researchers to explore whether models can act as autonomous agents [(Yang et al., 2023)](#b24). This has motivated a number of new agentic benchmarks focusing on long-term planning [(Liu et al., 2023;](#b17)[Ruan et al., 2023)](#), learning in complex environments [(Paglieri et al., 2024;](#)[Jimenez et al., 2023)](#b14) and reliably learning from mistakes [(Xing et al., 2024;](#b22)[Yamada et al., 2023;](#b23)[Kambhampati et al., 2024)](#b15). However, similar to QA settings, these agentic benchmarks are likely to face saturation due to their natural completion states; which impose an upper bound on performance and limit our ability to differentiate superhuman models.

We introduce the Factorio Learning Environment (FLE): a novel evaluation framework built upon the game of Factorio that uniquely addresses this limitation by enabling unbounded agent evaluation with no natural completion state. In this environment, agents must navigate rapidly scaling challenges from basic resource gathering to complex automation while managing an exponentially scaling technology tree -creating natural curricula for evaluating increasingly capable agents.

Agents are tasked with producing the largest possible factory, whose performance is measured through production throughput, which ranges from early-game rates of ∼30 resources/minute to advanced systems processing millions of resources/second. This enables us to meaningfully differentiate agents by measuring the order of magnitude of resources that they can produce, avoiding saturation by agents even as models become dramatically more capable.

Existing resource management environments such as Minecraft [(Guss et al., 2019)](#b10) or Nethack [(Küttler et al., 2020)](#b16) do not demand the precise industrial optimization present in Factorio. For resource processing chains, producing basic electronic circuits (an early-game staple) requires coordinating 10+ machines processing approximately 15 items per minute. For example, a single rocket component requires orchestrating 60+ interlinked machines manufacturing 1000+ items per minute. The precision required, where a single misaligned machine can cause a factory-wide gridlock, creates a natural curriculum, testing both basic automation and advanced system optimization.

Agents interact with the FLE via synthesizing Python programs to alter and observe the game state, using the tools included in the environment in a Read-Eval-Print Loop (REPL). This feedback loop mirrors the day-to-day workflow of human programmers, who write provisional code to probe how systems behave, interpret the results, then refine their mental model of the system. In this sense, the agent's program acts as the cumulative representation of its current knowledge and strategies for managing the complex resource pipelines in Factorio.

We evaluate six frontier LLM models in this environment in an agentic setting. In our qualitative analysis, we study the agents capabilities for spatial reasoning, long-term planning, and error correction. Our results show that even the most advanced models struggle to coordinate more than six machines when automatically producing items with over three ingredients, even after 128 environmental interactions.

We summarise our contribution as follows:

• The introduction of the Factorio Learning Environment, an agentic evaluation of long-term planning and resource management and allocation.

• Evaluations of frontier models in FLE lab-play, a set of 24 controlled tasks requiring agents to build factories with increasing levels of complexity and scale. Claude-3.5-Sonnet (the strongest performing model) only completes 7/24 tasks and shows limitations in spatial planning in more complex objectives; demonstrating large head-room for performance.

• Evaluation of frontier models in the FLE open-play, an unbounded setting in a full Factorio game map. We find more capable agents (such as Claude-3.5-Sonnet and GPT-4o) invest heavily into technological research achieving quantitatively different slopes on a log-reward, log-step graph.

• A qualitative analysis of the results across capabilities such as error-correction and long-term planning. We identify a gap in models' ability to perform intelligent error correction, iteratively build upon prior work and conduct exploration.

## Factorio Learning Environment

Our main contribution is the release of an open-source framework, which includes i) a high-level Python API to Factorio, ii) a persistent coding environment for LLM agents to interact with the game through iterative program synthesis, and iii) a Python object model of game entities.

The environment is procedurally generated, deterministic at runtime (set by a random seed) and is 4×10 12 square tiles in size. We provide a laboratory environment with accessible resources for benchmarking agents in a controlled setting.

## Environment Dynamics

Factorio is a resource management and automation game in which players spawn on a world containing raw resources such as water, iron ore, and coal, and must orchestrate increasingly complex production and logistic chains to ultimately produce a rocket and (optionally) escape. The game contains over 200 entity types, with a technology tree that unlocks more efficient buildings, resource production chains and multiplicative throughput bonuses. Research enforces a steep resource progression, with late-game technologies such as the rocket-silo demanding 300 times more resources than early automation research[foot_0](#foot_0) .

Player strategy and factory architecture evolves dramatically as technology progresses. The early game centres on manual crafting and basic automation, with factories daisychained together using direct insertion between machines. These designs are primarily constrained by manual building speed and resource gathering, favouring cheap, immediate solutions -e.g stone-furnaces provide better returns on investment than steel-furnaces until fast-belt technology (logistics-2) is available. As they progress, players typically adopt main bus designs with centralized resource production and distribution, enabling more organized scaling of production. Late-game strategy shifts again, toward massive parallel construction and logistics networks, with factories ultimately evolving into distributed complexes connected by high-capacity train networks. These advanced stages emphasize space-efficient, high-throughput designs Left: The open-ended goal of the game is to create the largest factory possible. The game enables agents to invest in (an infinite number of) technological advances to produce more resources per second. Middle: Agents interact with the game by using an interactive Python Interpreter, where they take actions and print their observations in a Read-Eval-Print loop. By using the Python namespace, agents may store variables and define functions for later use. We provide a Python API to Factorio which allows direct interaction with the environment. Right: The agent may issue commands to the game server in order to interact with the environment (with associated time penalities), and receive a response as feedback. If the agents chooses, it may view its own production statistics.

# 1. Get iron patch and place mining drill drill = place_entity( entity=Prototype.MiningDrill, position=nearest(Resource.IronOre)), direction=Direction.NORTH ) # 2. Add output storage chest = place_entity_next_to( entity=Prototype.IronChest, reference_position=drill.drop_position, direction=Direction.SOUTH ) # 3. Verify automation chain and observe entities assert drill.status == EntityStatus.WORKING print(get_entities())

Figure [3](#). Example of an FLE program used to create a simple automated iron-ore miner. In step 1 the agent uses a query to find the nearest resources and place a mine. In step 3 the agent uses an assert statement to verify that its action was successful.

enabled by technologies like beacons and stack inserters, and are thousands of times larger than early game factories.

## Environment Interface

Agents interact with FLE through a REPL (Read-Eval-Print-Loop) pattern, observing the current game state via previous program output streams, then generating and executing Python code to implement their intended actions, and finally returning useful feedback for the next iteration.

Agents are provided with the Python standard library, and an API comprising methods designed to balance expressiveness with tractability (see Appendix D.1). These comprise 10 observation methods and 13 action methods. Observation methods (e.g nearest, get entities) retrieve information about the environment, and action methods (e.g move to, craft entity) modify the environment.

Each method returns a typed object (e.g an Inventory) which can be stored as a variable in the Python namespace and referenced later in the episode. The namespace acts as an episodic symbolic memory system, and saved objects represent part of the environment at the moment of query, becoming stale as the game state evolves, requiring the agent to re-query when appropriate. This design enables agents to maintain complex state representations and build hierarchical abstractions as the factories scale.

Agents observe stdout and stderr -the output streams of their program. Thus, agents may intentionally print relevant objects and computations to the output stream to construct observations. Selecting relevant attributes of objects enables token-efficient observation, e.g: 1 # Observe the status of all Furnaces in-game 2 print([e.status for e in get_entities({Prototype.StoneFurnace})} 3 >>> 2: 'WORKING', 'WORKING', 'NEED_INGREDIENTS',

4 'OUT_OF_FUEL'

Mistakes in the code or invalid operations raise typed exceptions with detailed context that is written to stderr. This enables agents to reactively debug their programs after execution, and proactively use runtime assertions during execution to self-verify their actions. Programs that take too long to execute are terminated, to prevent runaway control flows (e.g while True). We find that by evaluating PS against steps (server calls) we can clearly differentiate stronger models from weaker ones in a log/log projection. We overlay milestones, showing the first time the median agent was able to create a new type of entity. Right: We plot the final reward and elapsed game time after 5k steps. We find that while weaker models show promise early-game, they struggle to progress when automation and logistics are required. We report median and standard error over the independent runs.

An environment "step" is a single submission to the Factorio server, which returns the stdout, stderr, rewards and in-game wall-clock time (see Figure [2](#fig_1)).

Agents are able to enhance their internal representation of the game state in 2 ways: (i) they can define utility functions for reuse throughout an episode, to encapsulate successful logic; and (ii) they can define classes in the namespace to better organize the data retrieved from the game.

## Reward Structure

We use Factorio's built-in production tracking system, which enables us to define two complementary reward signals:

Production Score (PS): A continuous measure of economic activity based on the value of all items produced. This metric increases as agents refine raw ores into manufactured goods and create automatic factories. As production chain throughput scales exponentially, PS can vary by multiple orders of magnitude (a rocket launch requires ≈ 10 7 raw resources). PS provides a naturally unbounded measure of performance, which is sensitive to increasing automation complexity. The game's price calculation system assigns higher value to items with more complex production chains, creating a reward structure that encourages sophisticated factory designs. For the full pricing system, see Appendix A.

Milestones: A discrete set of achievements for producing novel item types (e.g. building an inserter for the first time, assembling electronic-circuits, etc.) and researching technologies. This captures both the diversity of an agent's exploration across Factorio's tech tree, and what level of item complexity they were able to achieve. As Factorio supports researching an infinite technologies (with multiplicative bonuses), milestones can be used to measure performance at all levels of capability.

## Implementation Details

The FLE comprises a Python client and Lua server communicating synchronously via RCON over TCP[foot_1](#foot_1) . The client provides the stateful environment interface and APIs, while the server manages game state execution in the official Factorio multiplayer server. The server can be run in headless mode for efficient parallelization. The object model represents most early to late-game entities (detailed in Appendix D.1). FLE is compatible with v1.110 of Factorio, and requires a single purchased game license, as each server must be "activated" by any official client at startup. FLE is also easily extensible by the community. Designing new tools requires implementing a client-side controller (Python) and a server-side action (Lua) which will automatically load and update the API schema for subsequent agent runs.

We benchmark the Factorio Learning Environment on a MacBook Pro M4 with 128GB RAM. The headless server achieved the highest throughput, processing an average of 218 operations per second across core API functions, with peak performance of 603 ops/sec for basic operations like crafting. The Python interpreter introduces approximately 3x overhead, reducing average throughput to 68 ops/sec. Complex spatial operations (connect entities) are consistently the slowest at 25-48 ops/sec due to pathfinding requirements. Basic inventory operations (craft item, extract item) achieve highest throughput at 276-545 ops/sec. The headless configuration provides a 1.75x speedup over the game client (see Figure [11](#fig_0)). We make the environment publicly available[foot_2](#foot_2) .

## Experiments

To evaluate agent capabilities in FLE, we introduce two settings and a novel agent scaffolding.

## Settings

Lab Play -requires the agent to create a factory with a specific production throughput in the constrained lab environment. These tasks are designed to evaluate the capabilities of an agent to create automatic structures in an open-ended manner, requiring creativity, spatial understanding of the map and long-horizon planning.

We task agents to build production lines of 24 distinct target entities of increasing complexity, starting from a single resource mine requiring at most 2 machines (making iron-ore) to a late game entity requiring the coordination of close to 100 machines (making utility-science-pack). The target entities cover items from early to late game and the agent must use a wide variety of machines present in Factorio (drills, furnaces, assembling machines, oil refineries, chemical plants). As the task difficulty naturally increases with resource requirements this provides a measure of the complexity agents are capable of creating in a limited number of steps. All tasks start with an inventory containing sufficient entities to complete the task and all research is unlocked for the agent in lab-play. Additional information are in Appendix H.

Each task runs a trajectory of 128 API calls. After every agent step, the throughput of the created structure is evaluated throughout a 60 second holdout period in-game, and the task is deemed completed if the throughput of the structure is above the target throughput at any step i. The target throughput is 16 for solid items (for instance electronic circuit, military science pack, plastic bar) and 250 for fluids (for instance petroleum gas, lubricant, heavy oil) during the holdout period. We report the mean and std of each task success with 4 runs per task.

Open Play -In addition to the structured lab-play tasks, we evaluate each agent in a purely open-ended setting. The agents spawn into a procedurally generated world with unbounded space and resources, and are tasked to "build the largest factory possible", allowing the agents to decide how best to advance in the game. To progress long-term, agents must show proficient long-term goal-setting, entity and resource planning and spatial reasoning capabilities when creating automation structures. Agents must be capable of using the API, querying the environment for unknown information and reasoning over observations to plan successfully.

We use two metrics to evaluate progress in the game: Production Score (PS) and Milestones. While the PS acts as the reward and is affected by exploitation, milestones give an overview of how much of the game and technology tree the agent has explored.

Each agent plays until the maximum trajectory length of 5000 is reached. After every agent step, the production throughput is tracked and reward computed. We execute 8 independent runs for each agent, and report the median.

## Agent Scaffolding

We consider a simple step-by-step prompting approach as a baseline implementation for agents to interact with the environment. The input prompt of the agent consists of the API schema A, a guide G describing common patterns with code examples and the memory M of the agent consisting of past policies with environment observations. A detailed description for the guide, API schema and an example memory state is brought out in Appendix J. Given the inputs, the agent is tasked to identify the most useful next step and generate the Python policy P that carries out actions in the environment to achieve the step. The policy is executed in the environment and added to the memory M with the environment observations (stdout) and error messages (stderr). The updated memory M is then used as input to generate the next policy and enables the agent to gather information from the environment and use observations to guide future step generation.

Memory -At every policy generation step the agent uses information from the memory M . Memory consists of past policies and their respective environment observations (stdout and stderr after every policy execution). To limit the memory token count, past observations and policies that are further than 32 steps in the past are summarised into a report of 1024 tokens. This allows the agent to execute arbitrarily long traces in the environment without unreasonably large memory input token requirements.

Language Models -We evaluate state-of-the-art closed source models including Claude 3.5-Sonnet [(Anthropic, 2024)](#b1), [GPT-4o and GPT-4o-Mini (OpenAI et al., 2024)](#), [Deepseek-v3 (DeepSeek-AI et al., 2025)](#) and Gemini-2-Flash [(Team et al., 2024)](#). We also evaluate Llama-3.3-70B-Instruct (MetaAI, 2024). Each model is sampled at temperature 0.5. Model timestamps are in Appendix E.

## Results

We analyse agent performance during open-play and labplay, and observe common patterns amongst trajectories from both settings. We report experimental costs in Table [3](#tab_3).

Insight 1: Coding agents perform better in the FLE. We find that stronger coding agents achieve higher production scores across both settings. In open-play, Claude outperforms other models in both median PS (293 206) and milestone count (28), surpassing the early-game resource ex-Figure [5](#). Agents are unable to consistently build complex and efficient factories in Lab-Play. Top: We measure the mean and standard deviation of task success rates across the first 8 complexity levels and task progress (percentage of target ingredients and its sub-ingredients agents factories produce at each time-step) in three tasks of increasing difficulty. We observe a clear decrease in average task success rates as the crafting complexity of the target entity increases. Bottom: In harder tasks, agents show trends of initial rapid progress followed by stagnation or decrease. This is due to agents being unable to scale up initial production or add new sections to factories required to successfully reach the target production levels and often breaking existing structures during the process. The lack of consistent progress is also observed through the large variance in mean task progress across runs.

traction phase and partially investing in technology research -constructing and powering a lab, dedicating production to science-packs and unlocking electric inserters, (see Figure [6](#)). In comparison Llama-3.3-70B (54 998 PS, 26 milestones) made initial progress but did not develop production lines of >3 entities and struggled with both creating complex structures and scaling up existing production. Similarly in lab-play, Claude performed the best, managing to create automatic structures typically seen in Factorio's early game; specifically, compact drilling lines coordinating 10+ machines across up to four factory sections (see table [1](#)). In comparison, Llama-3.3-70B is capable of only creating the most trivial of factories.

Insight 2: Agents lack spatial reasoning and are unable to iteratively improve on factories. A key characteristic for success in open-play and lab-play involves iteratively combining multiple factory sections to create complex production lines. In open-play, while Claude was able to scale up automation from the early-game, GPT-4o, GPT-4o-Mini and Llama-3.3-70B typically succeeded only at maintaining a small number of production lines. In lab-play, it can be seen how the success rate of tasks decreases proportionally to the increase in crafting recipe complexity of the target entity (see Figure [5](#)). For instance, creation of automation science packs requires multiple mining and smelting sections (iron-plate and copper-plate), a iron-gear-wheel assembly section, automation-science-pack section and a steam-engine. While agents are able to make initial progress in this task by creating electricity setups and plate production lines, they are unable to improve on the factory and add the required assembly sections. Frequent failure cases were trying to place entities too close or on-top of each other, not leaving room for connections or incorrect placement of inserters. These are all limitations in spatial reasoning and result in agents only being able to consistently create production lines for low complexity items and low overall performance in lab-play tasks (see table [1](#)).

Insight 3: Agents use the API in different ways. We evaluate trajectories with automatic checkers to evaluate how successful models are at using the FLE API. We find that models exhibit different coding styles, with GPT-4o using more assert checks in within their code than Claude 3.5. Conversely GPT-4o uses significantly fewer prints. These suggest models use very different approaches to explore and engage with the FLE. Using prints suggests being uncertain of state, and exploring new areas, whereas assert statements are likely used to clarify existing knowledge (see Table ?

$?).$Insight 4: Planning is essential to open-play performance. In open-play, agents are given an open-ended goal and need to create meaningful sub-objectives themselves to make long-term progress. We observe that agents often set Figure [6](#). Open-ended challenges highlight differences in objective setting and general capability. We illustrate the rates at which various models produce items with multiple antecedent ingredients in the open-play setting. Claude 3.5-Sonnet immediately begins complex crafting and invests in research, ultimately unlocking electric-mining-drills at step 3k, the deployment of which boosts production of iron-plate thereafter. Less advanced models, like GPT-4o-Mini, produce insignificant quantities of multiingredient items. Deepseek produced fewer complex resources in open-play than its lab-play performance would suggest, indicating weaker objective-setting compared to general capability in-game.

## Model

Lab-play task success rate (%) Claude 21.9

$± 1.3 GPT-4o 16.6 ± 1.4 Deepseek-v3 15.1 ± 1.7 Gemini-2 13.0 ± 1.3 Llama-3.3-70B 6.3 ± 1.0 GPT-4o-Mini 5.2 ± 0.6$Table [1](#). Stronger coding models achieve higher task success rates in Lab-Play. We observe a correlation between coding and reasoning abilities of base models and the task success rates, where the stronger models have higher success rates in lab-play tasks. Claude, GPT-4o, Deepseek and Gemini-2 are able to only pass simpler tasks requiring the construction of factories consisting up to 3 sections while Llama-3.3-70B and GPT-4o-Mini succeeded in tasks requiring single-section factories. All models struggled with the increasing scale and complexity requirements for tasks resulting in low overall success rates.

short-sighted objectives, for instance manually crafting a large quantity of singular entities without a long-term plan (Gemini-2.0 manually crafted 300+ wooden chests over 100 steps), not significantly investing into research (except for Claude) or creating small individual factories as opposed to scaling up existing production. This creates a discrepancy between lab-play and open-play results where in lab-play Gemini-2 and Deepseek show capabilities in creating earlygame automation (see Figure [5](#)) but rarely attempt creating factories in open-play, resulting in poor complex entity crafting statistics (See Figure [6](#)) and lower production scores.

Insight 5: Agents which invest in technological progression achieve much higher PS. Investing into technology progress in open-play is a trade-off, where agents incur a short-term resource cost to unlock items enabling long-term higher throughput. Although research is crucial for creating higher efficiency factories, only Claude consistently invests resources into researching new technologies in open-play. The result can be seen from step 3k, where Claude starts deploying electric-mining-drills and PS grows by a factor of 1.5x (from 200k to 300k), in Figure 6. Insight 6: Agents fall into degenerate debug loops. A critical component for successful runs was an agents' ability Model L P% A% F% AF% C% En% Claude-3.5 65 43.3 2.0 50.6 0 3 97 GPT-4o 81 10.3 12.8 10.2 2 12 86 DeepSeek-v3 37 25.4 13.9 25.3 0 2 98 Gemini-2 133 16.2 0.0 16.6 1 46 53 Llama-3.3-70B 38 23.9 12.9 23.7 0 24 76 GPT-4o-Mini 77 36.0 0.0 31.6 15 6 79

Table [2](#). Models exhibit contrasting coding styles: Analysis of code submitted by different language models, showing average lines per program (L), percentage of lines that were print statements (P%), percentage of lines that were assertions (A%), and percentage of programs that failed (F%). For programs that failed by error type we track the proportion of assertion fails (AF%), code errors (C%), and environment errors (En%). Claude-3.5 favours a REPL approach with high print usage and failure rates, while GPT-4 opts for defensive programming with assertive validation and fewer resulting environmental errors. Gemini-2 produces the longest programs (133 lines on average) but makes the most code errors (e.g accessing non-existent variables).

to interact to previous error logs and carry out error correction. In lab-play, in successful task completions, 56% of steps resulted in program execution errors (from which agents recovered), and in open-play ranged from 29.7% to 76.4%. Claude, GPT-4o and Deepseek were capable of simpler error correction when incorrectly using the API or when crafting entities. Anecdotally, the agents were not proficient at debugging complex environments. For instance, when debugging non-working structures or factories where the throughput was not at expected levels, agents often focused on whether all singular entities were working but did not investigate whether the topology of the whole structure was correct. In lab-play, this limitation is illustrated by the frequent decrease of task performance across steps in Figure [5](#) where the agents broke existing working structures due to incorrectly identifying the root-cause of problems. Agents often fell into a loop of greedily repeating the same fix rather than exploring additional potential sources of the problem. This can be seen in the flatline behaviour during open-play in Figure [4](#fig_3) with no PS progression. For instance, in one run GPT-4o used the same API method incorrectly for 78 contiguous steps (from Step 120), receiving identical error message each time. On two occasions, GPT-4o-Mini simply gave up and repeatedly asked to be reset -see Appendix F.

These limitations show the difficulty of FLE and that stateof-the-art LLMs-even with REPL-style feedback and extensive prompting-are still in the early stages of mastering large-scale, open-ended factory design.

## Related Work

Games have long served as fundamental benchmarks for artificial intelligence research, providing standardized environments with clear metrics, rich observational data, and natural difficulty gradients. [(Campbell et al., 2002;](#b3)[Silver et al., 2016;](#)[Berner et al., 2019)](#b2).

Recent work has explored using LLMs as game-playing agents. Environments like ALFWorld (Shridhar et al., 2020) combine language understanding with embodied tasks, while MineDojo [(Fan et al., 2022)](#b9) leverages Minecraft as a sandbox for testing general-purpose agents through 3,000+ diverse tasks spanning survival, harvesting, and creative building. While these environments excel at evaluating breadth of capabilities, their fundamentally linear progression systems limit their ability to differentiate highly capable agents. Even with rich task suites, their resource requirements remain relatively modest compared to Factorio's exponential scaling.

Many benchmarks exist for agentic coding such as [(Jimenez et al., 2023;](#b14)[Hendrycks et al.)](#), which evaluate Python against a stateful system. These benchmarks often involve fitting specific test conditions, or task descriptions. In comparison, our win condition is open-ended, requiring multistep planning and resulting in thousands of submissions; requiring much longer contexts than other benchmarks.

Management simulation games like OpenTTD (Ope) have explored aspects of resource optimization, but lack precise mechanics and exponential scaling that would enable quantitative measurement of small improvements in agent capabilities. Text-based environments like Jericho [(Hausknecht et al., 2019)](#b11) test language understanding through interactive fiction, but lack the spatial reasoning and timing requirements inherent in factory design.

Factorio has seen prior research interest for closed-domain settings [(Reid et al., 2021)](#), with a focus on integer programming models, meta-heuristics and evolutionary reinforcement learning to tackle logistics challenges. We build on this foundation to offer a standardized text-based interface for learning agents to solve open-ended challenges in long-term planning, spatial reasoning and factory optimization.

## Limitations, Future Work & Conclusion

In this work, we introduce the Factorio Learning Environment (FLE), a novel open-ended framework for evaluating the capabilities of agents in an open-ended environment.

A major concern for any environment benchmark is reward hacking [(Clark & Amodei, 2016;](#b5)[Skalse et al., 2022)](#). In our setting this could involve two main attack surfaces: either through Python API (as seen within [Denison et al. (2024)](#b8)) or within the Factorio game-engine itself. During our evaluations, while we observed no direct examples of reward hacking of either interface, we did observe that the agent was able to occasionally trigger resetting the Factorio gamestate; That said, we applied little optimisation pressure on agents -we highlight this as a caution for those developing agents on FLE.

Secondly, unlike the base game of Factorio, which uses mouse and screen, our approach involves a Python interface. Whilst the authors were, in equivalent game time, able to outperform frontier agents, it is unclear if achieving end-game goals (e.g. escape the world or build rockets) is achievable to humans using only an API in a reasonable time-frame. We did however prove that each step in the chain to launch a rocket was achievable from the previous step and that all tasks in lab-play can be completed.

Even without human baselines, we believe that FLE is a useful benchmark, as the comparative scores between agents still informs us of their relative ability at planning, spatial reasoning and resource management.

Currently, some mid and late-game entities are not explicitly modelled in FLE (for instance trains, logistics robots and agent-programmable circuit networks). This is appropriate given the state of evaluated models. As FLE is open-source, we are committed to release a complete object model with first-class support for all entities.

Although all our current experiments use single-agent interaction, Factorio inherently supports multi-player games in both cooperative and competitive scenarios. For instance, multiple agents could share a base, coordinating research and logistics, or they could spawn in distant regions and compete for finite resources (e.g., high-yield iron patches).

Through our evaluation, we demonstrate that even state-ofthe-art agents struggle with the coordination and optimization challenges inherent in simple automation and logistical tasks. The limitations we observed in spatial reasoning, long-term planning, and intelligent error correction highlight gaps in capabilities of foundation language models in novel environments. The unbounded nature of FLE provides a benchmark that will remain relevant even as progress in LLMs continues to advance. Unlike traditional benchmarks that are rapidly saturated by progress in AI research, FLE's exponentially scaling reward system and requirement for capabilities across multiple areas create a natural curricula that can meaningfully differentiate between increasingly performant models.

## Impact Statement

The Factorio Learning Environment provides a novel, opensource testbed for exploring advanced AI behavior in a complex, open-ended setting. It enables rigorous empirical study of the instrumental convergence hypothesis and other AI safety concerns. Researchers can measure how agents balance resource acquisition, territorial expansion, and defense, offering early indicators of convergent behaviors and potential risks. Moreover, Factorio's diverse automation challenges allow systematic comparisons of agent architectures and interventions, fostering reproducible research at scale. We hope this platform accelerates empirical safety investigations and strengthens the connection between theoretical predictions and real-world AI behavior.

## A. Factorio's Economic System

For each item i in the game, its value V (i) is computed as:

$V (i) = min r∈Ri j∈Ir V (j)c j,r α(|I r |) + E(r, C r ) (1)$Where:

R i is the set of recipes that can produce item i I r is the set of ingredients for recipe r c j,r is the amount of ingredient j needed in recipe r α(n) is the complexity multiplier: α(n) = β n-2 where β ≈ 1.025 is the ingredient exponent E(r, C r ) is the energy cost function: E(r, C r ) = ln(e r + 1) √ C r where: e r is the energy required for recipe r C r is the base cost of ingredients

The system is initialized with seed prices for raw resources:

• Iron ore: 3.1

$• Copper ore: 3.6 • Coal: 3.0 • Stone: 2.4 • Uranium ore: 8.2$The complexity multiplier α(n) grows exponentially with the number of ingredients, incentivizing the creation of more sophisticated items which require geometrically increasing raw resources to manufacture. The energy cost term E(r, C r ) scales sub-linearly through the square root, preventing energy from dominating at high scales.

The final PS for a force (player or team) at time t is:

$P S(t) = i∈Items V (i)(P i (t) -C i (t))(2)$Where:

$P i (t)$is the total production of item i up to time t C i (t) is the total consumption of item i up to time t Items is the set of all possible items and fluids Note: While the energy cost scaling in Factorio's economic system is designed for gameplay progression rather than physical realism, it effectively serves our purpose of rewarding increasingly sophisticated automation. The action space consists of 23 core API methods that form a domain-specific language for factory automation, roughly categorised as follows:

## B. Experimental Costs

Pure Queries (Q : G → T )

• get entities: Find entities matching a prototype • production stats: Get factory output metrics • nearest: Find the nearest named entity to the player • inspect inventory: Retrieve the inventory of an entity

State Modifications (M : G → G ′ × T ):

• place entity: Create buildings and machines • rotate entity: Change entity orientation • craft item: Manually create an item from ingredients • set recipe: Configure production recipes • connect entities: Connect two entities or positions with belts, pipes or power

$Resource Management (R : G → G ′ × T ):$• insert item: Add items to containers • harvest resource: Gather raw materials • extract item: Move an item from an entity into the inventory

The namespace context C maintains references to entities, positions, and other values through variable declarations, enabling agents to track and reuse factory components. This separation between method execution and namespace modification supports compositional factory design while maintaining clear semantics about state changes. A distinctive feature of our action space is the ability for agents to make runtime assertions about their beliefs regarding the game state. These assertions provide piece-meal feedback about the game state, allowing agents to debug discrepancies between their intended actions and actual outcomes. When assertions fail, agents can gather additional information through observation actions to update their beliefs and modify their approach. This creates a natural debugging loop that mirrors human programming practices. Not all actions are available in every game state. For instance, insert item requires both a valid item prototype and a target entity with sufficient inventory space. To help agents reason about action validity, tools like can place entity provide explicit validation capabilities. Most tools return boolean success indicators or meaningful result values, allowing agents to adapt their strategies based on action outcomes. Semantic errors (such as trying to insert a position into an inventory) result in exception containing a specific failure message and stack trace being thrown.

We impose no artificial rate limiting on API calls, as the emphasis is on the logical correctness of the generated programs rather than mechanical execution speed. This reflects the nature of Factorio as a game of planning and design. However, the sleep method allows agents to implement deliberate timing when necessary for complex automation sequences, such as waiting for ore to be smelted into plate for downstream steps.

An API-based action space supports natural composition of atomic actions into complex factory designs through its stronglytyped interface. Information-gathering actions enable deliberate planning and strategic decision-making, while the action space maps cleanly to natural language descriptions of factory building steps. The persistent namespace and type system enable compositional reasoning about factory designs over a long horizon, with rich type information helping language models understand entity relationships and constraints. This cycle creates a natural debugging loop that mirrors human programming practices, allowing agents to iteratively develop and test their automation strategies.

Partial Observability System Unlike many reinforcement learning environments that provide complete state observations, FLE implements true partial observability through a snapshot-based system:

• State References: When an agent queries the environment (e.g., searching for nearby resources or machines), it receives a snapshot of the current state rather than a live reference.

• Temporal Validity: These snapshots represent the environment at the moment of query and may become stale as the game state evolves.

• Explicit Updates: Agents must explicitly re-query the environment to refresh their understanding of changed areas.

For example, consider this interaction:

# Initial query returns a snapshot drill = get_entity(Prototype.BurnerMiningDrill, position=Position(x=10, y=10)) drill.status # Status at time of query # After some time/actions, must re-query for current state updated_drill = get_entity(Prototype.BurnerMiningDrill)

Each function operates within a rich type system that enables precise reasoning about game entities: This type system helps prevent common errors while providing clear semantics for factory construction. # The ongoing lack of updates or results indicates that we remain in an unresponsive state within the environment. # Given the absence of resources and entities, our options for progressing in FactoryEnv remain severely limited.

# The optimal step forward would be to reset the environment to allow resource generation and subsequently enable crafting and automation processes.

# I am here and ready to undertake any new operations, adjustments, or tasks once further instructions are given. Please let me know how you'd like to proceed!

This was followed by 234 more appeals to reset before the run terminated.

## G. Debugging Detailed Description

Below we present program-level statistics for each model during lab-play. The list of tasks and their target entities with their quotas are shown in table 11. To get the equivalent quota for fluids and solids, we used the price comparison of oil and iron ore. The value of crude-oil is 0.2 and for iron ore is 3.1. Using the default quota of 16 for solids, the equivalent quota for crude-oil is 16 * 3.1/0.2 = 248, which we have rounded up to 250.

## H.2. Laboratory map

Figure [13](#fig_6) shows the laboratory map designed for constrained evaluation of agents

## H.3. inventory

All start with an inventory as follows:

coal: 500, burner-mining-drill: 50, wooden-chest: 10, burner-inserter: 50,inserter: 50, transport-belt: 500, stone-furnace: 10, boiler: 2, offshore-pump: 2, steam-engine: 2, electric-mining-drill: 50, small-electric-pole: 500, pipe: 500, assemblingmachine-2: 10, electric-furnace: 10, pipe-to-ground: 100, underground-belt: 100, pumpjack: 10, oil-refinery: 5, chemicalplant: 5, storage-tank: 10, 

![Figure 1. A plastic bar factory created by Claude 3.5 Sonnet in lab-play. The factory consists of a electricity steam generator (top-left), a coal mine (top), a crude-oil to petroleum gas pipeline (bottom) and a chemical plant (bottom-right). The chemical plant creates plastic bars using the coal and petroleum gas as inputs. By themselves, the cumulative raw resources generate a production score of 224. With this specific layout, the factory creates 40 plastic bars per 60 in-game seconds, for a production score of 352.]()

![Figure 2. Illustration of the Factorio Learning Environment (FLE). FLE is based on the popular construction and management simulation game Factorio.Left: The open-ended goal of the game is to create the largest factory possible. The game enables agents to invest in (an infinite number of) technological advances to produce more resources per second. Middle: Agents interact with the game by using an interactive Python Interpreter, where they take actions and print their observations in a Read-Eval-Print loop. By using the Python namespace, agents may store variables and define functions for later use. We provide a Python API to Factorio which allows direct interaction with the environment. Right: The agent may issue commands to the game server in order to interact with the environment (with associated time penalities), and receive a response as feedback. If the agents chooses, it may view its own production statistics.]()

![Figure 4. Models are differentiated by score in Open-Play. Agents are given the instruction to build the biggest possible factory. Left:We find that by evaluating PS against steps (server calls) we can clearly differentiate stronger models from weaker ones in a log/log projection. We overlay milestones, showing the first time the median agent was able to create a new type of entity. Right: We plot the final reward and elapsed game time after 5k steps. We find that while weaker models show promise early-game, they struggle to progress when automation and logistics are required. We report median and standard error over the independent runs.]()

![Figure 12. Example code showing state transitions.]()

![# ... assembler-specific properties]()

![Figure 13. Overview of the laboratory map, where agents are tasked to carry out lab-play tasks]()

![]()

![]()

![]()

![Token Usage and Cost Comparison across Models. Lab-play costs are aggregated. The total cost is $1,318.28]()

![Available Basic Resource Types]()

![API Methods SummaryF. Example Open-Play GPT4o-Mini FailureOn this occasion, GPT4o-Mini made unsuccessful attempts to find resources, before giving up entirely.# It appears we still cannot find any coal resources, and none of my attempts have uncovered any resources throughout the environment. # Since we have been unable to locate any gatherable resources through inspections, it may be worth attempting to validate the surrounding resources from the beginning and gauge what could be nearby.# To proceed, it is important to start from the basics. Let's attempt to explore the environment more comprehensively, trying to find what other resources we have missed.# I will attempt to inspect a much broader area by invoking a more generalized search for resources. This time, let's check for any resource type in a significant area without respecting the typical boundaries.Could not get stone at x=100.0 y=100.0. No resource of type stone at the specified location."')# It seems that I have exhausted all attempts to locate any resources or entities with repeated efforts yielding no results in the environment. # Since all resource checks at various coordinates have returned errors suggesting that no necessary resources are present, this hints at a fundamental issue with the resource generation or initialization.# Without any resources, crafting items or building any infrastructure is impossible. Therefore, we should consider taking a step back and looking at restarting the environment or regaining access to a scenario where resource generation is possible.# As all methods seem to lead to no resources, let's output a final message summarizing the current state and proposing to reset or adjust the environment scenario for more fruitful exploration.print("No resources or entities found in the environment. Consider resetting the environment or starting a new scenario to enable resource generation.") >>> 0: ('No resources or entities found in the environment. Consider resetting the environment or starting a new scenario to enable resource generation.',)]()

![Program-level statistics in open-play. Total Progs is how many code snippets the model generated; Err. Progs is how many snippets triggered a runtime error; Err. Rate is the fraction of error-ridden snippets; Avg.% Lines is the average fraction of lines successfully executed (before error or completion); Avg.% Asserts is the fraction of assert statements that actually ran before any]()

![Error category breakdown. Here, syntactic errors indicate malformed code (SyntaxError, NameError, etc.), semantic errors are explicitly failed assert statements (the agent's "belief" was false), and other errors are environment-level or logic failures (like invalid item requests, or placing an entity on an obstructed tile). Percentages reflect the proportion of each error category among all error-triggering snippets for that model.]()

This progression approximately follows an unbounded geometric relationship between resource cost C and research tier N -C[N ] = 1000 × 2(N -1)   

Roughly 80k LoC in total

https://github.com/JackHopkins/factorio-learningenvironment

