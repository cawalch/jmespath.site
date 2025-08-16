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
   * Separates JEPs from regular pages and organizes them by status
   * @param {Array<object>} pages - Flat array of page objects.
   * @returns {object} - Object with regularPages and jepPages arrays
   */
  separateJepsFromPages(pages) {
    const regularPages = []
    const jepPages = []

    for (const page of pages) {
      if (page.jepMetadata) {
        jepPages.push(page)
      } else {
        regularPages.push(page)
      }
    }

    return { regularPages, jepPages }
  }

  /**
   * Groups JEPs by status and creates status containers
   * @param {Array<object>} jepPages - Array of JEP page objects
   * @returns {Array<object>} - Array of status group containers
   */
  createJepStatusGroups(jepPages) {
    const statusGroups = {
      accepted: [],
      draft: [],
      obsoleted: [],
      rejected: [],
    }

    // Group JEPs by status
    for (const jep of jepPages) {
      const status = jep.jepMetadata.status || "draft"
      if (statusGroups[status]) {
        statusGroups[status].push(jep)
      }
    }

    // Create status containers
    const statusContainers = []

    if (statusGroups.accepted.length > 0) {
      statusContainers.push({
        id: "jep-accepted",
        title: "Accepted Proposals",
        isJepStatusGroup: true,
        status: "accepted",
        children: statusGroups.accepted,
        navOrder: 1,
      })
    }

    if (statusGroups.draft.length > 0) {
      statusContainers.push({
        id: "jep-draft",
        title: "Draft Proposals",
        isJepStatusGroup: true,
        status: "draft",
        children: statusGroups.draft,
        navOrder: 2,
      })
    }

    if (statusGroups.obsoleted.length > 0) {
      statusContainers.push({
        id: "jep-obsoleted",
        title: "Obsoleted Proposals",
        isJepStatusGroup: true,
        status: "obsoleted",
        children: statusGroups.obsoleted,
        navOrder: 3,
      })
    }

    if (statusGroups.rejected.length > 0) {
      statusContainers.push({
        id: "jep-rejected",
        title: "Rejected Proposals",
        isJepStatusGroup: true,
        status: "rejected",
        children: statusGroups.rejected,
        navOrder: 4,
      })
    }

    return statusContainers
  }

  /**
   * Builds a hierarchical tree structure from a flat list of pages.
   * @param {Array<object>} pages - Flat array of page objects.
   * @returns {Array<object>} - Array representing the root level of the navigation tree.
   */
  buildNavigationTree(pages) {
    const { regularPages, jepPages } = this.separateJepsFromPages(pages)

    // Build regular navigation tree
    const regularTree = this.buildRegularNavigationTree(regularPages)

    // Create JEP section if there are JEPs
    if (jepPages.length > 0) {
      const jepStatusGroups = this.createJepStatusGroups(jepPages)

      // Create main JEP container
      const jepContainer = {
        id: "jep-main",
        title: "Specifications",
        isJepContainer: true,
        children: jepStatusGroups,
        navOrder: 1000, // Place at end
      }

      // Sort JEPs within each status group
      this.sortJepsInStatusGroups(jepContainer.children)

      return [...regularTree, jepContainer]
    }

    return regularTree
  }

  /**
   * Builds navigation tree for regular (non-JEP) pages
   * @param {Array<object>} pages - Array of regular page objects
   * @returns {Array<object>} - Navigation tree for regular pages
   */
  buildRegularNavigationTree(pages) {
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
   * Sorts JEPs within status groups by JEP number and maintains parent-child relationships
   * @param {Array<object>} statusGroups - Array of status group containers
   */
  sortJepsInStatusGroups(statusGroups) {
    for (const statusGroup of statusGroups) {
      if (statusGroup.children && statusGroup.children.length > 0) {
        statusGroup.children = this.buildSortedJepTree(statusGroup.children)
      }
    }
  }

  /**
   * Builds a sorted tree structure from JEP children
   * @param {Array<object>} jeps - Array of JEP objects
   * @returns {Array<object>} - Sorted tree of JEPs
   */
  buildSortedJepTree(jeps) {
    const { rootJeps } = this.buildJepParentChildRelationships(jeps)
    this.sortJepTreeRecursively(rootJeps)
    return rootJeps
  }

  /**
   * Builds parent-child relationships for JEPs
   * @param {Array<object>} jeps - Array of JEP objects
   * @returns {object} - Object containing jepsById map and rootJeps array
   */
  buildJepParentChildRelationships(jeps) {
    const jepsById = new Map()
    const rootJeps = []

    // First pass: Create map of JEPs by ID
    for (const jep of jeps) {
      jepsById.set(jep.id, { ...jep, children: [] })
    }

    // Second pass: Build parent-child relationships
    for (const jep of jeps) {
      const jepNode = jepsById.get(jep.id)
      if (jep.parent && jepsById.has(jep.parent)) {
        const parentNode = jepsById.get(jep.parent)
        parentNode.children.push(jepNode)
      } else {
        rootJeps.push(jepNode)
      }
    }

    return { jepsById, rootJeps }
  }

  /**
   * Sorts JEP tree recursively by JEP number
   * @param {Array<object>} rootJeps - Array of root JEP nodes
   */
  sortJepTreeRecursively(rootJeps) {
    rootJeps.sort(this.createJepComparator())
    for (const rootJep of rootJeps) {
      this.sortJepChildrenRecursively(rootJep)
    }
  }

  /**
   * Recursively sorts children of a JEP node
   * @param {object} jepNode - JEP node to sort children for
   */
  sortJepChildrenRecursively(jepNode) {
    if (jepNode.children.length > 0) {
      jepNode.children.sort(this.createJepComparator())
      for (const child of jepNode.children) {
        this.sortJepChildrenRecursively(child)
      }
    }
  }

  /**
   * Creates a comparator function for sorting JEPs by number
   * @returns {Function} - Comparator function
   */
  createJepComparator() {
    return (a, b) => {
      const aNum = this.extractJepNumber(a)
      const bNum = this.extractJepNumber(b)

      if (aNum !== bNum) {
        return aNum - bNum
      }

      // If numbers are the same, sort by full JEP number string (for 12a vs 12b)
      const aFull = a.jepMetadata?.jepNumber || ""
      const bFull = b.jepMetadata?.jepNumber || ""
      return aFull.localeCompare(bFull)
    }
  }

  /**
   * Extracts numeric part from JEP number for sorting
   * @param {object} jep - JEP object
   * @returns {number} - Numeric part of JEP number, or 999 if not found
   */
  extractJepNumber(jep) {
    if (jep.jepMetadata?.jepNumber) {
      // Extract numeric part (e.g., "12a" -> 12)
      const match = String(jep.jepMetadata.jepNumber).match(/(\d+)/)
      return match ? Number.parseInt(match[1], 10) : 999
    }
    return 999
  }

  /**
   * Adds appropriate CSS classes for JEP items
   * @param {HTMLElement} li - The list item element
   * @param {object} page - The page object
   */
  addJepClasses(li, page) {
    if (page.isJepContainer) {
      li.classList.add("nav-jep-container")
    } else if (page.isJepStatusGroup) {
      li.classList.add("nav-jep-status-group", `nav-jep-status-${page.status}`)
    } else if (page.jepMetadata) {
      li.classList.add("nav-jep-item", `nav-jep-${page.jepMetadata.status}`)
    }
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

    // Add special classes for JEP containers and status groups
    this.addJepClasses(li, page)

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

    // Create link or span based on whether this is a container/group or actual page
    if (page.isJepContainer || page.isJepStatusGroup) {
      const span = document.createElement("span")
      span.textContent = page.title
      span.classList.add("nav-label")
      span.title = page.title // Add tooltip for full title
      contentWrapper.appendChild(span)
    } else {
      const a = document.createElement("a")
      a.href = `#${versionId}/${page.file}`
      a.dataset.version = versionId
      a.dataset.file = page.file
      a.classList.add("nav-link")

      // Add JEP number prefix for JEP items
      if (page.jepMetadata?.jepNumber) {
        const fullTitle = `JEP-${page.jepMetadata.jepNumber}: ${page.title}`
        a.textContent = fullTitle
        a.title = fullTitle // Add tooltip for full title
      } else {
        a.textContent = page.title
        a.title = page.title // Add tooltip for full title
      }

      contentWrapper.appendChild(a)
    }

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
