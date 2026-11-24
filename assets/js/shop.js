/* ==========================================================================
   AutoBiz v2 — Marketplace shared helpers (window.SHOP)
   Used by marketplace.html, product.html, cart.html and orders.html.
   Depends on data.js + app.js (AB).
   ========================================================================== */
(function () {
  "use strict";
  const { esc, fmt } = AB;
  const P = AB_DATA.products;

  const STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
  // Delivery zones: 1 = Lagos, 2 = South-West + Abuja + PH hubs, 3 = everywhere else
  const ZONE = { Lagos: 1, Ogun: 2, Oyo: 2, Osun: 2, Ondo: 2, Ekiti: 2, "FCT - Abuja": 2, Rivers: 2, Edo: 2, Delta: 2, Anambra: 2, Enugu: 2 };
  const zoneOf = (s) => ZONE[s] || 3;
  const ZONE_INFO = {
    1: { fee: 2000, days: [1, 2] },
    2: { fee: 3000, days: [2, 4] },
    3: { fee: 4500, days: [3, 6] }
  };
  const EXPRESS_FEE = 3500;
  const PICKUP_HUBS = {
    1: ["AutoBiz Hub — Ikeja City Mall", "AutoBiz Hub — Lekki Phase 1", "AutoBiz Hub — Yaba Tech Plaza"],
    2: ["AutoBiz Hub — City Centre", "Partner Pickup — Shoprite Mall"],
    3: ["Partner Pickup — GIG Logistics office"]
  };

  const COLOR_NAMES = { "#1b1f3b": "Midnight", "#a3b8ff": "Sky Blue", "#e9e3d5": "Cream", "#3b3b3d": "Black Titanium", "#c9c2b6": "Natural Titanium", "#f2f2f2": "White Titanium", "#111": "Black", "#6ad": "Ocean Blue", "#a8e": "Lavender", "#2e3440": "Midnight", "#d8dee9": "Starlight", "#e8e4dc": "Silver", "#fff": "White", "#e64980": "Rose", "#f59f00": "Mustard", "#12b886": "Emerald", "#8b5e3c": "Brown", "#c0c0c0": "Silver", "#ff8fab": "Pink" };
  const colorName = (hex) => (hex ? COLOR_NAMES[hex.toLowerCase()] || hex : "");

  const product = (id) => P.find((p) => p.id === id);
  const category = (id) => AB_DATA.categories.find((c) => c.id === id);
  const disc = (p) => (p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);

  // Deterministic pseudo-random generator (stable reviews, codes, etc.)
  function seeded(seed) {
    let h = 2166136261;
    for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function stars(r, cls = "") {
    let out = "";
    for (let i = 1; i <= 5; i++) out += `<i class="bi ${r >= i ? "bi-star-fill" : r >= i - 0.5 ? "bi-star-half" : "bi-star"}"></i>`;
    return `<span class="ab-stars ${cls}" role="img" aria-label="Rated ${r} out of 5">${out}</span>`;
  }

  function inCartQty(id) { return AB.cart.items().filter((l) => l.id === id).reduce((a, l) => a + l.qty, 0); }

  function addToCart(id, qty = 1, color) {
    const p = product(id);
    if (!p) return false;
    const left = p.stock - inCartQty(id);
    if (left <= 0) { AB.toast(`You already have the maximum available (${p.stock}) in your cart`, "warning"); return false; }
    AB.cart.add(id, Math.min(qty, left), { color: color === undefined ? (p.colors ? p.colors[0] : null) : color });
    return true;
  }

  function toggleWish(id, btn) {
    const on = AB.wishlist.toggle(id);
    const p = product(id);
    AB.toast(on ? `<b>${esc(p.name)}</b> saved to your wishlist` : "Removed from wishlist", on ? "success" : "info", on ? { action: { label: "View wishlist", href: "orders.html?tab=wishlist" } } : {});
    document.querySelectorAll(`[data-wish="${id}"]`).forEach(syncWishBtn);
    return on;
  }
  function syncWishBtn(b) {
    const on = AB.wishlist.has(b.dataset.wish);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
    const i = b.querySelector("i"); if (i) i.className = "bi " + (on ? "bi-heart-fill" : "bi-heart");
    if (b.dataset.wishLabel !== undefined) { const l = b.querySelector("span"); if (l) l.textContent = on ? "Saved" : "Wishlist"; }
  }

  function card(p, { list = false, flash = false } = {}) {
    const d = disc(p);
    const wish = AB.wishlist.has(p.id);
    const low = p.stock <= 10 && !p.digital;
    return `
    <div class="card pcard ${list ? "list" : ""} ${flash ? "flash" : ""}">
      <a href="product.html?id=${p.id}" class="pcard-media" aria-label="${esc(p.name)}">
        ${AB.productArt(p)}
        ${d ? `<span class="pcard-off">-${d}%</span>` : ""}
        ${p.badge && !/^-/.test(p.badge) ? `<span class="pcard-badge">${esc(p.badge)}</span>` : ""}
      </a>
      <button class="pcard-wish ${wish ? "on" : ""}" data-wish="${p.id}" aria-pressed="${wish}" aria-label="Save ${esc(p.name)} to wishlist"><i class="bi ${wish ? "bi-heart-fill" : "bi-heart"}"></i></button>
      <div class="pcard-body">
        <div class="fs-8 text-muted text-truncate">${esc(p.brand)}${p.brand !== p.seller ? " · " + esc(p.seller) : ""}</div>
        <a href="product.html?id=${p.id}" class="pcard-title">${esc(p.name)}</a>
        <div class="d-flex align-items-center gap-1 fs-8 text-muted">${stars(p.rating)}<span class="fw-semibold text-body">${p.rating}</span><span>(${fmt.num(p.reviews)})</span></div>
        ${list ? `<div class="fs-7 text-muted d-none d-md-block mt-1">${esc(shortDesc(p))}</div>` : ""}
        <div class="pcard-foot">
          <div class="min-w-0">
            <div class="fw-800 tabular pcard-price">${fmt.naira(p.price)}</div>
            ${p.oldPrice ? `<div class="fs-8 text-muted text-decoration-line-through tabular">${fmt.naira(p.oldPrice)}</div>` : ""}
          </div>
          <button class="btn btn-soft btn-icon btn-sm pcard-add" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart"><i class="bi bi-cart-plus"></i></button>
        </div>
        ${flash ? `<div class="mt-2"><div class="progress" style="height:6px"><div class="progress-bar bg-danger" style="width:${flashSold(p)}%"></div></div><div class="fs-8 text-muted mt-1">${flashSold(p)}% claimed</div></div>` : `
        <div class="pcard-tags">
          ${p.digital ? `<span class="tag tag-warning"><i class="bi bi-lightning-charge-fill"></i>Instant</span>` : p.freeShipping ? `<span class="tag tag-success"><i class="bi bi-truck"></i>Free delivery</span>` : ""}
          ${low ? `<span class="tag tag-danger">Only ${p.stock} left</span>` : ""}
        </div>`}
      </div>
    </div>`;
  }
  const flashSold = (p) => 40 + Math.floor(seeded(p.id + "f")() * 55);

  function shortDesc(p) {
    const c = category(p.category);
    const base = {
      phones: "Flagship performance, all-day battery and a stunning display — with official warranty.",
      electronics: "Genuine, brand-new and covered by manufacturer warranty. Shipped sealed.",
      fashion: "Quality materials, comfortable fit and made to turn heads at any occasion.",
      home: "Built for Nigerian homes — durable, energy efficient and easy to use.",
      beauty: "Dermatologically tested, cruelty free and loved by thousands of customers.",
      groceries: "Fresh stock from trusted distributors, sealed and delivered to your door.",
      gaming: "Next-level play with genuine hardware and full seller warranty.",
      digital: "Code delivered instantly to your orders page and email after payment."
    }[p.category];
    return base || (c ? c.name : "");
  }

  /* ---------- Delivery ---------- */
  const allFree = (items) => items.length > 0 && items.every((l) => { const p = product(l.id); return l.digital || (p && (p.freeShipping || p.digital)); });
  const allDigital = (items) => items.length > 0 && items.every((l) => l.digital);
  function deliveryFee(items, method, state) {
    if (!items.length || allDigital(items) || method === "pickup" || method === "digital") return 0;
    const base = allFree(items) ? 0 : ZONE_INFO[zoneOf(state)].fee;
    return method === "express" ? base + EXPRESS_FEE : base;
  }
  function eta(state, method) {
    if (method === "digital") return "Instant";
    const [a, b] = ZONE_INFO[zoneOf(state)].days;
    const range = method === "express" ? [1, Math.max(1, a)] : method === "pickup" ? [a, b - 1 || a] : [a, b];
    const d = (n) => { const x = new Date(); let added = 0; while (added < n) { x.setDate(x.getDate() + 1); if (x.getDay() !== 0) added++; } return x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); };
    return range[0] === range[1] ? d(range[0]) : `${d(range[0])} – ${d(range[1])}`;
  }

  /* ---------- Orders ---------- */
  const ORDER_STATUS = {
    processing: { label: "Processing", cls: "pending", icon: "bi-hourglass-split" },
    shipped: { label: "Shipped", cls: "info", icon: "bi-truck" },
    delivered: { label: "Delivered", cls: "success", icon: "bi-check2-circle" },
    cancelled: { label: "Cancelled", cls: "failed", icon: "bi-x-circle" }
  };
  function voucherCode(orderId, itemId, n = 0) {
    const r = seeded(orderId + itemId + n), A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = ""; for (let i = 0; i < 16; i++) { s += A[Math.floor(r() * A.length)]; if (i % 4 === 3 && i < 15) s += "-"; }
    return s;
  }
  // Demo logistics: orders progress over time (processing → shipped → delivered)
  const STEP_MS = { shipped: 3 * 60e3, out: 8 * 60e3, delivered: 15 * 60e3, digital: 20e3 };
  function advanceOrders() {
    const orders = AB.store.get("orders") || [];
    let changed = false;
    const now = Date.now();
    orders.forEach((o) => {
      if (o.status === "cancelled" || o.status === "delivered") return;
      const age = now - o.date;
      const mark = (key, at) => { const s = o.timeline.find((t) => t.key === key); if (s && !s.done) { s.done = true; s.date = o.date + at; changed = true; } };
      if (o.method === "digital") {
        if (age >= STEP_MS.digital) { mark("confirmed", 5e3); mark("delivered", STEP_MS.digital); o.status = "delivered"; o.paid = true; changed = true; }
        return;
      }
      const speed = o.method === "express" ? 0.5 : 1;
      if (age >= 30e3) mark("confirmed", 30e3);
      if (age >= STEP_MS.shipped * speed) { mark("shipped", STEP_MS.shipped * speed); if (o.status !== "shipped") { o.status = "shipped"; changed = true; } }
      if (age >= STEP_MS.out * speed) mark("out", STEP_MS.out * speed);
      if (age >= STEP_MS.delivered * speed) { mark("delivered", STEP_MS.delivered * speed); o.status = "delivered"; o.paid = true; }
    });
    if (changed) AB.store.set("orders", orders);
    return changed;
  }
  function buildTimeline(method) {
    const now = Date.now();
    if (method === "digital") return [
      { key: "placed", label: "Order placed", note: "Payment received", done: true, date: now },
      { key: "confirmed", label: "Code generated", note: "Vouchers issued by supplier", done: false },
      { key: "delivered", label: "Delivered", note: "Sent to your orders page & email", done: false }
    ];
    return [
      { key: "placed", label: "Order placed", note: "We've received your order", done: true, date: now },
      { key: "confirmed", label: "Confirmed by seller", note: "Seller is packing your items", done: false },
      { key: "shipped", label: "Shipped", note: method === "pickup" ? "On the way to pickup hub" : "Handed to logistics partner", done: false },
      { key: "out", label: method === "pickup" ? "Ready for pickup" : "Out for delivery", note: method === "pickup" ? "Bring your order ID" : "Rider is on the way", done: false },
      { key: "delivered", label: method === "pickup" ? "Picked up" : "Delivered", note: "Enjoy your purchase!", done: false }
    ];
  }

  /* ---------- Shared styles (cards, stars, steppers) ---------- */
  const css = `
  .btn-link{text-decoration:none}.btn-link:hover{text-decoration:underline}
  .ab-stars{display:inline-flex;gap:1px;color:#f59f00;font-size:.72rem;line-height:1}
  .ab-stars.lg{font-size:1rem;gap:3px}
  .pcard{position:relative;overflow:hidden;height:100%;display:flex;flex-direction:column;transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
  .pcard:hover{transform:translateY(-3px);box-shadow:var(--ab-shadow);border-color:rgba(var(--ab-primary-rgb),.25)}
  .pcard-media{display:block;position:relative;padding:.6rem .6rem 0;color:inherit}
  .pcard-media .ab-product-art{font-size:3rem;border-radius:12px}
  .pcard-off{position:absolute;left:1rem;top:1rem;background:var(--ab-danger);color:#fff;font-size:.7rem;font-weight:800;padding:.2rem .45rem;border-radius:8px;z-index:2}
  .pcard-badge{position:absolute;left:1rem;bottom:.5rem;background:var(--ab-surface);color:var(--ab-text);font-size:.68rem;font-weight:700;padding:.18rem .5rem;border-radius:8px;z-index:2;box-shadow:var(--ab-shadow-sm)}
  .pcard-wish{position:absolute;right:1rem;top:1rem;z-index:3;width:34px;height:34px;border-radius:50%;border:0;display:grid;place-items:center;background:var(--ab-surface);color:var(--ab-muted);box-shadow:var(--ab-shadow-sm);transition:transform .15s,color .15s}
  .pcard-wish:hover{color:var(--ab-pink);transform:scale(1.08)}
  .pcard-wish.on{color:var(--ab-pink)}
  .pcard-wish.on i{animation:ab-pop .35s cubic-bezier(.2,1.6,.4,1)}
  .pcard-body{padding:.75rem .9rem .9rem;display:flex;flex-direction:column;gap:.2rem;flex:1;min-width:0}
  .pcard-title{color:var(--ab-text);font-weight:600;font-size:.875rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.6em}
  .pcard-title:hover{color:var(--ab-primary)}
  .pcard-foot{display:flex;align-items:end;justify-content:space-between;gap:.5rem;margin-top:auto;padding-top:.35rem}
  .pcard-price{font-size:1rem}
  .pcard-add{flex-shrink:0}
  .pcard-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.35rem;min-height:1.3rem}
  .tag{display:inline-flex;align-items:center;gap:.25rem;font-size:.66rem;font-weight:700;padding:.15rem .45rem;border-radius:6px}
  .tag-success{background:var(--ab-accent-soft);color:var(--ab-accent)}
  .tag-warning{background:var(--ab-warning-soft);color:#d48806}
  .tag-danger{background:var(--ab-danger-soft);color:var(--ab-danger)}
  .pcard.list{flex-direction:row}
  .pcard.list .pcard-media{width:180px;flex-shrink:0;padding:.75rem}
  .pcard.list .pcard-off{left:1.15rem;top:1.15rem}
  .pcard.list .pcard-wish{right:auto;left:calc(180px - 3rem)}
  .pcard.list .pcard-title{min-height:0;font-size:.95rem}
  @media (max-width:575.98px){
    .pcard-media{padding:.45rem .45rem 0}
    .pcard-media .ab-product-art{font-size:2.4rem}
    .pcard-off{left:.75rem;top:.75rem}
    .pcard-wish{right:.7rem;top:.7rem;width:30px;height:30px;font-size:.85rem}
    .pcard-body{padding:.6rem .65rem .7rem}
    .pcard-title{font-size:.8rem}
    .pcard-price{font-size:.9rem}
    .pcard.list .pcard-media{width:120px;padding:.5rem}
    .pcard.list .pcard-wish{left:calc(120px - 2.6rem)}
  }
  .ab-qty{display:inline-flex;align-items:center;border:1px solid var(--ab-border);border-radius:12px;background:var(--ab-surface);overflow:hidden}
  .ab-qty button{border:0;background:transparent;width:36px;height:36px;color:var(--ab-text);display:grid;place-items:center}
  .ab-qty button:hover:not(:disabled){background:var(--ab-surface-2);color:var(--ab-primary)}
  .ab-qty button:disabled{opacity:.35}
  .ab-qty input{width:42px;border:0;text-align:center;font-weight:700;background:transparent;color:var(--ab-text);-moz-appearance:textfield}
  .ab-qty input::-webkit-inner-spin-button{-webkit-appearance:none}
  .ab-qty.lg button{width:44px;height:46px}
  .ab-timeline{list-style:none;padding:0;margin:0;position:relative}
  .ab-timeline li{position:relative;padding:0 0 1.1rem 2.1rem}
  .ab-timeline li:last-child{padding-bottom:0}
  .ab-timeline li::before{content:"";position:absolute;left:11px;top:22px;bottom:-2px;width:2px;background:var(--ab-border)}
  .ab-timeline li:last-child::before{display:none}
  .ab-timeline li.done::before{background:var(--ab-accent)}
  .ab-timeline .dot{position:absolute;left:0;top:0;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:.75rem;background:var(--ab-surface-2);border:2px solid var(--ab-border);color:var(--ab-muted)}
  .ab-timeline li.done .dot{background:var(--ab-accent);border-color:var(--ab-accent);color:#fff}
  .ab-timeline li.current .dot{border-color:var(--ab-primary);color:var(--ab-primary);box-shadow:0 0 0 4px rgba(var(--ab-primary-rgb),.15)}
  .ab-timeline li.cancel .dot{background:var(--ab-danger);border-color:var(--ab-danger);color:#fff}
  `;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // Delegated actions for any rendered card
  document.addEventListener("click", (e) => {
    const w = e.target.closest("[data-wish]");
    if (w) { e.preventDefault(); toggleWish(w.dataset.wish, w); return; }
    const a = e.target.closest("[data-add]");
    if (a) {
      e.preventDefault();
      if (addToCart(a.dataset.add, 1)) { a.innerHTML = `<i class="bi bi-check2"></i>`; setTimeout(() => (a.innerHTML = `<i class="bi bi-cart-plus"></i>`), 1200); }
    }
  });

  window.SHOP = { STATES, PICKUP_HUBS, zoneOf, product, category, disc, stars, card, colorName, seeded, addToCart, inCartQty, toggleWish, syncWishBtn, shortDesc, allFree, allDigital, deliveryFee, eta, EXPRESS_FEE, ORDER_STATUS, voucherCode, advanceOrders, buildTimeline };
})();
