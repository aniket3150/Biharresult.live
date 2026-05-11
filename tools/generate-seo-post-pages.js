const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data.json");
const HOME_DATA_PATH = path.join(ROOT, "home-data.json");
const HOME_TOOLS_DATA_PATH = path.join(ROOT, "home-tools-data.json");
const SLUG_PATHS_PATH = path.join(ROOT, "slug-paths.json");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const SECTIONS_INDEX_PATH = path.join(ROOT, "sections", "sections-index.json");
const STUDENT_NEWS_POSTS_PATH = path.join(ROOT, "sections", "student-news", "posts.json");
const INDEX_QUALITY_REPORT_PATH = path.join(ROOT, "index-quality-report.json");

function formatDateInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const BUILD_DATE = formatDateInTimeZone(new Date(), "Asia/Kolkata");
const ASSET_VERSION = String(process.env.ASSET_VERSION || BUILD_DATE.replace(/-/g, ""))
  .trim()
  .replace(/[^a-zA-Z0-9._-]/g, "");
const SKIP_POST_REWRITE = process.env.SKIP_POST_REWRITE === "1";

const CATEGORY_TO_FOLDER = {
  "Latest Results": "latest-results",
  "Latest Jobs": "latest-jobs",
  "Admit Card": "admit-card",
  Scholarship: "scholarship",
  Admission: "admission",
  "Sarkari Yojana": "sarkari-yojana",
  Verification: "verification"
};

const FOLDER_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_FOLDER).map(([category, folder]) => [folder, category])
);

const SECTION_LABELS = {
  "Latest Results": "Latest Results",
  "Latest Jobs": "Latest Jobs",
  "Admit Card": "Admit Card",
  Scholarship: "Scholarship",
  Admission: "Admission",
  "Sarkari Yojana": "Sarkari Yojana",
  Verification: "Verification"
};

const HOME_ANCHOR_BY_CATEGORY = {
  "Latest Results": "../../index.html#latest-results",
  "Latest Jobs": "../../index.html#latest-jobs",
  "Admit Card": "../../index.html#admit-card",
  Scholarship: "../../index.html#scholarship",
  "Sarkari Yojana": "../../index.html#sarkari-yojana"
};

const RELATED_STOP_WORDS = new Set([
  "2024", "2025", "2026", "2027", "about", "admit", "after", "against", "alert", "all",
  "and", "application", "apply", "board", "bihar", "card", "check", "date", "declared",
  "details", "direct", "download", "exam", "for", "form", "from", "government", "hall",
  "important", "india", "job", "jobs", "key", "latest", "link", "links", "list", "marks",
  "notice", "official", "online", "out", "portal", "posts", "result", "results", "score",
  "scorecard", "soon", "student", "students", "the", "today", "update", "updates", "vacancy",
  "with", "www", "year", "yesterday"
]);

const MANUAL_PRESERVE_SLUGS = new Set([
  "bihar-board-inter-12th-scrutiny-online-application-form-2026",
  "bihar-iti-cat-admission-form-2026",
  "bihar-board-class-12th-result-2026",
  "bihar-board-10th-result-2026",
  "bpsc-aedo-admit-card-2026",
  "download-10th-bseb-result",
  "download-12th-bseb-result",
  "bpsc-school-teacher-tre-4-0-2026"
]);

const FORCE_INDEXABLE_SLUGS = new Set([
  ...Array.from(MANUAL_PRESERVE_SLUGS),
  "bihar-board-10th-result-2026",
  "bihar-board-class-10th-topper-list-2026",
  "cbse-class-10th-results-2026-download-link",
  "jee-main-session-2-score-card-2026",
  "bpsc-exam-calendar-2026",
  "neet-ug-2026-city-intimation-admit-update",
  "railway-rrb-alp-recruitment-2026",
  "csbc-constable-operator-online-form-2026",
  "incois-recruitment-2026-advt-01"
]);

const ROUNDUP_SLUG_PATTERN = /(?:today|yesterday)-highlights-\d{4}-\d{2}-\d{2}$/i;
const OFFICIAL_UPDATE_SLUG_PATTERN = /official-update-\d+-\d+$/i;
const SERVICE_LINK_SLUG_PATTERN = /service-link-\d+-\d+$/i;
const OFFICIAL_INFORMATION_SLUG_PATTERN = /official-information-\d+-\d+$/i;
const OFFICIAL_PORTAL_SLUG_PATTERN = /official-portal-link-\d+-\d+$/i;
const SERVICE_STYLE_SLUG_PATTERN = /(service-link-\d+-\d+|official-information-\d+-\d+|official-portal-link-\d+-\d+)$/i;
const WEAK_SLUG_PATTERN = /(official-update-\d+-\d+|service-link-\d+-\d+|official-information-\d+-\d+|official-portal-link-\d+-\d+|(?:today|yesterday)-highlights-\d{4}-\d{2}-\d{2})$/i;
const GENERIC_TITLE_PATTERN = /(official update \d+|service link \d+|official information \d+|portal link \d+)/i;
const TRUSTED_AUTHORITY_HOST_PATTERN = /(gov\.in|nic\.in|ac\.in|edu\.in|upsc\.gov\.in|cbse\.gov\.in|biharboardonline\.com|nta\.ac\.in|rrb|ibps\.in|ssc\.gov\.in|osssc\.gov\.in|drdo\.gov\.in)/i;

const DISCOVERED_RISK_GROUPS = {
  keep_and_improve: {
    label: "keep and improve",
    urlPatterns: [
      "sections/*/*.html where slug is not a numbered template but page is thin or missing authority sources"
    ],
    reason: "These URLs have user intent but need stronger unique content, source links, and freshness signals."
  },
  merge_with_stronger_page: {
    label: "merge with stronger page",
    urlPatterns: [
      "sections/*/*-today-highlights-YYYY-MM-DD.html",
      "sections/*/*-yesterday-highlights-YYYY-MM-DD.html"
    ],
    reason: "Daily roundup pages expire quickly and should consolidate into their primary section archive."
  },
  noindex_intentionally: {
    label: "noindex intentionally",
    urlPatterns: [
      "sections/admission/*official-update-#-#.html",
      "sections/sarkari-yojana/*(service-link|official-information)-#-#.html",
      "sections/scholarship/*official-portal-link-#-#.html",
      "sections/verification/*service-link-#-#.html"
    ],
    reason: "These templated URLs are useful for navigation but are weak standalone index targets."
  },
  remove_from_sitemap: {
    label: "remove from sitemap",
    urlPatterns: [
      "sections/verification/*service-link-#-#.html (borderline quality)",
      "sections/scholarship/*official-update-#-#.html (borderline quality)"
    ],
    reason: "Keep accessible for users, but do not promote these weaker templates in XML sitemap."
  },
  delete_or_stop_generating: {
    label: "delete or stop generating",
    urlPatterns: [
      "sections/(admission|sarkari-yojana|verification|scholarship)/*(official-update|official-information|official-portal-link|service-link)-#-#.html"
    ],
    reason: "High-volume numbered templates create near-duplicates and should not be auto-generated further."
  }
};

