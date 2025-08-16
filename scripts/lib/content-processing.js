const { mkdir, writeFile, readFile } = require("node:fs/promises")
const path = require("node:path")
const { parse } = require("node-html-parser")
const grayMatter = require("gray-matter")
const { PLAYGROUND_CLASSES, HEADER_ANCHOR_CLASS, PREFERRED_DEFAULT_FILES } = require("./constants")
const { extractRawTextFromTokens, html, validateJson, generatePlaygroundIds, extractNodeText } = require("./utilities")
const { isContentObsoleted, createSearchIndexEntry, createSearchDocMapEntry } = require("./search-index")

/**
 * Generates the HTML for an interactive JMESPath playground block.
 */
function renderJmespathInteractiveBlock(token, title, isExpandedInitially = false) {
  const [initialJson = "", initialQuery = ""] = token.text.split(/^\s*---JMESPATH---\s*$/m).map((s) => s.trim())
  const { isValid: isValidJson, hasContent: hasJsonContent } = validateJson(initialJson)
  const { jsonInputId, queryInputId, contentId } = generatePlaygroundIds()

  const displayTitle = title || "Interactive Example"
  const jsonWarningClass = !isValidJson && hasJsonContent ? PLAYGROUND_CLASSES.invalidJson : ""
  const invalidJsonWarning =
    !isValidJson && hasJsonContent
      ? `<p class="${PLAYGROUND_CLASSES.errorInline}">Initial JSON appears invalid.</p>`
      : ""

  return html` <div class="${PLAYGROUND_CLASSES.container} my-6 border rounded-lg">
    <button type="button" class="${PLAYGROUND_CLASSES.toggleButton}" aria-expanded="${isExpandedInitially}" aria-controls="${contentId}">
      <span>${displayTitle}</span>
      <svg class="${PLAYGROUND_CLASSES.toggleIcon}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div id="${contentId}" class="${PLAYGROUND_CLASSES.content}"${isExpandedInitially ? "" : " hidden"}>
      <div class="${PLAYGROUND_CLASSES.inputs}">
        <div>
          <label for="${jsonInputId}" class="${PLAYGROUND_CLASSES.label}">Input</label>
          <textarea id="${jsonInputId}" class="${PLAYGROUND_CLASSES.jsonInput} ${jsonWarningClass}" spellcheck="false">${initialJson}</textarea>
          ${invalidJsonWarning}
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

/**
 * Configures marked with extensions and options
 */
function configureMarked(marked) {
  marked.setOptions({
    gfm: true,
  })

  marked.use(headingRendererExtension, jmespathInteractiveExtension)
}

/**
 * Safely parses HTML string and handles errors
 */
function parseHtmlString(htmlString, identifier) {
  try {
    const root = parse(htmlString)
    return root?.querySelector ? root : null
  } catch (parseError) {
    console.error(`    Error parsing HTML for ${identifier}: ${parseError.message}`)
    return null
  }
}

/**
 * Extracts title from H1 element or returns fallback
 */
function extractTitleFromHtml(root, fallbackTitle) {
  const h1Element = root?.querySelector("h1")
  return h1Element ? extractNodeText(h1Element).trim() || fallbackTitle : fallbackTitle
}

/**
 * Extracts section headers with IDs and text
 */
function extractSectionsFromHtml(root) {
  const headers = root?.querySelectorAll("h2[id], h3[id], h4[id], h5[id], h6[id]") || []
  const sections = []

  for (const header of headers) {
    const id = header.getAttribute("id")
    const level = Number.parseInt(header.tagName.substring(1), 10)
    const headerText = extractNodeText(header).trim()

    if (id && headerText) {
      sections.push({ id, text: headerText, level })
    }
  }

  return sections
}

/**
 * Removes playground elements from HTML
 */
function removePlaygroundsFromHtml(root, identifier) {
  const playgrounds = root?.querySelectorAll(`.${PLAYGROUND_CLASSES.container}`) || []
  const removedCount = playgrounds.length

  for (const el of playgrounds) {
    el.remove()
  }

  if (removedCount > 0) {
    console.log(`    Removed ${removedCount} playground(s) before text extraction for: ${identifier}`)
  }
}

/**
 * Extracts text content from HTML root
 */
function extractTextFromHtml(root) {
  return root?.structuredText || root?.textContent || ""
}

/**
 * Creates fallback title from filename
 */
function createFallbackTitle(filePath) {
  return path
    .basename(filePath, ".md")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Processes markdown content and extracts metadata
 */
function processMarkdownContent(rawContent, filePath, marked) {
  let frontMatter = {}
  let markdownBody = rawContent

  try {
    const parsed = grayMatter(rawContent)
    frontMatter = parsed.data || {}
    markdownBody = parsed.content
  } catch (e) {
    console.warn(`    Could not parse front matter for ${filePath}. Error: ${e.message}`)
  }

  const htmlContent = marked.parse(markdownBody)
  const fallbackTitle = createFallbackTitle(filePath)

  return { frontMatter, htmlContent, markdownBody, fallbackTitle }
}

/**
 * Extracts content data from HTML or falls back to markdown
 */
function extractContentData(options) {
  const { htmlContent, markdownBody, fallbackTitle, filePath } = options
  const root = parseHtmlString(htmlContent, filePath)

  if (!root) {
    console.warn(`    Using fallback data for ${filePath} due to parsing failure.`)
    return {
      pageTitle: fallbackTitle,
      sections: [],
      textContent: markdownBody,
    }
  }

  const pageTitle = extractTitleFromHtml(root, fallbackTitle)
  const sections = extractSectionsFromHtml(root)
  removePlaygroundsFromHtml(root, filePath)
  const textContent = extractTextFromHtml(root)

  return { pageTitle, sections, textContent }
}

/**
 * Main content processing function
 */
function _extractContentAndProcess(rawFileContent, relativeFilePath, marked) {
  const { frontMatter, htmlContent, markdownBody, fallbackTitle } = processMarkdownContent(
    rawFileContent,
    relativeFilePath,
    marked,
  )
  const { pageTitle, sections, textContent } = extractContentData({
    htmlContent,
    markdownBody,
    fallbackTitle,
    filePath: relativeFilePath,
  })

  return {
    frontMatter,
    htmlContent,
    pageTitle,
    textContent,
    sections,
    id: frontMatter.id,
    parent: frontMatter.parent,
  }
}

/**
 * Extracts JEP metadata from front matter if the file is a JEP
 */
function extractJepMetadata(frontMatter, relativeFilePath) {
  // Check if this is a JEP file by filename or front matter
  const isJepFile = relativeFilePath.toLowerCase().startsWith("jep-") || frontMatter.jep !== undefined

  if (!isJepFile) {
    return null
  }

  // Extract JEP number from front matter or filename
  let jepNumber = frontMatter.jep
  if (!jepNumber) {
    // Extract from filename like "jep-001-nested-expressions.md" -> "001"
    const match = relativeFilePath.match(/jep-(\d+[a-z]?)/i)
    jepNumber = match ? match[1] : null
  }

  // Normalize JEP number format
  if (jepNumber) {
    jepNumber = String(jepNumber).padStart(3, "0")
  }

  return {
    jepNumber,
    status: frontMatter.status || "draft",
    author: frontMatter.author,
    created: frontMatter.created,
    semver: frontMatter.semver,
    obsoleted_by: frontMatter.obsoleted_by,
  }
}

/**
 * Creates navigation page entry
 */
function createNavPageEntry(options) {
  const { pageId, relativeFilePath, frontMatter, outputFileName, title, parent } = options
  const finalId = pageId || relativeFilePath.replace(/\.md$/, "").replace(/\\/g, "/")
  const navTitle = frontMatter.nav_label || title

  // Extract JEP metadata if this is a JEP file
  const jepMetadata = extractJepMetadata(frontMatter, relativeFilePath)

  const pageEntry = {
    id: finalId,
    file: outputFileName,
    title: navTitle,
    navOrder: frontMatter.nav_order,
    parent,
  }

  // Add JEP metadata if present
  if (jepMetadata) {
    pageEntry.jepMetadata = jepMetadata
  }

  return pageEntry
}

/**
 * Prepares search and navigation data from processed content
 */
function _prepareSearchAndNavData(params) {
  const { docId, pageTitle, textContent, sections, frontMatter, outputFileName, relativeFilePath, pageId, pageParent } =
    params

  const finalTitle = frontMatter.title || pageTitle
  const isObsoleted = isContentObsoleted(frontMatter)

  const searchIndexEntry = createSearchIndexEntry({
    docId,
    title: finalTitle,
    textContent,
    sections,
    isObsoleted,
  })
  const searchDocMapEntry = createSearchDocMapEntry({
    docId,
    title: finalTitle,
    outputFileName,
    sections,
    isObsoleted,
  })

  let processedPage = null
  if (isObsoleted) {
    console.log(`    Skipping nav for obsoleted: ${relativeFilePath}`)
  } else {
    processedPage = createNavPageEntry({
      pageId,
      relativeFilePath,
      frontMatter,
      outputFileName,
      title: finalTitle,
      parent: pageParent,
    })
  }

  return { searchIndexEntry, searchDocMapEntry, processedPage }
}

/**
 * Processes a single Markdown file asynchronously.
 */
async function processSingleMarkdownFile(options) {
  const { relativeFilePath, docId, context, marked } = options
  const { sourceDir, versionOutputPath, fileSourceType } = context
  const sourceFilePath = path.join(sourceDir, relativeFilePath)
  const outputFileName = relativeFilePath.replace(/\.md$/, ".html")
  const outputFilePath = path.join(versionOutputPath, outputFileName)

  console.log(`  Processing ${fileSourceType} file: ${relativeFilePath} (Doc ID: ${docId})`)

  try {
    await mkdir(path.dirname(outputFilePath), { recursive: true })
    const rawFileContent = await readFile(sourceFilePath, "utf-8")

    const contentData = _extractContentAndProcess(rawFileContent, relativeFilePath, marked)
    const { frontMatter, htmlContent, pageTitle, textContent, sections, id: pageId, parent: pageParent } = contentData

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
    return { searchIndexEntry: null, searchDocMapEntry: null, processedPage: null, error: processError }
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

module.exports = {
  renderJmespathInteractiveBlock,
  headingRendererExtension,
  jmespathInteractiveExtension,
  configureMarked,
  parseHtmlString,
  extractTitleFromHtml,
  extractSectionsFromHtml,
  removePlaygroundsFromHtml,
  extractTextFromHtml,
  createFallbackTitle,
  processMarkdownContent,
  extractContentData,
  _extractContentAndProcess,
  extractJepMetadata,
  createNavPageEntry,
  _prepareSearchAndNavData,
  processSingleMarkdownFile,
  determineDefaultFile,
}
