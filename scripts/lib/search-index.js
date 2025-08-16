const { writeFile } = require("node:fs/promises")
const path = require("node:path")
const FlexSearch = require("flexsearch")
const { SEARCH_INDEX_FILE, SEARCH_MAP_FILE } = require("./constants")

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
 * Checks if content is obsoleted based on front matter
 */
function isContentObsoleted(frontMatter) {
  return !!(
    frontMatter?.obsoleted_by ||
    frontMatter?.status?.toLowerCase() === "obsoleted" ||
    frontMatter?.status?.toLowerCase() === "superseded"
  )
}

/**
 * Creates search index entry
 */
function createSearchIndexEntry(options) {
  const { docId, title, textContent, sections, isObsoleted } = options
  return {
    id: docId,
    title,
    content: textContent,
    sectionsText: sections.map((s) => s.text).join(" "),
    isObsoleted,
  }
}

/**
 * Creates search document map entry
 */
function createSearchDocMapEntry(options) {
  const { docId, title, outputFileName, sections, isObsoleted } = options
  return {
    docId,
    mapEntry: {
      title,
      href: outputFileName,
      sections,
      isObsoleted,
    },
  }
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

module.exports = {
  SearchProcessingState,
  isContentObsoleted,
  createSearchIndexEntry,
  createSearchDocMapEntry,
  exportSearchData,
}