const SECTION_INDEX_META = {
  "latest-results": {
    pageTitle: "Latest Bihar Result 2026, Bihar Board Result 2026, Bihar University Result 2026 | BiharResult.live",
    socialTitle: "Latest Bihar Result 2026 and Sarkari Result Bihar Direct Links",
    description: "Check Latest Bihar Result 2026, Bihar Board Result 2026, Bihar University Result 2026, Sarkari Result Bihar, and Bihar Result direct links with official updates on BiharResult.live.",
    socialDescription: "Browse Bihar Result 2026 updates with Bihar Board, university, recruitment result direct links, merit list, cut off, and answer key routes.",
    keywords: "Latest Bihar Result, Bihar Result 2026, Bihar Board Result 2026, Bihar University Result 2026, Sarkari Result Bihar, Bihar Result Direct Link",
    heading: "Latest Bihar Result 2026 and Sarkari Result Bihar Updates",
    intro: "Browse official Bihar result updates and open each post for Bihar result direct links, cutoff, answer key, merit list, and score card guidance.",
    summary: "This page targets Latest Bihar Result, Bihar Board Result 2026, Bihar University Result 2026, Sarkari Result Bihar, and Bihar Result Direct Link searches.",
    usefulHeading: "Popular Result Links",
    archiveHeading: "Latest Result Archive",
    usefulLinks: [
      { href: "../../index.html#latest-results", label: "Check Bihar Result 2026" },
      { href: "../../pages/guides/guide-bihar-job-result-admit-card-hub.html", label: "Bihar Jobs, Result and Admit Card Hub" },
      { href: "../../pages/guides/guides.html", label: "Bihar University Result and Board Guide Library" }
    ]
  },
  "latest-jobs": {
    pageTitle: "Bihar Latest Jobs 2026, Bihar Government Jobs, Bihar Vacancy 2026 | BiharResult.live",
    socialTitle: "Bihar Latest Jobs 2026 and Bihar Sarkari Naukri Updates",
    description: "Check Bihar Latest Jobs 2026, Bihar Government Jobs, Bihar Vacancy 2026, Bihar Sarkari Naukri notices, and Apply Online Bihar Job links with official updates.",
    socialDescription: "Browse Bihar latest vacancy updates, online form links, and official recruitment notices for BPSC, Bihar Police, BPSSC, CSBC, and teacher recruitment.",
    keywords: "Bihar Latest Jobs 2026, Bihar Government Jobs, Bihar Vacancy 2026, Bihar Sarkari Naukri, Apply Online Bihar Job",
    heading: "Bihar Latest Jobs 2026 and Bihar Government Jobs Updates",
    intro: "Browse the latest Bihar job notifications, online form links, and vacancy pages. Open each post for eligibility, fees, age criteria, and official links.",
    summary: "This archive targets searches like Bihar latest job 2026, Bihar online form, Bihar vacancy, Sarkari Result Bihar job update, and Bihar recruitment notices. Browse every published job post below.",
    usefulHeading: "Useful Job Links",
    archiveHeading: "Latest Job Archive",
    usefulLinks: [
      { href: "../../index.html#latest-jobs", label: "Apply for Bihar Latest Jobs" },
      { href: "../../pages/guides/guide-bihar-job-result-admit-card-hub.html", label: "Bihar Jobs, Result and Admit Card Hub" },
      { href: "../../pages/guides/guides.html", label: "Bihar Sarkari Naukri Form Fill and Eligibility Guide" }
    ]
  },
  "admit-card": {
    pageTitle: "Bihar Admit Card 2026, Latest Admit Card Bihar, Exam Date Direct Links | BiharResult.live",
    socialTitle: "Bihar Admit Card 2026 and Bihar Exam Date Updates",
    description: "Check Bihar Admit Card 2026, Latest Admit Card Bihar, Download Admit Card Bihar links, exam date schedules, and hall ticket direct routes on BiharResult.live.",
    socialDescription: "Browse Bihar admit card, exam date, call letter, and hall-ticket updates with official download links and reporting guidance.",
    keywords: "Bihar Admit Card 2026, Latest Admit Card Bihar, Download Admit Card Bihar, Exam Admit Card Direct Link, Bihar Exam Date 2026",
    heading: "Bihar Admit Card 2026 and Exam Date Updates",
    intro: "Browse Bihar admit card updates and open each post for download links, exam date, hall ticket, DV call letter, and reporting instructions.",
    summary: "This admit card archive is useful for searches like Bihar Admit Card 2026, exam date update, hall ticket download, Sarkari Result Bihar admit card, and official admit card notice. Browse every published admit card post below.",
    usefulHeading: "Useful Admit Card Links",
    archiveHeading: "Admit Card Archive",
    usefulLinks: [
      { href: "../../index.html#admit-card", label: "Download Bihar Admit Card 2026" },
      { href: "../../pages/guides/guide-bihar-job-result-admit-card-hub.html", label: "Bihar Jobs, Result and Admit Card Hub" },
      { href: "../../pages/guides/guides.html", label: "Bihar Exam Date and Admit Card Support Guide" }
    ]
  },
  admission: {
    pageTitle: "Bihar Admission 2026, Apply Online Admission Bihar, College Admission Updates | BiharResult.live",
    socialTitle: "Bihar Admission 2026 and Bihar College Admission Updates",
    description: "Check Bihar Admission 2026, Apply Online Admission Bihar links, Bihar College Admission updates, counselling notices, and official student admission routes.",
    socialDescription: "Browse Bihar admission forms, counselling dates, and college admission notices for Bihar students with official links.",
    keywords: "Bihar Admission 2026, Apply Online Admission Bihar, Bihar College Admission Update, Bihar admission form, Bihar student admission",
    heading: "Bihar Admission 2026 Updates",
    intro: "Browse admission notices, forms, counselling updates, and official institution links.",
    summary: "This archive targets searches like Bihar Admission 2026, Bihar admission form, college counselling update, and admission notice for students in Bihar. Browse every published admission post below.",
    usefulHeading: "Useful Admission Links",
    archiveHeading: "Admission Archive",
    usefulLinks: [
      { href: "../../index.html#admission", label: "See Bihar Admission Details" },
      { href: "../../pages/guides/guides.html", label: "Apply Online Admission Bihar Guide" }
    ]
  },
  scholarship: {
    pageTitle: "Bihar Scholarship 2026, Scholarship Apply Online Bihar, Student Updates | BiharResult.live",
    socialTitle: "Bihar Scholarship 2026 and Bihar Student Scholarship Update",
    description: "Check Bihar Scholarship 2026, Scholarship Apply Online Bihar links, eligibility rules, required documents, and Bihar student scholarship updates.",
    socialDescription: "Browse Bihar scholarship official links, apply steps, eligibility notes, and student scholarship payment-status updates.",
    keywords: "Bihar Scholarship 2026, Scholarship Apply Online Bihar, Bihar Student Scholarship Update, Bihar scholarship portal, scholarship eligibility Bihar",
    heading: "Bihar Scholarship 2026 Updates",
    intro: "Browse scholarship posts for eligibility, portal links, and important official notices.",
    summary: "This page helps students searching Bihar Scholarship 2026, scholarship portal link, eligibility details, and payment status updates. Browse every published scholarship post below.",
    usefulHeading: "Useful Scholarship Links",
    archiveHeading: "Scholarship Archive",
    usefulLinks: [
      { href: "../../index.html#scholarship", label: "View Bihar Scholarship Update" },
      { href: "../../pages/guides/guide-post-matric-scholarship-apply.html", label: "Scholarship Apply Online Bihar Guide" }
    ]
  },
  "sarkari-yojana": {
    pageTitle: "Sarkari Yojana Bihar 2026, Benefits, Eligibility, Official Link | BiharResult.live",
    socialTitle: "Sarkari Yojana Bihar 2026, Benefits, Eligibility, Official Link",
    description: "Check Sarkari Yojana Bihar 2026 updates, benefit details, eligibility notes, documents, and official links on BiharResult.live.",
    socialDescription: "Browse Bihar Sarkari Yojana updates with benefit details, eligibility notes, documents, and official links.",
    keywords: "Sarkari Yojana Bihar 2026, Bihar yojana, Bihar scheme update, Bihar benefit eligibility, official yojana link",
    heading: "Sarkari Yojana",
    intro: "Browse Bihar scheme and welfare notifications with direct official service links.",
    summary: "This yojana archive supports searches like Sarkari Yojana Bihar 2026, Bihar scheme benefits, official Bihar yojana link, and eligibility details for citizen services. Browse every published yojana post below.",
    usefulHeading: "Useful Yojana Links",
    archiveHeading: "Yojana Archive",
    usefulLinks: [
      { href: "../../index.html#sarkari-yojana", label: "Homepage Sarkari Yojana Section" },
      { href: "../../pages/guides/guides.html", label: "Guide Library for Documents and Applications" }
    ]
  },
  verification: {
    pageTitle: "Bihar Verification Service, Certificate Check, Official Portal Link | BiharResult.live",
    socialTitle: "Bihar Verification Service, Certificate Check, Official Portal Link",
    description: "Check Bihar verification service updates, certificate check links, application status tools, and official portal access on BiharResult.live.",
    socialDescription: "Browse Bihar verification service updates and official portal links for certificate and public-service checks.",
    keywords: "Bihar verification service, certificate check Bihar, application status Bihar, official verification portal, Bihar service verification",
    heading: "Verification",
    intro: "Open verification updates and official service links for certificate and status checks.",
    summary: "This page is designed for searches like Bihar verification service, certificate check Bihar, application status link, and official portal verification. Browse every published verification post below.",
    usefulHeading: "Useful Verification Links",
    archiveHeading: "Verification Archive",
    usefulLinks: [
      { href: "../../index.html#verification", label: "Homepage Verification Section" },
      { href: "../../pages/guides/guides.html", label: "Guide Library for Status and Document Support" }
    ]
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const numeric = Number.parseInt(code, 10);
      return Number.isFinite(numeric) ? String.fromCharCode(numeric) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const numeric = Number.parseInt(code, 16);
      return Number.isFinite(numeric) ? String.fromCharCode(numeric) : "";
    });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value) {
  return stripHtml(value)
    .replace(/Author:\s*[^.|\n]+/gi, "")
    .replace(/Tag:\s*[^.|\n]+/gi, "")
    .replace(/\s*Read more\s*$/gi, "")
    .replace(/[ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¿Ãƒâ€šÃ‚Â½ÃƒÂ¯Ã‚Â¿Ã‚Â½]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimForMeta(text, max = 158) {
  const plain = cleanText(text);
  if (!plain) return "";
  if (plain.length <= max) return plain;
  const sliced = plain.slice(0, max - 1);
  const safe = sliced.includes(" ") ? sliced.slice(0, sliced.lastIndexOf(" ")) : sliced;
  return `${safe.trim()}...`;
}

function urlHost(url) {
  try {
    return new URL(cleanText(url || "")).hostname.toLowerCase();
  } catch (error) {
    return "";
  }
}

function isInternalSiteUrl(url) {
  const host = urlHost(url);
  return !host || host === "biharresult.live" || host.endsWith(".biharresult.live");
}

function isWeakActionLabel(label) {
  const text = cleanText(label || "").toLowerCase();
  if (!text) return true;
  return /^(open link|click here|source link|official link|open post|open biharresult\.live post)$/i.test(text)
    || /open biharresult\.live post/i.test(text);
}

function defaultPrimaryLabelByCategory(category) {
  const key = cleanText(category || "");
  if (key === "Latest Results") return "Bihar Result Check Link";
  if (key === "Admit Card") return "Bihar Admit Card Download Link";
  if (key === "Latest Jobs") return "Bihar Job Application Link";
  if (key === "Scholarship") return "Bihar Scholarship Portal Link";
  if (key === "Admission") return "Bihar Admission Portal Link";
  if (key === "Verification") return "Verification Status Link";
  if (key === "Sarkari Yojana") return "Yojana Official Portal Link";
  return "Official Website Link";
}

function normalizePrimaryLabel(label, url, category) {
  const cleaned = cleanText(label || "");
  const safeUrl = cleanText(url || "");
  if (isInternalSiteUrl(safeUrl) || isWeakActionLabel(cleaned)) {
    return defaultPrimaryLabelByCategory(category);
  }
  return cleaned;
}

function normalizeIsoDay(value) {
  const iso = normalizeIsoDate(value);
  if (!iso) return "";
  return iso;
}

function dayDiffFromBuild(value) {
  const iso = normalizeIsoDay(value);
  if (!iso) return 0;
  const a = new Date(`${iso}T00:00:00+05:30`);
  const b = new Date(`${BUILD_DATE}T00:00:00+05:30`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function extractExternalLinks(post) {
  const links = [];
  const push = (url) => {
    const cleaned = cleanText(url || "");
    if (!/^https?:\/\//i.test(cleaned)) return;
    if (isInternalSiteUrl(cleaned)) return;
    links.push(cleaned);
  };

  push(post?.sourceUrl);
  (post?.importantLinks || []).forEach((item) => push(item?.url));

  return Array.from(new Set(links));
}

function computePostQuality(post, folder) {
  const slug = cleanText(post?.slug || "");
  const title = cleanText(post?.title || "");
  const shortInfo = cleanText(post?.shortInfo || "");
  const longDescription = cleanText(post?.longDescription || "");
  const category = cleanText(post?.category || FOLDER_TO_CATEGORY[folder] || "Latest Results");
  const forceIndexable = FORCE_INDEXABLE_SLUGS.has(slug);
  const importantDatesCount = Array.isArray(post?.importantDates) ? post.importantDates.length : 0;
  const eligibilityCount = Array.isArray(post?.eligibility) ? post.eligibility.length : 0;
  const linkCount = Array.isArray(post?.importantLinks) ? post.importantLinks.length : 0;
  const externalLinks = extractExternalLinks(post);
  const authorityExternalCount = externalLinks.filter((url) => TRUSTED_AUTHORITY_HOST_PATTERN.test(urlHost(url))).length;

  const isRoundupSlug = ROUNDUP_SLUG_PATTERN.test(slug);
  const isOfficialUpdateSlug = OFFICIAL_UPDATE_SLUG_PATTERN.test(slug);
  const weakSlug = WEAK_SLUG_PATTERN.test(slug);
  const serviceStyleSlug = /(service-link-\d+-\d+|official-information-\d+-\d+|official-portal-link-\d+-\d+)/i.test(slug);
  const genericTitle = GENERIC_TITLE_PATTERN.test(title);
  const selfSource = isInternalSiteUrl(post?.sourceUrl || "");
  const staleRoundup = /(?:today|yesterday)-highlights-\d{4}-\d{2}-\d{2}$/i.test(slug) && dayDiffFromBuild(post?.updatedAt || post?.publishedAt || "") > 4;
  const lowValueTemplateCategory = ["Admission", "Scholarship", "Sarkari Yojana", "Verification"].includes(category);
  const hardBlockLowValueTemplate = !forceIndexable && (
    isRoundupSlug
    || ((isOfficialUpdateSlug || serviceStyleSlug) && lowValueTemplateCategory)
  );

  let score = 0;
  const reasons = [];

  if (title.length >= 34) score += 2;
  else if (title.length >= 24) score += 1;
  else reasons.push("short-title");

  if (shortInfo.length >= 120) score += 2;
  else if (shortInfo.length >= 80) score += 1;
  else reasons.push("thin-short-info");

  if (longDescription.length >= 220) score += 2;
  else if (longDescription.length >= 130) score += 1;
  else reasons.push("thin-long-description");

  if (importantDatesCount >= 2) score += 1;
  if (eligibilityCount >= 1) score += 1;
  if (linkCount >= 2) score += 1;
  if (externalLinks.length >= 1) score += 2;
  if (authorityExternalCount >= 1) score += 2;

  if (weakSlug) {
    score -= 4;
    reasons.push("weak-pattern-slug");
  }
  if (serviceStyleSlug) {
    score -= 5;
    reasons.push("directory-style-service-slug");
  }
  if (genericTitle) {
    score -= 3;
    reasons.push("generic-title-pattern");
  }
  if (weakSlug && authorityExternalCount === 0) {
    score -= 3;
    reasons.push("weak-slug-without-authority-links");
  }
  if (weakSlug && ["Admission", "Scholarship", "Sarkari Yojana", "Verification"].includes(category) && authorityExternalCount < 2) {
    score -= 3;
    reasons.push("weak-category-patterned-page");
  }
  if (selfSource && externalLinks.length === 0) {
    score -= 3;
    reasons.push("no-authority-source");
  }
  if (staleRoundup) {
    score -= 3;
    reasons.push("stale-roundup");
  }
  if (category === "Verification" && externalLinks.length === 0) {
    score -= 2;
    reasons.push("verification-without-authority-link");
  }

  const indexable = (forceIndexable || score >= 4) && !hardBlockLowValueTemplate;
  if (hardBlockLowValueTemplate) {
    reasons.push("hard-blocked-low-value-template");
  }
  const canonicalHref = indexable ? pageUrl(folder, slug) : sectionUrl(folder);
  const robotsMeta = indexable
    ? "index, follow, max-image-preview:large, max-snippet:-1"
    : "noindex, follow, max-image-preview:large, max-snippet:-1";

  return {
    indexable,
    score,
    reasons: forceIndexable ? ["force-indexable"] : reasons,
    canonicalHref,
    robotsMeta,
    qualityTier: forceIndexable ? "high" : (indexable ? "standard" : "low")
  };
}

function shouldExcludeFromCatalog(post, folder) {
  const quality = {
    indexable: post?.indexable !== false,
    score: Number(post?.qualityScore || 0),
    reasons: Array.isArray(post?.qualityReasons) ? post.qualityReasons : []
  };
  const action = classifyDiscoveryRiskGroup(post, folder, quality);
  return action?.group === "delete_or_stop_generating" || action?.group === "merge_with_stronger_page";
}

function discoveryGroupReason(groupKey) {
  return DISCOVERED_RISK_GROUPS[groupKey]?.reason || "";
}

function classifyDiscoveryRiskGroup(post, folder, quality = null) {
  const slug = cleanText(post?.slug || "");
  if (!slug) return null;

  const category = cleanText(post?.category || FOLDER_TO_CATEGORY[folder] || "Latest Results");
  const resolvedQuality = quality || computePostQuality(post, folder);
  const score = Number(resolvedQuality?.score || 0);
  const reasons = Array.isArray(resolvedQuality?.reasons) ? resolvedQuality.reasons : [];
  const isIndexable = Boolean(resolvedQuality?.indexable);

  const isRoundup = ROUNDUP_SLUG_PATTERN.test(slug);
  const isOfficialUpdate = OFFICIAL_UPDATE_SLUG_PATTERN.test(slug);
  const isServiceStyle = SERVICE_STYLE_SLUG_PATTERN.test(slug);
  const isWeakPattern = WEAK_SLUG_PATTERN.test(slug);
  const isNumberedTemplate = isOfficialUpdate || isServiceStyle;

  if (isRoundup) {
    return { group: "merge_with_stronger_page", reason: discoveryGroupReason("merge_with_stronger_page") };
  }

  if (
    isNumberedTemplate
    && ["Admission", "Sarkari Yojana", "Verification", "Scholarship"].includes(category)
    && score <= 0
  ) {
    return { group: "delete_or_stop_generating", reason: discoveryGroupReason("delete_or_stop_generating") };
  }

  if (isWeakPattern && isIndexable) {
    return { group: "remove_from_sitemap", reason: discoveryGroupReason("remove_from_sitemap") };
  }

  if (isWeakPattern && !isIndexable) {
    return { group: "noindex_intentionally", reason: discoveryGroupReason("noindex_intentionally") };
  }

  if (
    !isIndexable
    && reasons.some((item) => ["short-title", "thin-short-info", "thin-long-description", "no-authority-source"].includes(item))
  ) {
    return { group: "keep_and_improve", reason: discoveryGroupReason("keep_and_improve") };
  }

  return null;
}

function buildDiscoveredRiskGroupReport(catalog) {
  const rows = Array.isArray(catalog) ? catalog : [];
  const grouped = Object.fromEntries(
    Object.entries(DISCOVERED_RISK_GROUPS).map(([key, value]) => [key, {
      label: value.label,
      reason: value.reason,
      urlPatterns: value.urlPatterns,
      count: 0,
      categories: [],
      sampleUrls: []
    }])
  );

  rows.forEach((post) => {
    const slug = cleanText(post?.slug || "");
    if (!slug) return;
    const category = cleanText(post?.category || "Other");
    const folder = CATEGORY_TO_FOLDER[category];
    if (!folder) return;

    const quality = {
      indexable: post?.indexable !== false,
      score: Number(post?.qualityScore || 0),
      reasons: Array.isArray(post?.qualityReasons) ? post.qualityReasons : []
    };
    const action = classifyDiscoveryRiskGroup(post, folder, quality);
    if (!action) return;

    const target = grouped[action.group];
    if (!target) return;
    target.count += 1;
    if (!target.categories.includes(category)) {
      target.categories.push(category);
    }
    if (target.sampleUrls.length < 12) {
      target.sampleUrls.push(pageUrl(folder, slug));
    }
  });

  return grouped;
}

function sectionUrl(folder) {
  return `https://biharresult.live/sections/${folder}/`;
}

function pageUrl(folder, slug) {
  return `https://biharresult.live/sections/${folder}/${slug}.html`;
}

function getKeywordPlan(post) {
  const category = cleanText(post?.category || "");
  const combined = `${cleanText(post?.title || "")} ${cleanText(post?.department || "")}`.toLowerCase();

  const plans = {
    "Latest Results": {
      primary: "Bihar Result 2026",
      related: [
        "Latest Bihar Result",
        "Bihar Board Result 2026",
        "Bihar University Result 2026",
        "Sarkari Result Bihar",
        "Bihar Result Direct Link"
      ],
      heading: "Latest Bihar Result 2026 Summary"
    },
    "Latest Jobs": {
      primary: "Bihar Latest Jobs 2026",
      related: [
        "Bihar Government Jobs",
        "Bihar Vacancy 2026",
        "Bihar Sarkari Naukri",
        "Apply Online Bihar Job",
        "Bihar Job Alert May 2026"
      ],
      heading: "Bihar Latest Jobs 2026 Summary"
    },
    "Admit Card": {
      primary: "Bihar Admit Card 2026",
      related: [
        "Latest Admit Card Bihar",
        "Download Admit Card Bihar",
        "Exam Admit Card Direct Link",
        "Bihar Exam Date 2026",
        "Bihar Police Admit Card 2026"
      ],
      heading: "Bihar Admit Card 2026 Summary"
    },
    Scholarship: {
      primary: "Bihar Scholarship 2026",
      related: [
        "Scholarship Apply Online Bihar",
        "Bihar Student Scholarship Update",
        "Bihar Student Update",
        "Bihar Exam News"
      ],
      heading: "Bihar Scholarship 2026 Summary"
    },
    Admission: {
      primary: "Bihar Admission 2026",
      related: [
        "Apply Online Admission Bihar",
        "Bihar College Admission Update",
        "Bihar University Result 2026",
        "Bihar Student Update"
      ],
      heading: "Bihar Admission 2026 Summary"
    },
    "Sarkari Yojana": {
      primary: "Bihar Student Update",
      related: [
        "Bihar Scholarship 2026",
        "Bihar Admission 2026",
        "Bihar Notification 2026",
        "Bihar Exam News"
      ],
      heading: "Bihar Student Support Summary"
    },
    Verification: {
      primary: "Bihar Student Update",
      related: [
        "Bihar Result Direct Link",
        "Bihar Notification 2026",
        "Bihar Exam Date 2026",
        "Bihar Exam News"
      ],
      heading: "Bihar Verification and Student Update Summary"
    }
  };

  const chosen = plans[category] || {
    primary: "Bihar Student Update",
    related: ["Bihar Result 2026", "Bihar Latest Jobs 2026", "Bihar Admit Card 2026"],
    heading: "Bihar Student Update Summary"
  };

  const trendRelated = [];
  if (combined.includes("bpsc") || combined.includes("72nd")) {
    trendRelated.push("BPSC 72nd CCE 2026", "BPSC 72nd apply online", "BPSC 72nd eligibility", "BPSC 72nd last date");
  }
  if (combined.includes("bihar police") || combined.includes("constable")) {
    trendRelated.push("Bihar Police Constable DV 2026", "Special Branch Constable 2026", "Driver Constable Result 2026");
  }
  if (combined.includes("bpssc") || combined.includes("havildar")) {
    trendRelated.push("BPSSC Havildar Clerk Admit Card 2026");
  }
  if (combined.includes("teacher")) {
    trendRelated.push("Bihar Teacher Recruitment 2026");
  }

  return {
    primary: chosen.primary,
    related: Array.from(new Set([...chosen.related, ...trendRelated])).slice(0, 8),
    heading: chosen.heading
  };
}

function detectCategoryMeta(category) {
  const meta = {
    "Latest Results": {
      suffix: "Bihar Result 2026, Direct Link, Result Details",
      action: "Check Bihar result status, answer key route, cut off, score card details, and official result links",
      badge: "Result Update"
    },
    "Latest Jobs": {
      suffix: "Bihar Latest Jobs 2026, Apply Link, Eligibility, Dates",
      action: "Check Bihar Government jobs eligibility, Bihar vacancy details, last date, and official apply link",
      badge: "Application Update"
    },
    "Admit Card": {
      suffix: "Bihar Admit Card 2026, Download Link, Exam Date",
      action: "Check Bihar exam date, shift timing, and Bihar admit card download instructions",
      badge: "Admit Card Update"
    },
    Scholarship: {
      suffix: "Bihar Scholarship 2026, Apply Link, Eligibility, Last Date",
      action: "Check scholarship eligibility, required documents, and Bihar scholarship apply steps",
      badge: "Scholarship Update"
    },
    Admission: {
      suffix: "Bihar Admission 2026, Apply Link, Eligibility, Dates",
      action: "Check Bihar admission dates, eligibility, counselling process, and official links",
      badge: "Admission Update"
    },
    "Sarkari Yojana": {
      suffix: "Eligibility, Benefits, Official Link",
      action: "Check beneficiary rules, required documents, and official service links",
      badge: "Scheme Update"
    },
    Verification: {
      suffix: "Check Status, Official Link",
      action: "Check verification process, status steps, and official service links",
      badge: "Verification Update"
    }
  };

  return meta[category] || {
    suffix: "Important Update, Official Link",
    action: "Check important details and official links",
    badge: "Official Update"
  };
}

function buildSeoTitle(post) {
  const title = cleanText(post.title || "Latest Update");
  const section = cleanText(post.category || "Student Update");
  const candidate = `${title} | ${section} | BiharResult.live`;
  if (candidate.length <= 72) return candidate;
  const compact = `${title} | BiharResult.live`;
  return compact.length <= 72 ? compact : `${title.slice(0, 66).trim()}...`;
}

function buildSeoDescription(post) {
  const title = cleanText(post.title || "Latest update");
  const section = cleanText(post.category || "Latest Update");
  const department = cleanText(post.department || "");
  const keywordPlan = getKeywordPlan(post);
  const summaryRows = buildDetailedDateRows(post);
  const firstKey = summaryRows[0]
    ? `${cleanText(summaryRows[0].label)}: ${cleanText(summaryRows[0].value)}`
    : "";
  const intro = cleanText(post.shortInfo || post.longDescription || "");
  const cleanedIntro = intro.toLowerCase().startsWith(title.toLowerCase())
    ? intro.slice(title.length).replace(/^[:\-\s]+/, "")
    : intro;
  const actionLine = detectCategoryMeta(post.category).action;
  const parts = [
    `${title} ${section} update for ${keywordPlan.primary}`,
    department ? `${department} notice summary` : "",
    firstKey ? `Key update: ${firstKey}` : "",
    actionLine,
    keywordPlan.related.length ? `Also useful for: ${keywordPlan.related.slice(0, 3).join(", ")}` : "",
    cleanedIntro || "Check dates, eligibility, and official links before taking action.",
    "Use official source links for final verification."
  ].filter(Boolean);

  return trimForMeta(parts.join(". "));
}

function buildKeywords(post) {
  const title = cleanText(post.title || "");
  const keywordPlan = getKeywordPlan(post);
  const parts = [
    keywordPlan.primary,
    title,
    `${post.category || "Bihar Sarkari update"} 2026`,
    post.department || "",
    `${title} direct link`,
    `${title} official link`,
    ...keywordPlan.related,
    post.category === "Latest Results" ? "Sarkari Result Bihar" : "",
    post.category === "Latest Results" ? "Bihar Board Result 2026" : "",
    post.category === "Latest Jobs" ? "Bihar Government Jobs 2026" : "",
    post.category === "Admit Card" ? "Bihar Exam Date 2026" : "",
    "BiharResult.live"
  ]
    .map(cleanText)
    .filter(Boolean);

  const seen = new Set();
  return parts.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(", ");
}

function firstNonEmpty(values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function getMetaContent(content, { name, property }) {
  const patterns = [
    name ? new RegExp(`<meta\\s+[^>]*name="${name}"[^>]*content="([^"]*)"`, "i") : null,
    property ? new RegExp(`<meta\\s+[^>]*property="${property}"[^>]*content="([^"]*)"`, "i") : null
  ].filter(Boolean);

  for (const pattern of patterns) {
    const match = content.match(pattern);
    const value = cleanText(match?.[1] || "");
    if (value) return value;
  }

  return "";
}

function normalizeIsoDate(value) {
  const text = cleanText(value);
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function formatDisplayDate(value) {
  const text = cleanText(value);
  if (!text) return "";

  const simpleDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = simpleDateMatch
    ? new Date(`${simpleDateMatch[1]}-${simpleDateMatch[2]}-${simpleDateMatch[3]}T00:00:00+05:30`)
    : new Date(text);

  if (Number.isNaN(date.getTime())) return text;

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).format(date);
}

function findDateValue(rows, pattern) {
  return (rows || []).find((row) => pattern.test(String(row?.label || "")))?.value || "";
}

function findRowValue(rows, pattern) {
  return (rows || []).find((row) => pattern.test(cleanText(row?.label || "")))?.value || "";
}

function mergeRows(baseRows, extraRows, limit = 10) {
  const merged = [];
  const seen = new Set();

  [...(baseRows || []), ...(extraRows || [])].forEach((row) => {
    const label = cleanText(row?.label || "");
    const value = cleanText(row?.value || "");
    if (!label || !value) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ label, value });
  });

  return merged.slice(0, limit);
}

function buildAgeSummary(post) {
  const ageRows = Array.isArray(post.ageLimit) ? post.ageLimit : [];
  if (ageRows.length) {
    return ageRows
      .map((row) => `${cleanText(row.label || "Age")}: ${cleanText(row.value || "As per rules")}`)
      .filter(Boolean)
      .join(" | ");
  }

  return firstNonEmpty([
    findRowValue(post.eligibility, /age/i),
    "Check official age rules and relaxation details."
  ]);
}

function buildDetailedDateRows(post) {
  const baseRows = (post.importantDates || [])
    .filter((row) => !/^(updated(?:\s+date)?|arrival(?:\s+date)?)$/i.test(cleanText(row?.label || "")));
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || "Official Link");
  const extras = [];

  switch (post.category) {
    case "Latest Jobs":
      extras.push(
        { label: "Application Start", value: firstNonEmpty([findDateValue(post.importantDates, /apply start|online apply start|start date/i), "Check official notification"]) },
        { label: "Last Date", value: cleanText(findLastDate(post)) || "Check official notification" },
        { label: "Fee Payment Last Date", value: firstNonEmpty([findDateValue(post.importantDates, /fee payment|payment last date/i), "Same as last date / official notice"]) },
        { label: "Exam / Merit / Interview", value: firstNonEmpty([findDateValue(post.importantDates, /exam|interview|merit|result/i), "Will be notified later"]) }
      );
      break;
    case "Latest Results":
      extras.push(
        { label: "Result Status", value: firstNonEmpty([findDateValue(post.importantDates, /result declared|result date|result/i), `${primaryLabel} section is available below`]) },
        { label: "Exam / Session", value: firstNonEmpty([findDateValue(post.importantDates, /exam date|session|paper/i), "Check official exam schedule"]) },
        { label: "Score Card / Marksheet", value: "Download after checking the result if provided on the official portal." }
      );
      break;
    case "Admit Card":
      extras.push(
        { label: "Admit Card Status", value: firstNonEmpty([findDateValue(post.importantDates, /admit card|call letter|hall ticket/i), "Check official portal"]) },
        { label: "Exam / DV Date", value: firstNonEmpty([findDateValue(post.importantDates, /exam|dv|verification|interview/i), "See official schedule"]) },
        { label: "Reporting Advice", value: "Reach the center/venue as per the timing mentioned on admit card or notice." }
      );
      break;
    case "Admission":
      extras.push(
        { label: "Application Start", value: firstNonEmpty([findDateValue(post.importantDates, /apply start|start date|registration start/i), "Check official notice"]) },
        { label: "Last Date", value: cleanText(findLastDate(post)) || "Check official notice" },
        { label: "Merit / Counselling", value: firstNonEmpty([findDateValue(post.importantDates, /merit|counselling|seat allotment/i), "Will be updated by the institution"]) }
      );
      break;
    case "Scholarship":
      extras.push(
        { label: "Application Window", value: firstNonEmpty([findDateValue(post.importantDates, /apply|start|last date/i), "Check scholarship portal notice"]) },
        { label: "Verification / Approval", value: firstNonEmpty([findDateValue(post.importantDates, /verification|approval/i), "As per official portal process"]) },
        { label: "Payment / Benefit Status", value: firstNonEmpty([findDateValue(post.importantDates, /payment|benefit/i), "Track from official portal if available"]) }
      );
      break;
    case "Sarkari Yojana":
      extras.push(
        { label: "Scheme Status", value: firstNonEmpty([findDateValue(post.importantDates, /status|start|last date/i), "Refer official scheme notice"]) },
        { label: "Benefit Processing", value: "Benefit release timeline is subject to official departmental approval." },
        { label: "Important Note", value: "Check district/category-specific rules before applying or verifying status." }
      );
      break;
    case "Verification":
      extras.push(
        { label: "Service Status", value: "Online verification/check link is available in the Important Links section." },
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
        { label: "Service Fee", value: "Usually no fee is required to check the result online unless the official portal mentions a paid copy/service." },
        { label: "Marksheet Note", value: "Original marksheet or certificate collection rules will follow board/university instructions." }
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
  const loginDetails = firstNonEmpty([
    findRowValue(post.eligibility, /required details|login|roll number|registration|captcha|document/i),
    findRowValue(post.importantDates, /login/i)
  ]);
  const ageSummary = buildAgeSummary(post);
  const extras = [];

  switch (post.category) {
    case "Latest Jobs":
      extras.push(
        { label: "Who Can Apply", value: firstNonEmpty([findRowValue(post.eligibility, /eligibility|who can apply|who should check/i), "Candidates meeting the post-wise qualification and age rules can apply."]) },
        { label: "Qualification", value: firstNonEmpty([findRowValue(post.eligibility, /qualification|education|eligibility/i), "Refer official post-wise educational qualification in the notification."]) },
        { label: "Age Rule", value: ageSummary },
        { label: "Documents Needed", value: "Keep photo, signature, ID proof, qualification certificates, category certificate, and mobile/email details ready." }
      );
      break;
    case "Latest Results":
      extras.push(
        { label: "Who Can Check", value: firstNonEmpty([findRowValue(post.eligibility, /who can check|candidate|student/i), "Students/candidates who appeared in the examination can check the result."]) },
        { label: "Login Details", value: loginDetails || "Keep roll number, registration details, and captcha/login information ready." },
        { label: "Student Advice", value: "Verify name, subject-wise marks, division, and category details after result download." }
      );
      break;
    case "Admit Card":
      extras.push(
        { label: "Who Can Download", value: firstNonEmpty([findRowValue(post.eligibility, /who can download|who should check|candidate/i), "Registered candidates can download the admit card or call letter."]) },
        { label: "Login Details", value: loginDetails || "Keep registration number, date of birth, password, or roll number ready." },
        { label: "What To Verify", value: "Check exam center, exam date, shift timing, photo, signature, and reporting instructions." }
      );
      break;
    case "Admission":
      extras.push(
        { label: "Who Can Apply", value: firstNonEmpty([findRowValue(post.eligibility, /eligibility|who can apply/i), "Students who meet the course-wise admission criteria can apply."]) },
        { label: "Academic Requirement", value: firstNonEmpty([findRowValue(post.eligibility, /qualification|required details|course/i), "Check course-wise qualification and subject requirement in the official notice."]) },
        { label: "Documents Needed", value: "Keep marksheet, transfer certificate, category certificate, ID proof, photo, and valid contact details ready." }
      );
      break;
    case "Scholarship":
      extras.push(
        { label: "Eligible Students", value: firstNonEmpty([findRowValue(post.eligibility, /eligibility|beneficiary|student/i), "Eligible students as per class, category, income, and domicile rules can apply."]) },
        { label: "Required Documents", value: "Prepare income certificate, caste certificate, Aadhaar, bank passbook, marksheet, and institution details." },
        { label: "Bank / Aadhaar Note", value: "Student bank details should match the information submitted on the official portal." }
      );
      break;
    case "Sarkari Yojana":
      extras.push(
        { label: "Eligible Beneficiary", value: firstNonEmpty([findRowValue(post.eligibility, /eligibility|beneficiary/i), "Only eligible beneficiaries under the official scheme rules should apply/check status."]) },
        { label: "Document Requirement", value: "Keep Aadhaar, address proof, income/category documents, and scheme-specific supporting papers ready." },
        { label: "Local Rule", value: "District, category, or income conditions may apply as per the official guidelines." }
      );
      break;
    case "Verification":
      extras.push(
        { label: "Who Can Use Service", value: firstNonEmpty([findRowValue(post.eligibility, /eligibility|who can/i), "Citizens/candidates with valid reference details can use this verification service."]) },
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

function buildStudentGuide(post, summaryRows, feeRows, eligibilityRows) {
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || "Official Link");
  const keyDate = summaryRows[0]
    ? `${cleanText(summaryRows[0].label)}: ${cleanText(summaryRows[0].value)}`
    : `Last Date / Status: ${cleanText(findLastDate(post)) || "Check official update"}`;
  const eligibilityNote = eligibilityRows[0]
    ? `${cleanText(eligibilityRows[0].label)}: ${cleanText(eligibilityRows[0].value)}`
    : "Eligibility: Check official notification for exact rules.";
  const feeNote = feeRows[0]
    ? `${cleanText(feeRows[0].label)}: ${cleanText(feeRows[0].value)}`
    : "Fee / Service Note: Check official portal before making any payment.";

  return [
    `First confirm the priority update: ${keyDate}.`,
    `Eligibility checkpoint: ${eligibilityNote}`,
    `Fee/service checkpoint: ${feeNote}`,
    `Next step: open ${primaryLabel} from Important Links and verify all instructions on the official portal before proceeding.`
  ];
}

function findLastDate(post) {
  return firstNonEmpty([
    findDateValue(post.importantDates, /application last date|last date|closing date/i),
    findDateValue(post.importantDates, /exam date/i),
    findDateValue(post.importantDates, /result declared date/i),
    findDateValue(post.importantDates, /admit card/i),
    post.updatedAt
  ]);
}

function getPrimaryLink(post) {
  const links = Array.isArray(post.importantLinks) ? post.importantLinks : [];
  if (!links.length) return null;

  const scored = links
    .map((item) => {
      const label = cleanText(item?.label || "");
      const url = cleanText(item?.url || "");
      if (!/^https?:\/\//i.test(url)) return null;

      let score = 0;
      if (!isInternalSiteUrl(url)) score += 8;
      if (TRUSTED_AUTHORITY_HOST_PATTERN.test(urlHost(url))) score += 6;
      if (/apply|download|check|official|notification|result|admit|portal|login|status/i.test(label)) score += 4;
      if (!isWeakActionLabel(label)) score += 3;
      if (cleanText(item?.type || "").toLowerCase() === "secondary") score += 1;

      return { item, score, label, url };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  if (!best) return null;

  return {
    ...best.item,
    label: normalizePrimaryLabel(best.label, best.url, post.category),
    url: best.url
  };
}

function defaultHowToApply(post) {
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || "official link");

  if (Array.isArray(post.howToApply) && post.howToApply.length) {
    return post.howToApply.map(cleanText).filter(Boolean);
  }

  if (post.category === "Latest Results") {
    return [
      "Open the official result link from the Important Links section.",
      "Enter the required roll number, registration number, date of birth, or captcha details.",
      "Submit the information carefully to view the result or status update.",
      "Verify your name, marks, category, and important details on the screen.",
      "Download or print the result page for counselling and future reference."
    ];
  }

  if (post.category === "Admit Card") {
    return [
      "Open the admit card download link from the Important Links section.",
      "Login with registration number, password, roll number, or date of birth as required.",
      "Download the admit card and verify exam date, shift, and exam center details.",
      "Check photo, signature, and reporting instructions before the exam day.",
      "Carry the printed admit card with valid ID proof if required."
    ];
  }

  if (post.category === "Verification") {
    return [
      "Open the official verification or status-check link.",
      "Enter the required reference number, application number, or certificate details.",
      "Submit the form carefully and wait for the status or verification response.",
      "Cross-check the displayed details with your original documents.",
      "Save the page, acknowledgment, or screenshot for future use."
    ];
  }

  return [
    "Read the full update and important instructions on this page.",
    `Open the ${primaryLabel} from the Important Links section.`,
    "Fill in or verify all required details carefully before final submission.",
    "Check the last date, fee details, and eligibility before proceeding.",
    "Save the final acknowledgment, result page, or downloaded document for future use."
  ];
}

function defaultBeforeStart(post) {
  if (Array.isArray(post.beforeYouStart) && post.beforeYouStart.length) {
    return post.beforeYouStart.map(cleanText).filter(Boolean);
  }

  const common = [
    "Read the official instructions carefully before taking any action.",
    "Use only the official links listed on this page for final confirmation.",
    "Keep your registration, roll number, and required documents ready.",
    "Verify dates and details again before submit, download, or result check."
  ];

  if (post.category === "Latest Jobs" || post.category === "Admission" || post.category === "Scholarship") {
    common.push("Check eligibility, category details, and fee information before applying.");
  }

  return common;
}

function defaultFaq(post) {
  const title = cleanText(post.title || "this update");
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || "official link");
  const lastDate = cleanText(findLastDate(post));
  const eligibilityLine = firstNonEmpty([
    findRowValue(post.eligibility, /eligibility|qualification|who can apply|who should check/i),
    (post.eligibility || [])[0]?.value,
    post.shortInfo,
    post.longDescription
  ]);

  if (post.category === "Latest Jobs") {
    return [
      {
        q: `What is the last date for ${title}?`,
        a: lastDate
          ? `The current key date shown for this recruitment is ${lastDate}. Final cutoff time, extension, or correction updates must be confirmed from the official notification/portal.`
          : "Check the Important Dates table on this page and verify the final schedule from the official notification."
      },
      {
        q: `Who can apply for ${title}?`,
        a: eligibilityLine
          ? `${eligibilityLine} Also verify age limit, category relaxation, and required certificates from the official advertisement before applying.`
          : "Use the Eligibility Details table for qualification, age rules, and category-wise conditions, then match them with the official notice."
      },
      {
        q: `Which official sources should I open before applying for ${title}?`,
        a: `Open ${primaryLabel} from the Important Links section, then check the Official Website and Notification block for the original advertisement and authority source links.`
      }
    ];
  }

  if (post.category === "Admit Card") {
    return [
      {
        q: `How can I download ${title}?`,
        a: `Open the ${primaryLabel} link in Important Links, log in with the required credentials, and download the admit card only from the official portal.`
      },
      {
        q: `What details should I check on ${title}?`,
        a: "Verify candidate name, roll/application number, exam date, shift, reporting time, center address, and exam-day instructions exactly as printed."
      },
      {
        q: `What should I do if details mismatch on ${title}?`,
        a: "Do not wait for exam day. Re-check your credentials, read the correction instructions in the official notice, and contact the authority helpdesk if required."
      }
    ];
  }

  if (post.category === "Latest Results") {
    return [
      {
        q: `How can I check ${title}?`,
        a: `Use ${primaryLabel} from Important Links, enter the required credentials (roll number/registration/date of birth/captcha), and submit exactly as per the official portal format.`
      },
      {
        q: `What details are required for ${title}?`,
        a: "Keep roll code/roll number, registration details, date of birth, and any portal-specific login information ready before opening the result page."
      },
      {
        q: `What should I check after viewing ${title}?`,
        a: "Check subject-wise marks/status, candidate details, qualifying status, and the next process such as scrutiny, counselling, or document verification."
      }
    ];
  }

  return [
    {
      q: `What is ${title}?`,
      a: cleanText(post.shortInfo || post.longDescription || `${title} is an official update listed on BiharResult.live.`)
    },
    {
      q: `What should I check before using ${title}?`,
      a: "Check key dates, eligibility/documents, and all official instructions first. Use only authority sources for final confirmation before any submission or payment."
    },
    {
      q: `Where can I find the official link for ${title}?`,
      a: `Use Important Links for ${primaryLabel}, then cross-check the Official Website and Notification section for the primary authority source.`
    }
  ];
}

function detectExistingRichPage(content, slug) {
  if (MANUAL_PRESERVE_SLUGS.has(slug)) return true;
  return content.includes('class="bseb-result-card"');
}

function parsePublishedDateFromHtml(content) {
  const metaDate = firstNonEmpty([
    normalizeIsoDate(getMetaContent(content, { property: "article:published_time" })),
    normalizeIsoDate(getMetaContent(content, { name: "article:published_time" })),
    normalizeIsoDate(content.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] || "")
  ]);

  if (metaDate) return metaDate;

  const match = content.match(/<strong>\s*Published:\s*<\/strong>\s*([^<]+)/i);
  const value = cleanText(match?.[1] || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

function parseUpdatedDateFromHtml(content) {
  return firstNonEmpty([
    normalizeIsoDate(getMetaContent(content, { property: "article:modified_time" })),
    normalizeIsoDate(getMetaContent(content, { name: "article:modified_time" })),
    normalizeIsoDate(content.match(/"dateModified"\s*:\s*"([^"]+)"/i)?.[1] || "")
  ]);
}

function parseLinksFromHtml(content) {
  const links = [];
  const regex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gis;
  let match;
  while ((match = regex.exec(content))) {
    const url = cleanText(match[1]);
    const label = cleanText(match[2]);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    links.push({ label: label || "Official Link", url });
  }
  return links;
}

function buildFallbackPost(filePath, content) {
  const folder = path.basename(path.dirname(filePath));
  const slug = path.basename(filePath, ".html");
  const category = FOLDER_TO_CATEGORY[folder] || "Latest Results";
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/is) || content.match(/<title>(.*?)<\/title>/is);
  const metaDescMatch = content.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const paragraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/is);
  const title = cleanText(titleMatch?.[1] || slug.replace(/-/g, " "));
  const description = cleanText(metaDescMatch?.[1] || paragraphMatch?.[1] || `${title} is an update page on BiharResult.live.`);
  const publishedAt = parsePublishedDateFromHtml(content) || "2026-02-18";
  const updatedAt = parseUpdatedDateFromHtml(content) || publishedAt;
  const links = parseLinksFromHtml(content);
  const primarySource = links[0] || null;

  return {
    slug,
    title,
    category,
    department: "Official Update",
    location: "Bihar",
    shortInfo: description,
    longDescription: description,
    publishedAt,
    updatedAt,
    sourceName: cleanText(primarySource?.label || "Official Source"),
    sourceUrl: primarySource?.url || "",
    importantDates: publishedAt ? [{ label: "Published Date", value: publishedAt }] : [],
    applicationFee: [],
    eligibility: [],
    vacancyDetails: [],
    importantLinks: links.slice(0, 4),
    howToApply: [],
    beforeYouStart: []
  };
}

function toIsoDateValue(value) {
  const direct = normalizeIsoDate(value);
  if (direct) return direct;

  const text = cleanText(value);
  if (!text) return "";

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateInTimeZone(date, "Asia/Kolkata");
}

function extractSectionHtml(content, headingPatterns) {
  for (const pattern of headingPatterns) {
    const regex = new RegExp(
      `<section[^>]*>[\\s\\S]*?<h2[^>]*>\\s*${pattern}\\s*<\\/h2>([\\s\\S]*?)<\\/section>`,
      "i"
    );
    const match = content.match(regex);
    if (match?.[1]) return match[1];
  }

  return "";
}

function extractParagraphs(content) {
  const items = [];
  const regex = /<p[^>]*>(.*?)<\/p>/gis;
  let match;
  while ((match = regex.exec(content))) {
    const text = cleanText(match[1]);
    if (text) items.push(text);
  }
  return items;
}

function extractListItems(content) {
  const items = [];
  const regex = /<li[^>]*>(.*?)<\/li>/gis;
  let match;
  while ((match = regex.exec(content))) {
    const text = cleanText(match[1]);
    if (text) items.push(text);
  }
  return items;
}

function extractStrongSpanFacts(content) {
  const facts = [];
  const regex = /<strong[^>]*>(.*?)<\/strong>\s*<span[^>]*>(.*?)<\/span>/gis;
  let match;
  while ((match = regex.exec(content))) {
    const label = cleanText(match[1]);
    const value = cleanText(match[2]);
    if (label && value) facts.push({ label, value });
  }
  return facts;
}

function findFactValue(facts, patterns) {
  for (const pattern of patterns) {
    const found = facts.find((item) => pattern.test(item.label));
    if (found?.value) return found.value;
  }
  return "";
}

function extractTableRowsFromSection(content, headingPatterns) {
  const sectionHtml = extractSectionHtml(content, headingPatterns);
  if (!sectionHtml) return [];

  const tableMatch = sectionHtml.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return [];

  const rows = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableMatch[1]))) {
    const cells = [];
    const cellRegex = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1]))) {
      const text = cleanText(cellMatch[2]);
      if (text) cells.push(text);
    }

    if (cells.length >= 3) {
      if (/^advt\.?\s*no\.?$|^post name$/i.test(cells[0]) && /^total/i.test(cells[1])) {
        continue;
      }
      rows.push({
        post: cells[0],
        total: cells[1],
        criteria: cells[2]
      });
      continue;
    }

    if (cells.length >= 2) {
      rows.push({
        label: cells[0],
        value: cells[1]
      });
    }
  }

  return rows;
}

