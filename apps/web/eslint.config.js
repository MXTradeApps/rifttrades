import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
    globalIgnores(['node_modules', 'dist', 'build', 'coverage', '**/*.min.js']),
    {
        files: ['**/*.{js,jsx}'],
        extends: [
            js.configs.recommended,
            reactHooks.configs['recommended-latest'],
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.jest,
            },
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        rules: {
            'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
        },
    },
    {
        // Node.js build/utility scripts run outside the browser.
        files: ['scripts/**/*.{js,mjs,cjs}', '*.config.js'],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'no-case-declarations': 'off',
        },
    },
    {
        // Test files and Jest setup run in Node.
        files: ['tests/**/*.{js,jsx}', '__mocks__/**/*.js', 'src/setupTests.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
    },
    {
        // Context and hook modules intentionally export a provider alongside its hook.
        files: ['src/contexts/**/*.jsx', 'src/hooks/**/*.jsx', 'src/main.jsx'],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },
])
