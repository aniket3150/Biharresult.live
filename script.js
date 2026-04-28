const HOME_ASSET_VERSION = resolveHomeAssetVersion();
const HOME_DATA_FILE = withHomeAssetVersion("home-data.json");
const HOME_TOOLS_DATA_FILE = withHomeAssetVersion("home-tools-data.json");
const MAX_COLLAPSED_HEIGHT_CLASS = "br-list-expanded";
const HOME_SECTION_INITIAL_VISIBLE = 12;
const HOME_SEARCH_DEBOUNCE_MS = 120;
const MANUAL_PRIORITY_POSTS = [];
const MANUAL_PRIORITY_SLUGS = new Set();

const HOME_MAP = {
  "Latest Results": "results-list",
  "Latest Jobs": "jobs-list",
  "Admit Card": "admit-list",
  "Scholarship": "scholarship-list",
  "Sarkari Yojana": "yojana-list"
};
const HOME_EXCLUDED_CATEGORIES = new Set(["Verification"]);
let HOME_SECTIONS = [];
const HOME_PRIORITY_SLUG_ORDER = [
  "nta-cuet-pg-result-2026-declaration-update",
  "nta-jee-main-paper-1-result-2026-session1-2-update",
  "nta-nchm-jee-admit-card-2026-update",
  "upsc-nda-na-2-2026-forthcoming-exam-update",
  "ibps-po-mt-xvi-2026-27-exam-calendar",
  "tnpsc-group-1-notification-date-2026-planner",
  "jkpsc-lecturer-botany-provisional-selection-list-april-2026",
  "nta-ntet-admit-card-2026-update",
  "upsc-cbi-dsp-ldce-forthcoming-exam-2026",
  "tnpsc-group-4-physical-certificate-verification-counselling-2026",
  "sbi-lead-business-analyst-recruitment-2026",
  "upsc-civil-services-prelims-2026-active-update",
  "jee-main-session-2-admit-card-2026-april",
  "jee-main-session-2-score-card-2026",
  "karnataka-sslc-exam-1-result-2026",
  "neet-ug-2026-application-correction-extension-update",
  "ibps-crp-calendar-2026-27-update",
  "cuet-ug-2026-registration-reopening-update",
  "btsc-iti-instructor-recruitment-2026-advt-14-23",
  "csbc-constable-operator-online-form-2026",
  "csbc-driver-constable-pet-e-admit-card-2026",
  "bceceb-junior-resident-revised-eligible-list-2026",
  "bseb-intermediate-special-compartment-scrutiny-2026",
  "bceceb-senior-resident-tutor-online-form-2026",
  "csbc-special-branch-constable-online-form-2026",
  "csbc-driver-constable-written-result-2025-26"
];

function setTodayDate() {
  const dateElement = document.getElementById("br-date");
  if (!dateElement) return;
  const dateObj = new Date();
  const options = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
  dateElement.textContent = dateObj.toLocaleDateString("en-US", options);
}

function formatDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const simpleDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dt = simpleDateMatch
    ? new Date(`${simpleDateMatch[1]}-${simpleDateMatch[2]}-${simpleDateMatch[3]}T00:00:00+05:30`)
    : new Date(raw);
  if (Number.isNaN(dt.getTime())) return value || "";
  return dt.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function cleanSnippet(text) {
  if (!text) return "";
  return String(text)
    .replace(/Author:\s*[^.|\n]+/gi, "")
    .replace(/Tag:\s*[^.|\n]+/gi, "")
    .replace(/\s*Read more\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function trimForMeta(text, max = 158) {
  const plain = String(text || "").replace(/\s+/g, " ").trim();
  if (!plain) return "";
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  const safe = cut.includes(" ") ? cut.slice(0, cut.lastIndexOf(" ")) : cut;
  return `${safe.trim()}...`;
}

function runWhenBrowserIdle(callback, timeout = 1200) {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(callback, { timeout });
  }
  return window.setTimeout(callback, 1);
}

function yieldToMainThread() {
  return new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
      return;
    }
    window.setTimeout(resolve, 0);
  });
}

function debounce(fn, wait = 100) {
  let timerId = null;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => fn(...args), wait);
  };
}

function buildSeoDescription(post) {
  const title = String(post.title || "Latest update").trim();
  const category = String(post.category || "Sarkari update").trim();
  const department = cleanSnippet(post.department || "");
  const actionByCategory = {
    "Latest Results": "Check result status, cut off, official result links, and fast result updates",
    "Latest Jobs": "Check eligibility, vacancy, dates, and apply link",
    "Admit Card": "Check exam date, shift details, and admit card download link",
    Scholarship: "Check eligibility, required documents, and apply process",
    Admission: "Check admission dates, eligibility, and application steps",
    "Sarkari Yojana": "Check beneficiary rules, documents, and official apply process",
    Verification: "Check document status, verification process, and official links"
  };
  const keywordTailByCategory = {
    "Latest Results": "Useful for Sarkari Result India, board and exam score updates, and official result-link searches.",
    "Latest Jobs": "Useful for all India online form, vacancy, and Sarkari Naukri job searches.",
    "Admit Card": "Useful for admit card download, exam city updates, and hall ticket searches across India."
  };

  const actionText = actionByCategory[category] || "Check important dates, eligibility, and official links";
  const keywordTail = keywordTailByCategory[category] || "Fast and reliable all India student update on BiharResult.live.";
  const keyLine = cleanSnippet(findLastDate(post));
  const template = `${title}: ${actionText}. ${department ? `${department} official update. ` : ""}${keyLine ? `Key detail: ${keyLine}. ` : ""}${keywordTail}`;
  return trimForMeta(template, 158);
}

async function loadData() {
  try {
    const response = await fetch(HOME_DATA_FILE, { cache: "default" });
    if (!response.ok) {
      throw new Error(`Failed to load home-data.json (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[BiharResult.live] Failed to load homepage data.", error);
    return [];
  }
}

async function loadHomeToolsData() {
  try {
    const response = await fetch(HOME_TOOLS_DATA_FILE, { cache: "default" });
    if (!response.ok) {
      throw new Error(`Failed to load home-tools-data.json (${response.status})`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[BiharResult.live] Failed to load homepage tools data.", error);
    return [];
  }
}

async function runSafeHomeStep(stepName, handler) {
  try {
    return await handler();
  } catch (error) {
    console.error(`[BiharResult.live] Home step failed: ${stepName}`, error);
    return null;
  }
}

function mergeManualPriorityPosts(posts) {
  const basePosts = Array.isArray(posts) ? posts : [];
  return basePosts;
}

function byDate(a, b) {
  return new Date(b.publishedAt) - new Date(a.publishedAt);
}

function byFeaturedThenDate(a, b) {
  const featuredDiff = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
  if (featuredDiff !== 0) return featuredDiff;
  return byDate(a, b);
}

function byHomePriorityThenDate(a, b, category = "") {
  const rankA = HOME_PRIORITY_SLUG_ORDER.indexOf(String(a?.slug || ""));
  const rankB = HOME_PRIORITY_SLUG_ORDER.indexOf(String(b?.slug || ""));
  const safeRankA = rankA === -1 ? Number.MAX_SAFE_INTEGER : rankA;
  const safeRankB = rankB === -1 ? Number.MAX_SAFE_INTEGER : rankB;
  if (safeRankA !== safeRankB) return safeRankA - safeRankB;
  return category === "Latest Results" ? byFeaturedThenDate(a, b) : byDate(a, b);
}

function sanitizeUrl(url) {
  if (!url) return "#";
  const value = String(url).trim();
  if (!value) return "#";
  const lower = value.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
  if (value.startsWith("#") || value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return value;
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value)) return value;
  return "#";
}

function toAbsoluteSiteUrl(url) {
  const safeUrl = sanitizeUrl(url);
  if (safeUrl === "#") return "https://biharresult.live/";
  try {
    return new URL(safeUrl, window.location.origin).toString();
  } catch (error) {
    return "https://biharresult.live/";
  }
}

function isUsableUrl(url) {
  return sanitizeUrl(url) !== "#";
}

function isCriticalActionLabel(label) {
  return /apply|download|notification|official|check result|view notice/i.test(String(label || ""));
}

function fillSimpleList(container, items) {
  if (!container) return;
  container.textContent = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function hardenExternalLinks(scope = document) {
  scope.querySelectorAll('a[target="_blank"]').forEach((anchor) => {
    const rel = (anchor.getAttribute("rel") || "")
      .split(/\s+/)
      .filter(Boolean);
    if (!rel.includes("noopener")) rel.push("noopener");
    if (!rel.includes("noreferrer")) rel.push("noreferrer");
    anchor.setAttribute("rel", rel.join(" "));
  });
}

function normalizeHashValue(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function setPrimaryNavCurrentState(links) {
  if (!Array.isArray(links) || !links.length) return;

  const currentHash = normalizeHashValue(window.location.hash);
  links.forEach((link) => {
    const href = String(link.getAttribute("href") || "").trim();
    const hashIndex = href.indexOf("#");
    const linkHash = hashIndex >= 0 ? normalizeHashValue(href.slice(hashIndex)) : "";
    const isHomeLink = /^(?:\.\/)?(?:index\.html)?$/i.test(href) || href === "/";
    const isCurrent = currentHash ? Boolean(linkHash && linkHash === currentHash) : isHomeLink;

    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function initPrimaryNavigation() {
  const navRoot = document.getElementById("site-primary-navigation") || document.querySelector(".br-nav-wrapper");
  if (!navRoot) return;

  const navLinks = Array.from(navRoot.querySelectorAll(".br-nav-menu a[href]"));
  if (!navLinks.length) return;

  setPrimaryNavCurrentState(navLinks);
  window.addEventListener("hashchange", () => {
    setPrimaryNavCurrentState(navLinks);
  }, { passive: true });

  navLinks.forEach((link) => {
    const href = String(link.getAttribute("href") || "").trim();
    if (!href.startsWith("#")) return;

    const targetId = href.slice(1);
    if (!targetId) return;

    link.addEventListener("click", (event) => {
      const target = document.getElementById(targetId);
      if (!target) return;

      event.preventDefault();
      const prefersReducedMotion = window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });

      window.history.replaceState(null, "", `#${targetId}`);
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
      setPrimaryNavCurrentState(navLinks);
    });
  });
}