function classifyImportantLink(label, url) {
  const text = cleanText(label || url || "");
  return /official|website|portal|home page|homepage|source/i.test(text) ? "secondary" : "primary";
}

function extractImportantLinks(content) {
  const sectionHtml = extractSectionHtml(content, ["Important Links"]);
  if (!sectionHtml) return [];

  const links = [];
  const cardRegex = /<div[^>]*link-card[^>]*>[\s\S]*?<strong[^>]*>(.*?)<\/strong>[\s\S]*?<a[^>]+href="([^"]+)"/gi;
  let match;

  while ((match = cardRegex.exec(sectionHtml))) {
    const label = cleanText(match[1]);
    const url = cleanText(match[2]);
    if (!label || !url) continue;
    links.push({ label, url, type: classifyImportantLink(label, url) });
  }

  if (links.length) return uniqueUrls(links).slice(0, 8);

  return uniqueUrls(parseLinksFromHtml(sectionHtml).map((item) => ({
    ...item,
    type: classifyImportantLink(item.label, item.url)
  }))).slice(0, 8);
}

function extractSourceLinks(content) {
  const sectionHtml = extractSectionHtml(content, ["Source References"]);
  if (!sectionHtml) return [];
  return uniqueUrls(parseLinksFromHtml(sectionHtml));
}

