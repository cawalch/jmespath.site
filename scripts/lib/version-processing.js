const fs = require("node:fs")
const { mkdir, rm, writeFile } = require("node:fs/promises")
const path = require("node:path")
const { VERSIONS_FILE } = require("./constants")
const { compareNavPages } = require("./utilities")
const { findFiles, copyStaticAssetsInDir } = require("./file-operations")
const { SearchProcessingState, exportSearchData } = require("./search-index")
const { processSingleMarkdownFile, determineDefaultFile } = require("./content-processing")

/**
 * Gets glob patterns for file processing based on source type
 */
function getGlobPatterns(versionConfig, fileSourceType) {
  return fileSourceType === "Spec"
    ? { includeGlobs: versionConfig.includeGlobs, excludeGlobs: versionConfig.excludeGlobs }
    : { includeGlobs: versionConfig.localIncludeGlobs || ["**/*.md"], excludeGlobs: versionConfig.localExcludeGlobs }
}

/**
 * Processes results from file processing and updates search state
 */
function processFileResults(results, searchState) {
  const processedPages = []
  let successfulCount = 0
  let failedCount = 0

  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.error === null) {
      const { searchIndexEntry, searchDocMapEntry, processedPage } = result.value
      searchState.searchIndex.add(searchIndexEntry)
      searchState.searchDocMap[searchDocMapEntry.docId] = searchDocMapEntry.mapEntry

      if (processedPage) processedPages.push(processedPage)
      successfulCount++
    } else {
      failedCount++
    }
  }

  return { processedPages, successfulCount, failedCount }
}

/**
 * Processes a list of Markdown files in parallel
 */
async function processMarkdownFiles(files, context, marked) {
  const { sourceDir, versionOutputPath, fileSourceType, searchState } = context

  if (files.length === 0) {
    console.log(`  No ${fileSourceType} files found to process.`)
    return []
  }

  console.log(`  Processing ${files.length} ${fileSourceType} files in parallel...`)

  const processingPromises = files.map((file, index) => {
    const docId = searchState.docIdCounter + index
    return processSingleMarkdownFile({
      relativeFilePath: file,
      docId,
      context: { sourceDir, versionOutputPath, fileSourceType },
      marked,
    })
  })

  const results = await Promise.allSettled(processingPromises)
  const { processedPages, successfulCount, failedCount } = processFileResults(results, searchState)

  console.log(`  Finished processing files. Successful: ${successfulCount}, Failed: ${failedCount}.`)
  searchState.updateDocId(files.length)
  return processedPages
}

/**
 * Processes files from a specific source type for a version
 */
async function _processVersionSourceFiles(options) {
  const { sourceArgs, versionConfig, buildContext, marked } = options
  const { sourceBasePath, versionOutputPath, searchState, fileSourceType } = sourceArgs

  if (!fs.existsSync(sourceBasePath)) {
    const relativePath = path.relative(buildContext.rootDir, sourceBasePath)
    console.warn(
      `--- Warning: ${fileSourceType} source path does not exist for version ${versionConfig.label}: ${relativePath}. Skipping ${fileSourceType} files. ---`,
    )
    return []
  }

  const { includeGlobs, excludeGlobs } = getGlobPatterns(versionConfig, fileSourceType)
  const files = findFiles({ basePath: sourceBasePath, includeGlobs, excludeGlobs }, buildContext)
  const context = { sourceDir: sourceBasePath, versionOutputPath, searchState, fileSourceType }

  return await processMarkdownFiles(files, context, marked)
}

/**
 * Processes a single version's documentation.
 */
async function processSingleVersion(versionConfig, buildContext, marked) {
  console.log(`\n--- Processing version: ${versionConfig.label} (ref: ${versionConfig.ref}) ---`)

  const versionClonePath = path.join(buildContext.tempDir, versionConfig.id)
  const versionOutputPath = path.join(buildContext.outputDir, versionConfig.id)

  await rm(versionOutputPath, { recursive: true, force: true })
  await mkdir(versionOutputPath, { recursive: true })

  const searchState = new SearchProcessingState()
  let versionNavPages = []

  const specSourceDir = path.join(versionClonePath, versionConfig.sourcePath || "")
  const specSourceArgs = {
    sourceBasePath: specSourceDir,
    versionOutputPath,
    searchState,
    fileSourceType: "Spec",
  }
  const specProcessedPages = await _processVersionSourceFiles({
    sourceArgs: specSourceArgs,
    versionConfig,
    buildContext,
    marked,
  })
  versionNavPages = versionNavPages.concat(specProcessedPages)

  if (versionConfig.localDocsPath) {
    const localSourceDir = path.resolve(buildContext.rootDir, versionConfig.localDocsPath)
    const localSourceArgs = {
      sourceBasePath: localSourceDir,
      versionOutputPath,
      searchState,
      fileSourceType: "Local",
    }
    const localProcessedPages = await _processVersionSourceFiles({
      sourceArgs: localSourceArgs,
      versionConfig,
      buildContext,
      marked,
    })
    versionNavPages = versionNavPages.concat(localProcessedPages)

    console.log(
      `--- Copying static assets from local docs path: ${path.relative(buildContext.rootDir, localSourceDir)}... ---`,
    )
    await copyStaticAssetsInDir({ sourceDir: localSourceDir, targetDir: versionOutputPath }, buildContext)
  }

  versionNavPages.sort(compareNavPages)
  const defaultFile = determineDefaultFile(versionNavPages)

  await exportSearchData({
    versionOutputPath,
    searchIndex: searchState.searchIndex,
    searchDocMap: searchState.searchDocMap,
  })

  return {
    id: versionConfig.id,
    label: versionConfig.label,
    pages: versionNavPages,
    defaultFile: defaultFile,
  }
}

/**
 * Processes all configured versions.
 */
async function processVersions(buildContext, marked) {
  const allVersionsData = []
  for (const version of buildContext.config.versions) {
    try {
      const versionData = await processSingleVersion(version, buildContext, marked)
      allVersionsData.push(versionData)
    } catch (error) {
      console.error(
        `\n--- Fatal Error processing version ${version.label}. Skipping this version. Error: ${error.message} ---`,
      )
    }
  }
  return allVersionsData
}

/**
 * Writes the versions.json file.
 */
async function writeVersionsFile(buildContext, allVersionsData) {
  const versionsJsonPath = path.join(buildContext.outputDir, VERSIONS_FILE)
  console.log(`Creating ${path.relative(buildContext.rootDir, versionsJsonPath)}...`)
  await writeFile(
    versionsJsonPath,
    JSON.stringify(
      {
        versions: allVersionsData,
        defaultVersionId: buildContext.config.defaultVersionId,
      },
      null,
      2,
    ),
    "utf8",
  )
}

module.exports = {
  getGlobPatterns,
  processFileResults,
  processMarkdownFiles,
  _processVersionSourceFiles,
  processSingleVersion,
  processVersions,
  writeVersionsFile,
}
