export default {
  displayName: 'server',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/server',
  testEnvironmentOptions: {
    customExportConditions: ['require', 'default', 'node'],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@scure|@noble)/)',
  ],
};