function postHref(post) {
  const sectionMap = {
    "Latest Results": "latest-results",
    "Latest Jobs": "latest-jobs",
    "Admit Card": "admit-card",
    "Scholarship": "scholarship",
    "Sarkari Yojana": "sarkari-yojana",
    "Admission": "admission",
    "Verification": "verification"
  };
  const folder = sectionMap[post.category];

  if (post?.path && isUsableUrl(post.path)) {
    if (
      folder &&
      post?.slug &&
      /(?:^|\/)post\.html(?:\?|$)/i.test(String(post.path || ""))
    ) {
      return `sections/${folder}/${encodeURIComponent(post.slug)}.html`;
    }
    return sanitizeUrl(post.path);
  }

  if (folder) return `sections/${folder}/${encodeURIComponent(post.slug)}.html`;
  return `post.html?slug=${encodeURIComponent(post.slug)}`;
}

function sectionHrefByCategory(category) {
  const sectionMap = {
    "Latest Results": "sections/latest-results/",
    "Latest Jobs": "sections/latest-jobs/",
    "Admit Card": "sections/admit-card/",
    Scholarship: "sections/scholarship/",
    Admission: "sections/admission/",
    "Sarkari Yojana": "sections/sarkari-yojana/",
    Verification: "sections/verification/"
  };
  return sectionMap[category] || "";
}

function toIsoDateOrEmpty(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

function buildHomeSchemaPosts(posts) {
  const input = Array.isArray(posts) ? posts : [];
  if (!input.length) return [];

  const categoryOrder = [
    "Latest Results",
    "Latest Jobs",
    "Admit Card",
    "Scholarship",
    "Admission",
    "Sarkari Yojana",
    "Verification"
  ];

  const dedupe = new Set();
  const selected = [];
  const maxPerCategory = 3;
  const maxTotal = 21;

  categoryOrder.forEach((category) => {
    const rows = input
      .filter((post) => post?.category === category && String(post?.title || "").trim())
      .sort(byDate)
      .slice(0, maxPerCategory);
    rows.forEach((post) => {
      const key = post.slug || `${category}-${post.title}`;
      if (dedupe.has(key) || selected.length >= maxTotal) return;
      dedupe.add(key);
      selected.push(post);
    });
  });

  if (selected.length >= maxTotal) return selected;

  input
    .filter((post) => String(post?.title || "").trim())
    .sort(byDate)
    .forEach((post) => {
      const key = post.slug || `${post.category || "misc"}-${post.title}`;
      if (dedupe.has(key) || selected.length >= maxTotal) return;
      dedupe.add(key);
      selected.push(post);
    });

  return selected;
}

function setHomeDynamicSchema(posts) {
  const schemaScript = document.getElementById("home-dynamic-schema");
  if (!schemaScript) return;

  const topPosts = buildHomeSchemaPosts(posts);
  if (!topPosts.length) return;

  const websiteUrl = "https://biharresult.live/";
  const metaDescription = cleanSnippet(
    document.querySelector('meta[name="description"]')?.getAttribute("content") || ""
  );

  const listItems = topPosts.map((post, index) => {
    const absoluteUrl = toAbsoluteSiteUrl(postHref(post));
    const datePublished = toIsoDateOrEmpty(post.publishedAt);
    const dateModified = toIsoDateOrEmpty(post.updatedAt || post.publishedAt);

    const item = {
      "@type": "WebPage",
      name: post.title,
      url: absoluteUrl
    };
    if (datePublished) item.datePublished = datePublished;
    if (dateModified) item.dateModified = dateModified;

    return {
      "@type": "ListItem",
      position: index + 1,
      name: post.title,
      url: absoluteUrl,
      item
    };
  });

  const latestDate = topPosts
    .map((post) => toIsoDateOrEmpty(post.updatedAt || post.publishedAt))
    .filter(Boolean)
    .sort()
    .pop();

  const payload = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "BiharResult.live Latest Updates",
    url: websiteUrl,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      name: "BiharResult.live",
      url: websiteUrl
    },
    about: [
      "Latest Results",
      "Latest Jobs",
      "Admit Card",
      "Scholarship",
      "Admission",
      "Sarkari Yojana",
      "Verification Services"
    ],
    mainEntity: {
      "@type": "ItemList",
      name: "Latest Posts on BiharResult.live",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: listItems.length,
      itemListElement: listItems
    }
  };

  if (metaDescription) payload.description = metaDescription;
  if (latestDate) payload.dateModified = latestDate;
  schemaScript.textContent = JSON.stringify(payload);
}

function formatHomeListTitle(post) {
  const title = String(post?.title || "").trim();
  if (!title) return "";

  if (post.category === "Admission") {
    const notice = title.match(/notice\s*\d+/i);
    const year = title.match(/20\d{2}/);
    if (notice) {
      const noticeText = notice[0].replace(/\s+/g, " ").replace(/^notice/i, "Notice");
      const yearText = year ? year[0] : "";
      return yearText
        ? `Bihar Admission ${yearText} Form - ${noticeText} (Apply/Details)`
        : `Bihar Admission Form - ${noticeText} (Apply/Details)`;
    }
  }

  return title;
}

function createListItem(post, options = {}) {
  const showSnippet = Boolean(options.showSnippet);
  const showMeta = Boolean(options.showMeta);
  const isPriorityFlash = Boolean(options.isPriorityFlash);
  const listTitle = formatHomeListTitle(post);
  const li = document.createElement("li");
  li.className = "br-item";
  li.dataset.searchText = `${listTitle} ${cleanSnippet(post.shortInfo || post.longDescription || "")} ${post.category || ""}`.toLowerCase();
  li.dataset.filterMatch = "1";

  const body = document.createElement("div");
  body.className = "br-item-body";

  const a = document.createElement("a");
  a.className = "br-link";
  a.href = postHref(post);
  a.textContent = listTitle;
  body.appendChild(a);

  if (showMeta) {
    const meta = document.createElement("div");
    meta.className = "br-item-meta";
    const metaParts = [];
    if (post.category) metaParts.push(post.category);
    if (metaParts.length) {
      meta.textContent = metaParts.join(" | ");
      body.appendChild(meta);
    }
  }

  if (showSnippet) {
    const desc = document.createElement("p");
    desc.className = "br-item-desc";
    const sourceText = cleanSnippet(post.shortInfo || post.longDescription || "");
    const compact = sourceText.length > 155 ? `${sourceText.slice(0, 152)}...` : sourceText;
    desc.textContent = compact || "Check full result notice, score details and download link.";
    body.appendChild(desc);
  }
  li.appendChild(body);

  if (isPriorityFlash) {
    const tags = document.createElement("div");
    tags.className = "br-item-tags";
    const tag = document.createElement("span");
    tag.className = "br-item-badge br-item-badge-new";
    tag.textContent = "\uD83C\uDD95 NEW";
    tags.appendChild(tag);
    body.appendChild(tags);
  }
  return li;
}

const MANUAL_TICKER_FILE = withHomeAssetVersion("./ticker-items.html");
const MANUAL_HIGHLIGHTS_FILE = withHomeAssetVersion("./priority-updates-items.html");
let manualTickerItemsCache = null;

function resolveHomeAssetVersion() {
  const selectors = [
    'script[src*="script.js"]',
    'script[src*="monetization.js"]',
    'link[href*="style.css"]'
  ];

  for (const selector of selectors) {
    const asset = document.querySelector(selector);
    const assetUrl = asset ? asset.getAttribute("src") || asset.getAttribute("href") : "";
    if (!assetUrl) continue;

    try {
      const version = new URL(assetUrl, window.location.href).searchParams.get("v");
      if (version) return version;
    } catch (error) {
      continue;
    }
  }

  return "";
}

function withHomeAssetVersion(url) {
  if (!HOME_ASSET_VERSION) return url;

  try {
    const [baseUrl, hash = ""] = url.split("#");
    const [path, query = ""] = baseUrl.split("?");
    const params = new URLSearchParams(query);
    params.set("v", HOME_ASSET_VERSION);
    const versionedUrl = `${path}?${params.toString()}`;
    return hash ? `${versionedUrl}#${hash}` : versionedUrl;
  } catch (error) {
    return url;
  }
}
let manualHighlightItemsCache = null;

function buildFallbackTickerItems(posts) {
  const sorted = [...posts].sort(byDate);
  const trePost = sorted.find((post) => /tre\s*4\.?0|\btre\b/i.test(post.title || ""));
  const rrbGroupDPost = sorted.find((post) => /railway\s*rrb\s*group\s*d|rrb\s*group\s*d/i.test(post.title || ""));

  const top = [];
  if (trePost) top.push(trePost);
  if (rrbGroupDPost && rrbGroupDPost.slug !== trePost?.slug) top.push(rrbGroupDPost);
  if (top.length === 0) top.push(...sorted.slice(0, 2));

  return top
    .filter(Boolean)
    .map((post) => ({
      href: postHref(post),
      text: post.title
    }));
}

