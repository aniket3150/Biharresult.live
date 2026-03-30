const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, "_site");
const SOURCE_SKIP_DIRS = new Set([".git", ".github", "_site", "tools", "legacy"]);
const BUILD_SKIP_DIRS = new Set();
const REQUIRED_ROOT_FILES = [
  "index.html",
  "post.html",
  "script.js",
  "style.css",
  "data.json",
  "robots.txt",
  "sitemap.xml"
];

function walk(dir, skipDirs, visitor) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, skipDirs, visitor);
      continue;
    }

    visitor(fullPath, entry);
  }
}

function listFiles(baseDir, extension, skipDirs) {
  const files = [];
  walk(baseDir, skipDirs, (fullPath, entry) => {
    if (entry.isFile() && fullPath.endsWith(extension)) {
      files.push(fullPath);
    }
  });
  return files;
}

function isInternalRef(value) {
  return Boolean(
    value &&
      !value.startsWith("http://") &&
      !value.startsWith("https://") &&
      !value.startsWith("//") &&
      !value.startsWith("mailto:") &&
      !value.startsWith("tel:") &&
      !value.startsWith("javascript:") &&
      !value.startsWith("#")
  );
}

function checkRequiredFiles(baseDir) {
  const missing = [];
  for (const file of REQUIRED_ROOT_FILES) {
    if (!fs.existsSync(path.join(baseDir, file))) {
      missing.push(file);
    }
  }
  return missing;
}

function checkJsonFiles(baseDir, skipDirs) {
  const files = listFiles(baseDir, ".json", skipDirs);
  const issues = [];

  for (const file of files) {
    const relPath = path.relative(baseDir, file).replace(/\\/g, "/");
    try {
      JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      issues.push({ file: relPath, error: error.message });
    }
  }

  return { count: files.length, issues };
}

function checkHtmlRefs(baseDir, skipDirs) {
  const files = listFiles(baseDir, ".html", skipDirs);
  const issues = [];
  const attrRegex = /(?:href|src)=["']([^"']+)["']/gi;

  for (const file of files) {
    const relFile = path.relative(baseDir, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    let match;

    while ((match = attrRegex.exec(content))) {
      const raw = match[1].trim();
      if (!isInternalRef(raw)) continue;

      const clean = raw.split("#")[0].split("?")[0];
      if (!clean) continue;

      const target = clean.startsWith("/")
        ? path.join(baseDir, clean.slice(1))
        : path.resolve(path.dirname(file), clean);

      if (!fs.existsSync(target)) {
        issues.push({
          file: relFile,
          ref: raw,
          missing: path.relative(baseDir, target).replace(/\\/g, "/")
        });
      }
    }
  }

  return { count: files.length, issues };
}

function summarize(baseDir, skipDirs, label) {
  const requiredMissing = checkRequiredFiles(baseDir);
  const json = checkJsonFiles(baseDir, skipDirs);
  const html = checkHtmlRefs(baseDir, skipDirs);
  return {
    label,
    requiredMissing,
    jsonFileCount: json.count,
    htmlFileCount: html.count,
    jsonIssues: json.issues,
    htmlIssues: html.issues
  };
}

const results = [summarize(ROOT, SOURCE_SKIP_DIRS, "source")];
if (fs.existsSync(BUILD_DIR)) {
  results.push(summarize(BUILD_DIR, BUILD_SKIP_DIRS, "build"));
}

const totalIssues = results.reduce(
  (sum, item) => sum + item.requiredMissing.length + item.jsonIssues.length + item.htmlIssues.length,
  0
);

const output = {
  ok: totalIssues === 0,
  checkedBuild: fs.existsSync(BUILD_DIR),
  results: results.map((item) => ({
    label: item.label,
    requiredMissing: item.requiredMissing,
    jsonFileCount: item.jsonFileCount,
    htmlFileCount: item.htmlFileCount,
    jsonIssueCount: item.jsonIssues.length,
    htmlIssueCount: item.htmlIssues.length,
    sampleJsonIssues: item.jsonIssues.slice(0, 20),
    sampleHtmlIssues: item.htmlIssues.slice(0, 50)
  }))
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
