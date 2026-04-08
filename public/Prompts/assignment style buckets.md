# Question Style Buckets (Topic-Aware Library)

This file defines **27 topic-aware style buckets** that the assignment pipeline uses to keep MCQ, MSQ, and Subjective questions varied. Each bucket aims for **~69 distinct question styles**. The total library is ~1,863 entries.

## How to Use This Library

1. **Identify the transcript topic** and pick the matching bucket(s) during your mandatory Subtopic Coverage Plan step. Activate **at most 3 topic buckets** based on the content.
2. **ALWAYS also draw from the Common (Universal) bucket** — those styles apply to any topic.
3. **Name the activated buckets explicitly** in the Subtopic Coverage Plan section, e.g. `**Activated buckets:** Common, Databases, AI/LLM Engineering`.
4. **Sample broadly and unbiasedly.** Do NOT default to the first 5–10 entries of each bucket. Different runs on the same transcript should produce genuinely different question mixes. Rotate the starting index across runs.
5. **Rotation rule (strict):** No two consecutive questions (Q1↔Q2, Q2↔Q3, …) may share the same style family OR the same difficulty. Difficulty must visibly vary across the easy questions.
6. If a transcript spans multiple domains (e.g., a retrieval-augmented generation lecture touches Databases + AI/LLM Engineering + NLP), draw proportionally from each active bucket.
7. Styles may be **combined** within a single question (e.g., "Trace the loop" + "Off-by-one detector") when a natural question embodies both — pick the dominant family for rotation tracking.

---

## Bucket 0 — Common / Universal (applies to ALL topics)

1. **Definition-in-context** — pick the meaning of a term inside a described real scenario
2. **Best fit** — which option best satisfies the described need
3. **Worst fit** — which option is the WORST choice for the scenario
4. **Cause → effect** — pick the most likely outcome of a described action
5. **Effect → cause** — pick the most likely cause of an observed outcome
6. **Counter-example** — which option violates a stated principle
7. **Exception finder** — which option does NOT belong in the described group
8. **Negation framing** — which is NOT true of the concept
9. **Match the role** — pick which item plays the described role in the system
10. **Order of operations** — pick the correct sequence of steps
11. **Reorder broken sequence** — fix a jumbled list of steps
12. **Missing step** — identify the step that is missing from a described workflow
13. **Trade-off (A vs B)** — which factor matters most given stated constraints
14. **Trade-off (A vs B vs C)** — three-way comparison with explicit constraints
15. **Stakeholder perspective** — what would person X (PM, engineer, end user) most likely choose
16. **Constraint-driven choice** — given budget/time/compute limits, pick the feasible option
17. **First-principle reasoning** — pick the option that aligns with a stated underlying principle
18. **Misconception trap** — pick the right answer when one distractor is the popular misconception
19. **Edge-case identification** — pick the input/condition that breaks the described approach
20. **Boundary case** — pick what happens exactly at the defined limit
21. **Failure mode** — pick how the system fails when assumption X is violated
22. **Recovery action** — given a described failure, pick the right fix
23. **Real-world transfer** — pick which everyday scenario best maps to the concept
24. **Reverse mapping** — given an everyday scenario, pick which technical concept it represents
25. **Tool/method picker** — given the goal, pick the right approach
26. **Anti-pattern detection** — pick the option that exhibits the bad practice
27. **Refactor for clarity** — pick the cleaner restatement of a messy approach
28. **Interpret the metric** — given a metric value, pick the correct conclusion
29. **Spot the assumption** — pick the hidden assumption in a described approach
30. **Question the premise** — pick which premise of a stated claim is shaky
31. **Cost vs benefit** — pick the option whose benefits outweigh costs in this scenario
32. **Risk ranking** — pick which option carries the most risk
33. **Priority ordering** — pick the most important consideration first
34. **Blast radius** — pick how far a described change or failure spreads
35. **Backwards compatibility** — pick which change preserves prior behavior
36. **Migration safety** — pick the safest path from old approach to new
37. **Rollback planning** — pick the right rollback step for the described change
38. **Stakeholder communication** — pick how to explain the situation to a non-expert
39. **Document/diagram match** — pick the correct visual/written representation
40. **Pseudocode → English** — pick the English description of given pseudocode
41. **English → pseudocode** — pick the pseudocode that matches the English spec
42. **Compare with cousin concept** — pick the differentiator from a closely related idea
43. **History/evolution** — pick why the modern approach replaced an older one
44. **What-if (parameter change)** — pick what changes if you alter one variable
45. **Sensitivity analysis** — pick which variable matters most to the outcome
46. **Confidence calibration** — pick the most appropriate level of certainty given evidence
47. **Outlier handling** — pick what to do with the unusual data point
48. **Generalization check** — pick whether the approach holds in a new but similar setting
49. **Specialization check** — pick the narrow case where a general rule fails
50. **Time horizon** — pick the right answer when "short term" vs "long term" matters
51. **Reversibility check** — pick whether a described action can be undone cleanly
52. **Precondition identification** — pick the condition that must hold before the step runs
53. **Postcondition identification** — pick what must be true after the step runs
54. **Invariant detection** — pick the property that stays constant through the change
55. **Scope-creep detector** — pick which addition to a plan crosses a stated boundary
56. **Sunk cost trap** — pick the option that correctly ignores prior investment
57. **Analogy breakage** — pick where a given analogy stops being useful
58. **Abstraction-level match** — pick the level of detail suitable for the audience
59. **Explain like I'm five** — pick the simplest accurate explanation
60. **Expert audience framing** — pick the technically precise statement for experts
61. **Right question reframing** — pick the sharper version of a vague question
62. **Data-vs-anecdote** — pick which evidence is most compelling in the scenario
63. **Leading indicator pick** — pick which signal best predicts the outcome
64. **Lagging indicator pick** — pick which signal only confirms after the fact
65. **Ethical gut-check** — pick which option most respects stated ethical constraints
66. **Scope-of-impact** — pick who or what is affected by the described change
67. **Cross-functional consequence** — pick which team/system is affected downstream
68. **When-to-stop rule** — pick the right stopping criterion for the described task
69. **"Good enough" threshold** — pick the right level of polish for the stated goal

---

## Bucket 1 — Programming & Code

1. **Predict the output** — what does this code print
2. **Predict the return value** — what does the function return for given input
3. **Trace the loop** — value of variable X after the loop runs
4. **Trace recursion** — final value or call tree for recursive input
5. **Find the bug** — pick the line containing the bug
6. **Fix the bug** — pick the corrected version of a buggy snippet
7. **Off-by-one detector** — pick the option with the off-by-one error
8. **Mutation vs copy** — pick whether the original is modified
9. **Reference vs value** — pick what happens when an object is passed
10. **Scope check** — pick which variable is visible at the marked line
11. **Closure behavior** — pick what the closure captures
12. **Hoisting / declaration order** — pick what runs first
13. **Type coercion** — pick the result of a type-mixing expression
14. **Truthiness / falsiness** — pick whether the condition fires
15. **Operator precedence** — pick how the expression evaluates
16. **Short-circuit evaluation** — pick which side of `&&` / `||` runs
17. **Iteration order** — pick the order of items visited
18. **Sorting behavior** — pick the sorted output for the given comparator
19. **Hash collision** — pick what happens with the given hash function
20. **Time complexity** — pick the Big-O of a function
21. **Space complexity** — pick the memory cost of a function
22. **Performance bottleneck** — pick the slowest part of the snippet
23. **Algorithm choice** — pick the best algorithm for the input shape
24. **Data structure choice** — pick the best data structure for the operations
25. **API misuse** — pick the call that breaks the library's contract
26. **Exception flow** — pick where the exception is caught
27. **Resource leak** — pick what is not being released
28. **Concurrency race** — pick which interleaving causes the bug
29. **Deadlock detector** — pick the lock order that deadlocks
30. **Thread safety** — pick the unsafe operation
31. **Memoization opportunity** — pick what to cache
32. **Pure vs impure** — pick which function has side effects
33. **Recursion → iteration** — pick the iterative equivalent
34. **Refactor to readable** — pick the cleanest rewrite
35. **Naming smell** — pick the most misleading name
36. **Magic number removal** — pick what should become a constant
37. **Test case design** — pick the best test for the function
38. **Test case gap** — pick the case the existing tests miss
39. **Mock vs real** — pick what should be mocked
40. **Regex match** — pick which strings match the pattern
41. **String manipulation** — pick the result of given string operations
42. **Date/time pitfall** — pick what goes wrong across time zones
43. **Floating point trap** — pick the surprising float result
44. **Integer overflow** — pick when the value wraps
45. **Encoding issue** — pick the cause of the garbled output
46. **Dependency injection** — pick the right place to inject
47. **Pattern recognition** — pick which design pattern the code uses
48. **Library API picker** — pick the right function for the task
49. **Error message decode** — pick what the error message means
50. **Idiomatic vs non-idiomatic** — pick the more idiomatic version
51. **Lazy vs eager evaluation** — pick when the computation actually runs
52. **Generator vs list** — pick which fits the memory/streaming need
53. **Async/await pitfall** — pick where the `await` is missing or misplaced
54. **Promise chaining** — pick the final resolved value
55. **Callback hell refactor** — pick the cleaner async version
56. **Early return opportunity** — pick where early return simplifies logic
57. **Null / undefined trap** — pick what throws when the value is absent
58. **Optional chaining usage** — pick where `?.` changes behavior
59. **Immutability preservation** — pick the update that doesn't mutate
60. **Shallow vs deep copy** — pick which approach is needed here
61. **Equality semantics** — pick `==` vs `===` vs `.equals()` outcome
62. **Type narrowing** — pick where the type guard kicks in
63. **Enum misuse** — pick the incorrect use of the enum
64. **Struct packing / alignment** — pick the memory layout of the struct
65. **Pass-by-convention** — pick the argument-passing style the language uses
66. **Logging level choice** — pick `debug` vs `info` vs `warn` vs `error` for the event
67. **Feature flag wiring** — pick the right flag check location
68. **Deprecation handling** — pick the correct migration off a deprecated API
69. **Toolchain quirk** — pick which build flag or compiler option produces the observed result

---

## Bucket 2 — ML / Data / Analytics

1. **Choose the model family** — pick the best model class for the data
2. **Choose the loss function** — pick the right loss for the task
3. **Choose the metric** — pick the right evaluation metric for the goal
4. **Metric trap** — pick why high accuracy is misleading here
5. **Class imbalance** — pick the right handling strategy
6. **Train/val/test split** — pick the correct split strategy for the scenario
7. **Data leakage** — pick where leakage is happening in the pipeline
8. **Feature leakage** — pick which feature leaks the target
9. **Overfitting symptom** — pick the chart pattern that shows overfitting
10. **Underfitting symptom** — pick the chart pattern that shows underfitting
11. **Bias-variance** — pick which side the model is on
12. **Regularization choice** — pick L1 vs L2 vs dropout for the situation
13. **Hyperparameter effect** — pick what changes if you increase X
14. **Learning rate diagnosis** — pick what's wrong with the loss curve
15. **Early stopping** — pick when to stop training
16. **Cross-validation strategy** — pick k-fold vs stratified vs grouped
17. **Encoding choice** — pick label vs one-hot vs target encoding
18. **Scaling necessity** — pick whether scaling is needed for this model
19. **Outlier strategy** — pick how to handle extreme values
20. **Missing data strategy** — pick the right imputation
21. **Feature selection** — pick the most informative feature
22. **Feature engineering** — pick the best new feature to derive
23. **Dimensionality reduction** — pick PCA vs t-SNE vs UMAP for the goal
24. **Curse of dimensionality** — pick why the model degrades
25. **Distance metric** — pick the right distance for the data type
26. **Similarity measure** — pick cosine vs euclidean vs jaccard
27. **Clustering count** — pick the right k from the elbow plot
28. **Embeddings interpretation** — pick what the embedding distance means
29. **Confusion matrix read** — pick the conclusion from the matrix
30. **Precision vs recall trade-off** — pick which to favor here
31. **AUC interpretation** — pick what the AUC value implies
32. **Calibration check** — pick whether the model is well-calibrated
33. **Threshold tuning** — pick the optimal threshold for the cost ratio
34. **Statistical significance** — pick whether the result is significant
35. **A/B test sample size** — pick whether the test has enough power
36. **A/B test pitfall** — pick the flaw in the experiment design
37. **Confounding variable** — pick what's really driving the correlation
38. **Causation vs correlation** — pick which is which
39. **Survivorship bias** — pick where the data is biased
40. **Selection bias** — pick how the sample was distorted
41. **Time series leakage** — pick what's wrong with the validation
42. **Stationarity check** — pick whether the series is stationary
43. **Lag feature design** — pick the right window/horizon
44. **Anomaly detection** — pick the right approach for the data
45. **Recommender choice** — pick collaborative vs content vs hybrid
46. **Cold start handling** — pick the right new-user/new-item strategy
47. **Embedding model choice** — pick the right pre-trained model
48. **Tokenization choice** — pick BPE vs wordpiece vs char for the task
49. **Prompt design** — pick the better LLM prompt for the goal
50. **Hallucination detection** — pick the most likely hallucinated statement
51. **Data drift signal** — pick which feature's distribution shifted
52. **Concept drift response** — pick the right retraining cadence
53. **Model card read** — pick the limitation that matters for this deployment
54. **Counterfactual explanation** — pick the input change that flips the prediction
55. **SHAP / LIME read** — pick the conclusion from the feature attribution
56. **Group fairness metric** — pick demographic parity vs equal opportunity vs equalized odds
57. **Label noise strategy** — pick how to handle noisy ground truth
58. **Active learning pick** — pick which unlabeled example is most valuable
59. **Semi-supervised trick** — pick the right use of unlabeled data
60. **Pseudo-labeling pitfall** — pick what breaks when pseudo-labels feed back in
61. **Ensemble choice** — pick bagging vs boosting vs stacking
62. **Boosting diagnosis** — pick what's happening to the loss on round N
63. **Decision tree pruning** — pick the pruning condition
64. **SVM kernel pick** — pick the right kernel for the data shape
65. **k-NN k-value** — pick the k that balances bias and variance
66. **Bayesian vs frequentist framing** — pick which view answers the question
67. **MCMC convergence** — pick the signal that sampling has converged
68. **Dashboard storytelling** — pick the chart that best communicates the finding
69. **Data pipeline audit** — pick the stage where the row count dropped unexpectedly

---

## Bucket 3 — System Design / Architecture / DevOps

