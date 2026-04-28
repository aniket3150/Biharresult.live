function resolveLegacyAssetVersion() {
  const script = document.querySelector('script[src*="post-legacy.js"]');
  const assetUrl = script ? script.getAttribute("src") || "" : "";
  if (!assetUrl) return "";

  try {
    return new URL(assetUrl, window.location.href).searchParams.get("v") || "";
  } catch (error) {
    return "";
  }
}

const LEGACY_ASSET_VERSION = resolveLegacyAssetVersion();

function withLegacyAssetVersion(url) {
  if (!LEGACY_ASSET_VERSION) return url;

  try {
    const [baseUrl, hash = ""] = url.split("#");
    const [path, query = ""] = baseUrl.split("?");
    const params = new URLSearchParams(query);
    params.set("v", LEGACY_ASSET_VERSION);
    const nextUrl = `${path}?${params.toString()}`;
    return hash ? `${nextUrl}#${hash}` : nextUrl;
  } catch (error) {
    return url;
  }
}

function getSlugFromLegacyUrl() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  return String(slug || "").trim();
}

function renderLegacyNotFound() {
  const root = document.getElementById("post-root");
  if (!root) return;
  root.innerHTML = "<article class=\"section-card\"><h1>Post not found</h1><p>The requested post could not be located.</p></article>";
}

async function redirectLegacyPost() {
  const slug = getSlugFromLegacyUrl();
  if (!slug) {
    renderLegacyNotFound();
    return;
  }

  try {
    const response = await fetch(withLegacyAssetVersion("slug-paths.json"), { cache: "default" });
    if (!response.ok) throw new Error(`slug-paths.json ${response.status}`);

    const mapping = await response.json();
    const target = typeof mapping?.[slug] === "string" ? mapping[slug].trim() : "";
    if (!target) {
      renderLegacyNotFound();
      return;
    }

    window.location.replace(target.startsWith("/") ? target : `/${target.replace(/^\/+/, "")}`);
  } catch (error) {
    renderLegacyNotFound();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", redirectLegacyPost, { once: true });
} else {
  redirectLegacyPost();
}
