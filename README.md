# JMESPath Community Site

Documentation website built from the official JMESPath specification repository with optional local documentation files.

## Build Documentation

### Prerequisites

- Node.js and npm
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jmespath-community/jmespath.site.git
   cd jmespath.site
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Build

```bash
node scripts/build.cjs
```

### Build Options

- `--git-only`: Only clone/update repositories, skip build process
- `--build-only` or `--skip-git`: Only build, skip Git operations
- `--help` or `-h`: Show help

## Configuration

Configure the build process via `config.json`:

- `specRepoUrl`: Git repository URL for JMESPath specification documents
- `versions`: Array of documentation versions to build
  - `id`: Unique version identifier
  - `ref`: Git branch, tag, or commit hash
  - `label`: Human-readable version label
  - `isTag`: Whether `ref` is a Git tag
  - `sourcePath`: Path within spec repository (optional)
  - `includeGlobs`: File patterns to include
  - `excludeGlobs`: File patterns to exclude (optional)
  - `localDocsPath`: Local documentation path (optional)
  - `localIncludeGlobs`: Local file patterns to include (optional)
  - `localExcludeGlobs`: Local file patterns to exclude (optional)
- `defaultVersionId`: Default version when no version specified
- `tempDir`: Temporary build directory (default: `build`)
- `outputDir`: Output directory (default: `docs`)

Generated files are placed in the `docs` directory. Serve locally with `npx http-server docs`.

## Navigation Organization

### JEP Organization

JEPs are organized by status:

- **Accepted JEPs**: `status: accepted` - grouped and sorted by JEP number
- **Draft JEPs**: `status: draft` - grouped separately
- **Obsoleted/Rejected JEPs**: `status: obsoleted` or `status: rejected` - included in search but excluded from navigation

### Navigation Hierarchy

- Pages can reference parents using the `parent` field and `id` field
- Child pages are nested under their parent
- Pages sorted by `nav_order`, then alphabetically by title
- JEPs organized into status sections regardless of parent relationships

## Build System

### Core Modules

- `scripts/lib/constants.js`: Configuration constants and path resolution
- `scripts/lib/utilities.js`: General utility functions and comparators
- `scripts/lib/content-processing.js`: Markdown/HTML processing and JEP metadata extraction
- `scripts/lib/file-operations.js`: File system operations and asset copying
- `scripts/lib/search-index.js`: Search index generation and document mapping
- `scripts/lib/git-operations.js`: Git repository management and checkout
- `scripts/lib/asset-management.js`: JavaScript bundling and static asset processing
- `scripts/lib/version-processing.js`: Version processing orchestration

## Markdown Features

### Front Matter

Standard fields:

- `title`: Page title
- `nav_label`: Navigation menu text
- `nav_order`: Sort order in navigation
- `id`: Unique page identifier for parent/child relationships
- `parent`: Parent page `id` for nesting
- `obsoleted_by`: Mark page as obsoleted
- `status`: Mark as `obsoleted` or `superseded`

JEP-specific fields:

- `jep`: JEP number
- `status`: `accepted`, `draft`, `obsoleted`, or `rejected`
- `author`: JEP author(s)
- `created`: Creation date
- `semver`: Version impact (`MINOR`, `MAJOR`)

Example:

```yaml
---
title: Nested Expressions
jep: 1
author: Michael Dowling
created: 27-Nov-2013
semver: MINOR
status: accepted
---
```

### Custom Heading Anchors

Headings automatically get clickable anchor links.

### Interactive JMESPath Playground

Code blocks with `jmespath-interactive` render as interactive playgrounds:

- Content: JSON input, then `---JMESPATH---`, then JMESPath query
- Options: `expanded` for initially expanded, `[Title]` for custom title

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
