export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(.+)\\.js$': '$1',
  },
  testMatch: ['**/__tests__/**/*.test.js'],
};
