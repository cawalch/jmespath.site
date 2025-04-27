const fs = require("node:fs");
const { promises: fsPromises } = require("node:fs");
const { mkdir, rm, writeFile, readFile, readdir, copyFile } = fsPromises;

const { globSync } = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");
const { marked } = require("marked");
const { parse } = require("node-html-parser");
const grayMatter = require("gray-matter");
const FlexSearch = require("flexsearch");
const esbuild = require("esbuild");

// Playground class names
const PLAYGROUND_CLASSES = {
  CONTAINER: "jmespath-playground",
  TOGGLE_BUTTON: "playground-toggle-button",
  CONTENT: "playground-content",
  INPUTS: "playground-inputs",
  LABEL: "playground-label",
  JSON_INPUT: "json-input",
  INVALID_JSON: "invalid-json",
  ERROR_INLINE: "playground-error-inline",
  QUERY_INPUT: "query-input",
  OUTPUT_AREA: "output-area",
  ERROR_AREA: "error-area",
  TOGGLE_ICON: "toggle-icon",
};

// Header anchor class name
const HEADER_ANCHOR_CLASS = "header-anchor";

// Preferred default file names (case-insensitive match)
const PREFERRED_DEFAULT_FILES = ["_index.html", "index.html", "spec.html", "readme.html"];

// Asset names / paths
const ASSETS_DIR = "assets";
const BUNDLE_FILE = "main.bundle.js";
const SEARCH_INDEX_FILE = "search_index.json";
const SEARCH_MAP_FILE = "search_map.json";
const VERSIONS_FILE = "versions.json";

// Load config
const configPath = path.resolve(__dirname, "../config.json");
const config = require(configPath);
const rootDir = path.resolve(__dirname, "..");
const tempDir = path.resolve(rootDir, config.tempDir);
const outputDir = path.resolve(rootDir, config.outputDir);
const srcDir = path.resolve(rootDir, "src");

/**
 * Helper function to extract text content from an HTML node, ignoring anchor tags and recursively processing children.
 * Handles text nodes and element nodes.
 */
function extractNodeText(node) {
  let text = "";
  if (node.nodeType === 3) {
    text += node.text;
  } else if (node.nodeType === 1) {
    if (node.tagName.toLowerCase() !== "a") {
      for (const child of node.childNodes) {
        text += extractNodeText(child);
      }
    }
  }
  return text;
}

/**
 * Extracts raw text from Markdown tokens, ignoring formatting that doesn't contribute to the text content.
 * @param {Array<object>} tokenList - Array of Marked tokens.
 * @returns {string} - The extracted raw text.
 */
function extractRawTextFromTokens(tokenList) {
  let text = "";
  if (!tokenList) return "";

  for (const token of tokenList) {
    switch (token.type) {
      case "text":
      case "codespan":
      case "strong":
      case "em":
        text += token.raw;
        break;
      case "link":
        text += extractRawTextFromTokens(token.tokens) || token.text || "";
        break;
      case "list_item":
      case "paragraph":
        text += extractRawTextFromTokens(token.tokens);
        break;
    }
  }
  return text;
}

// A simple tag function for readability (doesn't do complex processing here)
const html = (strings, ...values) => strings.reduce((acc, string, i) => acc + string + (values[i] === undefined ? "" : values[i]), "");

/**
 * Generates the HTML for an interactive JMESPath playground block.
 * @param {object} token - The Marked code token with lang === "jmespath-interactive".
 * @param {string} title - The title for the playground block.
 * @param {boolean} [isExpandedInitially=false] - Whether the block should be initially expanded.
 * @returns {string} - The generated HTML string.
 */
