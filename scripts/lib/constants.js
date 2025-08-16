const path = require("node:path")

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

/**
 * Loads and resolves build configuration paths
 * @param {string} scriptDir - The directory containing the build script
 * @returns {object} Build configuration with resolved paths
 */
function loadBuildConfig(scriptDir) {
  const configPath = path.resolve(scriptDir, "../config.json")
  const config = require(configPath)
  const rootDir = path.resolve(scriptDir, "..")
  const tempDir = path.resolve(rootDir, config.tempDir)
  const outputDir = path.resolve(rootDir, config.outputDir)
  const srcDir = path.resolve(rootDir, "src")

  return {
    config,
    rootDir,
    tempDir,
    outputDir,
    srcDir,
  }
}

module.exports = {
  PLAYGROUND_CLASSES,
  HEADER_ANCHOR_CLASS,
  PREFERRED_DEFAULT_FILES,
  ASSETS_DIR,
  BUNDLE_FILE,
  SEARCH_INDEX_FILE,
  SEARCH_MAP_FILE,
  VERSIONS_FILE,
  loadBuildConfig,
}
