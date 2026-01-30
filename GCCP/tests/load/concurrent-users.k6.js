/**
 * Load Testing Script for GCCP Production
 * 
 * Simulates 30 concurrent users generating content
 * Tests:
 * - All generations complete without timeout
 * - Average completion time < 3 minutes
 * - Zero database deadlocks
 * 
 * Run with: k6 run concurrent-users.k6.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// ========================================
// CUSTOM METRICS
// ========================================

const generationSuccessRate = new Rate('generation_success_rate');
const generationDuration = new Trend('generation_duration_seconds');
const dbDeadlockErrors = new Counter('db_deadlock_errors');
const timeoutErrors = new Counter('timeout_errors');
const apiErrors = new Counter('api_errors');

// ========================================
// TEST CONFIGURATION
// ========================================

export const options = {
  scenarios: {
    // Ramp up to 30 concurrent users
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp to 10 users over 2 minutes
        { duration: '2m', target: 20 },   // Ramp to 20 users over 2 minutes
        { duration: '2m', target: 30 },   // Ramp to 30 users over 2 minutes
        { duration: '5m', target: 30 },   // Stay at 30 users for 5 minutes
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
      gracefulRampDown: '30s',
    },
    // Constant 30 users test
    constant_load: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      startTime: '13m', // Start after ramp_up completes
    },
  },
  thresholds: {
    // 95% of requests should complete within 3 minutes (180 seconds)
    generation_duration_seconds: ['p(95)<180'],
    // Success rate should be above 98%
    generation_success_rate: ['rate>0.98'],
    // HTTP request duration should be under 5s for 95% of requests
    http_req_duration: ['p(95)<5000'],
    // Error rate should be below 2%
    http_req_failed: ['rate<0.02'],
  },
  // Maximum test duration
  maxDuration: '25m',
};

// ========================================
// BASE CONFIGURATION
// ========================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;
const SUPABASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || 'test-anon-key';

// Test data generators
const TOPICS = [
  'Introduction to Machine Learning',
  'Data Structures and Algorithms',
  'Web Development Fundamentals',
  'Database Design Principles',
  'Cloud Computing Basics',
  'Cybersecurity Fundamentals',
  'Software Engineering Practices',
  'Mobile App Development',
  'DevOps and CI/CD',
  'Artificial Intelligence Concepts',
];

const SUBTOPICS = [
  'Arrays, Linked Lists, Trees, Graphs',
  'HTML, CSS, JavaScript, React',
  'SQL, NoSQL, Indexing, Normalization',
  'AWS, Azure, GCP, Docker',
  'Encryption, Authentication, Authorization',
  'Agile, Scrum, Kanban, Git',
  'iOS, Android, React Native, Flutter',
  'Jenkins, GitHub Actions, Kubernetes',
  'Neural Networks, Deep Learning, NLP',
  'Supervised Learning, Unsupervised Learning',
];

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate random generation parameters
 */
function generateParams() {
  const topicIndex = randomIntBetween(0, TOPICS.length - 1);
  const mode = randomIntBetween(0, 2);
  const modeMap = ['pre-read', 'lecture', 'assignment'];
  
  return {
    topic: TOPICS[topicIndex],
    subtopics: SUBTOPICS[topicIndex],
    mode: modeMap[mode],
    transcript: mode === 1 ? generateMockTranscript() : null,
    assignmentCounts: mode === 2 ? {
      mcsc: randomIntBetween(3, 10),
      mcmc: randomIntBetween(2, 5),
      subjective: randomIntBetween(2, 5),
    } : null,
  };
}

/**
 * Generate a mock transcript for gap analysis testing
 */
function generateMockTranscript() {
  const paragraphs = randomIntBetween(3, 8);
  let transcript = '';
  
  for (let i = 0; i < paragraphs; i++) {
    transcript += `This is paragraph ${i + 1} of the lecture transcript. `;
    transcript += `It covers important concepts related to the topic. `;
    transcript += `Students should pay attention to the key points discussed here.\n\n`;
  }
  
  return transcript;
}

/**
 * Create a Supabase auth session
 */
function createAuthSession() {
  // In a real scenario, you would authenticate with Supabase Auth
  // For load testing, we simulate a valid session
  return {
    access_token: `test-token-${randomString(8)}`,
    user_id: `test-user-${randomString(8)}`,
  };
}

/**
 * Poll for generation completion
 */
function pollGenerationStatus(generationId, authToken) {
  const maxAttempts = 60; // 60 attempts with 3s delay = 3 minutes max
  const pollInterval = 3; // seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = http.get(
      `${SUPABASE_URL}/rest/v1/generations?id=eq.${generationId}&select=status,progress_percent,error_message`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.status !== 200) {
      apiErrors.add(1);
      return { success: false, error: 'API error', duration: attempt * pollInterval };
    }
    
    const data = JSON.parse(response.body);
    
    if (data && data.length > 0) {
      const generation = data[0];
      
      // Check for completion
      if (generation.status === 'completed') {
        return { 
          success: true, 
          error: null, 
          duration: attempt * pollInterval,
          progress: generation.progress_percent 
        };
      }
      
      // Check for failure
      if (generation.status === 'failed') {
        // Check for deadlock error
        if (generation.error_message && generation.error_message.includes('deadlock')) {
          dbDeadlockErrors.add(1);
        }
        return { 
          success: false, 
          error: generation.error_message, 
          duration: attempt * pollInterval 
        };
      }
    }
    
    sleep(pollInterval);
  }
  
  // Timeout
  timeoutErrors.add(1);
  return { success: false, error: 'Timeout', duration: maxAttempts * pollInterval };
}

