#!/usr/bin/env node

/**
 * Test runner script for local development and CI
 * Provides unified interface for running different types of tests
 */

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

const commands = {
  unit: "vitest run",
  "unit:watch": "vitest",
  "unit:ui": "vitest --ui",
  "unit:coverage": "vitest run --coverage",
  e2e: "playwright test",
  "e2e:ui": "playwright test --ui",
  "e2e:headed": "playwright test --headed",
  all: "npm run test:unit && npm run test:e2e",
  lint: "biome check .",
  "lint:fix": "biome check --write .",
  build: "node scripts/build.cjs",
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const [cmd, ...cmdArgs] = command.split(" ")
    const child = spawn(cmd, [...cmdArgs, ...args], {
      stdio: "inherit",
      shell: true,
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with exit code ${code}`))
      }
    })

    child.on("error", (error) => {
      reject(error)
    })
  })
}

async function checkPrerequisites() {
  const checks = [
    {
      name: "Node.js",
      check: () => process.version,
      required: true,
    },
    {
      name: "package.json",
      check: () => existsSync("package.json"),
      required: true,
    },
    {
      name: "node_modules",
      check: () => existsSync("node_modules"),
      required: true,
      hint: 'Run "npm install" to install dependencies',
    },
    {
      name: "Playwright browsers",
      check: () => existsSync("node_modules/@playwright/test"),
      required: false,
      hint: 'Run "npx playwright install" to install browsers for E2E tests',
    },
  ]

  console.log("🔍 Checking prerequisites...")

  for (const check of checks) {
    const result = check.check()
    if (result) {
      console.log(`✅ ${check.name}: OK`)
    } else {
      console.log(`${check.required ? "❌" : "⚠️"} ${check.name}: ${check.required ? "MISSING" : "Not available"}`)
      if (check.hint) {
        console.log(`   💡 ${check.hint}`)
      }
      if (check.required) {
        process.exit(1)
      }
    }
  }

  console.log("")
}

function showHelp() {
  console.log(`
🧪 JMESPath Site Test Runner

Usage: node scripts/test-runner.js <command> [options]

Commands:
  unit              Run unit tests once
  unit:watch        Run unit tests in watch mode
  unit:ui           Run unit tests with UI
  unit:coverage     Run unit tests with coverage report
  e2e               Run end-to-end tests
  e2e:ui            Run E2E tests with UI
  e2e:headed        Run E2E tests in headed mode (visible browser)
  all               Run all tests (unit + e2e)
  lint              Check code quality
  lint:fix          Fix code quality issues
  build             Build the site
  help              Show this help message

Examples:
  node scripts/test-runner.js unit
  node scripts/test-runner.js unit:coverage
  node scripts/test-runner.js e2e --project=chromium
  node scripts/test-runner.js all

Options are passed through to the underlying test runners.
`)
}

async function main() {
  const [, , command, ...args] = process.argv

  if (!command || command === "help" || command === "--help" || command === "-h") {
    showHelp()
    return
  }

  if (!commands[command]) {
    console.error(`❌ Unknown command: ${command}`)
    console.error(`Available commands: ${Object.keys(commands).join(", ")}`)
    process.exit(1)
  }

  await checkPrerequisites()

  console.log(`🚀 Running: ${command}`)
  console.log(`📝 Command: ${commands[command]}`)

  if (args.length > 0) {
    console.log(`🔧 Args: ${args.join(" ")}`)
  }

  console.log("")

  try {
    const startTime = Date.now()
    await runCommand(commands[command], args)
    const duration = Date.now() - startTime
    console.log(`\n✅ Command completed successfully in ${duration}ms`)
  } catch (error) {
    console.error(`\n❌ Command failed: ${error.message}`)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error)
  process.exit(1)
})

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
