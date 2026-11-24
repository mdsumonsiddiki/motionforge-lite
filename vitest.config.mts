import { defineConfig } from 'vitest/config'

// Fast unit tests for logic only (spec: storage, backup, command validation, pose cache, OBS path).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts', 'scripts/**/*.test.mjs']
  }
})
