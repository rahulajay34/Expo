/**
 * Quality Gate - Validation and retry logic for agentic workflows
 * 
 * Per the Agentic AI Framework: At 90% individual agent accuracy in a 
 * sequential chain, errors compound (0.9^n). Quality gates at critical
 * handoffs ensure 99%+ recall for production-grade accuracy.
 * 
 * 7-agent chain accuracy:
 * - At 90% per agent: 0.9^7 = 47.8% (failing)
 * - At 99% per agent: 0.99^7 = 93.2% (acceptable)
 */

import { estimateTokens } from "@/lib/anthropic/token-counter";

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

export interface QualityGateConfig {
  minConfidence: number;       // Minimum confidence to pass (default: 0.95)
  maxRetries: number;          // Max retry attempts (default: 2)
  validateJson: boolean;       // Check JSON validity for structured outputs
  checkHallucinations: boolean; // Scan for hallucination markers
  minOutputLength: number;     // Minimum acceptable output length
}

const DEFAULT_CONFIG: QualityGateConfig = {
  minConfidence: 0.95,
  maxRetries: 2,
  validateJson: false,
  checkHallucinations: true,
  minOutputLength: 50,
};

/**
 * Hallucination markers that indicate model uncertainty or capability limitations
 */
const HALLUCINATION_PATTERNS = [
  /I don't have access to/i,
  /I cannot provide/i,
  /As an AI/i,
  /I'm not able to/i,
  /I don't have the ability/i,
  /I cannot access/i,
  /I'm unable to/i,
  /my training data/i,
  /my knowledge cutoff/i,
];

/**
 * AI-sounding phrases that indicate low-quality output
 */
const AI_PHRASE_PATTERNS = [
  /It's important to note that/i,
  /It's worth mentioning/i,
  /Let me explain/i,
  /I'd be happy to/i,
  /Certainly!/i,
  /Absolutely!/i,
  /Great question/i,
];

export class QualityGate {
  private config: QualityGateConfig;

