const fs = require("node:fs")
const { mkdir, writeFile, readFile, copyFile } = require("node:fs/promises")
const path = require("node:path")
const esbuild = require("esbuild")
const { ASSETS_DIR, BUNDLE_FILE } = require("./constants")
const { generateBuildMetadata } = require("./utilities")

/**
 * Bundles the client-side JavaScript using esbuild.
 */
async function bundleJavaScript(buildContext) {
  console.log("\nBundling client-side JavaScript...")
  const jsEntryPoint = path.join(buildContext.srcDir, "main.js")
  const jsOutFile = path.join(buildContext.outputDir, ASSETS_DIR, BUNDLE_FILE)
  const jsOutDir = path.dirname(jsOutFile)

  try {
    if (fs.existsSync(jsOutDir)) {
      if (!fs.statSync(jsOutDir).isDirectory()) {
        console.error(`--- Error: Output directory path conflicts with an existing file: ${jsOutDir} ---`)
        throw new Error("JS output directory path conflicts with a file.")
      }
    } else {
      await mkdir(jsOutDir, { recursive: true })
    }

    await esbuild.build({
      entryPoints: [jsEntryPoint],
      outfile: jsOutFile,
      bundle: true,
      minify: true,
      sourcemap: true,
      treeShaking: true,
      format: "iife",
      logLevel: "info",
    })
    console.log(`Client-side JS bundled successfully to ${path.relative(buildContext.rootDir, jsOutFile)}`)
  } catch (error) {
    console.error("--- Error during client-side JavaScript bundling or directory setup ---")
    console.error(error)
    throw error
  }
}

/**
 * Processes HTML template and replaces footer with build metadata
 */
async function processHtmlTemplate(sourcePath, destPath, buildMetadata) {
  const htmlContent = await readFile(sourcePath, "utf-8")

  // Generate footer content with build metadata
  const buildDateFormatted = new Date(buildMetadata.buildDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })

  const footerContent = `JMESPath Community Edition Documentation Site | Built ${buildDateFormatted} UTC | Commit ${buildMetadata.commitHash} | ${buildMetadata.buildEnvironment}`

  // Replace the footer content
  const updatedHtml = htmlContent.replace(
    /<footer>Generated Static Documentation Site<\/footer>/,
    `<footer>${footerContent}</footer>`,
  )

  await writeFile(destPath, updatedHtml, "utf-8")
}

/**
 * Copies a single asset file
 */
async function copySingleAsset(asset, buildContext, buildMetadata = null) {
  if (!fs.existsSync(asset.source)) {
    const isOptional = asset.source.endsWith("index.html") || asset.source.endsWith("style.css")
    if (!isOptional) {
      console.warn(`Asset source not found, skipping copy: ${path.relative(buildContext.rootDir, asset.source)}`)
    }
    return
  }

  try {
    await mkdir(path.dirname(asset.dest), { recursive: true })

    // Special handling for index.html to inject build metadata
    if (asset.source.endsWith("index.html") && buildMetadata) {
      await processHtmlTemplate(asset.source, asset.dest, buildMetadata)
      console.log(
        `Processed ${path.relative(buildContext.rootDir, asset.source)} to ${path.relative(buildContext.rootDir, asset.dest)} (with build metadata)`,
      )
    } else {
      await copyFile(asset.source, asset.dest)
      console.log(
        `Copied ${path.relative(buildContext.rootDir, asset.source)} to ${path.relative(buildContext.rootDir, asset.dest)}`,
      )
    }
  } catch (copyError) {
    console.error(`Failed to copy asset ${path.relative(buildContext.rootDir, asset.source)}: ${copyError.message}`)
    throw copyError
  }
}

/**
 * Copies static assets (CSS, HTML, favicons)
 */
async function copyStaticAssets(buildContext) {
  console.log("\nCopying other static assets (CSS, index.html, etc)...")

  // Generate build metadata for HTML template processing
  const buildMetadata = generateBuildMetadata(buildContext.rootDir)
  console.log(`Build metadata: ${buildMetadata.buildEnvironment}, commit ${buildMetadata.commitHash}`)

  const assetFiles = ["style.css", "index.html", "favicon.svg", "favicon-dark.svg"]
  const assetsToCopy = assetFiles.map((file) => ({
    source: path.join(buildContext.srcDir, file),
    dest: path.join(buildContext.outputDir, file),
  }))

  await Promise.all(assetsToCopy.map((asset) => copySingleAsset(asset, buildContext, buildMetadata)))
  console.log("Finished copying other static assets.")
}

module.exports = {
  bundleJavaScript,
  processHtmlTemplate,
  copySingleAsset,
  copyStaticAssets,
}
