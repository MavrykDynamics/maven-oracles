module.exports = {
  testEnvironment: 'node',
  // silent: true,
  verbose: false,
  clearMocks: true,
  rootDir: '..',
  testEnvironmentOptions: { url: 'http://localhost/' },
  testMatch: ['**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: '<rootDir>/temp/coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.module.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/test/**',
    '!src/**/__tests__/**',
    '!src/**/__fixtures__/**',
    '!src/**/__mocks__/**'
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  transformIgnorePatterns: [],
  // The modulePathIgnorePatterns below accepts these sorts of paths:
  //   - src
  //   - src/file.ts
  // ...and ignores anything else under <rootDir>
  modulePathIgnorePatterns: [],
  // Prefer .cjs to .js to catch explicit commonjs output. Optimize for local files, which will be .ts or .tsx
  moduleFileExtensions: ['ts', 'tsx', 'cjs', 'js', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts', '.es6.js'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5
    }
  },
  transform: {
    '\\.[jt]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
