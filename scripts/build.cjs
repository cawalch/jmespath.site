const fs = require("node:fs")
const { promises: fsPromises } = require("node:fs")
const { mkdir, rm, writeFile, readFile, readdir, copyFile } = fsPromises

const { globSync } = require("node:fs")
const path = require("node:path")
const { execSync } = require("node:child_process")
const { marked } = require("marked")
const { parse } = require("node-html-parser")
const grayMatter = require("gray-matter")
const FlexSearch = require("flexsearch")
const esbuild = require("esbuild")

// Playground class names
const PLAYGROUND_CLASSES = {
  container: "jmespath-playground",
  toggleButton: "playground-toggle-button",
  content: "playground-content",
  inputs: "playground-inputs",
  label: "playground-label",
  jsonInput: "json-input",
  invalidJson: "invalid-json",
  errorInline: "playground-error-inline",
  queryInput: "query-input",
  outputArea: "output-area",
  errorArea: "error-area",
  toggleIcon: "toggle-icon",
}
// Header anchor class name
const HEADER_ANCHOR_CLASS = "header-anchor"

// Preferred default file names (case-insensitive match)
const PREFERRED_DEFAULT_FILES = ["_index.html", "index.html", "spec.html", "readme.html"]

// Asset names / paths
const ASSETS_DIR = "assets"
const BUNDLE_FILE = "main.bundle.js"
const SEARCH_INDEX_FILE = "search_index.json"
const SEARCH_MAP_FILE = "search_map.json"
const VERSIONS_FILE = "versions.json"

// Load config
const configPath = path.resolve(__dirname, "../config.json")
const config = require(configPath)
const rootDir = path.resolve(__dirname, "..")
const tempDir = path.resolve(rootDir, config.tempDir)
const outputDir = path.resolve(rootDir, config.outputDir)
const srcDir = path.resolve(rootDir, "src")

/**
 * Helper function to extract text content from an HTML node, ignoring anchor tags and recursively processing children.
 * Handles text nodes and element nodes.
 */
function extractNodeText(node) {
  let text = ""
  if (node.nodeType === 3) {
    text += node.text
  } else if (node.nodeType === 1) {
    if (node.tagName.toLowerCase() !== "a") {
      for (const child of node.childNodes) {
        text += extractNodeText(child)
      }
    }
  }
  return text
}

/**
 * Extracts raw text from Markdown tokens, ignoring formatting that doesn't contribute to the text content.
 * @param {Array<object>} tokenList - Array of Marked tokens.
 * @returns {string} - The extracted raw text.
 */
function extractRawTextFromTokens(tokenList) {
  let text = ""
  if (!tokenList) return ""

  for (const token of tokenList) {
    switch (token.type) {
      case "text":
      case "codespan":
      case "strong":
      case "em":
        text += token.raw
        break
      case "link":
        text += extractRawTextFromTokens(token.tokens) || token.text || ""
        break
      case "list_item":
      case "paragraph":
        text += extractRawTextFromTokens(token.tokens)
        break
    }
  }
  return text
}

// A simple tag function for readability
const html = (strings, ...values) =>
  strings.reduce((acc, string, i) => acc + string + (values[i] === undefined ? "" : values[i]), "")

/**
 * Generates the HTML for an interactive JMESPath playground block.
 * @param {object} token - The Marked code token with lang === "jmespath-interactive".
 * @param {string} title - The title for the playground block.
 * @param {boolean} [isExpandedInitially=false] - Whether the block should be initially expanded.
 * @returns {string} - The generated HTML string.
 */
