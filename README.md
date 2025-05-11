# JMESPath Community Site

This repository contains the source code and build scripts for the JMESPath community documentation website. The site is built by fetching source documentation from the official JMESPath specification repository and optionally including local documentation files.

## How to Build the Documentation

To build the documentation site, you need to have Node.js and Git installed. The build process involves cloning repositories, processing Markdown files, generating search indexes, and bundling assets.

### Prerequisites

- **Node.js**: Make sure you have Node.js (which includes npm) installed. You can download it from [https://nodejs.org/](https://nodejs.org/).
- **Git**: Ensure Git is installed and configured on your system.

### Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/jmespath-community/jmespath.site.git
    cd jmespath.site
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```

### Running the Build

The main build script is located at `scripts/build.cjs`.

To perform a full build (clone/update repositories, process files, generate output), run:

```bash
node scripts/build.cjs
```

### Build Options

The `build.cjs` script accepts command-line arguments to control the build process:

- `--git-only`: Only perform the Git clone/update and checkout steps specified in `config.json`. Skips the rest of the build process (Markdown processing, asset copying, etc.). Useful if you only need to prepare the source files.
- `--build-only` or `--skip-git`: Only perform the build process (Markdown to HTML conversion, search index generation, asset copying). Skips the Git clone/update steps. This is useful if you've already run `--git-only` or manually placed source files in the temporary directory (`build` by default) and want to quickly re-build the site content. **Note:** If you use this option, the source files must already exist in the temporary directory as configured in `config.json`.
- `--help` or `-h`: Display a help message explaining the script usage and options.

**Default Behavior**: If no options are specified, both Git operations and the full build process are executed.

## Configuration (`config.json`)

The site's build process is configured via the `config.json` file at the root of the repository. This file specifies which documentation versions to build, where to find their source files, and various output settings.

Here are the main fields in `config.json`:

- `"specRepoUrl"`: The URL of the Git repository containing the official JMESPath specification documents (usually Markdown files).
- `"versions"`: An array of objects, where each object defines a specific version of the documentation to build. Each version object has the following fields:
  - `"id"`: A unique identifier for this version (e.g., `"current"`, `"1.0"`). This is used in the output URL path.
  - `"ref"`: The Git branch name, tag name, or commit hash in the `specRepoUrl` repository to use for this version.
  - `"label"`: A human-readable label for this version, used in the site navigation (e.g., `"current"`, `"JMESPath v1.0"`).
  - `"isTag"`: A boolean indicating whether the `"ref"` is a Git tag (`true`) or a branch (`false`).
  - `"sourcePath"`: (Optional) A path within the cloned `specRepoUrl` repository where the Markdown source files are located. Defaults to the repository root (`/`).
  - `"includeGlobs"`: An array of glob patterns specifying which files within the resolved `sourcePath` (from `specRepoUrl`) should be included in this version's build.
  - `"excludeGlobs"`: (Optional) An array of glob patterns specifying files within the resolved `sourcePath` to exclude.
  - `"localDocsPath"`: (Optional) A path relative to the root of _this_ repository (`jmespath.site`) where additional local documentation files for this version can be found.
  - `"localIncludeGlobs"`: (Optional) An array of glob patterns for including files within the `localDocsPath`. Defaults to `["**/*.md"]` if `localDocsPath` is specified.
  - `"localExcludeGlobs"`: (Optional) An array of glob patterns for excluding files within the `localDocsPath`.
- `"defaultVersionId"`: The `id` of the version that should be considered the default when the site is loaded without a specific version path.
- `"tempDir"`: The path (relative to the repository root) where source repositories are cloned and intermediate files are stored during the build. Defaults to `"build"`.
- `"outputDir"`: The path (relative to the repository root) where the final static website files are generated. Defaults to `"docs"`.

### Build Output

By default, the generated static website files will be placed in the `docs` directory at the root of the project. This location is configured via the `outputDir` setting in `config.json`.

You can typically serve this `docs` directory using a simple static file server (e.g., `npx http-server docs`) to view the site locally.

## Markdown Features

This site's build process includes custom handling for Markdown files, providing additional features beyond standard Markdown. When writing or editing documentation files, you can utilize the following:

1.  **Front Matter**: Markdown files can start with a YAML front matter block (delimited by `---`). The following keys are recognized:

- `title`: Overrides the page title derived from the first H1 tag.
- `nav_label`: Specifies the text used for this page in the navigation menu (defaults to `title` if not provided).
- `nav_order`: A number used to sort the page in the navigation menu. Pages with a defined `nav_order` appear before those without, sorted numerically. Pages without are sorted alphabetically by `nav_label`/`title`.
- `id`: A unique identifier for this page (e.g., `"intro"`, `"syntax"`). This ID is used to link pages together, particularly for defining parent/child relationships in the navigation. If not provided, the page's relative file path (without the `.md` extension) is used as the ID.
- `parent`: The `id` of another page in the same version. If specified, this page will be nested as a child under the page with the matching `id` in the navigation menu.
- `obsoleted_by`: Marks the page as obsoleted (e.g., by a newer version). Obsoleted pages are excluded from the navigation menu but are still included in the search index (marked as obsoleted).
- `status`: If set to `obsoleted` or `superseded` (case-insensitive), also marks the page as obsoleted, similar to `obsoleted_by`.

  Example front matter:

  ```yaml
  ---
  title: Introduction to JMESPath
  nav_label: Introduction
  nav_order: 1
  ---
  ```

2.  **Custom Heading Anchors**: All standard Markdown headings (`#` to `######`) are processed. The script automatically generates a stable ID based on the heading text and adds a clickable anchor link (`#`) next to the heading that links to that ID.

    Example:

    ```markdown
    # My Page Title

    ## A Section Heading

    ### Another Subsection
    ```

    This will generate HTML similar to:

    ```html
    <h1 id="my-page-title">My Page Title <a href="#my-page-title" class="header-anchor" aria-label="Link to this section">#</a></h1>
    <h2 id="a-section-heading">A Section Heading <a href="#a-section-heading" class="header-anchor" aria-label="Link to this section">#</a></h2>
    <h3 id="another-subsection">Another Subsection <a href="#another-subsection" class="header-anchor" aria-label="Link to this section">#</a></h3>
    ```

3.  **Interactive JMESPath Playground Blocks**: Code blocks with the language identifier `jmespath-interactive` are rendered as interactive playgrounds.

    - The content of the block should contain the initial JSON input, followed by `---JMESPATH---` on a line by itself, and then the initial JMESPath query.
    - The language identifier can include options:
      - `jmespath-interactive expanded`: The playground will be initially expanded.
      - `jmespath-interactive [Your Title Here]`: Sets a custom title for the playground block header.
      - `jmespath-interactive expanded [Your Title Here]`: Sets a custom title and makes it initially expanded.

    Example:

    ````markdown
    ```jmespath-interactive expanded Example Query
    {
      "foo": {"bar": "baz"}
    }
    ---JMESPATH---
    foo.bar
    ```
    ````
