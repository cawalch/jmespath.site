/**
 * End-to-end tests for navigation functionality
 */

import { expect, test } from "@playwright/test"

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("should load the homepage successfully", async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/JMESPath/)

    // Check for main navigation elements
    await expect(page.locator("#version-selector")).toBeVisible()
    await expect(page.locator("#sidebar-list")).toBeVisible()
    await expect(page.locator("#content-area")).toBeVisible()
  })

  test("should display version selector with options", async ({ page }) => {
    const versionSelector = page.locator("#version-selector")
    await expect(versionSelector).toBeVisible()

    // Should have at least one version option
    const options = versionSelector.locator("option")
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(0)

    // Check that default version is selected
    const selectedValue = await versionSelector.inputValue()
    expect(selectedValue).toBeTruthy()
  })

  test("should populate sidebar navigation", async ({ page }) => {
    const sidebar = page.locator("#sidebar-list")
    await expect(sidebar).toBeVisible()

    // Should contain navigation links
    const navLinks = sidebar.locator("a.nav-link")
    await expect(navLinks.first()).toBeVisible()

    // Links should have proper href format
    const firstLink = navLinks.first()
    const href = await firstLink.getAttribute("href")
    expect(href).toMatch(/^#\w+\/[\w.-]+$/)
  })

  test("should navigate between pages via sidebar", async ({ page }) => {
    // Wait for initial content to load
    await page.waitForSelector("#content-area h1, #content-area h2, #content-area p")

    const sidebar = page.locator("#sidebar-list")
    const navLinks = sidebar.locator("a.nav-link")

    // Get the second navigation link
    const secondLink = navLinks.nth(1)

    if (await secondLink.isVisible()) {
      // Click the second link
      await secondLink.click()

      // Wait for content to change
      await page.waitForTimeout(500)

      // Check that URL hash changed
      const url = page.url()
      expect(url).toContain("#")

      // Check that content area updated
      await expect(page.locator("#content-area")).toContainText(/\w+/)
    }
  })

  test("should handle version switching", async ({ page }) => {
    const versionSelector = page.locator("#version-selector")
    const options = versionSelector.locator("option")

    const optionCount = await options.count()
    if (optionCount > 1) {
      // Get current selection
      const initialValue = await versionSelector.inputValue()

      // Select different version
      const secondOption = options.nth(1)
      const secondValue = await secondOption.getAttribute("value")

      await versionSelector.selectOption(secondValue)

      // Wait for content to reload
      await page.waitForTimeout(1000)

      // Verify version changed
      const newValue = await versionSelector.inputValue()
      expect(newValue).toBe(secondValue)
      expect(newValue).not.toBe(initialValue)

      // Verify sidebar updated
      const sidebar = page.locator("#sidebar-list")
      await expect(sidebar.locator("a.nav-link").first()).toBeVisible()
    }
  })

  test("should handle direct URL navigation", async ({ page }) => {
    // Navigate to a specific page via URL hash
    await page.goto("/#current/_index.html")

    // Wait for content to load
    await page.waitForSelector("#content-area")

    // Check that content loaded
    await expect(page.locator("#content-area")).toContainText(/\w+/)

    // Check that sidebar shows active state
    const activeNavItem = page.locator("#sidebar-list .nav-item.active")
    await expect(activeNavItem).toBeVisible()
  })

  test("should handle invalid URL gracefully", async ({ page }) => {
    // Navigate to invalid URL
    await page.goto("/#invalid/nonexistent.html")

    // Should redirect to valid content or show error
    await page.waitForTimeout(1000)

    // Content area should not be empty
    const contentArea = page.locator("#content-area")
    await expect(contentArea).toBeVisible()

    // Should either show error message or redirect to valid content
    const content = await contentArea.textContent()
    expect(content.trim()).not.toBe("")
  })

  test("should maintain navigation state on page refresh", async ({ page }) => {
    // Navigate to a specific page
    const sidebar = page.locator("#sidebar-list")
    const navLinks = sidebar.locator("a.nav-link")

    if ((await navLinks.count()) > 1) {
      const secondLink = navLinks.nth(1)
      await secondLink.click()

      // Wait for navigation
      await page.waitForTimeout(500)

      // Get current URL
      const urlBeforeRefresh = page.url()

      // Refresh page
      await page.reload()

      // Wait for page to load
      await page.waitForSelector("#content-area")

      // Check that URL is maintained
      const urlAfterRefresh = page.url()
      expect(urlAfterRefresh).toBe(urlBeforeRefresh)

      // Check that active state is restored
      await expect(page.locator("#sidebar-list .nav-item.active")).toBeVisible()
    }
  })

  test("should handle browser back/forward navigation", async ({ page }) => {
    // Navigate to first page
    const sidebar = page.locator("#sidebar-list")
    const navLinks = sidebar.locator("a.nav-link")

    if ((await navLinks.count()) > 1) {
      const firstLink = navLinks.first()
      const secondLink = navLinks.nth(1)

      // Click first link
      await firstLink.click()
      await page.waitForTimeout(300)
      const firstUrl = page.url()

      // Click second link
      await secondLink.click()
      await page.waitForTimeout(300)
      const secondUrl = page.url()

      // Use browser back
      await page.goBack()
      await page.waitForTimeout(300)

      // Should be back to first URL
      expect(page.url()).toBe(firstUrl)

      // Use browser forward
      await page.goForward()
      await page.waitForTimeout(300)

      // Should be back to second URL
      expect(page.url()).toBe(secondUrl)
    }
  })

  test("should show loading states appropriately", async ({ page }) => {
    // Check for loading indicator when navigating
    const sidebar = page.locator("#sidebar-list")
    const navLinks = sidebar.locator("a.nav-link")

    if ((await navLinks.count()) > 1) {
      const secondLink = navLinks.nth(1)

      // Click link and immediately check for loading state
      await secondLink.click()

      // Content area might show loading text briefly
      const contentArea = page.locator("#content-area")

      // Wait for final content to load
      await page.waitForTimeout(1000)

      // Should not show loading state anymore
      const content = await contentArea.textContent()
      expect(content).not.toContain("Loading...")
    }
  })

  test("should handle keyboard navigation", async ({ page }) => {
    // Focus on version selector
    await page.locator("#version-selector").focus()

    // Use keyboard to navigate
    await page.keyboard.press("Tab")

    // Should move focus to next interactive element
    const focusedElement = page.locator(":focus")
    await expect(focusedElement).toBeVisible()

    // Test Enter key on navigation links
    const firstNavLink = page.locator("#sidebar-list a.nav-link").first()
    if (await firstNavLink.isVisible()) {
      await firstNavLink.focus()
      await page.keyboard.press("Enter")

      // Should navigate to the page
      await page.waitForTimeout(500)
      await expect(page.locator("#content-area")).toContainText(/\w+/)
    }
  })
})
