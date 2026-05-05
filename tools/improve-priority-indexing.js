const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const PRIORITY_POSTS = [
  "sections/latest-results/bihar-board-10th-result-2026.html",
  "sections/latest-results/bihar-board-class-12th-result-2026.html",
  "sections/latest-results/bihar-board-class-10th-topper-list-2026.html",
  "sections/latest-results/bihar-board-inter-12th-scrutiny-online-application-form-2026.html",
  "sections/latest-results/download-10th-bseb-result.html",
  "sections/latest-results/download-12th-bseb-result.html",
  "sections/latest-jobs/bpsc-school-teacher-tre-4-0-2026.html",
  "sections/admit-card/bpsc-exam-calendar-2026.html",
  "sections/latest-jobs/bpsc-33rd-judicial-service-civil-judge-recruitment-2026.html",
  "sections/admit-card/bpsc-aedo-admit-card-2026.html",
  "sections/latest-results/jee-main-session-2-score-card-2026.html",
  "sections/latest-results/nta-jee-main-paper-1-result-2026-session1-2-update.html",
  "sections/latest-results/nta-cuet-pg-result-2026-declaration-update.html",
  "sections/admit-card/neet-ug-2026-city-intimation-admit-update.html",
  "sections/admit-card/jee-main-session-2-admit-card-2026-april.html",
  "sections/latest-jobs/railway-rrb-alp-recruitment-2026.html",
  "sections/latest-jobs/csbc-constable-operator-online-form-2026.html",
  "sections/latest-jobs/upsc-civil-services-prelims-2026-active-update.html"
];

const PRIORITY_INDEX_PAGES = [
  "index.html",
  "sections/latest-results/index.html",
  "sections/latest-jobs/index.html",
  "sections/admit-card/index.html",
  "sections/student-news/index.html",
  "sections/scholarship/index.html",
  "sections/admission/index.html",
  "sections/sarkari-yojana/index.html",
  "sections/verification/index.html"
];

const PRIORITY_ALL = Array.from(new Set([...PRIORITY_POSTS, ...PRIORITY_INDEX_PAGES]));

function fileToCanonical(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized === "index.html") return "https://biharresult.live/";
  if (normalized.endsWith("/index.html")) {
    return `https://biharresult.live/${normalized.replace(/\/index\.html$/, "/")}`;
  }
  return `https://biharresult.live/${normalized}`;
}

function upsertTag(content, regex, replacement) {
  if (regex.test(content)) {
    return content.replace(regex, replacement);
  }
  return content;
}

