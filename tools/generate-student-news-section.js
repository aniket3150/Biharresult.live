const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SOURCE_PATH = path.join(ROOT, "student-news-source.json");
const SECTION_DIR = path.join(ROOT, "sections", "student-news");
const HOME_JSON_PATH = path.join(ROOT, "student-news-home.json");
const LEGACY_PAGE_PATH = path.join(ROOT, "pages", "news", "student-news.html");
const ASSET_VERSION = "20260505";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function repairMojibake(value) {
  const raw = String(value ?? "");
  if (!raw) return "";
  if (!/[à-ÿ]/.test(raw)) return raw;
  try {
    const repaired = Buffer.from(raw, "latin1").toString("utf8");
    if (/[ऀ-ॿ]/.test(repaired) || (/[^\x00-\x7F]/.test(repaired) && !/[à-ÿ]/.test(repaired))) {
      return repaired;
    }
  } catch (error) {
    // no-op fallback
  }
  return raw;
}

function cleanText(value) {
  return repairMojibake(value).replace(/\s+/g, " ").trim();
}

function normalizeSourceItem(item) {
  return {
    ...item,
    slug: cleanText(item?.slug || ""),
    headline: cleanText(item?.headline || ""),
    summary: cleanText(item?.summary || ""),
    category: cleanText(item?.category || ""),
    categoryLabel: cleanText(item?.categoryLabel || ""),
    source: cleanText(item?.source || ""),
    sourceType: cleanText(item?.sourceType || ""),
    relatedPostUrl: cleanText(item?.relatedPostUrl || ""),
    relatedPostLabel: cleanText(item?.relatedPostLabel || ""),
    metaDescription: cleanText(item?.metaDescription || ""),
    keywords: cleanText(item?.keywords || ""),
    details: Array.isArray(item?.details) ? item.details.map((row) => cleanText(row)).filter(Boolean) : []
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).format(parsed);
}

function sortItems(items) {
  return items.slice().sort((left, right) => {
    if (Boolean(right.important) !== Boolean(left.important)) {
      return Number(Boolean(right.important)) - Number(Boolean(left.important));
    }
    return String(right.date).localeCompare(String(left.date));
  });
}

function normalizeIntentKey(item) {
  return cleanText(item.headline || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(2024|2025|2026|2027|today|latest|update|news|official)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHighValueStudentNewsItem(item) {
  const headline = cleanText(item?.headline || "");
  const summary = cleanText(item?.summary || "");
  const details = Array.isArray(item?.details) ? item.details.map((row) => cleanText(row)).filter(Boolean) : [];
  const relatedPostUrl = cleanText(item?.relatedPostUrl || "");
  if (!headline || headline.length < 28) return false;
  if (!summary || summary.length < 80) return false;
  if (!details.length || details.join(" ").length < 180) return false;
  if (!/^\/sections\//i.test(relatedPostUrl)) return false;
  return true;
}

function buildHomeJson(items) {
  return sortItems(items).map((item) => ({
    id: `student-news-${item.slug}`,
    slug: item.slug,
    path: `sections/student-news/${item.slug}.html`,
    title: item.headline,
    category: "Student News",
    department: item.source,
    location: "Bihar, India",
    shortInfo: item.summary,
    longDescription: item.details.join(" "),
    publishedAt: item.date,
    updatedAt: item.date,
    isFeatured: Boolean(item.important),
    sourceName: item.source,
    sourceUrl: item.relatedPostUrl,
    importantDates: [
      { label: "Update Date", value: formatDate(item.date) },
      { label: "Source", value: item.source },
      { label: "Update Type", value: item.sourceType }
    ]
  }));
}

function buildPostHtml(item) {
  const canonical = `https://biharresult.live/sections/student-news/${item.slug}.html`;
  const relatedUrl = `https://biharresult.live${item.relatedPostUrl}`;
  const title = `${item.headline} | Student News | BiharResult.live`;
  const description = item.metaDescription || item.summary;
  const paragraphs = item.details.map((text) => `<p>${escapeHtml(text)}</p>`).join("\n      ");

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0b3ab2" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(item.keywords || "student news, Hinglish student updates, BiharResult.live")}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="BiharResult.live" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://biharresult.live/favicon.png" />
  <meta property="og:image:alt" content="${escapeHtml(item.headline)}" />
  <meta property="og:locale" content="en_IN" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://biharresult.live/favicon.png" />
  <link rel="stylesheet" href="/style.css?v=${ASSET_VERSION}" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        headline: item.headline,
        description,
        datePublished: `${item.date}T05:30:00+05:30`,
        dateModified: `${item.date}T05:30:00+05:30`,
        inLanguage: "en-IN",
        mainEntityOfPage: canonical,
        url: canonical,
        author: {
          "@type": "Organization",
          name: "BiharResult.live Editorial Team"
        },
        publisher: {
          "@type": "Organization",
          name: "BiharResult.live",
          logo: {
            "@type": "ImageObject",
            url: "https://biharresult.live/favicon.png"
          }
        }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://biharresult.live/"
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Student News",
            item: "https://biharresult.live/sections/student-news/"
          },
          {
            "@type": "ListItem",
            position: 3,
            name: item.headline,
            item: canonical
          }
        ]
      }
    ]
  })}</script>
