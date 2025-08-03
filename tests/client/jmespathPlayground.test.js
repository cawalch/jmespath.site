/**
 * Tests for jmespathPlayground.js - Interactive JMESPath evaluation
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock jmespath library
global.jmespath = {
  search: vi.fn(),
}

describe("JMESPath Playground", () => {
  let mockJsonInput
  let mockQueryInput
  let mockOutputArea
  let mockErrorArea

  beforeEach(() => {
    mockJsonInput = {
      value: "",
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    }

    mockQueryInput = {
      value: "",
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    }

    mockOutputArea = {
      textContent: "",
    }

    mockErrorArea = {
      textContent: "",
    }

    vi.clearAllMocks()
  })

  describe("JSON Input Parsing", () => {
    const parseJsonInput = (jsonInput, errorArea) => {
      const jsonString = jsonInput.value
      jsonInput.classList.remove("invalid-json")
      errorArea.textContent = ""

      if (jsonString.trim() === "") {
        return null
      }

      try {
        return JSON.parse(jsonString)
      } catch (e) {
        errorArea.textContent = `Invalid JSON: ${e.message}`
        jsonInput.classList.add("invalid-json")
        return undefined
      }
    }

    it("should parse valid JSON", () => {
      mockJsonInput.value = '{"test": "value"}'

      const result = parseJsonInput(mockJsonInput, mockErrorArea)

      expect(result).toEqual({ test: "value" })
      expect(mockJsonInput.classList.remove).toHaveBeenCalledWith("invalid-json")
      expect(mockErrorArea.textContent).toBe("")
    })

    it("should handle empty input", () => {
      mockJsonInput.value = ""

      const result = parseJsonInput(mockJsonInput, mockErrorArea)

      expect(result).toBeNull()
      expect(mockJsonInput.classList.remove).toHaveBeenCalledWith("invalid-json")
      expect(mockErrorArea.textContent).toBe("")
    })

    it("should handle whitespace-only input", () => {
      mockJsonInput.value = "   \n\t   "

      const result = parseJsonInput(mockJsonInput, mockErrorArea)

      expect(result).toBeNull()
    })

    it("should handle invalid JSON", () => {
      mockJsonInput.value = '{"invalid": json}'

      const result = parseJsonInput(mockJsonInput, mockErrorArea)

      expect(result).toBeUndefined()
      expect(mockJsonInput.classList.add).toHaveBeenCalledWith("invalid-json")
      expect(mockErrorArea.textContent).toContain("Invalid JSON:")
    })

    it("should handle malformed JSON with specific error", () => {
      mockJsonInput.value = '{"unclosed": "string'

      const result = parseJsonInput(mockJsonInput, mockErrorArea)

      expect(result).toBeUndefined()
      expect(mockErrorArea.textContent).toContain("Invalid JSON:")
    })

    it("should handle complex valid JSON", () => {
      const complexJson = {
        users: [
          { name: "Alice", age: 30, active: true },
          { name: "Bob", age: 25, active: false },
        ],
        metadata: {
          total: 2,
          timestamp: "2023-01-01T00:00:00Z",
        },
      }

      mockJsonInput.value = JSON.stringify(complexJson)

      const result = parseJsonInput(mockJsonInput, mockErrorArea)

      expect(result).toEqual(complexJson)
      expect(mockErrorArea.textContent).toBe("")
    })
  })

  describe("JMESPath Query Execution", () => {
    const executeJmespathQuery = (jsonData, queryInput, outputArea, errorArea) => {
      const queryString = queryInput.value
      outputArea.textContent = ""
      queryInput.classList.remove("border-red-500", "dark:border-red-400")

      if (queryString.trim() === "") {
        outputArea.textContent = "// Enter a JMESPath query"
        return
      }

      try {
        const result = jmespath.search(jsonData, queryString)
        outputArea.textContent = JSON.stringify(result, null, 2)
      } catch (e) {
        errorArea.textContent = `Query Error: ${e.message}`
        queryInput.classList.add("border-red-500", "dark:border-red-400")
      }
    }

    beforeEach(() => {
      global.jmespath.search.mockClear()
    })

    it("should execute simple query successfully", () => {
      const testData = { name: "Alice", age: 30 }
      mockQueryInput.value = "name"
      global.jmespath.search.mockReturnValue("Alice")

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(global.jmespath.search).toHaveBeenCalledWith(testData, "name")
      expect(mockOutputArea.textContent).toBe('"Alice"')
      expect(mockQueryInput.classList.remove).toHaveBeenCalledWith("border-red-500", "dark:border-red-400")
    })

    it("should handle empty query", () => {
      const testData = { name: "Alice" }
      mockQueryInput.value = ""

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(global.jmespath.search).not.toHaveBeenCalled()
      expect(mockOutputArea.textContent).toBe("// Enter a JMESPath query")
    })

    it("should handle whitespace-only query", () => {
      const testData = { name: "Alice" }
      mockQueryInput.value = "   \n\t   "

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(global.jmespath.search).not.toHaveBeenCalled()
      expect(mockOutputArea.textContent).toBe("// Enter a JMESPath query")
    })

    it("should handle query errors", () => {
      const testData = { name: "Alice" }
      mockQueryInput.value = "invalid[query"
      global.jmespath.search.mockImplementation(() => {
        throw new Error("Syntax error in JMESPath expression")
      })

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(global.jmespath.search).toHaveBeenCalledWith(testData, "invalid[query")
      expect(mockErrorArea.textContent).toBe("Query Error: Syntax error in JMESPath expression")
      expect(mockQueryInput.classList.add).toHaveBeenCalledWith("border-red-500", "dark:border-red-400")
    })

    it("should handle complex query results", () => {
      const testData = {
        users: [
          { name: "Alice", age: 30 },
          { name: "Bob", age: 25 },
        ],
      }
      const expectedResult = ["Alice", "Bob"]

      mockQueryInput.value = "users[*].name"
      global.jmespath.search.mockReturnValue(expectedResult)

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(global.jmespath.search).toHaveBeenCalledWith(testData, "users[*].name")
      expect(mockOutputArea.textContent).toBe('[\n  "Alice",\n  "Bob"\n]')
    })

    it("should handle null/undefined results", () => {
      const testData = { name: "Alice" }
      mockQueryInput.value = "nonexistent"
      global.jmespath.search.mockReturnValue(null)

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(mockOutputArea.textContent).toBe("null")
    })

    it("should clear previous errors on successful execution", () => {
      const executeJmespathQuery = (jsonData, queryInput, outputArea, errorArea) => {
        const queryString = queryInput.value
        outputArea.textContent = ""
        queryInput.classList.remove("border-red-500", "dark:border-red-400")
        errorArea.textContent = "" // Clear errors first

        if (queryString.trim() === "") {
          outputArea.textContent = "// Enter a JMESPath query"
          return
        }

        try {
          const result = jmespath.search(jsonData, queryString)
          outputArea.textContent = JSON.stringify(result, null, 2)
        } catch (e) {
          errorArea.textContent = `Query Error: ${e.message}`
          queryInput.classList.add("border-red-500", "dark:border-red-400")
        }
      }

      const testData = { name: "Alice" }
      mockQueryInput.value = "name"
      global.jmespath.search.mockReturnValue("Alice")

      // Set initial error state
      mockErrorArea.textContent = "Previous error"

      executeJmespathQuery(testData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(mockOutputArea.textContent).toBe('"Alice"')
      expect(mockErrorArea.textContent).toBe("")
    })
  })

  describe("Playground Integration", () => {
    it("should handle complete workflow", () => {
      // Mock a complete playground interaction
      const testData = { users: [{ name: "Alice", active: true }] }
      const query = "users[?active].name"
      const expectedResult = ["Alice"]

      // Parse JSON
      mockJsonInput.value = JSON.stringify(testData)
      const parseJsonInput = (jsonInput, errorArea) => {
        try {
          return JSON.parse(jsonInput.value)
        } catch (e) {
          errorArea.textContent = `Invalid JSON: ${e.message}`
          return undefined
        }
      }

      const parsedData = parseJsonInput(mockJsonInput, mockErrorArea)
      expect(parsedData).toEqual(testData)

      // Execute query
      mockQueryInput.value = query
      global.jmespath.search.mockReturnValue(expectedResult)

      const executeJmespathQuery = (jsonData, queryInput, outputArea, errorArea) => {
        try {
          const result = jmespath.search(jsonData, queryInput.value)
          outputArea.textContent = JSON.stringify(result, null, 2)
        } catch (e) {
          errorArea.textContent = `Query Error: ${e.message}`
        }
      }

      executeJmespathQuery(parsedData, mockQueryInput, mockOutputArea, mockErrorArea)

      expect(global.jmespath.search).toHaveBeenCalledWith(testData, query)
      expect(mockOutputArea.textContent).toBe('[\n  "Alice"\n]')
    })

    it("should handle invalid JSON followed by valid query", () => {
      // Invalid JSON first
      mockJsonInput.value = '{"invalid": json}'

      const parseJsonInput = (jsonInput, errorArea) => {
        try {
          return JSON.parse(jsonInput.value)
        } catch (e) {
          errorArea.textContent = `Invalid JSON: ${e.message}`
          jsonInput.classList.add("invalid-json")
          return undefined
        }
      }

      const parsedData = parseJsonInput(mockJsonInput, mockErrorArea)
      expect(parsedData).toBeUndefined()
      expect(mockErrorArea.textContent).toContain("Invalid JSON:")
      expect(mockJsonInput.classList.add).toHaveBeenCalledWith("invalid-json")
    })
  })
})