1. **Read vs write optimization** — pick the design for the access pattern
2. **SQL vs NoSQL** — pick the right database family
3. **Schema design** — pick the better table layout for the queries
4. **Index choice** — pick which column to index
5. **Index downside** — pick what slows down because of the new index
6. **Cache strategy** — pick write-through vs write-back vs cache-aside
7. **Cache invalidation** — pick the right invalidation moment
8. **Cache hit ratio** — pick what the low hit ratio implies
9. **Sharding key** — pick the best shard key for the workload
10. **Hotspot diagnosis** — pick why one shard is overloaded
11. **Replication strategy** — pick sync vs async vs quorum
12. **Consistency model** — pick strong vs eventual vs causal
13. **CAP trade-off** — pick which property to drop in this failure
14. **Idempotency** — pick which operation is safe to retry
15. **Retry strategy** — pick exponential backoff vs jitter vs immediate
16. **Circuit breaker trigger** — pick when to open the breaker
17. **Rate limiting algorithm** — pick token bucket vs leaky bucket vs fixed window
18. **Load balancer choice** — pick L4 vs L7 vs DNS round robin
19. **Sticky sessions** — pick whether to use them here
20. **Service decomposition** — pick which boundary to split on
21. **Synchronous vs async** — pick the right communication style
22. **Queue vs stream** — pick Kafka vs SQS vs Redis pub/sub
23. **Backpressure handling** — pick the right mechanism
24. **Dead letter queue** — pick when to send to DLQ
25. **Schema evolution** — pick the safe field change
26. **API versioning** — pick header vs URL vs param
27. **REST vs GraphQL vs gRPC** — pick for the use case
28. **Pagination strategy** — pick offset vs cursor vs keyset
29. **Authentication choice** — pick session vs JWT vs OAuth
30. **Authorization model** — pick RBAC vs ABAC vs ACL
31. **Secret management** — pick the safe place to store the credential
32. **TLS termination** — pick where to terminate
33. **Observability tier** — pick logs vs metrics vs traces for the question
34. **Alert design** — pick the alert that minimizes false positives
35. **SLO target** — pick the right SLO for the user need
36. **Error budget action** — pick what to do when the budget is burned
37. **Incident severity** — pick the right SEV level
38. **Postmortem root cause** — pick the deepest root cause
39. **Chaos test target** — pick what to inject failure into
40. **Capacity planning** — pick the right node count for the load
41. **Autoscaling trigger** — pick the right metric to scale on
42. **Cost optimization** — pick the cheapest option that meets the SLA
43. **Region failover** — pick the right DR strategy
44. **Blue/green vs canary** — pick the right rollout strategy
45. **Rollback safety** — pick which migration is rollback-safe
46. **CI/CD pipeline gap** — pick the missing stage
47. **Container vs VM** — pick the right unit of deployment
48. **Service mesh use** — pick when a mesh is justified
49. **Edge vs origin** — pick what to compute where
50. **Compliance constraint** — pick the design that meets the regulation
51. **Read replica lag** — pick the symptom caused by replication delay
52. **Write amplification** — pick the design that minimizes extra I/O
53. **Quota enforcement** — pick the fairest multi-tenant limit
54. **Multi-tenancy model** — pick pooled vs silo vs bridge for the tenant mix
55. **Eventing topology** — pick fan-in vs fan-out vs broker for the flow
56. **Saga vs 2PC** — pick the right distributed transaction pattern
57. **Outbox pattern use** — pick when the outbox is necessary
58. **Read-your-own-writes** — pick the design that guarantees it
59. **Session affinity drawback** — pick what breaks with sticky sessions
60. **Clock skew impact** — pick what fails when nodes drift
61. **Backup strategy** — pick the right RPO/RTO combination
62. **Log retention policy** — pick the right window for the compliance need
63. **Feature flag rollout** — pick percent-based vs targeted rollout
64. **Dark launch usage** — pick the right time to dark-launch
65. **Dependency cycle** — pick the service causing the circular call
66. **Configuration drift** — pick where infra-as-code would have caught it
67. **Blue-sky redesign scope** — pick the "from-scratch" change that's safe vs risky
68. **Cost per request** — pick the architectural change that lowers unit cost
69. **Graceful degradation** — pick which feature to disable first under load

---

## Bucket 4 — Product / Strategy / Business

1. **Problem framing** — pick the sharper problem statement
2. **User segment focus** — pick which segment to prioritize
3. **JTBD framing** — pick the underlying job the user is hiring the product for
4. **Persona match** — pick which persona this scenario describes
5. **Feature kill** — pick which feature to cut and why
6. **Feature scope** — pick the right MVP cut for the timeline
7. **Prioritization framework** — pick RICE vs ICE vs MoSCoW for the situation
8. **OKR design** — pick the better key result wording
9. **North star metric** — pick the right north star for the business
10. **Counter-metric** — pick the metric that prevents gaming the main one
11. **Funnel diagnosis** — pick where the drop-off is happening
12. **Activation moment** — pick the user's true activation event
13. **Retention cohort read** — pick what the cohort chart shows
14. **Pricing model** — pick freemium vs flat vs usage-based
15. **Discount risk** — pick the downside of the proposed discount
16. **Win-loss analysis** — pick the most likely loss reason
17. **Competitive positioning** — pick the best differentiation angle
18. **Build vs buy** — pick what to do given the constraints
19. **Build vs partner** — pick the right partnership shape
20. **Go-to-market motion** — pick PLG vs sales-led vs community
21. **Launch tier** — pick T1 vs T2 vs T3 launch
22. **Beta strategy** — pick public vs closed vs design partner
23. **Pilot success criteria** — pick the right exit criteria
24. **Stakeholder alignment** — pick the right comms cadence
25. **Engineering trade-off** — pick what to negotiate with engineering
26. **Roadmap risk** — pick the riskiest item on the roadmap
27. **Dependency mapping** — pick the blocker hidden in the plan
28. **Scope creep flag** — pick which new request is real scope creep
29. **Customer interview question** — pick the better open-ended question
30. **Survey design flaw** — pick the leading question
31. **Qualitative vs quantitative** — pick which method fits the question
32. **Hypothesis crafting** — pick the testable hypothesis
33. **Experiment design** — pick the right A/B test setup
34. **Significance vs practical** — pick whether the lift matters
35. **Vanity metric trap** — pick which metric is vanity
36. **Negative result handling** — pick the right next step after a failed test
37. **Pricing experiment risk** — pick what could go wrong
38. **Discount cannibalization** — pick the segment most at risk
39. **Churn root cause** — pick the most likely cause given the data
40. **Win room decision** — pick the right escalation
41. **Crisis comms** — pick the better outage message
42. **Press messaging** — pick the right launch quote
43. **Internal launch readiness** — pick the missing readiness item
44. **Sales enablement** — pick the most useful collateral for the rep
45. **Customer success play** — pick the right intervention for the at-risk account
46. **Support tier design** — pick the right SLA for the segment
47. **NPS interpretation** — pick the right action for the score
48. **Feature request triage** — pick what to do with the loud request
49. **Roadmap communication** — pick how to say "no" to the stakeholder
50. **Strategic narrative** — pick the better one-liner for the board
51. **TAM/SAM/SOM** — pick the right market-size framing
52. **Moat identification** — pick the real competitive moat
53. **Positioning statement** — pick the tightest positioning line
54. **Pricing anchor** — pick the anchor that lifts willingness-to-pay
55. **Bundle design** — pick the bundle that maximizes perceived value
56. **Willingness-to-pay signal** — pick which research method surfaces it
57. **Acquisition loop** — pick the sustainable loop (paid vs viral vs content)
58. **Retention lever** — pick the intervention most likely to move the needle
59. **Referral program risk** — pick what could attract wrong-fit users
60. **Category creation** — pick when to create a new category vs join one
61. **Strategic narrative arc** — pick the story beat missing from the pitch
62. **Org design trade-off** — pick squad vs functional vs matrix for the goal
63. **Review cadence** — pick weekly vs monthly vs quarterly for the metric
64. **Decision log hygiene** — pick the decision worth documenting
65. **Principle vs rule** — pick which should be a principle vs a rule
66. **"No" that earns trust** — pick the refusal that strengthens the relationship
67. **Scope-of-influence map** — pick the stakeholder whose buy-in is decisive
68. **Narrative vs numbers** — pick which lands better for this audience
69. **Founder-mode intervention** — pick when to escalate past the normal process

---

## Bucket 5 — Math / Theory / Algorithms

1. **Big-O of a snippet** — pick the time complexity
2. **Big-O comparison** — pick which algorithm scales better
3. **Recurrence solver** — pick the closed form of the recurrence
4. **Master theorem case** — pick which case applies
5. **Amortized analysis** — pick the amortized cost per operation
6. **Worst case input** — pick the input that hits the worst case
7. **Best case input** — pick the input that hits the best case
8. **Average case** — pick the expected runtime over random input
9. **Stable sort identification** — pick which sort is stable
10. **In-place sort** — pick which sort is in-place
11. **Comparison-based lower bound** — pick why O(n log n) is the floor
12. **Counting/radix applicability** — pick when non-comparison sorts win
13. **Hash table average vs worst** — pick the expected vs adversarial case
14. **Set operation choice** — pick union vs intersection vs difference
15. **Graph representation** — pick adjacency list vs matrix for the density
16. **Graph traversal** — pick BFS vs DFS for the property needed
17. **Shortest path algorithm** — pick Dijkstra vs Bellman-Ford vs Floyd-Warshall
18. **MST algorithm** — pick Prim vs Kruskal for the graph shape
19. **Topological sort applicability** — pick whether the graph allows it
20. **Cycle detection** — pick the right method for directed/undirected
21. **DP subproblem** — pick the right state representation
22. **DP transition** — pick the correct recurrence
23. **Greedy correctness** — pick why greedy works (or fails) here
24. **Greedy vs DP** — pick which approach fits this problem
25. **Divide and conquer** — pick the split that gives the best bound
26. **Backtracking pruning** — pick the right pruning condition
27. **Two pointers** — pick when the technique applies
28. **Sliding window** — pick the right window invariant
29. **Binary search applicability** — pick what to search on
30. **Binary search predicate** — pick the right monotone predicate
31. **Bit manipulation** — pick the correct bitmask trick
32. **Prefix sum** — pick where the technique reduces complexity
33. **Difference array** — pick the right range-update trick
34. **Probability — independence** — pick whether events are independent
35. **Probability — conditional** — pick the right conditional probability
36. **Bayes' theorem** — pick the posterior given the priors
37. **Expected value** — pick the expectation of the random variable
38. **Variance / std dev** — pick the right spread measure
39. **Sampling distribution** — pick what the sample mean follows
40. **Confidence interval** — pick the right CI for the data
41. **Hypothesis test type** — pick t-test vs chi-square vs ANOVA
42. **p-value interpretation** — pick the correct meaning
43. **Type I vs Type II error** — pick which one is happening
44. **Linear algebra — rank** — pick the rank of the matrix
45. **Linear algebra — eigenvalue** — pick the eigenvalue from the trace/det
46. **Convexity check** — pick whether the function is convex
47. **Gradient direction** — pick the direction of steepest descent
48. **Optimization constraint** — pick the right Lagrangian
49. **Discrete vs continuous** — pick the right model
50. **Counting / combinatorics** — pick the right count for the arrangement
51. **Permutations vs combinations** — pick which formula fits
52. **Pigeonhole application** — pick where pigeonhole forces a collision
53. **Inclusion-exclusion** — pick the correct count after overlap removal
54. **Generating function pick** — pick the generating function for the sequence
55. **Induction base case** — pick the base that makes the induction work
56. **Induction step gap** — pick what's missing from the inductive step
57. **Proof by contradiction hook** — pick the assumption to negate
58. **Counterexample finder** — pick the counterexample to the stated claim
59. **Modular arithmetic** — pick the result of the modular expression
60. **Number theory — gcd/lcm** — pick the correct gcd or lcm
61. **Fermat / Euler application** — pick which theorem simplifies the power
62. **Invariant argument** — pick the invariant that proves the property
63. **Potential function** — pick the potential that yields the amortized bound
64. **Reduction between problems** — pick the reduction that preserves complexity
65. **NP-completeness** — pick which problem is NP-complete
66. **Approximation ratio** — pick the best achievable ratio for the problem
67. **Randomized algorithm choice** — pick Las Vegas vs Monte Carlo for the need
68. **Markov chain stationary** — pick the stationary distribution
69. **Information-theoretic lower bound** — pick why H(X) bits are required

---

## Bucket 6 — AI / LLM Engineering (prompting, RAG, agents, evals)

1. **Zero-shot vs few-shot** — pick which prompting strategy fits the task
2. **Few-shot example order** — pick the ordering that minimizes recency bias
3. **System prompt vs user prompt** — pick which layer to place the instruction
4. **Instruction placement** — pick where to put the instruction for best adherence
5. **Chain-of-thought trigger** — pick the prompt addition that unlocks reasoning
6. **Self-consistency sampling** — pick when majority-vote over samples helps
7. **Tree-of-thoughts fit** — pick when the task benefits from branching search
8. **ReAct pattern use** — pick when interleaving reasoning and tool calls wins
9. **Tool-use schema** — pick the function signature that reduces LLM confusion
10. **JSON mode failure** — pick the cause of malformed JSON output
11. **Structured output schema** — pick the schema that forces valid enums
12. **Pydantic / zod guardrail** — pick the validator that catches the bad field
13. **Temperature pick** — pick the temperature that fits the deterministic need
14. **Top-p vs top-k** — pick which sampler is better for this generation
15. **Stop sequence design** — pick the stop token that prevents runaway
16. **Max-tokens trap** — pick what gets truncated at the limit
17. **Context window budgeting** — pick what to drop when the window is full
18. **Prompt compression** — pick the lossless compression for the long context
19. **Chunking strategy** — pick fixed vs semantic vs recursive chunking
20. **Chunk size trade-off** — pick the size that balances recall and precision
21. **Chunk overlap pick** — pick the overlap that preserves cross-boundary facts
22. **Embedding model pick** — pick OpenAI vs Cohere vs open-source for the need
23. **Dense vs sparse retrieval** — pick BM25 vs dense vs hybrid for the queries
24. **Hybrid retrieval fusion** — pick RRF vs linear combination for the merge
25. **Re-ranking necessity** — pick when a cross-encoder re-ranker is worth it
26. **Query rewriting** — pick the rewrite that boosts retrieval hits
27. **HyDE technique** — pick when hypothetical-document embedding helps
28. **Metadata filter** — pick the filter that narrows the retrieval correctly
29. **Multi-hop RAG** — pick the routing step the agent is missing
30. **Citation requirement** — pick the prompt phrasing that forces citations
31. **Groundedness check** — pick the eval that catches ungrounded claims
32. **Hallucination category** — pick intrinsic vs extrinsic hallucination
33. **Prompt injection** — pick the input that hijacks the system prompt
34. **Jailbreak pattern** — pick the jailbreak style used against the model
35. **Guardrail placement** — pick input vs output vs in-context guardrail
36. **Evals dataset design** — pick the holdout set that prevents contamination
37. **LLM-as-judge pitfall** — pick the bias the judge LLM introduces
38. **Golden set curation** — pick the example that belongs in the golden set
39. **Rubric design** — pick the scoring rubric that reduces judge variance
40. **A/B prompt test** — pick the evaluation that settles the comparison
41. **Regression test pick** — pick the test case that catches prompt regressions
42. **Agent planning failure** — pick where the agent's plan breaks down
43. **ReAct loop breaker** — pick the termination condition that prevents loops
44. **Tool selection error** — pick why the agent picked the wrong tool
45. **Memory strategy** — pick short-term vs long-term vs episodic memory
46. **Vector memory stale** — pick the symptom of out-of-date agent memory
47. **Function-calling latency** — pick the architectural change that speeds it up
48. **Streaming vs batch response** — pick the UX that fits the latency
49. **Token cost optimization** — pick the change that cuts spend the most
50. **KV cache reuse** — pick when prompt caching gives a real speedup
51. **Distillation opportunity** — pick which teacher→student pair makes sense
52. **Quantization trade-off** — pick 4-bit vs 8-bit vs 16-bit for the deployment
53. **Model routing** — pick small-model vs large-model routing criteria
54. **Cost-per-query analysis** — pick the pricing model that fits the traffic
55. **Latency budget** — pick the step to optimize first for the tail
56. **Async orchestration** — pick the concurrency model for parallel tool calls
57. **Fallback model strategy** — pick the failover when the primary times out
58. **Safety classifier tier** — pick where to run the safety filter in the stack
59. **PII scrubbing** — pick the input sanitation for the sensitive field
60. **Retry on refusal** — pick the right retry policy when the model refuses
61. **Cache-key design for RAG** — pick the key that maximizes hit rate
62. **Prompt templating hygiene** — pick the variable-escaping bug
63. **Few-shot drift** — pick the example that no longer reflects the task
64. **Context-poisoning** — pick the source that corrupted the retrieved context
65. **Chunk deduplication** — pick the dedup rule that preserves signal
66. **Open-source model pick** — pick Llama vs Mistral vs Qwen for the need
67. **Fine-tune vs RAG vs prompt** — pick the right level to inject knowledge
68. **Agent benchmark pick** — pick the benchmark that matches the agent's task
69. **Prompt-library governance** — pick the version-control rule for prompts

