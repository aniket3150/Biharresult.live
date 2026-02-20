const MONETIZATION_FILE = "monetization.json";
const ADS_PAUSED = true;
const COOKIE_CONSENT_KEY = "br_cookie_consent_v1";

const DEFAULT_MONETIZATION = {
  adSlots: {
    "home-top": "",
    "home-between-updates": "",
    "home-mid": "",
    "home-bottom": "",
    "post-top": "",
    "post-bottom": "",
    "mobile-inline": "",
    "footer": "",
    "right-rail": "",
    "left-rail": ""
  },
  affiliates: {
    home: [
      {
        title: "Govt Exam Test Series",
        description: "Practice mock tests for Bihar SSC, BPSC, and Police exams.",
        cta: "View Offer",
        url: "#"
      },
      {
        title: "Online Learning App",
        description: "Get premium courses for competitive exams and board preparation.",
        cta: "Join Now",
        url: "#"
      },
      {
        title: "Student Credit Card Help",
        description: "Apply assistance and document support resources for students.",
        cta: "Check Details",
        url: "#"
      },
      {
        title: "Hostel & PG Finder",
        description: "Trusted student accommodation options in major Bihar cities.",
        cta: "Explore",
        url: "#"
      }
    ],
    post: [
      {
        title: "Bihar Exam Book Store",
        description: "Buy latest syllabus books and solved papers for Bihar exams.",
        cta: "Open Store",
        url: "#"
      },
      {
        title: "Mock Test Platform",
        description: "Online practice sets for SSC, BPSC, Police and Railways.",
        cta: "Start Practice",
        url: "#"
      },
      {
        title: "Document Print Service",
        description: "Quick online print and document formatting support.",
        cta: "Get Service",
        url: "#"
      }
    ]
  }
};

function getBasePrefix() {
  return window.location.pathname.includes("/sections/") ? "../../" : "";
}

