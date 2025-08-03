import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Test environment
    environment: "happy-dom",

    // Test files
    include: ["tests/**/*.test.js", "tests/**/*.spec.js"],
    exclude: ["tests/e2e/**/*"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "tests/**",
        "dist/**",
        "docs/**",
        "build/**",
        "coverage/**",
        "*.config.js",
        "*.config.ts",
        "scripts/**",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        // Higher thresholds for critical components
        "src/main.js": {
          branches: 75,
          functions: 50,
          lines: 40,
          statements: 40,
        },
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Setup files
    setupFiles: ["./tests/setup.js"],

    // Global test configuration
    globals: true,

    // Reporter configuration
    reporter: ["verbose", "json", "html"],
    outputFile: {
      json: "./test-results/results.json",
      html: "./test-results/index.html",
    },
  },

  // Resolve configuration for testing
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
      "@scripts": new URL("./scripts", import.meta.url).pathname,
    },
  },
})