// ========================================
// SETUP FUNCTION
// ========================================

export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Target concurrent users: 30`);
  console.log(`Max generation time threshold: 180 seconds (3 minutes)`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200,
  });
  
  return {
    startTime: Date.now(),
  };
}

// ========================================
// MAIN TEST FUNCTION
// ========================================

export default function () {
  const auth = createAuthSession();
  const params = generateParams();
  
  group('Content Generation Flow', () => {
    // Step 1: Create generation record
    let generationId;
    
    group('Create Generation', () => {
      const createPayload = JSON.stringify({
        user_id: auth.user_id,
        topic: params.topic,
        subtopics: params.subtopics,
        mode: params.mode,
        transcript: params.transcript,
        assignment_data: params.assignmentCounts ? { counts: params.assignmentCounts } : null,
        status: 'queued',
        progress_percent: 0,
        progress_message: 'Initializing...',
      });
      
      const createResponse = http.post(
        `${SUPABASE_URL}/rest/v1/generations`,
        createPayload,
        {
          headers: {
            'Authorization': `Bearer ${auth.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
        }
      );
      
      const createSuccess = check(createResponse, {
        'Generation created successfully': (r) => r.status === 201,
        'Generation has ID': (r) => {
          if (r.status !== 201) return false;
          const data = JSON.parse(r.body);
          generationId = data[0]?.id;
          return generationId !== undefined;
        },
      });
      
      if (!createSuccess) {
        apiErrors.add(1);
        return;
      }
    });
    
    if (!generationId) {
      console.error('Failed to create generation');
      return;
    }
    
    // Step 2: Trigger generation via API
    group('Trigger Generation', () => {
      const triggerResponse = http.post(
        `${API_URL}/generate`,
        JSON.stringify({ generation_id: generationId }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.access_token}`,
          },
        }
      );
      
      check(triggerResponse, {
        'Generation triggered': (r) => r.status === 200 || r.status === 202,
      });
    });
    
    // Step 3: Poll for completion
    group('Poll for Completion', () => {
      const startTime = Date.now();
      const result = pollGenerationStatus(generationId, auth.access_token);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      
      // Record metrics
      generationDuration.add(duration);
      generationSuccessRate.add(result.success);
      
      // Verify completion time is under 3 minutes (180 seconds)
      check(result, {
        'Generation completed successfully': (r) => r.success,
        'Generation completed within 3 minutes': (r) => r.duration < 180,
      });
      
      if (!result.success) {
        console.error(`Generation failed: ${result.error}`);
      }
    });
    
    // Step 4: Verify final content (optional)
    group('Verify Content', () => {
      const verifyResponse = http.get(
        `${SUPABASE_URL}/rest/v1/generations?id=eq.${generationId}&select=final_content,status`,
        {
          headers: {
            'Authorization': `Bearer ${auth.access_token}`,
            'apikey': SUPABASE_ANON_KEY,
          },
        }
      );
      
      check(verifyResponse, {
        'Content verification API accessible': (r) => r.status === 200,
        'Generation has final content': (r) => {
          if (r.status !== 200) return false;
          const data = JSON.parse(r.body);
          return data[0]?.final_content !== null;
        },
      });
    });
  });
  
  // Random sleep between iterations to simulate realistic user behavior
  sleep(randomIntBetween(1, 5));
}

// ========================================
// TEARDOWN FUNCTION
// ========================================

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  
  console.log('\n========================================');
  console.log('Load Test Complete');
  console.log('========================================');
  console.log(`Total duration: ${duration.toFixed(2)} seconds`);
  console.log('\nKey Metrics:');
  console.log(`- Generation Success Rate: ${generationSuccessRate.value * 100}%`);
  console.log(`- Average Generation Time: ${generationDuration.avg.toFixed(2)}s`);
  console.log(`- 95th Percentile Generation Time: ${generationDuration.p(95).toFixed(2)}s`);
  console.log(`- Database Deadlock Errors: ${dbDeadlockErrors.value}`);
  console.log(`- Timeout Errors: ${timeoutErrors.value}`);
  console.log(`- API Errors: ${apiErrors.value}`);
  console.log('========================================\n');
  
  // Validate thresholds
  const success = 
    generationSuccessRate.value >= 0.98 &&
    generationDuration.p(95) < 180 &&
    dbDeadlockErrors.value === 0;
  
  if (success) {
    console.log('✅ All thresholds passed!');
  } else {
    console.log('❌ Some thresholds failed:');
    if (generationSuccessRate.value < 0.98) {
      console.log('  - Success rate below 98%');
    }
    if (generationDuration.p(95) >= 180) {
      console.log('  - 95th percentile generation time exceeds 3 minutes');
    }
    if (dbDeadlockErrors.value > 0) {
      console.log('  - Database deadlocks detected');
    }
  }
}
