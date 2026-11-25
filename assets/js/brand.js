/* ==========================================================================
   AutoBiz v2 — Brand theme
   One brand colour + one dark panel colour drive the whole site (website and
   member dashboard). Every shade (hover, deep, light, soft tint, dark-mode
   variant) is derived here, so an admin only picks two colours.

   Loaded in <head> right after app.css on every page so the brand is applied
   before first paint. The admin page (admin/theme.html) saves the choice.
   Storage: localStorage "autobiz_brand" — swap for a site-settings API call
   when wiring the backend so the brand applies to every visitor.
   Public API: window.ABBrand
   ========================================================================== */
(function () {
  "use strict";

  const KEY = "autobiz_brand";
  const PRESETS = [
    { id: "teal", name: "Teal", primary: "#299d91", panel: "#191919" },
    { id: "blue", name: "AutoBiz Blue", primary: "#2348ff", panel: "#0b1230" },
    { id: "violet", name: "Violet", primary: "#7048e8", panel: "#17132b" },
    { id: "emerald", name: "Emerald", primary: "#0ca678", panel: "#0f1f1a" },
    { id: "ocean", name: "Ocean", primary: "#1971c2", panel: "#0b1a2b" },
    { id: "sunset", name: "Sunset", primary: "#f76707", panel: "#1f1410" },
    { id: "rose", name: "Rose", primary: "#d6336c", panel: "#1f1018" },
    { id: "graphite", name: "Graphite", primary: "#495057", panel: "#121416" }
  ];
  // Homepage designs the admin can choose from. index.html is the entry point and
  // forwards visitors to the chosen design (see "Homepage routing" below).
  const HOMES = [
    { file: "index.html", name: "Classic", desc: "Shop-first homepage with quick-service widget" },
    { file: "index1.html", name: "Marketplace megastore", desc: "Category menu, promo carousel, flash sale" },
    { file: "index2.html", name: "Super-app launcher", desc: "Big search and live service tiles" },
    { file: "index3.html", name: "Editorial magazine", desc: "Oversized type, chapter per service" },
    { file: "index4.html", name: "Travel-led", desc: "Booking widget hero, destinations" },
    { file: "index5.html", name: "Dark premium", desc: "Glass cards, glowing USD card" },
    { file: "index6.html", name: "Bento grid", desc: "Hero of interactive mini-widgets" },
    { file: "index7.html", name: "Split-screen fintech", desc: "Phone mockup and scroll story" },
    { file: "index8.html", name: "Black Friday campaign", desc: "Countdown, coupons, deal shelves" },
    { file: "index9.html", name: "Search-first", desc: "One smart command bar" },
    { file: "index10.html", name: "Local & community", desc: "Delivery by state, local products" }
  ];
  const isHome = (f) => HOMES.some((h) => h.file === f);
  const DEFAULT = { primary: PRESETS[0].primary, panel: PRESETS[0].panel, preset: PRESETS[0].id, home: "index.html" };

  /* ---- colour maths ---- */
  const isHex = (h) => /^#([0-9a-f]{6})$/i.test(h || "");
  const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const toHex = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  const mix = (h, w, amt) => { const a = toRgb(h), b = w === "white" ? [255, 255, 255] : [0, 0, 0]; return toHex(a.map((v, i) => v + (b[i] - v) * amt)); };
  const rgbStr = (h) => toRgb(h).join(", ");
  // WCAG relative luminance — used to keep text on brand colour readable
  const lum = (h) => { const c = toRgb(h).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

  function derive(b) {
    const p = b.primary, panel = b.panel;
    const darkP = mix(p, "white", .18); // brighter primary for dark mode
    return {
      p, panel,
      p300: mix(p, "white", .25), p600: mix(p, "black", .14), p700: mix(p, "black", .32),
      soft: mix(p, "white", .9), rgb: rgbStr(p),
      onP: contrast(p, "#ffffff") >= 3 ? "#ffffff" : "#111111",
      darkP, darkP600: mix(darkP, "white", .15), darkRgb: rgbStr(darkP), darkPanel: mix(panel, "black", .35)
    };
  }

  function css(b) {
    const d = derive(b);
    return `
:root, body.ab-dash, body.ab-store {
  --ab-primary: ${d.p}; --ab-primary-300: ${d.p300}; --ab-primary-600: ${d.p600}; --ab-primary-700: ${d.p700};
  --ab-primary-rgb: ${d.rgb}; --ab-primary-soft: ${d.soft}; --ab-on-primary: ${d.onP};
  --ab-sidebar: ${d.panel};
  --bs-primary: ${d.p}; --bs-primary-rgb: ${d.rgb}; --bs-link-color: ${d.p}; --bs-link-color-rgb: ${d.rgb};
  --bs-link-hover-color: ${d.p600}; --bs-focus-ring-color: rgba(${d.rgb}, .2);
}
[data-bs-theme="dark"], [data-bs-theme="dark"] body.ab-dash, [data-bs-theme="dark"] body.ab-store {
  --ab-primary: ${d.darkP}; --ab-primary-600: ${d.darkP600}; --ab-primary-rgb: ${d.darkRgb};
  --ab-primary-soft: rgba(${d.darkRgb}, .14); --ab-sidebar: ${d.darkPanel};
  --bs-primary: ${d.darkP}; --bs-primary-rgb: ${d.darkRgb}; --bs-link-color: ${d.darkP}; --bs-link-color-rgb: ${d.darkRgb};
  --bs-link-hover-color: ${d.darkP600}; --bs-focus-ring-color: rgba(${d.darkRgb}, .2);
}`;
  }

  function logoUri(b) {
    const d = derive(b);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse"><stop stop-color="${d.p300}"/><stop offset="1" stop-color="${d.p700}"/></linearGradient></defs><rect width="48" height="48" rx="14" fill="url(#g)"/><circle cx="24" cy="24" r="12.5" stroke="#fff" stroke-opacity=".35" stroke-width="2.5"/><circle cx="24" cy="24" r="6" fill="#fff"/><path d="M24 6v8M24 34v8M6 24h8M34 24h8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function get() {
    try {
      const b = JSON.parse(localStorage.getItem(KEY));
      if (b && isHex(b.primary) && isHex(b.panel)) return { ...b, home: isHome(b.home) ? b.home : "index.html" };
    } catch (e) { /* ignore */ }
    return { ...DEFAULT };
  }

  // Apply a brand to this page (used for both the saved brand and live previews)
  function apply(b) {
    b = b || get();
    let el = document.getElementById("ab-brand");
    if (!el) { el = document.createElement("style"); el.id = "ab-brand"; document.head.appendChild(el); }
    el.textContent = css(b);
    const logo = logoUri(b);
    const swap = () => {
      document.querySelectorAll('img[src$="logo.svg"], img[data-brand-logo]').forEach((img) => { img.dataset.brandLogo = "1"; img.src = logo; });
      document.querySelectorAll('link[rel="icon"]').forEach((l) => { l.type = "image/svg+xml"; l.href = logo; });
      let m = document.querySelector('meta[name="theme-color"]');
      if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); }
      m.content = b.panel;
    };
    currentSwap = swap;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", swap, { once: true }); else swap();
  }
  // The app shell, modals and previews add logos after load: recolour them as they appear.
  let currentSwap = null;
  new MutationObserver((muts) => {
    if (!currentSwap) return;
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && (n.matches?.('img[src$="logo.svg"]') || n.querySelector?.('img[src$="logo.svg"]'))) { currentSwap(); return; }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  function save(b) {
    const clean = { primary: b.primary.toLowerCase(), panel: b.panel.toLowerCase(), preset: b.preset || null, home: isHome(b.home) ? b.home : "index.html", updatedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(clean));
    apply(clean);
    return clean;
  }
  function reset() { localStorage.removeItem(KEY); apply(DEFAULT); return { ...DEFAULT }; }

  /* ---- Homepage routing ----
     The site root (index.html) forwards to the admin-chosen design. Add ?classic=1
     to view the classic page regardless (used by previews). Server-side, the same
     setting would simply pick which template to render at "/". */
  const ROOT = (document.currentScript && document.currentScript.src.replace(/assets\/js\/brand\.js.*$/, "")) || "";
  (function routeHome() {
    const here = location.href.split(/[?#]/)[0];
    const atRoot = here === ROOT || here === ROOT + "index.html";
    if (!atRoot || /[?&]classic=1/.test(location.search)) return;
    const home = get().home;
    if (home && home !== "index.html") location.replace(ROOT + home + location.search + location.hash);
  })();

  apply();
  // Keep other open tabs in sync when the admin saves
  window.addEventListener("storage", (e) => { if (e.key === KEY) apply(); });

  window.ABBrand = { PRESETS, HOMES, DEFAULT, ROOT, get, apply, save, reset, derive, contrast, isHex, logoUri };
})();