function ensureAuthor(content) {
  if (/<meta\s+name=["']author["']/i.test(content)) {
    return content.replace(
      /<meta\s+name=["']author["']\s+content=["'][^"']*["']\s*\/?>/i,
      '<meta name="author" content="BiharResult.live Editorial Team" />'
    );
  }
  return content.replace(
    /(<meta\s+name=["']description["'][^>]*>\s*)/i,
    '$1  <meta name="author" content="BiharResult.live Editorial Team" />\n'
  );
}

function ensureCanonicalAndSocial(content, canonical) {
  let out = content;
  out = out.replace(
    /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`
  );

  const altBlock = `  <link rel="alternate" hreflang="en-IN" href="${canonical}" />\n  <link rel="alternate" hreflang="x-default" href="${canonical}" />`;
  if (!/<link\s+rel=["']alternate["']\s+hreflang=["']en-IN["']/i.test(out)) {
    out = out.replace(
      /(<link\s+rel=["']canonical["'][^>]*>\s*)/i,
      `$1\n${altBlock}\n`
    );
  } else {
    out = out.replace(
      /<link\s+rel=["']alternate["']\s+hreflang=["']en-IN["']\s+href=["'][^"']*["']\s*\/?>/i,
      `<link rel="alternate" hreflang="en-IN" href="${canonical}" />`
    );
    out = out.replace(
      /<link\s+rel=["']alternate["']\s+hreflang=["']x-default["']\s+href=["'][^"']*["']\s*\/?>/i,
      `<link rel="alternate" hreflang="x-default" href="${canonical}" />`
    );
  }

  if (/<meta\s+property=["']og:url["']/i.test(out)) {
    out = out.replace(
      /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta property="og:url" content="${canonical}" />`
    );
  }
  if (/<meta\s+name=["']twitter:url["']/i.test(out)) {
    out = out.replace(
      /<meta\s+name=["']twitter:url["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="twitter:url" content="${canonical}" />`
    );
  } else {
    out = out.replace(
      /(<meta\s+name=["']twitter:image["'][^>]*>\s*)/i,
      `$1\n  <meta name="twitter:url" content="${canonical}" />\n`
    );
  }

  if (!/<meta\s+property=["']og:locale["']/i.test(out)) {
    out = out.replace(
      /(<meta\s+property=["']og:site_name["'][^>]*>\s*)/i,
      `$1\n  <meta property="og:locale" content="en_IN" />\n`
    );
  }
  return out;
}

function ensureCrawlMeta(content) {
  let out = content;
  out = out.replace(
    /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i,
    '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />'
  );
  out = out.replace(
    /<meta\s+name=["']googlebot["']\s+content=["'][^"']*["']\s*\/?>/i,
    '<meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />'
  );

  if (!/<link\s+rel=["']sitemap["']/i.test(out)) {
    out = out.replace(
      /(<link\s+rel=["']stylesheet["'][^>]*>\s*)/i,
      '  <link rel="sitemap" type="application/xml" href="/sitemap.xml" />\n$1'
    );
  }
  return out;
}

function postLinksFor(relPath) {
  const links = [
    { href: "../../index.html", label: "Home Page" },
    { href: "../latest-results/", label: "Latest Results Archive" },
    { href: "../latest-jobs/", label: "Latest Jobs Archive" },
    { href: "../admit-card/", label: "Admit Card Archive" }
  ];

  if (/bihar-board|bseb|matric|inter/i.test(relPath)) {
    links.push(
      { href: "./bihar-board-10th-result-2026.html", label: "Bihar Board 10th Result 2026" },
      { href: "./bihar-board-class-12th-result-2026.html", label: "Bihar Board Class 12th Result 2026" },
      { href: "./bihar-board-class-10th-topper-list-2026.html", label: "Bihar Board 10th Topper List 2026" }
    );
  }
  if (/bpsc/i.test(relPath)) {
    links.push(
      { href: "../admit-card/bpsc-exam-calendar-2026.html", label: "BPSC Exam Calendar 2026" },
      { href: "../latest-jobs/bpsc-school-teacher-tre-4-0-2026.html", label: "BPSC TRE 4.0 Update" }
    );
  }
  if (/jee|neet/i.test(relPath)) {
    links.push(
      { href: "../admit-card/jee-main-session-2-admit-card-2026-april.html", label: "JEE Main Admit Card 2026" },
      { href: "../latest-results/jee-main-session-2-score-card-2026.html", label: "JEE Main Score Card 2026" },
      { href: "../admit-card/neet-ug-2026-city-intimation-admit-update.html", label: "NEET UG Admit Update 2026" }
    );
  }
  if (/railway|rrb|csbc|upsc|latest-jobs/i.test(relPath)) {
    links.push(
      { href: "../latest-jobs/railway-rrb-alp-recruitment-2026.html", label: "Railway RRB ALP 2026" },
      { href: "../latest-jobs/csbc-constable-operator-online-form-2026.html", label: "CSBC Constable Operator 2026" }
    );
  }

  const seen = new Set();
  return links.filter((item) => {
    if (!item.href || !item.label) return false;
    const key = `${item.href}|${item.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function injectPriorityLinks(content, relPath) {
  if (/data-priority-links="1"/i.test(content)) return content;
  if (!/br-post-mini-footer/i.test(content)) return content;

  const links = postLinksFor(relPath);
  const actions = links.map((item) => `<a href="${item.href}" class="link-btn result-link-btn secondary">${item.label}</a>`).join("");
  const section = `
        <section class="mt-6" data-priority-links="1">
          <h2 class="table-title">Priority Internal Links</h2>
          <div class="result-link-actions">${actions}</div>
        </section>

`;
  return content.replace(/(\s*<div class="br-post-mini-footer">)/i, `${section}$1`);
}

function injectSectionPriorityLinks(content, relPath) {
  if (/data-priority-hub="1"/i.test(content)) return content;
  if (!/br-static-page/i.test(content)) return content;

  let links = [];
  if (/latest-results\/index\.html$/i.test(relPath)) {
    links = [
      { href: "../latest-results/bihar-board-10th-result-2026.html", label: "Bihar Board 10th Result 2026" },
      { href: "../latest-results/bihar-board-class-12th-result-2026.html", label: "Bihar Board 12th Result 2026" },
      { href: "../latest-results/jee-main-session-2-score-card-2026.html", label: "JEE Main Score Card 2026" },
      { href: "../latest-results/nta-jee-main-paper-1-result-2026-session1-2-update.html", label: "NTA JEE Main Paper 1 Result" }
    ];
  } else if (/latest-jobs\/index\.html$/i.test(relPath)) {
    links = [
      { href: "../latest-jobs/bpsc-school-teacher-tre-4-0-2026.html", label: "BPSC TRE 4.0 2026" },
      { href: "../latest-jobs/railway-rrb-alp-recruitment-2026.html", label: "Railway RRB ALP 2026" },
      { href: "../latest-jobs/csbc-constable-operator-online-form-2026.html", label: "CSBC Constable Operator 2026" },
      { href: "../latest-jobs/upsc-civil-services-prelims-2026-active-update.html", label: "UPSC Civil Services Prelims 2026" }
    ];
  } else if (/admit-card\/index\.html$/i.test(relPath)) {
    links = [
      { href: "../admit-card/bpsc-exam-calendar-2026.html", label: "BPSC Exam Calendar 2026" },
      { href: "../admit-card/jee-main-session-2-admit-card-2026-april.html", label: "JEE Main Admit Card 2026" },
      { href: "../admit-card/neet-ug-2026-city-intimation-admit-update.html", label: "NEET UG Admit Update 2026" },
      { href: "../admit-card/bpsc-aedo-admit-card-2026.html", label: "BPSC AEDO Admit Card 2026" }
    ];
  } else {
    return content;
  }

  const block = `
      <h2 data-priority-hub="1">Priority Pages</h2>
      <ul>
${links.map((item) => `        <li><a href="${item.href}">${item.label}</a></li>`).join("\n")}
      </ul>
`;

  return content.replace(/(\s*<h2>.*Archive<\/h2>)/i, `${block}$1`);
}

function updateHtmlFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) return false;
  let content = fs.readFileSync(fullPath, "utf8");
  const before = content;
  const canonical = fileToCanonical(relPath);

  content = ensureAuthor(content);
  content = ensureCanonicalAndSocial(content, canonical);
  content = ensureCrawlMeta(content);
  content = injectPriorityLinks(content, relPath);
  content = injectSectionPriorityLinks(content, relPath);

  if (content !== before) {
    fs.writeFileSync(fullPath, content, "utf8");
    return true;
  }
  return false;
}

function updateSitemapPriority() {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) return false;
  let xml = fs.readFileSync(sitemapPath, "utf8");
  const before = xml;

  const highPriorityUrls = new Set([
    "https://biharresult.live/",
    ...PRIORITY_ALL.map((rel) => fileToCanonical(rel))
  ]);

  xml = xml.replace(
    /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<changefreq>([^<]+)<\/changefreq>\s*<priority>([^<]+)<\/priority>\s*<\/url>/g,
    (match, loc, lastmod, changefreq, priority) => {
      if (!highPriorityUrls.has(loc.trim())) return match;

      let nextPriority = priority;
      let nextChangefreq = changefreq;
      if (loc.trim() === "https://biharresult.live/") {
        nextPriority = "1.0";
        nextChangefreq = "hourly";
      } else if (/\/sections\/(latest-results|latest-jobs|admit-card|student-news|scholarship|admission|sarkari-yojana|verification)\/$/i.test(loc.trim())) {
        nextPriority = "0.9";
        nextChangefreq = "daily";
      } else {
        nextPriority = "0.9";
        if (/(jee|neet|bihar-board|bpsc|rrb|upsc|result|admit|jobs)/i.test(loc.trim())) {
          nextChangefreq = "daily";
        }
      }

      return `<url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${nextChangefreq}</changefreq>\n    <priority>${nextPriority}</priority>\n  </url>`;
    }
  );

  if (xml !== before) {
    fs.writeFileSync(sitemapPath, xml, "utf8");
    return true;
  }
  return false;
}

function main() {
  const changed = [];
  for (const rel of PRIORITY_ALL) {
    if (updateHtmlFile(rel)) changed.push(rel);
  }
  const sitemapChanged = updateSitemapPriority();
  if (sitemapChanged) changed.push("sitemap.xml");

  console.log(JSON.stringify({
    targetedPageCount: PRIORITY_ALL.length,
    changedCount: changed.length,
    changed
  }, null, 2));
}

main();
