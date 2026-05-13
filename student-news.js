(function () {
  const NEWS_ITEMS = Array.isArray(window.STUDENT_NEWS_ITEMS) ? window.STUDENT_NEWS_ITEMS.slice() : [];

  const FILTERS = [
    { key: "all", label: "सभी" },
    { key: "important", label: "जरूरी खबर" },
    { key: "result", label: "रिजल्ट" },
    { key: "recruitment", label: "भर्ती" },
    { key: "admit-card", label: "एडमिट कार्ड" },
    { key: "admission", label: "प्रवेश" },
    { key: "scholarship", label: "छात्रवृत्ति" },
    { key: "exam-date", label: "परीक्षा तिथि" },
    { key: "answer-key", label: "आंसर की" },
    { key: "board-update", label: "बोर्ड अपडेट" },
    { key: "university-update", label: "विश्वविद्यालय अपडेट" }
  ];

  const CATEGORY_META = {
    result: { label: "रिजल्ट", tone: "result" },
    recruitment: { label: "भर्ती", tone: "recruitment" },
    "admit-card": { label: "एडमिट कार्ड", tone: "admit" },
    admission: { label: "प्रवेश", tone: "admission" },
    scholarship: { label: "छात्रवृत्ति", tone: "scholarship" },
    "exam-date": { label: "परीक्षा तिथि", tone: "exam" },
    "answer-key": { label: "आंसर की", tone: "answer" },
    "board-update": { label: "बोर्ड अपडेट", tone: "board" },
    "university-update": { label: "विश्वविद्यालय अपडेट", tone: "university" }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getCategoryMeta(key) {
    return CATEGORY_META[key] || { label: "अपडेट", tone: "default" };
  }

  function sortItems(items) {
    return items.slice().sort((left, right) => {
      if (Boolean(right.important) !== Boolean(left.important)) {
        return Number(Boolean(right.important)) - Number(Boolean(left.important));
      }
      return String(right.date || "").localeCompare(String(left.date || ""));
    });
  }

  function formatHindiDate(dateValue) {
    if (!dateValue) return "तारीख अपडेट होगी";
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateValue;
    return new Intl.DateTimeFormat("hi-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(parsed);
  }

  function matchesFilter(item, filterKey) {
    if (filterKey === "all") return true;
    if (filterKey === "important") return Boolean(item.important);
    return item.category === filterKey;
  }

  function buildImportantMarkup(item) {
    const categoryMeta = getCategoryMeta(item.category);
    return `
      <a class="br-student-news-headline-card" href="${escapeHtml(item.link)}">
        <span class="br-student-news-headline-top">
          <span class="br-student-news-urgent-badge">जरूरी</span>
          <span class="br-student-news-headline-source">${escapeHtml(item.source)}</span>
        </span>
        <strong>${escapeHtml(item.headlineHindi)}</strong>
        <span class="br-student-news-headline-meta">${escapeHtml(categoryMeta.label)} · ${escapeHtml(formatHindiDate(item.date))}</span>
      </a>
    `;
  }

  function buildCardMarkup(item) {
    const categoryMeta = getCategoryMeta(item.category);
    const importantBadge = item.important ? '<span class="br-student-news-mini-badge">जरूरी खबर</span>' : "";
    return `
      <article class="br-student-news-card br-student-news-card--${escapeHtml(categoryMeta.tone)}" itemscope itemtype="https://schema.org/NewsArticle">
        <div class="br-student-news-card-top">
          <span class="br-student-news-pill br-student-news-pill--${escapeHtml(categoryMeta.tone)}">${escapeHtml(categoryMeta.label)}</span>
          ${importantBadge}
        </div>
        <h3 class="br-student-news-card-title" itemprop="headline">
          <a href="${escapeHtml(item.link)}" itemprop="url">${escapeHtml(item.headlineHindi)}</a>
        </h3>
        <div class="br-student-news-meta-row">
          <span class="br-student-news-source">स्रोत: ${escapeHtml(item.source)}</span>
          <span class="br-student-news-date" itemprop="datePublished" content="${escapeHtml(item.date)}">${escapeHtml(formatHindiDate(item.date))}</span>
        </div>
        <p class="br-student-news-summary" itemprop="description">${escapeHtml(item.shortSummaryHindi)}</p>
        <div class="br-student-news-card-bottom">
          <span class="br-student-news-type">${escapeHtml(item.sourceType)}</span>
          <a class="br-student-news-readmore" href="${escapeHtml(item.link)}">पूरा पढ़ें</a>
        </div>
      </article>
    `;
  }

  function buildFilterButtons(activeKey) {
    return FILTERS.map((filter) => `
      <button
        class="br-student-news-filter${filter.key === activeKey ? " is-active" : ""}"
        type="button"
        data-student-news-filter="${escapeHtml(filter.key)}"
        aria-pressed="${filter.key === activeKey ? "true" : "false"}"
      >
        ${escapeHtml(filter.label)}
      </button>
    `).join("");
  }

  function setSchema(root, visibleItems) {
    const schemaId = root.getAttribute("data-student-news-schema-id") || `student-news-schema-${root.getAttribute("data-student-news-view") || "home"}`;
    let script = document.getElementById(schemaId);
    if (!script) {
      script = document.createElement("script");
      script.id = schemaId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    const url = root.getAttribute("data-student-news-page-url") || window.location.href;
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "महत्वपूर्ण छात्र समाचार",
      url,
      inLanguage: "hi-IN",
      mainEntity: {
        "@type": "ItemList",
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: visibleItems.length,
        itemListElement: visibleItems.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: new URL(item.link, window.location.origin).href,
          name: item.headlineHindi
        }))
      }
    });
  }

  function renderRoot(root) {
    const view = root.getAttribute("data-student-news-view") || "home";
    const cardLimit = Number.parseInt(root.getAttribute("data-student-news-limit") || (view === "home" ? "8" : "50"), 10);
    const importantLimit = Number.parseInt(root.getAttribute("data-student-news-important-limit") || (view === "home" ? "6" : "8"), 10);
    const defaultFilter = root.getAttribute("data-student-news-default-filter") || "all";
    const filtersEl = root.querySelector("[data-student-news-filters]");
    const importantEl = root.querySelector("[data-student-news-important-list]");
    const cardsEl = root.querySelector("[data-student-news-card-list]");
    const emptyEl = root.querySelector("[data-student-news-empty]");
    const footerLinkEl = root.querySelector("[data-student-news-view-all]");
    let activeFilter = defaultFilter;
    const sortedItems = sortItems(NEWS_ITEMS);

    if (footerLinkEl) {
      footerLinkEl.href = root.getAttribute("data-student-news-footer-href") || footerLinkEl.getAttribute("href") || "/pages/news/student-news.html";
      footerLinkEl.textContent = root.getAttribute("data-student-news-footer-label") || footerLinkEl.textContent || "सभी खबरें देखें";
    }

    function render() {
      if (filtersEl) {
        filtersEl.innerHTML = buildFilterButtons(activeFilter);
      }

      if (importantEl) {
        const importantItems = sortedItems.filter((item) => item.important).slice(0, importantLimit);
        importantEl.innerHTML = importantItems.map(buildImportantMarkup).join("");
        importantEl.closest(".br-student-news-important-shell")?.toggleAttribute("hidden", importantItems.length === 0);
      }

      const filteredItems = sortedItems.filter((item) => matchesFilter(item, activeFilter));
      const visibleItems = view === "home" ? filteredItems.slice(0, cardLimit) : filteredItems;

      if (cardsEl) {
        cardsEl.innerHTML = visibleItems.map(buildCardMarkup).join("");
      }

      if (emptyEl) {
        emptyEl.hidden = visibleItems.length !== 0;
      }

      setSchema(root, visibleItems.slice(0, 12));
    }

    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-student-news-filter]");
      if (!button) return;
      activeFilter = button.getAttribute("data-student-news-filter") || "all";
      render();
    });

    render();
  }

  function initStudentNews() {
    document.querySelectorAll("[data-student-news-root]").forEach(renderRoot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStudentNews, { once: true });
  } else {
    initStudentNews();
  }
})();
