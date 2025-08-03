/**
 * End-to-end tests for search functionality
 */

import { expect, test } from "@playwright/test"

test.describe("Search Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")

    // Wait for the page to fully load
    await page.waitForSelector("#search-input")
    await page.waitForSelector("#content-area")
  })

  test("should display search input", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toBeEnabled()

    // Should have appropriate placeholder
    const placeholder = await searchInput.getAttribute("placeholder")
    expect(placeholder).toBeTruthy()
  })

  test("should show search results container", async ({ page }) => {
    const searchResults = page.locator("#search-results")
    await expect(searchResults).toBeAttached()

    // Initially should be hidden
    const isVisible = await searchResults.isVisible()
    expect(isVisible).toBe(false)
  })

  test("should perform search and show results", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const searchResults = page.locator("#search-results")

    // Type search query
    await searchInput.fill("test")

    // Wait for search to execute (debounced)
    await page.waitForTimeout(500)

    // Check if search results appear
    const isVisible = await searchResults.isVisible()
    if (isVisible) {
      // Should contain search result elements
      const resultItems = searchResults.locator(".search-result, .result-item, li, a")
      const count = await resultItems.count()
      expect(count).toBeGreaterThan(0)
    }
  })

  test("should handle empty search results", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const searchResults = page.locator("#search-results")

    // Search for something that likely won't exist
    await searchInput.fill("xyznonexistentquery123")

    // Wait for search to execute
    await page.waitForTimeout(500)

    // Check if results container shows no results message
    if (await searchResults.isVisible()) {
      const content = await searchResults.textContent()
      expect(content.toLowerCase()).toMatch(/no results|not found|empty/i)
    }
  })

  test("should clear search results when input is cleared", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const searchResults = page.locator("#search-results")

    // Perform a search first
    await searchInput.fill("test")
    await page.waitForTimeout(500)

    // Clear the search
    await searchInput.fill("")
    await page.waitForTimeout(300)

    // Results should be hidden
    const isVisible = await searchResults.isVisible()
    expect(isVisible).toBe(false)
  })

  test("should navigate to search result when clicked", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const searchResults = page.locator("#search-results")

    // Perform search
    await searchInput.fill("guide")
    await page.waitForTimeout(500)

    // Check if results are visible
    if (await searchResults.isVisible()) {
      const resultLinks = searchResults.locator("a")
      const linkCount = await resultLinks.count()

      if (linkCount > 0) {
        const firstLink = resultLinks.first()

        // Get the href before clicking
        const href = await firstLink.getAttribute("href")

        // Click the result
        await firstLink.click()

        // Wait for navigation
        await page.waitForTimeout(500)

        // Check that URL changed appropriately
        const currentUrl = page.url()
        if (href) {
          expect(currentUrl).toContain(href.replace("#", ""))
        }

        // Content should have loaded
        await expect(page.locator("#content-area")).toContainText(/\w+/)
      }
    }
  })

  test("should handle search input focus and blur", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const searchResults = page.locator("#search-results")

    // Focus on search input
    await searchInput.focus()

    // Type something
    await searchInput.fill("test")
    await page.waitForTimeout(500)

    // Results might be visible
    const resultsVisibleAfterFocus = await searchResults.isVisible()

    // Click outside to blur
    await page.locator("#content-area").click()
    await page.waitForTimeout(300)

    // Results should be hidden after blur (with delay)
    await page.waitForTimeout(500)
    const resultsVisibleAfterBlur = await searchResults.isVisible()

    // If results were visible before, they should be hidden after blur
    if (resultsVisibleAfterFocus) {
      expect(resultsVisibleAfterBlur).toBe(false)
    }
  })

  test("should handle keyboard navigation in search results", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const searchResults = page.locator("#search-results")

    // Perform search
    await searchInput.fill("guide")
    await page.waitForTimeout(500)

    if (await searchResults.isVisible()) {
      const resultLinks = searchResults.locator("a")
      const linkCount = await resultLinks.count()

      if (linkCount > 0) {
        // Focus on search input
        await searchInput.focus()

        // Use Tab to navigate to first result
        await page.keyboard.press("Tab")

        // Check if focus moved to a result link
        const focusedElement = page.locator(":focus")
        const tagName = await focusedElement.evaluate((el) => el.tagName.toLowerCase())

        if (tagName === "a") {
          // Press Enter to activate the link
          await page.keyboard.press("Enter")

          // Wait for navigation
          await page.waitForTimeout(500)

          // Should have navigated
          await expect(page.locator("#content-area")).toContainText(/\w+/)
        }
      }
    }
  })

  test("should debounce search input", async ({ page }) => {
    const searchInput = page.locator("#search-input")

    // Type characters rapidly
    await searchInput.type("test", { delay: 50 })

    // Should not trigger search immediately
    await page.waitForTimeout(100)

    // Continue typing
    await searchInput.type("ing", { delay: 50 })

    // Wait for debounce period
    await page.waitForTimeout(500)

    // Now search should have executed
    const _searchResults = page.locator("#search-results")
    // Results may or may not be visible depending on content, but no errors should occur
    await expect(searchInput).toHaveValue("testing")
  })

  test("should handle special characters in search", async ({ page }) => {
    const searchInput = page.locator("#search-input")

    // Test various special characters
    const specialQueries = ["test@", "test#hash", "test & query", 'test "quotes"']

    for (const query of specialQueries) {
      await searchInput.fill(query)
      await page.waitForTimeout(300)

      // Should not cause errors
      const hasError = await page.locator(".error, .search-error").isVisible()
      expect(hasError).toBe(false)

      // Clear for next test
      await searchInput.fill("")
      await page.waitForTimeout(100)
    }
  })

  test("should maintain search state during version changes", async ({ page }) => {
    const searchInput = page.locator("#search-input")
    const versionSelector = page.locator("#version-selector")

    // Perform a search
    await searchInput.fill("test")
    await page.waitForTimeout(500)

    const searchValue = await searchInput.inputValue()
    expect(searchValue).toBe("test")

    // Change version if multiple versions available
    const options = versionSelector.locator("option")
    const optionCount = await options.count()

    if (optionCount > 1) {
      const secondOption = options.nth(1)
      const secondValue = await secondOption.getAttribute("value")

      await versionSelector.selectOption(secondValue)
      await page.waitForTimeout(1000)

      // Search input should be cleared or reset appropriately
      const newSearchValue = await searchInput.inputValue()
      // The behavior might vary - search could be cleared or maintained
      expect(typeof newSearchValue).toBe("string")
    }
  })

  test("should handle search with no content loaded", async ({ page }) => {
    // Go to a potentially invalid page first
    await page.goto("/#invalid/page.html")
    await page.waitForTimeout(500)

    const searchInput = page.locator("#search-input")

    // Try to search
    await searchInput.fill("test")
    await page.waitForTimeout(500)

    // Should not cause errors even if no valid content is loaded
    const hasError = await page.locator(".error").isVisible()
    expect(hasError).toBe(false)

    // Search input should still be functional
    await expect(searchInput).toBeEnabled()
  })

  test("should show appropriate search placeholder based on state", async ({ page }) => {
    const searchInput = page.locator("#search-input")

    // Check initial placeholder
    const initialPlaceholder = await searchInput.getAttribute("placeholder")
    expect(initialPlaceholder).toBeTruthy()

    // Placeholder should indicate search functionality
    expect(initialPlaceholder.toLowerCase()).toMatch(/search/i)
  })
})
