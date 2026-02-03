import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.PHI_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
process.env.NODE_ENV = 'test';
