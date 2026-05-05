const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data.json");

const SECTION_CONFIG = {
  "Latest Results": {
    folder: "latest-results",
    titleBase: "Latest Results",
    titleSuffix: "Top Result Links and Updates",
    intro: "result-related posts, direct links, score card notices, and official result updates",
    quickUse: "Students who want one quick page for the newest result updates in this section.",
    feeNote: "This roundup page has no fee. Check each linked result post for official rules.",
    linkLabel: "Open Result Post"
  },
  "Latest Jobs": {
    folder: "latest-jobs",
    titleBase: "Latest Jobs",
    titleSuffix: "Top Online Form and Vacancy Updates",
    intro: "job posts, online forms, vacancy notices, and official recruitment links",
    quickUse: "Candidates who want one quick page for the newest job and online form updates in this section.",
    feeNote: "This roundup page has no fee. Check each linked job post for official application fee details.",
    linkLabel: "Open Job Post"
  },
  "Admit Card": {
    folder: "admit-card",
    titleBase: "Admit Card Updates",
    titleSuffix: "Top Download and Exam Notices",
    intro: "admit card posts, exam notices, city slips, and hall ticket guidance",
    quickUse: "Candidates who want one quick page for the newest admit card and exam-date updates in this section.",
    feeNote: "This roundup page has no fee. Check each linked admit-card post for official instructions.",
    linkLabel: "Open Admit Card Post"
  },
  Admission: {
    folder: "admission",
    titleBase: "Admission Updates",
    titleSuffix: "Latest Form and Counselling Posts",
    intro: "admission forms, counselling notices, and student entry updates",
    quickUse: "Students who want one quick page for the newest admission and counselling updates in this section.",
    feeNote: "This roundup page has no fee. Check each linked admission post for official fee and document details.",
    linkLabel: "Open Admission Post"
  },
  Scholarship: {
    folder: "scholarship",
    titleBase: "Scholarship Updates",
    titleSuffix: "Latest Portal and Benefit Posts",
    intro: "scholarship notices, portal links, payment updates, and eligibility posts",
    quickUse: "Students who want one quick page for the newest scholarship updates in this section.",
    feeNote: "This roundup page has no fee. Check each linked scholarship post for official requirements.",
    linkLabel: "Open Scholarship Post"
  },
  "Sarkari Yojana": {
    folder: "sarkari-yojana",
    titleBase: "Sarkari Yojana Updates",
    titleSuffix: "Latest Scheme and Service Posts",
    intro: "scheme posts, service links, benefits, and eligibility-based updates",
    quickUse: "Visitors who want one quick page for the newest yojana and service updates in this section.",
    feeNote: "This roundup page has no fee. Check each linked yojana post for official service conditions.",
    linkLabel: "Open Yojana Post"
  },
  Verification: {
    folder: "verification",
    titleBase: "Verification Updates",
    titleSuffix: "Latest Service and Status Posts",
    intro: "verification posts, service links, and status-check guidance",
    quickUse: "Visitors who want one quick page for the newest verification and service-status posts in this section.",
    feeNote: "This roundup page has no fee. Check each linked verification post for official portal steps.",
    linkLabel: "Open Verification Post"
  }
};

const ROUNDUP_CATEGORIES = new Set(["Latest Results", "Latest Jobs", "Admit Card"]);

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

function prettyDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).format(date);
}

