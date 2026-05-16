function parseDate(value) {
  if (!value) return 0;
  return new Date(`${value}T00:00:00`).getTime();
}

function getSortedPosts() {
  const data = Array.isArray(window.postsData) ? window.postsData : [];
  return data.slice().sort((a, b) => {
    const aTime = parseDate(a.lastUpdated || a.date);
    const bTime = parseDate(b.lastUpdated || b.date);
    if (bTime !== aTime) return bTime - aTime;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

function formatDate(value) {
  if (!value) return "To Be Updated";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatUpdateValue(value) {
  if (!value) return "To Be Updated";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return formatDate(value);
  return String(value);
}

function getManualLatestUpdates() {
  const data = Array.isArray(window.latestUpdatesManual) ? window.latestUpdatesManual : [];
  return data
    .filter((item) => item && item.title && item.url)
    .map((item) => ({
      title: item.title,
      url: item.url,
      updated: item.updated || item.lastUpdated || ""
    }));
}

function slugify(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function statusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "released") return "status-released";
  if (key === "new") return "status-new";
  if (key === "expected") return "status-expected";
  if (key === "latest update") return "status-latest-update";
  if (key === "to be updated") return "status-to-be-updated";
  if (key === "closed") return "status-closed";
  return "status-to-be-updated";
}

function renderLatestUpdates() {
  const latestNode = document.getElementById("latest-updates-list");
  if (!latestNode) return;

  const manualPosts = getManualLatestUpdates();
  if (manualPosts.length) {
    latestNode.innerHTML = manualPosts
      .slice(0, 6)
      .map(
        (post) => `
      <li>
        <a href="${post.url}">${post.title}</a>
        <div class="meta-row">
          <span>Updated: ${formatUpdateValue(post.updated)}</span>
        </div>
      </li>
    `
      )
      .join("");
    return;
  }

  const posts = getSortedPosts().slice(0, 6);
  latestNode.innerHTML = posts
    .map(
      (post) => `
      <li>
        <a href="${post.url}">${post.title}</a>
        <div class="meta-row">
          <span>Updated: ${formatDate(post.lastUpdated || post.date)}</span>
        </div>
      </li>
    `
    )
    .join("");
}

function renderPriorityUpdates() {
  const node = document.getElementById("priority-updates-list");
  if (!node) return;

  const posts = getSortedPosts().filter((post) => Boolean(post.priority)).slice(0, 6);
  node.innerHTML = posts
    .map(
      (post) => `
      <li>
        <a href="${post.url}">${post.title}</a>
        <div class="meta-row">
          <span>Updated: ${formatDate(post.lastUpdated || post.date)}</span>
        </div>
      </li>
    `
    )
    .join("");
}

function matchesCategory(post, categoryFilter) {
  if (!categoryFilter) return false;
  const filters = categoryFilter.split(",").map((item) => item.trim().toLowerCase());
  const postCategories = String(post.category || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return postCategories.some((item) => filters.includes(item));
}

function renderCategoryLists() {
  const posts = getSortedPosts();
  const blocks = document.querySelectorAll("[data-post-category]");

  blocks.forEach((block) => {
    const category = block.getAttribute("data-post-category") || "";
    const max = Number(block.getAttribute("data-max")) || 8;
    const filtered = posts.filter((post) => matchesCategory(post, category)).slice(0, max);

    if (!filtered.length) {
      block.innerHTML = `<li><span>Official update will be added after announcement.</span></li>`;
      return;
    }

    block.innerHTML = filtered
      .map(
        (post) => `
      <li>
        <a href="${post.url}">${post.title}</a>
        <div class="meta-row">
          <span>Updated: ${formatDate(post.lastUpdated || post.date)}</span>
        </div>
      </li>
    `
      )
      .join("");
  });
}

function renderDynamicImportantLinks() {
  const node = document.getElementById("important-links-dynamic");
  if (!node) return;

  const posts = getSortedPosts().filter((post) => post.priority).slice(0, 8);
  node.innerHTML = posts
    .map(
      (post) => `<a href="${post.url}">${post.title}<span class="status-badge ${statusClass(post.status)}">${post.status}</span></a>`
    )
    .join("");
}

function setupSearch() {
  const posts = getSortedPosts();
  const searchInput = document.getElementById("search-input");
  const resultsNode = document.getElementById("search-results");
  if (!searchInput || !resultsNode) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      resultsNode.classList.remove("active");
      resultsNode.innerHTML = "";
      return;
    }

    const matches = posts.filter((post) => {
      const haystack = [
        post.title,
        post.category,
        post.organization,
        post.shortName,
        post.status,
        Array.isArray(post.keywords) ? post.keywords.join(" ") : ""
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    if (!matches.length) {
      resultsNode.classList.add("active");
      resultsNode.innerHTML = `<p style="padding:0.7rem;margin:0;">No update found. Please check latest updates section.</p>`;
      return;
    }

    resultsNode.classList.add("active");
    resultsNode.innerHTML = `<ul>${matches
      .slice(0, 12)
      .map(
        (post) =>
          `<li><a href="${post.url}"><strong>${post.title}</strong><br><small>${post.category} | ${post.shortName || post.organization || "Bihar Update"}</small></a></li>`
      )
      .join("")}</ul>`;
  });

  document.addEventListener("click", (event) => {
    if (!resultsNode.contains(event.target) && event.target !== searchInput) {
      resultsNode.classList.remove("active");
    }
  });
}

function setupMenuToggle() {
  const btn = document.getElementById("menu-toggle");
  const nav = document.getElementById("main-menu");
  if (!btn || !nav) return;

  btn.innerHTML = `<span class="menu-toggle-icon" aria-hidden="true"></span><span class="menu-toggle-text">Menu</span>`;

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(isOpen));
  });
}

function setupBrandHomeNavigation() {
  const brand = document.querySelector(".brand-wrap");
  const homeLink = document.querySelector('#main-menu a[href$="index.html"]');
  if (!brand || !homeLink) return;
  if (brand.closest("a")) return;

  const href = homeLink.getAttribute("href");
  if (!href) return;

  brand.classList.add("brand-clickable");
  brand.setAttribute("role", "link");
  brand.setAttribute("tabindex", "0");

  const goHome = () => {
    window.location.href = href;
  };

  brand.addEventListener("click", goHome);
  brand.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goHome();
    }
  });
}

function setupFaqAccordion() {
  const buttons = document.querySelectorAll(".faq-question");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const wrapper = button.closest(".faq-item");
      if (!wrapper) return;
      wrapper.classList.toggle("open");
      const expanded = wrapper.classList.contains("open");
      button.setAttribute("aria-expanded", String(expanded));
    });
  });
}

function setupBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 350) {
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function updateYear() {
  document.querySelectorAll(".current-year").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderLatestUpdates();
  renderPriorityUpdates();
  renderCategoryLists();
  renderDynamicImportantLinks();
  setupSearch();
  setupMenuToggle();
  setupBrandHomeNavigation();
  setupFaqAccordion();
  setupBackToTop();
  updateYear();
});
