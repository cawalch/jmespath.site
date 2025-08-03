import { initializeJmespathPlaygrounds } from "./jmespathPlayground.js"
import { Navigation } from "./navigation.js"
import { initializeSearch, loadSearchIndex } from "./search.js"
import { initializeTheme } from "./theme.js"

class App {
  constructor() {
    // DOM Elements
    this.versionSelector = document.getElementById("version-selector")
    this.contentArea = document.getElementById("content-area")
    this.sidebarListElement = document.getElementById("sidebar-list")
    this.themeToggleButton = document.getElementById("theme-toggle")
    this.searchInput = document.getElementById("search-input")
    this.searchResultsContainer = document.getElementById("search-results")
    this.htmlElement = document.documentElement

    // State
    this.versionsData = null
    this.currentVersionId = null
    this.currentFile = null
    this.isInitialLoad = true
    this.isProgrammaticScroll = false

    // Navigation
    this.navigation = new Navigation(this.sidebarListElement)

    // Event handlers
    this.handleContentAreaClick = this.handleContentAreaClick.bind(this)
    this.handleHashChange = this.handleHashChange.bind(this)
    this.handleVersionChange = this.handleVersionChange.bind(this)
  }

  // Parses the hash and returns an object with versionId, fileName, and sectionId.
  parseHash() {
    const hash = window.location.hash.substring(1)
    if (!hash) return { versionId: null, fileName: null, sectionId: null }
    const hashParts = hash.split("#")
    const pathPart = hashParts[0]
    const sectionId = hashParts[1] || null
    const pathSegments = pathPart.split("/")
    const versionId = pathSegments[0] || null
    const fileName = pathSegments.slice(1).join("/") || null
    return { versionId, fileName, sectionId }
  }

  // Checks if a version exists in the versions data.
  versionExists(versionId) {
    return this.versionsData?.versions.some((v) => v.id === versionId)
  }

  // Finds a version by its ID in the versions data.
  findVersion(versionId) {
    return this.versionsData?.versions.find((v) => v.id === versionId)
  }

  fileExistsInVersion(fileName, version) {
    return version?.pages.some((p) => p.file === fileName)
  }

  // Determines if content needs to be reloaded based on version and file changes.
  needsContentReload(versionId, fileName, forceReload) {
    const versionChanged = versionId !== this.currentVersionId
    const fileChanged = fileName !== this.currentFile
    return forceReload || versionChanged || fileChanged
  }

  // Fetches and inserts content into the content area.
  async fetchAndInsertContent(versionId, fileName) {
    this.contentArea.innerHTML = '<p class="loading">Loading...</p>'
    try {
      const contentUrl = `${versionId}/${fileName}`
      const response = await fetch(contentUrl)
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      const htmlContent = await response.text()
      this.contentArea.innerHTML = htmlContent
      return true
    } catch (error) {
      console.error(`Error loading content for ${versionId}/${fileName}:`, error)
      this.contentArea.innerHTML = `<p>Error loading content for ${versionId}/${fileName}.</p>`
      return false
    }
  }

  // Updates the hash in the URL.
  updateHash(versionId, fileName, sectionId, usePushState) {
    let newHash = `#${versionId}/${fileName}`
    if (sectionId) newHash += `#${sectionId}`
    if (window.location.hash !== newHash) {
      if (usePushState) {
        history.pushState(null, "", newHash)
      } else {
        history.replaceState(null, "", newHash)
      }
    }
  }