function extractSectionList(content, headingPatterns) {
  const sectionHtml = extractSectionHtml(content, headingPatterns);
  return sectionHtml ? extractListItems(sectionHtml) : [];
}

function buildCatalogPost(filePath, content, existingPost = {}) {
  const folder = path.basename(path.dirname(filePath));
  const slug = path.basename(filePath, ".html");
  const facts = extractStrongSpanFacts(content);
  const metaDescription = firstNonEmpty([
    getMetaContent(content, { name: "description" }),
    getMetaContent(content, { property: "og:description" })
  ]);
  const title = firstNonEmpty([
    cleanText(content.match(/<h1[^>]*>(.*?)<\/h1>/is)?.[1] || ""),
    cleanText(content.match(/<title>(.*?)<\/title>/is)?.[1] || "").replace(/\s*\|\s*BiharResult\.live.*$/i, ""),
    existingPost.title,
    slug.replace(/-/g, " ")
  ]);
  const lead = firstNonEmpty([
    cleanText(content.match(/<p[^>]*class="[^"]*lead[^"]*"[^>]*>(.*?)<\/p>/is)?.[1] || ""),
    cleanText(content.match(/<p[^>]*class="[^"]*seo-post-lead[^"]*"[^>]*>(.*?)<\/p>/is)?.[1] || ""),
    metaDescription,
    existingPost.shortInfo
  ]);
  const summaryParagraphs = extractParagraphs(
    extractSectionHtml(content, [
      "Result Summary",
      "Recruitment Summary",
      "Admit Card Summary",
      "Admission Summary",
      "Scholarship Summary",
      "Scheme Summary",
      "Verification Summary",
      "Post Details",
      "Summary"
    ])
  );
  const category = firstNonEmpty([
    getMetaContent(content, { property: "article:section" }),
    existingPost.category,
    FOLDER_TO_CATEGORY[folder],
    "Latest Results"
  ]);
  const publishedAt = firstNonEmpty([
    toIsoDateValue(getMetaContent(content, { property: "article:published_time" })),
    toIsoDateValue(content.match(/<strong>\s*Posted:\s*<\/strong>\s*([^<]+)/i)?.[1] || ""),
    toIsoDateValue(existingPost.publishedAt),
    "2026-02-18"
  ]);
  const updatedAt = firstNonEmpty([
    toIsoDateValue(getMetaContent(content, { property: "article:modified_time" })),
    toIsoDateValue(content.match(/<strong>\s*Modified:\s*<\/strong>\s*([^<]+)/i)?.[1] || ""),
    toIsoDateValue(existingPost.updatedAt),
    publishedAt
  ]);
  const importantDates = extractTableRowsFromSection(content, ["Important Dates(?: and Key Details)?"]);
  const applicationFee = extractTableRowsFromSection(content, ["Application Fee(?:\\s*\\/\\s*Service Fee)?"]);
  const eligibility = extractTableRowsFromSection(content, ["Eligibility Details"]);
  const vacancyDetails = extractTableRowsFromSection(content, ["Vacancy(?:\\s*\\/\\s*Seat\\s*\\/\\s*Category)? Details"]);
  const ageLimitItems = extractSectionList(content, ["Age Limit"]);
  const ageLimit = ageLimitItems.map((item) => {
    const separatorIndex = item.indexOf(":");
    if (separatorIndex === -1) {
      return { label: "Age", value: item };
    }
    return {
      label: cleanText(item.slice(0, separatorIndex)),
      value: cleanText(item.slice(separatorIndex + 1))
    };
  }).filter((item) => item.label && item.value);
  const importantLinks = extractImportantLinks(content);
  const sourceLinks = extractSourceLinks(content);
  const sourceCandidate = sourceLinks[0] || importantLinks.find((item) => item.type === "secondary") || importantLinks[0] || null;

  const candidate = {
    ...existingPost,
    slug,
    title,
    category,
    department: firstNonEmpty([
      findFactValue(facts, [/^department$/i, /^board$/i, /^agency$/i, /^conducting body$/i]),
      existingPost.department,
      "Official Update"
    ]),
    location: firstNonEmpty([
      findFactValue(facts, [/^location$/i, /^state$/i, /^region$/i]),
      existingPost.location,
      "Bihar"
    ]),
    shortInfo: lead,
    longDescription: firstNonEmpty([
      summaryParagraphs.join(" "),
      lead,
      metaDescription,
      existingPost.longDescription,
      existingPost.shortInfo
    ]),
    publishedAt,
    updatedAt,
    path: `sections/${folder}/${slug}.html`,
    image: firstNonEmpty([
      getMetaContent(content, { property: "og:image" }),
      existingPost.image
    ]),
    sourceName: firstNonEmpty([
      cleanText(sourceCandidate?.label || ""),
      existingPost.sourceName,
      "Official Source"
    ]),
    sourceUrl: firstNonEmpty([
      cleanText(sourceCandidate?.url || ""),
      existingPost.sourceUrl
    ]),
    importantDates: importantDates.length ? importantDates : Array.isArray(existingPost.importantDates) ? existingPost.importantDates : [],
    applicationFee: applicationFee.length ? applicationFee : Array.isArray(existingPost.applicationFee) ? existingPost.applicationFee : [],
    eligibility: eligibility.length ? eligibility : Array.isArray(existingPost.eligibility) ? existingPost.eligibility : [],
    ageLimit: ageLimit.length ? ageLimit : Array.isArray(existingPost.ageLimit) ? existingPost.ageLimit : [],
    vacancyDetails: vacancyDetails.length ? vacancyDetails : Array.isArray(existingPost.vacancyDetails) ? existingPost.vacancyDetails : [],
    importantLinks: importantLinks.length ? importantLinks : Array.isArray(existingPost.importantLinks) ? existingPost.importantLinks : [],
    howToApply: (() => {
      const parsed = extractSectionList(content, ["How To Proceed", "How To Fill Form\\s*\\/\\s*Check Update"]);
      return parsed.length ? parsed : Array.isArray(existingPost.howToApply) ? existingPost.howToApply : [];
    })(),
    beforeYouStart: (() => {
      const parsed = extractSectionList(content, ["Before You Start"]);
      return parsed.length ? parsed : Array.isArray(existingPost.beforeYouStart) ? existingPost.beforeYouStart : [];
    })()
  };

  const quality = computePostQuality(candidate, folder);
  return {
    ...candidate,
    indexable: quality.indexable,
    qualityScore: quality.score,
    qualityReasons: quality.reasons,
    canonicalTarget: quality.canonicalHref,
    qualityTier: quality.qualityTier
  };
}