---

## Bucket 7 — Generative AI / Creative AI (image, video, audio)

1. **Text-to-image model pick** — pick SDXL vs Midjourney vs DALL-E for the brief
2. **Prompt weighting syntax** — pick the weight that emphasizes the subject
3. **Negative prompt use** — pick the negative phrase that removes the artifact
4. **Seed reproducibility** — pick what changes when only the seed changes
5. **Sampler pick** — pick Euler vs DPM++ vs DDIM for the style
6. **Step count trade-off** — pick the step count that balances quality and cost
7. **CFG scale effect** — pick what happens when CFG rises too high
8. **Aspect ratio trap** — pick the aspect that breaks the subject framing
9. **Resolution upscale choice** — pick the upscaler for the image type
10. **Img2img strength** — pick the strength that preserves composition
11. **Inpainting mask design** — pick the mask shape that avoids seams
12. **ControlNet pick** — pick canny vs depth vs pose for the control need
13. **IP-Adapter use** — pick when image-prompt conditioning beats text prompting
14. **LoRA vs fine-tune** — pick which customization tool fits the scale
15. **LoRA weight blend** — pick the weight that combines two LoRAs cleanly
16. **Style token design** — pick the trigger word that activates the LoRA
17. **Textual inversion use** — pick when an embedding is enough
18. **DreamBooth pitfall** — pick the overfitting symptom in the samples
19. **Face consistency technique** — pick the method for stable identity across images
20. **Scene consistency technique** — pick the method for stable scene across frames
21. **Video model pick** — pick Runway vs Pika vs Kling for the brief
22. **Motion prompt design** — pick the phrase that describes camera movement
23. **Keyframe interpolation** — pick the frames that yield smooth transition
24. **Frame rate pick** — pick the fps that matches the platform
25. **Shot length pick** — pick the shot length for the platform (TikTok vs YouTube)
26. **Camera angle prompt** — pick the wording for the desired angle
27. **Lens / focal length hint** — pick the lens that creates the intended feel
28. **Depth of field prompt** — pick the wording for shallow vs deep DoF
29. **Lighting setup prompt** — pick the wording for the intended mood
30. **Color grading cue** — pick the phrase that nudges the grade
31. **Film stock / emulation cue** — pick the film reference that sets the look
32. **Style reference mixing** — pick the two-style combo that works vs fights
33. **Image-to-video conversion** — pick the motion pattern for the still
34. **Audio generation model pick** — pick Suno vs Udio vs ElevenLabs for the goal
35. **Voice cloning ethics** — pick the deployment that respects consent rules
36. **TTS voice pick** — pick the voice that matches the brand tone
37. **Music generation prompt** — pick the genre + instrumentation phrasing
38. **SFX design prompt** — pick the descriptor for the desired sound
39. **Lip-sync tool choice** — pick the tool for the visual + voice pairing
40. **Avatar generation pick** — pick the tool for the avatar style + quality needed
41. **Background removal quality** — pick the tool that handles hair correctly
42. **Outpainting use** — pick when to extend the canvas vs crop
43. **Prompt length sweet spot** — pick the prompt length that doesn't dilute
44. **Negative-space composition** — pick the phrasing that leaves room for text
45. **Text-in-image reliability** — pick the model that renders legible text
46. **Logo preservation trick** — pick the method that keeps the logo intact
47. **Brand palette enforcement** — pick how to lock colors in generation
48. **Consistent character rig** — pick the workflow for a recurring character
49. **Storyboard generation** — pick the prompt that yields aligned panels
50. **B-roll ideation** — pick the b-roll prompt that fills the gap
51. **Script-to-video pipeline** — pick the step that's missing from the flow
52. **Voiceover timing fix** — pick the adjustment that re-syncs the audio
53. **Subtitle burn-in vs file** — pick the choice for the distribution channel
54. **Safety filter bypass risk** — pick the prompt that triggers a false-block
55. **NSFW content policy** — pick the workflow that respects the platform rules
56. **Right-of-publicity risk** — pick the output that needs additional clearance
57. **Training data disclosure** — pick the accurate way to describe the model's training
58. **Copyright-safe reference** — pick the reference that avoids infringement
59. **Watermark handling** — pick the right policy for removing vs keeping
60. **Asset versioning** — pick the naming scheme that tracks iterations cleanly
61. **Iteration budget** — pick the right number of generations before pivoting
62. **Brief-to-prompt translation** — pick the prompt that captures the brief
63. **Client revision turn** — pick the minimal change prompt that addresses the note
64. **Grid vs single gen** — pick when a grid of variants is worth the cost
65. **Upscaler artifact** — pick the artifact introduced by the upscaler
66. **Compression loss** — pick the compression setting for the target platform
67. **Metadata preservation** — pick the export that retains the prompt data
68. **Post-processing tool pick** — pick Photoshop vs Canva vs Figma for the finish
69. **Generation provenance** — pick the provenance tag that belongs on the asset

---

## Bucket 8 — NLP & Text Processing

1. **Tokenization pick** — pick BPE vs WordPiece vs SentencePiece for the need
2. **Subword vs word** — pick which level handles the OOV problem
3. **Stopword removal trade-off** — pick where stopwords should stay
4. **Stemming vs lemmatization** — pick which is appropriate for the task
5. **POS tagging use** — pick where POS tags sharpen the pipeline
6. **NER label schema** — pick BIO vs IO vs BILOU for the downstream task
7. **Chunking vs parsing** — pick which level is sufficient here
8. **Dependency parse read** — pick the subject of the sentence from the parse
9. **Coreference resolution** — pick the antecedent of the pronoun
10. **Language detection** — pick the model for short snippets vs long docs
11. **Text classification baseline** — pick the baseline before reaching for LLMs
12. **Sentiment nuance** — pick the review whose sentiment the classifier missed
13. **Sarcasm detection** — pick the cue that signals sarcasm
14. **Topic modeling pick** — pick LDA vs BERTopic vs NMF for the corpus
15. **Topic drift over time** — pick the technique that surfaces temporal drift
16. **TF-IDF vs embeddings** — pick which representation wins for the task
17. **Document similarity** — pick the measure for the doc-length mismatch
18. **Duplicate detection** — pick the hashing approach for near-duplicates
19. **Fuzzy match threshold** — pick the Levenshtein/Jaccard threshold for the use case
20. **Text normalization** — pick the normalization step that precedes matching
21. **Unicode pitfall** — pick the normalization that fixes the look-alike issue
22. **Emoji handling** — pick the strategy for emoji-heavy text
23. **Code-switched text** — pick the pipeline that handles multi-language input
24. **Transliteration choice** — pick the scheme that roundtrips cleanly
25. **Text cleaning order** — pick the order of cleaning steps that preserves signal
26. **Sentence segmentation trap** — pick the input that breaks the segmenter
27. **Abbreviation expansion** — pick the rule that disambiguates the abbreviation
28. **Entity linking** — pick the knowledge base that fits the entity type
29. **Relation extraction** — pick the schema that captures the relation
30. **Summarization pick** — pick extractive vs abstractive for the length + fidelity
31. **Abstractive hallucination** — pick the summary sentence that's unsupported
32. **ROUGE / BLEU / METEOR** — pick the right metric for the task
33. **BERTScore use** — pick when embedding-based scoring helps
34. **Translation evaluation** — pick the metric that correlates with human judgment
35. **Back-translation augmentation** — pick when it improves the downstream task
36. **Paraphrase generation** — pick the model that produces diverse paraphrases
37. **Text generation decoding** — pick greedy vs beam vs sampling for the need
38. **Beam size trade-off** — pick the beam size that balances quality and speed
39. **Repetition penalty** — pick the penalty that kills loops without bleaching style
40. **Length penalty** — pick the setting for long-form vs short-form tasks
41. **Controlled generation** — pick the method that enforces a style/tone
42. **Constrained decoding** — pick the decoding rule that enforces the JSON schema
43. **Toxicity detection** — pick the classifier for the platform's policy
44. **Hate speech vs offensive** — pick the label that matches the example
45. **Offensive-language false positive** — pick the benign example the filter blocks
46. **Text watermarking** — pick the watermark that survives paraphrase
47. **AI-text detection pitfall** — pick why the detector misclassifies the sample
48. **Information extraction prompt** — pick the prompt that beats the baseline IE
49. **Regex vs LLM for extraction** — pick the approach by cost and reliability
50. **Chunk-aware extraction** — pick the extraction that respects chunk boundaries
51. **Long-doc QA strategy** — pick map-reduce vs retrieve vs refine
52. **Cross-encoder vs bi-encoder** — pick which retrieval architecture fits
53. **Query expansion** — pick the expansion that lifts recall without drowning precision
54. **Spell-correction pipeline** — pick the right layer to add the corrector
55. **Grammar-check rule vs ML** — pick which approach fits the error type
56. **Readability metric** — pick Flesch vs SMOG vs Dale-Chall for the audience
57. **Style transfer pitfall** — pick the content leakage in the output
58. **Dialogue state tracking** — pick the state representation that scales
59. **Turn-taking detection** — pick the cue that signals end-of-turn
60. **Intent classification** — pick the intent that matches the user utterance
61. **Slot filling** — pick the slot values extracted from the utterance
62. **Language model perplexity** — pick what a lower perplexity means for the task
63. **Corpus quality audit** — pick the symptom of a contaminated corpus
64. **Deduping for training data** — pick the dedup method that scales
65. **Data augmentation NLP** — pick the augmentation that doesn't flip the label
66. **Label propagation** — pick the right semi-supervised method
67. **Weak supervision rule** — pick the labeling function that's informative
68. **Text-to-SQL pitfall** — pick the input where the model produces wrong SQL
69. **Multi-lingual model pick** — pick the multilingual model for the language mix

---

## Bucket 9 — Computer Vision

1. **Task framing** — pick classification vs detection vs segmentation for the goal
2. **CNN vs ViT** — pick which architecture fits the data size
3. **Input resolution trade-off** — pick the resolution that balances accuracy and compute
4. **Backbone pick** — pick ResNet vs EfficientNet vs ViT for the deployment
5. **Transfer learning layer** — pick how many layers to freeze
6. **Data augmentation pick** — pick the augmentation that preserves the label
7. **CutMix / MixUp use** — pick when the augmentation helps vs hurts
8. **Class imbalance CV** — pick the loss or sampling strategy
9. **Focal loss justification** — pick when focal loss is necessary
10. **Anchor box tuning** — pick the anchor set for the object scale
11. **NMS threshold** — pick the threshold that balances recall and duplicates
12. **IoU vs GIoU vs DIoU** — pick the metric for the geometry
13. **mAP interpretation** — pick what a gap between mAP@.5 and mAP@.5:.95 means
14. **Confusion between classes** — pick the likely confusion pair from the matrix
15. **Annotation error audit** — pick the flaw in the labeled dataset
16. **Hard example mining** — pick the mining strategy for rare classes
17. **Segmentation head pick** — pick U-Net vs DeepLab vs Mask R-CNN for the need
18. **Panoptic vs instance** — pick which output the task actually needs
19. **Keypoint detection** — pick the right head for pose estimation
20. **OCR pipeline stage** — pick the failing stage in the OCR flow
21. **Text-in-the-wild** — pick the model that handles curved text
22. **Document understanding** — pick layout-aware vs vision-language model
23. **Image retrieval** — pick the right global descriptor
24. **Face recognition threshold** — pick the FAR/FRR point for the deployment
25. **Re-identification trick** — pick the loss that improves re-id
26. **Optical flow pick** — pick dense vs sparse for the use case
27. **Video action recognition** — pick 2D+LSTM vs 3D CNN vs transformer
28. **Tracking algorithm** — pick SORT vs DeepSORT vs ByteTrack for the constraints
29. **Depth estimation** — pick monocular vs stereo vs LiDAR for the scene
30. **3D reconstruction pick** — pick NeRF vs Gaussian splatting vs photogrammetry
31. **Point cloud model** — pick PointNet vs voxel vs mesh input
32. **Multi-view fusion** — pick early vs late fusion for the sensor setup
33. **Domain adaptation** — pick the technique for the source→target shift
34. **Synthetic data use** — pick when synthetic helps and when it hurts
35. **Sim-to-real gap** — pick the augmentation that narrows the gap
36. **Data drift in vision** — pick the signal that the input distribution shifted
37. **Lighting invariance** — pick the augmentation that makes the model robust
38. **Rotation / scale invariance** — pick the architecture trick that enforces it
39. **Camera calibration issue** — pick the symptom of bad intrinsics
40. **Image compression artifact** — pick the artifact that hurts the model
41. **Data leakage CV** — pick the near-duplicate that leaked across splits
42. **Explainability tool** — pick Grad-CAM vs LIME vs integrated gradients
43. **Saliency map read** — pick the conclusion from the saliency visualization
44. **Adversarial example** — pick the perturbation that fools the classifier
45. **Robustness benchmark** — pick ImageNet-C vs ObjectNet vs ImageNet-A for the test
46. **On-device inference pick** — pick the model for the mobile target
47. **Quantization choice CV** — pick the bit width for the accuracy budget
48. **Pruning effect** — pick what drops when the network is pruned
49. **Knowledge distillation** — pick the teacher→student combo
50. **Multi-task learning** — pick the task head combination that helps
51. **Auxiliary loss** — pick the aux loss that regularizes training
52. **Self-supervised pretext** — pick MAE vs SimCLR vs DINO for the data
53. **CLIP zero-shot** — pick when CLIP outperforms a supervised baseline
54. **Open-vocabulary detection** — pick when OVD replaces closed-set detection
55. **Prompt-based segmentation (SAM)** — pick the right prompt type for the object
56. **Text-to-image model fine-tune** — pick when fine-tuning beats prompt engineering
57. **Super-resolution pick** — pick ESRGAN vs diffusion upscaler for the image
58. **Image denoising pick** — pick the denoiser for the noise model
59. **HDR tone mapping** — pick the operator for the scene
60. **Medical imaging quirk** — pick the CV step that the medical domain changes
61. **Remote sensing specificity** — pick the CV adaptation for satellite data
62. **Agricultural CV case** — pick the model for crop/pest detection
63. **Retail shelf audit** — pick the pipeline that tracks product placement
64. **AR marker design** — pick the marker that survives occlusion
65. **Gesture recognition** — pick the sensor + model combo for the latency target
66. **Gaze estimation** — pick the calibration that's needed
67. **License plate recognition** — pick the pipeline step missing from the flow
68. **Privacy-preserving CV** — pick the blur / redaction approach for the use case
69. **Edge CV compute split** — pick what to run on device vs cloud