  scrollToSection(sectionId) {
    if (!sectionId) {
      this.contentArea.scrollTop = 0
      return
    }
    setTimeout(() => {
      try {
        const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sectionId) : sectionId
        const element = this.contentArea.querySelector(`#${escapedId}`)
        if (element) {
          this.isProgrammaticScroll = true
          element.style.transition = "outline 0.1s ease-in-out"
          element.style.outline = "2px solid var(--highlight-outline-color, lightblue)"
          setTimeout(() => {
            element.style.outline = "none"
            this.isProgrammaticScroll = false
          }, 1500)
          element.scrollIntoView({ block: "start" })
        } else {
          console.warn(`Section ID not found: #${sectionId}`)
          this.contentArea.scrollTop = 0
        }
      } catch (e) {
        console.error(`Error finding/scrolling to ID ${sectionId}:`, e)
        this.contentArea.scrollTop = 0
      }
    }, 100)
  }

  determineTargetVersionId(hashVersion) {
    const defaultVersionId = this.versionsData?.defaultVersionId
    if (!hashVersion || !this.versionExists(hashVersion)) {
      if (hashVersion && hashVersion !== defaultVersionId) {
        console.warn(`Hash version '${hashVersion}' not found. Falling back to default '${defaultVersionId}'.`)
      } else if (!hashVersion) {
        console.warn(`Hash version missing. Falling back to default '${defaultVersionId}'.`)
      }
      return defaultVersionId
    }
    return hashVersion
  }

  determineTargetFile(hashFile, targetVersion) {
    if (!targetVersion) return null
    const defaultFile = targetVersion.defaultFile
    if (!hashFile || !this.fileExistsInVersion(hashFile, targetVersion)) {
      if (hashFile && hashFile !== defaultFile) {
        console.warn(
          `Hash file '${hashFile}' not found for version '${targetVersion.id}'. Falling back to default '${defaultFile}'.`,
        )
      } else if (!hashFile) {
        console.warn(`Hash file missing for version '${targetVersion.id}'. Falling back to default '${defaultFile}'.`)
      }
      return defaultFile
    }
    return hashFile
  }

  determineInitialTargets() {
    const { versionId: hashVersion, fileName: hashFile, sectionId: hashSection } = this.parseHash()
    const targetVersionId = this.determineTargetVersionId(hashVersion)
    const targetVersion = this.findVersion(targetVersionId)

    if (!targetVersion) {
      console.error(`Determined target version '${targetVersionId}' not found. Cannot determine targets.`)
      return { targetVersionId: null, targetFile: null, targetSectionId: null }
    }

    const targetFile = this.determineTargetFile(hashFile, targetVersion)
    const targetSectionId = hashVersion === targetVersionId && hashFile === targetFile ? hashSection : null

    return { targetVersionId, targetFile, targetSectionId }
  }

  async loadContentAndScroll(versionId, fileName, sectionId, forceReload) {
    if (!versionId || !fileName) {
      this.contentArea.innerHTML = "<p>Select a version and document.</p>"
      this.navigation.updateActiveState(null)
      this.searchInput.disabled = true
      this.searchInput.placeholder = "Select version first"
      return { success: false, versionId: null, fileName: null }
    }

    const versionChanged = versionId !== this.currentVersionId
    const contentNeedsLoading = this.needsContentReload(versionId, fileName, forceReload)

    if (versionChanged) {
      loadSearchIndex(versionId)
    }

    // Update sidebar active state before updating hash
    this.navigation.updateActiveState(fileName)
    // Use pushState if content is loading (major nav) or it's the very first page load
    this.updateHash(versionId, fileName, sectionId, contentNeedsLoading || this.isInitialLoad)

    let contentLoadedSuccessfully = true
    if (contentNeedsLoading) {
      contentLoadedSuccessfully = await this.fetchAndInsertContent(versionId, fileName)
      if (!contentLoadedSuccessfully) {
        this.navigation.updateActiveState(null) // Clear active state on failure
        return { success: false, versionId: versionId, fileName: null }
      }
    }

    initializeJmespathPlaygrounds(this.contentArea)
    this.scrollToSection(sectionId)

    return { success: true, versionId: versionId, fileName: fileName }
  }

  async loadInitialContent(forceReload = false) {
    if (!this.hasValidVersionsData()) {
      this.handleMissingVersionsData()
      return
    }

    const { targetVersionId, targetFile, targetSectionId } = this.determineInitialTargets()

    if (!targetVersionId || !targetFile) {
      console.error("Could not determine initial content targets.")
      this.contentArea.innerHTML = "<p>Could not determine initial content.</p>"
      this.searchInput.disabled = true
      this.searchInput.placeholder = "Error"
      this.versionSelector.disabled = true
      this.versionSelector.innerHTML = "<option value=''>Error</option>"
      return
    }

    this.versionSelector.value = targetVersionId
    this.navigation.populate(this.versionsData, targetVersionId, targetFile)

    const result = await this.loadContentAndScroll(
      targetVersionId,
      targetFile,
      targetSectionId,
      forceReload || this.isInitialLoad,
    )

    if (result.success) {
      this.currentVersionId = result.versionId
      this.currentFile = result.fileName
      this.searchInput.disabled = false
      this.searchInput.placeholder = "Search..."
    } else {
      // Retain targetVersionId if version was valid but file failed, otherwise clear
      this.currentVersionId = this.versionExists(targetVersionId) ? targetVersionId : null
      this.currentFile = null
      this.searchInput.disabled = true
      this.searchInput.placeholder = this.currentVersionId ? "Error loading file" : "Select version first"
    }
    this.isInitialLoad = false
  }

  async initialize() {
    try {
      const response = await fetch("versions.json")
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      this.versionsData = await response.json()
    } catch (error) {
      console.error("Error initializing application:", error)
      this.contentArea.innerHTML = "<p>Failed to load application configuration.</p>"
      this.searchInput.disabled = true
      this.searchInput.placeholder = "Error loading config"
      this.versionSelector.disabled = true
      this.versionSelector.innerHTML = "<option value=''>Error</option>"
      return
    }

    this.populateVersionSelector()

    this.versionSelector.addEventListener("change", this.handleVersionChange)
    window.addEventListener("hashchange", this.handleHashChange)
    this.contentArea.addEventListener("click", this.handleContentAreaClick)

    initializeTheme(this.htmlElement, this.themeToggleButton)
    initializeSearch({
      searchInput: this.searchInput,
      searchResultsContainer: this.searchResultsContainer,
      getCurrentVersionId: () => this.currentVersionId,
      loadSearchIndex: loadSearchIndex,
    })

    await this.loadInitialContent()
  }

  // Handles changes to the version selector.
  handleVersionChange() {
    const selectedVersionId = this.versionSelector.value
    const selectedVersion = this.findVersion(selectedVersionId)
    if (selectedVersion) {
      const defaultFile = selectedVersion.defaultFile
      // When version changes, always populate sidebar and load its default file.
      this.navigation.populate(this.versionsData, selectedVersion.id, defaultFile)

      this.loadContentAndScroll(selectedVersion.id, defaultFile, null, true).then((result) => {
        if (result.success) {
          this.currentVersionId = result.versionId
          this.currentFile = result.fileName
          this.searchInput.disabled = false
          this.searchInput.placeholder = "Search..."
        } else {
          this.currentVersionId = result.versionId
          this.currentFile = null
          this.searchInput.disabled = true
          this.searchInput.placeholder = "Error loading file"
        }
      })
    }
  }

  handleHashChange() {
    if (this.isInitialLoad) {
      return
    }

    const { versionId, fileName, sectionId } = this.parseHash()

    if (!versionId || !fileName) {
      console.warn("Incomplete hash. Reloading initial content based on defaults or corrected hash.")
      this.loadInitialContent(true)
      return
    }

    if (!this.versionExists(versionId)) {
      console.warn(`Hash version '${versionId}' not found. Redirecting to default.`)
      this.loadInitialContent(true)
      return
    }

    if (versionId !== this.currentVersionId) {
      this.versionSelector.value = versionId
      this.navigation.populate(this.versionsData, versionId, fileName)
    }

    const forceReloadContent = versionId !== this.currentVersionId || fileName !== this.currentFile

    // Load content and scroll to section
    //
    this.loadContentAndScroll(versionId, fileName, sectionId, forceReloadContent).then((result) => {
      if (result.success) {
        this.currentVersionId = result.versionId
        this.currentFile = result.fileName
      } else {
        this.currentVersionId = this.versionExists(versionId) ? versionId : this.currentVersionId
        this.currentFile = null // File loading failed
        this.searchInput.disabled = true
        this.searchInput.placeholder = this.currentVersionId ? "Error loading file" : "Select version first"
      }
    })
  }

  // Handles clicks on header anchors within the content area.
  handleContentAreaClick(event) {
    if (!event.target.matches("a.header-anchor")) {
      return
    }
    event.preventDefault()
    const targetHref = event.target.getAttribute("href")
    const sectionId = targetHref ? targetHref.substring(1) : null

    if (sectionId && this.currentVersionId && this.currentFile) {
      this.updateHash(this.currentVersionId, this.currentFile, sectionId, false)
      this.scrollToSection(sectionId)
    }
  }

  // Populates the version selector with available versions.
  populateVersionSelector() {
    this.versionSelector.innerHTML = ""
    if (!this.versionsData || !this.versionsData.versions || this.versionsData.versions.length === 0) {
      console.error("Versions data is empty or invalid.")
      this.versionSelector.innerHTML = "<option value=''>No versions</option>"
      this.versionSelector.disabled = true
      return
    }

    for (const version of this.versionsData.versions) {
      const option = document.createElement("option")
      option.value = version.id
      option.textContent = version.label
      this.versionSelector.appendChild(option)
    }
    this.versionSelector.disabled = false
  }

  hasValidVersionsData() {
    return this.versionsData?.versions && this.versionsData.versions.length > 0
  }

  handleMissingVersionsData() {
    console.error("No versions data available.")
    this.contentArea.innerHTML = "<p>Configuration missing or empty.</p>"
    this.searchInput.disabled = true
    this.searchInput.placeholder = "Error"
    this.versionSelector.disabled = true
    this.versionSelector.innerHTML = "<option value=''>Error</option>"
  }

  hasValidTargets(targetVersionId, targetFile) {
    return targetVersionId && targetFile
  }

  handleInvalidTargets() {
    console.error("Could not determine initial content targets.")
    this.contentArea.innerHTML = "<p>Could not determine initial content.</p>"
    this.searchInput.disabled = true
    this.searchInput.placeholder = "Error"
    this.versionSelector.disabled = true
    this.versionSelector.innerHTML = "<option value=''>Error</option>"
  }

  async setupAndLoadContent(targetVersionId, targetFile, targetSectionId, forceReload) {
    this.versionSelector.value = targetVersionId
    this.navigation.populate(this.versionsData, targetVersionId, targetFile)

    const result = await this.loadContentAndScroll(
      targetVersionId,
      targetFile,
      targetSectionId,
      forceReload || this.isInitialLoad,
    )

    if (result.success) {
      this.currentVersionId = result.versionId
      this.currentFile = result.fileName
      this.searchInput.disabled = false
      this.searchInput.placeholder = "Search..."
    } else {
      // Retain targetVersionId if version was valid but file failed, otherwise clear
      this.currentVersionId = this.versionExists(targetVersionId) ? targetVersionId : null
      this.currentFile = null
      this.searchInput.disabled = true
      this.searchInput.placeholder = this.currentVersionId ? "Error loading file" : "Select version first"
    }
    this.isInitialLoad = false
  }
}

// Export the App class for testing
export default App

document.addEventListener("DOMContentLoaded", () => {
  const app = new App()
  app.initialize()
})
