const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const SKIP_DIRS = new Set([".git", "_site", "tools", "legacy", ".chrome-headless", ".chrome-headless-2"]);

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkHtmlFiles(dirPath, files = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(fullPath);
  }
  return files;
}

function sitemapUrls() {
  const xml = readText(SITEMAP_PATH);
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
}

function toLocalPathFromCanonical(url) {
  const rel = url.replace(/^https:\/\/biharresult\.live\//i, "");
  return rel.endsWith("/")
    ? path.join(ROOT, rel, "index.html")
    : path.join(ROOT, rel);
}

function fileExistsForHref(filePath, href) {
  const noHash = href.split("#")[0];
  const clean = noHash.split("?")[0];
  if (!clean) return true;
  if (/^(https?:\/\/|mailto:|tel:|javascript:)/i.test(clean)) return true;

  const resolved = clean.startsWith("/")
    ? path.join(ROOT, clean.replace(/^\/+/, ""))
    : path.resolve(path.dirname(filePath), clean);

  return (
    fs.existsSync(resolved) ||
    fs.existsSync(`${resolved}.html`) ||
    fs.existsSync(path.join(resolved, "index.html"))
  );
}

function collectBrokenInternalLinks(htmlFiles) {
  const broken = [];
  for (const filePath of htmlFiles) {
    const content = readText(filePath);
    for (const match of content.matchAll(/href="([^"]+)"/g)) {
      const href = String(match[1] || "").trim();
      if (!href || href.startsWith("#")) continue;
      if (!fileExistsForHref(filePath, href)) {
        broken.push({
          file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
          href
        });
      }
    }
  }
  return broken;
}

function main() {
  const htmlFiles = walkHtmlFiles(ROOT);
  const urls = sitemapUrls();

  const missingSitemapTargets = [];
  const noindexInSitemap = [];
  urls.forEach((url) => {
    const local = toLocalPathFromCanonical(url);
    if (!fs.existsSync(local)) {
      missingSitemapTargets.push(url);
      return;
    }
    if (local.endsWith(".html")) {
      const content = readText(local);
      if (/<meta\s+name="robots"\s+content="noindex/i.test(content)) {
        noindexInSitemap.push(url);
      }
    }
  });

  const brokenInternalLinks = collectBrokenInternalLinks(htmlFiles);

  const result = {
    sitemapUrlCount: urls.length,
    htmlFileCount: htmlFiles.length,
    missingSitemapTargetsCount: missingSitemapTargets.length,
    noindexInSitemapCount: noindexInSitemap.length,
    brokenInternalLinksCount: brokenInternalLinks.length,
    missingSitemapTargetsSample: missingSitemapTargets.slice(0, 20),
    noindexInSitemapSample: noindexInSitemap.slice(0, 20),
    brokenInternalLinksSample: brokenInternalLinks.slice(0, 50)
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
