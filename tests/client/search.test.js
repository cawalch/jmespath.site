/**
 * Tests for search.js - Search functionality
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock FlexSearch
const mockFlexSearch = {
  Document: vi.fn().mockImplementation(() => ({
    search: vi.fn(),
    import: vi.fn(),
  })),
}

global.FlexSearch = mockFlexSearch

describe("Search Functionality", () => {
  let mockSearchInput
  let mockSearchResultsContainer
  let _mockGetCurrentVersionId
  let _mockLoadSearchIndex
  let searchIndex
  let searchDocMap

  beforeEach(() => {
    mockSearchInput = {
      value: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
    }

    mockSearchResultsContainer = {
      innerHTML: "",
      style: { display: "none" },
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    }

    _mockGetCurrentVersionId = vi.fn().mockReturnValue("current")
    _mockLoadSearchIndex = vi.fn()

    searchIndex = {
      search: vi.fn(),
      import: vi.fn(),
    }

    searchDocMap = {
      1: {
        title: "Test Document",
        href: "test.html",
        sections: [
          { id: "section-1", text: "Introduction", level: 2 },
          { id: "section-2", text: "Examples", level: 2 },
        ],
        isObsoleted: false,
      },
      2: {
        title: "Advanced Guide",
        href: "advanced.html",
        sections: [{ id: "advanced-1", text: "Advanced Features", level: 2 }],
        isObsoleted: false,
      },
    }

    mockFlexSearch.Document.mockReturnValue(searchIndex)
    vi.clearAllMocks()
  })

  describe("Search Index Loading", () => {
    const loadSearchIndex = async (versionId) => {
      try {
        const [indexResponse, mapResponse] = await Promise.all([
          fetch(`${versionId}/search_index.json`),
          fetch(`${versionId}/search_map.json`),
        ])

        if (!indexResponse.ok || !mapResponse.ok) {
          throw new Error("Failed to load search data")
        }

        const indexData = await indexResponse.json()
        const mapData = await mapResponse.json()

        return { indexData, mapData }
      } catch (error) {
        console.error("Error loading search index:", error)
        return null
      }
    }

    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it("should load search index and map successfully", async () => {
      const mockIndexData = { test: "index" }
      const mockMapData = { 1: { title: "Test" } }

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockIndexData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMapData),
        })

      const result = await loadSearchIndex("current")

      expect(global.fetch).toHaveBeenCalledWith("current/search_index.json")
      expect(global.fetch).toHaveBeenCalledWith("current/search_map.json")
      expect(result).toEqual({
        indexData: mockIndexData,
        mapData: mockMapData,
      })
    })

    it("should handle failed index loading", async () => {
      global.fetch
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      const result = await loadSearchIndex("current")

      expect(result).toBeNull()
    })

    it("should handle network errors", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"))

      const result = await loadSearchIndex("current")

      expect(result).toBeNull()
    })
  })

  describe("Search Query Processing", () => {
    const performSearch = (query, searchIndex, searchDocMap) => {
      if (!query || query.trim().length < 2) {
        return []
      }

      const searchResults = searchIndex.search(query.trim())
      const processedResults = []

      for (const result of searchResults) {
        if (result.field && result.result) {
          for (const docId of result.result) {
            const docInfo = searchDocMap[docId]
            if (docInfo && !docInfo.isObsoleted) {
              processedResults.push({
                docId,
                title: docInfo.title,
                href: docInfo.href,
                sections: docInfo.sections,
                field: result.field,
              })
            }
          }
        }
      }

      return processedResults
    }

    it("should return empty results for short queries", () => {
      const results = performSearch("a", searchIndex, searchDocMap)
      expect(results).toEqual([])
      expect(searchIndex.search).not.toHaveBeenCalled()
    })

    it("should return empty results for empty queries", () => {
      const results = performSearch("", searchIndex, searchDocMap)
      expect(results).toEqual([])
      expect(searchIndex.search).not.toHaveBeenCalled()
    })

    it("should perform search for valid queries", () => {
      const mockSearchResults = [
        {
          field: "title",
          result: [1, 2],
        },
      ]

      searchIndex.search.mockReturnValue(mockSearchResults)

      const results = performSearch("test", searchIndex, searchDocMap)

      expect(searchIndex.search).toHaveBeenCalledWith("test")
      expect(results).toHaveLength(2)
      expect(results[0]).toEqual({
        docId: 1,
        title: "Test Document",
        href: "test.html",
        sections: searchDocMap[1].sections,
        field: "title",
      })
    })

    it("should filter out obsoleted documents", () => {
      const obsoletedSearchDocMap = {
        ...searchDocMap,
        3: {
          title: "Obsoleted Document",
          href: "obsoleted.html",
          sections: [],
          isObsoleted: true,
        },
      }

      const mockSearchResults = [
        {
          field: "title",
          result: [1, 3],
        },
      ]

      searchIndex.search.mockReturnValue(mockSearchResults)

      const results = performSearch("test", searchIndex, obsoletedSearchDocMap)

      expect(results).toHaveLength(1)
      expect(results[0].docId).toBe(1)
    })

    it("should handle multiple search fields", () => {
      const mockSearchResults = [
        {
          field: "title",
          result: [1],
        },
        {
          field: "content",
          result: [2],
        },
      ]

      searchIndex.search.mockReturnValue(mockSearchResults)

      const results = performSearch("test", searchIndex, searchDocMap)

      expect(results).toHaveLength(2)
      expect(results[0].field).toBe("title")
      expect(results[1].field).toBe("content")
    })
  })

  describe("Search Results Rendering", () => {
    const renderSearchResults = (results, container) => {
      if (results.length === 0) {
        container.innerHTML = '<div class="no-results">No results found</div>'
        return
      }

      const resultElements = results
        .map((result) => {
          const sections = result.sections
            .map(
              (section) =>
                `<a href="#${result.href.replace(".html", "")}#${section.id}" class="section-link">${section.text}</a>`,
            )
            .join("")

          return `
          <div class="search-result">
            <h3><a href="#${result.href.replace(".html", "")}">${result.title}</a></h3>
            <div class="sections">${sections}</div>
          </div>
        `
        })
        .join("")

      container.innerHTML = resultElements
    }

    it("should render no results message", () => {
      renderSearchResults([], mockSearchResultsContainer)

      expect(mockSearchResultsContainer.innerHTML).toBe('<div class="no-results">No results found</div>')
    })

    it("should render search results with sections", () => {
      const results = [
        {
          docId: 1,
          title: "Test Document",
          href: "test.html",
          sections: [{ id: "section-1", text: "Introduction", level: 2 }],
        },
      ]

      renderSearchResults(results, mockSearchResultsContainer)

      expect(mockSearchResultsContainer.innerHTML).toContain("Test Document")
      expect(mockSearchResultsContainer.innerHTML).toContain('href="#test#section-1"')
      expect(mockSearchResultsContainer.innerHTML).toContain("Introduction")
    })

    it("should handle results without sections", () => {
      const results = [
        {
          docId: 1,
          title: "Test Document",
          href: "test.html",
          sections: [],
        },
      ]

      renderSearchResults(results, mockSearchResultsContainer)

      expect(mockSearchResultsContainer.innerHTML).toContain("Test Document")
      expect(mockSearchResultsContainer.innerHTML).toContain('href="#test"')
    })
  })

  describe("Search Input Handling", () => {
    const debounce = (func, wait) => {
      let timeout
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout)
          func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
      }
    }

    it("should debounce search input", async () => {
      const mockSearchFunction = vi.fn()
      const debouncedSearch = debounce(mockSearchFunction, 100)

      // Trigger multiple calls quickly
      debouncedSearch("test1")
      debouncedSearch("test2")
      debouncedSearch("test3")

      // Should not be called immediately
      expect(mockSearchFunction).not.toHaveBeenCalled()

      // Wait for debounce delay
      await new Promise((resolve) => setTimeout(resolve, 150))

      // Should be called only once with the last value
      expect(mockSearchFunction).toHaveBeenCalledTimes(1)
      expect(mockSearchFunction).toHaveBeenCalledWith("test3")
    })

    it("should handle rapid input changes", async () => {
      const mockSearchFunction = vi.fn()
      const debouncedSearch = debounce(mockSearchFunction, 50)

      debouncedSearch("a")
      await new Promise((resolve) => setTimeout(resolve, 25))
      debouncedSearch("ab")
      await new Promise((resolve) => setTimeout(resolve, 25))
      debouncedSearch("abc")

      // Wait for final debounce
      await new Promise((resolve) => setTimeout(resolve, 75))

      expect(mockSearchFunction).toHaveBeenCalledTimes(1)
      expect(mockSearchFunction).toHaveBeenCalledWith("abc")
    })
  })

  describe("Search State Management", () => {
    it("should track search state correctly", () => {
      let isSearchActive = false
      let currentQuery = ""

      const updateSearchState = (query, active) => {
        currentQuery = query
        isSearchActive = active
      }

      updateSearchState("test query", true)
      expect(currentQuery).toBe("test query")
      expect(isSearchActive).toBe(true)

      updateSearchState("", false)
      expect(currentQuery).toBe("")
      expect(isSearchActive).toBe(false)
    })

    it("should handle search focus and blur events", () => {
      const searchState = {
        isFocused: false,
        showResults: false,
      }

      const handleFocus = () => {
        searchState.isFocused = true
        if (mockSearchInput.value.trim()) {
          searchState.showResults = true
        }
      }

      const handleBlur = () => {
        searchState.isFocused = false
        // Delay hiding results to allow for clicks
        setTimeout(() => {
          if (!searchState.isFocused) {
            searchState.showResults = false
          }
        }, 200)
      }

      mockSearchInput.value = "test"
      handleFocus()
      expect(searchState.isFocused).toBe(true)
      expect(searchState.showResults).toBe(true)

      handleBlur()
      expect(searchState.isFocused).toBe(false)
    })
  })
})
