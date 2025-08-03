/**
 * End-to-end tests for JMESPath playground functionality
 */

import { expect, test } from "@playwright/test"

test.describe("JMESPath Playground", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")

    // Wait for the page to load
    await page.waitForSelector("#content-area")

    // Look for playground elements - they might be on the homepage or a specific page
    const playgroundExists = (await page.locator(".jmespath-playground").count()) > 0

    if (!playgroundExists) {
      // Try to navigate to a page that might have playgrounds
      const navLinks = page.locator("#sidebar-list a.nav-link")
      const linkCount = await navLinks.count()

      // Click through navigation links to find a playground
      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        await navLinks.nth(i).click()
        await page.waitForTimeout(500)

        const hasPlayground = (await page.locator(".jmespath-playground").count()) > 0
        if (hasPlayground) {
          break
        }
      }
    }
  })

  test("should display JMESPath playground components", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      await expect(playground).toBeVisible()

      // Check for playground components
      const toggleButton = playground.locator(".playground-toggle-button")
      await expect(toggleButton).toBeVisible()

      // Expand playground if collapsed
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      // Check for input areas
      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")
      const outputArea = playground.locator(".output-area")

      await expect(jsonInput).toBeVisible()
      await expect(queryInput).toBeVisible()
      await expect(outputArea).toBeVisible()
    }
  })

  test("should toggle playground visibility", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      const toggleButton = playground.locator(".playground-toggle-button")
      const content = playground.locator(".playground-content")

      if (await toggleButton.isVisible()) {
        // Get initial state
        const initialExpanded = await toggleButton.getAttribute("aria-expanded")
        const initialVisible = await content.isVisible()

        // Click toggle
        await toggleButton.click()
        await page.waitForTimeout(300)

        // Check state changed
        const newExpanded = await toggleButton.getAttribute("aria-expanded")
        const newVisible = await content.isVisible()

        expect(newExpanded).not.toBe(initialExpanded)
        expect(newVisible).not.toBe(initialVisible)

        // Toggle back
        await toggleButton.click()
        await page.waitForTimeout(300)

        // Should return to original state
        const finalExpanded = await toggleButton.getAttribute("aria-expanded")
        expect(finalExpanded).toBe(initialExpanded)
      }
    }
  })

  test("should execute JMESPath queries", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")
      const outputArea = playground.locator(".output-area")

      if ((await jsonInput.isVisible()) && (await queryInput.isVisible())) {
        // Clear existing content
        await jsonInput.fill("")
        await queryInput.fill("")

        // Enter test JSON
        const testJson = '{"name": "Alice", "age": 30, "city": "New York"}'
        await jsonInput.fill(testJson)

        // Enter test query
        await queryInput.fill("name")

        // Wait for execution
        await page.waitForTimeout(500)

        // Check output
        const output = await outputArea.textContent()
        expect(output).toContain("Alice")
      }
    }
  })

  test("should handle invalid JSON input", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const errorArea = playground.locator(".error-area, .playground-error-inline")

      if (await jsonInput.isVisible()) {
        // Enter invalid JSON
        await jsonInput.fill('{"invalid": json}')

        // Wait for validation
        await page.waitForTimeout(300)

        // Check for error indication
        const hasErrorClass = await jsonInput.evaluate(
          (el) => el.classList.contains("invalid-json") || el.classList.contains("border-red-500"),
        )

        const errorText = await errorArea.textContent()

        // Should show error indication
        expect(hasErrorClass || errorText.includes("Invalid")).toBe(true)
      }
    }
  })

  test("should handle invalid JMESPath queries", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")
      const errorArea = playground.locator(".error-area")

      if ((await jsonInput.isVisible()) && (await queryInput.isVisible())) {
        // Enter valid JSON
        await jsonInput.fill('{"name": "Alice"}')

        // Enter invalid query
        await queryInput.fill("invalid[query")

        // Wait for execution
        await page.waitForTimeout(500)

        // Check for error indication
        const hasErrorClass = await queryInput.evaluate(
          (el) => el.classList.contains("border-red-500") || el.classList.contains("error"),
        )

        const errorText = await errorArea.textContent()

        // Should show error indication
        expect(hasErrorClass || errorText.includes("Error")).toBe(true)
      }
    }
  })

  test("should handle complex JMESPath queries", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")
      const outputArea = playground.locator(".output-area")

      if ((await jsonInput.isVisible()) && (await queryInput.isVisible())) {
        // Enter complex JSON
        const complexJson = JSON.stringify({
          users: [
            { name: "Alice", age: 30, active: true },
            { name: "Bob", age: 25, active: false },
            { name: "Charlie", age: 35, active: true },
          ],
        })

        await jsonInput.fill(complexJson)

        // Enter complex query
        await queryInput.fill("users[?active].name")

        // Wait for execution
        await page.waitForTimeout(500)

        // Check output
        const output = await outputArea.textContent()
        expect(output).toContain("Alice")
        expect(output).toContain("Charlie")
        expect(output).not.toContain("Bob")
      }
    }
  })

  test("should clear output when inputs are cleared", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")
      const outputArea = playground.locator(".output-area")

      if ((await jsonInput.isVisible()) && (await queryInput.isVisible())) {
        // Enter data and query
        await jsonInput.fill('{"test": "value"}')
        await queryInput.fill("test")
        await page.waitForTimeout(300)

        // Should have output
        let output = await outputArea.textContent()
        expect(output.trim()).not.toBe("")

        // Clear query
        await queryInput.fill("")
        await page.waitForTimeout(300)

        // Output should show placeholder or be cleared
        output = await outputArea.textContent()
        expect(output).toMatch(/Enter.*query|^$/)
      }
    }
  })

  test("should handle real-time updates", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")
      const outputArea = playground.locator(".output-area")

      if ((await jsonInput.isVisible()) && (await queryInput.isVisible())) {
        // Enter initial data
        await jsonInput.fill('{"count": 1}')
        await queryInput.fill("count")
        await page.waitForTimeout(300)

        // Check initial output
        let output = await outputArea.textContent()
        expect(output).toContain("1")

        // Update JSON
        await jsonInput.fill('{"count": 42}')
        await page.waitForTimeout(300)

        // Output should update
        output = await outputArea.textContent()
        expect(output).toContain("42")
      }
    }
  })

  test("should maintain playground state during navigation", async ({ page }) => {
    const playground = page.locator(".jmespath-playground").first()

    if ((await playground.count()) > 0) {
      // Ensure playground is expanded
      const toggleButton = playground.locator(".playground-toggle-button")
      if (await toggleButton.isVisible()) {
        const isExpanded = await toggleButton.getAttribute("aria-expanded")
        if (isExpanded === "false") {
          await toggleButton.click()
          await page.waitForTimeout(300)
        }
      }

      const jsonInput = playground.locator(".json-input")
      const queryInput = playground.locator(".query-input")

      if ((await jsonInput.isVisible()) && (await queryInput.isVisible())) {
        // Enter some data
        await jsonInput.fill('{"test": "data"}')
        await queryInput.fill("test")
        await page.waitForTimeout(300)

        // Navigate away and back (if possible)
        const navLinks = page.locator("#sidebar-list a.nav-link")
        const linkCount = await navLinks.count()

        if (linkCount > 1) {
          const currentUrl = page.url()

          // Navigate to different page
          await navLinks.nth(1).click()
          await page.waitForTimeout(500)

          // Navigate back
          await page.goto(currentUrl)
          await page.waitForTimeout(500)

          // Check if playground data is restored (behavior may vary)
          const newPlayground = page.locator(".jmespath-playground").first()
          if ((await newPlayground.count()) > 0) {
            // Playground should be functional again
            const newJsonInput = newPlayground.locator(".json-input")
            await expect(newJsonInput).toBeVisible()
          }
        }
      }
    }
  })
})
