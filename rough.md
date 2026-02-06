# Assignment: Scalability of AI Systems

## Learning Objectives

By completing this assignment, you will:

* Understand the core metrics of scalability: Throughput, Latency, and Availability.
* Analyze techniques for data scalability, including Partitioning and Caching.
* Evaluate trade-offs between speed, accuracy, and cost.
* Apply model optimization techniques like Pruning and Quantization.
* Design fault-tolerant and privacy-compliant AI architectures.

---

## Section 1: Objective Questions (Multiple Choice & Multiple Select)

### Easy Questions (Knowledge-Based Understanding)

**Question 1: Multiple Choice**

In the context of AI system performance, how is "Throughput" defined?

A) The time delay between a user request and the system response.
B) The number of tasks or requests processed per unit of time (e.g., requests per second).
C) The total storage capacity required for the training dataset.
D) The percentage of time the system is operational without downtime.

**Correct Answer:** B

**Explanation:** Throughput is explicitly defined as the volume of work completed per unit of time (e.g., 100 queries per second). Option A refers to Latency. Option D refers to Availability.

---

**Question 2: Multiple Choice**

Which of the following database scaling strategies involves splitting a table's **rows** across multiple nodes?

A) Vertical Partitioning
B) Horizontal Partitioning (Sharding)
C) Normalization
D) Vertical Scalability

**Correct Answer:** B

**Explanation:** Horizontal partitioning involves splitting rows across nodes to share the load. Vertical partitioning involves separating columns. Vertical scalability refers to adding power to a single machine, not splitting data.

---

**Question 3: Multiple Choice**

What is the primary function of **Caching** in a scalable AI system?

A) To permanently store all historical training data.
B) To increase the computational load on the main server.
C) To reduce repeated data access and improve latency for frequent queries.
D) To encrypt data for privacy compliance.

**Correct Answer:** C

**Explanation:** Caching stores frequently accessed data in fast, temporary storage to avoid repeated, expensive computations or retrievals from the main disk, thereby reducing latency and compute load.

---

**Question 4: Multiple Select**

Which of the following are valid **Model Optimization** techniques to reduce inference costs and memory footprint? (Select all that apply)

A) Pruning (removing unnecessary parameters)
B) Increasing the number of hidden layers
C) Quantization (reducing numerical precision)
D) Replicating the model across more servers
E) Using float64 precision for all weights

**Correct Answer:** A, C

**Explanation:** Pruning removes unnecessary parameters to make the model lightweight. Quantization reduces the precision of weights (e.g., from float32 to int8) to save memory. Options B and E increase size and cost. Option D improves availability/throughput but does not optimize the model itself.

---

**Question 5: Multiple Choice**

What is the difference between **Load Testing** and **Stress Testing**?

A) Load testing minimizes cost, while stress testing maximizes cost.
B) Load testing evaluates behavior under expected stress; Stress testing identifies breaking points.
C) They are exactly the same thing.
D) Stress testing is for hardware, Load testing is for software.

**Correct Answer:** B

**Explanation:** Load testing evaluates how the system behaves under normal or expected high loads. Stress testing pushes the system beyond its limits to identify the absolute breaking point and failure modes.

---

### Moderate Questions (Implementation & Application)

**Question 6: Multiple Choice**

You are designing a system that must handle **Streaming Data**. Which of the following is a critical requirement for processing this data type effectively?

A) Storing all data first, then processing it in monthly batches.
B) Low latency processing to make real-time decisions (e.g., keep or discard).
C) Ensuring the data is perfectly structured before it enters the pipeline.
D) Using only manual data labeling.

**Correct Answer:** B

**Explanation:** Streaming data (high velocity) requires real-time processing to make immediate decisions. Waiting to store and batch process (Option A) defeats the purpose of streaming pipelines.

---

**Question 7: Multiple Select**

Which of the following techniques contribute to **Fault Tolerance** and High Availability in distributed AI systems? (Select all that apply)

A) Data Replication (copying data across multiple servers)
B) Checkpointing (saving state to enable recovery)
C) Storing data on a single, high-performance server
D) Load Balancing (distributing traffic to prevent hotspots)
E) Automatic Recovery mechanisms

**Correct Answer:** A, B, D, E

**Explanation:** Replication ensures data survives node failure. Checkpointing allows a system to resume from a known state. Load balancing prevents single components from being overwhelmed. Automatic recovery reduces downtime. Option C creates a single point of failure.

---

**Question 8: Multiple Choice**

A startup wants to use machine learning but has very limited labeled data. They have a massive amount of unlabeled data. Which learning paradigm is most appropriate to scale their development?

A) Supervised Learning
B) Semi-Supervised Learning
C) Unsupervised Learning
D) Rule-Based Systems

**Correct Answer:** B

**Explanation:** Semi-supervised learning uses a small amount of labeled data combined with a large volume of unlabeled data to improve learning accuracy, making it ideal for scenarios where labeling is expensive or scarce.

---

## Section 2: Subjective Question (Synthesis & Analysis)

**Question 9: Application & Synthesis**

**Scenario:** You are the Lead Architect for a "Smart City" traffic management system. The system ingests video feeds from 10,000 cameras to detect accidents and congestion in real-time.

* **Constraint 1:** The system experiences massive surges in traffic data during rush hours (High Volatility).
* **Constraint 2:** Budget is limited; you cannot run high-precision models on every frame.
* **Constraint 3:** Privacy is paramount; license plates and faces must not be stored.

**Your Task:** Design a scalable architecture strategy. In your response:

