// navigation.js

// Compares two page objects based on their nav_order.
function compareNavOrder(a, b) {
  const aHasOrder = a.nav_order !== undefined && a.nav_order !== null
  const bHasOrder = b.nav_order !== undefined && b.nav_order !== null

  if (aHasOrder && !bHasOrder) return -1
  if (!aHasOrder && bHasOrder) return 1
  if (aHasOrder && bHasOrder) {
    return Number(a.nav_order) - Number(b.nav_order)
  }
  return 0
}

// Compares two page objects based on their title.
function compareTitle(a, b) {
  return a.title.localeCompare(b.title)
}

export class Navigation {
  constructor(sidebarListElement) {
    if (!sidebarListElement) {
      throw new Error("Navigation class requires a sidebarListElement.")
    }
    this.sidebarList = sidebarListElement
    this.currentVersionId = null
    this.currentFile = null
    this.versionsData = null

    this.handleSidebarToggleClick = this.handleSidebarToggleClick.bind(this)
  }

  /**
   * Builds a hierarchical tree structure from a flat list of pages.
   * @param {Array<object>} pages - Flat array of page objects.
   * @returns {Array<object>} - Array representing the root level of the navigation tree.
   */
  buildNavigationTree(pages) {
    const pagesById = new Map()
    const rootPages = []

    // First pass: Create a map of pages by ID
    for (const page of pages) {
      pagesById.set(page.id, { ...page, children: [] })
    }

    // Second pass: Build the tree structure
    for (const page of pages) {
      const pageNode = pagesById.get(page.id)
      if (page.parent && pagesById.has(page.parent)) {
        const parentNode = pagesById.get(page.parent)
        parentNode.children.push(pageNode)
      } else {
        rootPages.push(pageNode)
      }
    }

    // Recursively sort children within each level
    const sortChildren = (pageNode) => {
      if (pageNode.children.length > 0) {
        pageNode.children.sort((a, b) => {
          const orderComparison = compareNavOrder(a, b)
          if (orderComparison !== 0) return orderComparison
          return compareTitle(a, b)
        })
        for (const childNode of pageNode.children) {
          sortChildren(childNode)
        }
      }
    }

    // Sort root pages
    rootPages.sort((a, b) => {
      const orderComparison = compareNavOrder(a, b)
      if (orderComparison !== 0) return orderComparison
      return compareTitle(a, b)
    })

    // Sort children recursively starting from roots
    for (const root of rootPages) {
      sortChildren(root)
    }

    return rootPages
  }

  /**
   * Renders a navigation link element.
   * @param {object} page - The page object.
   * @param {string} versionId - The current version ID.
   * @param {number} depth - The current depth in the navigation tree.
   * @param {boolean} hasChildren - True if the page has child nodes.
   * @returns {HTMLElement} - The list item element for the navigation link.
   */
  renderNavLink(page, versionId, depth, hasChildren) {
    const li = document.createElement("li")
    li.classList.add("nav-item")

    if (depth > 0) {
      li.classList.add(`nav-indent-${depth}`)
    }

    const contentWrapper = document.createElement("div")
    contentWrapper.classList.add("nav-link-content-wrapper")

    if (hasChildren) {
      li.classList.add("nav-parent")
      const toggleButton = document.createElement("button")
      toggleButton.classList.add("nav-toggle")
      toggleButton.setAttribute("aria-expanded", "false")
      toggleButton.setAttribute("aria-label", `Toggle submenu for ${page.title}`)
      // TODO: move to sprite map
      toggleButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="nav-toggle-icon"><polyline points="9 18 15 12 9 6"></polyline></svg>'
      contentWrapper.appendChild(toggleButton)
    }

    const a = document.createElement("a")
    a.href = `#${versionId}/${page.file}`
    a.textContent = page.title
    a.dataset.version = versionId
    a.dataset.file = page.file
    a.classList.add("nav-link")

    contentWrapper.appendChild(a)
    li.appendChild(contentWrapper)
    return li
  }

  /**
   * Recursively renders the navigation tree structure.
   * @param {Array<object>} nodes - Array of page nodes at the current level.
   * @param {string} versionId - The current version ID.
   * @param {number} depth - The current depth.
   * @param {HTMLElement} parentDomElement - The DOM element to append children to.
   */
  renderNavigation(nodes, versionId, depth, parentDomElement) {
    for (const node of nodes) {
      const hasChildren = node.children && node.children.length > 0
      const li = this.renderNavLink(node, versionId, depth, hasChildren)
      parentDomElement.appendChild(li)

      if (hasChildren) {
        const ul = document.createElement("ul")
        ul.classList.add("nav-submenu")
        ul.style.display = "none"
        li.appendChild(ul)
        this.renderNavigation(node.children, versionId, depth + 1, ul)
      }
    }
  }