---

## Bucket 10 — Reinforcement Learning

1. **MDP framing** — pick the state / action / reward definition for the problem
2. **Discount factor γ** — pick the γ that aligns with the horizon
3. **Reward shaping risk** — pick the shaping term that causes reward hacking
4. **Sparse vs dense reward** — pick which fits the task and algorithm
5. **Exploration strategy** — pick ε-greedy vs Boltzmann vs noisy nets
6. **Exploration bonus** — pick count-based vs curiosity-based bonus
7. **Value iteration vs policy iteration** — pick which converges faster here
8. **Q-learning vs SARSA** — pick off-policy vs on-policy for the need
9. **Double DQN motivation** — pick the bias it corrects
10. **Dueling network use** — pick when the dueling architecture helps
11. **Prioritized replay** — pick when PER beats uniform replay
12. **Replay buffer size** — pick the size for the stability target
13. **Target network update** — pick hard vs soft update frequency
14. **Policy gradient variance** — pick the baseline that reduces variance
15. **Actor-critic split** — pick the architecture for shared vs separate networks
16. **PPO vs TRPO** — pick which fits the compute budget
17. **Clipping ratio pick** — pick the PPO clip value for the problem
18. **GAE λ pick** — pick the λ that balances bias and variance
19. **Entropy bonus tuning** — pick the entropy coefficient that prevents collapse
20. **Model-based RL fit** — pick when learning a dynamics model pays off
21. **Planning horizon** — pick the rollout length for MPC vs Dyna
22. **Dyna-style integration** — pick how to mix real and imagined transitions
23. **Offline RL pitfall** — pick the extrapolation risk when data is fixed
24. **BCQ / CQL use** — pick the offline algorithm for the dataset coverage
25. **Behavior cloning failure** — pick why BC fails on the described task
26. **DAgger use** — pick when DAgger fixes the BC problem
27. **Inverse RL** — pick the setting where IRL beats hand-crafted rewards
28. **Reward from demonstrations** — pick the demo-to-reward method
29. **Multi-agent RL pick** — pick independent vs centralized vs value decomposition
30. **Credit assignment MARL** — pick the technique for who-did-what
31. **Self-play dynamics** — pick the training schedule that prevents exploitation
32. **Population-based training** — pick when PBT improves on vanilla tuning
33. **Curriculum design** — pick the curriculum that accelerates learning
34. **Goal-conditioned policy** — pick the goal representation that generalizes
35. **Hindsight experience replay** — pick the relabeling rule that helps
36. **Meta-RL setup** — pick the right task distribution for meta-learning
37. **Hierarchical RL** — pick the right option/subgoal decomposition
38. **Safe exploration** — pick the constraint that keeps training safe
39. **Constrained MDP** — pick the Lagrangian weight adjustment
40. **Sim-to-real RL** — pick domain randomization vs adaptation
41. **Robotics action space** — pick continuous vs discrete for the actuator
42. **Observation normalization** — pick the normalization that stabilizes training
43. **Return normalization** — pick when return scaling prevents instability
44. **Gradient clipping** — pick the clip value for the spike problem
45. **Learning rate schedule** — pick the schedule for the RL training curve
46. **Catastrophic forgetting** — pick the mitigation in continual RL
47. **Experience diversity** — pick the sampling trick that preserves diversity
48. **RL eval protocol** — pick the eval that avoids overfit to seeds
49. **Wall-clock vs sample efficiency** — pick which matters for the deployment
50. **On-policy vs off-policy sample use** — pick the algorithm for the data budget
51. **RLHF pipeline** — pick the step missing from the RLHF flow
52. **Reward model overfitting** — pick the signal of reward model collapse
53. **KL penalty in RLHF** — pick the KL weight that balances fluency and reward
54. **DPO vs PPO for alignment** — pick which fits the resource budget
55. **Preference data curation** — pick the labeling protocol for the task
56. **RLHF reward hacking** — pick the exploit the model found
57. **Bandit vs full RL** — pick which framing fits the decision structure
58. **Contextual bandit use** — pick when context-free bandits are enough
59. **Thompson sampling pick** — pick when TS beats UCB
60. **Regret definition** — pick the right regret metric for the problem
61. **Non-stationary environment** — pick the detection of distribution shift
62. **Partial observability** — pick the solution for POMDP vs MDP
63. **Recurrent policy choice** — pick LSTM vs Transformer for long memory
64. **Frame stacking** — pick the stack depth for the dynamics
65. **Action smoothing** — pick when to penalize action jitter
66. **Reward normalization trick** — pick the normalization that stabilizes training
67. **Trajectory optimization** — pick iLQR vs CEM vs MPPI for the problem
68. **RL debugging signal** — pick the symptom that says "bug, not hyperparam"
69. **Deployment shift mitigation** — pick what to monitor post-deployment

---

## Bucket 11 — Data Engineering (pipelines, ETL, streaming)

1. **Batch vs streaming pick** — pick which paradigm fits the latency requirement
2. **Lambda vs kappa architecture** — pick the architecture for the consistency need
3. **ETL vs ELT** — pick the right ordering given the warehouse capability
4. **Change data capture** — pick log-based vs trigger-based vs query-based CDC
5. **Schema registry use** — pick when Confluent Schema Registry is worth it
6. **Avro vs Parquet vs ORC** — pick the format for the workload
7. **Compression choice** — pick snappy vs zstd vs gzip for the trade-off
8. **Partitioning strategy** — pick the partition key for the query pattern
9. **Bucketing vs partitioning** — pick which cuts the shuffle cost
10. **File size sweet spot** — pick the file size that avoids small-file problems
11. **Data lake layout** — pick bronze/silver/gold or equivalent for the need
12. **Data lakehouse pick** — pick Delta vs Iceberg vs Hudi for the feature set
13. **Upsert support** — pick the table format that supports MERGE correctly
14. **Time travel use** — pick when querying historical snapshots is worth it
15. **Vacuum / compaction cadence** — pick the frequency for the workload
16. **Z-order / clustering** — pick the clustering column for the query
17. **Manifest file cost** — pick what slows down when there are too many manifests
18. **Metadata service** — pick Hive metastore vs Glue vs Unity Catalog
19. **Catalog organization** — pick the catalog structure for multi-tenant
20. **Data lineage tool** — pick the lineage solution for the stack
21. **Airflow vs Dagster vs Prefect** — pick the orchestrator for the team
22. **DAG design** — pick the right granularity for a task
23. **Task idempotency** — pick the design that makes the task safe to retry
24. **Backfill strategy** — pick the backfill that respects downstream SLAs
25. **SLA miss response** — pick the right paging vs retry decision
26. **Sensor vs poke-interval** — pick the sensor pattern for the external signal
27. **Watermark handling** — pick the watermark strategy in the stream job
28. **Windowing choice** — pick tumbling vs sliding vs session for the aggregation
29. **Late arrival policy** — pick how to handle events past the window close
30. **Exactly-once vs at-least-once** — pick the right guarantee for the sink
31. **Kafka partition count** — pick the partition count for the throughput target
32. **Consumer group strategy** — pick the consumer layout that avoids skew
33. **Dead letter topic** — pick when to route bad events to a DLT
34. **Stream join pick** — pick stream-stream vs stream-table for the lookup
35. **Stateful stream scaling** — pick the scaling action that preserves state
36. **Checkpoint frequency** — pick the checkpoint interval for the latency budget
37. **Exactly-once sink** — pick the sink that supports transactional writes
38. **Streaming to warehouse** — pick the micro-batch vs streaming path
39. **OLTP vs OLAP routing** — pick which system the query belongs on
40. **Data contract enforcement** — pick the layer to enforce the contract
41. **PII classification pipeline** — pick the step that tags PII fields
42. **Data masking strategy** — pick the mask that preserves usability
43. **Retention policy** — pick the retention that meets both legal and cost needs
44. **Cost attribution** — pick the tagging scheme that attributes warehouse cost
45. **Slowly changing dimension** — pick SCD Type 1 vs 2 vs 6 for the history need
46. **Surrogate vs natural key** — pick the key design for the warehouse
47. **Fact table grain** — pick the grain that matches the business question
48. **Star vs snowflake** — pick the schema for the query pattern
49. **Data vault** — pick when data vault modeling is worth the overhead
50. **Idempotent merge** — pick the merge logic that avoids duplicates
51. **DQ test pick** — pick the data quality test that catches the bug
52. **Great Expectations rule** — pick the expectation that fits the column
53. **Anomaly on metric** — pick the root cause of the unexpected row count
54. **Schema drift detection** — pick the alert that fires early
55. **Data contract breaking change** — pick the change that requires consumer sign-off
56. **Upstream outage handling** — pick the degradation mode for the pipeline
57. **Warehouse credit optimization** — pick the query change that cuts cost
58. **Auto-scale warehouse** — pick the right cluster size policy
59. **Materialized view refresh** — pick the refresh cadence for freshness vs cost
60. **Incremental model design** — pick the merge strategy for the incremental model
61. **DBT layering** — pick staging vs intermediate vs marts placement
62. **Seed vs source** — pick which is right for the reference data
63. **Snapshot strategy (dbt)** — pick the snapshot config for the SCD need
64. **Metrics layer use** — pick when a metrics layer beats hand-written SQL
65. **Reverse ETL use** — pick the destination that fits the use case
66. **CDC to warehouse drift** — pick the cause of the row-count gap
67. **Stream deduplication** — pick the window + key for the dedup
68. **Skew mitigation** — pick the salting or repartition strategy
69. **Pipeline observability** — pick the metric that signals upstream regression

---

## Bucket 12 — Databases (SQL, NoSQL, vector, graph)

1. **Relational model fit** — pick where normalization wins
2. **Denormalization call** — pick where denormalization pays off
3. **ACID requirement** — pick the operation that demands strict ACID
4. **BASE acceptance** — pick the operation where eventual is fine
5. **Isolation level pick** — pick read-committed vs repeatable-read vs serializable
6. **Phantom read fix** — pick the isolation level that prevents phantoms
7. **Lost update fix** — pick the mechanism that prevents it
8. **Deadlock avoidance** — pick the access order that prevents the deadlock
9. **Index type pick** — pick B-tree vs hash vs GiST vs GIN
10. **Composite index order** — pick the column order that uses the index
11. **Covering index use** — pick when a covering index is worth the write cost
12. **Partial index use** — pick when partial indexes shine
13. **Index bloat symptom** — pick the cause of swelling index size
14. **Query plan read** — pick the stage that's the bottleneck
15. **Seq scan vs index scan** — pick why the optimizer chose seq
16. **Join algorithm pick** — pick hash vs nested vs merge for the shapes
17. **CTE vs subquery** — pick which the optimizer handles better here
18. **Window function use** — pick the window function that solves the problem
19. **GROUP BY vs DISTINCT** — pick which is semantically correct
20. **NULL semantics trap** — pick the query that handles NULLs correctly
21. **UPSERT syntax pick** — pick MERGE vs ON CONFLICT vs INSERT IGNORE
22. **Transaction retry** — pick the retry logic for a serialization failure
23. **Connection pooling** — pick PgBouncer vs driver pool vs none
24. **Prepared statement use** — pick when it helps vs hurts
25. **SQL injection defense** — pick the safe parameterization
26. **Partitioned table pick** — pick range vs list vs hash partitioning
27. **Sharding vs partitioning** — pick which term applies to the architecture
28. **Read replica use** — pick the query that can go to the replica
29. **Primary election** — pick the right leader election approach
30. **Backup strategy SQL** — pick logical vs physical backup for the need
31. **Point-in-time recovery** — pick the setting that enables PITR
32. **Schema migration** — pick the zero-downtime migration path
33. **Large-table ALTER** — pick the online schema change tool
34. **Audit log design** — pick the table layout for audit trails
35. **Temporal tables** — pick the pattern for querying history
36. **Hierarchical data** — pick adjacency list vs nested set vs path enumeration
37. **Full-text search pick** — pick Postgres FTS vs Elasticsearch vs Lucene
38. **MongoDB schema** — pick embedded vs referenced for the access pattern
39. **Cassandra partition key** — pick the partition key that avoids hotspots
40. **DynamoDB GSI** — pick the GSI that answers the query
41. **Redis data structure** — pick string vs hash vs sorted-set vs stream
42. **Redis eviction policy** — pick LRU vs LFU vs TTL-based
43. **Key-value use case** — pick when KV is the right tool
44. **Document DB fit** — pick when a document store wins over relational
45. **Wide-column fit** — pick when Cassandra-style wins
46. **Time-series DB pick** — pick TimescaleDB vs Influx vs Prometheus
47. **Vector DB pick** — pick pgvector vs Pinecone vs Weaviate vs Milvus
48. **ANN index pick** — pick HNSW vs IVF vs PQ for recall/latency
49. **HNSW parameter** — pick the M / ef value for the dataset
50. **IVF nlist tuning** — pick the nlist for the recall target
51. **Product quantization pick** — pick when PQ compression is needed
52. **Hybrid vector search** — pick the combination of dense + sparse
53. **Metadata filter pushdown** — pick the filter that lets the index help
54. **Embedding dim trade-off** — pick the dim that balances quality and cost
55. **Vector index rebuild cadence** — pick the rebuild trigger
56. **Graph DB fit** — pick when Neo4j beats relational joins
57. **Cypher query** — pick the Cypher that matches the pattern
58. **Graph traversal cost** — pick the traversal pattern that scales
59. **Knowledge graph design** — pick the schema for the entity/relation count
60. **Triple store vs property graph** — pick which fits the query model
61. **Denormalized blob pitfall** — pick where the blob design breaks
62. **Write amplification DB** — pick the LSM-tree compaction effect
63. **LSM vs B-tree** — pick which engine fits the workload
64. **Bloom filter use** — pick when the bloom filter speeds up reads
65. **MVCC behavior** — pick what the reader sees mid-transaction
66. **Vacuum / autovacuum issue** — pick the symptom of vacuum lag
67. **Replication lag cause** — pick the reason the replica fell behind
68. **Logical vs physical replication** — pick the right mode for the need
69. **Multi-region DB topology** — pick active-active vs active-passive