function renderJmespathInteractiveBlock(token, title, isExpandedInitially = false) {
  const rawContent = token.text
  const parts = rawContent.split(/^\s*---JMESPATH---\s*$/m)
  const initialJson = (parts[0] || "").trim()
  const initialQuery = (parts[1] || "").trim()
  let isValidJson = false
  if (initialJson) {
    try {
      JSON.parse(initialJson)
      isValidJson = true
    } catch {
      //nolint: ignore invalid JSON
    }
  }

  const uniqueSuffix = Math.random().toString(36).substring(2, 9)
  const jsonInputId = `json-input-${uniqueSuffix}`
  const queryInputId = `query-input-${uniqueSuffix}`
  const contentId = `playground-content-${uniqueSuffix}`
  const jsonWarningClass = !isValidJson && initialJson ? PLAYGROUND_CLASSES.invalidJson : ""
  const invalidJsonWarningHtml =
    !isValidJson && initialJson ? `<p class="${PLAYGROUND_CLASSES.errorInline}">Initial JSON appears invalid.</p>` : ""

  const ariaExpanded = isExpandedInitially ? "true" : "false"
  const hiddenAttribute = isExpandedInitially ? "" : " hidden"

  const displayTitle = title || "Interactive Example"

  return html` <div class="${PLAYGROUND_CLASSES.container} my-6 border rounded-lg">
    <button type="button" class="${PLAYGROUND_CLASSES.toggleButton}" aria-expanded="${ariaExpanded}" aria-controls="${contentId}">
      <span>${displayTitle}</span>
      <svg class="${PLAYGROUND_CLASSES.toggleIcon}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div id="${contentId}" class="${PLAYGROUND_CLASSES.content}${hiddenAttribute}">
      <div class="${PLAYGROUND_CLASSES.inputs}">
        <div>
          <label for="${jsonInputId}" class="${PLAYGROUND_CLASSES.label}">Input</label>
          <textarea id="${jsonInputId}" class="${PLAYGROUND_CLASSES.jsonInput} ${jsonWarningClass}" spellcheck="false">${initialJson}</textarea>
          ${invalidJsonWarningHtml}
        </div>
        <div>
          <label for="${queryInputId}" class="${PLAYGROUND_CLASSES.label}">Query</label>
          <textarea id="${queryInputId}" class="${PLAYGROUND_CLASSES.queryInput}" spellcheck="false">${initialQuery}</textarea>
        </div>
      </div>
      <div class="mt-4">
        <label class="${PLAYGROUND_CLASSES.label}">Result</label>
        <pre class="${PLAYGROUND_CLASSES.outputArea}"><code class="language-json"></code></pre>
        <div class="${PLAYGROUND_CLASSES.errorArea}"></div>
      </div>
    </div>
  </div>`
}

/**
 * Custom renderer for headings to generate more robust IDs and add anchor links.
 */
const headingRendererExtension = {
  renderer: {
    heading({ tokens, depth }) {
      const text = extractRawTextFromTokens(tokens)
      const escapedText = text
        .toLowerCase()
        .replace(/^[^a-z_]+/, "")
        .replace(/[^\w-]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "")
      const finalId = escapedText || `section-${depth}-${Math.random().toString(36).substring(2, 7)}`
      return `
<h${depth} id="${finalId}">
  ${text} <a href="#${finalId}" class="${HEADER_ANCHOR_CLASS}" aria-label="Link to this section">#</a>
</h${depth}>`
    },
  },
}

/**
 * Marked extension to handle ```jmespath-interactive code blocks
 * via the renderer hook, allowing for options like 'expanded' and an inline title.
 * Format: ```jmespath-interactive [expanded] [Your Title Here]
 */
const jmespathInteractiveExtension = {
  name: "jmespathInteractiveRenderer",
  renderer: {
    code(token) {
      if (typeof token.lang === "string" && token.lang.startsWith("jmespath-interactive")) {
        const langString = token.lang.trim()
        const baseLang = "jmespath-interactive"
        let remaining = langString.substring(baseLang.length).trim()

        let isExpanded = false
        if (remaining.startsWith("expanded")) {
          isExpanded = true
          remaining = remaining.substring("expanded".length).trim()
        }

        const title = remaining

        return renderJmespathInteractiveBlock(token, title, isExpanded)
      }
      return false
    },
  },
}

marked.setOptions({
  gfm: true,
})

marked.use(headingRendererExtension, jmespathInteractiveExtension)

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

function runCommand(command, cwd, rootDir) {
  console.log(`Executing in ${path.relative(rootDir, cwd)}: ${command}`)
  try {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    execSync(command, { stdio: "inherit", cwd, env })
  } catch (error) {
    console.error(`Error executing command: ${command}\n${error.message}`)
    throw error
  }
}

