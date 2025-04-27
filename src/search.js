// src/search.js

import FlexSearch from "flexsearch";
// DOM Elements (references stored during initialization)
let _searchInput = null;
let _searchResultsContainer = null;

// State

let searchIndex = null;
let searchDocMap = null;
let searchDebounceTimer = null;
let highlightedResultIndex = -1;

// Callback to get current version ID (set during initialization)
let _getCurrentVersionId = () => null;

/**
 * Creates an HTML snippet with highlighted terms.
 * Extracts query term processing into a helper function.
 * @param {string} text
 * @param {string} query
 * @param {number} maxLength
 * @returns {string}
 */
function createSnippet(text, query, maxLength = 100) {
  if (!text) return "";
  const textString = String(text);
  const queryTerms = getQueryTerms(query);

  if (queryTerms.length === 0) {
    const snippet = textString.substring(0, maxLength);
    return textString.length > maxLength ? `${snippet}...` : snippet;
  }

  const lowerText = textString.toLowerCase();
  const bestStartIndex = findBestStartIndex(lowerText, queryTerms, maxLength, textString.length);

  let snippet = textString.substring(bestStartIndex, bestStartIndex + maxLength);
  if (bestStartIndex > 0) snippet = `...${snippet}`;
  if (bestStartIndex + maxLength < textString.length) snippet += "...";

  snippet = highlightTermsInSnippet(snippet, queryTerms);

  return snippet;
}

/**
 * Helper function to extract and filter query terms.
 * @param {string} query
 * @returns {string[]}
 */
