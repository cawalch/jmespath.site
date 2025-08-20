const fs = require("node:fs/promises")
const path = require("node:path")
const grayMatter = require("gray-matter")
const jmespath = require("@jmespath-community/jmespath")

/**
 * Extracts JMESPath interactive blocks from markdown content
 * @param {string} markdownContent - The markdown content to parse
 * @param {string} filePath - The file path for error reporting
 * @returns {Array} Array of extracted blocks with metadata
 */
function extractJmespathBlocks(markdownContent, filePath) {
  const blocks = []

  // Regular expression to match jmespath-interactive code blocks
  const blockRegex = /```jmespath-interactive([^\n]*)\n([\s\S]*?)```/g

  let blockIndex = 0
  let match = blockRegex.exec(markdownContent)

  while (match !== null) {
    const [, titleLine, blockContent] = match
    const title = titleLine.trim() || `Block ${blockIndex + 1}`

    // Split content by ---JMESPATH--- separator
    const parts = blockContent.split(/^\s*---JMESPATH---\s*$/m)

    if (parts.length !== 2) {
      blocks.push({
        index: blockIndex,
        title,
        filePath,
        error: "Invalid block format: expected JSON and JMESPath separated by ---JMESPATH---",
        jsonInput: blockContent.trim(),
        jmespathQuery: "",
        lineNumber: getLineNumber(markdownContent, match.index),
      })
      blockIndex++
      match = blockRegex.exec(markdownContent)
      continue
    }

    const [jsonInput, jmespathQuery] = parts.map((part) => part.trim())

    blocks.push({
      index: blockIndex,
      title,
      filePath,
      jsonInput,
      jmespathQuery,
      lineNumber: getLineNumber(markdownContent, match.index),
      error: null,
    })

    blockIndex++
    match = blockRegex.exec(markdownContent)
  }

  return blocks
}

/**
 * Gets the line number for a given character index in text
 * @param {string} text - The text content
 * @param {number} index - The character index
 * @returns {number} The line number (1-based)
 */
function getLineNumber(text, index) {
  return text.substring(0, index).split("\n").length
}

/**
 * Validates a single JMESPath block
 * @param {Object} block - The block to validate
 * @returns {Object} Validation result with success status and details
 */
function validateJmespathBlock(block) {
  const result = {
    block,
    success: true,
    errors: [],
    warnings: [],
    expectedToFail: false,
  }

  // Check if this block is expected to fail based on title patterns
  // Only very specific patterns that indicate the query itself should fail
  const errorPatterns = [
    /^type.*error.*example$/i,
    /^type.*validation$/i,
    /^invalid.*example$/i,
    /^syntax.*error.*example$/i,
    /^error.*example$/i,
  ]

  result.expectedToFail = errorPatterns.some((pattern) => pattern.test(block.title.trim()))

  // Skip blocks that already have extraction errors
  if (block.error) {
    result.success = false
    result.errors.push(block.error)
    return result
  }

  // Validate JSON input
  let jsonData
  try {
    if (block.jsonInput.trim()) {
      jsonData = JSON.parse(block.jsonInput)
    } else {
      result.warnings.push("Empty JSON input")
      jsonData = null
    }
  } catch (error) {
    result.success = false
    result.errors.push(`Invalid JSON: ${error.message}`)
    return result
  }

  // Validate JMESPath query
  if (!block.jmespathQuery.trim()) {
    result.warnings.push("Empty JMESPath query")
    return result
  }

  try {
    // Attempt to execute the JMESPath query
    const queryResult = jmespath.search(jsonData, block.jmespathQuery)
    result.queryResult = queryResult

    // If this block was expected to fail but didn't, that's a problem
    if (result.expectedToFail) {
      result.success = false
      result.errors.push("Expected this query to fail, but it succeeded")
    }
  } catch (error) {
    // If this block was expected to fail and did fail, that's success
    if (result.expectedToFail) {
      result.success = true
      result.warnings.push(`Expected error occurred: ${error.message}`)
    } else {
      result.success = false
      result.errors.push(`JMESPath query error: ${error.message}`)
    }
  }

  return result
}

/**
 * Validates all JMESPath blocks in a markdown file
 * @param {string} filePath - Path to the markdown file
 * @returns {Object} Validation results for the file
 */
async function validateMarkdownFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8")

    // Parse front matter if present
    let markdownContent = content
    let frontMatter = {}

    try {
      const parsed = grayMatter(content)
      frontMatter = parsed.data || {}
      markdownContent = parsed.content
    } catch {
      // Continue with full content if front matter parsing fails
    }

    const blocks = extractJmespathBlocks(markdownContent, filePath)
    const validationResults = blocks.map(validateJmespathBlock)

    const totalBlocks = blocks.length
    const successfulBlocks = validationResults.filter((r) => r.success).length
    const failedBlocks = validationResults.filter((r) => !r.success).length
    const blocksWithWarnings = validationResults.filter((r) => r.warnings.length > 0).length

    return {
      filePath,
      frontMatter,
      totalBlocks,
      successfulBlocks,
      failedBlocks,
      blocksWithWarnings,
      blocks: validationResults,
      success: failedBlocks === 0,
    }
  } catch (error) {
    return {
      filePath,
      totalBlocks: 0,
      successfulBlocks: 0,
      failedBlocks: 0,
      blocksWithWarnings: 0,
      blocks: [],
      success: false,
      fileError: `Failed to read file: ${error.message}`,
    }
  }
}

