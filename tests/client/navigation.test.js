/**
 * Tests for navigation.js - Sidebar navigation
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("Navigation Functionality", () => {
  let mockSidebarElement
  let mockVersionsData
  let _mockPages

  beforeEach(() => {
    mockSidebarElement = {
      innerHTML: "",
      appendChild: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn(),
    }

    mockVersionsData = {
      versions: [
        {
          id: "current",
          label: "Current",
          pages: [
            { id: "home", file: "index.html", title: "Home", navOrder: 1, parent: null },
            { id: "guide", file: "guide.html", title: "Guide", navOrder: 2, parent: null },
            { id: "examples", file: "examples.html", title: "Examples", navOrder: 3, parent: "guide" },
          ],
          defaultFile: "index.html",
        },
      ],
      defaultVersionId: "current",
    }

    _mockPages = mockVersionsData.versions[0].pages

    vi.clearAllMocks()
  })

  describe("Page Sorting", () => {
    const hasValue = (value) => value !== undefined && value !== null

    const createComparator = (getValue, compareValues = (a, b) => a.localeCompare?.(b) || a - b) => {
      return (a, b) => {
        const aValue = getValue(a)
        const bValue = getValue(b)
        const aHasValue = hasValue(aValue)
        const bHasValue = hasValue(bValue)

        if (aHasValue && !bHasValue) return -1
        if (!aHasValue && bHasValue) return 1
        if (aHasValue && bHasValue) return compareValues(aValue, bValue)
        return 0
      }
    }

    const compareParent = createComparator((page) => page.parent || "")
    const compareNavOrder = createComparator(
      (page) => page.navOrder,
      (a, b) => Number(a) - Number(b),
    )
    const compareTitle = createComparator((page) => page.title)

    const compareNavPages = (a, b) => {
      return compareParent(a, b) || compareNavOrder(a, b) || compareTitle(a, b)
    }

    it("should sort pages by parent first", () => {
      const pages = [
        { title: "Child", parent: "parent", navOrder: 1 },
        { title: "Parent", parent: null, navOrder: 2 },
      ]

      pages.sort(compareNavPages)

      // Pages with null parent should come first
      expect(pages[0].title).toBe("Parent")
      expect(pages[1].title).toBe("Child")
    })

    it("should sort by nav order within same parent", () => {
      const pages = [
        { title: "Second", parent: null, navOrder: 2 },
        { title: "First", parent: null, navOrder: 1 },
        { title: "Third", parent: null, navOrder: 3 },
      ]

      pages.sort(compareNavPages)

      expect(pages.map((p) => p.title)).toEqual(["First", "Second", "Third"])
    })

    it("should sort by title when nav order is same", () => {
      const pages = [
        { title: "Zebra", parent: null, navOrder: 1 },
        { title: "Alpha", parent: null, navOrder: 1 },
      ]

      pages.sort(compareNavPages)

      expect(pages[0].title).toBe("Alpha")
      expect(pages[1].title).toBe("Zebra")
    })

    it("should handle missing nav order", () => {
      const pages = [
        { title: "With Order", parent: null, navOrder: 1 },
        { title: "Without Order", parent: null },
      ]

      pages.sort(compareNavPages)

      expect(pages[0].title).toBe("With Order")
      expect(pages[1].title).toBe("Without Order")
    })

    it("should correctly sort pages with navOrder property (camelCase)", () => {
      const pages = [
        { title: "Discarding nulls", navOrder: 2 },
        { title: "Home", navOrder: 1 },
      ]

      pages.sort(compareNavPages)

      expect(pages[0].title).toBe("Home")
      expect(pages[1].title).toBe("Discarding nulls")
    })
  })

  describe("Navigation Tree Building", () => {
    const buildNavigationTree = (pages) => {
      const sortedPages = [...pages].sort((a, b) => {
        const compareParent = (a, b) => {
          const aParent = a.parent || ""
          const bParent = b.parent || ""
          return aParent.localeCompare(bParent)
        }
        const compareOrder = (a, b) => {
          const aOrder = a.navOrder || 999
          const bOrder = b.navOrder || 999
          return aOrder - bOrder
        }
        const compareTitle = (a, b) => {
          return a.title.localeCompare(b.title)
        }

        return compareParent(a, b) || compareOrder(a, b) || compareTitle(a, b)
      })

      const tree = []
      const parentMap = new Map()

      for (const page of sortedPages) {
        const item = {
          ...page,
          children: [],
        }

        if (page.parent) {
          const parent = parentMap.get(page.parent)
          if (parent) {
            parent.children.push(item)
          } else {
            // Parent not found, add to root
            tree.push(item)
          }
          parentMap.set(page.id, item)
        } else {
          tree.push(item)
          parentMap.set(page.id, item)
        }
      }

      return tree
    }

    it("should build flat navigation tree", () => {
      const pages = [
        { id: "home", title: "Home", parent: null, navOrder: 1 },
        { id: "about", title: "About", parent: null, navOrder: 2 },
      ]

      const tree = buildNavigationTree(pages)

      expect(tree).toHaveLength(2)
      expect(tree[0].title).toBe("Home")
      expect(tree[1].title).toBe("About")
      expect(tree[0].children).toHaveLength(0)
    })

    it("should build hierarchical navigation tree", () => {
      const pages = [
        { id: "guide", title: "Guide", parent: null, navOrder: 1 },
        { id: "intro", title: "Introduction", parent: "guide", navOrder: 1 },
        { id: "advanced", title: "Advanced", parent: "guide", navOrder: 2 },
      ]

      const tree = buildNavigationTree(pages)

      expect(tree).toHaveLength(1)
      expect(tree[0].title).toBe("Guide")
      expect(tree[0].children).toHaveLength(2)
      expect(tree[0].children[0].title).toBe("Introduction")
      expect(tree[0].children[1].title).toBe("Advanced")
    })

    it("should handle orphaned children", () => {
      const pages = [
        { id: "orphan", title: "Orphan", parent: "nonexistent", navOrder: 1 },
        { id: "home", title: "Home", parent: null, navOrder: 2 },
      ]

      const tree = buildNavigationTree(pages)

      expect(tree).toHaveLength(2)
      // Orphan should be added to root level
      expect(tree.some((item) => item.title === "Orphan")).toBe(true)
    })
  })

  describe("Navigation HTML Generation", () => {
    const generateNavigationHtml = (tree, activeFile) => {
      const generateItem = (item, level = 0) => {
        const isActive = item.file === activeFile
        const hasChildren = item.children && item.children.length > 0
        const indent = "  ".repeat(level)

        let html = `${indent}<li class="nav-item${isActive ? " active" : ""}">\n`
        html += `${indent}  <a href="#current/${item.file}" class="nav-link">${item.title}</a>\n`

        if (hasChildren) {
          html += `${indent}  <ul class="nav-children">\n`
          for (const child of item.children) {
            html += generateItem(child, level + 2)
          }
          html += `${indent}  </ul>\n`
        }

        html += `${indent}</li>\n`
        return html
      }

      let html = '<ul class="nav-list">\n'
      for (const item of tree) {
        html += generateItem(item, 1)
      }
      html += "</ul>"

      return html
    }

    it("should generate HTML for flat navigation", () => {
      const tree = [{ id: "home", file: "index.html", title: "Home", children: [] }]

      const html = generateNavigationHtml(tree, "index.html")

      expect(html).toContain('<ul class="nav-list">')
      expect(html).toContain('class="nav-item active"')
      expect(html).toContain('href="#current/index.html"')
      expect(html).toContain(">Home</a>")
    })

    it("should generate HTML for hierarchical navigation", () => {
      const tree = [
        {
          id: "guide",
          file: "guide.html",
          title: "Guide",
          children: [{ id: "intro", file: "intro.html", title: "Introduction", children: [] }],
        },
      ]

      const html = generateNavigationHtml(tree, "intro.html")

      expect(html).toContain('<ul class="nav-children">')
      expect(html).toContain('href="#current/guide.html"')
      expect(html).toContain('href="#current/intro.html"')
      expect(html).toContain('class="nav-item active"') // Introduction should be active
    })

    it("should handle no active file", () => {
      const tree = [{ id: "home", file: "index.html", title: "Home", children: [] }]

      const html = generateNavigationHtml(tree, null)

      expect(html).not.toContain("active")
      expect(html).toContain('class="nav-item"')
    })
  })

  describe("Active State Management", () => {
    const updateActiveState = (container, activeFile) => {
      // Remove all active classes
      const activeElements = container.querySelectorAll(".active")
      for (const element of activeElements) {
        element.classList.remove("active")
      }

      // Add active class to current file
      if (activeFile) {
        const activeLink = container.querySelector(`a[href="#current/${activeFile}"]`)
        if (activeLink) {
          const navItem = activeLink.closest(".nav-item")
          if (navItem) {
            navItem.classList.add("active")
          }
        }
      }
    }

    it("should update active state correctly", () => {
      const mockActiveElements = [{ classList: { remove: vi.fn() } }, { classList: { remove: vi.fn() } }]

      const mockActiveLink = {
        closest: vi.fn().mockReturnValue({
          classList: { add: vi.fn() },
        }),
      }

      mockSidebarElement.querySelectorAll.mockReturnValue(mockActiveElements)
      mockSidebarElement.querySelector.mockReturnValue(mockActiveLink)

      updateActiveState(mockSidebarElement, "guide.html")

      expect(mockSidebarElement.querySelectorAll).toHaveBeenCalledWith(".active")
      expect(mockActiveElements[0].classList.remove).toHaveBeenCalledWith("active")
      expect(mockActiveElements[1].classList.remove).toHaveBeenCalledWith("active")
      expect(mockSidebarElement.querySelector).toHaveBeenCalledWith('a[href="#current/guide.html"]')
      expect(mockActiveLink.closest).toHaveBeenCalledWith(".nav-item")
    })

    it("should handle missing active file", () => {
      const mockActiveElements = [{ classList: { remove: vi.fn() } }]

      mockSidebarElement.querySelectorAll.mockReturnValue(mockActiveElements)
      mockSidebarElement.querySelector.mockReturnValue(null)

      updateActiveState(mockSidebarElement, null)

      expect(mockActiveElements[0].classList.remove).toHaveBeenCalledWith("active")
      expect(mockSidebarElement.querySelector).not.toHaveBeenCalled()
    })

    it("should handle missing navigation link", () => {
      mockSidebarElement.querySelectorAll.mockReturnValue([])
      mockSidebarElement.querySelector.mockReturnValue(null)

      updateActiveState(mockSidebarElement, "nonexistent.html")

      expect(mockSidebarElement.querySelector).toHaveBeenCalledWith('a[href="#current/nonexistent.html"]')
    })
  })

  describe("Navigation Population", () => {
    const populateNavigation = (container, versionsData, versionId, activeFile) => {
      const version = versionsData.versions.find((v) => v.id === versionId)
      if (!version) {
        container.innerHTML = "<p>Version not found</p>"
        return
      }

      const sortedPages = [...version.pages].sort((a, b) => {
        const aOrder = a.navOrder || 999
        const bOrder = b.navOrder || 999
        return aOrder - bOrder || a.title.localeCompare(b.title)
      })

      let html = '<ul class="nav-list">'
      for (const page of sortedPages) {
        const isActive = page.file === activeFile
        html += `<li class="nav-item${isActive ? " active" : ""}">
          <a href="#${versionId}/${page.file}" class="nav-link">${page.title}</a>
        </li>`
      }
      html += "</ul>"

      container.innerHTML = html
    }

    it("should populate navigation successfully", () => {
      populateNavigation(mockSidebarElement, mockVersionsData, "current", "guide.html")

      expect(mockSidebarElement.innerHTML).toContain('<ul class="nav-list">')
      expect(mockSidebarElement.innerHTML).toContain('href="#current/index.html"')
      expect(mockSidebarElement.innerHTML).toContain('href="#current/guide.html"')
      expect(mockSidebarElement.innerHTML).toContain('class="nav-item active"')
    })

    it("should handle invalid version", () => {
      populateNavigation(mockSidebarElement, mockVersionsData, "nonexistent", "index.html")

      expect(mockSidebarElement.innerHTML).toBe("<p>Version not found</p>")
    })

    it("should handle empty pages", () => {
      const emptyVersionsData = {
        versions: [{ id: "empty", label: "Empty", pages: [], defaultFile: "index.html" }],
      }

      populateNavigation(mockSidebarElement, emptyVersionsData, "empty", null)

      expect(mockSidebarElement.innerHTML).toContain('<ul class="nav-list"></ul>')
    })
  })
})