function buildDataCatalog(sectionFiles, existingDataMap) {
  return sectionFiles
    .map((filePath) => {
      const slug = path.basename(filePath, ".html");
      const content = fs.readFileSync(filePath, "utf8");
      const post = buildCatalogPost(filePath, content, existingDataMap.get(slug) || {});
      const folder = path.basename(path.dirname(filePath));
      if (shouldExcludeFromCatalog(post, folder)) return null;
      return post;
    })
    .filter(Boolean)
    .sort(compareEntriesByDate);
}

function ensureSectionPostFiles(data) {
  let createdCount = 0;

  for (const post of data) {
    const folder = CATEGORY_TO_FOLDER[post.category];
    const slug = cleanText(post.slug || "");
    if (!folder || !slug) continue;
    const quality = computePostQuality({ ...post, slug }, folder);
    const action = classifyDiscoveryRiskGroup({ ...post, slug }, folder, quality);
    if (action?.group === "delete_or_stop_generating") continue;
    if (!quality.indexable && !FORCE_INDEXABLE_SLUGS.has(slug)) continue;

    const filePath = path.join(ROOT, "sections", folder, `${slug}.html`);
    if (fs.existsSync(filePath)) continue;

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buildHtml(post, folder, data), "utf8");
    createdCount += 1;
  }

  return createdCount;
}

function renderTableRows(rows, keyA = "label", keyB = "value") {
  return rows
    .map((row) => `<tr><th scope="row">${escapeHtml(cleanText(row[keyA]))}</th><td>${escapeHtml(cleanText(row[keyB]))}</td></tr>`)
    .join("\n");
}