</head>
<body>
  <header class="post-topbar"><div class="br-wrap"><a href="../../index.html" class="post-brand">BiharResult.live</a></div></header>
  <main class="br-wrap br-main-content">
    <article class="br-static-page">
      <p><strong>Student News</strong> | ${escapeHtml(item.categoryLabel)} | ${escapeHtml(formatDate(item.date))}</p>
      <h1>${escapeHtml(item.headline)}</h1>
      <p>${escapeHtml(item.summary)}</p>
      <p><strong>Source:</strong> ${escapeHtml(item.source)} | <strong>Type:</strong> ${escapeHtml(item.sourceType)}</p>
      <h2>Kya Badi Baat Hai?</h2>
      ${paragraphs}
      <h2>Quick Highlights</h2>
      <ul class="br-pro-list">
        <li><strong>Headline Focus:</strong> ${escapeHtml(item.headline)}</li>
        <li><strong>Student Category:</strong> ${escapeHtml(item.categoryLabel)}</li>
        <li><strong>Source Watch:</strong> ${escapeHtml(item.source)}</li>
        <li><strong>Update Date:</strong> ${escapeHtml(formatDate(item.date))}</li>
      </ul>
      <p><a href="${escapeHtml(item.relatedPostUrl)}"><strong>${escapeHtml(item.relatedPostLabel)}</strong></a></p>
      <p><strong>Note:</strong> Final decision lene se pehle hamesha official notice ya detailed related update ko verify karein.</p>
    </article>
    <footer class="br-legal-links" aria-label="Legal Links">
      <a href="../../index.html#student-news">Homepage Student News</a>
      <a href="./index.html">Student News Archive</a>
      <a href="${escapeHtml(item.relatedPostUrl)}">Related Full Update</a>
      <a href="../../pages/legal/contact.html">Contact Us</a>
    </footer>
  </main>
  <script src="/analytics.js" defer></script>
</body>
</html>
`;
}

function buildIndexHtml(items) {
  const canonical = "https://biharresult.live/sections/student-news/";
  const sorted = sortItems(items);
  const importantItems = sorted.filter((item) => item.important).slice(0, 8);
  const archiveItems = sorted.map((item) => (
    `<li><a href="./${escapeHtml(item.slug)}.html">${escapeHtml(item.headline)}</a><br /><small>${escapeHtml(item.categoryLabel)} | Updated: ${escapeHtml(item.date)} | Source: ${escapeHtml(item.source)}</small><br /><small>${escapeHtml(item.summary)}</small></li>`
  )).join("\n");
  const importantList = importantItems.map((item) => (
    `<li><a href="./${escapeHtml(item.slug)}.html">${escapeHtml(item.headline)}</a></li>`
  )).join("\n");

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0b3ab2" />
  <title>Student News Hinglish Updates, Exam Result Job Board Alerts | BiharResult.live</title>
  <meta name="description" content="Read Student News Hinglish updates on BiharResult.live. Check result, jobs, admit card, board, scholarship, university and exam-date alerts in easy student language." />
  <meta name="keywords" content="student news Hinglish, exam news Hinglish, result update student news, admit card Hinglish, BiharResult student news" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="BiharResult.live" />
  <meta property="og:title" content="Student News Hinglish Updates | BiharResult.live" />
  <meta property="og:description" content="Simple Hinglish student updates for result, jobs, admit card, board notice, scholarship, admission and university news." />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="https://biharresult.live/favicon.png" />
  <meta property="og:image:alt" content="Student News archive on BiharResult.live" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Student News Hinglish Updates | BiharResult.live" />
  <meta name="twitter:description" content="Read result, jobs, admit card, board and university student updates in clear Hinglish." />
  <meta name="twitter:image" content="https://biharresult.live/favicon.png" />
  <link rel="stylesheet" href="/style.css?v=${ASSET_VERSION}" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Student News Hinglish Updates",
        description: "Simple Hinglish student updates for result, jobs, admit card, board notice, scholarship, admission and university news.",
        url: canonical,
        inLanguage: "en-IN",
        isPartOf: {
          "@type": "WebSite",
          name: "BiharResult.live",
          url: "https://biharresult.live/"
        },
        mainEntity: {
          "@type": "ItemList",
          name: "Student News Archive",
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: sorted.length,
          itemListElement: sorted.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `https://biharresult.live/sections/student-news/${item.slug}.html`,
            name: item.headline
          }))
        }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://biharresult.live/"
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Student News",
            item: canonical
          }
        ]
      }
    ]
  })}</script>
