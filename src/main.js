import { initializeTheme } from "./theme.js";
import { initializeJmespathPlaygrounds } from "./jmespathPlayground.js";
import { initializeSearch, loadSearchIndex } from "./search.js";

class App {
  constructor() {
    // 1. Get DOM elements in the constructor
    this.versionSelector = document.getElementById("version-selector");
    this.contentArea = document.getElementById("content-area");
    this.sidebarList = document.getElementById("sidebar-list");
    this.themeToggleButton = document.getElementById("theme-toggle");
    this.searchInput = document.getElementById("search-input");
    this.searchResultsContainer = document.getElementById("search-results");
    this.htmlElement = document.documentElement;

    // 2. Initialize state properties
    this.versionsData = null;
    this.currentVersionId = null;
    this.currentFile = null;
    this.isInitialLoad = true;
    this.isProgrammaticScroll = false;
    this.searchIndex = null;
    this.searchDocMap = null;

    // 3. Bind event handlers if needed (to maintain `this` context)
    this.handleContentAreaClick = this.handleContentAreaClick.bind(this);
    this.handleHashChange = this.handleHashChange.bind(this);
    this.handleVersionChange = this.handleVersionChange.bind(this);
  }

  // 4. Define methods
  /**
   * Parses the current URL hash into version, file, and section components.
   * @returns {{versionId: string|null, fileName: string|null, sectionId: string|null}}
   */
  parseHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return { versionId: null, fileName: null, sectionId: null };

    // Split hash into path and section parts (e.g., "v1/docs/file#section")
    const hashParts = hash.split("#");
    const pathPart = hashParts[0];
    const sectionId = hashParts[1] || null;

    // Split path part into version and file path (e.g., "v1/docs/file")
    const pathSegments = pathPart.split("/");
    const versionId = pathSegments[0] || null;
    const fileName = pathSegments.slice(1).join("/") || null;

