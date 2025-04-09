/** @type {import('jest').Config} */
const config = {
  preset: "@shelf/jest-mongodb",
  setupFilesAfterEnv: ["./jest.setup.js"],
  testEnvironment: "node",
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",
  // A list of paths to directories that Jest should use to search for files in
  roots: ["<rootDir>/src"],
  // The glob patterns Jest uses to detect test files
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: ["/node_modules/", "labor\\.test\\.js"],
  // Ensure Jest waits for async operations to complete before exiting
  forceExit: true,
  // Fix for handle leaks
  detectOpenHandles: true,
  // Increase default timeout
  testTimeout: 30000, // 30 seconds
};

module.exports = config;
