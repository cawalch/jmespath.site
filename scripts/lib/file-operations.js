const fs = require("node:fs")
const { mkdir, rm, readdir, copyFile } = require("node:fs/promises")
const { globSync } = require("node:fs")
const path = require("node:path")

/**
 * Finds files matching globs within a base path.
 * @param {object} findOptions - Options for finding files.
 * @param {string} findOptions.basePath - Absolute path to the directory to search.
 * @param {string[]} findOptions.includeGlobs - Array of glob patterns to include files.
 * @param {string[]} [findOptions.excludeGlobs=[]] - Array of glob patterns to exclude files.
 * @param {object} buildContext - The build context containing rootDir for logging.
 * @returns {string[]} - Array of matched file paths relative to basePath, sorted.
 */
function findFiles(findOptions, buildContext) {
  const { basePath, includeGlobs, excludeGlobs = [] } = findOptions
  const { rootDir } = buildContext

  let effectiveIncludeGlobs = includeGlobs
  if (!Array.isArray(effectiveIncludeGlobs)) {
    console.warn(
      `Warning: includeGlobs is not an array for path ${path.relative(rootDir, basePath)}. Using empty array.`,
    )
    effectiveIncludeGlobs = []
  }

  if (fs.existsSync(basePath) && effectiveIncludeGlobs.length === 0) {
    console.warn(
      `Warning: No includeGlobs provided for existing path ${path.relative(rootDir, basePath)}. No files will be matched.`,
    )
    return []
  }
  console.log(
    `Searching for files in ${path.relative(rootDir, basePath)} matching: ${effectiveIncludeGlobs.join(", ")}`,
  )
  const options = {
    cwd: basePath,
    nodir: true,
    dot: false,
    ignore: excludeGlobs || [],
  }
  try {
    const files = globSync(effectiveIncludeGlobs, options)
    console.log(`Found ${files.length} files.`)
    files.sort()
    return files
  } catch (error) {
    console.error(`Error during glob search in ${basePath}: ${error.message}`)
    return []
  }
}

/**
 * Copies static assets from a source directory to a target directory.
 * @param {object} copyOptions - Options for copying.
 * @param {string} copyOptions.sourceDir - The source directory.
 * @param {string} copyOptions.targetDir - The target directory.
 * @param {string[]} [copyOptions.excludeExtensions] - File extensions to exclude.
 * @param {object} buildContext - The build context for logging.
 */
async function copyStaticAssetsInDir(copyOptions, buildContext) {
  const { sourceDir, targetDir } = copyOptions
  const excludeExtensions = copyOptions.excludeExtensions || [".md"]

  await mkdir(targetDir, { recursive: true })

  const entries = await readdir(sourceDir, { withFileTypes: true })
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name)
    const targetPath = path.join(targetDir, entry.name)

    if (entry.isDirectory()) {
      await copyStaticAssetsInDir({ sourceDir: sourcePath, targetDir: targetPath, excludeExtensions }, buildContext)
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (!excludeExtensions.includes(ext)) {
        await copyFile(sourcePath, targetPath)
        console.log(
          `   Copied: ${path.relative(buildContext.rootDir, sourcePath)} -> ${path.relative(buildContext.rootDir, targetPath)}`,
        )
      }
    }
  }
}

/**
 * Sets up the output directory, cleaning it if it exists and is a directory.
 */
async function setupOutputDirectory(buildContext) {
  console.log(`Cleaning up old output directory: ${path.relative(buildContext.rootDir, buildContext.outputDir)}...`)
  const outputDirExists = fs.existsSync(buildContext.outputDir)
  if (outputDirExists) {
    const stats = fs.statSync(buildContext.outputDir)
    if (!stats.isDirectory()) {
      console.error(`--- Error: Output path conflicts with an existing file: ${buildContext.outputDir} ---`)
      console.error("--- Please remove or rename this file and retry. ---")
      throw new Error("Output path conflicts with a file.")
    }
    console.log(
      `Output directory ${path.relative(buildContext.rootDir, buildContext.outputDir)} exists. Cleaning contents...`,
    )
    const contents = await readdir(buildContext.outputDir)
    if (contents.length > 0) {
      console.log(
        `Removing ${contents.length} items from ${path.relative(buildContext.rootDir, buildContext.outputDir)}...`,
      )
      await Promise.all(
        contents.map((item) =>
          rm(path.join(buildContext.outputDir, item), {
            recursive: true,
            force: true,
          }),
        ),
      )
      console.log("Contents cleaned.")
    } else {
      console.log("Output directory is already empty.")
    }
  } else {
    console.log(`Creating output directory: ${path.relative(buildContext.rootDir, buildContext.outputDir)}`)
    await mkdir(buildContext.outputDir, { recursive: true })
  }
}

module.exports = {
  findFiles,
  copyStaticAssetsInDir,
  setupOutputDirectory,
}