function renderVacancyRows(rows) {
  const normalizedRows = rows.map((row) => ({
    post: cleanText(row.post || row.label || "Post"),
    total: cleanText(row.total || row.value || ""),
    criteria: cleanText(row.criteria || "")
  }));
  const hasCriteria = normalizedRows.some((row) => row.criteria);
  const detailedRows = normalizedRows.filter((row) => row.criteria || /^total$/i.test(row.post));

  if (hasCriteria && detailedRows.length) {
    const body = detailedRows
      .map((row) => {
        const postName = row.post;
        const isTotalRow = /^total$/i.test(postName);
        const advtNo = isTotalRow ? "" : cleanText(row.criteria || "-").replace(/^Advt\.\s*No\.?\s*/i, "");
        const total = row.total || "-";
        return `<tr><td>${escapeHtml(advtNo)}</td><td>${escapeHtml(postName)}</td><td>${escapeHtml(total)}</td></tr>`;
      })
      .join("\n");

    return `<thead><tr><th>Advt. No.</th><th>Post Name</th><th>Total Post</th></tr></thead><tbody>${body}</tbody>`;
  }

  return normalizedRows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.post)}</th><td>${escapeHtml(row.total || row.criteria || "-")}<\/td></tr>`)
    .join("\n");
}
function uniqueUrls(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = String(item.url || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceLabelFromUrl(url) {
  const value = cleanText(url || "");
  try {
    const host = new URL(value).hostname.replace(/^www\./i, "");
    return host || value;
  } catch (error) {
    return value;
  }
}

function normalizeSourceLabel(label, url) {
  const cleaned = cleanText(label || "");
  if (!cleaned) return `Official Source: ${sourceLabelFromUrl(url)}`;
  if (/official source:/i.test(cleaned)) return cleaned;
  if (/click here|open link|source link/i.test(cleaned)) {
    return `Official Source: ${sourceLabelFromUrl(url)}`;
  }
  return `Official Source: ${cleaned}`;
}

function officialLinkNote(label) {
  const text = cleanText(label || "");
  if (/notification|advertisement|advt|pdf|prospectus|brochure/i.test(text)) {
    return "Primary official notification document for exact rules.";
  }
  if (/login|apply|registration|portal/i.test(text)) {
    return "Official application/login portal published by the authority.";
  }
  if (/result|score|mark|status|check/i.test(text)) {
    return "Official result or status-check source link.";
  }
  if (/admit|hall ticket|call letter/i.test(text)) {
    return "Official admit-card or call-letter download source.";
  }
  return "Official department source link for final verification.";
}

function buildSourceList(post) {
  const items = [];
  if (cleanText(post.sourceUrl) && !isInternalSiteUrl(cleanText(post.sourceUrl))) {
    items.push({
      label: normalizeSourceLabel(post.sourceName || post.sourceUrl, post.sourceUrl),
      url: cleanText(post.sourceUrl)
    });
  }
  for (const link of post.importantLinks || []) {
    if (/^https?:\/\//i.test(String(link.url || "")) && !isInternalSiteUrl(String(link.url || ""))) {
      items.push({
        label: normalizeSourceLabel(link.label || link.url, link.url),
        url: cleanText(link.url)
      });
    }
  }
  return uniqueUrls(items).slice(0, 6);
}

function relativeSectionHref(currentFolder, category) {
  const targetFolder = CATEGORY_TO_FOLDER[category];
  if (!targetFolder) return "../../index.html";
  return targetFolder === currentFolder ? "./" : `../${targetFolder}/`;
}

function relativePostHref(currentFolder, candidate) {
  const targetFolder = CATEGORY_TO_FOLDER[candidate.category] || cleanText(candidate.folder || "");
  if (!targetFolder || !cleanText(candidate.slug)) return "../../index.html";
  return targetFolder === currentFolder
    ? `./${candidate.slug}.html`
    : `../${targetFolder}/${candidate.slug}.html`;
}

function tokenizeRelatedText(...values) {
  return values
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !RELATED_STOP_WORDS.has(token));
}

function extractIntentTags(...values) {
  const text = values.join(" ").toLowerCase();
  const probes = [
    "bpsc", "bssc", "bpssc", "csbc", "bseb", "bceceb", "btsc", "upsc", "ibps",
    "ssc", "rrb", "railway", "neet", "jee", "cuet", "police", "constable",
    "teacher", "inter", "matric", "scholarship", "admission", "counselling",
    "admit", "result", "verification", "yojana"
  ];
  return probes.filter((probe) => text.includes(probe));
}

function buildOfficialLinkItems(post, sourceItems) {
  const officialPattern = /(official|notification|notice|website|portal|apply|result|download|admit|login|counselling|schedule)/i;
  const govPattern = /(gov\.in|nic\.in|ac\.in|org\.in|results\.biharboardonline\.com|matricbiharboard\.com)/i;
  const items = [];

  (post.importantLinks || []).forEach((item) => {
    const rawLabel = cleanText(item.label || "Official Link");
    const url = cleanText(item.url || "");
    if (!/^https?:\/\//i.test(url)) return;
    if (isInternalSiteUrl(url)) return;
    if (!officialPattern.test(rawLabel) && !govPattern.test(url)) return;
    const label = normalizePrimaryLabel(rawLabel, url, post.category);
    items.push({
      label,
      note: officialLinkNote(label),
      url
    });
  });

  sourceItems.forEach((item) => {
    if (!/^https?:\/\//i.test(String(item.url || ""))) return;
    items.push({
      label: cleanText(item.label || "Official Source"),
      note: "Secondary source captured for cross-verification.",
      url: cleanText(item.url)
    });
  });

  return uniqueUrls(items).slice(0, 4);
}

function buildTopicClusterLinks(post, currentFolder) {
  const title = cleanText(post.title || "");
  const department = cleanText(post.department || "");
  const combined = `${title} ${department}`;
  const items = [];

  items.push({
    href: relativeSectionHref(currentFolder, post.category),
    label: `Check ${SECTION_LABELS[post.category] || post.category} 2026 Updates`,
    note: "Browse more updates from the same category."
  });

  const homeAnchor = HOME_ANCHOR_BY_CATEGORY[post.category];
  if (homeAnchor) {
    items.push({
      href: homeAnchor,
      label: `View Bihar ${SECTION_LABELS[post.category] || post.category} Section`,
      note: "Jump back to the main homepage update stream."
    });
  }

  if (post.category === "Latest Results") {
    items.push(
      {
        href: "../../pages/guides/sarkari-result-bihar.html",
        label: "Check Bihar Result 2026",
        note: "Broader result-intent cluster page."
      },
      {
        href: "../../pages/guides/fast-result-bihar.html",
        label: "Bihar Result Direct Link Hub",
        note: "Quick routes for high-intent result checks."
      },
      {
        href: "../../pages/guides/result-2026-bihar.html",
        label: "Latest Bihar Board and University Result 2026",
        note: "Board and recruitment result support page."
      },
      {
        href: "../../sections/admit-card/",
        label: "Download Bihar Admit Card 2026",
        note: "Useful next step when result posts mention upcoming exams."
      }
    );
  }

  if (post.category === "Latest Jobs") {
    items.push(
      {
        href: "../../sections/admit-card/",
        label: "Download Bihar Admit Card 2026",
        note: "Track hall-ticket and exam-date updates for related recruitments."
      },
      {
        href: "../../sections/latest-results/",
        label: "Check Bihar Result 2026",
        note: "Follow selection-result updates for similar posts."
      },
      {
        href: "../../pages/guides/guide-bihar-job-result-admit-card-hub.html",
        label: "Apply for Bihar Latest Jobs",
        note: "Cross-category internal hub for related exam stages."
      }
    );
  }

  if (post.category === "Admit Card") {
    items.push(
      {
        href: "../../sections/latest-results/",
        label: "Check Bihar Result 2026",
        note: "Check result announcements for the same exam families."
      },
      {
        href: "../../sections/latest-jobs/",
        label: "Apply for Bihar Latest Jobs",
        note: "Follow original recruitment notices and related cycles."
      },
      {
        href: "../../pages/guides/guide-bihar-job-result-admit-card-hub.html",
        label: "Read BPSC Latest Notification",
        note: "One-page route across application, admit card, and result stages."
      }
    );
  }

  if (post.category === "Scholarship") {
    items.push(
      {
        href: "../../pages/guides/guide-post-matric-scholarship-apply.html",
        label: "View Bihar Scholarship Update",
        note: "Step-by-step scholarship application guidance."
      },
      {
        href: "../../sections/verification/",
        label: "Check Bihar Student Verification Notice",
        note: "Useful for status-check and document verification steps."
      }
    );
  }

  if (post.category === "Admission") {
    items.push(
      {
        href: "../../sections/latest-jobs/",
        label: "Apply for Bihar Latest Jobs",
        note: "Track recruitment-linked admissions and course notices."
      },
      {
        href: "../../pages/guides/guides.html",
        label: "See Bihar Admission Details",
        note: "Form-fill, documents, and counselling support guides."
      }
    );
  }

  if (post.category === "Sarkari Yojana") {
    items.push(
      {
        href: "../../sections/verification/",
        label: "Verification Service Archive",
        note: "Check scheme service and status portals."
      },
      {
        href: "../../pages/guides/guides.html",
        label: "Guide Library",
        note: "Support pages for applications and required documents."
      }
    );
  }

  if (post.category === "Verification") {
    items.push(
      {
        href: "../../sections/sarkari-yojana/",
        label: "Sarkari Yojana Archive",
        note: "Related citizen-service and scheme information pages."
      },
      {
        href: "../../pages/guides/guides.html",
        label: "Guide Library",
        note: "Helpful process guides for status and document workflows."
      }
    );
  }

  items.push(
    {
      href: "../../pages/guides/guide-bihar-job-result-admit-card-hub.html",
      label: "Read BPSC Latest Notification",
      note: "Broad internal hub connecting similar high-intent pages."
    },
    {
      href: "../../pages/guides/guides.html",
      label: "Check Bihar Police Latest Notice",
      note: "Practical guides for form fill, eligibility, and result workflows."
    }
  );

  if (/bpsc/i.test(combined)) {
    items.push(
      {
        href: "../admit-card/bpsc-exam-calendar-2026.html",
        label: "BPSC Exam Calendar 2026",
        note: "Useful BPSC exam-date and planning page."
      },
      {
        href: "../student-news/bpsc-exam-calendar-student-watch-2026.html",
        label: "BPSC Student News Watch",
        note: "Short student-friendly BPSC update coverage."
      }
    );
  }

  if (/(bihar board|bseb|matric|inter)/i.test(combined)) {
    items.push(
      {
        href: "../latest-results/bihar-board-10th-result-2026.html",
        label: "Bihar Board 10th Result 2026",
        note: "Board-result hub page with direct links and guidance."
      },
      {
        href: "../latest-results/bihar-board-class-12th-result-2026.html",
        label: "Bihar Board Class 12th Result 2026",
        note: "Inter-result page for related board searches."
      }
    );
  }

  if (/(jee|neet)/i.test(combined)) {
    items.push(
      {
        href: "../admit-card/jee-main-session-2-admit-card-2026-april.html",
        label: "JEE Main Admit Card Update",
        note: "Related JEE exam-date and admit-card page."
      },
      {
        href: "../admit-card/neet-ug-2026-city-intimation-admit-update.html",
        label: "NEET UG Admit Update",
        note: "Related NEET student alert and download guidance."
      }
    );
  }

  const deduped = [];
  const seen = new Set();
  items.forEach((item) => {
    const href = cleanText(item.href);
    if (!href || seen.has(href)) return;
    seen.add(href);
    deduped.push(item);
  });
  return deduped.slice(0, 7);
}

function buildRelatedEntries(post, catalog, currentFolder, limit = 6) {
  const rows = Array.isArray(catalog) ? catalog : [];
  const currentSlug = cleanText(post.slug || "");
  const currentTokens = new Set(
    tokenizeRelatedText(post.title || "", post.department || "", post.location || "", post.shortInfo || "", post.slug || "")
  );
  const currentTags = new Set(
    extractIntentTags(post.title || "", post.department || "", post.location || "", post.shortInfo || "", post.slug || "")
  );

  const sameCategory = rows.filter((item) => (
    cleanText(item.slug) !== currentSlug
    && cleanText(item.category) === cleanText(post.category)
    && item.indexable !== false
    && cleanText(item.slug)
  ));

  const scored = sameCategory.map((item) => {
    const tokens = tokenizeRelatedText(item.title || "", item.department || "", item.location || "", item.shortInfo || "", item.slug || "");
    const tags = extractIntentTags(item.title || "", item.department || "", item.location || "", item.shortInfo || "", item.slug || "");
    let score = 0;
    tokens.forEach((token) => {
      if (currentTokens.has(token)) score += 2;
    });
    tags.forEach((tag) => {
      if (currentTags.has(tag)) score += 4;
    });

    if (cleanText(item.department).toLowerCase() && cleanText(item.department).toLowerCase() === cleanText(post.department).toLowerCase()) {
      score += 6;
    }

    if (cleanText(item.location).toLowerCase() && cleanText(item.location).toLowerCase() === cleanText(post.location).toLowerCase()) {
      score += 2;
    }

    const updatedAt = cleanText(item.updatedAt || item.publishedAt || "");
    if (updatedAt && updatedAt >= "2026-01-01") score += 1;

    return { item, score };
  });

  const primary = scored
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || compareEntriesByDate(left.item, right.item))
    .map((entry) => entry.item);

  const fallback = sameCategory
    .sort(compareEntriesByDate)
    .filter((item) => !primary.some((candidate) => candidate.slug === item.slug));

  return primary
    .concat(fallback)
    .slice(0, limit)
    .map((item) => {
      const targetFolder = CATEGORY_TO_FOLDER[item.category] || currentFolder;
      return {
        title: cleanText(item.title || ""),
        href: relativePostHref(currentFolder, item),
        absoluteUrl: pageUrl(targetFolder, item.slug),
        meta: `${cleanText(item.category || "")} | Updated ${formatDisplayDate(item.updatedAt || item.publishedAt || BUILD_DATE)}`
      };
    });
}

function buildHeroLead(post) {
  const section = cleanText(post.category || "Latest Update");
  const department = cleanText(post.department || "Official department");
  const keywordPlan = getKeywordPlan(post);
  const actionByCategory = {
    "Latest Jobs": "Recruitment update",
    "Latest Results": "Result update",
    "Admit Card": "Admit-card update",
    Admission: "Admission update",
    Scholarship: "Scholarship update",
    "Sarkari Yojana": "Scheme update",
    Verification: "Verification update"
  };
  const actionLabel = actionByCategory[section] || "Official update";
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || "official source link");
  const summaryRows = buildDetailedDateRows(post);
  const keyRow = summaryRows.find((row) => /(last date|result status|admit card status|application window|scheme status|service status)/i.test(cleanText(row.label || "")))
    || summaryRows[0];
  const keyLine = keyRow ? `${cleanText(keyRow.label)}: ${cleanText(keyRow.value)}` : "";

  const leadParts = [
    `${keywordPlan.primary} support update: ${actionLabel} for ${department} is available with key details and official links on this page.`,
    keyLine ? `Key update: ${keyLine}.` : "",
    `Verify final instructions through ${primaryLabel} before taking action.`
  ].filter(Boolean);

  return leadParts.join(" ");
}

function compressNarrativeCopy(value, maxSentences = 4, maxChars = 540) {
  const raw = cleanText(value || "");
  if (!raw) return "";

  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((item) => cleanText(item))
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  sentences.forEach((sentence) => {
    const key = sentence.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(sentence);
  });

  const compact = unique.slice(0, maxSentences).join(" ");
  return compact.length > maxChars ? `${compact.slice(0, maxChars - 3).trim()}...` : compact;
}

function buildSummaryParagraphs(post, summaryRows, feeRows, eligibilityRows) {
  const title = cleanText(post.title || "This update");
  const dept = cleanText(post.department || "the concerned department");
  const category = cleanText(post.category || "official update");
  const keywordPlan = getKeywordPlan(post);
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || "Official Link");
  const keyDate = summaryRows[0]
    ? `${cleanText(summaryRows[0].label)}: ${cleanText(summaryRows[0].value)}`
    : `Last Date / Status: ${cleanText(findLastDate(post)) || "Check official update"}`;
  const feeLine = feeRows[0]
    ? `${cleanText(feeRows[0].label)}: ${cleanText(feeRows[0].value)}`
    : "Fee details should be verified from the official notice.";
  const eligibilityLine = eligibilityRows[0]
    ? `${cleanText(eligibilityRows[0].label)}: ${cleanText(eligibilityRows[0].value)}`
    : "Check the official notification for exact eligibility rules.";
  const paragraphs = [
    `${title} is published in the ${category} section and supports ${keywordPlan.primary} searches with key points extracted from authority notices and official portal updates.`,
    `This page summarizes schedule, eligibility checkpoints, fee/service notes, and trusted source links from ${dept} so Bihar students can review critical details quickly.`,
    keywordPlan.related.length ? `Related search topics covered naturally on this page include ${keywordPlan.related.slice(0, 4).join(", ")}.` : "",
    `Priority checks: ${keyDate} ${feeLine} ${eligibilityLine}`,
    `Before submitting, downloading, or checking status, open ${primaryLabel} and confirm final rules from the official notification/website.`
  ];

  return paragraphs;
}

function buildSectionTitle(post) {
  return getKeywordPlan(post).heading;
}

function buildSchema(post, folder, canonicalUrl, faq, howToApply, relatedPosts = []) {
  const publisher = {
    "@type": "Organization",
    name: "BiharResult.live",
    url: "https://biharresult.live/",
    logo: {
      "@type": "ImageObject",
      url: "https://biharresult.live/favicon.png"
    }
  };

  const webPage = {
    "@type": "WebPage",
    name: cleanText(post.title),
    url: canonicalUrl,
    description: buildSeoDescription(post),
    inLanguage: "en-IN",
    isPartOf: {
      "@type": "WebSite",
      name: "BiharResult.live",
      url: "https://biharresult.live/"
    },
    about: [
      cleanText(post.category || "Latest Update"),
      cleanText(post.department || "Official Department"),
      cleanText(post.location || "Bihar")
    ].filter(Boolean),
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: "https://biharresult.live/favicon.png"
    }
  };

  const baseArticle = {
    "@type": post.category === "Latest Jobs" ? "JobPosting" : "NewsArticle",
    headline: cleanText(post.title),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    description: buildSeoDescription(post),
    image: "https://biharresult.live/favicon.png",
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    publisher,
    author: { "@type": "Organization", name: "BiharResult.live" },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    url: canonicalUrl,
    about: [
      cleanText(post.category || "Latest Update"),
      cleanText(post.department || "Official Department"),
      cleanText(post.location || "Bihar")
    ].filter(Boolean),
    keywords: buildKeywords(post)
  };

  if (post.category === "Latest Jobs") {
    baseArticle.title = cleanText(post.title);
    baseArticle.datePosted = post.publishedAt;
    baseArticle.validThrough = post.updatedAt || post.publishedAt;
    baseArticle.hiringOrganization = {
      "@type": "Organization",
      name: cleanText(post.department || "Official Department")
    };
    baseArticle.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressRegion: cleanText(post.location || "Bihar"),
        addressCountry: "IN"
      }
    };
    delete baseArticle.headline;
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://biharresult.live/" },
      { "@type": "ListItem", position: 2, name: SECTION_LABELS[post.category] || post.category, item: sectionUrl(folder) },
      { "@type": "ListItem", position: 3, name: cleanText(post.title), item: canonicalUrl }
    ]
  };

  const graph = [webPage, baseArticle, breadcrumb];

  if (Array.isArray(faq) && faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: cleanText(item.q),
        acceptedAnswer: {
          "@type": "Answer",
          text: cleanText(item.a)
        }
      }))
    });
  }

  if (Array.isArray(howToApply) && howToApply.length) {
    graph.push({
      "@type": "HowTo",
      name: `${cleanText(post.title)} - How to Proceed`,
      description: `Step-by-step guidance for ${cleanText(post.title)} on BiharResult.live.`,
      inLanguage: "en-IN",
      step: howToApply.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: `Step ${index + 1}`,
        text: cleanText(step)
      }))
    });
  }

  if (Array.isArray(relatedPosts) && relatedPosts.length) {
    graph.push({
      "@type": "ItemList",
      name: `Related posts for ${cleanText(post.title)}`,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: relatedPosts.length,
      itemListElement: relatedPosts.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: cleanText(item.absoluteUrl || ""),
        name: cleanText(item.title || "")
      }))
    });
  }

  return `<script type="application/ld+json">\n${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph
  }, null, 2)}\n</script>`;
}

function buildHtml(post, folder, catalog = []) {
  const quality = computePostQuality(post, folder);
  const canonicalUrl = quality.canonicalHref;
  const pageUrlSelf = pageUrl(folder, post.slug);
  const keywordPlan = getKeywordPlan(post);
  const lead = buildHeroLead(post);
  const description = buildSeoDescription(post);
  const title = buildSeoTitle(post);
  const lastDate = cleanText(findLastDate(post));
  const publishedLabel = formatDisplayDate(post.publishedAt || post.updatedAt || "");
  const modifiedLabel = formatDisplayDate(post.updatedAt || post.publishedAt || "");
  const primary = getPrimaryLink(post);
  const primaryLabel = cleanText(primary?.label || detectCategoryMeta(post.category).badge);
  const sourceItems = buildSourceList(post);
  const officialLinks = buildOfficialLinkItems(post, sourceItems);
  const faq = defaultFaq(post);
  const relatedPosts = buildRelatedEntries(post, catalog, folder);
  const clusterLinks = buildTopicClusterLinks(post, folder);
  const quickFacts = [
    { label: "Category", value: cleanText(post.category || "-") },
    { label: "Department", value: cleanText(post.department || "Official Update") },
    { label: "Key Point", value: lastDate || primaryLabel || "Official update" }
  ];
  const summaryRows = buildDetailedDateRows(post);
  const feeRows = buildDetailedFeeRows(post);
  const eligibilityRows = buildDetailedEligibilityRows(post);
  const vacancyRows = (post.vacancyDetails || []).slice(0, 20);
  const howToApply = defaultHowToApply(post);
  const beforeStart = defaultBeforeStart(post);
  const studentGuide = buildStudentGuide(post, summaryRows, feeRows, eligibilityRows);
  const summaryParagraphs = buildSummaryParagraphs(post, summaryRows, feeRows, eligibilityRows);
  const keywords = buildKeywords(post);
  const schemaTag = quality.indexable ? buildSchema(post, folder, pageUrlSelf, faq, howToApply, relatedPosts) : "";

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta name="theme-color" content="#0b3ab2" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="keywords" content="${escapeHtml(keywords)}" />
  <meta name="news_keywords" content="${escapeHtml([keywordPlan.primary, ...keywordPlan.related].slice(0, 6).join(", "))}" />
  <meta name="author" content="BiharResult.live Editorial Team" />
  <meta name="robots" content="${escapeHtml(quality.robotsMeta)}" />
  <meta name="googlebot" content="${escapeHtml(quality.robotsMeta)}, max-video-preview:-1" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="BiharResult.live" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrlSelf)}" />
  <meta property="og:image" content="https://biharresult.live/favicon.png" />
  <meta property="og:image:alt" content="${escapeHtml(`${cleanText(post.title)} on BiharResult.live`)}" />
  <meta property="article:published_time" content="${escapeHtml(cleanText(post.publishedAt || post.updatedAt || "2026-02-18"))}" />
  <meta property="article:modified_time" content="${escapeHtml(cleanText(post.updatedAt || post.publishedAt || "2026-02-18"))}" />
  <meta property="article:section" content="${escapeHtml(cleanText(post.category || "Latest Update"))}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="https://biharresult.live/favicon.png" />
  <meta name="twitter:image:alt" content="${escapeHtml(`${cleanText(post.title)} on BiharResult.live`)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="en-IN" href="${escapeHtml(canonicalUrl)}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
  <link rel="stylesheet" href="/style.css?v=${ASSET_VERSION}" />
  <style>
    .seo-post-card { padding: 0; overflow: hidden; }
    .seo-post-hero { background: radial-gradient(120% 140% at 0% 0%, rgba(255, 255, 255, 0.18), transparent 42%), linear-gradient(135deg, #03114a 0%, #0a3ba5 54%, #1183d6 100%); color: #fff; padding: 16px 14px; }
    .seo-post-crumb { margin: 0 0 8px; font-size: 11px; font-weight: 700; opacity: 0.95; }
    .seo-post-crumb a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
    .seo-post-hero h1 { margin: 0 0 8px; line-height: 1.14; font-size: 21px; letter-spacing: 0; }
    .seo-post-lead { margin: 0; max-width: 920px; line-height: 1.55; font-size: 13px; color: #e4ebff; }
    .seo-post-meta-row { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
    .seo-post-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 800; letter-spacing: 0.15px; border: 1px solid rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.12); }
    .seo-post-pill.live { background: #09a244; border-color: #09a244; color: #fff; }
    .seo-post-content { padding: 14px; background: #fff; }
    .seo-post-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 0 0 14px; }
    .seo-post-box { border: 1px solid #dbe3ef; border-radius: 10px; padding: 10px; background: linear-gradient(160deg, #f8fbff 0%, #f2f6ff 100%); }
    .seo-post-box strong { display: block; color: #0f172a; font-size: 12px; margin-bottom: 6px; text-transform: uppercase; }
    .seo-post-box span { display: block; color: #0b2f9b; font-size: 13px; font-weight: 800; line-height: 1.4; }
    .seo-post-note { border: 1px solid #cfe0ff; border-left: 5px solid #0b34d0; border-radius: 10px; padding: 11px 12px; margin-bottom: 14px; background: #f5f9ff; color: #0f172a; line-height: 1.55; font-size: 13px; }
    .seo-post-copy { margin-bottom: 14px; color: #0f172a; font-size: 13px; line-height: 1.7; }
    .seo-post-copy p { margin: 0 0 10px; }
    .seo-post-links { display: grid; gap: 10px; }
    .seo-post-link-card { border: 1px solid #dae4f3; border-radius: 10px; padding: 12px; background: #fff; display: grid; gap: 10px; }
    .seo-post-link-card strong { color: #0f172a; font-size: 14px; display: block; }
    .seo-post-link-card small { display: block; color: #475569; margin-top: 2px; font-size: 12px; }
    .seo-post-related-grid { display: grid; gap: 10px; }
    .seo-post-related-card { border: 1px solid #dae4f3; border-radius: 10px; padding: 12px; background: linear-gradient(180deg, #fff 0%, #f8fbff 100%); }
    .seo-post-related-card a { color: #0b2f9b; font-size: 14px; font-weight: 800; text-decoration: none; line-height: 1.5; }
    .seo-post-related-card small { display: block; margin-top: 6px; color: #475569; font-size: 12px; line-height: 1.6; }
    .seo-post-faq { display: grid; gap: 12px; }
    .seo-post-faq-item { border: 1px solid #dae4f3; border-radius: 10px; padding: 12px; background: #f8fbff; }
    .seo-post-faq-item h3 { margin: 0 0 8px; color: #0f172a; font-size: 14px; }
    .seo-post-faq-item p { margin: 0; color: #334155; font-size: 13px; line-height: 1.65; }
    .seo-post-source-list { margin: 0; padding-left: 18px; color: #0f172a; line-height: 1.65; font-size: 13px; }
    .seo-post-source-list a { color: #0b34d0; }
    @media (min-width: 640px) {
      .seo-post-hero { padding: 20px 18px; }
      .seo-post-hero h1 { font-size: 25px; }
      .seo-post-lead { font-size: 14px; }
      .seo-post-content { padding: 18px; }
      .seo-post-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .seo-post-link-card { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
      .seo-post-related-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (min-width: 900px) {
      .seo-post-hero { padding: 24px 22px; }
      .seo-post-hero h1 { font-size: 29px; }
      .seo-post-lead { font-size: 15px; line-height: 1.65; }
      .seo-post-content { padding: 22px; }
      .seo-post-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
      .seo-post-copy { font-size: 14px; }
      .seo-post-related-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .seo-post-faq-item p,
      .seo-post-source-list { font-size: 14px; }
    }
  </style>
${schemaTag}
</head>
<body class="br-post-page">
  <header class="post-topbar"><div class="br-wrap"><a href="../../index.html" class="post-brand">BiharResult.live</a></div></header>
  <main class="br-wrap br-main-content">
    <section class="br-ad-section" aria-label="Top Advertisement"><div class="br-ad-head">Advertisement</div><div class="br-ad-slot"><div class="br-ad-slot-code"></div></div></section>
    <article class="section-card seo-post-card br-post-article">
      <section class="seo-post-hero">
        <nav class="seo-post-crumb" aria-label="Breadcrumb"><a href="../../index.html">Home</a> / <a href="./">${escapeHtml(SECTION_LABELS[post.category] || post.category)}</a> / ${escapeHtml(cleanText(post.title))}</nav>
        <h1>${escapeHtml(cleanText(post.title))}</h1>
        <p class="seo-post-lead">${escapeHtml(lead)}</p>
        <div class="seo-post-meta-row">
          <span class="seo-post-pill live">${escapeHtml(detectCategoryMeta(post.category).badge)}</span>
          <span class="seo-post-pill">${escapeHtml(primaryLabel || "Official Link")}</span>
          <span class="seo-post-pill">${escapeHtml(cleanText(post.category || "Latest Update"))}</span>
        </div>
      </section>
      <div class="seo-post-content">
        ${(publishedLabel || modifiedLabel) ? `<div class="post-meta-line">${publishedLabel ? `<span><strong>Posted:</strong> ${escapeHtml(publishedLabel)}</span>` : ""}${modifiedLabel ? `<span><strong>Modified:</strong> ${escapeHtml(modifiedLabel)}</span>` : ""}</div>` : ""}
        <div class="seo-post-grid">${quickFacts.map((item) => `<div class="seo-post-box"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`).join("\n")}</div>
        <div class="seo-post-note"><strong>Accuracy Note:</strong> Always verify final details from the official website before taking action.</div>
        <section><h2 class="table-title table-title--summary">${escapeHtml(buildSectionTitle(post))}</h2><div class="seo-post-copy">${summaryParagraphs.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div></section>
        ${studentGuide.length ? `<section class="mt-6"><h2 class="table-title table-title--student">Student Quick Guide</h2><ul class="post-checklist post-checklist--student">${studentGuide.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ul></section>` : ""}
        ${summaryRows.length ? `<section class="mt-6"><h2 class="table-title table-title--dates">Important Dates and Key Details</h2><div class="overflow-x-auto"><table class="info-table">${renderTableRows(summaryRows)}</table></div></section>` : ""}
        ${feeRows.length ? `<section class="mt-6"><h2 class="table-title table-title--fee">Application Fee / Service Fee</h2><div class="overflow-x-auto"><table class="info-table">${renderTableRows(feeRows)}</table></div></section>` : ""}
        ${eligibilityRows.length ? `<section class="mt-6"><h2 class="table-title table-title--eligibility">Eligibility Details</h2><div class="overflow-x-auto"><table class="info-table">${renderTableRows(eligibilityRows)}</table></div></section>` : ""}
        ${vacancyRows.length ? `<section class="mt-6"><h2 class="table-title table-title--vacancy">Vacancy / Seat / Category Details</h2><div class="overflow-x-auto"><table class="info-table">${renderVacancyRows(vacancyRows)}</table></div></section>` : ""}
        ${(post.importantLinks || []).length ? `<section class="mt-6"><h2 class="table-title table-title--links">Important Links</h2><div class="seo-post-links">${(post.importantLinks || []).slice(0, 6).map((item) => `<div class="seo-post-link-card"><div><strong>${escapeHtml(normalizePrimaryLabel(item.label || "Official Link", item.url || "", post.category))}</strong><small>${escapeHtml(cleanText(post.title || ""))}</small></div><a href="${escapeHtml(cleanText(item.url || "#"))}" target="_blank" rel="noopener noreferrer" class="link-btn result-link-btn${item.type === "secondary" ? " secondary" : ""}">Open Link</a></div>`).join("\n")}</div></section>` : ""}
        ${officialLinks.length ? `<section class="mt-6"><h2 class="table-title table-title--links">Official Website and Notification</h2><div class="seo-post-links">${officialLinks.map((item) => `<div class="seo-post-link-card"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small></div><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="link-btn result-link-btn secondary">Open Official Link</a></div>`).join("\n")}</div></section>` : ""}
        ${beforeStart.length ? `<section class="mt-6"><h2 class="table-title table-title--before">Before You Start</h2><ul class="post-checklist">${beforeStart.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ul></section>` : ""}
        ${howToApply.length ? `<section class="mt-6"><h2 class="table-title table-title--process">How To Proceed</h2><ol class="post-steps">${howToApply.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ol></section>` : ""}
        <section class="mt-6"><h2 class="table-title table-title--faq">Frequently Asked Questions</h2><div class="seo-post-faq">${faq.map((item) => `<div class="seo-post-faq-item"><h3>${escapeHtml(item.q)}</h3><p>${escapeHtml(item.a)}</p></div>`).join("\n")}</div></section>
        ${sourceItems.length ? `<section class="mt-6"><h2 class="table-title table-title--source">Source References</h2><ul class="seo-post-source-list">${sourceItems.map((item) => `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label || item.url)}</a></li>`).join("\n")}</ul></section>` : ""}
        ${clusterLinks.length ? `<section class="mt-6"><h2 class="table-title table-title--related">Browse More in This Topic</h2><div class="seo-post-links">${clusterLinks.map((item) => `<div class="seo-post-link-card"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small></div><a href="${escapeHtml(item.href)}" class="link-btn result-link-btn secondary">Open Page</a></div>`).join("\n")}</div></section>` : ""}
        ${relatedPosts.length ? `<section class="mt-6"><h2 class="table-title table-title--related">Related Posts</h2><div class="seo-post-related-grid">${relatedPosts.map((item) => `<article class="seo-post-related-card"><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a><small>${escapeHtml(item.meta)}</small></article>`).join("\n")}</div></section>` : ""}
        <div class="br-post-mini-footer">BiharResult.live</div>
      </div>
    </article>
    <section class="br-ad-section" aria-label="Bottom Advertisement"><div class="br-ad-head">Advertisement</div><div class="br-ad-slot"><div class="br-ad-slot-code"></div></div></section>
  </main>
  <script src="/analytics.js?v=${ASSET_VERSION}" defer></script>
  <script src="../../monetization.js" defer></script>
</body>
</html>
`;
}

function getAllSectionPostFiles() {
  const folders = Object.values(CATEGORY_TO_FOLDER);
  const files = [];
  for (const folder of folders) {
    const dir = path.join(ROOT, "sections", folder);
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".html") || entry === "index.html") continue;
      files.push(path.join(dir, entry));
    }
  }
  return files.sort();
}