/**
 * Compares two pages based on their parent ID.
 * Pages without a parent sort before pages with a parent.
 * If both have parents, sort by parent ID alphabetically.
 */
function compareParent(a, b) {
  const aHasParent = a.parent !== undefined && a.parent !== null
  const bHasParent = b.parent !== undefined && b.parent !== null

  if (!aHasParent && bHasParent) return -1
  if (aHasParent && !bHasParent) return 1
  if (aHasParent && bHasParent) {
    // Optional: Sort by parent ID alphabetically if both have parents
    return (a.parent || "").localeCompare(b.parent || "")
  }
  return 0 // Both have no parent
}

/**
 * Compares two pages based on their navigation order.
 * Pages with a nav_order sort before pages without.
 * If both have order, sort numerically.
 */
function compareNavOrder(a, b) {
  const aHasOrder = a.nav_order !== undefined && a.nav_order !== null
  const bHasOrder = b.nav_order !== undefined && b.nav_order !== null

  if (aHasOrder && !bHasOrder) return -1
  if (!aHasOrder && bHasOrder) return 1
  if (aHasOrder && bHasOrder) {
    return Number(a.nav_order) - Number(b.nav_order)
  }
  return 0 // Both have no nav_order or equal order
}

/**
 * Compares two pages based on their title alphabetically.
 */
function compareTitle(a, b) {
  return a.title.localeCompare(b.title)
}

/**
 * Comparator function to sort navigation pages.
 * Sorts by parent presence (null/undefined first), then by parent ID,
 * then by nav_order, and finally by title.
 */
function compareNavPages(a, b) {
  const parentComparison = compareParent(a, b)
  if (parentComparison !== 0) return parentComparison

  const orderComparison = compareNavOrder(a, b)
  if (orderComparison !== 0) return orderComparison

  return compareTitle(a, b)
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

/**
 * Determines the default file for a version based on preferred names.
 */
function determineDefaultFile(versionNavPages) {
  let defaultFile = PREFERRED_DEFAULT_FILES[0]
  for (const pref of PREFERRED_DEFAULT_FILES) {
    const foundPage = versionNavPages.find((p) => p.file.toLowerCase() === pref)
    if (foundPage) {
      defaultFile = foundPage.file
      break
    }
  }
  if (
    defaultFile === PREFERRED_DEFAULT_FILES[0] &&
    versionNavPages.length > 0 &&
    !versionNavPages.some((p) => p.file.toLowerCase() === PREFERRED_DEFAULT_FILES[0])
  ) {
    defaultFile = versionNavPages[0].file
  }
  return defaultFile
}

/**
 * Exports the search index and map to JSON files.
 */
async function exportSearchData({ versionOutputPath, searchIndex, searchDocMap }) {
  console.log("  Exporting search index and map...")
  const searchIndexPath = path.join(versionOutputPath, SEARCH_INDEX_FILE)
  const searchMapPath = path.join(versionOutputPath, SEARCH_MAP_FILE)
  const indexExports = {}
  try {
    searchIndex.export((key, data) => {
      if (data !== undefined && data !== null) indexExports[key] = data
    })
    if (Object.keys(indexExports).length > 0) {
      await writeFile(searchIndexPath, JSON.stringify(indexExports, null, 0), "utf8")
      console.log(`    Search index saved to ${SEARCH_INDEX_FILE}`)
    } else {
      console.warn("    Search index export resulted in empty data. No index file written.")
    }
    await writeFile(searchMapPath, JSON.stringify(searchDocMap, null, 2), "utf8")
    console.log(`    Search map saved to ${SEARCH_MAP_FILE}`)
  } catch (exportError) {
    console.error(`    Error exporting search data: ${exportError.message}`)
    throw exportError
  }
}

class SearchProcessingState {
  constructor() {
    this.searchIndex = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "content", "sections_text"],
      },
      tokenize: "forward",
    })
    this.searchDocMap = {}
    this.docIdCounter = 0
  }

  updateDocId(count) {
    this.docIdCounter += count
  }
}