---

## Bucket 13 — Cloud & Infrastructure

1. **Region pick** — pick the region that balances latency, cost, and data residency
2. **Availability zone design** — pick the AZ layout for the HA target
3. **Multi-region active-active** — pick when active-active is justified
4. **VPC design** — pick the subnet layout for public/private tiers
5. **Subnet sizing** — pick the CIDR size for the expected IP count
6. **NAT gateway vs instance** — pick which fits the scale
7. **Peering vs transit gateway** — pick the right interconnect
8. **Private link use** — pick when private link beats public endpoints
9. **Route 53 / DNS routing** — pick weighted vs latency vs geo routing
10. **Load balancer tier** — pick ALB vs NLB vs CLB for the workload
11. **Auto Scaling Group config** — pick the scaling metric and cooldown
12. **Instance family pick** — pick compute-optimized vs memory vs general
13. **Spot vs on-demand vs reserved** — pick the mix for the workload
14. **EBS volume pick** — pick gp3 vs io2 vs st1 for the I/O profile
15. **Storage class choice** — pick S3 Standard vs IA vs Glacier
16. **Lifecycle rule** — pick the rule that tiers cold data safely
17. **Object versioning** — pick when versioning is worth the cost
18. **Bucket policy** — pick the policy that locks cross-account access
19. **IAM least privilege** — pick the policy trim that keeps the workflow working
20. **Role assumption chain** — pick the safe delegation pattern
21. **KMS key management** — pick CMK vs managed key for the sensitivity
22. **Envelope encryption** — pick when envelope encryption is necessary
23. **Secrets Manager vs Parameter Store** — pick the fit for the use case
24. **VPN vs Direct Connect** — pick the hybrid connectivity option
25. **Transit Gateway pattern** — pick the hub-spoke topology
26. **Edge caching** — pick CloudFront vs Fastly vs Cloudflare for the need
27. **Origin shield use** — pick when origin shield cuts origin load
28. **WAF rule design** — pick the rule that blocks the attack without false positives
29. **DDoS protection tier** — pick basic vs advanced for the risk profile
30. **CDN invalidation** — pick the strategy that keeps freshness and cost balanced
31. **Managed Kubernetes pick** — pick EKS vs GKE vs AKS on platform fit
32. **Kubernetes node group** — pick the node sizing for the pod mix
33. **Taints / tolerations** — pick the right taint for the GPU workload
34. **Pod affinity** — pick the affinity rule for the co-location need
35. **Ingress controller** — pick ALB vs NGINX vs Traefik for the deployment
36. **HPA vs VPA** — pick which scaler fits the workload
37. **Cluster autoscaler** — pick the right scale-down grace period
38. **StatefulSet vs Deployment** — pick for the persistence need
39. **Persistent volume claim** — pick the storage class for the IOPS need
40. **Service mesh pick** — pick Istio vs Linkerd vs Consul for the need
41. **mTLS enforcement** — pick the layer that terminates mTLS
42. **Pod security policy** — pick the PSP/PSS rule for the risk
43. **Container image scanning** — pick when to scan in the pipeline
44. **Registry choice** — pick ECR vs GHCR vs Harbor for the need
45. **Base image pick** — pick distroless vs alpine vs slim for the workload
46. **Multi-stage build** — pick the stages that minimize image size
47. **Docker layer caching** — pick the change that invalidates the cache
48. **Serverless pick** — pick Lambda vs Cloud Functions vs Cloud Run
49. **Cold start mitigation** — pick provisioned concurrency vs keep-warm
50. **Lambda memory sizing** — pick the memory that minimizes cost per invocation
51. **Step Functions vs choreography** — pick orchestration vs choreography
52. **EventBridge vs SNS vs SQS** — pick the right event broker
53. **Fargate vs EC2 on ECS** — pick the right compute for the workload
54. **Managed DB pick** — pick RDS vs Aurora vs self-managed
55. **Aurora Serverless v2** — pick when serverless DB is worth it
56. **Multi-account strategy** — pick the account layout for the org
57. **SCP vs IAM** — pick the right policy tier
58. **Landing zone design** — pick the baseline for new accounts
59. **Cost budget alert** — pick the anomaly that should page
60. **Savings Plan vs RI** — pick the right commitment for the workload
61. **Cost allocation tag** — pick the tag that drives chargeback
62. **FinOps KPI** — pick the KPI that catches waste
63. **Region failover runbook** — pick the step missing from the DR runbook
64. **Pilot light vs warm standby** — pick the DR pattern for the RTO
65. **Backup + restore DR** — pick when the cheapest DR is enough
66. **Terraform vs Pulumi vs CDK** — pick the IaC for the team
67. **Terraform state backend** — pick the backend that supports locking
68. **State file secret leak** — pick the mitigation for the secret in state
69. **GitOps trigger** — pick the event that should promote to prod

---

## Bucket 14 — Distributed Systems & Networking

