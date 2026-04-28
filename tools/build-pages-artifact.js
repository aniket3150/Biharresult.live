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

function getFiles(dirPath, extension, files = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      getFiles(fullPath, extension, files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function minifyCss(content) {
  return String(content)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

function minifyInlineAssets(content) {
  return String(content)
    .replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => `<style>${minifyCss(css)}</style>`)
    .replace(/<script([^>]*)type="application\/ld\+json"([^>]*)>([\s\S]*?)<\/script>/g, (match, before, after, body) => {
      try {
        return `<script${before}type="application/ld+json"${after}>${JSON.stringify(JSON.parse(body))}</script>`;
      } catch (error) {
        return match;
      }
    });
}

function stripHeadAnalytics(content) {
  return String(content)
    .replace(/\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<\/head>/i, "\n</head>")
    .replace(/\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-YVN84V93Z6"><\/script>\s*<script>[\s\S]*?<\/script>/i, "");
}

function injectAnalyticsLoader(content) {
  if (/analytics\.js/i.test(content)) return content;
  const tag = `  <script src="/analytics.js?v=${VERSION}" defer></script>\n`;
  if (/<\/body>/i.test(content)) {
    return content.replace(/<\/body>/i, `${tag}</body>`);
  }
  return content.replace(/<\/head>/i, `</head>\n${tag}`);
}

function normalizeIconMarkup(content) {
  return String(content).replace(
    /<link rel="icon" type="image\/png" href="\/favicon\.png" ?\/>\s*<link rel="shortcut icon" type="image\/png" href="\/favicon\.png" ?\/>\s*<link rel="apple-touch-icon" sizes="180x180" href="\/favicon\.png" ?\/>/gi,
    '<link rel="icon" href="/favicon.ico" sizes="any" />\n  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />'
  );
}

function optimizeScriptContent(content) {
  return String(content).replace(
    /const MANUAL_PRIORITY_POSTS = \[[\s\S]*?\];\s*const MANUAL_PRIORITY_SLUGS = new Set\(MANUAL_PRIORITY_POSTS\.map\(\(post\) => post\.slug\)\);/m,
    'const MANUAL_PRIORITY_POSTS = [];\nconst MANUAL_PRIORITY_SLUGS = new Set();'
  );
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
    )
    .replace(
      /((?:src)=["'])(\/analytics\.js)(?:\?v=[^"']*)?(["'])/g,
      `$1$2?v=${VERSION}$3`
    )
    .replace(
      /((?:src)=["'])(\/post-legacy\.js)(?:\?v=[^"']*)?(["'])/g,
      `$1$2?v=${VERSION}$3`
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
  const updated = injectAnalyticsLoader(
    versionAssetUrls(
      minifyInlineAssets(
        normalizeIconMarkup(
          stripHeadAnalytics(original)
        )
      )
    )
  );

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
    updatedFiles += 1;
  }
}

for (const filePath of getFiles(OUTPUT_DIR, ".css")) {
  const original = fs.readFileSync(filePath, "utf8");
  const updated = minifyCss(original);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
}

for (const filePath of getFiles(OUTPUT_DIR, ".json")) {
  const original = fs.readFileSync(filePath, "utf8");
  try {
    const updated = JSON.stringify(JSON.parse(original));
    if (updated !== original) {
      fs.writeFileSync(filePath, updated, "utf8");
    }
  } catch (error) {
    // keep original file if it is not valid JSON
  }
}

for (const jsFile of ["script.js", "post-legacy.js", "analytics.js"]) {
  const filePath = path.join(OUTPUT_DIR, jsFile);
  if (!fs.existsSync(filePath)) continue;
  const original = fs.readFileSync(filePath, "utf8");
  const updated = jsFile === "script.js" ? optimizeScriptContent(original) : original.trim();
  if (updated !== original) {
    fs.writeFileSync(filePath, `${updated}\n`, "utf8");
  }
}

writeBuildMetadata(OUTPUT_DIR);

console.log(`Prepared Pages artifact in ${OUTPUT_DIR}`);
console.log(`Asset version: ${VERSION}`);
console.log(`Updated HTML files: ${updatedFiles}`);
