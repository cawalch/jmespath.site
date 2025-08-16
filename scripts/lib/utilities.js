const { execSync } = require("node:child_process")
const path = require("node:path")

// Utility functions
const hasValue = (value) => value !== undefined && value !== null
const isTextNode = (node) => node.nodeType === 3
const isElementNode = (node) => node.nodeType === 1

/**
 * Helper function to extract text content from an HTML node, ignoring anchor tags and recursively processing children.
 */
function extractNodeText(node) {
  if (isTextNode(node)) return node.text
  if (isElementNode(node) && node.tagName.toLowerCase() !== "a") {
    return node.childNodes.map(extractNodeText).join("")
  }
  return ""
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
 * Validates JSON and returns validation result
 */
function validateJson(jsonString) {
  if (!jsonString) return { isValid: false, hasContent: false }
  try {
    JSON.parse(jsonString)
    return { isValid: true, hasContent: true }
  } catch {
    return { isValid: false, hasContent: true }
  }
}

/**
 * Generates unique IDs for playground elements
 */
function generatePlaygroundIds() {
  const suffix = Math.random().toString(36).substring(2, 9)
  return {
    jsonInputId: `json-input-${suffix}`,
    queryInputId: `query-input-${suffix}`,
    contentId: `playground-content-${suffix}`,
  }
}

/**
 * Generic comparator that handles null/undefined values consistently
 */
function createComparator(getValue, compareValues = (a, b) => a.localeCompare?.(b) || a - b) {
  return (a, b) => {
    const aValue = getValue(a)
    const bValue = getValue(b)
    const aHasValue = hasValue(aValue)
    const bHasValue = hasValue(bValue)

    if (aHasValue && !bHasValue) return -1
    if (!aHasValue && bHasValue) return 1
    if (aHasValue && bHasValue) return compareValues(aValue, bValue)
    return 0
  }
}

const compareParent = createComparator((page) => page.parent)
const compareNavOrder = createComparator(
  (page) => page.nav_order,
  (a, b) => Number(a) - Number(b),
)
const compareTitle = createComparator((page) => page.title)

/**
 * Comparator function to sort navigation pages.
 */
function compareNavPages(a, b) {
  return compareParent(a, b) || compareNavOrder(a, b) || compareTitle(a, b)
}

/**
 * Executes a shell command with proper error handling and logging
 */
function runCommand(command, cwd, rootDir) {
  console.log(`Executing in ${path.relative(rootDir, cwd)}: ${command}`)
  try {
    // eslint-disable-next-line camelcase
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    execSync(command, { stdio: "inherit", cwd, env })
  } catch (error) {
    console.error(`Error executing command: ${command}\n${error.message}`)
    throw error
  }
}

/**
 * Generates build metadata including date and commit hash
 */
function generateBuildMetadata(rootDir) {
  const buildDate = new Date().toISOString()
  let commitHash = "unknown"
  let isCI = false

  // Check if running in CI environment
  if (process.env.GITHUB_SHA) {
    commitHash = process.env.GITHUB_SHA.substring(0, 8)
    isCI = true
  } else {
    // Try to get local commit hash
    try {
      const fullHash = execSync("git rev-parse HEAD", { encoding: "utf8", cwd: rootDir }).trim()
      commitHash = fullHash.substring(0, 8)
    } catch (error) {
      console.warn("Could not determine git commit hash:", error.message)
    }
  }

  return {
    buildDate,
    commitHash,
    isCI,
    buildEnvironment: isCI ? "GitHub Actions CI/CD" : "local development",
  }
}

module.exports = {
  hasValue,
  isTextNode,
  isElementNode,
  extractNodeText,
  extractRawTextFromTokens,
  html,
  validateJson,
  generatePlaygroundIds,
  createComparator,
  compareParent,
  compareNavOrder,
  compareTitle,
  compareNavPages,
  runCommand,
  generateBuildMetadata,
}