function renderJmespathInteractiveBlock(token, title, isExpandedInitially = false) {
  const rawContent = token.text;
  const parts = rawContent.split(/^\s*---JMESPATH---\s*$/m);
  const initialJson = (parts[0] || "").trim();
  const initialQuery = (parts[1] || "").trim();
  let isValidJson = false;
  if (initialJson) {
    try {
      JSON.parse(initialJson);
      isValidJson = true;
    } catch {}
  }

  const uniqueSuffix = Math.random().toString(36).substring(2, 9);
  const jsonInputId = `json-input-${uniqueSuffix}`;
  const queryInputId = `query-input-${uniqueSuffix}`;
  const contentId = `playground-content-${uniqueSuffix}`;
  const jsonWarningClass = !isValidJson && initialJson ? PLAYGROUND_CLASSES.INVALID_JSON : "";
  const invalidJsonWarningHtml = !isValidJson && initialJson ? `<p class="${PLAYGROUND_CLASSES.ERROR_INLINE}">Initial JSON appears invalid.</p>` : "";

  // Determine initial ARIA expanded state and hidden attribute
  const ariaExpanded = isExpandedInitially ? "true" : "false";
  const hiddenAttribute = isExpandedInitially ? "" : " hidden";

  // Use provided title or fallback
  const displayTitle = title || "Interactive Example";

  return html` <div class="${PLAYGROUND_CLASSES.CONTAINER} my-6 border rounded-lg">
    <button type="button" class="${PLAYGROUND_CLASSES.TOGGLE_BUTTON}" aria-expanded="${ariaExpanded}" aria-controls="${contentId}">
      <span>${displayTitle}</span>
      <svg class="${PLAYGROUND_CLASSES.TOGGLE_ICON}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <div id="${contentId}" class="${PLAYGROUND_CLASSES.CONTENT}${hiddenAttribute}">
      <div class="${PLAYGROUND_CLASSES.INPUTS}">
        <div>
          <label for="${jsonInputId}" class="${PLAYGROUND_CLASSES.LABEL}">Input</label>
          <textarea id="${jsonInputId}" class="${PLAYGROUND_CLASSES.JSON_INPUT} ${jsonWarningClass}" spellcheck="false">${initialJson}</textarea>
          ${invalidJsonWarningHtml}
        </div>
        <div>
          <label for="${queryInputId}" class="${PLAYGROUND_CLASSES.LABEL}">Query</label>
          <textarea id="${queryInputId}" class="${PLAYGROUND_CLASSES.QUERY_INPUT}" spellcheck="false">${initialQuery}</textarea>
        </div>
      </div>
      <div class="mt-4">
        <label class="${PLAYGROUND_CLASSES.LABEL}">Result</label>
        <pre class="${PLAYGROUND_CLASSES.OUTPUT_AREA}"><code class="language-json"></code></pre>
        <div class="${PLAYGROUND_CLASSES.ERROR_AREA}"></div>
      </div>
    </div>
  </div>`;
}

/**
 * Finds files matching globs within a base path.
 * @param {string} basePath - Absolute path to the directory to search.
 * @param {string[]} includeGlobs - Array of glob patterns to include files.
 * @param {string} rootDir - For logging relative paths.
 * @param {string[]} [excludeGlobs=[]] - Array of glob patterns to exclude files.
 * @returns {string[]} - Array of matched file paths relative to basePath, sorted.
 */
function findFiles(basePath, includeGlobs, rootDir, excludeGlobs = []) {
  let effectiveIncludeGlobs = includeGlobs;
  if (!Array.isArray(effectiveIncludeGlobs)) {
    console.warn(`Warning: includeGlobs is not an array for path ${path.relative(rootDir, basePath)}. Using empty array.`);
    effectiveIncludeGlobs = [];
  }
  // Ensure globs are provided if basePath exists
  if (fs.existsSync(basePath) && effectiveIncludeGlobs.length === 0) {
    console.warn(`Warning: No includeGlobs provided for existing path ${path.relative(rootDir, basePath)}. No files will be matched.`);
    return [];
  }
  console.log(`Searching for files in ${path.relative(rootDir, basePath)} matching: ${effectiveIncludeGlobs.join(", ")}`);
  const options = {
    cwd: basePath,
    nodir: true,
    dot: false,
    ignore: excludeGlobs || [],
  };
  try {
    const files = globSync(effectiveIncludeGlobs, options);
    console.log(`Found ${files.length} files.`);
    files.sort();
    return files;
  } catch (error) {
    console.error(`Error during glob search in ${basePath}: ${error.message}`);
    return [];
  }
}

function runCommand(command, cwd, rootDir) {
  console.log(`Executing in ${path.relative(rootDir, cwd)}: ${command}`);
  try {
    const env = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
    execSync(command, { stdio: "inherit", cwd, env });
  } catch (error) {
    console.error(`Error executing command: ${command}\n${error.message}`);
    throw error;
  }
}

/**
 * Custom renderer for headings to generate more robust IDs and add anchor links.
 */
const headingRendererExtension = {
  renderer: {
    heading({ tokens, depth }) {
      const text = extractRawTextFromTokens(tokens);
      const escapedText = text
        .toLowerCase()
        .replace(/^[^a-z_]+/, "")
        .replace(/[^\w-]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
      const finalId = escapedText || `section-${depth}-${Math.random().toString(36).substring(2, 7)}`;
      return `
<h${depth} id="${finalId}">
  ${text} <a href="#${finalId}" class="${HEADER_ANCHOR_CLASS}" aria-label="Link to this section">#</a>
</h${depth}>`;
    },
  },
};

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
        const langString = token.lang.trim();
        const baseLang = "jmespath-interactive";
        let remaining = langString.substring(baseLang.length).trim();

        let isExpanded = false;
        if (remaining.startsWith("expanded")) {
          isExpanded = true;
          remaining = remaining.substring("expanded".length).trim();
        }

        const title = remaining;

        return renderJmespathInteractiveBlock(token, title, isExpanded);
      }
      return false;
    },
  },
};

marked.setOptions({
  gfm: true,
});

marked.use(headingRendererExtension, jmespathInteractiveExtension);