async function loadMonetizationConfig() {
  const fallback = DEFAULT_MONETIZATION;
  try {
    const base = getBasePrefix();
    const res = await fetch(`${base}${MONETIZATION_FILE}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    const incoming = await res.json();
    return {
      adSlots: { ...fallback.adSlots, ...(incoming.adSlots || {}) },
      affiliates: { ...fallback.affiliates, ...(incoming.affiliates || {}) }
    };
  } catch (error) {
    return fallback;
  }
}

function folderToCategory(folder) {
  const map = {
    "latest-results": "Latest Results",
    "latest-jobs": "Latest Jobs",
    "admit-card": "Admit Card",
    "scholarship": "Scholarship",
    "sarkari-yojana": "Sarkari Yojana",
    "admission": "Admission",
    "verification": "Verification"
  };
  return map[folder] || "";
}

function categoryToFolder(category) {
  const map = {
    "Latest Results": "latest-results",
    "Latest Jobs": "latest-jobs",
    "Admit Card": "admit-card",
    "Scholarship": "scholarship",
    "Sarkari Yojana": "sarkari-yojana",
    "Admission": "admission",
    "Verification": "verification"
  };
  return map[category] || "";
}

async function loadPostsData() {
  try {
    const base = getBasePrefix();
    const res = await fetch(`${base}data.json`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

function getSectionPathInfo() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const parts = path.split("/");
  const sectionIndex = parts.indexOf("sections");
  if (sectionIndex < 0) return null;
  const folder = parts[sectionIndex + 1];
  const file = parts[sectionIndex + 2] || "";
  const slug = decodeURIComponent(file.replace(/\.html$/i, ""));
  if (!folder || !slug) return null;
  return { folder, slug };
}

function byUpdatedDate(a, b) {
  return new Date(b.updatedAt || b.publishedAt || 0) - new Date(a.updatedAt || a.publishedAt || 0);
}

function renderRelatedUpdatesSection(posts) {
  const info = getSectionPathInfo();
  if (!info) return;
  if (document.getElementById("br-related-updates")) return;

  const category = folderToCategory(info.folder);
  if (!category) return;

  const related = posts
    .filter((post) => post.category === category && post.slug !== info.slug)
    .sort(byUpdatedDate)
    .slice(0, 6);
  if (!related.length) return;

  const card = document.querySelector("article.section-card");
  if (!card) return;

  const section = document.createElement("section");
  section.className = "mt-6";
  section.id = "br-related-updates";

  const title = document.createElement("h2");
  title.className = "table-title";
  title.textContent = `Related ${category} Updates`;

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";

  related.forEach((post) => {
    const folder = categoryToFolder(post.category) || info.folder;
    const link = document.createElement("a");
    link.className = "link-btn secondary";
    link.href = `../${folder}/${encodeURIComponent(post.slug)}.html`;
    link.textContent = post.title;
    grid.appendChild(link);
  });

  section.appendChild(title);
  section.appendChild(grid);

  const beforeStart = card.querySelector("#before-start-section");
  if (beforeStart) {
    beforeStart.insertAdjacentElement("beforebegin", section);
    return;
  }
  card.appendChild(section);
}

function inferAdSlotName(slot, indexOnPage) {
  if (slot.id === "ad-home-between-updates") return "home-between-updates";
  if (slot.id === "ad-home-top") return "home-top";
  if (slot.id === "ad-home-mid") return "home-mid";
  if (slot.id === "ad-home-bottom") return "home-bottom";
  if (slot.id === "ad-post-top") return "post-top";
  if (slot.id === "ad-post-bottom") return "post-bottom";
  if (window.location.pathname.includes("/sections/")) return indexOnPage === 0 ? "post-top" : "post-bottom";
  return indexOnPage === 0 ? "home-top" : "home-mid";
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

function renderAdSlotPlaceholders(config) {
  const slots = Array.from(document.querySelectorAll(".br-ad-slot-code"));
  slots.forEach((slot, idx) => {
    if (slot.children.length > 0) return;
    if (slot.textContent.trim().length > 0) return;

    const slotName = inferAdSlotName(slot, idx);
    const code = config?.adSlots?.[slotName] || "";

    if (code.trim()) {
      slot.innerHTML = code;
      return;
    }

    slot.textContent = `Paste ad code in monetization.json > adSlots > ${slotName}`;
  });
}

function addAffiliateDisclosure(grid) {
  if (grid.nextElementSibling?.classList?.contains("br-aff-note")) return;
  const note = document.createElement("p");
  note.className = "br-aff-note";
  note.textContent = "Affiliate Disclosure: We may earn a commission from qualifying purchases.";
  grid.insertAdjacentElement("afterend", note);
}

function renderAffiliateBlocks(config) {
  const isSectionPost = window.location.pathname.includes("/sections/");
  const isHome = /\/(?:index\.html)?$/.test(window.location.pathname) || window.location.pathname === "/";

  document.querySelectorAll(".br-affiliate-grid").forEach((grid) => {
    if (grid.children.length > 0) return;
    const limit = Number.parseInt(grid.dataset.affiliateLimit || "4", 10);
    const group = grid.dataset.affiliateGroup || (isHome ? "home" : (isSectionPost ? "post" : "post"));
    const offers = config?.affiliates?.[group] || config?.affiliates?.post || [];

    offers.slice(0, Number.isFinite(limit) ? limit : 4).forEach((offer) => {
      const card = document.createElement("article");
      card.className = "br-aff-card";

      const title = document.createElement("h3");
      title.className = "br-aff-title";
      title.textContent = offer.title;

      const desc = document.createElement("p");
      desc.className = "br-aff-desc";
      desc.textContent = offer.description;

      const cta = document.createElement("a");
      cta.className = "br-aff-btn";
      cta.href = sanitizeUrl(offer.url || "#");
      cta.target = "_blank";
      cta.rel = "sponsored nofollow noopener noreferrer";
      cta.textContent = offer.cta || "Open";

      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(cta);
      grid.appendChild(card);
    });

    addAffiliateDisclosure(grid);
  });
}

function renderMobileStickyAd(config) {
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  const code = config?.adSlots?.["mobile-sticky"] || "";
  if (!code.trim()) return;
  if (document.querySelector(".br-mobile-sticky-ad")) return;

  const wrap = document.createElement("div");
  wrap.className = "br-mobile-sticky-ad";

  const inner = document.createElement("div");
  inner.className = "br-mobile-sticky-inner";

  const codeHolder = document.createElement("div");
  codeHolder.className = "br-mobile-sticky-code";
  codeHolder.innerHTML = code;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "br-mobile-sticky-close";
  close.setAttribute("aria-label", "Close advertisement");
  close.textContent = "X";
  close.addEventListener("click", () => {
    wrap.remove();
    document.body.classList.remove("br-has-sticky-ad");
  });

  inner.appendChild(codeHolder);
  inner.appendChild(close);
  wrap.appendChild(inner);
  document.body.appendChild(wrap);
  document.body.classList.add("br-has-sticky-ad");
}

function renderMobileInlineAd(config) {
  if (!window.matchMedia("(max-width: 768px)").matches) return false;
  if (document.querySelector(".br-mobile-inline-ad")) return true;

  const code = (config?.adSlots?.["mobile-inline"] || "").trim();
  if (!code) return false;

  const section = document.createElement("section");
  section.className = "br-ad-section br-mobile-inline-ad";
  section.setAttribute("aria-label", "Mobile Inline Advertisement");

  const head = document.createElement("div");
  head.className = "br-ad-head";
  head.textContent = "Advertisement";

  const slot = document.createElement("div");
  slot.className = "br-ad-slot";

  const codeHolder = document.createElement("div");
  codeHolder.className = "br-ad-slot-code";
  codeHolder.innerHTML = code;

  slot.appendChild(codeHolder);
  section.appendChild(head);
  section.appendChild(slot);

  const isHome = /\/(?:index\.html)?$/.test(window.location.pathname) || window.location.pathname === "/";
  const isSectionPost = window.location.pathname.includes("/sections/");

  if (isHome) {
    const highlight = document.querySelector(".br-home-highlight");
    if (highlight) {
      highlight.insertAdjacentElement("afterend", section);
      return true;
    }
  }

  if (isSectionPost) {
    const article = document.querySelector("article.section-card");
    if (article) {
      article.insertAdjacentElement("afterend", section);
      return true;
    }
  }

  const main = document.querySelector("main");
  if (main) {
    main.insertAdjacentElement("afterbegin", section);
    return true;
  }
  return false;
}

function renderFooterAd(config) {
  if (document.querySelector(".br-footer-ad-wrap")) return;
  const main = document.querySelector("main");
  if (!main || !main.parentElement) return;

  const slotCode = (config?.adSlots?.footer || "").trim();
  if (!slotCode) return;

  const section = document.createElement("section");
  section.className = "br-ad-section br-wrap br-footer-ad-wrap";
  section.setAttribute("aria-label", "Footer Advertisement");

  const head = document.createElement("div");
  head.className = "br-ad-head";
  head.textContent = "Advertisement";

  const slot = document.createElement("div");
  slot.className = "br-ad-slot";

  const code = document.createElement("div");
  code.className = "br-ad-slot-code";
  code.innerHTML = slotCode;

  slot.appendChild(code);
  section.appendChild(head);
  section.appendChild(slot);

  main.insertAdjacentElement("afterend", section);
}

function syncRailLayoutState() {
  const hasLeftRail = Boolean(document.querySelector(".br-left-rail-ad"));
  const hasRightRail = Boolean(document.querySelector(".br-right-rail-ad"));
  document.body.classList.toggle("br-has-left-rail-ad", hasLeftRail);
  document.body.classList.toggle("br-has-right-rail-ad", hasRightRail);
}

function renderRightRailAd(config) {
  if (!window.matchMedia("(min-width: 1281px)").matches) return;
  if (document.querySelector(".br-right-rail-ad")) return;

  const slotCode = (config?.adSlots?.["right-rail"] || "").trim();
  if (!slotCode) return;

  const rail = document.createElement("aside");
  rail.className = "br-right-rail-ad";
  rail.setAttribute("aria-label", "Right Side Advertisement");

  const inner = document.createElement("div");
  inner.className = "br-right-rail-inner";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "br-right-rail-close";
  close.setAttribute("aria-label", "Close right side advertisement");
  close.textContent = "X";
  close.addEventListener("click", () => {
    rail.remove();
    syncRailLayoutState();
  });

  const code = document.createElement("div");
  code.className = "br-ad-slot-code";
  code.innerHTML = slotCode;

  inner.appendChild(close);
  inner.appendChild(code);
  rail.appendChild(inner);
  document.body.appendChild(rail);
  syncRailLayoutState();
}

function renderLeftRailAd(config) {
  if (!window.matchMedia("(min-width: 1281px)").matches) return;
  if (document.querySelector(".br-left-rail-ad")) return;

  const slotCode = (config?.adSlots?.["left-rail"] || config?.adSlots?.["right-rail"] || "").trim();
  if (!slotCode) return;

  const rail = document.createElement("aside");
  rail.className = "br-left-rail-ad";
  rail.setAttribute("aria-label", "Left Side Advertisement");

  const inner = document.createElement("div");
  inner.className = "br-left-rail-inner";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "br-left-rail-close";
  close.setAttribute("aria-label", "Close left side advertisement");
  close.textContent = "X";
  close.addEventListener("click", () => {
    rail.remove();
    syncRailLayoutState();
  });

  const code = document.createElement("div");
  code.className = "br-ad-slot-code";
  code.innerHTML = slotCode;

  inner.appendChild(close);
  inner.appendChild(code);
  rail.appendChild(inner);
  document.body.appendChild(rail);
  syncRailLayoutState();
}

function renderLegalLinks() {
  if (document.querySelector(".br-legal-links")) return;
  const main = document.querySelector("main");
  if (!main) return;

  const base = getBasePrefix();
  const legal = document.createElement("footer");
  legal.className = "br-legal-links";
  legal.setAttribute("aria-label", "Legal Links");
  legal.innerHTML = `
    <a href="${base}pages/legal/about.html">About Us</a>
    <a href="${base}pages/legal/contact.html">Contact Us</a>
    <a href="${base}pages/legal/privacy-policy.html">Privacy Policy</a>
    <p class="br-legal-disclaimer"><strong>Disclaimer:</strong> Information is provided for education purposes. Always verify final details from the official notification/website.</p>
  `;

  main.appendChild(legal);
}

function renderCookieConsent() {
  try {
    const saved = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (saved === "accepted" || saved === "rejected") return;
  } catch (error) {
    return;
  }

  if (document.querySelector(".br-cookie-banner")) return;

  const banner = document.createElement("section");
  banner.className = "br-cookie-banner";
  banner.setAttribute("aria-label", "Cookie consent");
  banner.innerHTML = `
    <div class="br-cookie-title">Cookie Consent</div>
    <p class="br-cookie-text">
      We use cookies and similar technologies to improve performance and measure content quality.
      By continuing, you agree to our Privacy Policy.
    </p>
    <div class="br-cookie-actions">
      <button type="button" class="br-cookie-accept">Accept</button>
      <button type="button" class="br-cookie-reject">Decline</button>
    </div>
  `;

  const setChoice = (value) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, value);
    } catch (error) {
      // no-op
    }
    banner.remove();
  };

  banner.querySelector(".br-cookie-accept")?.addEventListener("click", () => setChoice("accepted"));
  banner.querySelector(".br-cookie-reject")?.addEventListener("click", () => setChoice("rejected"));
  document.body.appendChild(banner);
}

async function initMonetization() {
  renderCookieConsent();
  renderLegalLinks();

  if (ADS_PAUSED) {
    document.body.classList.remove("br-has-sticky-ad", "br-has-left-rail-ad", "br-has-right-rail-ad");
    return;
  }

  const config = await loadMonetizationConfig();
  renderAdSlotPlaceholders(config);
  renderAffiliateBlocks(config);
  const hasMobileInline = renderMobileInlineAd(config);
  if (!hasMobileInline) renderMobileStickyAd(config);
  renderFooterAd(config);
  renderLeftRailAd(config);
  renderRightRailAd(config);
  const posts = await loadPostsData();
  renderRelatedUpdatesSection(posts);
  syncRailLayoutState();
}

document.addEventListener("DOMContentLoaded", initMonetization);

