import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettierConfig from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import perfectionist from 'eslint-plugin-perfectionist'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist-electron/**',
      'next-env.d.ts',
      'node_modules/**',
      'electron/**',
      'src-backup/**',
      'electron-test.js',
    ],
  },

  // 基础 Next.js 配置
  ...nextVitals,
  ...nextTs,

  // Prettier 集成（必须在最后）
  prettierConfig,

  // Import 排序和规则
  {
    plugins: {
      import: importPlugin,
      perfectionist,
    },
    rules: {
      // Import 排序规则
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          ignoreCase: true,
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'type'],
          newlinesBetween: 'always',
          internalPattern: ['@/**'],
        },
      ],

      // Import 风格规则
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off',
      'import/no-cycle': 'warn',
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
    },
  },
]

export default eslintConfig