function compareEntriesByDate(a, b) {
  const dateA = String(a.updatedAt || a.publishedAt || "");
  const dateB = String(b.updatedAt || b.publishedAt || "");

  if (dateA !== dateB) return dateB.localeCompare(dateA);
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function buildSectionEntries(sectionFiles, dataMap) {
  return sectionFiles
    .map((filePath) => {
      const folder = path.basename(path.dirname(filePath));
      const slug = path.basename(filePath, ".html");
      const existing = fs.readFileSync(filePath, "utf8");
      const post = dataMap.get(slug) || buildFallbackPost(filePath, existing);
      const quality = computePostQuality(post, folder);
      if (!quality.indexable) return null;
      const action = classifyDiscoveryRiskGroup(post, folder, quality);
      const sitemapEligible = action?.group !== "remove_from_sitemap";

      return {
        slug,
        category: cleanText(post.category || FOLDER_TO_CATEGORY[folder] || "Latest Results"),
        folder,
        path: `sections/${folder}/${slug}.html`,
        title: cleanText(post.title || slug.replace(/-/g, " ")),
        publishedAt: cleanText(post.publishedAt || post.updatedAt || BUILD_DATE),
        updatedAt: cleanText(post.updatedAt || post.publishedAt || BUILD_DATE),
        sitemapEligible
      };
    })
    .filter(Boolean)
    .sort(compareEntriesByDate);
}

function buildSectionArchiveSchema(folder, meta, entries) {
  const collectionUrl = sectionUrl(folder);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: meta.heading,
        description: meta.description,
        url: collectionUrl,
        inLanguage: "en-IN",
        isPartOf: {
          "@type": "WebSite",
          name: "BiharResult.live",
          url: "https://biharresult.live/"
        },
        mainEntity: {
          "@type": "ItemList",
          name: `${meta.heading} Archive`,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          numberOfItems: entries.length,
          itemListElement: entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: pageUrl(folder, entry.slug),
            name: entry.title
          }))
        }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://biharresult.live/" },
          { "@type": "ListItem", position: 2, name: meta.heading, item: collectionUrl }
        ]
      }
    ]
  });
}

