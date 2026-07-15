import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // react-three-fiber's imperative escape hatches (useFrame / useLayoutEffect mutating three.js
    // objects — cameras, materials, object transforms) are the library's idiomatic pattern; the
    // mutated objects are GPU-side three instances, never React state. The React-Compiler
    // immutability rule cannot distinguish these, so it is scoped OFF for the 3D bench only.
    files: ['src/components/bench3d/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
])