  constructor(config: Partial<QualityGateConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate agent output before passing to next stage in pipeline
   */
  validate(output: string, agentName: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      confidence: 1.0,
      issues: [],
      suggestions: [],
    };

    // Check 1: Non-empty output
    if (!output || output.trim().length < this.config.minOutputLength) {
      result.isValid = false;
      result.issues.push(`Output too short (${output?.length || 0} chars, min: ${this.config.minOutputLength})`);
      result.confidence = 0;
      return result;
    }

    // Check 2: JSON validity (for structured outputs)
    if (this.config.validateJson) {
      try {
        // Try to find and parse JSON in the output
        const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]);
        } else {
          result.issues.push('No JSON structure found in output');
          result.confidence *= 0.6;
        }
      } catch (e) {
        result.issues.push('Invalid JSON structure');
        result.confidence *= 0.5;
      }
    }

    // Check 3: Hallucination markers
    if (this.config.checkHallucinations) {
      for (const pattern of HALLUCINATION_PATTERNS) {
        if (pattern.test(output)) {
          result.issues.push(`Hallucination marker: "${pattern.source}"`);
          result.confidence *= 0.7;
          result.suggestions.push('Retry with more specific context or constraints');
        }
      }
    }

    // Check 4: AI-sounding phrases (quality concern, not failure)
    let aiPhraseCount = 0;
    for (const pattern of AI_PHRASE_PATTERNS) {
      if (pattern.test(output)) {
        aiPhraseCount++;
      }
    }
    if (aiPhraseCount > 2) {
      result.issues.push(`Multiple AI-sounding phrases detected (${aiPhraseCount})`);
      result.confidence *= 0.9;
      result.suggestions.push('Consider running through Refiner to improve natural tone');
    }

    // Check 5: Token estimation sanity check
    const tokens = estimateTokens(output);
    if (tokens < 20) {
      result.issues.push(`Suspiciously short output (${tokens} tokens)`);
      result.confidence *= 0.7;
    }

    // Final determination
    result.isValid = result.confidence >= this.config.minConfidence;

    return result;
  }

  /**
   * Execute an agent function with validation and retry logic
   * 
   * @param executor - Function that runs the agent
   * @param agentName - Name for logging
   * @param validateJson - Override JSON validation for this call
   */
  async executeWithValidation<T>(
    executor: () => Promise<T>,
    agentName: string,
    options: { validateJson?: boolean } = {}
  ): Promise<{ result: T; validation: ValidationResult; attempts: number }> {
    const originalValidateJson = this.config.validateJson;
    if (options.validateJson !== undefined) {
      this.config.validateJson = options.validateJson;
    }

    let lastValidation: ValidationResult = {
      isValid: false,
      confidence: 0,
      issues: [],
      suggestions: [],
    };

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const result = await executor();
      const outputStr = typeof result === 'string' ? result : JSON.stringify(result);
      
      lastValidation = this.validate(outputStr, agentName);

      if (lastValidation.isValid) {
        if (attempt > 0) {
          console.info(`✅ ${agentName} passed validation on retry ${attempt}`);
        }
        this.config.validateJson = originalValidateJson;
        return { result, validation: lastValidation, attempts: attempt + 1 };
      }

      if (attempt < this.config.maxRetries) {
        console.warn(
          `⚠️ ${agentName} validation failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}):`,
          lastValidation.issues.join(', ')
        );
      }
    }

    // Restore config and return last result even if validation failed
    this.config.validateJson = originalValidateJson;
    console.error(
      `❌ ${agentName} failed validation after ${this.config.maxRetries + 1} attempts:`,
      lastValidation.issues
    );

    // Execute one more time and return result regardless
    const finalResult = await executor();
    return { 
      result: finalResult, 
      validation: lastValidation, 
      attempts: this.config.maxRetries + 1 
    };
  }

  /**
   * Calculate compounded accuracy for a sequential agent chain
   * 
   * @param individualAccuracy - Accuracy of each agent (0-1)
   * @param chainLength - Number of agents in sequence
   * @returns Overall system accuracy
   */
  static calculateChainAccuracy(individualAccuracy: number, chainLength: number): number {
    return Math.pow(individualAccuracy, chainLength);
  }

  /**
   * Get minimum individual accuracy needed for target system accuracy
   * 
   * @param targetAccuracy - Desired overall accuracy (0-1)
   * @param chainLength - Number of agents in sequence
   * @returns Required individual agent accuracy
   */
  static requiredIndividualAccuracy(targetAccuracy: number, chainLength: number): number {
    return Math.pow(targetAccuracy, 1 / chainLength);
  }
}

/**
 * Pre-configured quality gates for different agent types
 */
export const QualityGates = {
  /** For classification agents (Analyzer, CourseDetector) */
  classifier: new QualityGate({
    validateJson: true,
    minConfidence: 0.9,
    minOutputLength: 20,
  }),

  /** For content generation agents (Creator, Refiner) */
  generator: new QualityGate({
    validateJson: false,
    minConfidence: 0.95,
    minOutputLength: 200,
    checkHallucinations: true,
  }),

  /** For structured output agents (Formatter) */
  formatter: new QualityGate({
    validateJson: true,
    minConfidence: 0.98,
    minOutputLength: 50,
  }),

  /** For review/validation agents (Reviewer, Sanitizer) */
  validator: new QualityGate({
    validateJson: true,
    minConfidence: 0.9,
    minOutputLength: 30,
  }),
};

/**
 * Utility to log chain accuracy metrics
 */
export function logChainAccuracyMetrics(chainLength: number = 7): void {
  console.log('\n📊 Chain Accuracy Analysis (per Agentic AI Framework):');
  console.log('━'.repeat(50));
  
  const accuracies = [0.85, 0.90, 0.95, 0.99];
  for (const acc of accuracies) {
    const chainAcc = QualityGate.calculateChainAccuracy(acc, chainLength);
    const status = chainAcc >= 0.9 ? '✅' : chainAcc >= 0.7 ? '⚠️' : '❌';
    console.log(`${status} ${(acc * 100).toFixed(0)}% individual → ${(chainAcc * 100).toFixed(1)}% chain (${chainLength} agents)`);
  }
  
  console.log('\nTarget: 95% chain accuracy requires:');
  const required = QualityGate.requiredIndividualAccuracy(0.95, chainLength);
  console.log(`   ${(required * 100).toFixed(1)}% accuracy per agent`);
  console.log('━'.repeat(50));
}