/**
 * Handles the details of a successful file processing result, updating shared data.
 * @param {{processedPage: {file: string, title: string} | null, searchDocMapEntry: {docId: number, mapEntry: object} | null, error: Error | null}} value - The fulfilled result value.
 * @param {object} context - The shared VersionProcessingContext object (mutated).
 * @param {Array<{file: string, title: string}>} processedPages - The array to accumulate navigation pages (mutated).
 * @returns {{successful: number, failed: number}} - The counts (1 successful or 1 failed).
 */
function handleSuccessfulFileResult(value, context, processedPages) {
  const { processedPage, searchDocMapEntry, error } = value;

  if (processedPage) {
    processedPages.push(processedPage);
  }
  if (searchDocMapEntry) {
    context.searchDocMap[searchDocMapEntry.docId] = searchDocMapEntry.mapEntry;
  }

  return { successful: error ? 0 : 1, failed: error ? 1 : 0 };
}

/**
 * Handles the result of processing a single Markdown file, updating shared data.
 * @param {PromiseSettledResult<handleFileProcessingResult | null>} result - The settled promise result for a single file.
 * @param {object} context - The shared VersionProcessingContext object (mutated).
 * @param {Array<{file: string, title: string}>} processedPages - The array to accumulate navigation pages (mutated).
 * @returns {{successful: number, failed: number}} - The counts of successful and failed files from this result.
 */
function handleFileProcessingResult(result, context, processedPages) {
  if (result.status === "fulfilled" && result.value) {
    return handleSuccessfulFileResult(result.value, context, processedPages);
  }
  if (result.status === "rejected") {
    console.error(`  A file processing promise was rejected unexpectedly: ${result.reason}`);
    return { successful: 0, failed: 1 };
  }
  if (result.status === "fulfilled" && !result.value) {
    return { successful: 0, failed: 1 };
  }

  return { successful: 0, failed: 0 };
}

/**
 * Parses an HTML string using node-html-parser and handles potential errors.
 * @param {string} htmlString - The HTML string to parse.
 * @param {string} identifier - Identifier for logging purposes (e.g., filename).
 * @returns {object | null} - The parsed HTML root node or null if parsing failed.
 */
function parseHtmlString(htmlString, identifier) {
  try {
    const root = parse(htmlString);
    if (!root || typeof root.querySelector !== "function") {
      console.warn(`    HTML parsing failed for: ${identifier}.`);
      return null;
    }
    return root;
  } catch (parseError) {
    console.error(`    Error during HTML parsing for ${identifier}: ${parseError.message}`);
    return null;
  }
}

/**
 * Extracts the title from the first H1 element in the parsed HTML root.
 * @param {object} root - The parsed HTML root node.
 * @param {string} fallbackTitle - The title to use if no H1 is found or extractable.
 * @returns {string} - The extracted or fallback title.
 */
function extractTitleFromHtml(root, fallbackTitle) {
  const h1Element = root.querySelector("h1");
  if (h1Element) {
    const extractedTitle = extractNodeText(h1Element);
    return extractedTitle.trim() || fallbackTitle;
  }
  return fallbackTitle;
}

/**
 * Extracts section headers (h2-h6) with their IDs and text from the parsed HTML root.
 * @param {object} root - The parsed HTML root node.
 * @param {string} identifier - Identifier for logging purposes.
 * @returns {Array<{id: string, text: string, level: number}>} - Array of section objects.
 */
function extractSectionsFromHtml(root, identifier) {
  const sections = [];
  const headers = root.querySelectorAll("h2[id], h3[id], h4[id], h5[id], h6[id]");
  if (headers && typeof headers[Symbol.iterator] === "function") {
    for (const header of headers) {
      const id = header.getAttribute("id");
      const level = Number.parseInt(header.tagName.substring(1), 10);
      let headerText = extractNodeText(header);
      headerText = headerText.trim();

      if (id && headerText) sections.push({ id, text: headerText, level });
    }
  } else {
    console.warn(`    Could not iterate over headers in: ${identifier}`);
  }
  return sections;
}

/**
 * Removes elements with the playground class from the parsed HTML root.
 * @param {object} root - The parsed HTML root node (mutated).
 * @param {string} identifier - Identifier for logging purposes.
 */
function removePlaygroundsFromHtml(root, identifier) {
  const playgrounds = root.querySelectorAll(`.${PLAYGROUND_CLASSES.CONTAINER}`);
  if (playgrounds && typeof playgrounds[Symbol.iterator] === "function") {
    let removedCount = 0;
    for (const el of playgrounds) {
      el.remove();
      removedCount++;
    }
    if (removedCount > 0) {
      console.log(`    Removed ${removedCount} playground(s) before text extraction for: ${identifier}`);
    }
  }
}

/**
 * Extracts text content from the parsed HTML root.
 * @param {object} root - The parsed HTML root node.
 * @returns {string} - The extracted text content.
 */
