export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
    },
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
            presets: [
                '@babel/preset-env',
                ['@babel/preset-react', { runtime: 'automatic' }],
            ],
        }],
    },
    testMatch: [
        '<rootDir>/tests/**/*.{js,jsx,ts,tsx}',
    ],
    collectCoverageFrom: [
        'src/utils/trade.js',
        'src/utils/helpers.js',
        'src/utils/searchUtils.js',
        'src/utils/urlEncoding.js',
        'src/hooks/useTradeState.js',
        'src/hooks/useSearch.js',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/build/',
        '/tests/fixtures/',
    ],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
    transformIgnorePatterns: [
        '/node_modules/(?!(@mui|@babel)/)',
    ],
    testTimeout: 10000,
    verbose: true,
    passWithNoTests: true,
    collectCoverage: false,
    coverageReporters: ['text', 'lcov', 'html'],
    coverageDirectory: 'coverage',
};
