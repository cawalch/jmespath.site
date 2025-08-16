/**
 * Tests for content-processing.js - HTML escaping and JMESPath playground rendering
 */

import { describe, expect, it } from "vitest"
import { renderJmespathInteractiveBlock } from "../../scripts/lib/content-processing.js"

describe("Content Processing - HTML Escaping", () => {
  describe("renderJmespathInteractiveBlock", () => {
    it("should escape HTML entities in JMESPath queries", () => {
      const token = {
        text: `{
  "logs": [
    {"timestamp": "2023-01-01T08:00:00Z", "level": "info", "message": "System started"},
    {"timestamp": "2023-01-01T08:05:23Z", "level": "error", "message": "Database connection failed"}
  ]
}
---JMESPATH---
logs[?level=='error'] | sort_by(@, &timestamp) | [0]`,
      }

      const result = renderJmespathInteractiveBlock(token, "Test Example", false)

      // Check that the ampersand in &timestamp is properly escaped
      expect(result).toContain("&amp;timestamp")
      expect(result).not.toContain("&timestamp")

      // Verify the query is still readable and functional
      expect(result).toContain("logs[?level==&#39;error&#39;] | sort_by(@, &amp;timestamp) | [0]")
    })

    it("should escape HTML entities in JSON input", () => {
      const token = {
        text: `{
  "message": "Hello <world> & 'friends'",
  "data": "Test \"quotes\" here"
}
---JMESPATH---
message`,
      }

      const result = renderJmespathInteractiveBlock(token, "Test Example", false)

      // Check that HTML entities in JSON are properly escaped
      expect(result).toContain("&lt;world&gt;")
      expect(result).toContain("&amp;")
      expect(result).toContain("&#39;friends&#39;")
      expect(result).toContain("&quot;quotes&quot;")

      // Should not contain unescaped HTML
      expect(result).not.toContain("<world>")
      expect(result).not.toContain("'friends'")
      expect(result).not.toContain('"quotes"')
    })

    it("should handle empty or missing content gracefully", () => {
      const token = {
        text: "---JMESPATH---",
      }

      const result = renderJmespathInteractiveBlock(token, "Empty Test", false)

      // Should render without errors
      expect(result).toContain("textarea")
      expect(result).toContain("Empty Test")
    })

    it("should preserve functionality while escaping", () => {
      const token = {
        text: `{"users": [{"name": "Alice & Bob", "active": true}]}
---JMESPATH---
users[?active].name`,
      }

      const result = renderJmespathInteractiveBlock(token, "Functional Test", false)

      // Should escape the ampersand in JSON
      expect(result).toContain("Alice &amp; Bob")

      // Should preserve the query structure
      expect(result).toContain("users[?active].name")

      // Should contain proper textarea elements
      expect(result).toContain('class="json-input')
      expect(result).toContain('class="query-input')
    })
  })
})
