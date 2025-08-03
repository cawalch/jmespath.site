// src/theme.js

// Module-scoped variables to hold references to DOM elements
let _htmlElement = null
let _themeToggleButton = null
let _siteLogoImage = null // New variable for the site logo image

/**
 * Applies the visual theme ('light' or 'dark').
 * Internal function, not exported.
 * @param {string} theme
 */
function applyTheme(theme) {
  // Guard clause: ensure elements are available
  if (!_htmlElement || !_themeToggleButton) return

  // Remove both theme classes and add the current one
  _htmlElement.classList.remove("dark", "light")
  _htmlElement.classList.add(theme)
  _htmlElement.setAttribute("data-theme", theme)
  _themeToggleButton.setAttribute("aria-pressed", theme === "dark")

  // Update button text content with emoji icons
  // Dark theme shows sun (switch to light), light theme shows moon (switch to dark)
  _themeToggleButton.textContent = theme === "dark" ? "☀" : "🌙"

  // Update site logo image based on theme
  if (_siteLogoImage) {
    _siteLogoImage.src = theme === "dark" ? "favicon-dark.svg" : "favicon.svg"
  }
}

/**
 * Toggles the theme and saves preference.
 * Internal function, not exported (used as event handler).
 */
function toggleTheme() {
  // Guard clause: ensure element is available
  if (!_htmlElement) return

  const newTheme = _htmlElement.classList.contains("dark") ? "light" : "dark"
  applyTheme(newTheme)
  try {
    localStorage.setItem("theme", newTheme)
  } catch (e) {
    console.error("Could not save theme preference:", e)
  }
}

/**
 * Initializes the theme functionality.
 * Sets the initial theme based on saved preference or system settings,
 * and attaches necessary event listeners.
 * THIS IS THE PUBLIC INTERFACE OF THE MODULE.
 * @param {HTMLElement} htmlElement - The root <html> element.
 * @param {HTMLElement} themeToggleButton - The button element for toggling.
 */
export function initializeTheme(htmlElement, themeToggleButton) {
  // Store the passed-in elements for use by internal functions
  _htmlElement = htmlElement
  _themeToggleButton = themeToggleButton

  if (!_htmlElement || !_themeToggleButton) {
    console.error("Theme initialization failed: Missing required elements.")
    return
  }

  // Find the site logo image by its new ID
  _siteLogoImage = document.getElementById("site-logo")
  if (!_siteLogoImage) {
    console.warn("Theme initialization: Could not find site logo image element.")
    // Continue initialization, theme switching will work for other elements
  }

  // Determine and apply initial theme
  // Check current state from HTML element (set by inline script)
  let currentTheme = "light" // default
  if (_htmlElement.classList.contains("dark")) {
    currentTheme = "dark"
  } else if (_htmlElement.classList.contains("light")) {
    currentTheme = "light"
  }

  // Apply the theme to ensure all elements are in sync
  applyTheme(currentTheme)

  // If no saved theme, save the current one
  const savedTheme = localStorage.getItem("theme")
  if (!savedTheme) {
    localStorage.setItem("theme", currentTheme)
  }

  // Add listener to the provided button
  _themeToggleButton.addEventListener("click", toggleTheme)

  // Add listener for system preference changes (only if no manual override exists)
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    // Check preference *inside* the listener, as user might have manually set one
    if (!localStorage.getItem("theme")) {
      applyTheme(event.matches ? "dark" : "light")
    }
  })
}