/**
 * Parses an HTML string using node-html-parser and handles potential errors.
 */
function parseHtmlString(htmlString, identifier) {
  try {
    const root = parse(htmlString)
    if (!root || typeof root.querySelector !== "function") {
      console.warn(`    HTML parsing failed for: ${identifier}.`)
      return null
    }
    return root
  } catch (parseError) {
    console.error(`    Error during HTML parsing for ${identifier}: ${parseError.message}`)
    return null
  }
}

/**
 * Extracts the title from the first H1 element in the parsed HTML root.
 */
function extractTitleFromHtml(root, fallbackTitle) {
  const h1Element = root.querySelector("h1")
  if (h1Element) {
    const extractedTitle = extractNodeText(h1Element)
    return extractedTitle.trim() || fallbackTitle
  }
  return fallbackTitle
}

/**
 * Extracts section headers (h2-h6) with their IDs and text from the parsed HTML root.
 */
function extractSectionsFromHtml(root, identifier) {
  const sections = []
  const headers = root.querySelectorAll("h2[id], h3[id], h4[id], h5[id], h6[id]")
  if (headers && typeof headers[Symbol.iterator] === "function") {
    for (const header of headers) {
      const id = header.getAttribute("id")
      const level = Number.parseInt(header.tagName.substring(1), 10)
      let headerText = extractNodeText(header)
      headerText = headerText.trim()

      if (id && headerText) sections.push({ id, text: headerText, level })
    }
  } else {
    console.warn(`    Could not iterate over headers in: ${identifier}`)
  }
  return sections
}

/**
 * Removes elements with the playground class from the parsed HTML root.
 */
function removePlaygroundsFromHtml(root, identifier) {
  const playgrounds = root.querySelectorAll(`.${PLAYGROUND_CLASSES.container}`)
  if (playgrounds && typeof playgrounds[Symbol.iterator] === "function") {
    let removedCount = 0
    for (const el of playgrounds) {
      el.remove()
      removedCount++
    }
    if (removedCount > 0) {
      console.log(`    Removed ${removedCount} playground(s) before text extraction for: ${identifier}`)
    }
  }
}

/**
 * Extracts text content from the parsed HTML root.
 */
function extractTextFromHtml(root) {
  return root.structuredText || root.textContent || ""
}

/**
 * Extracts front matter, markdown body, and processes markdown into HTML.
 */
function _extractContentAndProcess(rawFileContent, relativeFilePath) {
  let frontMatter = {}
  let markdownBody = rawFileContent
  try {
    const parsed = grayMatter(rawFileContent)
    frontMatter = parsed.data || {}
    markdownBody = parsed.content
  } catch (e) {
    console.warn(`    Could not parse front matter for ${relativeFilePath}. Error: ${e.message}`)
  }

  const fallbackTitle = path
    .basename(relativeFilePath, ".md")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())

  const htmlContent = marked.parse(markdownBody)
  const root = parseHtmlString(htmlContent, relativeFilePath)

  let pageTitle = fallbackTitle
  let sections = []
  let textContent = markdownBody

  if (root) {
    pageTitle = extractTitleFromHtml(root, fallbackTitle)
    sections = extractSectionsFromHtml(root, relativeFilePath)
    removePlaygroundsFromHtml(root, relativeFilePath)
    textContent = extractTextFromHtml(root)
  } else {
    console.warn(
      `    Using fallback title "${fallbackTitle}" and raw markdown text for search for ${relativeFilePath} due to parsing failure.`,
    )
  }

  // Extract ID and parent from front matter for navigation
  const id = frontMatter.id
  const parent = frontMatter.parent

  return {
    frontMatter,
    htmlContent,
    pageTitle,
    textContent,
    sections,
    id, // Return extracted ID
    parent, // Return extracted parent
  }
}