function getQueryTerms(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Helper function to find the optimal start index for the snippet.
 * @param {string} lowerText
 * @param {string[]} queryTerms
 * @param {number} maxLength
 * @param {number} originalLength
 * @returns {number}
 */
function findBestStartIndex(lowerText, queryTerms, maxLength, originalLength) {
  let bestStartIndex = -1;
  for (const term of queryTerms) {
    const index = lowerText.indexOf(term);
    if (index !== -1) {
      bestStartIndex = Math.max(0, index - Math.floor(maxLength / 4));
      break;
    }
  }
  if (bestStartIndex === -1) bestStartIndex = 0;
  return Math.max(0, Math.min(bestStartIndex, originalLength - 1));
}

/**
 * Helper function to highlight terms within a text snippet.
 * @param {string} snippet
 * @param {string[]} queryTerms
 * @returns {string}
 */
function highlightTermsInSnippet(snippet, queryTerms) {
  let highlightedSnippet = snippet;
  for (const term of queryTerms) {
    const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(${escapedTerm})`, "gi");
    highlightedSnippet = highlightedSnippet.replace(regex, "<mark>$1</mark>");
  }
  return highlightedSnippet;
}

/**
 * Highlights a specific search result item visually and handles scrolling.
 * (Implementation moved here - uses module-scoped _searchResultsContainer & highlightedResultIndex)
 * @param {number} index
 */
function highlightSearchResult(index) {
  if (!_searchResultsContainer) return; // Guard clause
  const resultsItems = _searchResultsContainer.querySelectorAll("li a");
  resultsItems.forEach((item, i) => {
    item.classList.toggle("highlighted", i === index);
    if (i === index) {
      item.scrollIntoView({ block: "nearest" });
    }
  });
  highlightedResultIndex = index;
}

/**
 * Performs the search using the loaded index and renders results.
 * Refactored to delegate result processing and rendering to helper functions.
 * @param {string} query
 */
function performSearch(query) {
  if (!_searchResultsContainer || !_searchInput) return;

  resetSearchUIState();

  if (!searchIndex || !searchDocMap) {
    displaySearchNotReady();
    return;
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return;
  }

  const results = executeFlexSearch(trimmedQuery);
  if (results === null) {
    return;
  }

  const uniqueDocResults = processFlexSearchResults(results, searchDocMap);
  if (uniqueDocResults === null) {
    displayUnexpectedResultsError();
    return;
  }

  const finalResults = sortSearchResults(uniqueDocResults);

  renderSearchResults(finalResults, trimmedQuery);
}

/**
 * Resets the search UI state (hides results, clears content, resets highlight).
 */
function resetSearchUIState() {
  highlightedResultIndex = -1;
  _searchResultsContainer.innerHTML = "";
  _searchResultsContainer.hidden = true;
}

/**
 * Displays a message indicating the search is not ready.
 */
function displaySearchNotReady() {
  _searchResultsContainer.innerHTML = '<div class="no-results">Search not ready.</div>';
  _searchResultsContainer.hidden = false;
}

/**
 * Executes the FlexSearch query and handles potential errors.
 * @param {string} query
 * @returns {Array|null} The raw FlexSearch results, or null if an error occurred.
 */
function executeFlexSearch(query) {
  let results = [];
  try {
    results = searchIndex.search(query, {
      limit: 20,
      suggest: true,
      enrich: true,
    });
    return results;
  } catch (searchError) {
    console.error("Search failed:", searchError);
    _searchResultsContainer.innerHTML = '<div class="no-results">Search error.</div>';
    _searchResultsContainer.hidden = false;
    return null;
  }
}

/**
 * Displays a message for unexpected results format.
 */
function displayUnexpectedResultsError() {
  _searchResultsContainer.innerHTML = '<div class="no-results">Search error: Unexpected results.</div>';
  _searchResultsContainer.hidden = false;
}

/**
 * Processes the raw FlexSearch results and the document map into a map of unique documents with metadata and scores.
 * Refactored to delegate processing of items within each field result to a helper.
 * @param {Array} results - The raw results from FlexSearch.
 * @param {object} searchDocMap - The map from doc ID to document metadata.
 * @returns {Map<any, {doc: object, score: number, matchedField: string}> | null} A map of unique results, or null if results format is unexpected.
 */
function processFlexSearchResults(results, searchDocMap) {
  if (!Array.isArray(results)) {
    console.error("Unexpected FlexSearch results format:", results);
    return null;
  }

  const uniqueDocResults = new Map();

  for (const fieldResult of results) {
    if (!fieldResult || !Array.isArray(fieldResult.result)) continue;

    processFieldResultItems(fieldResult, searchDocMap, uniqueDocResults);
  }
  return uniqueDocResults;
}

/**
 * Processes the items within a single field result and adds unique documents to the results map.
 * @param {object} fieldResult - A single result object from FlexSearch containing 'field' and 'result'.
 * @param {object} searchDocMap - The map from doc ID to document metadata.
 * @param {Map<any, {doc: object, score: number, matchedField: string}>} uniqueDocResults - The map to add unique processed documents to.
 */
function processFieldResultItems(fieldResult, searchDocMap, uniqueDocResults) {
  for (const item of fieldResult.result) {
    const processedDoc = processSingleSearchResultItem(item, fieldResult.field, searchDocMap);
    if (processedDoc) {
      const existing = uniqueDocResults.get(processedDoc.id);
      // Only add/update if new score is better or doc isn't already added
      if (!existing || processedDoc.score > existing.score) {
        uniqueDocResults.set(processedDoc.id, processedDoc);
      }
    }
  }
}

/**
 * Processes a single search result item from FlexSearch.
 * Determines the document ID, retrieves map data, constructs the document with metadata, and calculates a score.
 * @param {object|number|string} item - The raw item from the FlexSearch result array.
 * @param {string} field - The field the item was matched in.
 * @param {object} searchDocMap - The map from doc ID to document metadata.
 * @returns {{id: any, doc: object, score: number, matchedField: string} | null} Processed document object or null if item is invalid or map entry is missing.
 */
function processSingleSearchResultItem(item, field, searchDocMap) {
  const docId = getDocIdFromSearchResultItem(item);
  if (docId === null) {
    console.warn("Skipping unexpected item format in FlexSearch results:", item);
    return null;
  }

  const mapDoc = searchDocMap[docId];
  if (!mapDoc) {
    console.error(`Doc ID ${docId} found in search index but missing from search map! Skipping.`);
    return null;
  }

  const enrichedDocData = typeof item === "object" ? item.doc : null;
  const docWithMetadata = buildDocumentWithMetadata(docId, enrichedDocData, mapDoc);
  const score = calculateScore(field, docWithMetadata.isObsoleted);

  return {
    id: docId,
    doc: docWithMetadata,
    score: score,
    matchedField: field,
  };
}

/**
 * Builds a consolidated document object from enriched data and map data.
 * @param {any} docId - The document ID.
 * @param {object|null} enrichedDocData - Enriched data from FlexSearch.
 * @param {object} mapDoc - Document data from the search map.
 * @returns {object} The combined document object.
 */
function buildDocumentWithMetadata(docId, enrichedDocData, mapDoc) {
  return {
    id: docId,
    title: enrichedDocData?.title || mapDoc.title,
    content: enrichedDocData?.content || mapDoc.content || null,
    sections_text: enrichedDocData?.sections_text || mapDoc.sections_text || null,
    href: mapDoc.href,
    sections: mapDoc.sections,
    isObsoleted: mapDoc.isObsoleted,
  };
}

/**
 * Calculates a score for a search result based on the matched field and obsoletion status.
 * @param {string} field - The field that matched.
 * @param {boolean} isObsoleted - Whether the document is obsoleted.
 * @returns {number} The calculated score.
 */
function calculateScore(field, isObsoleted) {
  let score = 0;
  if (field === "title") score = 3;
  else if (field === "sections_text") score = 2;
  else if (field === "content") score = 1;
  if (isObsoleted) score -= 0.5;
  return score;
}

/**
 * Extracts the document ID from a raw FlexSearch result item.
 * @param {object|number|string} item - The raw item.
 * @returns {any|null} The document ID, or null if the format is unexpected.
 */
function getDocIdFromSearchResultItem(item) {
  if (item && typeof item === "object" && item.id !== undefined) {
    return item.id;
  }
  if (typeof item === "number" || typeof item === "string") {
    return item;
  }
  return null;
}

/**
 * Sorts the unique document results by score in descending order.
 * @param {Map<any, {doc: object, score: number, matchedField: string}>} uniqueDocResults
 * @returns {Array<{doc: object, score: number, matchedField: string}>} Sorted array of results.
 */
function sortSearchResults(uniqueDocResults) {
  return Array.from(uniqueDocResults.values()).sort((a, b) => b.score - a.score);
}

/**
 * Renders the final sorted search results into the DOM.
 * @param {Array<{doc: object, score: number, matchedField: string}>} finalResults
 * @param {string} trimmedQuery - The search query used for snippet highlighting.
 */
function renderSearchResults(finalResults, trimmedQuery) {
  if (_searchResultsContainer === null) return; // Defensive check

  if (finalResults.length === 0) {
    _searchResultsContainer.innerHTML = '<div class="no-results">No results found.</div>';
  } else {
    const fragment = document.createDocumentFragment();
    const currentVersion = _getCurrentVersionId();

    for (const resultItem of finalResults) {
      const listItem = createSearchResultItemElement(resultItem, trimmedQuery, currentVersion);
      if (listItem) {
        fragment.appendChild(listItem);
      }
    }
    const ul = document.createElement("ul");
    ul.appendChild(fragment);
    _searchResultsContainer.appendChild(ul);
  }

  _searchResultsContainer.hidden = false;
}

/**
 * Creates a single list item element for a search result.
 * @param {{doc: object, score: number, matchedField: string}} resultItem
 * @param {string} trimmedQuery
 * @param {string} currentVersion
 * @returns {HTMLElement | null} The created li element, or null if doc is missing.
 */
function createSearchResultItemElement(resultItem, trimmedQuery, currentVersion) {
  const doc = resultItem.doc;
  if (!doc) return null;

  const matchedField = resultItem.matchedField;
  const { snippetText, bestSectionId } = getSnippetAndSectionId(doc, matchedField, trimmedQuery);

  let href = `#${currentVersion}/${doc.href}`;
  if (bestSectionId) {
    href += `#${bestSectionId}`;
  }

  const snippetHtml = createSnippet(snippetText, trimmedQuery, 100);

  const li = document.createElement("li");
  if (doc.isObsoleted) li.classList.add("result-obsoleted");

  const a = document.createElement("a");
  a.href = href;
  a.innerHTML = `
            <span class="result-title">${doc.title}</span>
            ${doc.isObsoleted ? '<span class="result-status">(Obsoleted)</span>' : ""}
            ${snippetHtml ? `<span class="result-context">${snippetHtml}</span>` : ""}
        `;
  li.appendChild(a);
  return li;
}

/**
 * Determines the text for the snippet and the best section ID based on the matched field.
 * @param {object} doc - The document object.
 * @param {string} matchedField - The field that primarily matched the query.
 * @param {string} trimmedQuery - The user's search query.
 * @returns {{snippetText: string, bestSectionId: string | null}}
 */
function getSnippetAndSectionId(doc, matchedField, trimmedQuery) {
  let snippetText = "";
  let bestSectionId = null;

  if (matchedField === "sections_text" && doc.sections?.length > 0) {
    const lowerQuery = trimmedQuery.toLowerCase();
    const matchingSection = doc.sections.find((s) => s.text?.toLowerCase().includes(lowerQuery));

    if (matchingSection) {
      snippetText = matchingSection.text;
      bestSectionId = matchingSection.id;
    } else {
      // Fallback if no specific section text matches the query within the sections list
      snippetText = doc.content || doc.title || "";
    }
  } else {
    // If not matched in sections_text, use content or title
    snippetText = (matchedField === "title" ? doc.title : doc.content) || doc.title || "";
  }

  return { snippetText, bestSectionId };
}

/**
 * Handles keyboard events (arrows, enter, esc) on the search input.
 * Refactored to delegate specific key handling to helper functions.
 * @param {KeyboardEvent} event
 */
function handleSearchKeyDown(event) {
  if (!_searchResultsContainer || _searchResultsContainer.hidden) return;

  const resultsItems = _searchResultsContainer.querySelectorAll("li a");
  if (!resultsItems.length) return;

  let newIndex = highlightedResultIndex;
  let preventDefault = false;

  switch (event.key) {
    case "ArrowDown":
      ({ newIndex, preventDefault } = handleArrowDown(resultsItems.length, highlightedResultIndex));
      break;
    case "ArrowUp":
      ({ newIndex, preventDefault } = handleArrowUp(resultsItems.length, highlightedResultIndex));
      break;
    case "Enter":
      preventDefault = handleEnterKey(resultsItems, highlightedResultIndex);
      break;
    case "Escape":
      preventDefault = handleEscapeKey(_searchResultsContainer, _searchInput, highlightSearchResult);
      break;
    default:
      return;
  }

  if (preventDefault) {
    event.preventDefault();
    if (newIndex !== highlightedResultIndex) {
      highlightSearchResult(newIndex);
    }
  }
}

/**
 * Handles the 'ArrowDown' key press.
 * @param {number} totalResults - The total number of search results.
 * @param {number} currentIndex - The currently highlighted index.
 * @returns {{newIndex: number, preventDefault: boolean}}
 */
function handleArrowDown(totalResults, currentIndex) {
  const newIndex = (currentIndex + 1) % totalResults;
  return { newIndex, preventDefault: true };
}

/**
 * Handles the 'ArrowUp' key press.
 * @param {number} totalResults - The total number of search results.
 * @param {number} currentIndex - The currently highlighted index.
 * @returns {{newIndex: number, preventDefault: boolean}}
 */
function handleArrowUp(totalResults, currentIndex) {
  const newIndex = (currentIndex - 1 + totalResults) % totalResults;
  return { newIndex, preventDefault: true };
}

/**
 * Handles the 'Enter' key press.
 * Clicks the highlighted result or the first result if none is highlighted.
 * Simplified redundant else if clause.
 * @param {NodeListOf<HTMLAnchorElement>} resultsItems - The list of result links.
 * @param {number} highlightedIndex - The currently highlighted index.
 * @returns {boolean} Whether default action should be prevented.
 */
function handleEnterKey(resultsItems, highlightedIndex) {
  if (highlightedIndex >= 0 && highlightedIndex < resultsItems.length) {
    resultsItems[highlightedIndex].click();
    return true;
  }
  // If a specific item wasn't highlighted or didn't exist, click the first one if available
  if (resultsItems.length > 0) {
    resultsItems[0].click();
    return true;
  }
  return false; // Do not prevent default if no results
}

/**
 * Handles the 'Escape' key press.
 * Hides the results, clears the input, and clears the highlight.
 * @param {HTMLElement} resultsContainer - The search results container element.
 * @param {HTMLInputElement} searchInput - The search input element.
 * @param {function(number): void} highlightFn - The function to highlight a result.
 * @returns {boolean} Whether default action should be prevented.
 */
function handleEscapeKey(resultsContainer, searchInput, highlightFn) {
  resultsContainer.hidden = true;
  if (searchInput) searchInput.value = "";
  highlightFn(-1);
  return true;
}

/**
 * Handles clicks within the search results container, cleaning up state.
 * (Implementation moved here - uses module-scoped variables/elements)
 * @param {MouseEvent} event
 */
function handleSearchResultClick(event) {
  const targetLink = event.target.closest("a");
  if (targetLink && _searchResultsContainer && _searchResultsContainer.contains(targetLink)) {
    if (_searchInput) _searchInput.value = "";
    _searchResultsContainer.hidden = true;
    _searchResultsContainer.innerHTML = "";
    highlightSearchResult(-1);
  }
}

/**
 * Loads the search index and map for the given version.
 * EXPORTED - Called from main.js when version changes.
 * @param {string} versionId
 */
export async function loadSearchIndex(versionId) {
  resetSearchState();
  updateLoadStateUI("Loading search...");

  if (!versionId) {
    handleLoadError("No version ID provided to load search index.", "Select version first");
    return;
  }

  const indexPath = `${versionId}/search_index.json`;
  const mapPath = `${versionId}/search_map.json`;

  try {
    const [indexData, mapData] = await fetchIndexData(indexPath, mapPath, versionId);
    const newIndex = createAndImportIndex(indexData);

    searchIndex = newIndex;
    searchDocMap = mapData;

    updateLoadStateUI("Search docs...");
    console.log(`Search index loaded for version ${versionId}`);
    if (_searchInput) {
      _searchInput.disabled = false;
      _searchInput.placeholder = "Search...";
    }
  } catch (error) {
    handleLoadError(`Error loading search index for version ${versionId}: ${error}`, "Search failed to load");
  }
}

/**
 * Resets the module-scoped state variables for search.
 */
function resetSearchState() {
  searchIndex = null;
  searchDocMap = null;
  highlightedResultIndex = -1;
}

/**
 * Updates the UI state of the search input and results container during loading.
 * @param {string} placeholderText - The text to set as the input placeholder.
 */
function updateLoadStateUI(placeholderText) {
  if (_searchInput) {
    _searchInput.disabled = true;
    _searchInput.placeholder = placeholderText;
  }
  if (_searchResultsContainer) {
    _searchResultsContainer.hidden = true;
    _searchResultsContainer.innerHTML = "";
  }
}

/**
 * Handles errors during index loading by logging and updating UI.
 * @param {string} consoleMessage - The error message for console.error.
 * @param {string} placeholderText - The text to set as the input placeholder.
 */
function handleLoadError(consoleMessage, placeholderText) {
  console.error(consoleMessage);
  searchIndex = null;
  searchDocMap = null;
  if (_searchInput) {
    _searchInput.disabled = true;
    _searchInput.placeholder = placeholderText;
  }
}

/**
 * Fetches the search index and map data from the specified paths.
 * @param {string} indexPath - Path to the search index JSON.
 * @param {string} mapPath - Path to the search map JSON.
 * @param {string} versionId - The version ID being loaded (for error messages).
 * @returns {Promise<[object, object]>} A promise that resolves with an array containing indexData and mapData.
 * @throws {Error} If fetching fails.
 */
async function fetchIndexData(indexPath, mapPath, versionId) {
  const [indexResponse, mapResponse] = await Promise.all([fetch(indexPath), fetch(mapPath)]);

  if (!indexResponse.ok) throw new Error(`Failed to fetch search index for version ${versionId}: ${indexResponse.statusText}`);
  if (!mapResponse.ok) throw new Error(`Failed to fetch search map for version ${versionId}: ${mapResponse.statusText}`);

  const indexData = await indexResponse.json();
  const mapData = await mapResponse.json();

  return [indexData, mapData];
}

/**
 * Creates a new FlexSearch Document index and imports the provided data.
 * @param {object} indexData - The parsed JSON data for the FlexSearch index.
 * @returns {FlexSearch.Document} The populated FlexSearch index instance.
 */
function createAndImportIndex(indexData) {
  const newIndex = new FlexSearch.Document({
    document: { id: "id", index: ["title", "content", "sections_text"] },
    tokenize: "forward",
    context: { depth: 2, resolution: 9 },
  });

  for (const key in indexData) {
    if (Object.prototype.hasOwnProperty.call(indexData, key)) {
      importIndexPart(newIndex, key, indexData[key]);
    }
  }

  return newIndex;
}

/**
 * Imports a single part of the search index into the FlexSearch instance.
 * @param {FlexSearch.Document} indexInstance - The FlexSearch index instance.
 * @param {string} key - The key for the index part.
 * @param {any} data - The data for the index part.
 */
function importIndexPart(indexInstance, key, data) {
  if (typeof indexInstance.import === "function") {
    try {
      indexInstance.import(key, data);
    } catch (importError) {
      console.error(`Error importing index part '${key}':`, importError);
    }
  } else {
    console.warn(`FlexSearch instance missing 'import' method. Cannot import key '${key}'.`);
  }
}

/**
 * Initializes the search functionality and sets up event listeners.
 * Accepts a context object containing necessary DOM elements and callbacks.
 * EXPORTED - Called from main.js during startup.
 * @param {{searchInput: HTMLElement, searchResultsContainer: HTMLElement, getCurrentVersionId: function(): string|null}} context - The application context object with required search properties.
 */
export function initializeSearch(context) {
  // Validate context and extract properties
  if (!context || !context.searchInput || !context.searchResultsContainer || typeof context.getCurrentVersionId !== "function") {
    console.error("Search initialization failed: Missing required properties in context object.");
    // Attempt to disable the input if it exists in the context
    if (context?.searchInput) context.searchInput.disabled = true;
    return;
  }

  // Store references to module-scoped variables
  _searchInput = context.searchInput;
  _searchResultsContainer = context.searchResultsContainer;
  _getCurrentVersionId = context.getCurrentVersionId;

  // Input event with debouncing
  _searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    const query = _searchInput.value;
    if (!query || query.trim().length === 0) {
      if (_searchResultsContainer) {
        _searchResultsContainer.hidden = true;
        _searchResultsContainer.innerHTML = "";
      }
      highlightSearchResult(-1);
    } else {
      searchDebounceTimer = setTimeout(() => {
        performSearch(query);
      }, 250);
    }
  });

  // Keyboard navigation
  _searchInput.addEventListener("keydown", handleSearchKeyDown);

  // Clicking on results
  _searchResultsContainer.addEventListener("click", handleSearchResultClick);

  // Clicking outside to close results
  document.addEventListener("mousedown", (event) => {
    if (!_searchInput.contains(event.target) && !_searchResultsContainer.contains(event.target)) {
      _searchResultsContainer.hidden = true;
    }
  });

  // Show results on focus if they exist and input has text
  _searchInput.addEventListener("focus", () => {
    if (_searchInput.value.trim().length > 0 && _searchResultsContainer.innerHTML !== "" && !_searchResultsContainer.querySelector(".no-results")) {
      _searchResultsContainer.hidden = false;
    }
  });

  console.log("Search module initialized.");
}
