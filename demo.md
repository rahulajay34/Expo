# Lecture Notes: Tokenization, Cost, Latency & Streaming

### Pre-read
**Essential Question:** How does the transition from text to tokens impact the economics and performance of AI applications?

**Vocabulary to Notice:**
- **Tokenization:** Converting text into integer vectors using algorithms like BPE.
- **Context Window:** The maximum number of tokens a model can process in one pass.
- **TTFT (Time to First Token):** Latency metric measuring the time to start the response.
- **TPOT (Time Per Output Token):** Latency metric measuring generation speed.

### Questions to Ponder
- Why might a model struggle more with a rare technical term than a common word?
- How does the "pay-as-you-go" nature of tokens change how we design user interfaces?

### Learning Objectives
By the end of this session, you will be able to:
- **Explain** the mechanics of tokenization and how LLMs process text as numerical vectors rather than words.
- **Analyze** the relationship between prompt structure, model latency, and operational cost.
- **Compare** streaming versus full output modes and identify the appropriate use case for each.
- **Implement** prompt engineering strategies to optimize token usage without sacrificing response quality.

---

## What Are Tokens and Why They Matter

### The Fundamental Unit of LLMs
When you interact with a Large Language Model (LLM), it might feel like the machine reads English just like you do. However, the model does not actually "read" words. Instead, it processes **tokens**.

Think of this process like cooking. You have a large vegetable (your raw text) that you must first cut into pieces before cooking. The final dish is the output, but the "chopped pieces" are the tokens. The model takes your text, breaks it down into these chunks, converts them into numbers (Token IDs), processes those numbers, and then provides the result.

### Tokenization Intuition: Text to Numbers
The conversion process involves mapping text fragments to specific integers because machines only understand numbers. A common misconception is that one word always equals one token. In reality, a token can be a word, part of a word, or even a single character.

Consider the phrase: `I'm very happy`.
- In a standard tokenizer, this might be split into tokens like "I", "'m", " very", and " happy".
- Adding a single space at the start or end changes the token count.

> **💡 Pro Tip:** Spaces are characters too. In the Open AI tokenizer, adding a space can increase the token count because the space itself is processed as part of the tokenization boundary.

**Engineering Example: Counting Tokens**
To manage costs and limits, engineers use libraries like `tiktoken` to count tokens programmatically:

```python
import tiktoken

# Use the encoding for GPT-4 (cl100k_base)
enc = tiktoken.get_encoding("cl100k_base")
text = "Generative AI Engineering"
tokens = enc.encode(text)

print(f"Token Count: {len(tokens)}") 
# Output: 4
```

**How it works under the hood:**
1. **Segmentation (BPE)**: Modern models use Byte Pair Encoding (BPE) to efficiently map text to numbers. Common words remain whole, while rare words are split into sub-word chunks.
2. **ID Assignment**: Each chunk is assigned a unique integer (Token ID).
3. **Context-Dependency**: Token IDs are not fixed for every word; they can change depending on the context and how the LLM interprets the sequence.

**Example: The Impact of Formatting**
If you analyze the sentence: `The AI model is learning.`
You might count 5 words, but the model counts the spaces and punctuation as well.
- In newer models, if a word like "happy" is repeated, the model is smart enough to process it efficiently. 
- In older models (like GPT-3 Legacy), redundancy was higher because the model was less capable of removing redundant tokens, leading to higher token counts for the same text.

### Synthesis Point
An LLM never sees "text"; it sees a sequence of numbers. Consequently, your billing and the model's processing limits are defined by these numerical tokens.

---

## The Context Window

### Model Memory Limits
The **Context Window** is the "short-term memory" of the AI during a conversation. It includes all the conversation history currently active in that chat window.

Every model has a token limit. As long as your conversation stays within this limit, the model "remembers" the details. For instance, if you establish a story about a person named Ria who has a blue bag, and later ask, "What color was her bag?", the model looks back through the context window to find the answer.

### When Memory Fails
What happens when you exceed this limit? Once the tokens are exhausted, the model begins to "forget" the earliest parts of the conversation.
1. **First In, First Out**: As new tokens enter, the oldest tokens (the start of the conversation) are dropped.
2. **Vague Responses**: If the context window is nearly full, you might start receiving very vague or generic answers.
3. **Hallucination**: The model may invent information because the original context you provided has been pushed out of its memory limit.

> **Actionable Bridge:** When you feel an AI is giving slow or weird responses, you might be hitting the token limit. Starting a new chat window clears the context and refreshes the model's memory capacity.

---

## Streaming vs. Full Output

### Streaming: The "Conversational" Approach
Most generative AI tools use **streaming**. Instead of waiting for the entire response to be generated, the AI prints one word at a time. This happens because LLMs predict the next word by analyzing the string of words that went before it.

**Analogy:** Imagine a friend sending you a voice note. They don't blur everything out in one go; they think and speak one word after another.

**When to use:**
- Standard chat conversations (e.g., asking "What is acid rain?").
- Scenarios where you need to see the "thinking" process or get an immediate response.

### Full Output: The "Final Product" Approach
**Full Output** is when the system generates the entire response internally and displays it only when the whole file or component is ready. 

**Analogy:** Generating a web page for "Maya's Cafe." You don't see the background and headings appear one by one; you wait a moment and then the entire rendered page opens in one go.