/**
 * Prepares the data needed for search index entries, search map entries, and navigation pages.
 * @param {object} params - Parameters for preparing data.
 * @param {number} params.docId - The document ID for this file.
 * @param {string} params.pageTitle - The extracted/derived page title.
 * @param {string} params.textContent - The extracted text content for search.
 * @param {Array} params.sections - Extracted section data.
 * @param {object} params.frontMatter - Parsed front matter data.
 * @param {string} params.outputFileName - The output HTML file name.
 * @param {string} params.relativeFilePath - The original relative Markdown file path.
 * @param {string} params.pageId - The extracted/derived page ID.
 * @param {string | undefined} params.pageParent - The extracted parent ID.
 * @returns {{searchIndexEntry: object, searchDocMapEntry: object, processedPage: object | null}}
 */
function _prepareSearchAndNavData(params) {
  const { docId, pageTitle, textContent, sections, frontMatter, outputFileName, relativeFilePath, pageId, pageParent } =
    params

  // Use the extracted ID or default to relative path without extension
  const finalId = pageId || relativeFilePath.replace(/\.md$/, "").replace(/\\/g, "/")
  const finalTitle = frontMatter.title || pageTitle
  const finalParent = pageParent // Use the extracted parent
  const isObsoleted =
    frontMatter?.obsoleted_by ||
    frontMatter?.status?.toLowerCase() === "obsoleted" ||
    frontMatter?.status?.toLowerCase() === "superseded"
  const sectionsText = sections.map((s) => s.text).join(" ")

  const searchIndexEntry = {
    id: docId, // FlexSearch uses a numeric ID; the human-readable ID is for navigation/mapping
    title: finalTitle,
    content: textContent,
    sections_text: sectionsText,
    isObsoleted: isObsoleted,
  }

  const searchDocMapEntry = {
    docId: docId,
    mapEntry: {
      title: finalTitle,
      href: outputFileName,
      sections: sections,
      isObsoleted: isObsoleted,
      // No need for ID/parent in search map, it maps docId to page info
    },
  }

  let processedPage = null
  if (isObsoleted) {
    console.log(`    Skipping nav for obsoleted: ${relativeFilePath}`)
  } else {
    const navTitle = frontMatter.nav_label || finalTitle
    processedPage = {
      id: finalId,
      file: outputFileName,
      title: navTitle,
      nav_order: frontMatter.nav_order,
      parent: finalParent,
    }
  }

  return { searchIndexEntry, searchDocMapEntry, processedPage }
}

/**
 * Processes a single Markdown file asynchronously.
 * @param {string} relativeFilePath - File path relative to sourceDir.
 * @param {number} docId - The document ID to use for search indexing.
 * @param {{sourceDir: string, versionOutputPath: string, fileSourceType: string}} context - Context for file processing.
 * @returns {Promise<{searchIndexEntry: object | null, searchDocMapEntry: object | null, processedPage: object | null, error: Error | null}>}
 */
async function processSingleMarkdownFile(relativeFilePath, docId, context) {
  const { sourceDir, versionOutputPath, fileSourceType } = context
  const sourceFilePath = path.join(sourceDir, relativeFilePath)
  const outputFileName = relativeFilePath.replace(/\.md$/, ".html")
  const outputFilePath = path.join(versionOutputPath, outputFileName)

  console.log(`  Processing ${fileSourceType} file: ${relativeFilePath} (Doc ID: ${docId})`)

  try {
    await mkdir(path.dirname(outputFilePath), { recursive: true })

    const rawFileContent = await readFile(sourceFilePath, "utf-8")
    // Pass extracted ID and parent from front matter
    const {
      frontMatter,
      htmlContent,
      pageTitle,
      textContent,
      sections,
      id: pageId,
      parent: pageParent,
    } = _extractContentAndProcess(rawFileContent, relativeFilePath)

    const prepParams = {
      docId,
      pageTitle,
      textContent,
      sections,
      frontMatter,
      outputFileName,
      relativeFilePath,
      pageId,
      pageParent,
    }
    const { searchIndexEntry, searchDocMapEntry, processedPage } = _prepareSearchAndNavData(prepParams)

    await writeFile(outputFilePath, htmlContent)

    return { searchIndexEntry, searchDocMapEntry, processedPage, error: null }
  } catch (processError) {
    console.error(`    Failed processing file ${relativeFilePath}: ${processError.message}`)
    return {
      searchIndexEntry: null,
      searchDocMapEntry: null,
      processedPage: null,
      error: processError,
    }
  }
}

