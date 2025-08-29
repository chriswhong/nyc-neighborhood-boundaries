import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test files pattern
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Test environment
    environment: 'node',
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'node_modules/',
        'coverage/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
      ]
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Reporter configuration
    reporter: ['default'],
    
    // Watch mode configuration
    watch: false,
    
    // Global test setup
    globals: true,
  }
})
