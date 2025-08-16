const fs = require("node:fs")
const { mkdir, rm } = require("node:fs/promises")
const path = require("node:path")
const { runCommand } = require("./utilities")

/**
 * Clones or updates a Git repository
 */
async function cloneOrUpdateRepo(options) {
  const { repoUrl, targetPath, ref, rootDir } = options
  const relativePath = path.relative(rootDir, targetPath)

  if (fs.existsSync(targetPath)) {
    console.log(`Repository already exists at ${relativePath}. Fetching updates...`)
    runCommand("git fetch --all --tags --prune", targetPath, rootDir)
  } else {
    console.log(`Cloning ${repoUrl} (ref: ${ref}) into ${relativePath}...`)
    await mkdir(path.dirname(targetPath), { recursive: true })
    runCommand(`git clone --no-checkout ${repoUrl} ${targetPath}`, rootDir, rootDir)
  }
}

/**
 * Checks out a specific Git reference
 */
function checkoutRef(options) {
  const { repoPath, ref, isTag, rootDir } = options
  const relativePath = path.relative(rootDir, repoPath)
  console.log(`Checking out ${isTag ? "tag" : "branch"}: ${ref} in ${relativePath}`)
  runCommand(`git checkout -f ${ref}`, repoPath, rootDir)
  runCommand("git clean -fdx", repoPath, rootDir)
}

/**
 * Prepares Git repository for a single version
 */
async function prepareVersionRepo(version, buildContext) {
  const versionClonePath = path.join(buildContext.tempDir, version.id)

  try {
    await cloneOrUpdateRepo({
      repoUrl: buildContext.config.specRepoUrl,
      targetPath: versionClonePath,
      ref: version.ref,
      rootDir: buildContext.rootDir,
    })
    checkoutRef({
      repoPath: versionClonePath,
      ref: version.ref,
      isTag: version.isTag,
      rootDir: buildContext.rootDir,
    })
  } catch {
    console.error(`--- Error during Git operations for version ${version.label}. Skipping. ---`)
  }
}

/**
 * Performs all Git operations for the build
 */
async function performGitOperations(buildContext) {
  console.log(`\nCleaning up old temporary directory: ${path.relative(buildContext.rootDir, buildContext.tempDir)}...`)

  try {
    await rm(buildContext.tempDir, { recursive: true, force: true })
    await mkdir(buildContext.tempDir, { recursive: true })
  } catch (err) {
    console.error(`Error cleaning temp directory: ${err.message}`)
  }

  for (const version of buildContext.config.versions) {
    console.log(`\n--- Preparing source for version: ${version.label} (ref: ${version.ref}) ---`)
    await prepareVersionRepo(version, buildContext)
  }

  console.log("\n--- Finished Git Operations ---")
}

module.exports = {
  cloneOrUpdateRepo,
  checkoutRef,
  prepareVersionRepo,
  performGitOperations,
}