    return { versionId, fileName, sectionId };
  }

  /**
   * Checks if the target version ID exists in the versions data.
   * @param {string} versionId - The version ID to check.
   * @returns {boolean}
   */
  versionExists(versionId) {
    return this.versionsData?.versions.some((v) => v.id === versionId);
  }

  /**
   * Finds a version object by its ID.
   * @param {string} versionId - The version ID to find.
   * @returns {object|undefined}
   */
  findVersion(versionId) {
    return this.versionsData?.versions.find((v) => v.id === versionId);
  }

  /**
   * Checks if a file name exists within a specific version's pages.
   * @param {string} fileName - The file name to check.
   * @param {object} version - The version object.
   * @returns {boolean}
   */
  fileExistsInVersion(fileName, version) {
    return version?.pages.some((p) => p.file === fileName);
  }

  /**
   * Determines if content needs to be reloaded based on version/file changes or forceReload flag.
   * @param {string} versionId - The new version ID.
   * @param {string} fileName - The new file name.
   * @param {boolean} forceReload - Flag to force reload.
   * @returns {boolean}
   */
  needsContentReload(versionId, fileName, forceReload) {
    const versionChanged = versionId !== this.currentVersionId;
    const fileChanged = fileName !== this.currentFile;
    return forceReload || versionChanged || fileChanged;
  }

  /**
   * Handles the core logic of fetching and inserting content.
   * @param {string} versionId
   * @param {string} fileName
   * @returns {Promise<boolean>} - True if content loaded successfully, false otherwise.
   */
  async fetchAndInsertContent(versionId, fileName) {
    this.contentArea.innerHTML = '<p class="loading">Loading...</p>';
    try {
      const contentUrl = `${versionId}/${fileName}`;
      const response = await fetch(contentUrl);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const htmlContent = await response.text();
      this.contentArea.innerHTML = htmlContent;
      return true;
    } catch (error) {
      console.error(`Error loading content for ${versionId}/${fileName}:`, error);
      this.contentArea.innerHTML = `<p>Error loading content for ${versionId}/${fileName}.</p>`;
      return false;
    }
  }

  /**
   * Updates the URL hash without triggering a full page reload.
   * @param {string} versionId
   * @param {string} fileName
   * @param {string|null} sectionId
   * @param {boolean} isPageLoad - Use pushState on initial load/major navigation, replaceState otherwise.
   */
  updateHash(versionId, fileName, sectionId, isPageLoad) {
    let newHash = `#${versionId}/${fileName}`;
    if (sectionId) newHash += `#${sectionId}`;

    // Only update if the hash is different
    if (window.location.hash !== newHash) {
      if (isPageLoad) {
        history.pushState(null, "", newHash);
      } else {
        history.replaceState(null, "", newHash);
      }
    }
  }

  /**
   * Scrolls the content area to the specified section ID.
   * @param {string|null} sectionId
   */
  scrollToSection(sectionId) {
    // Scroll to top if no sectionId is provided or found
    if (!sectionId) {
      this.contentArea.scrollTop = 0;
      return;
    }

    // Delay scrolling slightly to allow content rendering
    setTimeout(() => {
      try {
        // CSS.escape is not standard in all older browsers, consider a polyfill if needed
        const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(sectionId) : sectionId;
        const element = this.contentArea.querySelector(`#${escapedId}`);

        if (element) {
          this.isProgrammaticScroll = true;

          element.style.transition = "outline 0.1s ease-in-out";
          element.style.outline = "2px solid var(--highlight-outline-color, lightblue)";
          setTimeout(() => {
            element.style.outline = "none";
            this.isProgrammaticScroll = false;
          }, 1500);

          element.scrollIntoView({ block: "start" });
        } else {
          console.warn(`Section ID not found: #${sectionId}`);
          this.contentArea.scrollTop = 0;
        }
      } catch (e) {
        console.error(`Error finding/scrolling to ID ${sectionId}:`, e);
        this.contentArea.scrollTop = 0;
      }
    }, 100);
  }

  /**
   * Updates the 'active' class on sidebar links based on the current file name.
   * @param {string|null} fileName - The file name to mark as active.
   */
  updateSidebarActiveState(fileName) {
    const links = this.sidebarList.querySelectorAll("a");
    for (const link of links) {
      link.classList.toggle("active", link.dataset.file === fileName);
    }
  }

  /**
   * Populates the sidebar navigation based on the pages defined for a version.
   * @param {string} versionId
   */
  populateSidebar(versionId) {
    this.sidebarList.innerHTML = "";

    const version = this.versionsData?.versions.find((v) => v.id === versionId);

    if (!version || !version.pages || version.pages.length === 0) {
      this.sidebarList.innerHTML = "<li>No documents found for this version.</li>";
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const page of version.pages) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      // Use relative URL for hash, linking to version/file
      a.href = `#${versionId}/${page.file}`;
      a.textContent = page.title;
      // Store data attributes for easy access in handler
      a.dataset.version = versionId;
      a.dataset.file = page.file;

      li.appendChild(a);
      fragment.appendChild(li);
    }

    this.sidebarList.appendChild(fragment);
    // Update active state in sidebar after populating
    this.updateSidebarActiveState(this.currentFile);
  }

  /**
   * Determines the initial version ID based on hash or default.
   * @param {string|null} hashVersion - The version ID from the URL hash.
   * @returns {string|null} - The determined target version ID.
   */
  determineTargetVersionId(hashVersion) {
    // If hash version is invalid or missing, use default version
    if (!hashVersion || !this.versionExists(hashVersion)) {
      if (hashVersion !== this.versionsData.defaultVersionId) {
        console.warn(`Hash version '${hashVersion}' not found or missing. Falling back to default '${this.versionsData.defaultVersionId}'.`);
      } else {
        console.warn(`Hash version missing. Falling back to default '${this.versionsData.defaultVersionId}'.`);
      }
      return this.versionsData.defaultVersionId;
    }
    return hashVersion;
  }

  /**
   * Determines the initial file name based on hash or version default.
   * @param {string|null} hashFile - The file name from the URL hash.
   * @param {object|undefined} targetVersion - The determined target version object.
   * @returns {string|null} - The determined target file name.
   */
  determineTargetFile(hashFile, targetVersion) {
    // If hash file is invalid or missing for the target version, use the version's default file
    if (!targetVersion) {
      // Should not happen if determineTargetVersionId works, but handle defensively
      return null;
    }

    if (!hashFile || !this.fileExistsInVersion(hashFile, targetVersion)) {
      if (hashFile !== targetVersion.defaultFile) {
        console.warn(`Hash file '${hashFile}' not found or missing for version '${targetVersion.id}'. Falling back to default file '${targetVersion.defaultFile}'.`);
      } else {
        console.warn(`Hash file missing for version '${targetVersion.id}'. Falling back to default file '${targetVersion.defaultFile}'.`);
      }
      return targetVersion.defaultFile;
    }
    return hashFile;
  }

  /**
   * Determines the target version, file, and section based on hash or defaults.
   * @returns {{targetVersionId: string|null, targetFile: string|null, targetSectionId: string|null}}
   */
  determineInitialTargets() {
    const { versionId: hashVersion, fileName: hashFile, sectionId: hashSection } = this.parseHash();

    const targetVersionId = this.determineTargetVersionId(hashVersion);
    const targetVersion = this.findVersion(targetVersionId);

    // Handle the case where the determined version (even after fallback) is not found
    if (!targetVersion) {
      console.error(`Determined target version '${targetVersionId}' not found in versions data. Cannot determine targets.`);
      return { targetVersionId: null, targetFile: null, targetSectionId: null };
    }

    const targetFile = this.determineTargetFile(hashFile, targetVersion);

    // Clear section if falling back to default version or default file
    const targetSectionId = hashVersion !== targetVersionId || hashFile !== targetFile ? null : hashSection;

    return { targetVersionId, targetFile, targetSectionId };
  }

  /**
   * Loads content for a specific version/file and scrolls to a section.
   * Handles version/file changes and triggers search index loading.
   * @param {string} versionId
   * @param {string} fileName
   * @param {string|null} sectionId
   * @param {boolean} forceReload - Force fetching content even if version/file hasn't changed.
   * @returns {Promise<{success: boolean, versionId: string|null, fileName: string|null}>} - Result indicating success and the loaded content info.
   */
  async loadContentAndScroll(versionId, fileName, sectionId, forceReload) {
    if (!versionId || !fileName) {
      this.contentArea.innerHTML = "<p>Select a version and document.</p>";
      this.updateSidebarActiveState(null);
      this.searchInput.disabled = true;
      this.searchInput.placeholder = "Select version first";
      return { success: false, versionId: null, fileName: null };
    }

    const versionChanged = versionId !== this.currentVersionId;
    const contentNeedsLoading = this.needsContentReload(versionId, fileName, forceReload);

    if (versionChanged) {
      loadSearchIndex(versionId); // Call imported function
    }

    this.updateSidebarActiveState(fileName);
    this.updateHash(versionId, fileName, sectionId, contentNeedsLoading);

    let contentLoadedSuccessfully = true;
    if (contentNeedsLoading) {
      contentLoadedSuccessfully = await this.fetchAndInsertContent(versionId, fileName);
      if (!contentLoadedSuccessfully) {
        this.updateSidebarActiveState(null);
        // Return values for caller to update context state
        return { success: false, versionId: versionId, fileName: null };
      }
    }

    initializeJmespathPlaygrounds(this.contentArea); // Call imported function, pass DOM element
    this.scrollToSection(sectionId);

    // Return values for caller to update context state
    return { success: true, versionId: versionId, fileName: fileName };
  }

  /**
   * Determines and loads the initial content based on URL hash or defaults.
   * @param {boolean} forceReload - Force fetching content even if hash matches current state.
   */
  async loadInitialContent(forceReload = false) {
    if (!this.versionsData || !this.versionsData.versions || this.versionsData.versions.length === 0) {
      console.error("No versions data available.");
      this.contentArea.innerHTML = "<p>Configuration missing or empty.</p>";
      this.searchInput.disabled = true;
      this.searchInput.placeholder = "Error";
      return;
    }

    const { targetVersionId, targetFile, targetSectionId } = this.determineInitialTargets();

    // Handle the case where no valid version/file could be determined (e.g., empty versions.json or invalid defaults)
    if (!targetVersionId || !targetFile) {
      console.error("Could not determine initial content targets.");
      this.contentArea.innerHTML = "<p>Could not determine initial content.</p>";
      this.searchInput.disabled = true;
      this.searchInput.placeholder = "Error";
      this.versionSelector.disabled = true;
      this.versionSelector.innerHTML = "<option value=''>Error</option>";
      return;
    }

    // Set the version selector value
    this.versionSelector.value = targetVersionId;
    // Populate the sidebar for the selected version
    this.populateSidebar(targetVersionId);

    // Load content and scroll. loadContentAndScroll handles updating current state vars and hash
    const result = await this.loadContentAndScroll(targetVersionId, targetFile, targetSectionId, forceReload);

    // Update state variables in context based on successful load
    if (result.success) {
      this.currentVersionId = result.versionId;
      this.currentFile = result.fileName;
      // Ensure search input is enabled after initial successful load
      this.searchInput.disabled = false;
      this.searchInput.placeholder = "Search...";
    } else {
      // If load failed, update state to reflect no content is loaded
      this.currentFile = null;
      this.currentVersionId = null;
      this.searchInput.disabled = true;
      this.searchInput.placeholder = "Select version first";
    }

    // Mark initial load as complete after the process starts
    this.isInitialLoad = false;
  }

  // 5. Initialization method
  async initialize() {
    // Load versions data
    try {
      const response = await fetch("versions.json");
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      this.versionsData = await response.json();
    } catch (error) {
      console.error("Error initializing application:", error); // Changed message
      this.contentArea.innerHTML = "<p>Failed to load application configuration.</p>"; // Changed message
      this.searchInput.disabled = true;
      this.searchInput.placeholder = "Error loading config"; // Changed placeholder
      this.versionSelector.disabled = true;
      this.versionSelector.innerHTML = "<option value=''>Error</option>"; // Changed option
      return; // Stop initialization
    }

    // Populate version selector
    this.populateVersionSelector();

    // Set up event listeners using instance methods
    this.versionSelector.addEventListener("change", this.handleVersionChange);
    window.addEventListener("hashchange", this.handleHashChange);
    this.contentArea.addEventListener("click", this.handleContentAreaClick);

    // Initialize other modules, passing necessary dependencies
    initializeTheme(this.htmlElement, this.themeToggleButton); // Call imported function
    initializeSearch({
      // Call imported function
      searchInput: this.searchInput,
      searchResultsContainer: this.searchResultsContainer,
      getCurrentVersionId: () => this.currentVersionId,
      loadSearchIndex: loadSearchIndex, // Pass the imported function
    });

    // Load initial content
    await this.loadInitialContent(); // Call class method
  }

  // 6. Event Handlers (call class methods)
  handleVersionChange() {
    const selectedVersionId = this.versionSelector.value;
    const selectedVersion = this.findVersion(selectedVersionId); // Call class method
    if (selectedVersion) {
      this.populateSidebar(selectedVersion.id); // Call class method
      // When version changes, load its default file and populate sidebar
      this.loadContentAndScroll(selectedVersion.id, selectedVersion.defaultFile, null, true).then((result) => {
        // Call class method
        // Update state variables in context after successful load
        if (result.success) {
          this.currentVersionId = result.versionId;
          this.currentFile = result.fileName;
          // Ensure search input is enabled after initial successful load
          this.searchInput.disabled = false;
          this.searchInput.placeholder = "Search...";
        } else {
          // If load failed, update state to reflect no content is loaded
          this.currentFile = null;
          this.currentVersionId = null;
          this.searchInput.disabled = true;
          this.searchInput.placeholder = "Select version first";
        }
      });
    }
  }

  handleHashChange() {
    // Skip initial hash change event if it's the first page load handled by loadInitialContent
    if (this.isInitialLoad) {
      // isInitialLoad will be set to false by loadInitialContent
      return;
    }

    const { versionId, fileName, sectionId } = this.parseHash(); // Call class method

    // Handle invalid/incomplete hash by loading initial content
    if (!versionId || !fileName) {
      this.loadInitialContent(true); // Call class method, force reload
      return;
    }

    // Check if hash version is valid, redirect to default if not
    if (!this.versionExists(versionId)) {
      // Call class method
      console.warn(`Hash version '${versionId}' not found in versions data. Redirecting to default.`);
      this.loadInitialContent(true); // Call class method, force reload
      return;
    }

    // Update version selector and sidebar if version changed via hash
    if (versionId !== this.versionSelector.value) {
      this.versionSelector.value = versionId;
      this.populateSidebar(versionId); // Call class method
    }

    // Determine if content needs a full reload based on version/file change
    const forceReloadContent = versionId !== this.currentVersionId || fileName !== this.currentFile;

    // Load content and scroll
    this.loadContentAndScroll(versionId, fileName, sectionId, forceReloadContent).then((result) => {
      // Call class method
      // Update state variables in context after successful load, based on function return
      if (result.success) {
        this.currentVersionId = result.versionId;
        this.currentFile = result.fileName;
      } else {
        // If load failed, update state to reflect no content is loaded
        this.currentFile = null;
        this.currentVersionId = null;
        this.searchInput.disabled = true;
        this.searchInput.placeholder = "Select version first";
      }
    });
  }

  handleContentAreaClick(event) {
    // Use event delegation to capture clicks on dynamically loaded anchors
    if (!event.target.matches("a.header-anchor")) {
      return;
    }

    event.preventDefault(); // Prevent default browser jump
    const targetHref = event.target.getAttribute("href");
    const sectionId = targetHref ? targetHref.substring(1) : null;

    // If a section ID is found and we are currently viewing a version/file
    if (sectionId && this.currentVersionId && this.currentFile) {
      // Update hash (replaceState) and scroll to the section
      this.updateHash(this.currentVersionId, this.currentFile, sectionId, false); // Call class method
      this.scrollToSection(sectionId); // Call class method
    }
  }

  populateVersionSelector() {
    this.versionSelector.innerHTML = "";
    if (!this.versionsData || !this.versionsData.versions || this.versionsData.versions.length === 0) {
      console.error("Versions data is empty or invalid.");
      this.versionSelector.innerHTML = "<option value=''>No versions</option>";
      this.versionSelector.disabled = true;
      // Other elements might need disabling here too based on loadInitialContent error state
      return;
    }

    for (const version of this.versionsData.versions) {
      const option = document.createElement("option");
      option.value = version.id;
      option.textContent = version.label;
      this.versionSelector.appendChild(option);
    }
    this.versionSelector.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  app.initialize();
});