/**
 * Validates multiple markdown files
 * @param {Array<string>} filePaths - Array of file paths to validate
 * @param {Object} options - Validation options
 * @returns {Object} Combined validation results
 */
async function validateMultipleFiles(filePaths, options = {}) {
  const { verbose = false, failFast = false } = options

  const results = []
  let totalFiles = 0
  let successfulFiles = 0
  let totalBlocks = 0
  let successfulBlocks = 0
  let failedBlocks = 0
  let blocksWithWarnings = 0

  for (const filePath of filePaths) {
    if (verbose) {
      console.log(`Validating: ${filePath}`)
    }

    const result = await validateMarkdownFile(filePath)
    results.push(result)

    totalFiles++
    if (result.success && !result.fileError) {
      successfulFiles++
    }

    totalBlocks += result.totalBlocks
    successfulBlocks += result.successfulBlocks
    failedBlocks += result.failedBlocks
    blocksWithWarnings += result.blocksWithWarnings

    if (failFast && !result.success) {
      break
    }
  }

  return {
    totalFiles,
    successfulFiles,
    failedFiles: totalFiles - successfulFiles,
    totalBlocks,
    successfulBlocks,
    failedBlocks,
    blocksWithWarnings,
    results,
    success: failedBlocks === 0 && successfulFiles === totalFiles,
  }
}

/**
 * Finds all markdown files in a directory
 * @param {string} dirPath - Directory path to search
 * @param {Object} options - Search options
 * @returns {Array<string>} Array of markdown file paths
 */
async function findMarkdownFiles(dirPath, options = {}) {
  const { recursive = true, includeGlobs = ["**/*.md"], excludeGlobs = [] } = options
  const files = []

  async function scanDirectory(currentPath) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name)

        if (entry.isDirectory() && recursive) {
          await scanDirectory(fullPath)
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          const relativePath = path.relative(dirPath, fullPath)

          // Simple glob matching for .md files
          const shouldInclude = includeGlobs.some((glob) => {
            if (glob === "**/*.md") return true
            return relativePath.includes(glob.replace("**/*.md", "").replace("*", ""))
          })

          const shouldExclude = excludeGlobs.some((glob) => {
            return relativePath.includes(glob.replace("**/*.md", "").replace("*", ""))
          })

          if (shouldInclude && !shouldExclude) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${currentPath}: ${error.message}`)
    }
  }

  await scanDirectory(dirPath)
  return files.sort()
}

/**
 * Formats validation results for console output
 * @param {Object} results - Validation results
 * @param {Object} options - Formatting options
 */
function formatValidationResults(results, options = {}) {
  const { verbose = false, showWarnings = true } = options

  console.log("\n=== JMESPath Validation Results ===")
  console.log(`Files: ${results.successfulFiles}/${results.totalFiles} successful`)
  console.log(`Blocks: ${results.successfulBlocks}/${results.totalBlocks} successful`)

  if (results.failedBlocks > 0) {
    console.log(`❌ ${results.failedBlocks} blocks failed validation`)
  }

  if (results.blocksWithWarnings > 0 && showWarnings) {
    console.log(`⚠️  ${results.blocksWithWarnings} blocks have warnings`)
  }

  // Show detailed results for failed files
  for (const fileResult of results.results) {
    if (!fileResult.success || fileResult.fileError) {
      console.log(`\n❌ ${fileResult.filePath}`)

      if (fileResult.fileError) {
        console.log(`   File Error: ${fileResult.fileError}`)
        continue
      }

      for (const blockResult of fileResult.blocks) {
        if (!blockResult.success) {
          const prefix = blockResult.expectedToFail ? "📝" : "❌"
          const label = blockResult.expectedToFail ? "Expected Error Example" : "Error"
          console.log(
            `   ${prefix} Block "${blockResult.block.title}" (line ${blockResult.block.lineNumber}) - ${label}:`,
          )
          for (const error of blockResult.errors) {
            console.log(`     ${prefix} ${error}`)
          }
        }
      }
    } else if (verbose) {
      console.log(`✅ ${fileResult.filePath} (${fileResult.totalBlocks} blocks)`)
    }
  }

  // Show warnings if requested
  if (showWarnings && verbose) {
    for (const fileResult of results.results) {
      for (const blockResult of fileResult.blocks) {
        if (blockResult.warnings.length > 0) {
          console.log(`\n⚠️  ${fileResult.filePath}`)
          console.log(`   Block "${blockResult.block.title}" (line ${blockResult.block.lineNumber}):`)
          for (const warning of blockResult.warnings) {
            console.log(`     ⚠️  ${warning}`)
          }
        }
      }
    }
  }

  console.log(`\n${results.success ? "✅ All validations passed!" : "❌ Validation failed!"}`)
}

module.exports = {
  extractJmespathBlocks,
  validateJmespathBlock,
  validateMarkdownFile,
  validateMultipleFiles,
  findMarkdownFiles,
  formatValidationResults,
  getLineNumber,
}