**When to use:**
- Vibe coding or generating full web pages.
- Creating downloadable files where the partial code is not useful until complete.

---

## Latency Basics

### Latency Metrics: TTFT vs. TPOT
Latency is not a single number. Engineers track two distinct metrics:

1.  **Time to First Token (TTFT):** The time from sending the request to seeing the first character. This is affected by prompt length (prefill time) and model size.
2.  **Time Per Output Token (TPOT):** The speed at which the rest of the response generates. This is affected by server load and quantization.

**Streaming Impact:** Streaming optimizes **perceived latency** by showing the user progress (low TTFT) even if the total generation time is long.

### Key Factors Affecting Latency

| Factor | Impact on Speed | Explanation |
| :--- | :--- | :--- |
| **Model Size** | High | Larger models like GPT-4 are slower than GPT-3.5 because they have a more intensive "thinking" or reasoning mode. |
| **Prompt Length** | Medium | A longer prompt takes more time to tokenize and process before the model can begin generating an answer. |
| **Output Length** | High | The more words the AI has to generate, the longer it takes. You can reduce latency by asking for shorter responses (e.g., "limit to 100 words"). |
| **Thinking Mode** | High | Models with "Thinking Mode" (like OpenAI o1) perform internal chain-of-thought reasoning steps. This increases TTFT significantly but improves reasoning quality. Note: Internal reasoning tokens are often billed as output tokens even if they do not appear in the final visible response. |
| **Server Load** | Medium/High | Similar to a restaurant kitchen with too many orders, high concurrency on the provider's backend slows down token generation (TPOT). |

**The Restaurant Analogy:**
- **Model Size:** The reasoning depth. GPT-4 is like a chef doing deep research on a dish, while GPT-3.5 is faster but does less "thinking."
- **Server Code:** The load on the kitchen. If 100 customers order at once, the server (the LLM backend) takes longer to deliver each meal.

### Synthesis Point
Speed is a trade-off between model intelligence (size) and the volume of text generated.

---

## Cost Implications

### The Token-Based Economy
Costing in Generative AI is driven by token usage. A critical rule for engineering is that **output tokens are typically more expensive than input tokens.**

**The Cost Disparity:**
Because LLMs generate text autoregressively (one token at a time, re-reading the context for each new token), output tokens consume significantly more compute resources than input tokens.
- **Input (Prompt):** Processed in parallel. Cheaper (e.g., \$5/1M tokens).
- **Output (Completion):** Processed sequentially. More expensive (e.g., \$15/1M tokens).

### Provider and Model Differences
- **GPT-4 vs. GPT-3.5:** Upgrading to a higher-tier model generally requires paying more because the "thinking" and reasoning capabilities are more computationally expensive.
- **Token Limits:** Most free versions of models have a set token limit. Once exceeded, you must either wait or upgrade to a paid plan to continue using higher-intelligence models.

### Synthesis Point
Because output tokens are processed sequentially, they represent the primary driver of both latency and operational expense.

---

## Strategies for Optimizing Token Usage

### 1. Eliminate "Fluff" and Politeness
While we are used to saying "Please" or "Thank you," these words consume tokens. LLMs can understand your intent without them. Removing unnecessary words helps you use the same chat window for a longer time.

### 2. Be Direct and Set Constraints
To save money and tokens, give shorter, more direct prompts. Instead of letting the AI ramble, tell it exactly how much output you need (e.g., "Explain this in 100 words"). This reduces the output tokens you are charged for.

### 3. Manage the Context Window
Since every word you type and every answer you receive is added to the context window, being concise in your follow-up questions ensures you don't exhaust the memory limit too quickly.

### 4. Adjust Thinking Budgets
In tools like Google AI Studio, you can decrease the "Thinking Budget." Lowering this budget reduces the amount of internal research the model performs, which saves tokens and provides a more basic, faster response.

### Key Takeaways
1. **Tokens are the Currency:** Everything—including spaces, punctuation, and emojis—is converted into numerical tokens for processing.
2. **Input vs. Output Cost:** Output tokens require more compute and are priced higher than input tokens.
3. **Context is Finite:** The context window is the AI's memory. When it's full, the AI starts forgetting the beginning of the conversation, which can lead to hallucinations.
4. **Latency Factors:** Model size (reasoning depth), prompt/output length, and server load are the primary drivers of AI speed.
5. **Streaming for Speed:** Streaming allows you to see the AI's response as it "thinks," whereas full output is used for complete artifacts like web pages.
6. **Efficiency is Key:** Writing concise prompts without "fluff" saves tokens, reduces costs, and keeps your context window useful for longer sessions.

### Practice Assignment: Cost Estimation
**Scenario:** You are architecting a support bot handling 10k requests/day.
- **Avg Prompt:** 500 tokens
- **Avg Output:** 100 tokens

**Task:** Calculate daily costs for:
1.  **Model A (Reasoning):** Input \$10/1M, Output \$30/1M
2.  **Model B (Fast):** Input \$0.50/1M, Output \$1.50/1M

Hint: $\text{Total Cost} = (R \times T_{in} \times P_{in}) + (R \times T_{out} \times P_{out})$ where $R$ is requests, $T$ is tokens, and $P$ is price per token.