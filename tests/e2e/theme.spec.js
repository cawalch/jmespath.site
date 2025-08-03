/**
 * End-to-end tests for theme switching functionality
 */

import { expect, test } from "@playwright/test"

test.describe("Theme Switching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")

    // Wait for the page to load
    await page.waitForSelector("#theme-toggle")
  })

  test("should display theme toggle button", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    await expect(themeToggle).toBeVisible()
    await expect(themeToggle).toBeEnabled()

    // Should have appropriate aria attributes
    const ariaLabel = await themeToggle.getAttribute("aria-label")
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel.toLowerCase()).toMatch(/theme|dark|light/)
  })

  test("should show appropriate theme icon", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")

    // Get current theme from HTML element
    const htmlElement = page.locator("html")
    const currentTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Check button content matches theme
    const buttonText = await themeToggle.textContent()

    if (currentTheme === "dark") {
      // Dark theme should show sun icon (switch to light)
      expect(buttonText).toContain("☀")
    } else {
      // Light theme should show moon icon (switch to dark)
      expect(buttonText).toContain("🌙")
    }
  })

  test("should toggle between light and dark themes", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    const htmlElement = page.locator("html")

    // Get initial theme
    const initialTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Click theme toggle
    await themeToggle.click()

    // Wait for theme change
    await page.waitForTimeout(200)

    // Check theme changed
    const newTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    expect(newTheme).not.toBe(initialTheme)

    // Check button icon updated
    const buttonText = await themeToggle.textContent()
    if (newTheme === "dark") {
      expect(buttonText).toContain("☀")
    } else {
      expect(buttonText).toContain("🌙")
    }

    // Toggle back
    await themeToggle.click()
    await page.waitForTimeout(200)

    // Should return to original theme
    const finalTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    expect(finalTheme).toBe(initialTheme)
  })

  test("should apply theme styles correctly", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    const htmlElement = page.locator("html")

    // Test both themes
    for (const targetTheme of ["dark", "light"]) {
      // Get current theme
      const currentTheme = await htmlElement.evaluate((el) => {
        return el.classList.contains("dark") ? "dark" : "light"
      })

      // Switch to target theme if needed
      if (currentTheme !== targetTheme) {
        await themeToggle.click()
        await page.waitForTimeout(200)
      }

      // Check HTML class
      const hasThemeClass = await htmlElement.evaluate((el, theme) => {
        return el.classList.contains(theme)
      }, targetTheme)

      expect(hasThemeClass).toBe(true)

      // Check data-theme attribute
      const dataTheme = await htmlElement.getAttribute("data-theme")
      expect(dataTheme).toBe(targetTheme)

      // Check that styles are applied (basic check)
      const bodyBgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor
      })

      expect(bodyBgColor).toBeTruthy()
      expect(bodyBgColor).not.toBe("rgba(0, 0, 0, 0)") // Not transparent
    }
  })

  test("should persist theme preference", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    const htmlElement = page.locator("html")

    // Get initial theme
    const _initialTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Switch theme
    await themeToggle.click()
    await page.waitForTimeout(200)

    const newTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Reload page
    await page.reload()
    await page.waitForSelector("#theme-toggle")

    // Check theme is persisted
    const persistedTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    expect(persistedTheme).toBe(newTheme)

    // Check button icon is correct
    const buttonText = await themeToggle.textContent()
    if (persistedTheme === "dark") {
      expect(buttonText).toContain("☀")
    } else {
      expect(buttonText).toContain("🌙")
    }
  })

  test("should handle keyboard interaction", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    const htmlElement = page.locator("html")

    // Focus on theme toggle
    await themeToggle.focus()

    // Check focus is visible
    const isFocused = await themeToggle.evaluate((el) => el === document.activeElement)
    expect(isFocused).toBe(true)

    // Get initial theme
    const initialTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Press Enter or Space to toggle
    await page.keyboard.press("Enter")
    await page.waitForTimeout(200)

    // Check theme changed
    const newTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    expect(newTheme).not.toBe(initialTheme)

    // Try Space key as well
    await page.keyboard.press("Space")
    await page.waitForTimeout(200)

    // Should toggle back
    const finalTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    expect(finalTheme).toBe(initialTheme)
  })

  test("should maintain theme during navigation", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    const htmlElement = page.locator("html")

    // Set to a specific theme
    const _currentTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Switch to opposite theme
    await themeToggle.click()
    await page.waitForTimeout(200)

    const newTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Navigate to different page
    const navLinks = page.locator("#sidebar-list a.nav-link")
    const linkCount = await navLinks.count()

    if (linkCount > 1) {
      await navLinks.nth(1).click()
      await page.waitForTimeout(500)

      // Check theme is maintained
      const themeAfterNav = await htmlElement.evaluate((el) => {
        return el.classList.contains("dark") ? "dark" : "light"
      })

      expect(themeAfterNav).toBe(newTheme)

      // Theme toggle should still be functional
      const newThemeToggle = page.locator("#theme-toggle")
      await expect(newThemeToggle).toBeVisible()

      const buttonText = await newThemeToggle.textContent()
      if (themeAfterNav === "dark") {
        expect(buttonText).toContain("☀")
      } else {
        expect(buttonText).toContain("🌙")
      }
    }
  })

  test("should handle rapid theme switching", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")
    const htmlElement = page.locator("html")

    // Get initial theme
    const initialTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Rapidly click theme toggle multiple times
    for (let i = 0; i < 5; i++) {
      await themeToggle.click()
      await page.waitForTimeout(50)
    }

    // Wait for final state
    await page.waitForTimeout(300)

    // Should be in opposite theme (odd number of clicks)
    const finalTheme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    expect(finalTheme).not.toBe(initialTheme)

    // Button should be in correct state
    const buttonText = await themeToggle.textContent()
    if (finalTheme === "dark") {
      expect(buttonText).toContain("☀")
    } else {
      expect(buttonText).toContain("🌙")
    }
  })

  test("should respect system theme preference on first visit", async ({ page }) => {
    // Create a new context to simulate first visit
    const newContext = await page.context().browser().newContext({
      colorScheme: "dark", // Simulate dark system preference
    })

    const newPage = await newContext.newPage()
    await newPage.goto("/")
    await newPage.waitForSelector("#theme-toggle")

    // Should respect system preference
    const htmlElement = newPage.locator("html")
    const theme = await htmlElement.evaluate((el) => {
      return el.classList.contains("dark") ? "dark" : "light"
    })

    // Should be dark theme (matching system preference)
    expect(theme).toBe("dark")

    await newContext.close()
  })

  test("should handle theme switching with content updates", async ({ page }) => {
    const themeToggle = page.locator("#theme-toggle")

    // Switch theme
    await themeToggle.click()
    await page.waitForTimeout(200)

    // Navigate to ensure content loads with new theme
    const navLinks = page.locator("#sidebar-list a.nav-link")
    if ((await navLinks.count()) > 0) {
      await navLinks.first().click()
      await page.waitForTimeout(500)

      // Content should be visible and styled correctly
      const contentArea = page.locator("#content-area")
      await expect(contentArea).toBeVisible()

      // Check that content has appropriate styling
      const contentBgColor = await contentArea.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor
      })

      expect(contentBgColor).toBeTruthy()
    }
  })
})
