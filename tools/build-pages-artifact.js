const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "_site");
const VERSION = resolveAssetVersion();
const SKIP_NAMES = new Set([
  ".git",
  ".github",
  "_site",
  "tools",
  "legacy",
  "homepage-script-backup.bak"
]);
function resolveAssetVersion() {
  const fallback = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return String(process.env.ASSET_VERSION || process.env.GITHUB_SHA || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .slice(0, 40);
}

function resetOutputDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyTree(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyTree(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function getHtmlFiles(dirPath, files = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      getHtmlFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function versionAssetUrls(content) {
  return content
    .replace(
      /((?:href|src)=["'])(\/style\.css)(?:\?v=[^"']*)?(["'])/g,
      `$1$2?v=${VERSION}$3`
    )
    .replace(
      /((?:href|src)=["'])(\/script\.js)(?:\?v=[^"']*)?(["'])/g,
      `$1$2?v=${VERSION}$3`
    )
    .replace(
      /((?:src)=["'])(((?:\.\.\/)*|\/)?monetization\.js)(?:\?v=[^"']*)?(["'])/g,
      `$1$2?v=${VERSION}$4`
    );
}

function writeBuildMetadata(dirPath) {
  fs.writeFileSync(path.join(dirPath, ".nojekyll"), "", "utf8");
  fs.writeFileSync(path.join(dirPath, "asset-version.txt"), `${VERSION}\n`, "utf8");
}

resetOutputDir(OUTPUT_DIR);
copyTree(ROOT, OUTPUT_DIR);

let updatedFiles = 0;
for (const filePath of getHtmlFiles(OUTPUT_DIR)) {
  const original = fs.readFileSync(filePath, "utf8");
  const updated = versionAssetUrls(original);

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    updatedFiles += 1;
  }
}

writeBuildMetadata(OUTPUT_DIR);

console.log(`Prepared Pages artifact in ${OUTPUT_DIR}`);
console.log(`Asset version: ${VERSION}`);
console.log(`Updated HTML files: ${updatedFiles}`);