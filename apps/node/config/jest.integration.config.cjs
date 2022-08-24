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
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  transform: {
    '\\.[jt]sx?$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '@libp2p/interfaces/event': '@libp2p/interfaces/dist/src/events.js',
    '@libp2p/interfaces/errors': '@libp2p/interfaces/dist/src/errors.js',
    '@libp2p/interfaces/startable': '@libp2p/interfaces/dist/src/startable.js',
    '@libp2p/crypto/keys': '@libp2p/crypto/dist/src/keys/index.js',
    'it-pair': 'it-pair/dist/src/duplex.js',
    '@libp2p/pubsub/utils': '@libp2p/pubsub/dist/src/utils.js',
    '@libp2p/record/validators': '@libp2p/record/dist/src/validators.js',
    '@libp2p/record/selectors': '@libp2p/record/dist/src/selectors.js',
    '@libp2p/utils/ip-port-to-multiaddr': '@libp2p/utils/dist/src/ip-port-to-multiaddr.js',
    '@libp2p/interface-connection/status': '@libp2p/interface-connection/dist/src/status.js',
    '@libp2p/interface-peer-store/tags': '@libp2p/interface-peer-store/dist/src/tags.js',
    '@libp2p/utils/stream-to-ma-conn': '@libp2p/utils/dist/src/stream-to-ma-conn.js',
    '@libp2p/utils/multiaddr/is-loopback': '@libp2p/utils/dist/src/multiaddr/is-loopback.js',
    '@multiformats/multiaddr/resolvers': '@multiformats/multiaddr/dist/src/resolvers/index.js',
    '@libp2p/utils': '@libp2p/utils/dist/src/address-sort.js',
    '@libp2p/interface-connection-encrypter': '@libp2p/interface-connection-encrypter/dist/src/errors.js'
  }
};
