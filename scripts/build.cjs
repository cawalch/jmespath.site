const fs = require("node:fs")
const path = require("node:path")

// Import modules
const { loadBuildConfig } = require("./lib/constants")
const { setupOutputDirectory } = require("./lib/file-operations")
const { performGitOperations } = require("./lib/git-operations")
const { bundleJavaScript, copyStaticAssets } = require("./lib/asset-management")
const { configureMarked } = require("./lib/content-processing")
const { processVersions, writeVersionsFile } = require("./lib/version-processing")

// Dynamic import for marked (ES module)
let marked

// Load config
const { config, rootDir, tempDir, outputDir, srcDir } = loadBuildConfig(__dirname)

/**
 * Performs the documentation build process.
 */
async function performBuildProcess(buildContext) {
  console.log("\nStarting documentation build...")

  await setupOutputDirectory(buildContext)
  const allVersionsData = await processVersions(buildContext, marked)
  await bundleJavaScript(buildContext)
  await copyStaticAssets(buildContext)
  await writeVersionsFile(buildContext, allVersionsData)

  console.log("\n--- Running Post-processing Steps (if any) ---")
  console.log("\nDocumentation build finished successfully!")
  console.log(`Output available in: ${path.relative(buildContext.rootDir, buildContext.outputDir)}`)
}

/**
 * Parses command line arguments
 */
function parseArgs(args) {
  const gitOnly = args.includes("--git-only")
  const buildOnly = args.includes("--build-only") || args.includes("--skip-git")
  const help = args.includes("--help") || args.includes("-h")

  if (gitOnly && buildOnly) {
    console.error("--- Error: Cannot use --git-only and --build-only together. ---")
    process.exit(1)
  }
  return { gitOnly, buildOnly, help }
}

/**
 * Shows help message
 */
function showHelp(scriptPath, currentRootDir) {
  console.log(`
Usage: node ${path.relative(currentRootDir, scriptPath)} [options]

Builds the documentation site by cloning/updating source repositories and processing Markdown files.

Options:
  --git-only      Only perform the Git clone/update and checkout steps. Skip the build process.
  --build-only    Only perform the build process (Markdown to HTML, copy assets). Assumes source
                  repositories are already present in the temporary directory (--tempDir).
                  Equivalent to --skip-git.
  --skip-git      Alias for --build-only.
  --help, -h      Show this help message and exit.

If no options are specified, both Git operations and the full build process are performed (default behavior).
`)
}

/**
 * Executes the main build steps
 */
async function executeBuildSteps(options, buildContext) {
  const { gitOnly, buildOnly } = options
  const shouldRunGit = !buildOnly
  const shouldRunBuild = !gitOnly

  console.log("\n--- Running Pre-processing Steps (if any) ---")

  if (shouldRunGit) {
    await performGitOperations(buildContext)
  } else {
    console.log("\n--- Skipping Git Operations ---")
    if (shouldRunBuild && !fs.existsSync(buildContext.tempDir)) {
      const relativePath = path.relative(buildContext.rootDir, buildContext.tempDir)
      console.error(`--- Error: --build-only used, but temp dir missing: ${relativePath} ---`)
      process.exit(1)
    }
  }

  if (shouldRunBuild) {
    await performBuildProcess(buildContext)
  } else {
    console.log("\n--- Skipping Documentation Build ---")
  }

  if (!shouldRunGit && !shouldRunBuild) {
    console.log("No actions specified. Use --help for usage.")
  }
}

/**
 * Main execution function.
 */
async function main() {
  // Dynamic import for marked (ES module)
  const markedModule = await import("marked")
  marked = markedModule.marked

  // Configure marked
  configureMarked(marked)

  const args = process.argv.slice(2)
  const options = parseArgs(args)

  const buildContext = {
    config,
    tempDir,
    outputDir,
    srcDir,
    rootDir,
  }

  if (options.help) {
    showHelp(__filename, buildContext.rootDir)
    process.exit(0)
  }

  try {
    await executeBuildSteps(options, buildContext)
  } catch (error) {
    console.error("\nProcess failed:", error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