function extractTextFromHtml(root) {
  return root.structuredText || root.textContent || "";
}

/**
 * Converts Markdown body to HTML, extracts H1 title, extracts raw text content (excluding playgrounds),
 * and extracts section headers (h2-h6) with their IDs and text.
 * Uses the globally configured marked instance.
 * @param {string} markdownBody - The Markdown content.
 * @param {string} fallbackTitle - Fallback title if no H1 is found.
 * @returns {{html: string, title: string, textContent: string, sections: Array}} - Processed data.
 */
function processMarkdown(markdownBody, fallbackTitle) {
  const htmlContent = marked.parse(markdownBody);

  const root = parseHtmlString(htmlContent, fallbackTitle);

  if (!root) {
    // HTML parsing failed, return fallback data
    return {
      html: htmlContent,
      title: fallbackTitle,
      textContent: markdownBody,
      sections: [],
    };
  }

  const pageTitle = extractTitleFromHtml(root, fallbackTitle);
  const sections = extractSectionsFromHtml(root, fallbackTitle);

  removePlaygroundsFromHtml(root, fallbackTitle);

  const textContent = extractTextFromHtml(root);

  return {
    html: htmlContent,
    title: pageTitle,
    textContent: textContent,
    sections: sections,
  };
}

/**
 * Clones or updates a Git repository to a specified path.
 * @param {string} repoUrl - The URL of the Git repository.
 * @param {string} targetPath - The path where the repository should be cloned or updated.
 * @param {string} ref - The Git reference (branch or tag) to checkout.
 * @param {string} rootDir - The root directory for relative path logging.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
async function cloneOrUpdateRepo(repoUrl, targetPath, ref, rootDir) {
  if (fs.existsSync(targetPath)) {
    console.log(`Repository already exists at ${path.relative(rootDir, targetPath)}. Fetching updates...`);
    runCommand("git fetch --all --tags --prune", targetPath, rootDir);
  } else {
    console.log(`Cloning ${repoUrl} (ref: ${ref}) into ${path.relative(rootDir, targetPath)}...`);
    await mkdir(path.dirname(targetPath), { recursive: true });
    runCommand(`git clone --no-checkout ${repoUrl} ${targetPath}`, rootDir, rootDir);
  }
}

function checkoutRef(repoPath, ref, isTag, rootDir) {
  console.log(`Checking out ${isTag ? "tag" : "branch"}: ${ref} in ${path.relative(rootDir, repoPath)}`);
  runCommand(`git checkout -f ${ref}`, repoPath, rootDir);
  runCommand("git clean -fdx", repoPath, rootDir);
}

async function performGitOperations(buildContext) {
  console.log(`\nCleaning up old temporary directory: ${path.relative(buildContext.rootDir, buildContext.tempDir)}...`);
  try {
    await rm(buildContext.tempDir, { recursive: true, force: true });
    await mkdir(buildContext.tempDir, { recursive: true });
  } catch (err) {
    console.error(`Error cleaning temp directory ${path.relative(buildContext.rootDir, buildContext.tempDir)}: ${err.message}`);
  }

  for (const version of buildContext.config.versions) {
    console.log(`\n--- Preparing source for version: ${version.label} (ref: ${version.ref}) ---`);
    const versionClonePath = path.join(buildContext.tempDir, version.id);
    try {
      await cloneOrUpdateRepo(buildContext.config.specRepoUrl, versionClonePath, version.ref, buildContext.rootDir);
      checkoutRef(versionClonePath, version.ref, version.isTag, buildContext.rootDir);
    } catch (gitError) {
      console.error(`--- Error during Git operations for version ${version.label}. Skipping. ---`);
    }
  }
  console.log("\n--- Finished Git Operations ---");
}

/**
 * Comparator function to sort navigation pages.
 * Prioritizes pages with a defined nav_order, then sorts numerically by nav_order,
 * and finally alphabetically by title for pages without nav_order.
 * @param {object} a - The first page object { file, title, nav_order? }.
 * @param {object} b - The second page object { file, title, nav_order? }.
 * @returns {number} - A negative value if a comes before b, positive if a comes after b, or 0 if they are equal.
 */
function compareNavPages(a, b) {
  const aHasOrder = a.nav_order !== undefined && a.nav_order !== null;
  const bHasOrder = b.nav_order !== undefined && b.nav_order !== null;

  if (aHasOrder && !bHasOrder) {
    return -1;
  }
  if (!aHasOrder && bHasOrder) {
    return 1;
  }
  if (aHasOrder && bHasOrder) {
    // Both have order, sort numerically
    return Number(a.nav_order) - Number(b.nav_order);
  }
  // Neither has order, sort alphabetically by title
  return a.title.localeCompare(b.title);
}

/**
 * Processes a single version's documentation, including file processing and search data generation.
 * @param {object} versionConfig - The configuration object for this specific version.
 * @param {BuildContext} buildContext - The overall build context.
 * @returns {Promise<{id: string, label: string, pages: Array<object>, defaultFile: string}>} - Data for this version's entry in versions.json.
 * @throws {Error} If search data export fails.
 */
