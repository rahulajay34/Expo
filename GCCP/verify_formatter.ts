
import { FormatterAgent } from './src/lib/agents/formatter';
import { AnthropicClient } from './src/lib/anthropic/client';

// Mock client to simulate timeout or failure
class MockClient extends AnthropicClient {
    constructor() {
        super('test-key');
    }

    async generate(params: any): Promise<any> {
        console.log('[MockClient] Received request');
        // Simulate a delay longer than the original 30s but shorter than the new 60s to test timeout adjustment? 
        // Or simulate a timeout to test fallback?

        // Let's simulate a "bad" response that isn't JSON to test recovery
        return {
            content: [
                { type: 'text', text: 'Here is your JSON: \n\n { "questions": "invalid" ' }
            ]
        };
    }
}

async function runTest() {
    console.log('--- Starting FormatterAgent Verification ---');

    const mockClient = new MockClient();
    const agent = new FormatterAgent(mockClient);

    // Create a massive input to trigger summarization
    const massiveInput = "word ".repeat(9000) + " Question 1: What is 2+2? Option A: 1 Option B: 4Answer: B";

    try {
        console.log('Testing with massive input...');
        const result = await agent.formatAssignment(massiveInput);
        console.log('Result:', result);

        if (result === '[]' || result.includes('questionType')) {
            console.log('SUCCESS: Agent handled input gracefully');
        } else {
            console.log('FAILURE: Agent returned unexpected output');
        }
    } catch (error) {
        console.error('CRITICAL FAILURE: Agent crashed', error);
    }
}

runTest();