/**
 * Processes a list of Markdown files from a given source directory (in parallel).
 * @param {string[]} files - Array of file paths relative to sourceDir.
 * @param {{sourceDir: string, versionOutputPath: string, fileSourceType: string, searchState: SearchProcessingState}} context - Context object.
 * @returns {Promise<Array>} - Array of processed pages suitable for navigation.
 */
async function processMarkdownFiles(files, context) {
  const { sourceDir, versionOutputPath, fileSourceType, searchState } = context

  if (files.length === 0) {
    console.log(`  No ${fileSourceType} files found to process.`)
    return []
  }

  console.log(`  Processing ${files.length} ${fileSourceType} files in parallel...`)

  const filesWithIds = files.map((file, index) => ({
    relativeFilePath: file,
    docId: searchState.docIdCounter + index,
  }))

  const processingPromises = filesWithIds.map(({ relativeFilePath, docId }) =>
    processSingleMarkdownFile(relativeFilePath, docId, {
      sourceDir,
      versionOutputPath,
      fileSourceType,
    }),
  )

  const results = await Promise.allSettled(processingPromises)

  const processedPages = []
  let successfulCount = 0
  let failedCount = 0

  for (const result of results) {
    if (result.status === "fulfilled" && result.value && result.value.error === null) {
      const { searchIndexEntry, searchDocMapEntry, processedPage } = result.value
      searchState.searchIndex.add(searchIndexEntry)
      searchState.searchDocMap[searchDocMapEntry.docId] = searchDocMapEntry.mapEntry
      if (processedPage) {
        processedPages.push(processedPage)
      }
      successfulCount++
    } else {
      failedCount++
    }
  }

  console.log(`  Finished processing files. Successful: ${successfulCount}, Failed: ${failedCount}.`)
  searchState.updateDocId(files.length)
  return processedPages
}

/**
 * Clones or updates a Git repository.
 * @param {object} repoDetails - Details of the repository.
 * @param {string} repoDetails.repoUrl - The URL of the Git repository.
 * @param {string} repoDetails.targetPath - The path where the repository should be.
 * @param {string} repoDetails.ref - The Git reference (branch or tag).
 * @param {object} buildContext - The build context containing rootDir.
 */
async function cloneOrUpdateRepo(repoDetails, buildContext) {
  const { repoUrl, targetPath, ref } = repoDetails
  const { rootDir } = buildContext

  if (fs.existsSync(targetPath)) {
    console.log(`Repository already exists at ${path.relative(rootDir, targetPath)}. Fetching updates...`)
    runCommand("git fetch --all --tags --prune", targetPath, rootDir)
  } else {
    console.log(`Cloning ${repoUrl} (ref: ${ref}) into ${path.relative(rootDir, targetPath)}...`)
    await mkdir(path.dirname(targetPath), { recursive: true })
    runCommand(`git clone --no-checkout ${repoUrl} ${targetPath}`, rootDir, rootDir)
  }
}

/**
 * Checks out a specific Git reference.
 * @param {object} checkoutDetails - Details for checkout.
 * @param {string} checkoutDetails.repoPath - Path to the repository.
 * @param {string} checkoutDetails.ref - The Git reference to checkout.
 * @param {boolean} checkoutDetails.isTag - Whether the ref is a tag.
 * @param {object} buildContext - The build context containing rootDir.
 */
function checkoutRef(checkoutDetails, buildContext) {
  const { repoPath, ref, isTag } = checkoutDetails
  const { rootDir } = buildContext

  console.log(`Checking out ${isTag ? "tag" : "branch"}: ${ref} in ${path.relative(rootDir, repoPath)}`)
  runCommand(`git checkout -f ${ref}`, repoPath, rootDir)
  runCommand("git clean -fdx", repoPath, rootDir)
}