function formatUrgentTickerText(title) {
  const safeTitle = String(title || "").trim().replace(/\s+/g, " ");
  if (!safeTitle) return "";
  const urgentEmoji = /\(out\)|\bout\b/i.test(safeTitle) ? "\uD83D\uDD25" : "\uD83D\uDEA8";
  return `${urgentEmoji} ${safeTitle}`;
}

function buildImportantTickerItems(posts) {
  const latestUpdates = [...posts]
    .filter((post) => post.category === "Latest Results")
    .sort(byDate)
    .slice(0, 3);

  if (!latestUpdates.length) return [];

  return latestUpdates.map((post) => ({
    href: postHref(post),
    text: formatUrgentTickerText(post.title)
  }));
}

async function loadManualTickerItems() {
  try {
    const response = await fetch(MANUAL_TICKER_FILE, { cache: "default" });
    if (!response.ok) return [];

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("[data-ticker-item]"));

    return links
      .map((link) => {
        const text = (link.textContent || "").trim().replace(/\s+/g, " ");
        if (!text) return null;
        const href = (link.getAttribute("href") || "").trim() || "#";
        return { href, text };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadManualHighlightItems() {
  try {
    const response = await fetch(MANUAL_HIGHLIGHTS_FILE, { cache: "default" });
    if (!response.ok) return [];

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = Array.from(doc.querySelectorAll("[data-highlight-item]"));

    return items
      .map((item) => {
        const href = (item.getAttribute("href") || "").trim() || "#";
        const category = (item.getAttribute("data-category") || "Update").trim();
        const title = ((item.getAttribute("data-title") || item.textContent || "").trim()).replace(/\s+/g, " ");
        const meta = ((item.getAttribute("data-meta") || "").trim()).replace(/\s+/g, " ");
        const colorClass = (item.getAttribute("data-color") || "").trim();
        const isHot = /^(1|true|yes)$/i.test((item.getAttribute("data-hot") || "").trim());
        if (!title) return null;
        return { href, category, title, meta, colorClass, isHot };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function ensureManualHighlightItemsLoaded() {
  if (manualHighlightItemsCache !== null) return;
  manualHighlightItemsCache = await loadManualHighlightItems();
}

async function ensureManualTickerItemsLoaded() {
  if (manualTickerItemsCache !== null) return;
  manualTickerItemsCache = await loadManualTickerItems();
}

async function renderTicker(posts) {
  const track = document.getElementById("br-ticker-track");
  if (!track) return;
  const manualItems = Array.isArray(manualTickerItemsCache) ? manualTickerItemsCache : await loadManualTickerItems();
  if (!Array.isArray(manualTickerItemsCache)) {
    manualTickerItemsCache = manualItems;
  }
  const importantItems = buildImportantTickerItems(posts);
  const manualUrgentItems = manualItems
    .slice(0, 3)
    .map((item) => ({ href: item.href, text: formatUrgentTickerText(item.text) }))
    .filter((item) => item.text);
  const fallbackUrgentItems = buildFallbackTickerItems(posts)
    .slice(0, 3)
    .map((item) => ({ href: item.href, text: formatUrgentTickerText(item.text) }))
    .filter((item) => item.text);
  const baseItems = manualUrgentItems.length > 0
    ? manualUrgentItems
    : (importantItems.length > 0 ? importantItems : fallbackUrgentItems);
  if (!baseItems.length) {
    track.innerHTML = "";
    return;
  }

  const fragment = document.createDocumentFragment();
  baseItems.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.className = "br-ticker-item";

    const link = document.createElement("a");
    link.href = item.href;
    link.className = "br-ticker-link";
    const text = document.createElement("span");
    text.className = "br-ticker-text";
    text.textContent = item.text;

    const cta = document.createElement("span");
    cta.className = "br-ticker-cta";
    cta.textContent = "Check Now \u2192";

    link.append(text, cta);
    listItem.appendChild(link);
    fragment.appendChild(listItem);
  });
  track.replaceChildren(fragment);
}

function getHomeHighlightLimit() {
  const width = window.innerWidth || document.documentElement.clientWidth || 1200;
  if (width <= 820) return 6;
  return 8;
}

const HOME_HIGHLIGHT_FALLBACK_COLORS = [
  "br-home-highlight-red",
  "br-home-highlight-orange",
  "br-home-highlight-purple",
  "br-home-highlight-navy",
  "br-home-highlight-olive",
  "br-home-highlight-blue",
  "br-home-highlight-maroon",
  "br-home-highlight-green"
];

const HOME_HIGHLIGHT_COLOR_BY_CATEGORY = {
  "Latest Results": "br-home-highlight-blue",
  "Latest Jobs": "br-home-highlight-green",
  "Admit Card": "br-home-highlight-orange",
  Scholarship: "br-home-highlight-green",
  "Sarkari Yojana": "br-home-highlight-orange",
  Admission: "br-home-highlight-green",
  Verification: "br-home-highlight-blue"
};

function getHomeHighlightColorClass(category, idx = 0, explicitColorClass = "") {
  const byCategory = HOME_HIGHLIGHT_COLOR_BY_CATEGORY[String(category || "").trim()];
  if (byCategory) return byCategory;
  if (HOME_HIGHLIGHT_FALLBACK_COLORS.includes(explicitColorClass)) return explicitColorClass;
  return HOME_HIGHLIGHT_FALLBACK_COLORS[idx % HOME_HIGHLIGHT_FALLBACK_COLORS.length];
}

function renderHomeHighlights(posts) {
  const grid = document.getElementById("home-highlight-grid");
  if (!grid) return;
  const highlightLimit = getHomeHighlightLimit();
  const visiblePosts = Array.isArray(posts)
    ? posts.filter((post) => !HOME_EXCLUDED_CATEGORIES.has(String(post?.category || "").trim()))
    : [];

  const manualItems = Array.isArray(manualHighlightItemsCache)
    ? manualHighlightItemsCache.filter((item) => !HOME_EXCLUDED_CATEGORIES.has(String(item?.category || "").trim()))
    : [];
  if (manualItems.length > 0) {
    const fragment = document.createDocumentFragment();
    manualItems.slice(0, highlightLimit).forEach((item, idx) => {
      const colorClass = getHomeHighlightColorClass(item.category, idx, item.colorClass);
      const a = document.createElement("a");
      a.href = item.href;
      a.className = `br-home-highlight-card ${colorClass}`;
      if (item.isHot || /tre\s*4\.?0|44000\+?\s*posts/i.test(item.title || "")) {
        a.classList.add("br-hot-update");
      }

      const category = document.createElement("span");
      category.className = "br-home-highlight-card-category";
      category.textContent = item.category || "Update";

      const title = document.createElement("strong");
      title.className = "br-home-highlight-card-title";
      title.textContent = item.title;

      a.append(category, title);
      fragment.appendChild(a);
    });
    grid.replaceChildren(fragment);
    return;
  }

  const preferredCategories = [
    "Latest Results",
    "Latest Jobs",
    "Admit Card",
    "Scholarship",
    "Sarkari Yojana",
    "Admission"
  ];

  const sorted = [...visiblePosts].sort(byDate);
  const selected = [];
  const used = new Set();

  MANUAL_PRIORITY_POSTS
    .filter((post) => sorted.some((item) => item.slug === post.slug))
    .sort(byDate)
    .forEach((post) => {
      if (selected.length >= highlightLimit || used.has(post.slug)) return;
      selected.push(post);
      used.add(post.slug);
    });

  preferredCategories.forEach((category) => {
    if (selected.length >= highlightLimit) return;
    const item = sorted.find((post) => post.category === category && !used.has(post.slug));
    if (!item) return;
    selected.push(item);
    used.add(item.slug);
  });

  sorted.forEach((post) => {
    if (selected.length >= highlightLimit) return;
    if (used.has(post.slug)) return;
    selected.push(post);
    used.add(post.slug);
  });

  const fragment = document.createDocumentFragment();
  selected.slice(0, highlightLimit).forEach((post, idx) => {
    const a = document.createElement("a");
    a.href = postHref(post);
    a.className = `br-home-highlight-card ${getHomeHighlightColorClass(post.category, idx)}`;
    if (/tre\s*4\.?0|44000\+?\s*posts/i.test(post.title || "")) {
      a.classList.add("br-hot-update");
    }

    const category = document.createElement("span");
    category.className = "br-home-highlight-card-category";
    category.textContent = post.category || "Update";

    const title = document.createElement("strong");
    title.className = "br-home-highlight-card-title";
    title.textContent = post.title;

    a.append(category, title);
    fragment.appendChild(a);
  });
  grid.replaceChildren(fragment);
}

async function renderHome(posts) {
  const homeEntries = Object.entries(HOME_MAP);

  for (let index = 0; index < homeEntries.length; index += 1) {
    const [category, listId] = homeEntries[index];
    const listEl = document.getElementById(listId);
    if (!listEl) continue;

    const items = posts
      .filter((post) => post.category === category)
      .sort((a, b) => byHomePriorityThenDate(a, b, category));
    const fragment = document.createDocumentFragment();
    
    // Capping DOM creation prevents main thread blocking & improves INP
    const itemsToRender = items.slice(0, 60);
    const showSnippet = false;
    itemsToRender.forEach((post, idx) => {
      fragment.appendChild(createListItem(post, {
        showSnippet,
        isPriorityFlash: idx < 5
      }));
    });
    listEl.replaceChildren(fragment);

    const btn = document.querySelector(`.br-view-more[data-target="${listId}"]`);
    if (!btn) return;
    const hasMore = itemsToRender.length > HOME_SECTION_INITIAL_VISIBLE;
    btn.style.display = hasMore ? "block" : "none";
    btn.textContent = "View More +";
    listEl.classList.remove(MAX_COLLAPSED_HEIGHT_CLASS);
    listEl.dataset.collapsed = hasMore ? "1" : "0";

    const rows = Array.from(listEl.children);
    rows.forEach((row, idx) => {
      row.style.display = !hasMore || idx < HOME_SECTION_INITIAL_VISIBLE ? "" : "none";
    });
    if (index < homeEntries.length - 1) {
      await yieldToMainThread();
    }
  }

  HOME_SECTIONS = Object.entries(HOME_MAP)
    .map(([category, listId]) => {
      const list = document.getElementById(listId);
      if (!list) return null;
      const button = document.querySelector(`.br-view-more[data-target="${listId}"]`);
      const container = list.closest(".br-column") || list.closest(".br-single-row");
      if (container) container.dataset.homeCategory = category;
      return { category, list, button, container };
    })
    .filter(Boolean);
}

function setupListViewMore() {
  document.querySelectorAll(".br-view-more[data-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      const list = document.getElementById(target);
      if (!list) return;

      const rows = Array.from(list.children);
      const visibleRows = rows.filter((row) => row.dataset.filterMatch !== "0");
      const isCollapsed = list.dataset.collapsed !== "0";

      if (isCollapsed) {
        visibleRows.forEach((row) => { row.style.display = ""; });
        rows.filter((row) => row.dataset.filterMatch === "0").forEach((row) => { row.style.display = "none"; });
        list.classList.add(MAX_COLLAPSED_HEIGHT_CLASS);
        list.dataset.collapsed = "0";
        btn.textContent = "Show Less -";
        return;
      }

      visibleRows.forEach((row, idx) => {
        row.style.display = idx < HOME_SECTION_INITIAL_VISIBLE ? "" : "none";
      });
      rows.filter((row) => row.dataset.filterMatch === "0").forEach((row) => { row.style.display = "none"; });
      list.classList.remove(MAX_COLLAPSED_HEIGHT_CLASS);
      list.dataset.collapsed = "1";
      btn.textContent = "View More +";
    });
  });
}

function applyHomeSearchFilter() {
  const searchInput = document.getElementById("br-home-search");
  const categorySelect = document.getElementById("br-home-category");
  const emptyState = document.getElementById("br-home-search-empty");
  if (!searchInput || !categorySelect || !HOME_SECTIONS.length) return;

  const query = searchInput.value.trim().toLowerCase();
  const selected = categorySelect.value || "all";
  const hasQuery = query.length > 0;
  let totalVisibleMatches = 0;

  HOME_SECTIONS.forEach((section) => {
    const rows = Array.from(section.list.children);
    let matchCount = 0;

    rows.forEach((row) => {
      const text = row.dataset.searchText || row.textContent.toLowerCase();
      const isMatch = !hasQuery || text.includes(query);
      row.dataset.filterMatch = isMatch ? "1" : "0";
      if (isMatch) matchCount += 1;
    });

    const categoryAllowed = selected === "all" || selected === section.category;
    const shouldShowSection = categoryAllowed && matchCount > 0;

    if (section.container) {
      section.container.style.display = shouldShowSection ? "" : "none";
    }

    if (!shouldShowSection) {
      rows.forEach((row) => { row.style.display = "none"; });
      if (section.button) section.button.style.display = "none";
      return;
    }

    const matchedRows = rows.filter((row) => row.dataset.filterMatch === "1");
    totalVisibleMatches += matchedRows.length;
    const hasMore = matchedRows.length > HOME_SECTION_INITIAL_VISIBLE;
    const isCollapsed = section.list.dataset.collapsed !== "0";

    if (hasQuery) {
      matchedRows.forEach((row) => { row.style.display = ""; });
      rows.filter((row) => row.dataset.filterMatch === "0").forEach((row) => { row.style.display = "none"; });
      if (section.button) section.button.style.display = "none";
      return;
    }

    if (isCollapsed && hasMore) {
      matchedRows.forEach((row, idx) => { row.style.display = idx < HOME_SECTION_INITIAL_VISIBLE ? "" : "none"; });
      if (section.button) {
        section.button.style.display = "block";
        section.button.textContent = "View More +";
      }
    } else {
      matchedRows.forEach((row) => { row.style.display = ""; });
      if (section.button) {
        section.button.style.display = hasMore ? "block" : "none";
        section.button.textContent = hasMore ? "Show Less -" : "View More +";
      }
    }

    rows.filter((row) => row.dataset.filterMatch === "0").forEach((row) => { row.style.display = "none"; });
  });

  if (emptyState) {
    emptyState.hidden = !(hasQuery && totalVisibleMatches === 0);
  }
}

function setupHomeSearchFilters() {
  const searchInput = document.getElementById("br-home-search");
  const categorySelect = document.getElementById("br-home-category");
  const resetButton = document.getElementById("br-home-filter-reset");
  if (!searchInput || !categorySelect) return;

  const debouncedApply = debounce(() => applyHomeSearchFilter(), HOME_SEARCH_DEBOUNCE_MS);
  const onChange = () => applyHomeSearchFilter();
  searchInput.addEventListener("input", debouncedApply);
  categorySelect.addEventListener("change", onChange);
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      searchInput.value = "";
      categorySelect.value = "all";
      onChange();
    });
  }

  const query = new URLSearchParams(window.location.search).get("q");
  if (query && !searchInput.value) {
    searchInput.value = query.trim();
  }
}

