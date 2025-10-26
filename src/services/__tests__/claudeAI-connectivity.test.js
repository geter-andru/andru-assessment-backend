/**
 * ClaudeAI API Connectivity Test
 * Test Suite 1.1.3 from CLAUDEAI_TESTING_CHECKLIST_2025-10-25.md
 *
 * Purpose: Verify ClaudeAI API is accessible and returns valid responses
 * Priority: CRITICAL
 * Agent: Agent 1
 * Date: October 25, 2025
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

console.log('========================================');
console.log('ClaudeAI API Connectivity Test');
console.log('========================================\n');

// Verify environment setup
console.log('1. Verifying Environment Configuration...');
const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not found in environment');
  process.exit(1);
}

if (apiKey === 'sk-ant-api03-placeholder') {
  console.error('❌ ANTHROPIC_API_KEY is still placeholder value');
  process.exit(1);
}

console.log('✅ API Key found');
console.log(`✅ Key format: ${apiKey.substring(0, 20)}...`);
console.log(`✅ Key length: ${apiKey.length} characters\n`);

// Test data
const testRequest = {
  responses: [
    {
      questionId: 'q1',
      questionText: 'I can name the exact three pain points that cost my buyers the most money annually',
      response: 2
    },
    {
      questionId: 'q2',
      questionText: 'I know the specific job titles, LinkedIn headlines, and reporting structure of my champions',
      response: 3
    },
    {
      questionId: 'q3',
      questionText: 'I can map out the exact 7-step evaluation process my buyers follow, including who signs off at each stage',
      response: 1
    },
    {
      questionId: 'q4',
      questionText: 'I have calculated the specific dollar amount my solution saves/earns per customer per quarter',
      response: 2
    }
  ],
  batchNumber: 1,
  userInfo: {
    company: 'Test SaaS Company',
    productName: 'AI Sales Assistant',
    businessModel: 'B2B SaaS'
  }
};

// Build the prompt
console.log('2. Building AI Prompt...');
const prompt = `You are an expert B2B sales strategist analyzing assessment responses to identify sales challenges and business impact.

Company: ${testRequest.userInfo.company}
Product: ${testRequest.userInfo.productName}
Business Model: ${testRequest.userInfo.businessModel}

Current Assessment Responses (Batch ${testRequest.batchNumber}):
${testRequest.responses.map((r, i) => `${i + 1}. ${r.questionText}\n   Response: ${r.response}`).join('\n')}

Based on these responses, identify the primary sales challenge and provide a personalized insight.

Focus on:
1. Specific sales challenges (Technical Translation, Buyer Conversations, Competitive Positioning)
2. Business impact and consequences
3. Clear, actionable insights
4. Confidence level based on response quality

Respond with valid JSON:
{
  "challengeIdentified": "Specific challenge name",
  "insight": "Personalized insight message (2-3 sentences)",
  "businessImpact": "Specific business consequence",
  "confidence": 85,
  "reasoning": "Brief explanation of analysis"
}`;

console.log('✅ Prompt built successfully\n');

// Make API call
console.log('3. Testing ClaudeAI API Call...');
console.log('   Model: claude-3-5-sonnet-20241022');
console.log('   Max Tokens: 800');
console.log('   Temperature: 0.7\n');

const startTime = Date.now();

try {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  const duration = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API call failed with status ${response.status}`);
    console.error(`Response: ${errorText}`);
    process.exit(1);
  }

  console.log(`✅ API call successful (${duration}ms)\n`);

  const result = await response.json();

  console.log('4. Validating API Response Structure...');

  // Check response structure
  if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
    console.error('❌ Invalid response structure: missing content array');
    process.exit(1);
  }
  console.log('✅ Response has content array');

  if (!result.content[0].text) {
    console.error('❌ Invalid response structure: missing text in content');
    process.exit(1);
  }
  console.log('✅ Response has text content');

  const aiText = result.content[0].text;
  console.log(`✅ Text length: ${aiText.length} characters\n`);

  // Parse JSON from response
  console.log('5. Parsing AI-Generated JSON...');
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('❌ No JSON found in AI response');
    console.error('Raw response:', aiText);
    process.exit(1);
  }
  console.log('✅ JSON pattern found in response');

  const parsed = JSON.parse(jsonMatch[0]);
  console.log('✅ JSON parsed successfully\n');

  // Validate required fields
  console.log('6. Validating Response Fields...');

  const requiredFields = [
    { name: 'challengeIdentified', type: 'string' },
    { name: 'insight', type: 'string' },
    { name: 'businessImpact', type: 'string' },
    { name: 'confidence', type: 'number' },
    { name: 'reasoning', type: 'string' }
  ];

  let validationErrors = 0;

  requiredFields.forEach(field => {
    if (!parsed[field.name]) {
      console.error(`❌ Missing field: ${field.name}`);
      validationErrors++;
    } else if (typeof parsed[field.name] !== field.type) {
      console.error(`❌ Invalid type for ${field.name}: expected ${field.type}, got ${typeof parsed[field.name]}`);
      validationErrors++;
    } else {
      console.log(`✅ ${field.name}: ${field.type} ✓`);
    }
  });

  if (validationErrors > 0) {
    console.error(`\n❌ ${validationErrors} validation error(s) found`);
    process.exit(1);
  }

  // Validate confidence range
  if (parsed.confidence < 70 || parsed.confidence > 95) {
    console.warn(`⚠️  Confidence score ${parsed.confidence} outside expected range (70-95)`);
  } else {
    console.log(`✅ Confidence score in valid range: ${parsed.confidence}%`);
  }

  // Validate insight length
  if (parsed.insight.length < 50) {
    console.warn(`⚠️  Insight is short (${parsed.insight.length} chars), expected >50`);
  } else {
    console.log(`✅ Insight length adequate: ${parsed.insight.length} characters`);
  }

  console.log('\n========================================');
  console.log('Test Results');
  console.log('========================================');
  console.log(`✅ API Call Duration: ${duration}ms`);
  console.log(`✅ Challenge: ${parsed.challengeIdentified}`);
  console.log(`✅ Confidence: ${parsed.confidence}%`);
  console.log(`✅ Insight: ${parsed.insight.substring(0, 80)}...`);
  console.log(`✅ Business Impact: ${parsed.businessImpact}`);
  console.log(`✅ Reasoning: ${parsed.reasoning.substring(0, 60)}...`);

  console.log('\n========================================');
  console.log('API Usage Statistics');
  console.log('========================================');
  if (result.usage) {
    console.log(`Input tokens: ${result.usage.input_tokens}`);
    console.log(`Output tokens: ${result.usage.output_tokens}`);
    console.log(`Total tokens: ${result.usage.input_tokens + result.usage.output_tokens}`);
  }

  console.log('\n========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
  console.log('ClaudeAI API is properly configured and working');
  console.log('Ready to proceed with implementation');
  console.log('========================================\n');

  process.exit(0);

} catch (error) {
  const duration = Date.now() - startTime;
  console.error(`\n❌ Test failed after ${duration}ms`);
  console.error('Error:', error.message);

  if (error.stack) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }

  process.exit(1);
}