async function performGitOperations(buildContext) {
  console.log(`\nCleaning up old temporary directory: ${path.relative(buildContext.rootDir, buildContext.tempDir)}...`)
  try {
    await rm(buildContext.tempDir, { recursive: true, force: true })
    await mkdir(buildContext.tempDir, { recursive: true })
  } catch (err) {
    console.error(
      `Error cleaning temp directory ${path.relative(buildContext.rootDir, buildContext.tempDir)}: ${err.message}`,
    )
  }

  for (const version of buildContext.config.versions) {
    console.log(`\n--- Preparing source for version: ${version.label} (ref: ${version.ref}) ---`)
    const versionClonePath = path.join(buildContext.tempDir, version.id)
    try {
      const repoDetails = {
        repoUrl: buildContext.config.specRepoUrl,
        targetPath: versionClonePath,
        ref: version.ref,
      }
      await cloneOrUpdateRepo(repoDetails, buildContext)

      const checkoutDetails = {
        repoPath: versionClonePath,
        ref: version.ref,
        isTag: version.isTag,
      }
      checkoutRef(checkoutDetails, buildContext)
    } catch {
      console.error(`--- Error during Git operations for version ${version.label}. Skipping. ---`)
    }
  }
  console.log("\n--- Finished Git Operations ---")
}

/**
 * Helper to process files from a specific source type (Spec or Local) for a version.
 * @param {object} sourceArgs - Arguments specific to this source processing.
 * @param {string} sourceArgs.sourceBasePath - Absolute path to the source directory.
 * @param {string} sourceArgs.versionOutputPath - Absolute path to the version's output directory.
 * @param {SearchProcessingState} sourceArgs.searchState - Mutable search state instance.
 * @param {string} sourceArgs.fileSourceType - Label for the source type ("Spec" or "Local").
 * @param {object} versionConfig - The configuration object for the version.
 * @param {BuildContext} buildContext - The overall build context.
 * @returns {Promise<Array>} - Array of processed pages for navigation.
 */
async function _processVersionSourceFiles(sourceArgs, versionConfig, buildContext) {
  const { sourceBasePath, versionOutputPath, searchState, fileSourceType } = sourceArgs

  const { includeGlobs, excludeGlobs } =
    fileSourceType === "Spec"
      ? {
          includeGlobs: versionConfig.includeGlobs,
          excludeGlobs: versionConfig.excludeGlobs,
        }
      : {
          includeGlobs: versionConfig.localIncludeGlobs || ["**/*.md"],
          excludeGlobs: versionConfig.localExcludeGlobs,
        }

  if (!fs.existsSync(sourceBasePath)) {
    console.warn(
      `--- Warning: ${fileSourceType} source path does not exist for version ${versionConfig.label}: ${path.relative(buildContext.rootDir, sourceBasePath)}. Skipping ${fileSourceType} files. ---`,
    )
    return []
  }

  const files = findFiles({ basePath: sourceBasePath, includeGlobs, excludeGlobs }, buildContext)
  const context = {
    sourceDir: sourceBasePath,
    versionOutputPath,
    searchState: searchState,
    fileSourceType,
  }
  return await processMarkdownFiles(files, context)
}

/**
 * Processes a single version's documentation.
 */