function parseAgeBounds(ageLimitLines) {
  if (!Array.isArray(ageLimitLines) || ageLimitLines.length === 0) return null;
  let min = null;
  let max = null;

  ageLimitLines.forEach((line) => {
    const labelText = cleanSnippet(line?.label || "");
    const valueText = cleanSnippet(line?.value || line || "");
    const joined = `${labelText}: ${valueText}`.trim();
    const value = joined || String(line || "");
    const minMatch = value.match(/minimum age\s*:?\s*(\d{1,2})/i) || (labelText.match(/minimum age/i) ? valueText.match(/(\d{1,2})/) : null);
    const maxMatch = value.match(/maximum age\s*:?\s*(\d{1,2})/i) || (labelText.match(/maximum age/i) ? valueText.match(/(\d{1,2})/) : null);
    if (minMatch) min = min === null ? Number(minMatch[1]) : Math.min(min, Number(minMatch[1]));
    if (maxMatch) max = max === null ? Number(maxMatch[1]) : Math.max(max, Number(maxMatch[1]));
  });

  if (min === null && max === null) return null;
  return { min, max };
}

function calculateAgeYears(dob, refDate = new Date()) {
  if (!(dob instanceof Date) || Number.isNaN(dob.getTime())) return null;
  let age = refDate.getFullYear() - dob.getFullYear();
  const monthDiff = refDate.getMonth() - dob.getMonth();
  const dayDiff = refDate.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age;
}

function renderAgeCalculator(posts) {
  const select = document.getElementById("br-age-job");
  const dobInput = document.getElementById("br-age-dob");
  const checkBtn = document.getElementById("br-age-check");
  const output = document.getElementById("br-age-output");
  if (!select || !dobInput || !checkBtn || !output) return;

  const candidates = posts
    .filter((p) => p.category === "Latest Jobs")
    .map((p) => ({ post: p, bounds: parseAgeBounds(p.ageLimit) }))
    .filter((x) => x.bounds && (Number.isFinite(x.bounds.min) || Number.isFinite(x.bounds.max)))
    .sort((a, b) => byDate(a.post, b.post))
    .slice(0, 60);

  select.innerHTML = "";
  if (candidates.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No age-rule jobs available right now";
    select.appendChild(option);
    checkBtn.disabled = true;
    return;
  }

  candidates.forEach((item, idx) => {
    const option = document.createElement("option");
    const minText = Number.isFinite(item.bounds.min) ? item.bounds.min : "-";
    const maxText = Number.isFinite(item.bounds.max) ? item.bounds.max : "-";
    option.value = String(idx);
    option.textContent = `${item.post.title} (Age: ${minText}-${maxText})`;
    select.appendChild(option);
  });

  checkBtn.addEventListener("click", () => {
    const selectedIndex = Number(select.value || "0");
    const selected = candidates[selectedIndex];
    if (!selected) return;

    const dob = dobInput.value ? new Date(dobInput.value) : null;
    const age = calculateAgeYears(dob);
    if (!dob || age === null) {
      output.textContent = "Please select a valid Date of Birth.";
      output.className = "br-pro-output br-pro-warn";
      return;
    }

    const { min, max } = selected.bounds;
    const hasMin = Number.isFinite(min);
    const hasMax = Number.isFinite(max);
    const meetsMin = !hasMin || age >= min;
    const meetsMax = !hasMax || age <= max;
    const isEligible = meetsMin && meetsMax;
    const ageBand = `${hasMin ? min : "?"} - ${hasMax ? max : "?"}`;

    output.textContent = isEligible
      ? `Eligible: Your age is ${age}. Required age range is ${ageBand}.`
      : `Not eligible: Your age is ${age}. Required age range is ${ageBand}.`;
    output.className = `br-pro-output ${isEligible ? "br-pro-ok" : "br-pro-warn"}`;
  });
}

function renderSyllabusLibrary(posts) {
  const list = document.getElementById("br-syllabus-list");
  if (!list) return;
  list.innerHTML = "";

  const syllabusPosts = posts
    .filter((p) => /syllabus|exam pattern|question paper/i.test(p.title || ""))
    .sort(byDate)
    .slice(0, 12);

  if (!syllabusPosts.length) {
    const li = document.createElement("li");
    li.textContent = "Syllabus links will be listed here as soon as updates are available.";
    list.appendChild(li);
    return;
  }

  syllabusPosts.forEach((post) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = postHref(post);
    a.textContent = post.title;
    li.appendChild(a);
    list.appendChild(li);
  });
}