async function processSingleVersion(versionConfig, buildContext) {
  console.log(`\n--- Processing version: ${versionConfig.label} (ref: ${versionConfig.ref}) ---`);

  const versionClonePath = path.join(buildContext.tempDir, versionConfig.id);
  const versionOutputPath = path.join(buildContext.outputDir, versionConfig.id);

  // Remove specific version output dir if it exists, then create it
  await rm(versionOutputPath, { recursive: true, force: true });
  await mkdir(versionOutputPath, { recursive: true });

  // Initialize Search for this version
  const searchIndex = new FlexSearch.Document({
    document: {
      id: "id",
      index: ["title", "content", "sections_text"],
    },
    tokenize: "forward",
  });
  const searchDocMap = {};
  let docIdCounter = 0;

  let versionNavPages = [];

  const specSourceDir = path.join(versionClonePath, versionConfig.sourcePath || "");
  if (fs.existsSync(specSourceDir)) {
    const specFiles = findFiles(specSourceDir, versionConfig.includeGlobs, buildContext.rootDir, versionConfig.excludeGlobs);
    const specContext = {
      sourceDir: specSourceDir,
      versionOutputPath,
      searchIndex,
      searchDocMap,
      fileSourceType: "Spec",
    };
    const specResult = await processMarkdownFiles(specFiles, specContext, docIdCounter);
    versionNavPages = versionNavPages.concat(specResult.processedPages);
    docIdCounter = specResult.nextDocId; // Update counter
  } else {
    console.warn(`--- Warning: Spec source path does not exist for version ${versionConfig.label}: ${path.relative(buildContext.rootDir, specSourceDir)}. Skipping spec files. ---`);
  }

  if (versionConfig.localDocsPath) {
    const localSourceDir = path.resolve(buildContext.rootDir, versionConfig.localDocsPath);
    if (fs.existsSync(localSourceDir)) {
      const localIncludeGlobs = versionConfig.localIncludeGlobs || ["**/*.md"];
      const localFiles = findFiles(localSourceDir, localIncludeGlobs, buildContext.rootDir, versionConfig.localExcludeGlobs);
      const localContext = {
        sourceDir: localSourceDir,
        versionOutputPath,
        searchIndex,
        searchDocMap,
        fileSourceType: "Local",
      };
      const localResult = await processMarkdownFiles(localFiles, localContext, docIdCounter);
      versionNavPages = versionNavPages.concat(localResult.processedPages);
      docIdCounter = localResult.nextDocId;
    } else {
      console.warn(`--- Warning: Local docs path specified but does not exist for version ${versionConfig.label}: ${path.relative(buildContext.rootDir, localSourceDir)}. Skipping local files. ---`);
    }
  }

  // Sort combined navigation pages using the dedicated comparator
  versionNavPages.sort(compareNavPages);

  const defaultFile = determineDefaultFile(versionNavPages);

  // Export Search Data for this version
  await exportSearchData({ versionOutputPath, searchIndex, searchDocMap });

  return {
    id: versionConfig.id,
    label: versionConfig.label,
    pages: versionNavPages,
    defaultFile: defaultFile,
  };
}

/**
 * Processes a single Markdown file asynchronously.
 * @param {string} relativeFilePath - File path relative to sourceDir.
 * @param {number} docId - The document ID to use for search indexing.
 * @param {VersionProcessingContext} context - Context object for version processing.
 * @returns {Promise<handleFileProcessingResult| null>} - Processed data or null if processing failed (error logged internally).
 */