async function processSingleVersion(versionConfig, buildContext) {
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
  const specProcessedPages = await _processVersionSourceFiles(specSourceArgs, versionConfig, buildContext)
  versionNavPages = versionNavPages.concat(specProcessedPages)

  if (versionConfig.localDocsPath) {
    const localSourceDir = path.resolve(buildContext.rootDir, versionConfig.localDocsPath)
    const localSourceArgs = {
      sourceBasePath: localSourceDir,
      versionOutputPath,
      searchState,
      fileSourceType: "Local",
    }
    const localProcessedPages = await _processVersionSourceFiles(localSourceArgs, versionConfig, buildContext)
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
async function processVersions(buildContext) {
  const allVersionsData = []
  for (const version of buildContext.config.versions) {
    try {
      const versionData = await processSingleVersion(version, buildContext)
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
 * Bundles the client-side JavaScript using esbuild.
 */
async function bundleJavaScript(buildContext) {
  console.log("\nBundling client-side JavaScript...")
  const jsEntryPoint = path.join(buildContext.srcDir, "main.js")
  const jsOutFile = path.join(buildContext.outputDir, ASSETS_DIR, BUNDLE_FILE)
  const jsOutDir = path.dirname(jsOutFile)

  try {
    if (fs.existsSync(jsOutDir)) {
      if (!fs.statSync(jsOutDir).isDirectory()) {
        console.error(`--- Error: Output directory path conflicts with an existing file: ${jsOutDir} ---`)
        throw new Error("JS output directory path conflicts with a file.")
      }
    } else {
      await mkdir(jsOutDir, { recursive: true })
    }

    await esbuild.build({
      entryPoints: [jsEntryPoint],
      outfile: jsOutFile,
      bundle: true,
      minify: true,
      sourcemap: true,
      treeShaking: true,
      format: "iife",
      logLevel: "info",
    })
    console.log(`Client-side JS bundled successfully to ${path.relative(buildContext.rootDir, jsOutFile)}`)
  } catch (error) {
    console.error("--- Error during client-side JavaScript bundling or directory setup ---")
    console.error(error)
    throw error
  }
}

/**
 * Copies other static assets (CSS, index.html, etc.).
 */
async function copyStaticAssets(buildContext) {
  console.log("\nCopying other static assets (CSS, index.html, etc)...")
  const assetsToCopy = [
    {
      source: path.join(buildContext.srcDir, "style.css"),
      dest: path.join(buildContext.outputDir, "style.css"),
    },
    {
      source: path.join(buildContext.srcDir, "index.html"),
      dest: path.join(buildContext.outputDir, "index.html"),
    },
    {
      source: path.join(buildContext.srcDir, "favicon.svg"),
      dest: path.join(buildContext.outputDir, "favicon.svg"),
    },
    {
      source: path.join(buildContext.srcDir, "favicon-dark.svg"),
      dest: path.join(buildContext.outputDir, "favicon-dark.svg"),
    },
  ]

  await Promise.all(
    assetsToCopy.map(async (asset) => {
      try {
        if (fs.existsSync(asset.source)) {
          await mkdir(path.dirname(asset.dest), { recursive: true })
          await copyFile(asset.source, asset.dest)
          console.log(
            `Copied ${path.relative(buildContext.rootDir, asset.source)} to ${path.relative(buildContext.rootDir, asset.dest)}`,
          )
        } else {
          if (!asset.source.endsWith("index.html") && !asset.source.endsWith("style.css")) {
            console.warn(`Asset source not found, skipping copy: ${path.relative(buildContext.rootDir, asset.source)}`)
          }
        }
      } catch (copyError) {
        console.error(`Failed to copy asset ${path.relative(buildContext.rootDir, asset.source)}: ${copyError.message}`)
        throw copyError
      }
    }),
  )
  console.log("Finished copying other static assets.")
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

/**
 * Performs the documentation build process.
 */
async function performBuildProcess(buildContext) {
  console.log("\nStarting documentation build...")

  await setupOutputDirectory(buildContext)
  const allVersionsData = await processVersions(buildContext)
  await bundleJavaScript(buildContext)
  await copyStaticAssets(buildContext)
  await writeVersionsFile(buildContext, allVersionsData)

  console.log("\n--- Running Post-processing Steps (if any) ---")
  console.log("\nDocumentation build finished successfully!")
  console.log(`Output available in: ${path.relative(buildContext.rootDir, buildContext.outputDir)}`)
}

/**
 * Parses command line arguments.
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

function runPreProcessing() {
  console.log("\n--- Running Pre-processing Steps (if any) ---")
}

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
 * Executes the main build steps based on parsed arguments.
 */
async function executeBuildSteps(options, buildContext) {
  const { gitOnly, buildOnly } = options

  const shouldRunGit = !buildOnly
  const shouldRunBuild = !gitOnly

  runPreProcessing()

  if (shouldRunGit) {
    await performGitOperations(buildContext)
  } else {
    console.log("\n--- Skipping Git Operations ---")
    if (shouldRunBuild && !fs.existsSync(buildContext.tempDir)) {
      console.error(
        `--- Error: --build-only used, but temp dir missing: ${path.relative(buildContext.rootDir, buildContext.tempDir)} ---`,
      )
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