  /**
   * Populates the sidebar navigation.
   * @param {object} versionsData - The global versions data.
   * @param {string} versionId - The ID of the version to populate for.
   * @param {string} currentFile - The currently active file, to set active state.
   */
  populate(versionsData, versionId, currentFile) {
    this.versionsData = versionsData
    this.currentVersionId = versionId
    this.currentFile = currentFile

    this.sidebarList.innerHTML = ""

    const version = this.versionsData?.versions.find((v) => v.id === versionId)

    if (!version || !version.pages || version.pages.length === 0) {
      this.sidebarList.innerHTML = "<li>No documents found for this version.</li>"
      return
    }

    const navTree = this.buildNavigationTree(version.pages)
    this.renderNavigation(navTree, versionId, 0, this.sidebarList)
    this.updateActiveState(this.currentFile)
    this.initializeToggles()
  }

  /**
   * Ensures a given list item (if it's a collapsible parent) is expanded.
   * @param {HTMLElement} itemLi - The <li> element to potentially expand.
   * @private
   */
  _ensureItemExpanded(itemLi) {
    if (!itemLi.classList.contains("nav-parent") || itemLi.classList.contains("expanded")) {
      return
    }
    const submenu = itemLi.querySelector(":scope > .nav-submenu")
    if (!submenu) {
      return
    }
    const linkContentWrapper = itemLi.querySelector(":scope > .nav-link-content-wrapper")
    const toggleButton = linkContentWrapper ? linkContentWrapper.querySelector(".nav-toggle") : null
    this._updateNavItemState(itemLi, submenu, toggleButton, true)
  }

  /**
   * Processes a single navigation list item for active state.
   * @param {HTMLElement} item - The <li> navigation item to process.
   * @param {string|null} fileName - The file name to check for active state.
   * @returns {boolean} - True if this item was marked active.
   * @private
   */
  _processSingleNavItem(item, fileName) {
    const linkContentWrapper = item.querySelector(".nav-link-content-wrapper")
    if (!linkContentWrapper) {
      item.classList.remove("active")
      return false
    }
    const link = linkContentWrapper.querySelector("a.nav-link")
    if (!link) {
      item.classList.remove("active")
      return false
    }
    const isActive = link.dataset.file === fileName
    item.classList.toggle("active", isActive)

    if (isActive) {
      this._ensureItemExpanded(item)
      return true
    }
    return false
  }

  /**
   * Traverses up from the active navigation item to expand all its parent containers.
   * @param {HTMLElement|null} activeItemElement - The active <li> element.
   * @private
   */
  _expandAncestorNavItems(activeItemElement) {
    if (!activeItemElement) {
      return
    }
    let parentCandidate = activeItemElement.parentElement
    while (parentCandidate && parentCandidate !== this.sidebarList) {
      if (parentCandidate.tagName === "LI" && parentCandidate.classList.contains("nav-item")) {
        this._ensureItemExpanded(parentCandidate)
      }
      parentCandidate = parentCandidate.parentElement
    }
  }

  /**
   * Updates the 'active' class on sidebar list items and expands the active path.
   * @param {string|null} fileName - The file name to mark as active.
   */
  updateActiveState(fileName) {
    this.currentFile = fileName
    const listItems = this.sidebarList.querySelectorAll("li.nav-item")
    let activeItemElement = null

    for (const item of listItems) {
      if (this._processSingleNavItem(item, fileName)) {
        activeItemElement = item
      }
    }
    this._expandAncestorNavItems(activeItemElement)
  }

  /**
   * Performs the actual state change for a collapsible sidebar item.
   * @param {HTMLElement} parentLi
   * @param {HTMLElement} submenu
   * @param {HTMLElement|null} toggleButton
   * @param {boolean} expand
   * @private
   */
  _updateNavItemState(parentLi, submenu, toggleButton, expand) {
    submenu.style.display = expand ? "block" : "none"
    parentLi.classList.toggle("expanded", expand)

    if (toggleButton) {
      toggleButton.setAttribute("aria-expanded", String(expand))
      const icon = toggleButton.querySelector(".nav-toggle-icon")
      if (icon) {
        icon.classList.toggle("expanded", expand)
      }
    }
  }

  /**
   * Handles clicks on sidebar toggle buttons.
   * @param {Event} event - The click event.
   */
  handleSidebarToggleClick(event) {
    const toggleButton = event.target.closest(".nav-toggle")
    if (toggleButton) {
      event.preventDefault()
      const parentLi = toggleButton.closest("li.nav-parent")
      if (!parentLi) {
        console.warn("Toggle button clicked, but no parent 'li.nav-parent' found.", toggleButton)
        return
      }
      const submenu = parentLi.querySelector(":scope > .nav-submenu")
      if (!submenu) {
        console.warn("Submenu element not found for parent item:", parentLi)
        return
      }
      const isCurrentlyExpanded = parentLi.classList.contains("expanded")
      this._updateNavItemState(parentLi, submenu, toggleButton, !isCurrentlyExpanded)
    }
  }

  /**
   * Initializes event listeners for sidebar toggle buttons.
   */
  initializeToggles() {
    this.sidebarList.removeEventListener("click", this.handleSidebarToggleClick)
    this.sidebarList.addEventListener("click", this.handleSidebarToggleClick)
  }
}