async function processSingleMarkdownFile(relativeFilePath, docId, context) {
  const { sourceDir, versionOutputPath, searchIndex, fileSourceType } = context;
  const sourceFilePath = path.join(sourceDir, relativeFilePath);
  const outputFileName = relativeFilePath.replace(/\.md$/, ".html");
  const outputFilePath = path.join(versionOutputPath, outputFileName);

  console.log(`  Processing ${fileSourceType} file: ${relativeFilePath} (Doc ID: ${docId})`);

  try {
    // Ensure the target directory for the HTML file exists
    await mkdir(path.dirname(outputFilePath), { recursive: true });

    const rawFileContent = await readFile(sourceFilePath, "utf-8");
    let frontMatter = {};
    let markdownBody = rawFileContent;
    try {
      const parsed = grayMatter(rawFileContent);
      frontMatter = parsed.data || {};
      markdownBody = parsed.content;
    } catch (e) {
      console.warn(`    Could not parse front matter for ${relativeFilePath}. Error: ${e.message}`);
    }

    const fallbackTitle = path
      .basename(relativeFilePath, ".md")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const { html: htmlContent, title: extractedH1Title, textContent, sections } = processMarkdown(markdownBody, fallbackTitle);

    const finalTitle = frontMatter.title || extractedH1Title || fallbackTitle;

    const isObsoleted = frontMatter?.obsoleted_by || frontMatter?.status?.toLowerCase() === "obsoleted" || frontMatter?.status?.toLowerCase() === "superseded";

    // Add document to search index and map
    const sectionsText = sections.map((s) => s.text).join(" ");

    // searchIndex.add is synchronous
    searchIndex.add({
      id: docId,
      title: finalTitle,
      content: textContent,
      sections_text: sectionsText,
      isObsoleted: isObsoleted,
    });

    // Prepare the document map entry
    const searchDocMapEntry = {
      docId: docId,
      mapEntry: {
        title: finalTitle,
        href: outputFileName,
        sections: sections,
        isObsoleted: isObsoleted,
      },
    };

    // Only include in navigation if not obsoleted
    let processedPage = null;
    if (!isObsoleted) {
      const navTitle = frontMatter.nav_label || finalTitle;
      processedPage = { file: outputFileName, title: navTitle, nav_order: frontMatter.nav_order };
    } else {
      console.log(`    Skipping nav for obsoleted: ${relativeFilePath}`);
    }

    await writeFile(outputFilePath, htmlContent);
    return { processedPage, searchDocMapEntry, error: null };
  } catch (processError) {
    console.error(`    Failed processing file ${relativeFilePath}: ${processError.message}`);
    return {
      processedPage: null,
      searchDocMapEntry: null,
      error: processError,
    };
  }
}

/**
 * Processes a list of Markdown files from a given source directory (in parallel).
 * @param {string[]} files - Array of file paths relative to sourceDir.
 * @param {VersionProcessingContext} context - Context object for version processing.
 * @param {number} initialDocId - The starting document ID counter for this batch.
 * @returns {Promise<{processedPages: Array, nextDocId: number}>} - Processed pages for navigation and the next doc ID.
 */
async function processMarkdownFiles(files, context, initialDocId) {
  if (files.length === 0) {
    console.log(`  No ${context.fileSourceType} files found to process.`);
    return { processedPages: [], nextDocId: initialDocId };
  }

  console.log(`  Processing ${files.length} ${context.fileSourceType} files in parallel...`);

  // Assign sequential doc IDs before starting parallel processing
  const filesWithIds = files.map((file, index) => ({
    relativeFilePath: file,
    docId: initialDocId + index,
  }));

  // Create an array of promises for processing each file
  const processingPromises = filesWithIds.map(({ relativeFilePath, docId }) => processSingleMarkdownFile(relativeFilePath, docId, context));

  // Wait for all promises to settle
  const results = await Promise.allSettled(processingPromises);

  const processedPages = [];
  let successfulCount = 0;
  let failedCount = 0;

  // Process results using the new helper
  for (const result of results) {
    const { successful, failed } = handleFileProcessingResult(result, context, processedPages);
    successfulCount += successful;
    failedCount += failed;
  }

  console.log(`  Finished processing files. Successful: ${successfulCount}, Failed: ${failedCount}.`);

  const nextDocId = initialDocId + files.length;
  return { processedPages, nextDocId };
}

/**
 * Exports the search index and map to JSON files.
 * @param {{versionOutputPath: string, searchIndex: FlexSearch.Document, searchDocMap: object}} params - Export parameters.
 */
async function exportSearchData({ versionOutputPath, searchIndex, searchDocMap }) {
  console.log("  Exporting search index and map...");
  const searchIndexPath = path.join(versionOutputPath, SEARCH_INDEX_FILE);
  const searchMapPath = path.join(versionOutputPath, SEARCH_MAP_FILE);
  const indexExports = {};
  try {
    searchIndex.export((key, data) => {
      if (data !== undefined && data !== null) indexExports[key] = data;
    });
    if (Object.keys(indexExports).length > 0) {
      await writeFile(searchIndexPath, JSON.stringify(indexExports, null, 0), "utf8");
      console.log(`    Search index saved to ${SEARCH_INDEX_FILE}`);
    } else {
      console.warn("    Search index export resulted in empty data. No index file written.");
    }
    // Always write the search map even if the index is empty
    await writeFile(searchMapPath, JSON.stringify(searchDocMap, null, 2), "utf8");
    console.log(`    Search map saved to ${SEARCH_MAP_FILE}`);
  } catch (exportError) {
    console.error(`    Error exporting search data: ${exportError.message}`);
    throw exportError;
  }
}

/**
 * Sets up the output directory, cleaning it if it exists and is a directory.
 * @param {BuildContext} buildContext - The build context.
 * @returns {Promise<void>}
 * @throws {Error} If the output path exists and is a file.
 */