1. **FLP impossibility** — pick what the FLP result forbids in async systems
2. **Consensus protocol pick** — pick Paxos vs Raft vs PBFT for the need
3. **Leader election** — pick the election pattern that avoids split brain
4. **Quorum sizing** — pick the R/W/N combo for the consistency target
5. **Vector clocks** — pick what two vectors tell you about causality
6. **Lamport timestamp use** — pick where logical time is sufficient
7. **Hybrid logical clock** — pick when HLC beats pure Lamport
8. **Clock skew impact** — pick the bug caused by skew
9. **Gossip protocol** — pick when gossip beats central coordinator
10. **Anti-entropy repair** — pick the right repair cadence
11. **Hinted handoff** — pick the scenario where hinted handoff applies
12. **Read repair** — pick the cost of read repair on the path
13. **Merkle tree sync** — pick when a Merkle tree reduces sync bandwidth
14. **CRDT pick** — pick G-counter vs PN-counter vs LWW-register for the type
15. **Causal consistency** — pick the use case that needs it
16. **Linearizability vs serializability** — pick which property applies
17. **Session consistency** — pick when session guarantees are enough
18. **Byzantine fault tolerance** — pick when BFT is justified
19. **Two-phase commit** — pick the failure mode of 2PC
20. **Three-phase commit** — pick what 3PC fixes (and what it doesn't)
21. **Saga coordinator** — pick orchestrated vs choreographed saga
22. **Idempotency key design** — pick the key scope for the retry safety
23. **Retry amplification** — pick the failure where retries made it worse
24. **Timeout budget** — pick the timeout for the request hop
25. **Exponential backoff + jitter** — pick the reason jitter matters
26. **Head-of-line blocking** — pick where HOL blocks progress
27. **Thundering herd** — pick the mitigation for the spike
28. **Connection draining** — pick the drain step before restart
29. **Graceful shutdown** — pick the signal handling order
30. **Heartbeat interval** — pick the interval that catches failures without false positives
31. **Phi-accrual failure detector** — pick when adaptive detection wins
32. **Service discovery** — pick DNS vs registry vs static for the scale
33. **Envoy vs HAProxy** — pick the proxy for the feature need
34. **Sidecar pattern** — pick when a sidecar beats a library
35. **Ambassador pattern** — pick when an ambassador proxy is right
36. **Circuit breaker state transitions** — pick when it moves from half-open to open
37. **Bulkhead isolation** — pick where to place the bulkhead
38. **TCP vs UDP pick** — pick which transport fits the use case
39. **QUIC benefit** — pick where QUIC beats TCP
40. **TLS handshake cost** — pick the optimization that cuts handshake latency
41. **HTTP/2 multiplexing** — pick the benefit over HTTP/1.1
42. **HTTP/3 migration** — pick when HTTP/3 is worth it
43. **WebSocket vs SSE vs long polling** — pick the right duplex pattern
44. **gRPC streaming** — pick unary vs server vs client vs bidi
45. **Protobuf schema evolution** — pick the safe field addition
46. **Backpressure over the wire** — pick the mechanism that propagates the signal
47. **MTU / fragmentation** — pick the symptom of fragmentation issues
48. **TCP congestion control** — pick the algorithm that fits the network
49. **Bandwidth-delay product** — pick the window size for the link
50. **DNS TTL trade-off** — pick the TTL that balances freshness and cost
51. **Anycast routing** — pick when anycast simplifies topology
52. **BGP policy** — pick the route preference that fits
53. **NAT traversal** — pick STUN vs TURN vs ICE for the P2P case
54. **P2P overlay** — pick Chord vs Kademlia vs Pastry for the need
55. **Distributed cache consistency** — pick write-through vs write-behind vs invalidation
56. **Leases** — pick when leases replace heavy locks
57. **Fencing tokens** — pick the scenario where a fencing token prevents a split brain write
58. **Split-brain prevention** — pick the quorum rule that blocks it
59. **Gossip vs broadcast** — pick which scales for the topology
60. **Exactly-once delivery** — pick the mechanism that delivers it (or shows it's impossible)
61. **Event ordering guarantee** — pick per-key vs global ordering need
62. **Deduplication window** — pick the dedup window for the at-least-once source
63. **Partition-tolerant design** — pick what degrades under a netsplit
64. **Cross-DC replication lag** — pick the root cause of the drift
65. **Traceable header propagation** — pick the header that must be forwarded
66. **Shared-nothing trade-off** — pick the cost of shared-nothing architecture
67. **Coordination service** — pick ZooKeeper vs etcd vs Consul for the need
68. **Distributed lock design** — pick the design that handles process crash
69. **Replication factor pick** — pick RF that meets the durability need

---

## Bucket 15 — Security & Cryptography

1. **Symmetric vs asymmetric** — pick which primitive fits the scenario
2. **AES mode pick** — pick GCM vs CBC vs CTR for the use
3. **Nonce reuse risk** — pick what breaks when nonce is reused
4. **Key derivation function** — pick PBKDF2 vs bcrypt vs scrypt vs Argon2
5. **Salt vs pepper** — pick the correct use of each
6. **Rainbow table defense** — pick the protection that stops them
7. **Password storage** — pick the correct hash + work factor
8. **MFA factor pick** — pick the strongest practical second factor
9. **TOTP vs HOTP** — pick which matches the described device
10. **WebAuthn / passkey** — pick when passkeys replace passwords
11. **OAuth 2.0 flow** — pick authorization code vs implicit vs PKCE
12. **OpenID Connect use** — pick OIDC vs plain OAuth for the need
13. **JWT claim design** — pick the claim set for the API
14. **JWT expiration** — pick the exp window that balances UX and risk
15. **Refresh token rotation** — pick the rotation that prevents replay
16. **SAML vs OIDC** — pick the right SSO protocol
17. **CSRF defense** — pick SameSite cookie vs CSRF token for the app
18. **XSS defense** — pick output encoding vs CSP for the vector
19. **SQL injection prevention** — pick the safe query building approach
20. **SSRF defense** — pick the egress allowlist design
21. **IDOR risk** — pick the authorization check that's missing
22. **Path traversal** — pick the input that bypasses the naive filter
23. **Deserialization risk** — pick the safe deserialization pattern
24. **XML external entity (XXE)** — pick the parser setting that blocks XXE
25. **Command injection** — pick the shell-escape bug
26. **Open redirect** — pick the input that abuses the redirect param
27. **Rate limit bypass** — pick the attacker technique
28. **Brute-force mitigation** — pick the mitigation for credential stuffing
29. **Account enumeration** — pick the response that leaks existence
30. **Timing attack** — pick the comparison that leaks timing
31. **Side-channel mitigation** — pick constant-time compare vs padding vs blinding
32. **Certificate pinning** — pick when pinning is worth the risk
33. **Certificate rotation** — pick the rotation cadence that avoids outages
34. **Public Key Infrastructure** — pick the CA trust decision
35. **Code signing** — pick the signing policy for the release
36. **Supply chain attack vector** — pick the stage that was compromised
37. **Dependency confusion** — pick the defense against the attack
38. **Typosquat detection** — pick the policy that catches fake packages
39. **SBOM use** — pick when an SBOM makes audits faster
40. **Secret scanning** — pick the scanner placement in the pipeline
41. **Git history secret leak** — pick the correct remediation
42. **Vault policy design** — pick the least-privilege vault policy
43. **HSM use** — pick when an HSM is necessary
44. **Encryption at rest vs in transit** — pick which is missing
45. **Field-level encryption** — pick the scope for the sensitive field
46. **Tokenization use** — pick when tokenization beats encryption
47. **Envelope encryption flow** — pick the step missing from the flow
48. **TLS cipher suite** — pick the suite that meets the standard
49. **Forward secrecy** — pick the suite that provides PFS
50. **Heartbleed-class bug** — pick the indicator of memory-read bugs
51. **OWASP Top 10 map** — pick which OWASP category the described bug falls under
52. **CVE triage** — pick the right severity for the described issue
53. **Threat model method** — pick STRIDE vs PASTA vs LINDDUN for the system
54. **Attack surface mapping** — pick the asset that was missed
55. **Red team vs pentest** — pick which engagement fits the goal
56. **Blue team detection** — pick the log source that catches the technique
57. **MITRE ATT&CK tactic** — pick the tactic the described action belongs to
58. **SIEM alert tuning** — pick the rule change that reduces false positives
59. **Endpoint detection pick** — pick EDR vs antivirus vs XDR
60. **Network segmentation** — pick the segmentation boundary for the workload
61. **Zero-trust principle** — pick the zero-trust policy for the scenario
62. **Least-privilege audit** — pick the permission that should be revoked
63. **Data exfiltration detection** — pick the signal that catches the exfil
64. **Incident response step** — pick the next step in the IR playbook
65. **Crypto agility** — pick the design that survives an algorithm break
66. **Post-quantum migration** — pick when PQC is worth planning for
67. **HMAC vs plain hash** — pick when HMAC is required
68. **Digital signature** — pick the signature scheme for the size/security target
69. **Compliance mapping** — pick the control that satisfies the described requirement

---

## Bucket 16 — Privacy, Ethics & Responsible AI

1. **PII definition** — pick which field is PII under the described regulation
2. **PII minimization** — pick the collection change that reduces exposure
3. **Purpose limitation** — pick which new use crosses the consent boundary
4. **Consent design** — pick opt-in vs opt-out for the jurisdiction
5. **Right to access** — pick the workflow that fulfills a DSAR
6. **Right to erasure** — pick the deletion that meets the regulation
7. **Data portability** — pick the format that fits portability rules
8. **Cross-border transfer** — pick the legal basis for the EU→US transfer
9. **GDPR lawful basis** — pick the right lawful basis for the described processing
10. **CCPA vs GDPR difference** — pick the difference that matters here
11. **HIPAA PHI** — pick the field that qualifies as PHI
12. **Children's privacy (COPPA)** — pick the consent approach for under-13
13. **Biometric privacy** — pick the jurisdiction rule that applies
14. **Data retention policy** — pick the retention window for the data class
15. **De-identification** — pick k-anonymity vs l-diversity vs t-closeness
16. **Re-identification risk** — pick the field that breaks de-identification
17. **Differential privacy pick** — pick when DP is worth the utility loss
18. **DP epsilon pick** — pick the epsilon for the risk tolerance
19. **Federated learning fit** — pick when FL is worth the complexity
20. **Secure aggregation** — pick when secure aggregation is necessary
21. **Homomorphic encryption** — pick when HE is practical here
22. **Multi-party computation** — pick when MPC beats trusted party
23. **Data sharing agreement** — pick the clause missing from the DSA
24. **Third-party processor** — pick the contract term that's required
25. **Vendor risk** — pick the assessment step that's missing
26. **Bias audit method** — pick the audit for disparate impact
27. **Fairness metric** — pick demographic parity vs equalized odds vs calibration
28. **Protected attribute handling** — pick the right way to include/exclude it
29. **Proxy variable** — pick the feature that proxies a protected attribute
30. **Disparate impact check** — pick the threshold test that applies
31. **Model card element** — pick the missing element
32. **Datasheet for dataset** — pick the required provenance field
33. **Explainability requirement** — pick the regulation that requires it
34. **Human-in-the-loop** — pick when HITL is mandatory for the use case
35. **Dark pattern detection** — pick the UI element that's a dark pattern
36. **Informed consent** — pick the consent wording that fails informed-consent tests
37. **Age gating** — pick the age-gate design that actually works
38. **AI disclosure** — pick when AI involvement must be disclosed
39. **Deepfake policy** — pick the labeling requirement for synthetic media
40. **Hallucination harm** — pick the deployment where hallucination is unacceptable
41. **Safety evaluation** — pick the red-team test for the model
42. **Content moderation policy** — pick the policy change for the edge case
43. **Moderator wellbeing** — pick the practice that protects moderators
44. **Algorithmic transparency** — pick the transparency artifact required
45. **Impact assessment (DPIA/AIIA)** — pick when the assessment is required
46. **High-risk AI classification (EU AI Act)** — pick whether the use is high-risk
47. **Regulated deployment** — pick the regulator that governs the use
48. **Audit trail** — pick the audit event that must be logged
49. **Data sovereignty** — pick the hosting choice that meets the rule
50. **Minor data processing** — pick the restriction that applies
51. **Sensitive category** — pick which field is "sensitive personal data"
52. **Research ethics (IRB)** — pick the case that needs IRB review
53. **Responsible disclosure** — pick the timeline that fits the responsible disclosure norm
54. **Bounty program design** — pick the scope that encourages good-faith research
55. **Algorithmic accountability** — pick the right accountability framework
56. **Human rights framing** — pick the right framework for the deployment
57. **Environmental cost of AI** — pick the mitigation that really cuts footprint
58. **Dual-use risk** — pick the safeguard for the dual-use capability
59. **Open-source model risk** — pick the mitigation for the release
60. **Data provenance claim** — pick the provenance statement that holds up
61. **Synthetic data ethics** — pick the case where synthetic data causes harm
62. **Consent for training data** — pick the license that allows training use
63. **Copyright + training data** — pick the jurisdictional rule that applies
64. **Attribution requirement** — pick the license that mandates attribution
65. **User feedback loop fairness** — pick the bias introduced by the loop
66. **Post-deployment monitoring** — pick the monitoring that catches fairness regression
67. **Incident disclosure (AI)** — pick when the incident must be reported
68. **Ethics review board** — pick the case that warrants escalation
69. **Refusal-to-deploy** — pick when declining the deployment is the right call

---

## Bucket 17 — Testing & QA

1. **Test pyramid level** — pick unit vs integration vs E2E for the check
2. **Unit test boundary** — pick where the unit-under-test ends
3. **Integration vs contract test** — pick which fits the cross-service need
4. **E2E scope** — pick the smallest E2E that covers the risk
5. **Snapshot test use** — pick where snapshots help vs rot
6. **Golden file test** — pick the right comparison tolerance
7. **Property-based test** — pick the invariant to assert
8. **Fuzz target pick** — pick the fuzz entry point that finds the bug
9. **Mutation testing** — pick the mutation score that reveals a weak test
10. **Mock vs stub vs fake** — pick the test double for the seam
11. **Test data strategy** — pick fixtures vs factories vs builders
12. **Flaky test root cause** — pick the source of flakiness
13. **Retry on flaky** — pick when retry hides a real bug
14. **Deterministic test** — pick the change that makes the test reproducible
15. **Time-based test fix** — pick the fake clock approach
16. **Randomness in tests** — pick the seed policy
17. **Network in tests** — pick the mock layer that's the right fit
18. **DB in tests** — pick in-memory vs test-container vs shared DB
19. **Snapshot on UI** — pick the stable element to snapshot
20. **Visual regression test** — pick the tolerance for rendering diffs
21. **Accessibility test** — pick the automated check that catches the violation
22. **Contract test pick** — pick Pact vs Spring Cloud Contract for the stack
23. **Consumer-driven contract** — pick the contract owner
24. **Schema test** — pick the schema assertion that catches drift
25. **Regression test triage** — pick the test that should have caught it
26. **Bug reproduction** — pick the minimal repro for the filed bug
27. **Root cause vs symptom** — pick which the described fix addresses
28. **Five whys** — pick the deepest "why" in the chain
29. **Fishbone category** — pick the category that captures the cause
30. **Severity vs priority** — pick the right classification for the bug
31. **Regression test placement** — pick the level at which to add the regression
32. **Smoke test** — pick the smoke test for the deploy pipeline
33. **Sanity test** — pick the fast check before the full run
34. **Exploratory test charter** — pick the charter for the risky feature
35. **Pairwise testing** — pick the input combination to cover
36. **Equivalence class** — pick the class representative for the test
37. **Boundary value test** — pick the boundary to probe
38. **Decision table design** — pick the row that's missing
39. **State transition test** — pick the transition that's not covered
40. **Use case test** — pick the alternate flow that should be tested
41. **Negative test design** — pick the negative case that's high-value
42. **Performance test type** — pick load vs stress vs soak vs spike
43. **Load test baseline** — pick the baseline that catches regressions
44. **Capacity test target** — pick the metric to push until it breaks
45. **Chaos test target** — pick where to inject latency
46. **Gameday scenario** — pick the scenario that exercises runbooks
47. **Test environment parity** — pick the environment gap to close
48. **Data privacy in tests** — pick the mask that keeps realism
49. **Shift-left practice** — pick the test moved earlier
50. **Static analysis rule** — pick the rule to enable
51. **Linter false positive** — pick the correct way to suppress
52. **Code coverage interpretation** — pick what 80% actually means
53. **Coverage gap** — pick the branch that's uncovered
54. **Regression budget** — pick the right test-time budget for the pipeline
55. **Test parallelization** — pick the split that avoids flakiness
56. **Test tagging strategy** — pick the tag scheme that supports fast feedback
57. **Release gate test** — pick the test that must pass before deploy
58. **Hotfix test coverage** — pick the minimal test to ship with a hotfix
59. **Test report audience** — pick the report format for the audience
60. **Bug bash design** — pick the scope for the bug bash
61. **User acceptance test** — pick the UAT scenario that covers the risk
62. **Canary analysis** — pick the metric that triggers rollback
63. **Synthetic monitoring** — pick the synthetic user journey
64. **Real user monitoring** — pick the RUM metric that matters
65. **A11y automated vs manual** — pick which level catches the described issue
66. **Localization test** — pick the locale edge case
67. **Test data generator** — pick the generator for the shape
68. **Test case prioritization** — pick the prioritization for the tight window
69. **Exit criteria** — pick the criterion that signals "done testing"

---

## Bucket 18 — DevOps & CI/CD

1. **Pipeline stage order** — pick the correct ordering of stages
2. **Fail-fast placement** — pick where fail-fast saves the most time
3. **Linter in pipeline** — pick the stage where the linter belongs
4. **Unit tests in pipeline** — pick how to parallelize for speed
5. **Build artifact hygiene** — pick the artifact retention policy
6. **Reproducible build** — pick the change that makes it reproducible
7. **Hermetic build** — pick what breaks hermeticity
8. **Build cache strategy** — pick the cache key that maximizes hits
9. **Monorepo build graph** — pick which packages must rebuild
10. **Selective test runs** — pick the test selection for the changed files
11. **Merge queue use** — pick when a merge queue prevents flaky main
12. **Branching strategy** — pick trunk-based vs GitFlow for the team
13. **Feature branch lifetime** — pick the max lifetime that keeps merges small
14. **PR size hygiene** — pick the right size per PR
15. **Review automation** — pick the automation that saves reviewer time
16. **Required status check** — pick the checks that block merge
17. **Signed commits** — pick when signing is worth enforcing
18. **Conventional commits** — pick the commit message that fits
19. **Semantic versioning** — pick the right version bump for the change
20. **Changelog generation** — pick the tool for the workflow
21. **Release automation** — pick the trigger for the release
22. **Tag strategy** — pick the tagging convention
23. **Hotfix process** — pick the hotfix branching model
24. **Rollback trigger** — pick the signal that triggers auto-rollback
25. **Deploy strategy pick** — pick blue/green vs canary vs rolling
26. **Canary cohort** — pick the right canary audience
27. **Progressive delivery** — pick the tool for the feature flag rollout
28. **Dark launch** — pick when dark launching fits
29. **Shadow traffic** — pick when shadowing beats canary
30. **Release window** — pick the right window for the change risk
31. **Change freeze rules** — pick the change that violates the freeze
32. **Environment promotion** — pick the promotion criteria
33. **Configuration drift detection** — pick the tool for the drift alert
34. **Secrets in pipelines** — pick the safe secret injection
35. **Ephemeral environment** — pick when an ephemeral env is worth it
36. **Infra drift repair** — pick the safer repair path
37. **Runner scaling** — pick the runner scale policy
38. **Self-hosted vs managed runner** — pick which fits the security need
39. **Matrix build trade-off** — pick the matrix that avoids combinatorial blow-up
40. **Flaky step quarantine** — pick the quarantine criterion
41. **Pipeline observability** — pick the metric to alert on
42. **DORA metrics** — pick which DORA metric matches the concern
43. **Lead time improvement** — pick the change that moves lead time
44. **Change failure rate** — pick the root cause of the elevated CFR
45. **MTTR improvement** — pick the change that lowers MTTR
46. **Deployment frequency** — pick the bottleneck to frequency
47. **Rollback vs roll-forward** — pick which fits the situation
48. **Release checklist item** — pick the item that shouldn't be automated away
49. **Deploy approval workflow** — pick the approver set
50. **Database migration gate** — pick the gate that prevents bad migrations
51. **Schema migration tool** — pick Flyway vs Liquibase vs Alembic
52. **Migration backout** — pick the rollback-safe migration style
53. **Artifact promotion** — pick binary vs source promotion
54. **Build-once deploy-many** — pick the violation of this principle
55. **Pipeline secrets rotation** — pick the rotation cadence
56. **Golden image workflow** — pick the image rebuild trigger
57. **Supply chain attestation** — pick SLSA level 2 vs 3 evidence
58. **Container signing** — pick where signing happens in the pipeline
59. **Admission controller** — pick the policy that enforces signing
60. **Policy-as-code** — pick OPA vs Kyverno vs Sentinel
61. **Compliance check in pipeline** — pick the control to automate
62. **Audit log for deploys** — pick the log to retain
63. **On-call handoff** — pick the handoff doc item missing
64. **Runbook automation** — pick the runbook step to automate
65. **Incident to postmortem** — pick the postmortem action item for the cause
66. **Blameless culture** — pick the phrasing that preserves blameless tone
67. **SRE toil measurement** — pick the metric for toil
68. **Error budget burn alert** — pick the right alert window
69. **Release notes audience** — pick the section for non-engineering readers

---

## Bucket 19 — Observability & Monitoring

1. **Signal type pick** — pick logs vs metrics vs traces vs profiles
2. **Metric type** — pick counter vs gauge vs histogram vs summary
3. **Histogram bucket design** — pick the buckets that capture the tail
4. **Cardinality explosion** — pick the label causing the cardinality blow-up
5. **Label hygiene** — pick the label that shouldn't be a label
6. **Metric naming** — pick the name that follows the convention
7. **Rate vs count** — pick which the query should use
8. **Percentile vs average** — pick which reveals the problem
9. **Tail latency focus** — pick p95 vs p99 vs p99.9 for the SLO
10. **Heatmap read** — pick the conclusion from the latency heatmap
11. **Alert design — SLO burn** — pick the right burn-rate alert
12. **Alert design — threshold** — pick the threshold that avoids false alerts
13. **Alert fatigue cause** — pick the change that would reduce fatigue
14. **Alert routing** — pick the right routing rule
15. **Alert severity mapping** — pick sev-1 vs sev-2 vs sev-3
16. **Pager policy** — pick the policy for off-hours alerts
17. **Dashboard design** — pick the top-of-dashboard metric
18. **Golden signals** — pick the missing golden signal
19. **USE method** — pick the utilization/saturation/error signal for the resource
20. **RED method** — pick the request-rate/error/duration for the service
21. **Black-box vs white-box** — pick which monitor catches the failure
22. **Synthetic monitor** — pick the synthetic probe for the flow
23. **Real user monitor** — pick the RUM signal that matters
24. **Tracing granularity** — pick the right span boundary
25. **Span vs log correlation** — pick the linking field
26. **Trace sampling** — pick head vs tail sampling for the need
27. **Sampling rate** — pick the rate that balances cost and fidelity
28. **Context propagation** — pick the header that must be forwarded
29. **Distributed trace gap** — pick the service that isn't instrumented
30. **Log level usage** — pick debug vs info vs warn vs error
31. **Structured logging** — pick the field layout for searchability
32. **Log redaction** — pick the field to redact
33. **Log retention policy** — pick the retention for the compliance need
34. **Log aggregation stack** — pick ELK vs Loki vs CloudWatch for the need
35. **Log sampling** — pick when log sampling is safe
36. **Metrics storage** — pick Prometheus vs VictoriaMetrics vs Mimir for scale
37. **Long-term metrics** — pick the downsampling strategy
38. **Exemplar use** — pick when exemplars help you jump to a trace
39. **Profiling trigger** — pick the event that should trigger a profile
40. **Continuous profiling value** — pick the insight only continuous profiling gives
41. **Flame graph read** — pick the hot function to optimize first
42. **Error budget calculation** — pick the formula for the SLO
43. **SLI definition** — pick the SLI that matches the user promise
44. **SLO target setting** — pick the SLO for the user expectation
45. **Composite SLO** — pick when composite SLOs are necessary
46. **Multi-window burn** — pick the short + long window pair
47. **Anomaly detection on metrics** — pick the detector for the signal type
48. **Seasonality handling** — pick the model that captures weekday/weekend
49. **Forecast-based alert** — pick when forecast-driven beats static
50. **Drift detection in metrics** — pick the test for distribution shift
51. **Runbook for alert** — pick the runbook that matches the alert
52. **Dashboard rot** — pick the sign the dashboard is rotted
53. **Observability as a product** — pick the customer of the observability platform
54. **Telemetry cost control** — pick the lever that cuts cost
55. **OpenTelemetry use** — pick where OTel replaces vendor SDK
56. **Collector placement** — pick agent vs sidecar vs gateway
57. **Tail latency debugging** — pick the investigation path
58. **Noisy neighbor diagnosis** — pick the signal that identifies the neighbor
59. **Capacity planning signal** — pick the metric that predicts saturation
60. **Incident timeline reconstruction** — pick the data source for the timeline
61. **Root-cause correlation** — pick the tool that correlates the signals
62. **DB slow query log** — pick the row that should have been indexed
63. **GC log interpretation** — pick the GC pattern causing the pause
64. **Container OOM diagnosis** — pick the container that needs the memory limit bump
65. **Network dashboard gap** — pick the missing network metric
66. **Security event pipeline** — pick where the security event should land
67. **SRE review cadence** — pick the right frequency
68. **Blameless incident review** — pick the phrasing to avoid
69. **Error grouping** — pick the key that deduplicates errors correctly

---

## Bucket 20 — Performance & Optimization

1. **Premature optimization** — pick which change is premature
2. **Benchmark design** — pick the microbenchmark pitfall
3. **Profiling tool pick** — pick CPU vs memory vs I/O profiler
4. **Flame graph hotspot** — pick the true hotspot (not the misleading one)
5. **CPU-bound vs IO-bound** — pick which the symptoms indicate
6. **Amdahl's law** — pick the max speedup given the parallelizable fraction
7. **Little's law** — pick the queue length given arrival rate and service time
8. **Throughput vs latency** — pick which the change improves
9. **Tail latency fix** — pick the change that cuts the p99
10. **Batch size tuning** — pick the batch size that minimizes total time
11. **Buffer size tuning** — pick the buffer that avoids spills
12. **Cache line alignment** — pick the layout that avoids false sharing
13. **False sharing diagnosis** — pick the symptom of false sharing
14. **Cache locality** — pick the access pattern that's cache-friendly
15. **Prefetching** — pick where prefetching pays off
16. **Branch predictor hint** — pick the condition shape that's predictable
17. **Vectorization (SIMD) pick** — pick the loop that's vectorizable
18. **Loop unrolling trade-off** — pick where unrolling helps vs hurts
19. **Memoization** — pick the function worth memoizing
20. **Inlining decision** — pick when inlining reduces overhead
21. **Lazy initialization** — pick where lazy init saves startup time
22. **Pooling vs allocation** — pick when object pooling is worth it
23. **GC tuning** — pick the GC parameter for the workload
24. **Heap sizing** — pick the heap size that fits the working set
25. **Off-heap storage** — pick when off-heap beats heap
26. **Concurrency level tuning** — pick the pool size for the CPU count
27. **Thread pool vs fiber** — pick which fits the workload
28. **Async vs sync IO** — pick which wins for the access pattern
29. **Epoll vs kqueue vs IOCP** — pick the right IO multiplexer
30. **Network call batching** — pick where batching cuts RTT cost
31. **Compression on the wire** — pick when to compress
32. **Serialization format** — pick JSON vs protobuf vs flatbuffers for the need
33. **Connection pooling tuning** — pick the pool size for the DB
34. **N+1 query fix** — pick the batched query replacement
35. **Bulk insert vs single** — pick which fits the write burst
36. **Read path caching** — pick where the cache belongs on the path
37. **Write path batching** — pick where batching doesn't violate durability
38. **CDN hit ratio** — pick the origin change that lifts hit ratio
39. **Image format pick** — pick WebP vs AVIF vs JPEG for the target
40. **Image sizing** — pick the responsive image strategy
41. **Font loading** — pick the font-display value
42. **Critical CSS** — pick what belongs in critical CSS
43. **Lazy loading** — pick what to lazy-load for biggest gain
44. **Prefetch vs preload** — pick which hint fits
45. **Bundle splitting** — pick the split that improves first paint
46. **Tree-shaking miss** — pick the import that breaks tree-shaking
47. **Code-split boundary** — pick the route boundary for splitting
48. **DNS prefetch** — pick where DNS prefetch helps
49. **HTTP caching header** — pick the cache-control for the asset
50. **Service worker cache** — pick the cache strategy for the route
51. **JIT warmup** — pick the warmup trick for JIT'd code
52. **Startup cost reduction** — pick the change that cuts cold start
53. **Memory footprint diet** — pick the change that cuts RSS
54. **Memory leak diagnosis** — pick the cause of the growing RSS
55. **Profiler flame gap** — pick the function missing from the flame
56. **Lock contention fix** — pick the change that cuts contention
57. **Lock-free alternative** — pick when lock-free is worth the complexity
58. **Work stealing scheduler** — pick when work stealing helps
59. **Pipeline parallelism** — pick where the pipeline stall is
60. **Data locality NUMA** — pick the affinity that fixes the NUMA penalty
61. **Disk IO pattern** — pick sequential vs random for the workload
62. **Write-combining buffer** — pick where write combining helps
63. **Zero-copy transfer** — pick where zero-copy is applicable
64. **TCP tuning** — pick the sysctl for the link profile
65. **Cold cache vs warm cache** — pick which measurement tells the truth
66. **Rate of change metric** — pick which rate to track for regressions
67. **Perf budget** — pick the budget that matches the user need
68. **A/B perf experiment** — pick the correct metric to compare
69. **When to stop optimizing** — pick the "good enough" stopping rule

---

## Bucket 21 — Frontend & Web

1. **Framework pick** — pick React vs Vue vs Svelte vs Solid for the need
2. **SSR vs SSG vs CSR** — pick the rendering strategy for the page
3. **Hydration pitfall** — pick the symptom of hydration mismatch
4. **Partial hydration** — pick when islands beat full hydration
5. **RSC use case** — pick where React Server Components win
6. **State management pick** — pick local state vs context vs store
7. **Redux vs Zustand vs Jotai** — pick the store for the app size
8. **Data fetching pick** — pick SWR vs React Query vs Apollo
9. **Optimistic update** — pick where optimistic updates fit
10. **Cache invalidation (client)** — pick the invalidation that stays correct
11. **Route data loader** — pick loader vs hook for the fetch
12. **Error boundary placement** — pick where the error boundary belongs
13. **Suspense boundary** — pick where Suspense improves UX
14. **Code splitting at route** — pick the split boundary
15. **Lazy component** — pick the component that's worth lazy-loading
16. **Bundle analyzer use** — pick the import to investigate first
17. **Dependency audit** — pick the dependency to drop
18. **Polyfill pick** — pick the polyfill for the browser target
19. **Browser compat table** — pick the feature that needs a fallback
20. **Progressive enhancement** — pick the baseline that works without JS
21. **Accessibility landmark** — pick the missing landmark
22. **Form validation UX** — pick inline vs submit-time validation
23. **Controlled vs uncontrolled** — pick which fits the form
24. **Debounce vs throttle** — pick which fits the event
25. **Event delegation** — pick where delegation saves listeners
26. **CSS-in-JS trade-off** — pick when CSS-in-JS hurts performance
27. **Tailwind vs CSS modules** — pick for the team size
28. **CSS specificity bug** — pick the cause of the override failure
29. **z-index stacking** — pick the fix for the z-index trap
30. **Flexbox vs grid** — pick which fits the layout
31. **Responsive breakpoint** — pick the breakpoint scheme
32. **Container query use** — pick where container queries beat media queries
33. **Sticky positioning trap** — pick what breaks sticky
34. **Viewport meta** — pick the viewport that fits the app
35. **Clickable area target** — pick the touch target size
36. **Dark mode pick** — pick the implementation strategy
37. **Color contrast** — pick the pair that fails WCAG
38. **Focus ring design** — pick the focus style that's accessible
39. **Skeleton loader** — pick where skeletons beat spinners
40. **Animation pick** — pick CSS vs JS vs library for the effect
41. **Animation perf** — pick the property that triggers layout
42. **Transform vs position** — pick which is GPU-accelerated
43. **Rendering bottleneck** — pick what's causing paint jank
44. **Core Web Vitals** — pick the metric the change improves
45. **LCP improvement** — pick the change that lowers LCP
46. **CLS fix** — pick the change that stops layout shift
47. **INP optimization** — pick the change that improves INP
48. **Font loading strategy** — pick swap vs optional vs block
49. **Image optimization** — pick the image strategy for hero
50. **Intersection observer use** — pick the use case that fits
51. **Service worker caching** — pick the right caching strategy
52. **PWA installability** — pick the missing manifest field
53. **Offline-first design** — pick the right sync pattern
54. **Web worker use** — pick the work that belongs in a worker
55. **SharedArrayBuffer** — pick when you need cross-origin isolation
56. **WebAssembly pick** — pick when Wasm beats JS
57. **Client-side routing** — pick history vs hash routing
58. **URL design** — pick the path structure that matches REST
59. **Canonical URL** — pick the canonical for the duplicate set
60. **SEO meta tags** — pick the tag set for the page
61. **Structured data** — pick the schema.org type
62. **Open Graph tags** — pick the tags for the share card
63. **i18n strategy** — pick ICU vs gettext vs JSON for the team
64. **RTL support** — pick the CSS logical property
65. **Client-side error tracking** — pick the SDK placement
66. **Feature flag client usage** — pick the hook placement
67. **A/B test client wiring** — pick the right bucketing point
68. **Session replay privacy** — pick the masking rule
69. **Browser storage pick** — pick localStorage vs sessionStorage vs IndexedDB

---

## Bucket 22 — Mobile Development

1. **Native vs cross-platform** — pick the approach for the feature set
2. **React Native vs Flutter** — pick for the team + UX need
3. **Swift UI vs UIKit** — pick for the app generation
4. **Jetpack Compose vs Views** — pick for the Android target
5. **Expo vs bare RN** — pick for the release pipeline need
6. **Capacitor vs Cordova** — pick for the hybrid app
7. **App size budget** — pick the lever that cuts install size
8. **Cold start budget** — pick the change that trims cold start
9. **Memory pressure** — pick the change for low-memory devices
10. **Battery drain cause** — pick the root cause of the drain
11. **Background task strategy** — pick foreground vs background vs JobScheduler
12. **Push notification** — pick APNS vs FCM pipeline choice
13. **Silent push use** — pick when silent push is justified
14. **Offline-first sync** — pick the conflict resolution rule
15. **SQLite vs Realm vs Room** — pick the local DB
16. **Secure storage** — pick keychain vs keystore vs file
17. **Deep link design** — pick universal vs custom scheme
18. **App Link verification** — pick the setup that avoids chooser
19. **Navigation architecture** — pick stack vs tab vs drawer
20. **State restoration** — pick the persistence strategy
21. **Activity / view lifecycle** — pick the lifecycle hook for the cleanup
22. **View recycling** — pick the correct recycler setup
23. **Image loading lib** — pick the right lib + config
24. **Image memory cache** — pick the cache size
25. **Video playback pick** — pick ExoPlayer vs AVPlayer wrapper
26. **Camera pipeline** — pick the right abstraction layer
27. **Permission request timing** — pick when to request the permission
28. **Permission denial handling** — pick the UX when denied
29. **Biometric auth** — pick the right API for the platform
30. **Secure enclave use** — pick when to store the key there
31. **Crash reporting** — pick the SDK + symbolication flow
32. **Analytics event naming** — pick the event schema for the product
33. **A/B testing on mobile** — pick the right bucketing for the version
34. **Feature flag delivery** — pick fetch cadence + fallback
35. **Over-the-air updates** — pick when OTA is safe
36. **CodePush / Expo updates** — pick the update policy
37. **App store review risk** — pick the change that triggers rejection
38. **Privacy manifest** — pick the declared API
39. **ATT prompt timing** — pick the right timing for the prompt
40. **Scoped storage** — pick the correct file access API
41. **Background sync rules** — pick the platform's constraints
42. **WorkManager use** — pick the right worker type
43. **Notification channel** — pick the channel for the priority
44. **Do Not Disturb behavior** — pick the category that bypasses DND
45. **Dark mode support** — pick the dynamic color strategy
46. **Dynamic type** — pick the text style for the scale
47. **Accessibility labels** — pick the label for the icon button
48. **Screen reader order** — pick the order fix
49. **Focus order** — pick the focus order correction
50. **Animation perf** — pick the animation API that's GPU-accelerated
51. **Gesture handling** — pick the gesture recognizer combo
52. **Haptic feedback** — pick the haptic for the interaction
53. **In-app purchase** — pick the correct product type
54. **Subscription management** — pick the entitlement source of truth
55. **Restore purchases flow** — pick the right button placement
56. **Offline ad serving** — pick the cache policy
57. **Network condition detection** — pick the API for connectivity
58. **Bandwidth-aware video** — pick the ABR strategy
59. **Localization catalog** — pick the file format + loading
60. **String interpolation for l10n** — pick the plural rule handling
61. **Right-to-left layout** — pick the layout property for RTL
62. **Font scaling for large text** — pick the layout that doesn't truncate
63. **Multi-window / split-screen** — pick the layout adaptation
64. **Foldable device** — pick the layout that respects the hinge
65. **Tablet adaptation** — pick the layout pattern
66. **Universal link routing** — pick the route for the URL
67. **Deep link analytics** — pick the attribution source
68. **App size monitoring** — pick the CI check for size regression
69. **Release train cadence** — pick the cadence for the team

---

## Bucket 23 — UI/UX Design

1. **User goal framing** — pick the goal statement the task is really about
2. **Information architecture** — pick the grouping that reduces cognitive load
3. **Card sort result** — pick the grouping the data supports
4. **Tree test outcome** — pick the label change that lifts findability
5. **Affordance pick** — pick the control that signals its action
6. **Signifier correction** — pick the signifier that clarifies the control
7. **Mental model mismatch** — pick the UI that conflicts with user expectation
8. **Fitts's law application** — pick the layout with the right target size and distance
9. **Hick's law application** — pick the choice-set size for the task
10. **Miller's number** — pick the grouping that respects short-term memory
11. **Gestalt principle** — pick proximity vs similarity vs closure for the layout
12. **Visual hierarchy fix** — pick the change that lifts the primary action
13. **Primary action identification** — pick which button is the primary
14. **Secondary action styling** — pick the styling that subordinates it
15. **Destructive action safety** — pick the confirmation pattern
16. **Undo vs confirm** — pick which pattern fits the risk
17. **Empty state design** — pick the empty-state copy and CTA
18. **Error state UX** — pick the error message that tells the user what to do
19. **Loading state UX** — pick spinner vs skeleton vs progressive
20. **Microcopy fix** — pick the copy that reduces confusion
21. **Onboarding pattern** — pick tooltip tour vs progressive disclosure
22. **First-run experience** — pick the first-run flow for the persona
23. **Progressive disclosure** — pick what to hide behind "show more"
24. **Form field grouping** — pick the group that matches mental chunks
25. **Form field order** — pick the order that respects task flow
26. **Label placement** — pick top vs inline vs floating
27. **Required field marker** — pick the marker convention
28. **Inline validation timing** — pick when to validate
29. **Error recovery path** — pick the design that helps the user recover
30. **Confirmation dialog necessity** — pick when confirmation is warranted
31. **Modal vs inline edit** — pick which fits the task
32. **Drawer vs sheet vs modal** — pick the pattern for the context
33. **Nav pattern pick** — pick tab bar vs drawer vs rail
34. **Breadcrumb use** — pick where breadcrumbs help
35. **Search vs browse** — pick the primary entry for the content set
36. **Filter design** — pick facet vs filter bar vs sidebar
37. **Sorting affordance** — pick the sort control
38. **Pagination vs infinite scroll** — pick which fits the content
39. **Table density** — pick compact vs comfortable vs default
40. **Table action column** — pick where actions go
41. **Data viz pick** — pick the chart for the comparison
42. **Chart title / axis** — pick the label that reads clearly
43. **Color blindness check** — pick the palette that survives deuteranopia
44. **Color contrast pick** — pick the pair that passes WCAG AA
45. **Typography hierarchy** — pick the scale for the content type
46. **Line length for readability** — pick the max line length
47. **Responsive text scaling** — pick the scaling strategy
48. **Icon meaning clarity** — pick the icon that needs a label
49. **Tooltips vs inline help** — pick which fits the context
50. **Empty-data chart state** — pick the placeholder for empty data
51. **Drag-and-drop affordance** — pick the hover state
52. **Undo snack toast** — pick the undo window duration
53. **Notification pattern** — pick snack vs banner vs toast
54. **Consent UX** — pick the pattern that gets informed consent
55. **Cookie banner pattern** — pick the banner that respects regulations
56. **Password reset UX** — pick the flow that's secure and humane
57. **Account deletion flow** — pick the flow that's clear
58. **Profile settings grouping** — pick the grouping that's scannable
59. **Account switcher pattern** — pick the right pattern for multi-account
60. **Permission request screen** — pick the copy that explains value
61. **Paywall pattern** — pick the pattern that respects trust
62. **Subscription upgrade flow** — pick the path that reduces churn
63. **Cancellation UX** — pick the flow that isn't a dark pattern
64. **Feedback capture** — pick the right moment to ask
65. **Rating prompt timing** — pick the rating prompt time
66. **Onboarding checklist** — pick the checklist item that drives activation
67. **Zero-to-one illustration** — pick the illustration that helps comprehension
68. **Error illustration tone** — pick the tone for the error
69. **Motion principle** — pick the motion curve that feels natural

---

## Bucket 24 — Visual Design & Branding

1. **Brand attribute mapping** — pick the visual that expresses the brand attribute
2. **Mood board read** — pick the dominant mood from the board
3. **Logo mark pick** — pick wordmark vs lettermark vs combination
4. **Logo simplicity test** — pick which mark survives size reduction
5. **Logo scalability** — pick the version for the smallest use
6. **Lockup variants** — pick the lockup for the context
7. **Monogram legibility** — pick the monogram that reads clearly at small size
8. **Color palette strategy** — pick monochromatic vs analogous vs complementary
9. **Primary color selection** — pick the primary for the brand attribute
10. **Accent color pick** — pick the accent that complements the primary
11. **Neutral palette** — pick the neutrals for the brand tone
12. **Dark theme adaptation** — pick the color mapping for dark mode
13. **Color meaning cross-culture** — pick the color that translates well
14. **Typography pairing** — pick the serif + sans pair that works
15. **Type classification** — pick the classification of the given typeface
16. **Type weight hierarchy** — pick the weight set for the hierarchy
17. **Variable font use** — pick where variable fonts help
18. **Line-height pick** — pick the leading for the text size
19. **Kerning issue** — pick the pair that needs manual kerning
20. **Tracking adjustment** — pick the tracking for the use
21. **Display vs text face** — pick which the size calls for
22. **Font licensing** — pick the license for the intended use
23. **Grid system pick** — pick 8-col vs 12-col vs modular
24. **Baseline grid** — pick when baseline grids matter
25. **Layout rhythm** — pick the vertical rhythm that holds the page together
26. **White space role** — pick where white space carries meaning
27. **Rule of thirds application** — pick the composition that uses it
28. **Golden ratio use** — pick where the ratio is present
29. **Image crop decision** — pick the crop that preserves the subject
30. **Image treatment style** — pick the treatment for the brand
31. **Illustration style pick** — pick flat vs isometric vs line for the brand
32. **Icon set consistency** — pick the icon that doesn't fit
33. **Icon stroke weight** — pick the weight that matches the type
34. **Photo direction** — pick the photo direction for the campaign
35. **Photo retouching ethics** — pick the retouching that's acceptable
36. **Brand photography system** — pick the composition rule that unifies the set
37. **Motion language** — pick the motion curve that matches the brand tone
38. **Sound branding** — pick the sonic motif for the brand attribute
39. **Voice & tone word** — pick the tone word for the audience
40. **Tagline style** — pick the tagline that matches the positioning
41. **Brand architecture** — pick branded house vs house of brands for the portfolio
42. **Sub-brand treatment** — pick the sub-brand design that respects the parent
43. **Co-branding layout** — pick the co-brand lockup for equity
44. **Brand guideline section** — pick the section that prevents misuse
45. **Legal use of mark** — pick the trademark usage that's correct
46. **Wordmark kerning** — pick the wordmark kerning fix
47. **Logo on photo** — pick the placement that keeps the logo legible
48. **Clear space rule** — pick the clear space for the mark
49. **Minimum size rule** — pick the minimum print size
50. **Print vs digital color** — pick CMYK vs RGB vs Pantone handling
51. **Print stock pick** — pick the stock for the deliverable
52. **Finish choice** — pick matte vs gloss vs soft-touch
53. **Accessibility in branding** — pick the contrast that meets brand + a11y
54. **Brand voice for error** — pick the error copy that stays on-brand
55. **Brand voice for success** — pick the success message that stays on-brand
56. **Content design for onboarding** — pick the onboarding copy that's on-brand
57. **Social tile template** — pick the template that maintains recognition
58. **Ad campaign system** — pick the campaign structure that scales
59. **Key visual refresh** — pick the refresh scope that preserves equity
60. **Rebrand trigger** — pick the reason a rebrand is justified
61. **Brand extension risk** — pick the extension that dilutes equity
62. **Brand audit finding** — pick the inconsistency that matters most
63. **Visual identity system token** — pick the design token to expose
64. **Design token naming** — pick the naming that scales across themes
65. **Theme switcher mapping** — pick the token mapping for the alternate theme
66. **Merchandise application** — pick the merch that carries the brand well
67. **Wayfinding signage** — pick the signage design for the space
68. **Exhibition booth** — pick the booth layout that represents the brand
69. **Brand storytelling medium** — pick the medium that fits the audience

---

## Bucket 25 — API Design (REST, GraphQL, gRPC)

1. **Resource identification** — pick the URL that expresses the resource
2. **Nesting depth** — pick the nesting level that stays clear
3. **Path parameter vs query** — pick which belongs where
4. **HTTP verb pick** — pick GET vs POST vs PUT vs PATCH vs DELETE
5. **Idempotent vs safe** — pick which verbs must be which
6. **Status code pick** — pick 200 vs 201 vs 202 vs 204 vs 207
7. **4xx vs 5xx** — pick the right class for the error
8. **409 vs 422** — pick the conflict vs validation code
9. **404 vs 403** — pick whether to hide existence
10. **Error response schema** — pick the schema that standardizes errors
11. **Problem+JSON use** — pick when RFC 7807 fits
12. **Pagination design** — pick offset vs cursor vs keyset
13. **Filter parameter design** — pick the filter DSL for the need
14. **Sort parameter design** — pick the sort syntax
15. **Sparse fieldsets** — pick the fields parameter shape
16. **Expansion / embedding** — pick when to embed vs link
17. **Hypermedia (HATEOAS) use** — pick when HATEOAS is worth it
18. **API versioning** — pick URL vs header vs content negotiation
19. **Deprecation policy** — pick the deprecation notice timing
20. **Breaking vs non-breaking** — pick which the change is
21. **Backwards-compatible field change** — pick the safe change
22. **Enum extension** — pick the safe way to add an enum value
23. **Rate limit response** — pick the headers that belong in 429
24. **Authentication header** — pick bearer vs basic vs custom
25. **API key lifecycle** — pick the key rotation approach
26. **OAuth scope design** — pick the scope granularity
27. **Token audience** — pick the correct audience claim
28. **CORS policy** — pick the origin allowlist
29. **Preflight handling** — pick when preflight triggers
30. **Content negotiation** — pick the Accept header handling
31. **Media type design** — pick the media type for the representation
32. **Multipart upload** — pick multipart vs base64 vs signed URL
33. **Streaming response** — pick chunked vs SSE vs WebSocket
34. **Long-running task pattern** — pick polling vs webhook vs job resource
35. **Webhook design** — pick the signing approach
36. **Webhook retries** — pick the retry schedule
37. **Webhook idempotency** — pick the idempotency key strategy
38. **GraphQL schema shape** — pick the type that captures the domain
39. **GraphQL over-fetching fix** — pick the client fix
40. **GraphQL N+1 fix** — pick the DataLoader pattern
41. **Relay cursor connection** — pick the connection schema
42. **Mutation design** — pick the input shape
43. **Subscription design** — pick the event shape
44. **Persisted queries** — pick when persisted queries are worth it
45. **Apollo / Relay pick** — pick the client for the need
46. **Federation use** — pick when federation beats monolith schema
47. **Schema stitching vs federation** — pick the approach for the stack
48. **gRPC service design** — pick the RPC style (unary vs stream)
49. **Protobuf field numbering** — pick the rule that keeps wire compat
50. **Reserved field use** — pick where reserved prevents breakage
51. **Protobuf oneof use** — pick when oneof is right
52. **Protobuf well-known types** — pick the WKT for the field
53. **Protobuf evolution** — pick the change that's safe
54. **gRPC status code** — pick the status for the error
55. **gRPC metadata use** — pick what belongs in metadata
56. **gRPC load balancing** — pick client-side vs proxy LB
57. **gRPC interceptor use** — pick where cross-cutting concerns go
58. **REST vs gRPC pick** — pick for the internal vs external use
59. **REST vs GraphQL pick** — pick for the client diversity
60. **Bulk operation design** — pick the bulk endpoint shape
61. **Transactional API pattern** — pick the multi-resource transaction design
62. **Search endpoint design** — pick POST vs GET for complex search
63. **Batch vs streaming API** — pick which fits the data volume
64. **OpenAPI spec field** — pick the missing field
65. **API mock server** — pick the mock strategy
66. **Contract-first vs code-first** — pick for the team
67. **SDK generation** — pick the generator for the stack
68. **Developer experience (DX)** — pick the DX fix that wins adoption
69. **API changelog communication** — pick the channel for the breaking change

---

## Bucket 26 — Accessibility (a11y)

1. **WCAG level pick** — pick A vs AA vs AAA for the commitment
2. **Success criterion match** — pick which SC the described issue violates
3. **Color contrast minimum** — pick the ratio for normal text
4. **Large text threshold** — pick the ratio for large text
5. **Non-text contrast** — pick the ratio for UI components
6. **Text spacing support** — pick the CSS that supports text spacing
7. **Reflow requirement** — pick the layout that passes reflow
8. **Keyboard-only path** — pick the flow that fails keyboard-only
9. **Focus indicator** — pick the visible focus style
10. **Focus trap in dialog** — pick the correct trap behavior
11. **Focus return on close** — pick the correct return target
12. **Skip link use** — pick the skip link placement
13. **Landmark regions** — pick the landmark for the page area
14. **Heading hierarchy** — pick the correct heading level
15. **Section heading required** — pick where a heading is missing
16. **Alt text quality** — pick the alt that conveys function
17. **Decorative image handling** — pick the correct alt for decorative
18. **SVG accessibility** — pick the SVG title/desc pattern
19. **Icon-only button** — pick the accessible name source
20. **Aria-label vs aria-labelledby** — pick which fits
21. **Aria-describedby use** — pick when to use it
22. **Aria-live region** — pick polite vs assertive
23. **Aria-busy use** — pick the correct busy state
24. **Aria-expanded** — pick the correct state for the disclosure
25. **Aria-selected vs aria-checked** — pick which fits the role
26. **Role override pitfall** — pick the role misuse
27. **Button vs link semantics** — pick which element fits
28. **Custom control role** — pick the right role for the widget
29. **Menu vs menubar** — pick which role fits
30. **Combobox pattern** — pick the right ARIA combobox
31. **Listbox pattern** — pick the right ARIA listbox
32. **Treeview pattern** — pick the right tree keyboard behavior
33. **Tab panel pattern** — pick the right tab behavior
34. **Accordion pattern** — pick the right accordion semantics
35. **Dialog pattern** — pick modal vs non-modal aria
36. **Tooltip pattern** — pick the tooltip implementation
37. **Toggle button state** — pick the correct pressed state
38. **Form label association** — pick the correct label method
39. **Error message association** — pick the correct error link
40. **Required field signaling** — pick the accessible signal
41. **Fieldset / legend use** — pick where it's needed
42. **Autocomplete attribute** — pick the right token for the field
43. **Input type semantics** — pick the type that improves input
44. **Placeholder vs label** — pick the right usage
45. **Captcha accessibility** — pick the accessible alternative
46. **Captions for video** — pick closed vs open captions
47. **Audio description** — pick when AD is required
48. **Transcript requirement** — pick when a transcript is required
49. **Motion preference** — pick how to honor prefers-reduced-motion
50. **Autoplay policy** — pick the accessible autoplay handling
51. **Time limit control** — pick the extension option required
52. **Session timeout warning** — pick the warning pattern
53. **Read order in DOM** — pick the DOM change that fixes read order
54. **Reading order vs visual** — pick the fix when they diverge
55. **Color-only meaning** — pick the redundant encoding to add
56. **Sensory characteristic** — pick the instruction that's not sensory-only
57. **Scroll lock trap** — pick the fix that preserves keyboard scrolling
58. **Error prevention** — pick the confirmation for consequential actions
59. **Language attribute** — pick the correct lang attribute
60. **Lang change mid-content** — pick the correct inline language
61. **Reading level** — pick the rewrite for the reading level target
62. **Symbolic content** — pick the explanation for unusual words
63. **Assistive tech test tool** — pick axe vs Lighthouse vs NVDA for the check
64. **Screen reader output** — pick the expected SR announcement
65. **Voice control label** — pick the label that matches the voice command
66. **Zoom support** — pick the layout that supports 200% zoom
67. **Touch target size** — pick the target that meets WCAG 2.5.5
68. **Accessible data table** — pick the correct `th` + `scope`
69. **Accessibility regression** — pick the change that introduced the regression

---

## Final Notes

- **Combine styles** when a single question naturally fits two (e.g., "Predict the output" + "Off-by-one detector"). Pick the dominant family for rotation tracking.
- If the transcript spans multiple domains, draw from each active bucket proportionally.
- **Never** fill 5+ questions with styles from the same bucket row range. Spread them across the bucket's 69 entries — jump between early, middle, and late entries across questions.
- These styles are a starter pool — the model may invent new styles when the transcript demands something none of these capture, as long as the new style is genuinely distinct.
