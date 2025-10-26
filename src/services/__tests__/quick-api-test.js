/**
 * Quick API Test - Environment variable test
 * Uses ANTHROPIC_API_KEY from environment
 */

require('dotenv').config();
const API_KEY = process.env.ANTHROPIC_API_KEY;

console.log('Testing with API key from environment...');
console.log('Key present:', !!API_KEY);
console.log('Key prefix:', API_KEY ? API_KEY.substring(0, 15) + '...' : 'N/A');

const testAPI = async () => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: 'Say hello'
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed:', response.status);
      console.error('Response:', error);
      return;
    }

    const data = await response.json();
    console.log('✅ Success!');
    console.log('Response:', data.content[0].text);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testAPI();