async function setupOutputDirectory(buildContext) {
  console.log(`Cleaning up old output directory: ${path.relative(buildContext.rootDir, buildContext.outputDir)}...`);
  const outputDirExists = fs.existsSync(buildContext.outputDir);
  if (outputDirExists) {
    const stats = fs.statSync(buildContext.outputDir);
    if (!stats.isDirectory()) {
      console.error(`--- Error: Output path conflicts with an existing file: ${buildContext.outputDir} ---`);
      console.error("--- Please remove or rename this file and retry. ---");
      throw new Error("Output path conflicts with a file.");
    }
    console.log(`Output directory ${path.relative(buildContext.rootDir, buildContext.outputDir)} exists. Cleaning contents...`);
    const contents = await readdir(buildContext.outputDir);
    if (contents.length > 0) {
      console.log(`Removing ${contents.length} items from ${path.relative(buildContext.rootDir, buildContext.outputDir)}...`);
      await Promise.all(
        contents.map((item) =>
          rm(path.join(buildContext.outputDir, item), {
            recursive: true,
            force: true,
          }),
        ),
      );
      console.log("Contents cleaned.");
    } else {
      console.log("Output directory is already empty.");
    }
  } else {
    console.log(`Creating output directory: ${path.relative(buildContext.rootDir, buildContext.outputDir)}`);
    await mkdir(buildContext.outputDir, { recursive: true });
  }
}

/**
 * Determines the default file for a version based on preferred names.
 * @param {Array<{file: string, title: string}>} versionNavPages - Array of processed pages for the version.
 * @returns {string} - The determined default file name.
 */
function determineDefaultFile(versionNavPages) {
  let defaultFile = PREFERRED_DEFAULT_FILES[0];
  for (const pref of PREFERRED_DEFAULT_FILES) {
    const foundPage = versionNavPages.find((p) => p.file.toLowerCase() === pref);
    if (foundPage) {
      defaultFile = foundPage.file;
      break;
    }
  }
  if (defaultFile === PREFERRED_DEFAULT_FILES[0] && versionNavPages.length > 0 && !versionNavPages.some((p) => p.file.toLowerCase() === PREFERRED_DEFAULT_FILES[0])) {
    defaultFile = versionNavPages[0].file;
  }
  return defaultFile;
}

/**
 * Processes all configured versions, cloning/updating repos (if needed),
 * processing Markdown files, and generating search data.
 * @param {BuildContext} buildContext - The build context.
 * @returns {Promise<Array<object>>} - Array of processed version data for versions.json.
 */
async function processVersions(buildContext) {
  const allVersionsData = [];

  for (const version of buildContext.config.versions) {
    try {
      const versionData = await processSingleVersion(version, buildContext);
      allVersionsData.push(versionData);
    } catch (error) {
      console.error(`\n--- Fatal Error processing version ${version.label}: ${error.message} ---`);
    }
  }

  return allVersionsData;
}

/**
 * Bundles the client-side JavaScript using esbuild.
 * @param {BuildContext} buildContext - The build context.
 * @returns {Promise<void>}
 * @throws {Error} If bundling fails or output directory path conflicts with a file.
 */
async function bundleJavaScript(buildContext) {
  console.log("\nBundling client-side JavaScript...");
  const jsEntryPoint = path.join(buildContext.srcDir, "main.js");
  const jsOutFile = path.join(buildContext.outputDir, ASSETS_DIR, BUNDLE_FILE);
  const jsOutDir = path.dirname(jsOutFile);

  try {
    const dirExists = fs.existsSync(jsOutDir);
    if (dirExists) {
      const stats = fs.statSync(jsOutDir);
      if (!stats.isDirectory()) {
        console.error(`--- Error: Output directory path conflicts with an existing file: ${jsOutDir} ---`);
        console.error("--- Please remove or rename this file and retry. ---");
        throw new Error("JS output directory path conflicts with a file.");
      }
      console.log(`Output directory ${jsOutDir} already exists.`);
    } else {
      console.log(`Creating output directory: ${jsOutDir}`);
      await mkdir(jsOutDir, { recursive: true });
    }

    console.log(`Running esbuild to bundle ${jsEntryPoint}...`);
    await esbuild.build({
      entryPoints: [jsEntryPoint],
      outfile: jsOutFile,
      bundle: true,
      minify: true,
      sourcemap: true,
      treeShaking: true,
      format: "iife",
      logLevel: "info",
    });
    console.log(`Client-side JS bundled successfully to ${path.relative(buildContext.rootDir, jsOutFile)}`);
  } catch (error) {
    console.error("--- Error during client-side JavaScript bundling or directory setup ---");
    console.error(error);
    throw error;
  }
}

/**
 * Copies other static assets (CSS, index.html, etc.).
 * @param {BuildContext} buildContext - The build context.
 * @returns {Promise<void>}
 */
