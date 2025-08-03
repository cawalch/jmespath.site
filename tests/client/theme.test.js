/**
 * Tests for theme.js - Theme switching functionality
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Theme Functionality", () => {
  let mockHtmlElement
  let mockThemeToggleButton
  let mockLocalStorage

  beforeEach(() => {
    mockHtmlElement = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        contains: vi.fn(),
        toggle: vi.fn(),
      },
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
    }

    mockThemeToggleButton = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      textContent: "",
      innerHTML: "",
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
    }

    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }

    global.localStorage = mockLocalStorage
    global.matchMedia = vi.fn()

    vi.clearAllMocks()
  })

  afterEach(() => {
    delete global.localStorage
    delete global.matchMedia
  })

  describe("Theme Detection", () => {
    const detectSystemTheme = () => {
      if (typeof window !== "undefined" && window.matchMedia) {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      }
      return "light"
    }

    it("should detect dark system theme", () => {
      global.matchMedia = vi.fn().mockReturnValue({
        matches: true,
      })

      const theme = detectSystemTheme()
      expect(theme).toBe("dark")
      expect(global.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)")
    })

    it("should detect light system theme", () => {
      global.matchMedia = vi.fn().mockReturnValue({
        matches: false,
      })

      const theme = detectSystemTheme()
      expect(theme).toBe("light")
    })

    it("should default to light when matchMedia is not available", () => {
      global.matchMedia = undefined

      const theme = detectSystemTheme()
      expect(theme).toBe("light")
    })
  })

  describe("Theme Storage", () => {
    const ThemeStorageKey = "jmespath-theme"

    const getStoredTheme = () => {
      try {
        return localStorage.getItem(ThemeStorageKey)
      } catch {
        return null
      }
    }

    const setStoredTheme = (theme) => {
      try {
        localStorage.setItem(ThemeStorageKey, theme)
      } catch {
        // Ignore storage errors
      }
    }

    it("should get stored theme", () => {
      mockLocalStorage.getItem.mockReturnValue("dark")

      const theme = getStoredTheme()
      expect(theme).toBe("dark")
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(ThemeStorageKey)
    })

    it("should return null when no theme is stored", () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const theme = getStoredTheme()
      expect(theme).toBeNull()
    })

    it("should handle storage errors gracefully", () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error")
      })

      const theme = getStoredTheme()
      expect(theme).toBeNull()
    })

    it("should store theme", () => {
      setStoredTheme("dark")
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(ThemeStorageKey, "dark")
    })

    it("should handle storage set errors gracefully", () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("Storage error")
      })

      expect(() => setStoredTheme("dark")).not.toThrow()
    })
  })

  describe("Theme Application", () => {
    const applyTheme = (htmlElement, theme) => {
      htmlElement.classList.remove("light", "dark")
      htmlElement.classList.add(theme)
      htmlElement.setAttribute("data-theme", theme)
    }

    it("should apply dark theme", () => {
      applyTheme(mockHtmlElement, "dark")

      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("light", "dark")
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark")
      expect(mockHtmlElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark")
    })

    it("should apply light theme", () => {
      applyTheme(mockHtmlElement, "light")

      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("light", "dark")
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("light")
      expect(mockHtmlElement.setAttribute).toHaveBeenCalledWith("data-theme", "light")
    })
  })

  describe("Theme Toggle", () => {
    const getCurrentTheme = (htmlElement) => {
      return htmlElement.classList.contains("dark") ? "dark" : "light"
    }

    const toggleTheme = (htmlElement) => {
      const currentTheme = getCurrentTheme(htmlElement)
      const newTheme = currentTheme === "dark" ? "light" : "dark"

      htmlElement.classList.remove("light", "dark")
      htmlElement.classList.add(newTheme)
      htmlElement.setAttribute("data-theme", newTheme)

      return newTheme
    }

    it("should get current theme from classList", () => {
      mockHtmlElement.classList.contains.mockReturnValue(true)

      const theme = getCurrentTheme(mockHtmlElement)
      expect(theme).toBe("dark")
      expect(mockHtmlElement.classList.contains).toHaveBeenCalledWith("dark")
    })

    it("should default to light theme", () => {
      mockHtmlElement.classList.contains.mockReturnValue(false)

      const theme = getCurrentTheme(mockHtmlElement)
      expect(theme).toBe("light")
    })

    it("should toggle from light to dark", () => {
      mockHtmlElement.classList.contains.mockReturnValue(false) // light theme

      const newTheme = toggleTheme(mockHtmlElement)

      expect(newTheme).toBe("dark")
      expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("light", "dark")
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark")
      expect(mockHtmlElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark")
    })

    it("should toggle from dark to light", () => {
      mockHtmlElement.classList.contains.mockReturnValue(true) // dark theme

      const newTheme = toggleTheme(mockHtmlElement)

      expect(newTheme).toBe("light")
      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("light")
    })
  })

  describe("Theme Button Updates", () => {
    const updateThemeButton = (button, theme) => {
      const isDark = theme === "dark"
      button.textContent = isDark ? "☀️" : "🌙"
      button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`)
      button.setAttribute("title", `Switch to ${isDark ? "light" : "dark"} theme`)
    }

    it("should update button for dark theme", () => {
      updateThemeButton(mockThemeToggleButton, "dark")

      expect(mockThemeToggleButton.textContent).toBe("☀️")
      expect(mockThemeToggleButton.setAttribute).toHaveBeenCalledWith("aria-label", "Switch to light theme")
      expect(mockThemeToggleButton.setAttribute).toHaveBeenCalledWith("title", "Switch to light theme")
    })

    it("should update button for light theme", () => {
      updateThemeButton(mockThemeToggleButton, "light")

      expect(mockThemeToggleButton.textContent).toBe("🌙")
      expect(mockThemeToggleButton.setAttribute).toHaveBeenCalledWith("aria-label", "Switch to dark theme")
      expect(mockThemeToggleButton.setAttribute).toHaveBeenCalledWith("title", "Switch to dark theme")
    })
  })

  describe("Theme Initialization", () => {
    const initializeTheme = (htmlElement, toggleButton) => {
      // Get stored theme or detect system preference
      const storedTheme = localStorage.getItem("jmespath-theme")
      let initialTheme = storedTheme

      if (!initialTheme) {
        const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        initialTheme = systemTheme
      }

      // Apply theme
      htmlElement.classList.remove("light", "dark")
      htmlElement.classList.add(initialTheme)
      htmlElement.setAttribute("data-theme", initialTheme)

      // Update button
      const isDark = initialTheme === "dark"
      toggleButton.textContent = isDark ? "☀️" : "🌙"
      toggleButton.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`)

      // Add click handler
      const handleToggle = () => {
        const currentTheme = htmlElement.classList.contains("dark") ? "dark" : "light"
        const newTheme = currentTheme === "dark" ? "light" : "dark"

        htmlElement.classList.remove("light", "dark")
        htmlElement.classList.add(newTheme)
        htmlElement.setAttribute("data-theme", newTheme)

        const isNewDark = newTheme === "dark"
        toggleButton.textContent = isNewDark ? "☀️" : "🌙"
        toggleButton.setAttribute("aria-label", `Switch to ${isNewDark ? "light" : "dark"} theme`)

        localStorage.setItem("jmespath-theme", newTheme)
      }

      toggleButton.addEventListener("click", handleToggle)
    }

    it("should initialize with stored theme", () => {
      mockLocalStorage.getItem.mockReturnValue("dark")

      initializeTheme(mockHtmlElement, mockThemeToggleButton)

      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark")
      expect(mockThemeToggleButton.textContent).toBe("☀️")
      expect(mockThemeToggleButton.addEventListener).toHaveBeenCalledWith("click", expect.any(Function))
    })

    it("should initialize with system theme when no stored theme", () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      global.matchMedia = vi.fn().mockReturnValue({ matches: true })

      initializeTheme(mockHtmlElement, mockThemeToggleButton)

      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark")
      expect(mockThemeToggleButton.textContent).toBe("☀️")
    })

    it("should default to light theme when no system preference", () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      global.matchMedia = vi.fn().mockReturnValue({ matches: false })

      initializeTheme(mockHtmlElement, mockThemeToggleButton)

      expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("light")
      expect(mockThemeToggleButton.textContent).toBe("🌙")
    })
  })

  describe("System Theme Change Detection", () => {
    const watchSystemTheme = (callback) => {
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handler = (e) => callback(e.matches ? "dark" : "light")

        mediaQuery.addEventListener("change", handler)

        return () => mediaQuery.removeEventListener("change", handler)
      }
      return () => {
        /* No cleanup needed for unsupported matchMedia */
      }
    }

    it("should watch for system theme changes", () => {
      const mockMediaQuery = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }

      global.matchMedia = vi.fn().mockReturnValue(mockMediaQuery)
      const mockCallback = vi.fn()

      const cleanup = watchSystemTheme(mockCallback)

      expect(global.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)")
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith("change", expect.any(Function))

      // Test cleanup
      cleanup()
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
    })

    it("should handle missing matchMedia gracefully", () => {
      global.matchMedia = undefined
      const mockCallback = vi.fn()

      const cleanup = watchSystemTheme(mockCallback)

      expect(typeof cleanup).toBe("function")
      expect(() => cleanup()).not.toThrow()
    })
  })
})