1. **Scalability Strategy:** Explain how you will handle the data volume using **Partitioning**. Which type of partitioning (Horizontal, Vertical, Time-based) would you use for the video logs and why?
2. **Performance vs. Cost:** Propose a **Model Optimization** technique to satisfy the budget constraint without completely losing the ability to detect accidents.
3. **Privacy:** How will you ensure compliance with privacy laws regarding the video data? (Reference specific techniques mentioned in the course like Anonymization).
4. **Reliability:** Describe how you will use **Redundancy** or **Load Balancing** to ensure the system doesn't crash during rush hour.

---

**Sample Editorial Solution:**

**1. Scalability Strategy (Partitioning):**
I would implement **Time-based Partitioning** and **Horizontal Partitioning (Sharding)**.

* **Time-based:** Traffic data is highly temporal. Partitioning data by timestamps (e.g., hourly logs) supports efficient temporal queries for historical analysis.
* **Horizontal:** To handle the sheer volume of 10,000 cameras, I would horizontally partition (shard) the incoming streams across multiple nodes based on geographic zones (e.g., North Zone cameras -> Node Cluster A). This ensures parallel access and prevents any single storage node from becoming a bottleneck.

**2. Performance vs. Cost (Model Optimization):**
To meet budget constraints, I would apply **Quantization**.

* By reducing the numerical precision of the model weights (e.g., from 32-bit floating point to 8-bit integers), we can significantly reduce the memory footprint and inference cost.
* This allows us to deploy lighter models that run faster on cheaper hardware. While there is a slight trade-off in precision, it is generally acceptable for object detection tasks (identifying a car crash vs. a car) compared to the cost savings.

**3. Privacy Compliance:**
I would implement **Anonymization** at the ingestion point.

* Before any data is committed to persistent storage, a lightweight pre-processing step will blur faces and license plates.
* Additionally, I will implement strict **Access Control** and **Encryption** for the stored data to ensure only authorized personnel can view the anonymized feeds, minimizing the risk of data theft or leaks.

**4. Reliability (Redundancy & Load Balancing):**

* **Load Balancing:** I will place a load balancer in front of the processing nodes. This ensures that during rush hour spikes, traffic is distributed evenly across servers, preventing "hotspots" where one server crashes while others are idle.
* **Redundancy:** I will use **Data Replication**. Critical event data (e.g., detected accidents) will be replicated across at least three different storage nodes. If one node fails, the system can automatically recover and retrieve the data from a replica, ensuring high availability.

---

## Answer Key and Solutions

### Objective Questions Answer Summary

| Question | Type | Answer | Difficulty |
| --- | --- | --- | --- |
| 1 | MCQ | B | Easy |
| 2 | MCQ | B | Easy |
| 3 | MCQ | C | Easy |
| 4 | MSQ | A, C | Easy |
| 5 | MCQ | B | Moderate |
| 6 | MCQ | B | Moderate |
| 7 | MSQ | A, B, D, E | Moderate |
| 8 | MCQ | B | Moderate |

### Detailed Explanations for Objective Questions

**Question 1 – Throughput**

* **Why B is correct:** The lecture defined throughput as the number of tasks completed per unit time.
* **Distinction:** Latency is the time for *one* task; Throughput is the *volume* of tasks.

**Question 2 – Partitioning**

* **Why B is correct:** Horizontal partitioning (sharding) splits rows (data instances) across machines to scale out storage.
* **Distinction:** Vertical partitioning splits columns (features).

**Question 3 – Caching**

* **Why C is correct:** The lecture highlighted that caching stores results of frequent queries to reduce compute load and latency.
* **Key concept:** "Reuse" is the primary benefit of caching.

**Question 4 – Model Optimization**

* **Why A & C are correct:** Pruning removes weights; Quantization reduces precision. Both are explicitly mentioned as ways to reduce model size/cost.
* **Why others are wrong:** Increasing layers increases cost. Float64 increases memory usage.

**Question 5 – Testing**

* **Why B is correct:** Load testing checks normal operations; Stress testing finds the breaking point.
* **Key concept:** Identifying bottlenecks requires stress testing.

**Question 6 – Streaming Data**

* **Why B is correct:** Streaming pipelines require real-time processing/decisions because data is "in motion" and often too large to store raw first.

**Question 7 – Fault Tolerance**

* **Why A, B, D, E are correct:** These are standard reliability techniques. Replication (redundancy), Checkpointing (state saving), and Load Balancing (distribution) prevent failures.

**Question 8 – Semi-Supervised Learning**

* **Why B is correct:** The lecture specified that semi-supervised learning combines a small amount of labeled data with a large amount of unlabeled data, which fits the startup scenario perfectly.

---

### Subjective Question Evaluation Rubric

**Question 9 – Smart City Architecture**

**Scoring Criteria (out of 100 points):**

| Criterion | Points | Evaluation Notes |
| --- | --- | --- |
| **Scalability (Partitioning)** | 25 | Correctly identifies Horizontal Partitioning (for volume) or Time-based Partitioning (for logs). Explains *why* (parallel access/temporal queries). |
| **Optimization Strategy** | 25 | Suggests Pruning or Quantization. Justifies it by linking reduced precision/size to lower cost and faster inference. |
| **Privacy Implementation** | 25 | Mentions Anonymization (blurring), Encryption, or Access Control. |
| **Reliability Design** | 25 | Mentions Load Balancing (distributing spikes) and Redundancy/Replication (preventing data loss). |

**Note:** Students may also mention "Edge Computing" for the Smart City scenario. This is acceptable if they justify it as a way to reduce latency, but the core answer should focus on the specific scalability techniques (Partitioning/Optimization) discussed in the lecture.

---