async function copyStaticAssets(buildContext) {
  console.log("\nCopying other static assets (CSS, index.html, etc)...");
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
  ];

  await Promise.all(
    assetsToCopy.map(async (asset) => {
      try {
        if (fs.existsSync(asset.source)) {
          const destDir = path.dirname(asset.dest);
          // Check if destination directory exists and create if necessary
          await mkdir(destDir, { recursive: true });
          await copyFile(asset.source, asset.dest);
          console.log(`Copied ${path.relative(buildContext.rootDir, asset.source)} to ${path.relative(buildContext.rootDir, asset.dest)}`);
        } else {
          // Only warn for non-essential assets if missing
          if (!asset.source.endsWith("index.html") && !asset.source.endsWith("style.css")) {
            console.warn(`Asset source not found, skipping copy: ${path.relative(buildContext.rootDir, asset.source)}`);
          }
        }
      } catch (copyError) {
        console.error(`Failed to copy asset ${path.relative(buildContext.rootDir, asset.source)}: ${copyError.message}`);
        throw copyError;
      }
    }),
  );
  console.log("Finished copying other static assets.");
}

/**
 * Writes the versions.json file.
 * @param {BuildContext} buildContext - The build context.
 * @param {Array<object>} allVersionsData - Data structure for versions.json.
 * @returns {Promise<void>}
 */
async function writeVersionsFile(buildContext, allVersionsData) {
  const versionsJsonPath = path.join(buildContext.outputDir, VERSIONS_FILE);
  console.log(`Creating ${path.relative(buildContext.rootDir, versionsJsonPath)}...`);
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
  );
}

/**
 * Performs the documentation build process, including FlexSearch index generation.
 * @param {BuildContext} buildContext - The build context.
 * @returns {Promise<void>}
 */
async function performBuildProcess(buildContext) {
  console.log("\nStarting documentation build...");

  await setupOutputDirectory(buildContext);
  const allVersionsData = await processVersions(buildContext);
  await bundleJavaScript(buildContext);
  await copyStaticAssets(buildContext);
  await writeVersionsFile(buildContext, allVersionsData);

  console.log("\n--- Running Post-processing Steps (if any) ---");
  console.log("\nDocumentation build finished successfully!");
  console.log(`Output available in: ${path.relative(buildContext.rootDir, buildContext.outputDir)}`);
}

/**
 * Parses command line arguments.
 * @param {string[]} args - Array of command line arguments (excluding node path and script path).
 * @returns {{gitOnly: boolean, buildOnly: boolean, help: boolean}} - Parsed arguments.
 */
function parseArgs(args) {
  const gitOnly = args.includes("--git-only");
  const buildOnly = args.includes("--build-only") || args.includes("--skip-git");
  const help = args.includes("--help") || args.includes("-h");

  if (gitOnly && buildOnly) {
    console.error("--- Error: Cannot use --git-only and --build-only together. ---");
    process.exit(1);
  }

  return { gitOnly, buildOnly, help };
}

function runPreProcessing() {
  console.log("\n--- Running Pre-processing Steps (if any) ---");
}

function showHelp(scriptPath, rootDir) {
  console.log(`
Usage: node ${path.relative(rootDir, scriptPath)} [options]

Builds the documentation site by cloning/updating source repositories and processing Markdown files.

Options:
  --git-only      Only perform the Git clone/update and checkout steps. Skip the build process.
  --build-only    Only perform the build process (Markdown to HTML, copy assets). Assumes source
                  repositories are already present in the temporary directory (--tempDir).
                  Equivalent to --skip-git.
  --skip-git      Alias for --build-only.
  --help, -h      Show this help message and exit.

If no options are specified, both Git operations and the build process are performed (default behavior).
`);
}

/**
 * Executes the main build steps based on parsed arguments.
 * @param {{gitOnly: boolean, buildOnly: boolean, help: boolean}} options - Parsed command line options.
 * @param {BuildContext} buildContext - The overall build context.
 * @returns {Promise<void>}
 * @throws {Error} If any major step fails.
 */
async function executeBuildSteps(options, buildContext) {
  const { gitOnly, buildOnly } = options;

  const shouldRunGit = !buildOnly;
  const shouldRunBuild = !gitOnly;

  runPreProcessing();

  if (shouldRunGit) {
    await performGitOperations(buildContext);
  } else {
    console.log("\n--- Skipping Git Operations ---");
    if (shouldRunBuild && !fs.existsSync(buildContext.tempDir)) {
      console.error(`--- Error: --build-only used, but temp dir missing: ${path.relative(buildContext.rootDir, buildContext.tempDir)} ---`);
      process.exit(1);
    }
  }

  if (shouldRunBuild) {
    await performBuildProcess(buildContext);
  } else {
    console.log("\n--- Skipping Documentation Build ---");
  }

  if (!shouldRunGit && !shouldRunBuild) {
    console.log("No actions specified. Use --help for usage.");
  }
}

/**
 * Main execution function.
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const buildContext = {
    config,
    tempDir,
    outputDir,
    srcDir,
    rootDir,
  };

  if (options.help) {
    showHelp(__filename, rootDir);
    process.exit(0);
  }

  try {
    await executeBuildSteps(options, buildContext);
  } catch (error) {
    console.error("\nProcess failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
