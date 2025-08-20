/**
 * Tests for jmespath-validation.js - JMESPath query validation in markdown
 */

import { describe, expect, it } from "vitest"
import { extractJmespathBlocks, validateJmespathBlock } from "../../scripts/lib/jmespath-validation.js"

describe("JMESPath Validation", () => {
  describe("extractJmespathBlocks", () => {
    it("should extract valid JMESPath blocks from markdown", () => {
      const markdown = `
# Test Document

Some text here.

\`\`\`jmespath-interactive Simple Test
{
  "name": "Alice",
  "age": 30
}
---JMESPATH---
name
\`\`\`

More text.

\`\`\`jmespath-interactive Another Test
{
  "items": [1, 2, 3]
}
---JMESPATH---
items[0]
\`\`\`
`

      const blocks = extractJmespathBlocks(markdown, "test.md")

      expect(blocks).toHaveLength(2)
      expect(blocks[0].title).toBe("Simple Test")
      expect(blocks[0].jsonInput).toContain('"name": "Alice"')
      expect(blocks[0].jmespathQuery).toBe("name")
      expect(blocks[0].error).toBeNull()

      expect(blocks[1].title).toBe("Another Test")
      expect(blocks[1].jsonInput).toContain('"items": [1, 2, 3]')
      expect(blocks[1].jmespathQuery).toBe("items[0]")
      expect(blocks[1].error).toBeNull()
    })

    it("should handle blocks with invalid format", () => {
      const markdown = `
\`\`\`jmespath-interactive Invalid Block
{
  "name": "Alice"
}
\`\`\`
`

      const blocks = extractJmespathBlocks(markdown, "test.md")

      expect(blocks).toHaveLength(1)
      expect(blocks[0].error).toContain("Invalid block format")
    })

    it("should handle blocks without titles", () => {
      const markdown = `
\`\`\`jmespath-interactive
{
  "name": "Alice"
}
---JMESPATH---
name
\`\`\`
`

      const blocks = extractJmespathBlocks(markdown, "test.md")

      expect(blocks).toHaveLength(1)
      expect(blocks[0].title).toBe("Block 1")
    })
  })

  describe("validateJmespathBlock", () => {
    it("should validate correct JMESPath queries", () => {
      const block = {
        index: 0,
        title: "Test",
        filePath: "test.md",
        jsonInput: '{"name": "Alice", "age": 30}',
        jmespathQuery: "name",
        lineNumber: 1,
        error: null,
      }

      const result = validateJmespathBlock(block)

      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.queryResult).toBe("Alice")
    })

    it("should detect invalid JSON", () => {
      const block = {
        index: 0,
        title: "Test",
        filePath: "test.md",
        jsonInput: '{"name": "Alice", "age":}',
        jmespathQuery: "name",
        lineNumber: 1,
        error: null,
      }

      const result = validateJmespathBlock(block)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("Invalid JSON")
    })

    it("should detect invalid JMESPath queries", () => {
      const block = {
        index: 0,
        title: "Test",
        filePath: "test.md",
        jsonInput: '{"name": "Alice", "age": 30}',
        jmespathQuery: "invalid[syntax",
        lineNumber: 1,
        error: null,
      }

      const result = validateJmespathBlock(block)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("JMESPath query error")
    })

    it("should handle empty inputs with warnings", () => {
      const block = {
        index: 0,
        title: "Test",
        filePath: "test.md",
        jsonInput: "",
        jmespathQuery: "",
        lineNumber: 1,
        error: null,
      }

      const result = validateJmespathBlock(block)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain("Empty JSON input")
      expect(result.warnings).toContain("Empty JMESPath query")
    })

    it("should handle blocks with extraction errors", () => {
      const block = {
        index: 0,
        title: "Test",
        filePath: "test.md",
        jsonInput: "",
        jmespathQuery: "",
        lineNumber: 1,
        error: "Some extraction error",
      }

      const result = validateJmespathBlock(block)

      expect(result.success).toBe(false)
      expect(result.errors).toContain("Some extraction error")
    })
  })
})
