import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import react from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'src-tauri/target', '.tauri'],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/incompatible-library': 'off', // Allow TanStack Table and React Hook Form
      'react-hooks/set-state-in-effect': 'off', // Too strict: flags valid init-from-storage and prop-sync patterns
      'react-hooks/purity': 'off', // Too strict: flags valid impure calls outside render path
      'react-refresh/only-export-components': 'off', // Allow exporting utilities with components
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' type when necessary
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'max-len': [
        'error',
        {
          code: 120,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: false,
          ignoreTemplateLiterals: false,
          ignoreRegExpLiterals: true,
          ignoreComments: false,
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
)
