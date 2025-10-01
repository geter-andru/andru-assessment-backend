// Jest setup file for backend tests

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.AIRTABLE_API_KEY = 'test-api-key';
process.env.AIRTABLE_BASE_ID = 'test-base-id';
process.env.AIRTABLE_TABLE_NAME = 'Test Assessment Results';
process.env.FRONTEND_URL = 'http://localhost:3000';
