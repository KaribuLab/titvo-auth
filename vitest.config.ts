import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Restrict discovery to this repo's own test/ dir — the `shared` git
    // submodule ships its own vitest suite (with its own @shared alias)
    // that must not be picked up when running titvo-auth's suite.
    include: ['test/**/*.spec.ts'],
    exclude: ['node_modules', 'shared/**', 'dist', 'build']
  },
  resolve: {
    alias: {
      '@auth': resolve(__dirname, 'src')
    }
  }
})
