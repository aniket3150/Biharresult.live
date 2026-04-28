(function () {
  const MEASUREMENT_ID = "G-YVN84V93Z6";
  let scheduled = false;

  function loadAnalytics() {
    if (window.__brAnalyticsLoaded) return;
    window.__brAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID);

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  function scheduleAnalytics() {
    if (scheduled) return;
    scheduled = true;

    const runner = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(loadAnalytics, { timeout: 4000 });
        return;
      }
      window.setTimeout(loadAnalytics, 1200);
    };

    if (document.readyState === "complete") {
      runner();
      return;
    }

    window.addEventListener("load", runner, { once: true, passive: true });
  }

  scheduleAnalytics();
})();