function getRoundupDates() {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const todayIso = formatDateInTimeZone(today, "Asia/Kolkata");
  const yesterdayIso = formatDateInTimeZone(yesterday, "Asia/Kolkata");
  return [
    { kind: "today", iso: todayIso, display: prettyDate(todayIso), label: "Today" },
    { kind: "yesterday", iso: yesterdayIso, display: prettyDate(yesterdayIso), label: "Yesterday" }
  ];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function isRoundupSlug(slug) {
  return /(?:^|-)today-|(?:^|-)yesterday-/.test(String(slug || ""));
}

function byRecent(a, b) {
  const left = String(b.updatedAt || b.publishedAt || "");
  const right = String(a.updatedAt || a.publishedAt || "");
  return left.localeCompare(right) || String(a.title || "").localeCompare(String(b.title || ""));
}

function buildSlug(folder, kind, iso) {
  return `${folder}-${kind}-highlights-${iso}`;
}

function buildTitle(config, round) {
  return `${round.label} ${config.titleBase} ${round.display}: ${config.titleSuffix}`;
}

function buildShortInfo(config, round, topPosts) {
  const count = topPosts.length;
  return `${round.label} ${config.titleBase.toLowerCase()} roundup for ${round.display}. This page collects ${count} recent ${config.intro} already published in this section so visitors can open the most relevant update quickly from one place.`;
}

function buildLongDescription(config, round, topPosts) {
  const titleList = topPosts.slice(0, 4).map((post) => cleanText(post.title)).filter(Boolean);
  const joinedTitles = titleList.length ? `Featured updates include ${titleList.join(", ")}.` : "";
  return `${round.label} ${config.titleBase.toLowerCase()} roundup for ${round.display} on BiharResult.live. This post is designed as a quick-access page for the latest section content, including ${config.intro}. ${joinedTitles} Open the linked posts below to read full details, dates, fees, eligibility, notices, and official links from each original section post.`;
}

function buildImportantDates(round, topPosts) {
  const newest = topPosts[0];
  return [
    { label: "Roundup Date", value: round.display },
    { label: "Roundup Type", value: `${round.label} Section Highlights` },
    { label: "Posts Covered", value: String(topPosts.length) },
    { label: "Newest Linked Update", value: cleanText(newest?.title || "Check links below") },
    { label: "Newest Linked Post Date", value: cleanText(newest?.updatedAt || newest?.publishedAt || round.iso) }
  ];
}

function buildImportantLinks(config, topPosts) {
  const items = topPosts.slice(0, 6).map((post, index) => ({
    label: `${config.linkLabel} ${index + 1}`,
    url: `./${encodeURIComponent(post.slug)}.html`,
    type: index === 0 ? "primary" : "secondary"
  }));

  items.push({
    label: "Open Full Section Archive",
    url: "./",
    type: "secondary"
  });

  return items;
}

function buildHowTo(config) {
  return [
    "Read the roundup summary first and identify the most relevant linked post.",
    "Open the matching post from the Important Links section.",
    "Check dates, notice text, eligibility, fee, and official links inside that full post.",
    "Use only the official portal or authority link mentioned in the linked post before taking action.",
    "Save the final acknowledgment, result page, admit card, or notice copy if needed."
  ];
}

function buildBeforeYouStart(config, round) {
  return [
    `This is a ${round.label.toLowerCase()} roundup page for quick access, so always open the full linked post before taking action.`,
    "Check the updated date shown in each linked post carefully.",
    "Use only official links and notifications for final confirmation.",
    "Keep your roll number, registration details, documents, or application details ready if required."
  ];
}

function buildEntry(category, round, topPosts, existing = {}) {
  const config = SECTION_CONFIG[category];
  const slug = buildSlug(config.folder, round.kind, round.iso);
  const title = buildTitle(config, round);
  const shortInfo = buildShortInfo(config, round, topPosts);

  return {
    id: `custom-${slug}`,
    wpId: null,
    slug,
    path: `sections/${config.folder}/${slug}.html`,
    title,
    category,
    department: "BiharResult.live Editorial Roundup",
    location: "India",
    shortInfo,
    publishedAt: round.iso,
    updatedAt: round.iso,
    isFeatured: true,
    sourceName: `${title} Archive Source`,
    sourceUrl: `https://biharresult.live/sections/${config.folder}/`,
    image: "https://biharresult.live/favicon.png",
    importantDates: buildImportantDates(round, topPosts),
    applicationFee: [
      { label: "Fee Note", value: config.feeNote }
    ],
    eligibility: [
      { label: "Who Should Use This Page", value: config.quickUse },
      { label: "Content Scope", value: `Quick-access roundup of recent ${config.titleBase.toLowerCase()} posts already published in this section.` }
    ],
    ageLimit: [],
    vacancyDetails: [],
    importantLinks: buildImportantLinks(config, topPosts),
    longDescription: buildLongDescription(config, round, topPosts),
    howToApply: buildHowTo(config),
    beforeYouStart: buildBeforeYouStart(config, round),
    ...existing
  };
}

function main() {
  const ROUNDUP_DATES = getRoundupDates();
  const data = readJson(DATA_PATH);
  const basePosts = data.filter((post) => !isRoundupSlug(post.slug));
  const next = [...basePosts];
  let addedOrUpdatedRoundups = 0;

  for (const [category, config] of Object.entries(SECTION_CONFIG)) {
    if (!ROUNDUP_CATEGORIES.has(category)) continue;
    const sectionPosts = basePosts
      .filter((post) => post.category === category)
      .sort(byRecent)
      .slice(0, 6);
    if (sectionPosts.length < 5) continue;

    for (const round of ROUNDUP_DATES) {
      const slug = buildSlug(config.folder, round.kind, round.iso);
      const existing = data.find((post) => post.slug === slug) || {};
      next.push(buildEntry(category, round, sectionPosts, existing));
      addedOrUpdatedRoundups += 1;
    }
  }

  next.sort(byRecent);
  writeJson(DATA_PATH, next);
  console.log(JSON.stringify({
    addedOrUpdatedRoundups,
    totalPosts: next.length
  }, null, 2));
}

main();