</head>
<body>
  <header class="post-topbar"><div class="br-wrap"><a href="../../index.html" class="post-brand">BiharResult.live</a></div></header>
  <main class="br-wrap br-main-content">
    <article class="br-static-page">
      <h1>Student News Hinglish Updates</h1>
      <p>Yeh section un students ke liye banaya gaya hai jo result, jobs, admit card, board notice, scholarship, admission aur university updates ko easy Hinglish me jaldi samajhna chahte hain.</p>
      <p>Har post short, clear aur student-friendly style me likha gaya hai. Total archive posts: <strong>${sorted.length}</strong></p>
      <h2>Aaj Ke Important Headlines</h2>
      <ul class="br-pro-list">
${importantList}
      </ul>
      <h2>All Student News Posts</h2>
      <ul class="br-pro-list">
${archiveItems}
      </ul>
    </article>
    <footer class="br-legal-links" aria-label="Legal Links">
      <a href="../../index.html#student-news">Homepage Student News</a>
      <a href="../../sections/latest-results/">Latest Results</a>
      <a href="../../sections/latest-jobs/">Latest Jobs</a>
      <a href="../../sections/admit-card/">Admit Card</a>
      <a href="../../pages/legal/privacy-policy.html">Privacy Policy</a>
    </footer>
  </main>
  <script src="/analytics.js" defer></script>
</body>
</html>
`;
}

function buildLegacyRedirect() {
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Student News Redirect | BiharResult.live</title>
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="https://biharresult.live/sections/student-news/" />
  <meta http-equiv="refresh" content="0; url=/sections/student-news/" />
  <script>window.location.replace("/sections/student-news/");</script>
</head>
<body>
  <h1>Student News Redirect - BiharResult.live</h1>
  <p>This legacy URL now points to the main Student News archive for Bihar student updates.</p>
  <p><a href="/sections/student-news/">Open Student News</a></p>
</body>
</html>
`;
}

function main() {
  const rawItems = readJson(SOURCE_PATH);
  const normalized = rawItems.map(normalizeSourceItem);
  const seenSlug = new Set();
  const seenIntent = new Set();
  const items = normalized.filter((item) => {
    if (!isHighValueStudentNewsItem(item)) return false;
    const slug = cleanText(item.slug || "");
    if (!slug || seenSlug.has(slug)) return false;
    seenSlug.add(slug);
    const intent = normalizeIntentKey(item);
    if (intent && seenIntent.has(intent)) return false;
    if (intent) seenIntent.add(intent);
    return true;
  });
  ensureDir(SECTION_DIR);
  ensureDir(path.dirname(LEGACY_PAGE_PATH));

  for (const item of items) {
    const filePath = path.join(SECTION_DIR, `${item.slug}.html`);
    fs.writeFileSync(filePath, buildPostHtml(item), "utf8");
  }

  const homeJson = buildHomeJson(items);
  fs.writeFileSync(HOME_JSON_PATH, `${JSON.stringify(homeJson, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(SECTION_DIR, "posts.json"), `${JSON.stringify(homeJson, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(SECTION_DIR, "index.html"), buildIndexHtml(items), "utf8");
  fs.writeFileSync(LEGACY_PAGE_PATH, buildLegacyRedirect(), "utf8");

  console.log(JSON.stringify({
    section: "student-news",
    sourceCount: rawItems.length,
    postCount: items.length,
    homeJsonCount: homeJson.length,
    indexPath: path.relative(ROOT, path.join(SECTION_DIR, "index.html")).replace(/\\/g, "/")
  }, null, 2));
}

main();
