/**
 * Global test setup for Vitest
 * This file is run before all tests
 */

import fs from "node:fs"
import path from "node:path"
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest"

// Global test configuration
global.TEST_CONFIG = {
  tempDir: path.resolve("./test-temp"),
  outputDir: path.resolve("./test-output"),
  fixturesDir: path.resolve("./tests/fixtures"),
}

// Clean up test directories before and after tests
beforeAll(async () => {
  // Ensure test directories exist
  await fs.promises.mkdir(global.TEST_CONFIG.tempDir, { recursive: true })
  await fs.promises.mkdir(global.TEST_CONFIG.outputDir, { recursive: true })
})

afterAll(async () => {
  // Clean up test directories
  try {
    await fs.promises.rm(global.TEST_CONFIG.tempDir, { recursive: true, force: true })
    await fs.promises.rm(global.TEST_CONFIG.outputDir, { recursive: true, force: true })
  } catch (error) {
    // Ignore cleanup errors
    console.warn("Test cleanup warning:", error.message)
  }
})

// Mock console methods for cleaner test output
beforeEach(() => {
  // Store original console methods
  global.originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  }

  // Mock console methods to reduce noise during tests
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
})

afterEach(() => {
  // Restore original console methods
  if (global.originalConsole) {
    console.log = global.originalConsole.log
    console.warn = global.originalConsole.warn
    console.error = global.originalConsole.error
  }

  // Clear all mocks
  vi.clearAllMocks()
})

// Global test utilities
global.testUtils = {
  /**
   * Create a temporary file with content
   */
  async createTempFile(filename, content) {
    const filePath = path.join(global.TEST_CONFIG.tempDir, filename)
    const dirPath = path.dirname(filePath)

    // Ensure the directory exists
    try {
      await fs.promises.mkdir(dirPath, { recursive: true })
    } catch (error) {
      // Directory might already exist, that's okay
      if (error.code !== "EEXIST") {
        throw error
      }
    }

    await fs.promises.writeFile(filePath, content, "utf8")
    return filePath
  },

  /**
   * Read a fixture file
   */
  async readFixture(filename) {
    const filePath = path.join(global.TEST_CONFIG.fixturesDir, filename)
    return await fs.promises.readFile(filePath, "utf8")
  },

  /**
   * Check if a file exists
   */
  async fileExists(filePath) {
    try {
      await fs.promises.access(filePath)
      return true
    } catch {
      return false
    }
  },
}