function renderSectionArchiveList(entries) {
  if (!entries.length) {
    return '<li>Archive is being updated.</li>';
  }

  return entries
    .map((entry) => `<li><a href="./${escapeHtml(entry.slug)}.html">${escapeHtml(entry.title)}</a><br /><small>Updated: ${escapeHtml(entry.updatedAt || entry.publishedAt || BUILD_DATE)}</small></li>`)
    .join("\n");
}

function buildSectionArchiveHtml(folder, folderEntries) {
  const meta = SECTION_INDEX_META[folder];
  if (!meta) {
    throw new Error(`Missing section index metadata for ${folder}`);
  }

  const sortedEntries = [...folderEntries].sort(compareEntriesByDate);
  const schema = buildSectionArchiveSchema(folder, meta, sortedEntries);
  const usefulLinks = meta.usefulLinks
    .map((item) => `        <li><a href="${item.href}">${escapeHtml(item.label)}</a></li>`)
    .join("\n");
  const archiveList = renderSectionArchiveList(sortedEntries);

  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0b3ab2" />
  <title>${escapeHtml(meta.pageTitle)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}" />
  <meta name="keywords" content="${escapeHtml(meta.keywords)}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${escapeHtml(sectionUrl(folder))}" />
  <link rel="alternate" hreflang="en-IN" href="${escapeHtml(sectionUrl(folder))}" />
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(sectionUrl(folder))}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="BiharResult.live" />
  <meta property="og:locale" content="en_IN" />
  <meta property="og:title" content="${escapeHtml(meta.socialTitle)}" />
  <meta property="og:description" content="${escapeHtml(meta.socialDescription)}" />
  <meta property="og:url" content="${escapeHtml(sectionUrl(folder))}" />
  <meta property="og:image" content="https://biharresult.live/favicon.png" />
  <meta property="og:image:alt" content="${escapeHtml(`${meta.heading} archive on BiharResult.live`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(meta.socialTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(meta.socialDescription)}" />
  <meta name="twitter:image" content="https://biharresult.live/favicon.png" />
  <meta name="twitter:image:alt" content="${escapeHtml(`${meta.heading} archive on BiharResult.live`)}" />
  <link rel="stylesheet" href="/style.css?v=${ASSET_VERSION}" />
  <script type="application/ld+json">${schema}</script>
</head>
<body>
  <header class="post-topbar"><div class="br-wrap"><a href="../../index.html" class="post-brand">BiharResult.live</a></div></header>
  <main class="br-wrap br-main-content">
    <article class="br-static-page">
      <h1>${escapeHtml(meta.heading)}</h1>
      <p>${escapeHtml(meta.intro)}</p>
      <p>${escapeHtml(meta.summary)}</p>
      <p><strong>Total posts in this archive:</strong> ${sortedEntries.length}</p>
      <h2>${escapeHtml(meta.usefulHeading)}</h2>
      <ul>
${usefulLinks}
      </ul>
      <h2>${escapeHtml(meta.archiveHeading)}</h2>
      <ul class="br-pro-list">
${archiveList}
      </ul>
    </article>
    <footer class="br-legal-links" aria-label="Legal Links">
      <a href="../../pages/legal/about.html">About Us</a>
      <a href="../../pages/legal/contact.html">Contact Us</a>
      <a href="../../pages/legal/privacy-policy.html">Privacy Policy</a>
      <p class="br-legal-disclaimer"><strong>Disclaimer:</strong> Information is provided for education purposes. Always verify final details from the official notification/website.</p>
    </footer>
  </main>
  <script src="/analytics.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>
`;
}

function rebuildSectionLandingPages(groupedEntries) {
  for (const folder of Object.values(CATEGORY_TO_FOLDER)) {
    const folderEntries = groupedEntries.get(folder) || [];
    const html = buildSectionArchiveHtml(folder, folderEntries);
    const indexPath = path.join(ROOT, "sections", folder, "index.html");
    fs.writeFileSync(indexPath, html, "utf8");
  }
}

function writeSectionIndexes(entries) {
  const grouped = new Map();

  for (const entry of entries) {
    if (!grouped.has(entry.folder)) grouped.set(entry.folder, []);
    grouped.get(entry.folder).push(entry);
  }

  for (const [folder, folderEntries] of grouped.entries()) {
    const sortedEntries = [...folderEntries].sort(compareEntriesByDate);
    const postsPath = path.join(ROOT, "sections", folder, "posts.json");
    fs.writeFileSync(postsPath, `${JSON.stringify(sortedEntries, null, 2)}\n`, "utf8");
  }

  rebuildSectionLandingPages(grouped);
  fs.writeFileSync(SECTIONS_INDEX_PATH, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

function writeRuntimeDataFiles(catalog) {
  const indexableCatalog = catalog.filter((post) => post.indexable !== false);
  const homeData = indexableCatalog.map((post) => ({
    slug: cleanText(post.slug || ""),
    path: cleanText(post.path || ""),
    title: cleanText(post.title || ""),
    category: cleanText(post.category || ""),
    shortInfo: cleanText(post.shortInfo || ""),
    publishedAt: cleanText(post.publishedAt || ""),
    updatedAt: cleanText(post.updatedAt || ""),
    isFeatured: Boolean(post.isFeatured)
  }));

  const homeToolsData = indexableCatalog.map((post) => ({
    slug: cleanText(post.slug || ""),
    path: cleanText(post.path || ""),
    title: cleanText(post.title || ""),
    category: cleanText(post.category || ""),
    publishedAt: cleanText(post.publishedAt || ""),
    updatedAt: cleanText(post.updatedAt || ""),
    importantDates: Array.isArray(post.importantDates) ? post.importantDates.slice(0, 8) : [],
    ageLimit: Array.isArray(post.ageLimit) ? post.ageLimit : []
  }));

  const slugPaths = Object.fromEntries(
    indexableCatalog
      .filter((post) => cleanText(post.slug) && cleanText(post.path))
      .map((post) => [cleanText(post.slug), cleanText(post.path)])
  );

  fs.writeFileSync(HOME_DATA_PATH, JSON.stringify(homeData), "utf8");
  fs.writeFileSync(HOME_TOOLS_DATA_PATH, JSON.stringify(homeToolsData), "utf8");
  fs.writeFileSync(SLUG_PATHS_PATH, JSON.stringify(slugPaths), "utf8");
}

function rebuildSitemap(entries) {
  const urls = [];
  // Only include canonical indexable routes here; legacy redirects and noindex pages must stay out of the sitemap.
  const fixedPages = [
    { loc: "https://biharresult.live/", lastmod: BUILD_DATE, changefreq: "hourly", priority: "1.0" },
    { loc: "https://biharresult.live/pages/legal/about.html", lastmod: "2026-02-18", changefreq: "monthly", priority: "0.6" },
    { loc: "https://biharresult.live/pages/legal/contact.html", lastmod: "2026-02-18", changefreq: "monthly", priority: "0.6" },
    { loc: "https://biharresult.live/pages/legal/privacy-policy.html", lastmod: "2026-02-18", changefreq: "monthly", priority: "0.6" },
    { loc: "https://biharresult.live/sections/student-news/", lastmod: BUILD_DATE, changefreq: "daily", priority: "0.8" },
    { loc: "https://biharresult.live/pages/guides/guides.html", lastmod: "2026-03-28", changefreq: "weekly", priority: "0.7" },
    { loc: "https://biharresult.live/pages/guides/india-result-latest-result.html", lastmod: "2026-04-17", changefreq: "weekly", priority: "0.7" },
    { loc: "https://biharresult.live/pages/guides/sarkari-result-bihar.html", lastmod: BUILD_DATE, changefreq: "daily", priority: "0.8" },
    { loc: "https://biharresult.live/pages/guides/fast-result-bihar.html", lastmod: BUILD_DATE, changefreq: "daily", priority: "0.8" },
    { loc: "https://biharresult.live/pages/guides/result-2026-bihar.html", lastmod: BUILD_DATE, changefreq: "daily", priority: "0.8" },
    { loc: "https://biharresult.live/pages/guides/guide-bihar-job-result-admit-card-hub.html", lastmod: "2026-03-28", changefreq: "weekly", priority: "0.7" },
    { loc: "https://biharresult.live/pages/guides/guide-post-matric-scholarship-apply.html", lastmod: "2026-02-18", changefreq: "monthly", priority: "0.7" },
    { loc: "https://biharresult.live/pages/guides/guide-ssc-cgl-2026-books-strategy.html", lastmod: "2026-02-18", changefreq: "monthly", priority: "0.7" },
    { loc: "https://biharresult.live/pages/guides/guide-bihar-age-relaxation-reservation-explained.html", lastmod: "2026-02-18", changefreq: "monthly", priority: "0.7" }
  ];

  const sectionIndexes = Object.values(CATEGORY_TO_FOLDER).map((folder) => ({
    loc: sectionUrl(folder),
    lastmod: BUILD_DATE,
    changefreq: folder === "latest-results" ? "hourly" : "daily",
    priority: folder === "latest-results" ? "0.9" : "0.8"
  }));

  urls.push(...fixedPages, ...sectionIndexes);

  for (const entry of entries) {
    if (entry && entry.sitemapEligible === false) {
      continue;
    }
    const lastmod = cleanText(entry.updatedAt || entry.publishedAt || "2026-02-18");
    const category = entry.category || FOLDER_TO_CATEGORY[entry.folder] || "Latest Results";
    const changefreq = category === "Latest Results" ? "daily" : category === "Latest Jobs" ? "daily" : "weekly";
    const priority = category === "Latest Results" || category === "Latest Jobs" ? "0.8" : "0.7";
    urls.push({ loc: pageUrl(entry.folder, entry.slug), lastmod, changefreq, priority });
  }

  if (fs.existsSync(STUDENT_NEWS_POSTS_PATH)) {
    try {
      const studentNewsPosts = JSON.parse(fs.readFileSync(STUDENT_NEWS_POSTS_PATH, "utf8"));
      studentNewsPosts.forEach((post) => {
        const slug = cleanText(post.slug || "");
        if (!slug) return;
        urls.push({
          loc: `https://biharresult.live/sections/student-news/${slug}.html`,
          lastmod: cleanText(post.updatedAt || post.publishedAt || BUILD_DATE),
          changefreq: "weekly",
          priority: "0.7"
        });
      });
    } catch (error) {
      console.error("[student-news] Failed to add student news sitemap entries", error);
    }
  }

  const seen = new Set();
  const uniqueUrls = urls.filter((item) => {
    if (seen.has(item.loc)) return false;
    seen.add(item.loc);
    return true;
  });

  const xml = `<?xml version='1.0' encoding='UTF-8'?>\n<urlset xmlns='http://www.sitemaps.org/schemas/sitemap/0.9'>\n${uniqueUrls.map((item) => `  <url>\n    <loc>${escapeHtml(item.loc)}</loc>\n    <lastmod>${escapeHtml(item.lastmod)}</lastmod>\n    <changefreq>${escapeHtml(item.changefreq)}</changefreq>\n    <priority>${escapeHtml(item.priority)}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;

  fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
  return uniqueUrls.length;
}

function writeIndexQualityReport(catalog) {
  const rows = Array.isArray(catalog) ? catalog : [];
  const indexable = rows.filter((post) => post.indexable !== false);
  const blocked = rows.filter((post) => post.indexable === false);
  const discoveredNotIndexedRiskGroups = buildDiscoveredRiskGroupReport(rows);
  const byCategory = {};
  rows.forEach((post) => {
    const key = cleanText(post.category || "Other");
    if (!byCategory[key]) {
      byCategory[key] = { total: 0, indexable: 0, blocked: 0 };
    }
    byCategory[key].total += 1;
    if (post.indexable === false) byCategory[key].blocked += 1;
    else byCategory[key].indexable += 1;
  });

  const report = {
    buildDate: BUILD_DATE,
    total: rows.length,
    indexable: indexable.length,
    blocked: blocked.length,
    byCategory,
    discoveredNotIndexedRiskGroups,
    blockedSamples: blocked.slice(0, 50).map((post) => ({
      slug: cleanText(post.slug || ""),
      category: cleanText(post.category || ""),
      title: cleanText(post.title || ""),
      score: Number(post.qualityScore || 0),
      reasons: Array.isArray(post.qualityReasons) ? post.qualityReasons : []
    }))
  };

  fs.writeFileSync(INDEX_QUALITY_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

function main() {
  const data = readJson(DATA_PATH);
  const dataMap = new Map(data.map((post) => [post.slug, post]));
  const createdSectionFileCount = ensureSectionPostFiles(data);
  let sectionFiles = getAllSectionPostFiles();

  let generatedCount = 0;
  let preservedCount = 0;

  if (!SKIP_POST_REWRITE) {
    for (const filePath of sectionFiles) {
      const slug = path.basename(filePath, ".html");
      const folder = path.basename(path.dirname(filePath));
      const existing = fs.readFileSync(filePath, "utf8");

      if (detectExistingRichPage(existing, slug)) {
        preservedCount += 1;
        continue;
      }

      const post = dataMap.get(slug) || buildFallbackPost(filePath, existing);
      const html = buildHtml(post, folder, data);
      fs.writeFileSync(filePath, html, "utf8");
      generatedCount += 1;
    }
  }

  sectionFiles = getAllSectionPostFiles();
  const catalog = buildDataCatalog(sectionFiles, dataMap);
  const catalogMap = new Map(catalog.map((post) => [post.slug, post]));
  fs.writeFileSync(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  writeRuntimeDataFiles(catalog);
  const qualityReport = writeIndexQualityReport(catalog);

  const entries = buildSectionEntries(sectionFiles, catalogMap);
  writeSectionIndexes(entries);
  const sitemapCount = rebuildSitemap(entries);
  console.log(JSON.stringify({
    createdSectionFileCount,
    generatedCount,
    preservedCount,
    dataCatalogCount: catalog.length,
    indexableCatalogCount: qualityReport.indexable,
    blockedCatalogCount: qualityReport.blocked,
    sectionEntryCount: entries.length,
    sitemapCount,
    skipPostRewrite: SKIP_POST_REWRITE
  }, null, 2));

}

main();