function parseDateFromText(value) {
  if (!value) return null;
  const text = String(value).replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const direct = new Date(text);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dmY = text.match(/(\d{1,2})[\-\/ ]([A-Za-z]{3,9}|\d{1,2})[\-\/ ](\d{2,4})/);
  if (dmY) {
    const tryDate = new Date(`${dmY[1]} ${dmY[2]} ${dmY[3]}`);
    if (!Number.isNaN(tryDate.getTime())) return tryDate;
  }
  return null;
}

function formatIcsUtc(date) {
  const dt = new Date(date);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const hh = String(dt.getUTCHours()).padStart(2, "0");
  const mi = String(dt.getUTCMinutes()).padStart(2, "0");
  const ss = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildIcsContent(events) {
  const nowStamp = formatIcsUtc(new Date());
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BiharResult.live//Exam Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];
  const body = events.map((event, idx) => {
    const start = new Date(event.date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(event.date);
    end.setHours(10, 0, 0, 0);
    return [
      "BEGIN:VEVENT",
      `UID:br-${idx}-${start.getTime()}@biharresult.live`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatIcsUtc(start)}`,
      `DTEND:${formatIcsUtc(end)}`,
      `SUMMARY:${escapeIcsText(event.label)}`,
      `DESCRIPTION:${escapeIcsText(`${event.title} | ${event.href}`)}`,
      `URL:${event.href}`,
      "END:VEVENT"
    ].join("\r\n");
  });
  return [...header, ...body, "END:VCALENDAR"].join("\r\n");
}

function downloadIcsFile(events) {
  if (!Array.isArray(events) || events.length === 0) return;
  const content = buildIcsContent(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "biharresult-upcoming-exams.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function renderExamCalendar(posts) {
  const timeline = document.getElementById("br-exam-timeline");
  const exportBtn = document.getElementById("br-export-ics");
  if (!timeline) return;
  timeline.innerHTML = "";

  const items = [];
  posts.forEach((post) => {
    (post.importantDates || []).forEach((row) => {
      const label = String(row?.label || "");
      if (!/exam|interview|admit|result|date/i.test(label)) return;
      const dt = parseDateFromText(row?.value || "");
      if (!dt) return;
      items.push({
        title: post.title,
        label,
        date: dt,
        href: postHref(post)
      });
    });
  });

  const now = new Date();
  const upcoming = items
    .filter((x) => x.date >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => a.date - b.date)
    .slice(0, 10);

  if (exportBtn) {
    exportBtn.disabled = upcoming.length === 0;
    exportBtn.onclick = () => downloadIcsFile(upcoming);
  }

  if (!upcoming.length) {
    const empty = document.createElement("div");
    empty.className = "br-pro-output";
    empty.textContent = "No upcoming exam dates parsed yet. New timeline items will appear automatically.";
    timeline.appendChild(empty);
    return;
  }

  upcoming.forEach((item) => {
    const row = document.createElement("a");
    row.className = "br-exam-row";
    row.href = item.href;

    const dt = document.createElement("span");
    dt.className = "br-exam-date";
    dt.textContent = item.date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });

    const txt = document.createElement("span");
    txt.className = "br-exam-text";
    txt.textContent = `${item.label}: ${item.title}`;

    row.appendChild(dt);
    row.appendChild(txt);
    timeline.appendChild(row);
  });
}

function renderProFeatures(posts) {
  renderAgeCalculator(posts);
  renderSyllabusLibrary(posts);
  renderExamCalendar(posts);
}

function setupAutoExpandBlocks(scope = document) {
  scope.querySelectorAll("[data-auto-expand]").forEach((block) => {
    if (block.dataset.expandInit === "1") return;
    block.dataset.expandInit = "1";

    const maxHeight = Number.parseInt(block.dataset.expandHeight || "260", 10);
    if (!Number.isFinite(maxHeight)) return;
    if (block.scrollHeight <= maxHeight + 8) return;

    block.classList.add("br-auto-collapsed");
    block.style.maxHeight = `${maxHeight}px`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "br-view-more br-view-more-inline";
    btn.textContent = "View More +";

    btn.addEventListener("click", () => {
      const expanded = block.classList.toggle("br-auto-collapsed-off");
      block.style.maxHeight = expanded ? `${block.scrollHeight + 20}px` : `${maxHeight}px`;
      btn.textContent = expanded ? "Show Less -" : "View More +";
    });

    block.insertAdjacentElement("afterend", btn);
  });
}

function expandAllAutoBlocks(scope = document) {
  if (!scope) return;
  scope.querySelectorAll("[data-auto-expand]").forEach((block) => {
    block.dataset.expandInit = "1";
    block.classList.remove("br-auto-collapsed", "br-auto-collapsed-off");
    block.style.maxHeight = "";

    const next = block.nextElementSibling;
    if (next && next.classList && next.classList.contains("br-view-more-inline")) {
      next.remove();
    }
  });
}

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const querySlug = params.get("slug");
  if (querySlug) return querySlug;

  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (path && path !== "post.html" && path !== "index.html") return path;
  return null;
}

function buildSimpleRows(tableEl, rows) {
  if (!tableEl) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    tableEl.textContent = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = "No data available.";
    tr.appendChild(td);
    tableEl.appendChild(tr);
    return;
  }
  tableEl.textContent = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");
    th.setAttribute("scope", "row");
    th.textContent = row.label || "-";
    td.textContent = row.value || "-";
    tr.appendChild(th);
    tr.appendChild(td);
    tableEl.appendChild(tr);
  });
}

function buildVacancyRows(tableEl, rows) {
  if (!tableEl) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    tableEl.textContent = "";
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = "No vacancy details available.";
    tr.appendChild(td);
    tableEl.appendChild(tr);
    return;
  }
  tableEl.textContent = "";
  const normalizedRows = rows.map((row) => ({
    post: row.post || row.label || "-",
    total: row.total || row.value || "-",
    criteria: row.criteria || ""
  }));
  const hasCriteria = normalizedRows.some((row) => String(row.criteria || "").trim());
  const headerRow = document.createElement("tr");
  (hasCriteria ? ["Post Name", "Total Post", "Eligibility"] : ["Post Name", "Total Post / Seats"]).forEach((name) => {
    const th = document.createElement("th");
    th.textContent = name;
    headerRow.appendChild(th);
  });
  tableEl.appendChild(headerRow);

  normalizedRows.forEach((row) => {
    const tr = document.createElement("tr");
    const tdPost = document.createElement("td");
    const tdTotal = document.createElement("td");
    tdPost.textContent = row.post || "-";
    tdTotal.textContent = row.total || "-";
    tr.appendChild(tdPost);
    tr.appendChild(tdTotal);
    if (hasCriteria) {
      const tdCriteria = document.createElement("td");
      tdCriteria.textContent = row.criteria || "-";
      tr.appendChild(tdCriteria);
    }
    tableEl.appendChild(tr);
  });
}

function findLastDate(post) {
  const dates = post.importantDates || [];
  const found = dates.find((d) => /last date|last|closing|close/i.test(d.label || ""));
  if (found && found.value) return found.value;
  return "As per official notification";
}

function findRowValue(rows, pattern) {
  const found = (rows || []).find((row) => pattern.test(String(row?.label || "").trim()));
  return found?.value || "";
}

function mergeRows(baseRows, extraRows, limit = 10) {
  const merged = [];
  const seen = new Set();

  [...(baseRows || []), ...(extraRows || [])].forEach((row) => {
    const label = cleanSnippet(row?.label || "");
    const value = cleanSnippet(row?.value || "");
    if (!label || !value) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ label, value });
  });

  return merged.slice(0, limit);
}

function buildAgeSummaryText(post) {
  const ageRows = Array.isArray(post.ageLimit) ? post.ageLimit : [];
  if (ageRows.length) {
    return ageRows
      .map((row) => `${cleanSnippet(row.label || "Age")}: ${cleanSnippet(row.value || "As per rules")}`)
      .filter(Boolean)
      .join(" | ");
  }

  return cleanSnippet(findRowValue(post.eligibility, /age/i) || "Check official age rules and relaxation details.");
}

function buildDetailedDateRows(post) {
  const baseRows = (post.importantDates || []).filter((item) => {
    const label = String(item?.label || "").trim();
    return !/^(updated(?:\s+date)?|arrival(?:\s+date)?)$/i.test(label);
  });
  const primary = getPrimaryAction(post);
  const primaryLabel = cleanSnippet(primary?.label || "Official Link");
  const extras = [];

  switch (post.category) {
    case "Latest Jobs":
      extras.push(
        { label: "Application Start", value: findRowValue(post.importantDates, /apply start|online apply start|start date/i) || "Check official notification" },
        { label: "Last Date", value: findLastDate(post) || "Check official notification" },
        { label: "Fee Payment Last Date", value: findRowValue(post.importantDates, /fee payment|payment last date/i) || "Same as last date / official notice" },
        { label: "Exam / Merit / Interview", value: findRowValue(post.importantDates, /exam|interview|merit|result/i) || "Will be notified later" }
      );
      break;
    case "Latest Results":
      extras.push(
        { label: "Result Status", value: findRowValue(post.importantDates, /result declared|result date|result/i) || `${primaryLabel} section is available below` },
        { label: "Exam / Session", value: findRowValue(post.importantDates, /exam date|session|paper/i) || "Check official exam schedule" },
        { label: "Score Card / Marksheet", value: "Download after checking the result if provided on the official portal." }
      );
      break;
    case "Admit Card":
      extras.push(
        { label: "Admit Card Status", value: findRowValue(post.importantDates, /admit card|call letter|hall ticket/i) || "Check official portal" },
        { label: "Exam / DV Date", value: findRowValue(post.importantDates, /exam|dv|verification|interview/i) || "See official schedule" },
        { label: "Reporting Advice", value: "Reach the center or venue as per the timing mentioned on admit card or notice." }
      );
      break;
    case "Admission":
      extras.push(
        { label: "Application Start", value: findRowValue(post.importantDates, /apply start|start date|registration start/i) || "Check official notice" },
        { label: "Last Date", value: findLastDate(post) || "Check official notice" },
        { label: "Merit / Counselling", value: findRowValue(post.importantDates, /merit|counselling|seat allotment/i) || "Will be updated by the institution" }
      );
      break;
    case "Scholarship":
      extras.push(
        { label: "Application Window", value: findRowValue(post.importantDates, /apply|start|last date/i) || "Check scholarship portal notice" },
        { label: "Verification / Approval", value: findRowValue(post.importantDates, /verification|approval/i) || "As per official portal process" },
        { label: "Payment / Benefit Status", value: findRowValue(post.importantDates, /payment|benefit/i) || "Track from official portal if available" }
      );
      break;
    case "Sarkari Yojana":
      extras.push(
        { label: "Scheme Status", value: findRowValue(post.importantDates, /status|start|last date/i) || "Refer official scheme notice" },
        { label: "Benefit Processing", value: "Benefit release timeline is subject to official departmental approval." },
        { label: "Important Note", value: "Check district and category-specific rules before applying or verifying status." }
      );
      break;
    case "Verification":
      extras.push(
        { label: "Service Status", value: "Online verification or check link is available in the Important Links section." },
        { label: "Processing Time", value: "Response time depends on the official portal or department service flow." },
        { label: "Best Time To Check", value: "Keep reference details ready and use the official portal during normal working hours if the service is busy." }
      );
      break;
    default:
      extras.push({ label: "Latest Status", value: "Check the official notice and important links below." });
      break;
  }

  return mergeRows(baseRows, extras, 10);
}

function buildDetailedFeeRows(post) {
  const baseRows = post.applicationFee || [];
  const extras = [];

  switch (post.category) {
    case "Latest Jobs":
    case "Admission":
      extras.push(
        { label: "Service Note", value: "Fill payment details only on the official portal and keep the payment receipt safe." },
        { label: "Refund / Correction", value: "Fee refund or correction facility is available only if mentioned in the official notice." }
      );
      break;
    case "Latest Results":
      extras.push(
        { label: "Service Fee", value: "Usually no fee is required to check the result online unless the official portal mentions a paid copy or service." },
        { label: "Marksheet Note", value: "Original marksheet or certificate collection rules will follow board or university instructions." }
      );
      break;
    case "Admit Card":
      extras.push(
        { label: "Download Fee", value: "Admit card download is normally free unless the department mentions a separate service charge." },
        { label: "Print Advice", value: "Candidates should keep a clear printed copy for exam or document verification." }
      );
      break;
    case "Scholarship":
      extras.push(
        { label: "Application Fee", value: "Most scholarship portals do not charge a form fee unless specifically mentioned in the notice." },
        { label: "Banking Note", value: "Keep bank account and Aadhaar-linked details ready for scholarship payment processing." }
      );
      break;
    case "Sarkari Yojana":
    case "Verification":
      extras.push(
        { label: "Service Fee", value: "Service fee, if any, depends on the official portal or CSC/service-center rules." },
        { label: "Official Advice", value: "Do not pay unofficial charges beyond the amount shown on the government portal." }
      );
      break;
    default:
      extras.push({ label: "Fee Note", value: "Check the official notification for exact fee or service-charge details." });
      break;
  }

  return mergeRows(baseRows, extras, 10);
}

function buildDetailedEligibilityRows(post) {
  const baseRows = post.eligibility || [];
  const loginDetails = cleanSnippet(
    findRowValue(post.eligibility, /required details|login|roll number|registration|captcha|document/i) ||
    findRowValue(post.importantDates, /login/i)
  );
  const ageSummary = buildAgeSummaryText(post);
  const extras = [];

  switch (post.category) {
    case "Latest Jobs":
      extras.push(
        { label: "Who Can Apply", value: findRowValue(post.eligibility, /eligibility|who can apply|who should check/i) || "Candidates meeting the post-wise qualification and age rules can apply." },
        { label: "Qualification", value: findRowValue(post.eligibility, /qualification|education|eligibility/i) || "Refer official post-wise educational qualification in the notification." },
        { label: "Age Rule", value: ageSummary },
        { label: "Documents Needed", value: "Keep photo, signature, ID proof, qualification certificates, category certificate, and mobile/email details ready." }
      );
      break;
    case "Latest Results":
      extras.push(
        { label: "Who Can Check", value: findRowValue(post.eligibility, /who can check|candidate|student/i) || "Students or candidates who appeared in the examination can check the result." },
        { label: "Login Details", value: loginDetails || "Keep roll number, registration details, and captcha or login information ready." },
        { label: "Student Advice", value: "Verify name, subject-wise marks, division, and category details after result download." }
      );
      break;
    case "Admit Card":
      extras.push(
        { label: "Who Can Download", value: findRowValue(post.eligibility, /who can download|who should check|candidate/i) || "Registered candidates can download the admit card or call letter." },
        { label: "Login Details", value: loginDetails || "Keep registration number, date of birth, password, or roll number ready." },
        { label: "What To Verify", value: "Check exam center, exam date, shift timing, photo, signature, and reporting instructions." }
      );
      break;
    case "Admission":
      extras.push(
        { label: "Who Can Apply", value: findRowValue(post.eligibility, /eligibility|who can apply/i) || "Students who meet the course-wise admission criteria can apply." },
        { label: "Academic Requirement", value: findRowValue(post.eligibility, /qualification|required details|course/i) || "Check course-wise qualification and subject requirement in the official notice." },
        { label: "Documents Needed", value: "Keep marksheet, transfer certificate, category certificate, ID proof, photo, and valid contact details ready." }
      );
      break;
    case "Scholarship":
      extras.push(
        { label: "Eligible Students", value: findRowValue(post.eligibility, /eligibility|beneficiary|student/i) || "Eligible students as per class, category, income, and domicile rules can apply." },
        { label: "Required Documents", value: "Prepare income certificate, caste certificate, Aadhaar, bank passbook, marksheet, and institution details." },
        { label: "Bank / Aadhaar Note", value: "Student bank details should match the information submitted on the official portal." }
      );
      break;
    case "Sarkari Yojana":
      extras.push(
        { label: "Eligible Beneficiary", value: findRowValue(post.eligibility, /eligibility|beneficiary/i) || "Only eligible beneficiaries under the official scheme rules should apply or check status." },
        { label: "Document Requirement", value: "Keep Aadhaar, address proof, income/category documents, and scheme-specific supporting papers ready." },
        { label: "Local Rule", value: "District, category, or income conditions may apply as per the official guidelines." }
      );
      break;
    case "Verification":
      extras.push(
        { label: "Who Can Use Service", value: findRowValue(post.eligibility, /eligibility|who can/i) || "Citizens or candidates with valid reference details can use this verification service." },
        { label: "Required Details", value: loginDetails || "Keep application number, certificate number, mobile number, or service reference ID ready." },
        { label: "Matching Data", value: "Submitted details should exactly match the official document or application record." }
      );
      break;
    default:
      extras.push({ label: "Eligibility Note", value: "Refer official instructions for exact eligibility and document requirements." });
      break;
  }

  return mergeRows(baseRows, extras, 10);
}

function buildStudentGuideItems(post, summaryRows, feeRows, eligibilityRows) {
  const primary = getPrimaryAction(post);
  const primaryLabel = cleanSnippet(primary?.label || "Official Link");
  const keyDate = summaryRows[0]
    ? `${cleanSnippet(summaryRows[0].label)}: ${cleanSnippet(summaryRows[0].value)}`
    : `Last Date / Status: ${cleanSnippet(findLastDate(post)) || "Check official update"}`;
  const eligibilityNote = eligibilityRows[0]
    ? `${cleanSnippet(eligibilityRows[0].label)}: ${cleanSnippet(eligibilityRows[0].value)}`
    : "Eligibility: Check official notification for exact rules.";
  const feeNote = feeRows[0]
    ? `${cleanSnippet(feeRows[0].label)}: ${cleanSnippet(feeRows[0].value)}`
    : "Fee / Service Note: Check official portal before making any payment.";

  return [
    `Students should first note this key update: ${keyDate}.`,
    `Eligibility focus: ${eligibilityNote}`,
    `Fee and service reminder: ${feeNote}`,
    `Next official step: use ${primaryLabel} from the Important Links section and cross-check every detail before applying, downloading, or checking status.`
  ];
}

function buildDetailedExplanationParagraphs(post, summaryRows, feeRows, eligibilityRows) {
  const deptText = cleanSnippet(post.department || "official department");
  const categoryText = cleanSnippet(post.category || "Latest Update");
  const primary = getPrimaryAction(post);
  const primaryLabel = cleanSnippet(primary?.label || "Official Link");
  const keyDate = summaryRows[0]
    ? `${cleanSnippet(summaryRows[0].label)}: ${cleanSnippet(summaryRows[0].value)}`
    : `Last Date / Status: ${cleanSnippet(findLastDate(post)) || "Check official update"}`;
  const feeLine = feeRows[0]
    ? `${cleanSnippet(feeRows[0].label)}: ${cleanSnippet(feeRows[0].value)}`
    : "Fee details should be verified from the official notice.";
  const eligibilityLine = eligibilityRows[0]
    ? `${cleanSnippet(eligibilityRows[0].label)}: ${cleanSnippet(eligibilityRows[0].value)}`
    : "Check the official notification for exact eligibility rules.";

  return [
    `${cleanSnippet(post.title)} is listed under ${categoryText} as a student-friendly update page.`,
    `This post gathers the main schedule, eligibility points, fee or service note, and official action link shared by ${deptText} so candidates can review the process quickly in one place.`,
    cleanSnippet(post.longDescription || post.shortInfo || ""),
    `Key details right now: ${keyDate} ${feeLine} ${eligibilityLine}`,
    `Use ${primaryLabel} from the Important Links section for the next official step, and always verify final rules from the original department notice before taking action.`
  ].filter(Boolean);
}

function getPrimaryAction(post) {
  const links = post.importantLinks || [];
  const preferred = links.find((x) => /apply|check|download|view|result|official/i.test(x.label || "") && isUsableUrl(x.url));
  if (preferred) return preferred;
  const fallback = links.find((x) => isUsableUrl(x.url));
  return fallback || null;
}

function renderPostFacts(post) {
  const nameEl = document.getElementById("post-fact-name");
  const deptEl = document.getElementById("post-fact-department");
  const catEl = document.getElementById("post-fact-category");
  const lastDateEl = document.getElementById("post-fact-last-date");

  if (nameEl) nameEl.textContent = post.title || "-";
  if (deptEl) deptEl.textContent = post.department || "As per notification";
  if (catEl) catEl.textContent = post.category || "-";
  if (lastDateEl) lastDateEl.textContent = findLastDate(post);
}

function getPostActionCopy(category) {
  const key = String(category || "").trim();
  const map = {
    "Latest Results": {
      hi: "रिजल्ट चेक करने",
      hinglish: "result check karne"
    },
    "Latest Jobs": {
      hi: "ऑनलाइन फॉर्म भरने",
      hinglish: "online form apply karne"
    },
    "Admit Card": {
      hi: "एडमिट कार्ड डाउनलोड करने",
      hinglish: "admit card download karne"
    },
    Scholarship: {
      hi: "स्कॉलरशिप आवेदन करने",
      hinglish: "scholarship apply karne"
    },
    Admission: {
      hi: "एडमिशन प्रक्रिया पूरी करने",
      hinglish: "admission process complete karne"
    },
    "Sarkari Yojana": {
      hi: "योजना जानकारी या आवेदन करने",
      hinglish: "yojana details ya apply karne"
    },
    Verification: {
      hi: "वेरिफिकेशन करने",
      hinglish: "verification karne"
    }
  };

  return map[key] || {
    hi: "अगला स्टेप पूरा करने",
    hinglish: "next step complete karne"
  };
}

function buildLocalizedPostSummaries(post) {
  const title = cleanSnippet(post?.title || "यह अपडेट");
  const department = cleanSnippet(post?.department || "official department");
  const category = cleanSnippet(post?.category || "Latest Update");
  const lastDate = cleanSnippet(findLastDate(post));
  const action = getPostActionCopy(category);

  const hindi = `${title} ${department} द्वारा जारी ${category} अपडेट है। अंतिम तिथि: ${lastDate}। पात्रता, जरूरी तिथियां और महत्वपूर्ण लिंक नीचे दिए गए हैं। ${action.hi} के लिए नीचे दिया गया Official Link उपयोग करें।`;
  const hinglish = `${title} ${department} ke taraf se ${category} ka latest update hai. Last Date: ${lastDate}. Eligibility, important dates aur zaruri links niche diye gaye hain. ${action.hinglish} ke liye niche diya gaya official link use karein.`;

  return { hindi, hinglish };
}

function pickSummaryValue(post, keys) {
  if (!post || !Array.isArray(keys)) return "";
  for (const key of keys) {
    const value = cleanSnippet(post[key]);
    if (value) return value;
  }
  return "";
}

function renderLocalizedPostSummary(post) {
  const section = document.getElementById("post-local-summary");
  const hindiEl = document.getElementById("post-summary-hindi");
  const hinglishEl = document.getElementById("post-summary-hinglish");
  if (!section || !hindiEl || !hinglishEl) return;

  const autoSummary = buildLocalizedPostSummaries(post);

  const hindiManual = pickSummaryValue(post, [
    "summaryHindi",
    "hindiSummary",
    "shortInfoHindi",
    "shortInfoHi"
  ]);
  const hinglishManual = pickSummaryValue(post, [
    "summaryHinglish",
    "hinglishSummary",
    "shortInfoHinglish",
    "shortInfoHl"
  ]);

  hindiEl.textContent = hindiManual || autoSummary.hindi;
  hinglishEl.textContent = hinglishManual || autoSummary.hinglish;
  section.hidden = false;
}

function renderPostExplanation(post) {
  const el = document.getElementById("post-explanation");
  if (!el) return;

  const dateRows = buildDetailedDateRows(post);
  const feeRows = buildDetailedFeeRows(post);
  const eligibilityRows = buildDetailedEligibilityRows(post);
  const paragraphs = buildDetailedExplanationParagraphs(post, dateRows, feeRows, eligibilityRows);

  el.textContent = "";
  paragraphs.forEach((text) => {
    const p = document.createElement("p");
    p.textContent = text;
    el.appendChild(p);
  });
}

function renderHowToApply(post) {
  const el = document.getElementById("how-to-apply");
  if (!el) return;

  if (Array.isArray(post.howToApply) && post.howToApply.length) {
    fillSimpleList(el, post.howToApply);
    return;
  }

  if (post.category === "Admit Card") {
    const steps = [
      "Open the admit card download link from Important Links section.",
      "Login with registration number/date of birth/password as required.",
      "Download the admit card and verify exam date, shift, and center details.",
      "Check photo/signature visibility and reporting time instructions.",
      "Carry admit card printout with valid photo ID proof to exam center."
    ];
    fillSimpleList(el, steps);
    return;
  }

  if (post.category === "Latest Results") {
    const steps = [
      "Open the result/check link from Important Links section.",
      "Enter roll number/registration number/date of birth as required.",
      "Submit details and check result/marks/status carefully.",
      "Download result PDF/score card and verify your details.",
      "Keep a printout for counselling/document verification/future reference."
    ];
    fillSimpleList(el, steps);
    return;
  }

  const primary = getPrimaryAction(post);
  const primaryUrl = primary?.url || "#";
  const primaryLabel = primary?.label || "Official Link";

  const steps = [
    "Read the complete notification and check required eligibility details.",
    "Keep important documents ready before starting the process.",
    `Open the ${primaryLabel} and complete the required process carefully.`,
    "Verify dates, fee details, and final submission status before deadline.",
    "Save/print acknowledgment or downloaded document for future use."
  ];

  fillSimpleList(el, steps);

  if (primaryUrl && primaryUrl !== "#") {
    const cta = document.createElement("a");
    cta.className = "link-btn";
    cta.href = sanitizeUrl(primaryUrl);
    cta.target = "_blank";
    cta.rel = "noopener noreferrer";
    cta.textContent = `Open ${primaryLabel}`;
    el.insertAdjacentElement("afterend", cta);
  }
}

function renderAgeLimit(post) {
  const section = document.getElementById("age-limit-section");
  const list = document.getElementById("age-limit-list");
  if (!section || !list) return;

  const limits = Array.isArray(post.ageLimit) ? post.ageLimit : [];
  if (!limits.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  fillSimpleList(list, limits.map((item) => `${cleanSnippet(item.label || "Age")}: ${cleanSnippet(item.value || "As per rules")}`));
}

function renderStudentGuide(post, summaryRows, feeRows, eligibilityRows) {
  const section = document.getElementById("student-guide-section");
  const list = document.getElementById("student-guide-list");
  if (!section || !list) return;

  const points = buildStudentGuideItems(post, summaryRows, feeRows, eligibilityRows);
  if (!points.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  fillSimpleList(list, points);
}

function renderBeforeStart(post) {
  const section = document.getElementById("before-start-section");
  const list = document.getElementById("before-start-list");
  if (!section || !list) return;

  let points = Array.isArray(post.beforeYouStart) ? post.beforeYouStart : [];
  if (!points.length && post.category === "Verification") {
    points = [
      "Keep reference/application/certificate number ready before opening the portal.",
      "Ensure name and details exactly match official records/documents.",
      "Use stable internet and fill captcha carefully to avoid session timeout.",
      "Verify district/circle/service type selection before submitting search.",
      "Save screenshot or print result page after successful verification."
    ];
  }

  if (!points.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  fillSimpleList(list, points);
}

function setPostSchema(post, canonicalUrl) {
  const isJob = post.category === "Latest Jobs";
  const description = buildSeoDescription(post);
  const organization = {
    "@type": "Organization",
    name: "BiharResult.live",
    url: "https://biharresult.live/",
    logo: {
      "@type": "ImageObject",
      url: "https://biharresult.live/favicon.png"
    }
  };
  const webPageSchema = {
    "@type": "WebPage",
    name: post.title,
    url: canonicalUrl,
    description,
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      name: "BiharResult.live",
      url: "https://biharresult.live/"
    },
    about: [post.category, post.department, post.location].filter(Boolean)
  };
  const primarySchema = isJob
    ? {
        "@type": "JobPosting",
        title: post.title,
        description,
        datePosted: post.publishedAt,
        validThrough: post.updatedAt || post.publishedAt,
        hiringOrganization: { "@type": "Organization", name: post.department },
        jobLocation: {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressRegion: post.location, addressCountry: "IN" }
        },
        applicantLocationRequirements: {
          "@type": "Country",
          name: "India"
        },
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        url: canonicalUrl
      }
    : {
        "@type": "NewsArticle",
        headline: post.title,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        description,
        publisher: organization,
        author: { "@type": "Organization", name: "BiharResult.live" },
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonicalUrl
        },
        about: [post.category, post.department, post.location].filter(Boolean),
        url: canonicalUrl
      };
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://biharresult.live/" }
  ];
  const sectionHref = sectionHrefByCategory(post.category);
  if (sectionHref) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: post.category,
      item: toAbsoluteSiteUrl(sectionHref)
    });
  }
  breadcrumbItems.push({
    "@type": "ListItem",
    position: breadcrumbItems.length + 1,
    name: post.title,
    item: canonicalUrl
  });
  const schema = [
    webPageSchema,
    primarySchema,
    {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems
    }
  ];

  const howToApply = Array.isArray(post.howToApply) ? post.howToApply.filter(Boolean) : [];
  if (howToApply.length) {
    schema.push({
      "@type": "HowTo",
      name: `${post.title} - How to Proceed`,
      description: `Step-by-step guidance for ${post.title} on BiharResult.live.`,
      inLanguage: "en-IN",
      step: howToApply.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: `Step ${index + 1}`,
        text: cleanSnippet(step)
      }))
    });
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": schema
  });
  document.head.appendChild(script);
}

function setMetaContent(id, content) {
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute("content", content || "");
}

function renderPostMeta(post) {
  const lineEl = document.getElementById("post-meta-line");
  const publishedEl = document.getElementById("post-meta-published");
  const updatedEl = document.getElementById("post-meta-updated");
  if (!lineEl || !publishedEl || !updatedEl) return;

  const publishedText = post.publishedAt ? `Posted: ${formatDate(post.publishedAt)}` : "";
  const updatedText = (post.updatedAt || post.publishedAt) ? `Modified: ${formatDate(post.updatedAt || post.publishedAt)}` : "";

  publishedEl.textContent = publishedText;
  publishedEl.hidden = !publishedText;
  updatedEl.textContent = updatedText;
  updatedEl.hidden = !updatedText;
  lineEl.hidden = !publishedText && !updatedText;
}

function renderPost(post) {
  const titleEl = document.getElementById("post-title");
  if (!titleEl) return;

  titleEl.textContent = post.title;
  document.getElementById("post-summary").textContent = cleanSnippet(post.shortInfo) || "";
  renderLocalizedPostSummary(post);
  document.title = `${post.title} | BiharResult.live`;

  const seoDescription = buildSeoDescription(post);
  const description = document.getElementById("meta-description");
  if (description) description.setAttribute("content", seoDescription);

  const canonical = document.getElementById("canonical-link");
  const canonicalUrl = toAbsoluteSiteUrl(postHref(post));
  if (canonical) canonical.setAttribute("href", canonicalUrl);
  const alternateEn = document.getElementById("alternate-en-in");
  if (alternateEn) alternateEn.setAttribute("href", canonicalUrl);
  const alternateDefault = document.getElementById("alternate-x-default");
  if (alternateDefault) alternateDefault.setAttribute("href", canonicalUrl);

  const ogImage = sanitizeUrl(post.image) !== "#" ? sanitizeUrl(post.image) : "https://biharresult.live/wp-content/uploads/2026/02/cropped_circle_image.png";
  setMetaContent("og-title", post.title);
  setMetaContent("og-description", seoDescription);
  setMetaContent("og-url", canonicalUrl);
  setMetaContent("og-image", ogImage);
  setMetaContent("og-image-alt", `${post.title} on BiharResult.live`);
  setMetaContent("twitter-title", post.title);
  setMetaContent("twitter-description", seoDescription);
  setMetaContent("twitter-image", ogImage);
  setMetaContent("twitter-image-alt", `${post.title} on BiharResult.live`);
  setMetaContent("article-published-time", post.publishedAt || "");
  setMetaContent("article-modified-time", post.updatedAt || post.publishedAt || "");
  setMetaContent("article-section", post.category || "Latest Update");

  renderPostMeta(post);
  renderPostFacts(post);
  renderPostExplanation(post);
  renderAgeLimit(post);
  renderBeforeStart(post);
  const detailedDates = buildDetailedDateRows(post);
  const detailedFee = buildDetailedFeeRows(post);
  const detailedEligibility = buildDetailedEligibilityRows(post);

  buildSimpleRows(document.getElementById("dates-table"), detailedDates);
  buildSimpleRows(document.getElementById("fee-table"), detailedFee);
  buildSimpleRows(document.getElementById("eligibility-table"), detailedEligibility);
  renderStudentGuide(post, detailedDates, detailedFee, detailedEligibility);
  buildVacancyRows(document.getElementById("vacancy-table"), post.vacancyDetails);
  const vacancySection = document.getElementById("vacancy-section");
  if (vacancySection) {
    vacancySection.hidden = !Array.isArray(post.vacancyDetails) || post.vacancyDetails.length === 0;
  }

  const linksEl = document.getElementById("important-links");
  if (linksEl) {
    linksEl.innerHTML = "";
    let renderedCount = 0;
    (post.importantLinks || []).forEach((item) => {
      const safeUrl = sanitizeUrl(item.url);
      if (safeUrl === "#") {
        if (isCriticalActionLabel(item.label)) return;
        return;
      }
      const a = document.createElement("a");
      a.href = safeUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.className = `link-btn ${item.type === "secondary" ? "secondary" : ""}`.trim();
      if (post.category === "Verification" && /official government link|fill \/ verify details/i.test(item.label || "")) {
        a.classList.add("official-glow");
      }
      a.textContent = item.label;
      linksEl.appendChild(a);
      renderedCount += 1;
    });
    if (renderedCount === 0) {
      const note = document.createElement("p");
      note.className = "br-item-meta";
      note.textContent = "Official links are being updated. Please check back shortly.";
      linksEl.appendChild(note);
    }
  }
  renderHowToApply(post);

  setPostSchema(post, canonicalUrl);
  expandAllAutoBlocks(document.getElementById("post-root"));
}

function renderNotFound() {
  const root = document.getElementById("post-root");
  if (!root) return;
  root.innerHTML = "<article class=\"section-card\"><h1>Post not found</h1><p>The requested post could not be located.</p></article>";
}

async function init() {
  setTodayDate();
  setupListViewMore();
  hardenExternalLinks(document);
  initPrimaryNavigation();

  const isHome = document.getElementById("results-list") !== null;
  const isPost = document.getElementById("post-title") !== null;

  if (!isHome && !isPost) return;

  try {
    const dataPromise = loadData();
    const homePreloadTasks = [];

    if (isHome) {
      homePreloadTasks.push(runSafeHomeStep("manual highlight preload", () => ensureManualHighlightItemsLoaded()));
      homePreloadTasks.push(runSafeHomeStep("manual ticker preload", () => ensureManualTickerItemsLoaded()));

      Promise.allSettled(homePreloadTasks).then(() => {
        runSafeHomeStep("early ticker render", () => renderTicker([]));
        runSafeHomeStep("early priority highlights render", () => renderHomeHighlights([]));
        hardenExternalLinks(document);
      });
    }

    const posts = await dataPromise;
    const mergedPosts = mergeManualPriorityPosts(posts);

    if (isHome) {
      if (homePreloadTasks.length) {
        await Promise.allSettled(homePreloadTasks);
      }
      await runSafeHomeStep("ticker render", () => renderTicker(mergedPosts));
      await runSafeHomeStep("priority highlights render", () => renderHomeHighlights(mergedPosts));
      let currentHighlightLimit = getHomeHighlightLimit();
      window.addEventListener("resize", () => {
        const nextLimit = getHomeHighlightLimit();
        if (nextLimit === currentHighlightLimit) return;
        currentHighlightLimit = nextLimit;
        runSafeHomeStep("priority highlights resize render", () => renderHomeHighlights(mergedPosts));
      });
      await runSafeHomeStep("home list render", () => renderHome(mergedPosts));
      await runSafeHomeStep("search filter setup", () => setupHomeSearchFilters());
      await runSafeHomeStep("search filter apply", () => applyHomeSearchFilter());
      await runSafeHomeStep("home dynamic schema", () => setHomeDynamicSchema(mergedPosts));
      runWhenBrowserIdle(() => {
        runSafeHomeStep("home tools render", async () => {
          const toolPosts = await loadHomeToolsData();
          renderProFeatures(toolPosts);
        });
      });
      runWhenBrowserIdle(() => {
        runSafeHomeStep("auto expand setup", () => setupAutoExpandBlocks(document));
      });
      hardenExternalLinks(document);
    }

    if (isPost) {
      const slug = getSlugFromUrl();
      const post = mergedPosts.find((p) => p.slug === slug);
      if (!post) renderNotFound();
      else {
        const canonicalHref = postHref(post);
        const isLegacyPostRoute = /(?:^|\/)post\.html$/i.test(window.location.pathname);
        if (isLegacyPostRoute && canonicalHref && canonicalHref !== "#" && !/(?:^|\/)post\.html(?:\?|$)/i.test(canonicalHref)) {
          window.location.replace(canonicalHref);
          return;
        }
        renderPost(post);
      }
      hardenExternalLinks(document);
    }
  } catch (error) {
    console.error(error);
  }
}

init();
