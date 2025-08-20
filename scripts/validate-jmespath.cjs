#!/usr/bin/env node

const path = require("node:path")
const { validateMultipleFiles, findMarkdownFiles, formatValidationResults } = require("./lib/jmespath-validation")

/**
 * Parses command line arguments
 */
function parseArgs(args) {
  const options = {
    paths: [],
    verbose: false,
    failFast: false,
    showWarnings: true,
    help: false,
    recursive: true,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case "--verbose":
      case "-v":
        options.verbose = true
        break
      case "--fail-fast":
        options.failFast = true
        break
      case "--no-warnings":
        options.showWarnings = false
        break
      case "--no-recursive":
        options.recursive = false
        break
      case "--help":
      case "-h":
        options.help = true
        break
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        } else {
          options.paths.push(arg)
        }
    }
  }

  return options
}

/**
 * Shows help message
 */
function showHelp() {
  console.log(`
Usage: node scripts/validate-jmespath.cjs [options] [paths...]

Validates JMESPath queries in markdown files with jmespath-interactive code blocks.

Arguments:
  paths...              Files or directories to validate (default: local_docs)

Options:
  -v, --verbose         Show detailed output for all files
  --fail-fast          Stop validation on first error
  --no-warnings        Don't show warnings in output
  --no-recursive       Don't recursively search directories
  -h, --help           Show this help message

Examples:
  node scripts/validate-jmespath.cjs
  node scripts/validate-jmespath.cjs local_docs/current
  node scripts/validate-jmespath.cjs --verbose local_docs/current/array_slicing_advanced_indexing.md
  node scripts/validate-jmespath.cjs --fail-fast local_docs
`)
}

/**
 * Resolves file paths from command line arguments
 */
async function resolveFilePaths(inputPaths, options) {
  const { recursive } = options
  const allFiles = []

  // Default to local_docs if no paths provided
  const pathsToProcess = inputPaths.length === 0 ? ["local_docs"] : inputPaths

  for (const inputPath of pathsToProcess) {
    const resolvedPath = path.resolve(inputPath)

    try {
      const stat = await require("node:fs/promises").stat(resolvedPath)

      if (stat.isFile()) {
        if (resolvedPath.endsWith(".md")) {
          allFiles.push(resolvedPath)
        } else {
          console.warn(`Warning: Skipping non-markdown file: ${inputPath}`)
        }
      } else if (stat.isDirectory()) {
        const foundFiles = await findMarkdownFiles(resolvedPath, { recursive })
        allFiles.push(...foundFiles)
      }
    } catch (error) {
      console.error(`Error: Cannot access path '${inputPath}': ${error.message}`)
      process.exit(1)
    }
  }

  return allFiles
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  try {
    console.log("🔍 JMESPath Documentation Validator")

    const filePaths = await resolveFilePaths(options.paths, options)

    if (filePaths.length === 0) {
      console.log("No markdown files found to validate.")
      process.exit(0)
    }

    console.log(`Found ${filePaths.length} markdown file(s) to validate`)

    if (options.verbose) {
      console.log("Files to validate:")
      for (const filePath of filePaths) {
        console.log(`  ${path.relative(process.cwd(), filePath)}`)
      }
    }

    const results = await validateMultipleFiles(filePaths, {
      verbose: options.verbose,
      failFast: options.failFast,
    })

    formatValidationResults(results, {
      verbose: options.verbose,
      showWarnings: options.showWarnings,
    })

    // Exit with error code if validation failed
    process.exit(results.success ? 0 : 1)
  } catch (error) {
    console.error(`\nValidation failed: ${error.message}`)
    if (options.verbose && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main()
}

module.exports = { main, parseArgs, showHelp, resolveFilePaths }
