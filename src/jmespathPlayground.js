/**
 * Parses the JSON input string and handles potential errors.
 * @param {HTMLTextAreaElement} jsonInput - The JSON input element.
 * @param {HTMLElement} errorArea - The error display area.
 * @returns {object | null | undefined} - The parsed JSON data, null if input is empty, or undefined if parsing fails.
 */
function parseJsonInput(jsonInput, errorArea) {
  const jsonString = jsonInput.value;
  jsonInput.classList.remove("invalid-json");
  errorArea.textContent = "";

  if (jsonString.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    errorArea.textContent = `Invalid JSON: ${e.message}`;
    jsonInput.classList.add("invalid-json");
    return undefined;
  }
}

/**
 * Executes the JMESPath query and handles potential errors.
 * @param {any} jsonData - The data to query.
 * @param {HTMLTextAreaElement} queryInput - The query input element.
 * @param {HTMLElement} outputArea - The output display area.
 * @param {HTMLElement} errorArea - The error display area.
 */
function executeJmespathQuery(jsonData, queryInput, outputArea, errorArea) {
  const queryString = queryInput.value;
  outputArea.textContent = "";
  queryInput.classList.remove("border-red-500", "dark:border-red-400");

  if (queryString.trim() === "") {
    outputArea.textContent = "// Enter a JMESPath query";
    return;
  }

  try {
    const result = jmespath.search(jsonData, queryString);
    outputArea.textContent = JSON.stringify(result, null, 2);
  } catch (e) {
    errorArea.textContent = `Query Error: ${e.message}`;
    queryInput.classList.add("border-red-500", "dark:border-red-400");
  }
}

/**
 * Evaluates the JMESPath query based on the current input values.
 */
const evaluate = (jsonInput, queryInput, outputArea, errorArea) => {
  errorArea.textContent = "";
  outputArea.textContent = "";
  jsonInput.classList.remove("invalid-json");
  queryInput.classList.remove("border-red-500", "dark:border-red-400");

  const jsonData = parseJsonInput(jsonInput, errorArea);

  if (jsonData !== undefined) {
    executeJmespathQuery(jsonData, queryInput, outputArea, errorArea);
  }
};

/**
 * Synchronizes the visual state (content visibility and icon rotation) of a playground block.
 * Assumes CSS handles:
 * - `[hidden]` attribute for content visibility (`display: none;`)
 * - `button[aria-expanded="true"] .toggle-icon` for icon rotation (e.g., `transform: rotate(180deg);`)
 * @param {HTMLElement} content - The content div element.
 * @param {HTMLElement} toggleButton - The toggle button element.
 * The toggleIcon parameter is not used here, as CSS handles rotation based on aria-expanded.
 */
function syncPlaygroundVisualState(content, toggleButton) {
  const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
  content.hidden = !isExpanded;
}

/**
 * Initializes all JMESPath playgrounds within a given container.
 * @param {HTMLElement} container - The parent element containing the playgrounds.
 */
export function initializeJmespathPlaygrounds(container) {
  if (typeof jmespath === "undefined" || typeof jmespath.search !== "function") {
    console.warn("JMESPath library not loaded. Interactive examples disabled.");
    return;
  }

  const playgrounds = container.querySelectorAll(".jmespath-playground");

  playgrounds.forEach((playground, index) => {
    const toggleButton = playground.querySelector(".playground-toggle-button");
    const content = playground.querySelector(".playground-content");
    const jsonInput = playground.querySelector(".json-input");
    const queryInput = playground.querySelector(".query-input");
    const outputArea = playground.querySelector(".output-area code");
    const errorArea = playground.querySelector(".error-area");

    if (!toggleButton || !content || !jsonInput || !queryInput || !outputArea || !errorArea) {
      console.warn(`Playground #${index} missing required elements (toggle, content, inputs, output, or error area):`, playground);
      return;
    }

    syncPlaygroundVisualState(content, toggleButton);

    toggleButton.addEventListener("click", () => {
      const currentState = toggleButton.getAttribute("aria-expanded") === "true";
      const nextState = !currentState;

      toggleButton.setAttribute("aria-expanded", nextState);

      syncPlaygroundVisualState(content, toggleButton);

      if (nextState) {
        evaluate(jsonInput, queryInput, outputArea, errorArea);
        jsonInput.focus();
      }
    });

    let debounceTimeout;
    const debouncedEvaluate = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";
        if (isExpanded) {
          evaluate(jsonInput, queryInput, outputArea, errorArea);
        }
      }, 250);
    };

    jsonInput.addEventListener("input", debouncedEvaluate);
    queryInput.addEventListener("input", debouncedEvaluate);

    evaluate(jsonInput, queryInput, outputArea, errorArea);
  });
}
