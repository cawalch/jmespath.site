/**
 * Tests for main.js - Application controller
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies before importing the main module
vi.mock("../src/jmespathPlayground.js", () => ({
  initializeJmespathPlaygrounds: vi.fn(),
}))

vi.mock("../src/navigation.js", () => ({
  Navigation: vi.fn().mockImplementation(() => ({
    populateNavigation: vi.fn(),
    setActiveFile: vi.fn(),
  })),
}))

vi.mock("../src/search.js", () => ({
  initializeSearch: vi.fn(),
  loadSearchIndex: vi.fn(),
}))

vi.mock("../src/theme.js", () => ({
  initializeTheme: vi.fn(),
}))

// Mock DOM environment
const createMockDom = () => {
  const mockElement = (id, tagName = "div") => ({
    id,
    tagName,
    innerHTML: "",
    textContent: "",
    value: "",
    disabled: false,
    placeholder: "",
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn(),
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
    getAttribute: vi.fn(),
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    scrollIntoView: vi.fn(),
    style: {},
  })

  return {
    getElementById: vi.fn((id) => {
      const elements = {
        "version-selector": mockElement("version-selector", "select"),
        "content-area": mockElement("content-area"),
        "sidebar-list": mockElement("sidebar-list"),
        "theme-toggle": mockElement("theme-toggle", "button"),
        "search-input": mockElement("search-input", "input"),
        "search-results": mockElement("search-results"),
      }
      return elements[id] || null
    }),
    documentElement: mockElement("html", "html"),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

// Import the App class after mocking dependencies
import App from "../../src/main.js"

describe("Main Application Controller", () => {
  let mockDocument
  let mockWindow
  let mockHistory
  let mockFetch
  let app

  beforeEach(() => {
    mockDocument = createMockDom()
    mockHistory = {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    }
    mockWindow = {
      location: {
        hash: "",
        href: "http://localhost:3000",
      },
      history: mockHistory,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    mockFetch = vi.fn()

    // Set up global mocks
    global.document = mockDocument
    global.window = mockWindow
    global.history = mockHistory
    global.fetch = mockFetch
    global.CSS = {
      escape: vi.fn((str) => str),
    }

    // Create app instance
    app = new App()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("Hash Parsing", () => {
    it("should parse empty hash", () => {
      mockWindow.location.hash = ""
      const result = app.parseHash()
      expect(result).toEqual({ versionId: null, fileName: null, sectionId: null })
    })

    it("should parse version and file", () => {
      mockWindow.location.hash = "#current/index.html"
      const result = app.parseHash()
      expect(result).toEqual({ versionId: "current", fileName: "index.html", sectionId: null })
    })

    it("should parse version, file, and section", () => {
      mockWindow.location.hash = "#current/index.html#section-1"
      const result = app.parseHash()
      expect(result).toEqual({ versionId: "current", fileName: "index.html", sectionId: "section-1" })
    })

    it("should handle nested paths", () => {
      mockWindow.location.hash = "#current/docs/guide.html"
      const result = app.parseHash()
      expect(result).toEqual({ versionId: "current", fileName: "docs/guide.html", sectionId: null })
    })

    it("should handle complex section IDs", () => {
      mockWindow.location.hash = "#current/index.html#complex-section-id-123"
      const result = app.parseHash()
      expect(result).toEqual({ versionId: "current", fileName: "index.html", sectionId: "complex-section-id-123" })
    })
  })

  describe("Version Management", () => {
    beforeEach(() => {
      app.versionsData = {
        versions: [
          { id: "current", label: "Current", pages: [], defaultFile: "index.html" },
          { id: "v1.0", label: "Version 1.0", pages: [], defaultFile: "spec.html" },
        ],
        defaultVersionId: "current",
      }
    })

    it("should check if version exists", () => {
      expect(app.versionExists("current")).toBe(true)
      expect(app.versionExists("v1.0")).toBe(true)
      expect(app.versionExists("nonexistent")).toBe(false)
    })

    it("should find version by ID", () => {
      const version = app.findVersion("current")
      expect(version).toEqual({ id: "current", label: "Current", pages: [], defaultFile: "index.html" })
    })

    it("should return undefined for nonexistent version", () => {
      const version = app.findVersion("nonexistent")
      expect(version).toBeUndefined()
    })
  })

  describe("File Management", () => {
    beforeEach(() => {
      app.versionsData = {
        versions: [
          {
            id: "current",
            label: "Current",
            pages: [
              { file: "index.html", title: "Home" },
              { file: "guide.html", title: "Guide" },
            ],
            defaultFile: "index.html",
          },
        ],
        defaultVersionId: "current",
      }
    })

    it("should check if file exists in version", () => {
      const version = app.findVersion("current")
      expect(app.fileExistsInVersion("index.html", version)).toBe(true)
      expect(app.fileExistsInVersion("guide.html", version)).toBe(true)
      expect(app.fileExistsInVersion("nonexistent.html", version)).toBe(false)
    })

    it("should handle null version", () => {
      expect(app.fileExistsInVersion("index.html", null)).toBeUndefined()
    })

    it("should determine if content needs reload", () => {
      app.currentVersionId = "current"
      app.currentFile = "index.html"

      // Force reload
      expect(app.needsContentReload("current", "index.html", true)).toBe(true)

      // Version changed
      expect(app.needsContentReload("v1.0", "index.html", false)).toBe(true)

      // File changed
      expect(app.needsContentReload("current", "guide.html", false)).toBe(true)

      // No changes
      expect(app.needsContentReload("current", "index.html", false)).toBe(false)
    })
  })

  describe("Content Loading", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("<h1>Test Content</h1>"),
      })
    })

    it("should fetch content successfully", async () => {
      const result = await app.fetchAndInsertContent("current", "index.html")

      expect(mockFetch).toHaveBeenCalledWith("current/index.html")
      expect(result).toBe(true)
      expect(app.contentArea.innerHTML).toBe("<h1>Test Content</h1>")
    })

    it("should handle fetch errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await app.fetchAndInsertContent("current", "nonexistent.html")

      expect(result).toBe(false)
      expect(app.contentArea.innerHTML).toContain("Error loading content")
    })

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"))

      const result = await app.fetchAndInsertContent("current", "index.html")

      expect(result).toBe(false)
      expect(app.contentArea.innerHTML).toContain("Error loading content")
    })
  })

  describe("URL Management", () => {
    it("should update hash with version and file", () => {
      app.updateHash("current", "index.html", null, true)

      expect(mockHistory.pushState).toHaveBeenCalledWith(null, "", "#current/index.html")
    })

    it("should update hash with section", () => {
      app.updateHash("current", "index.html", "section-1", false)

      expect(mockHistory.replaceState).toHaveBeenCalledWith(null, "", "#current/index.html#section-1")
    })

    it("should not update if hash is the same", () => {
      mockWindow.location.hash = "#current/index.html"
      app.updateHash("current", "index.html", null, true)

      expect(mockHistory.pushState).not.toHaveBeenCalled()
      expect(mockHistory.replaceState).not.toHaveBeenCalled()
    })
  })

  describe("Section Scrolling", () => {
    it("should scroll to top when no section ID", () => {
      app.scrollToSection(null)

      expect(app.contentArea.scrollTop).toBe(0)
    })

    it("should find and scroll to section element", async () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
        style: {},
      }
      app.contentArea.querySelector.mockReturnValue(mockElement)

      app.scrollToSection("section-1")

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(app.contentArea.querySelector).toHaveBeenCalledWith("#section-1")
      expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ block: "start" })
    })

    it("should handle missing section element", async () => {
      app.contentArea.querySelector.mockReturnValue(null)

      app.scrollToSection("nonexistent")

      // Wait for setTimeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(app.contentArea.querySelector).toHaveBeenCalledWith("#nonexistent")
      expect(app.contentArea.scrollTop).toBe(0)
    })
  })

  describe("Target Determination", () => {
    beforeEach(() => {
      app.versionsData = {
        versions: [
          {
            id: "current",
            label: "Current",
            pages: [
              { file: "index.html", title: "Home" },
              { file: "guide.html", title: "Guide" },
            ],
            defaultFile: "index.html",
          },
          {
            id: "v1.0",
            label: "Version 1.0",
            pages: [{ file: "spec.html", title: "Spec" }],
            defaultFile: "spec.html",
          },
        ],
        defaultVersionId: "current",
      }
    })

    it("should determine target version ID", () => {
      // Valid version
      expect(app.determineTargetVersionId("current")).toBe("current")
      expect(app.determineTargetVersionId("v1.0")).toBe("v1.0")

      // Invalid version should fall back to default
      expect(app.determineTargetVersionId("nonexistent")).toBe("current")

      // Null/undefined should fall back to default
      expect(app.determineTargetVersionId(null)).toBe("current")
      expect(app.determineTargetVersionId(undefined)).toBe("current")
    })

    it("should determine target file", () => {
      const currentVersion = app.findVersion("current")
      const v1Version = app.findVersion("v1.0")

      // Valid file
      expect(app.determineTargetFile("guide.html", currentVersion)).toBe("guide.html")

      // Invalid file should fall back to default
      expect(app.determineTargetFile("nonexistent.html", currentVersion)).toBe("index.html")

      // Null/undefined should fall back to default
      expect(app.determineTargetFile(null, currentVersion)).toBe("index.html")
      expect(app.determineTargetFile(undefined, v1Version)).toBe("spec.html")
    })

    it("should handle null version in determineTargetFile", () => {
      expect(app.determineTargetFile("index.html", null)).toBe(null)
    })

    it("should determine initial targets", () => {
      mockWindow.location.hash = "#current/guide.html#section-1"
      const targets = app.determineInitialTargets()

      expect(targets.targetVersionId).toBe("current")
      expect(targets.targetFile).toBe("guide.html")
      expect(targets.targetSectionId).toBe("section-1")
    })

    it("should handle invalid hash in determineInitialTargets", () => {
      mockWindow.location.hash = "#nonexistent/nonexistent.html"
      const targets = app.determineInitialTargets()

      expect(targets.targetVersionId).toBe("current")
      expect(targets.targetFile).toBe("index.html")
      expect(targets.targetSectionId).toBe(null)
    })
  })

  describe("Validation Methods", () => {
    it("should validate versions data", () => {
      app.versionsData = {
        versions: [{ id: "current", label: "Current" }],
      }
      expect(app.hasValidVersionsData()).toBe(true)

      app.versionsData = { versions: [] }
      expect(app.hasValidVersionsData()).toBe(false)

      app.versionsData = null
      expect(app.hasValidVersionsData()).toBeUndefined()
    })

    it("should validate targets", () => {
      expect(app.hasValidTargets("current", "index.html")).toBe("index.html")
      expect(app.hasValidTargets(null, "index.html")).toBe(null)
      expect(app.hasValidTargets("current", null)).toBe(null)
      expect(app.hasValidTargets(null, null)).toBe(null)
    })
  })
})
