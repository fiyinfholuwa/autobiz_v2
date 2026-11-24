/* ==========================================================================
   AutoBiz v2 — Core runtime
   - App shell (sidebar, topbar, mobile bottom nav)
   - Persistent store (localStorage) acting as a demo backend
   - Wallet, transactions, cart, notifications
   - UI helpers: toast, PIN confirmation, success receipt, formatting
   Public API: window.AB
   ========================================================================== */
(function () {
  "use strict";

  const STORE_KEY = "autobiz_v2";
  const DEFAULT_STATE = () => ({
    user: { firstName: "Adaeze", lastName: "Okafor", email: "adaeze@example.com", phone: "08031234567", tier: "Tier 2", username: "adaeze" },
    wallet: { balance: 285750.5, usd: 120 },
    transactions: seedTransactions(),
    cart: [],
    wishlist: [],
    orders: [],
    esims: [],
    bookings: [],
    cards: [],
    trades: [],
    notifications: [
      { id: 1, icon: "bi-gift", tone: "pink", title: "Gift card rates are up", body: "Apple & Steam cards now trade at up to ₦1,210/$", time: Date.now() - 36e5, read: false },
      { id: 2, icon: "bi-airplane", tone: "cyan", title: "Fly Lagos → Dubai from ₦890k", body: "Limited Emirates fares this week only.", time: Date.now() - 864e5, read: false },
      { id: 3, icon: "bi-sim", tone: "violet", title: "Travel with eSIM", body: "Stay connected in 120+ countries. No roaming fees.", time: Date.now() - 2 * 864e5, read: true }
    ],
    settings: { theme: "light", hideBalance: false, pinSet: true }
  });

  function seedTransactions() {
    const now = Date.now();
    const h = 36e5;
    return [
      { id: "TX" + (now - 2 * h), type: "airtime", title: "MTN Airtime", subtitle: "08031234567", amount: 2000, direction: "out", status: "success", icon: "bi-phone", tone: "warning", date: now - 2 * h },
      { id: "TX" + (now - 5 * h), type: "funding", title: "Wallet Funding", subtitle: "Bank transfer · Wema", amount: 150000, direction: "in", status: "success", icon: "bi-arrow-down-left", tone: "success", date: now - 5 * h },
      { id: "TX" + (now - 26 * h), type: "giftcard", title: "Steam Card Sold", subtitle: "$100 · E-code", amount: 116500, direction: "in", status: "success", icon: "bi-gift", tone: "pink", date: now - 26 * h },
      { id: "TX" + (now - 30 * h), type: "data", title: "Airtel Data 5GB", subtitle: "08021234567", amount: 1425, direction: "out", status: "success", icon: "bi-wifi", tone: "primary", date: now - 30 * h },
      { id: "TX" + (now - 50 * h), type: "electricity", title: "Ikeja Electric Token", subtitle: "Meter 4502 1123 990", amount: 10000, direction: "out", status: "success", icon: "bi-lightning-charge", tone: "warning", date: now - 50 * h },
      { id: "TX" + (now - 75 * h), type: "shop", title: "Marketplace Order", subtitle: "Oraimo FreePods 4", amount: 32500, direction: "out", status: "pending", icon: "bi-bag", tone: "violet", date: now - 75 * h },
      { id: "TX" + (now - 120 * h), type: "cable", title: "DStv Compact", subtitle: "IUC 7023 4411 09", amount: 19000, direction: "out", status: "failed", icon: "bi-tv", tone: "cyan", date: now - 120 * h }
    ];
  }

  /* ---------------- Store ---------------- */
  let state;
  try { state = JSON.parse(localStorage.getItem(STORE_KEY)) || DEFAULT_STATE(); }
  catch (e) { state = DEFAULT_STATE(); }
  state = Object.assign(DEFAULT_STATE(), state);
  const listeners = [];

  const store = {
    get: (k) => (k ? state[k] : state),
    set(k, v) { state[k] = v; save(); emit(k); },
    update(k, fn) { state[k] = fn(state[k]); save(); emit(k); },
    on(fn) { listeners.push(fn); },
    reset() { state = DEFAULT_STATE(); save(); location.reload(); }
  };
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* quota */ } }
  function emit(k) { listeners.forEach((fn) => fn(k, state)); refreshShell(); }

  /* ---------------- Formatting ---------------- */
  const nf = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmt = {
    naira: (n, dp) => "₦" + (dp === undefined ? nf : new Intl.NumberFormat("en-NG", { minimumFractionDigits: dp, maximumFractionDigits: dp })).format(Number(n) || 0),
    usd: (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0),
    num: (n) => nf.format(Number(n) || 0),
    date: (d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    time: (d) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    datetime: (d) => fmt.date(d) + ", " + fmt.time(d),
    ago(d) {
      const s = Math.floor((Date.now() - d) / 1000);
      if (s < 60) return "just now";
      if (s < 3600) return Math.floor(s / 60) + "m ago";
      if (s < 86400) return Math.floor(s / 3600) + "h ago";
      if (s < 604800) return Math.floor(s / 86400) + "d ago";
      return fmt.date(d);
    },
    ref: (p) => (p || "AB") + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- Wallet & transactions ---------------- */
  const wallet = {
    // Guests have no wallet yet — show ₦0 until they log in
    balance: () => (auth.isAuthed() ? state.wallet.balance : 0),
    canAfford: (amt) => wallet.balance() >= amt,
    debit(amount, tx) {
      if (!wallet.canAfford(amount)) return null;
      state.wallet.balance = round(state.wallet.balance - amount);
      return addTx(Object.assign({ amount, direction: "out", status: "success" }, tx));
    },
    credit(amount, tx) {
      state.wallet.balance = round(state.wallet.balance + amount);
      return addTx(Object.assign({ amount, direction: "in", status: "success" }, tx));
    }
  };
  function round(n) { return Math.round(n * 100) / 100; }
  function addTx(tx) {
    const t = Object.assign({ id: fmt.ref("TX"), date: Date.now(), icon: "bi-receipt", tone: "primary" }, tx);
    state.transactions.unshift(t);
    save(); emit("transactions");
    return t;
  }

  /* ---------------- Cart ---------------- */
  const cart = {
    items: () => state.cart,
    count: () => state.cart.reduce((a, i) => a + i.qty, 0),
    subtotal: () => state.cart.reduce((a, i) => a + i.price * i.qty, 0),
    add(productId, qty = 1, opts = {}) {
      const p = AB_DATA.products.find((x) => x.id === productId);
      if (!p) return;
      const line = state.cart.find((i) => i.id === productId && i.color === (opts.color || null));
      if (line) line.qty = Math.min(line.qty + qty, p.stock);
      else state.cart.push({ id: p.id, name: p.name, price: p.price, icon: p.icon, tone: p.tone, qty, color: opts.color || null, seller: p.seller, digital: !!p.digital });
      save(); emit("cart");
      toast(`<b>${esc(p.name)}</b> added to cart`, "success", { action: { label: "View cart", href: url("app/cart.html") } });
    },
    setQty(index, qty) {
      if (qty <= 0) state.cart.splice(index, 1);
      else state.cart[index].qty = qty;
      save(); emit("cart");
    },
    remove(index) { state.cart.splice(index, 1); save(); emit("cart"); },
    clear() { state.cart = []; save(); emit("cart"); }
  };
  const wishlist = {
    has: (id) => state.wishlist.includes(id),
    toggle(id) {
      const i = state.wishlist.indexOf(id);
      if (i > -1) state.wishlist.splice(i, 1); else state.wishlist.push(id);
      save(); emit("wishlist");
      return i === -1;
    }
  };

  /* ---------------- Paths ---------------- */
  const inApp = /\/(app|admin)\//.test(location.pathname);
  const ROOT = inApp ? "../" : "./";
  const url = (p) => ROOT + p;

  /* ---------------- Auth (demo session) ----------------
     Logged in = sessionStorage "ab_session" or localStorage "ab_remember".
     Pages with <body data-public="true"> (marketplace, product, cart) are open to guests;
     every other app page sends guests to login.html?next=<this page>. */
  const auth = {
    isAuthed() {
      try { return !!(sessionStorage.getItem("ab_session") || localStorage.getItem("ab_remember")); } catch (e) { return false; }
    },
    logout() {
      try { sessionStorage.removeItem("ab_session"); localStorage.removeItem("ab_remember"); } catch (e) { /* ignore */ }
    },
    // Path of the current page relative to the site root, e.g. "app/cart.html?checkout=1"
    here() { const m = location.pathname.match(/(app|admin)\/[^/]+$/); return (m ? m[0] : "app/dashboard.html") + location.search + location.hash; },
    loginUrl(next, page = "login.html") { return url(page) + "?next=" + encodeURIComponent(next || auth.here()); },
    // Shows a "log in to continue" sheet. Used e.g. when a guest presses checkout.
    requireLogin({ next, title = "Log in to continue", message = "Sign in or create a free account to continue." } = {}) {
      if (auth.isAuthed()) return true;
      modal(`
        <div class="modal-body text-center pt-4">
          <span class="ab-icon ab-icon-xl tone-primary mb-3"><i class="bi bi-person-lock"></i></span>
          <h4 class="mb-1">${esc(title)}</h4>
          <p class="text-muted mb-1">${message}</p>
          ${cart.count() ? `<p class="fs-7 text-muted mb-0"><i class="bi bi-bag-check text-success me-1"></i>Your ${cart.count()} cart item${cart.count() > 1 ? "s are" : " is"} saved.</p>` : ""}
        </div>
        <div class="modal-footer flex-column gap-2">
          <a href="${auth.loginUrl(next)}" class="btn btn-primary btn-lg w-100 m-0">Log in</a>
          <a href="${auth.loginUrl(next, "register.html")}" class="btn btn-light-subtle btn-lg w-100 m-0">Create free account</a>
          <button class="btn btn-link link-muted fs-7 m-0" data-bs-dismiss="modal">Keep shopping</button>
        </div>`);
      return false;
    }
  };
  // Only allow redirects back into this site (blocks ?next=https://evil.example)
  function safeNext(n) { return n && /^(app|admin)\/[\w-]+\.html([?#].*)?$/.test(n) ? n : null; }

  /* ---------------- Theme ---------------- */
  function applyTheme(t) { document.documentElement.setAttribute("data-bs-theme", t); }
  applyTheme(state.settings.theme || "light");
  function toggleTheme() {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    applyTheme(state.settings.theme); save(); refreshShell();
  }

  /* ---------------- Shell ---------------- */
  const NAV = [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard", icon: "bi-grid-1x2", href: "app/dashboard.html" },
    { id: "wallet", label: "Wallet", icon: "bi-wallet2", href: "app/wallet.html" },
    { id: "transactions", label: "Transactions", icon: "bi-receipt-cutoff", href: "app/transactions.html" },
    { section: "Shop" },
    { id: "marketplace", label: "Marketplace", icon: "bi-shop", href: "app/marketplace.html" },
    { id: "cart", label: "Cart", icon: "bi-cart3", href: "app/cart.html", badge: "cart" },
    { id: "orders", label: "My Orders", icon: "bi-box-seam", href: "app/orders.html" },
    { section: "Travel & Global" },
    { id: "esim", label: "eSIM", icon: "bi-sim", href: "app/esim.html", tag: "New" },
    { id: "flights", label: "Flight Booking", icon: "bi-airplane", href: "app/flights.html", tag: "New" },
    { id: "cards", label: "Virtual Cards", icon: "bi-credit-card-2-front", href: "app/virtual-cards.html" },
    { id: "giftcards", label: "Gift Card Exchange", icon: "bi-gift", href: "app/giftcards.html" },
    { section: "Payments" },
    { id: "bills", label: "Airtime, Data & Bills", icon: "bi-lightning-charge", href: "app/bills.html" },
    { section: "Account" },
    { id: "settings", label: "Settings", icon: "bi-gear", href: "app/settings.html" },
    { id: "logout", label: "Log out", icon: "bi-box-arrow-right", href: "login.html" }
  ];
  const BOTTOM = [
    { id: "dashboard", label: "Home", icon: "bi-house-door", href: "app/dashboard.html" },
    { id: "marketplace", label: "Shop", icon: "bi-shop", href: "app/marketplace.html" },
    { id: "bills", label: "Pay", icon: "bi-lightning-charge-fill", href: "app/bills.html", fab: true },
    { id: "cards", label: "Cards", icon: "bi-credit-card", href: "app/virtual-cards.html" },
    { id: "more", label: "More", icon: "bi-grid", href: "#", menu: true }
  ];

  function renderShell() {
    const body = document.body;
    if (!body.dataset.page) return;
    const page = body.dataset.page;
    const main = document.querySelector("main.ab-content");
    if (!main) return;
    if (body.dataset.shell === "store" || !auth.isAuthed()) return renderStoreShell(body, page, main);

    // Member dashboard look: dark sidebar, solid teal active item, light canvas (see "Member dashboard theme" in app.css)
    body.classList.add("ab-dash");
    const u = state.user;
    const initials = esc(u.firstName[0] + u.lastName[0]);

    // Sidebar
    const sidebar = document.createElement("aside");
    sidebar.className = "ab-sidebar";
    sidebar.id = "abSidebar";
    sidebar.setAttribute("aria-label", "Main navigation");
    sidebar.innerHTML = `
      <a href="${url("app/dashboard.html")}" class="brand dash-wordmark" aria-label="AutoBiz dashboard"><span>AUTO<span>biz</span>.APP</span></a>
      <nav class="ab-nav">${NAV.filter((n) => n.id !== "logout").map((n) => n.section
        ? `<div class="nav-section">${n.section}</div>`
        : `<a href="${url(n.href)}" class="${n.id === page ? "active" : ""}" ${n.id === page ? 'aria-current="page"' : ""}><i class="bi ${n.icon}"></i><span>${n.label}</span>${n.badge === "cart" ? `<span class="badge" data-cart-count hidden></span>` : ""}${n.tag ? `<span class="badge nav-tag">${n.tag}</span>` : ""}</a>`).join("")}
      </nav>
      <div class="dash-side-foot">
        <a href="${url("login.html")}" class="dash-logout" data-logout><i class="bi bi-box-arrow-left"></i>Logout</a>
        <div class="dash-profile">
          <span class="ab-avatar sm">${initials}</span>
          <div class="min-w-0 flex-grow-1"><div class="name text-truncate">${esc(u.firstName + " " + u.lastName)}</div><a href="${url("app/settings.html")}" class="sub">View profile</a></div>
          <div class="dropup">
            <button class="btn btn-sm dash-more" data-bs-toggle="dropdown" aria-label="More options"><i class="bi bi-three-dots-vertical"></i></button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><a class="dropdown-item" href="${url("app/settings.html")}"><i class="bi bi-person"></i>Profile & settings</a></li>
              <li><a class="dropdown-item" href="${url("index.html")}"><i class="bi bi-globe2"></i>Visit website</a></li>
              <li><a class="dropdown-item" href="${url("admin/theme.html")}"><i class="bi bi-palette"></i>Brand & theme (admin)</a></li>
              <li><button class="dropdown-item" data-theme-toggle><i class="bi"></i><span>Toggle theme</span></button></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="${url("login.html")}" data-logout><i class="bi bi-box-arrow-right"></i>Log out</a></li>
            </ul>
          </div>
        </div>
      </div>`;

    const backdrop = document.createElement("div");
    backdrop.className = "ab-backdrop";
    backdrop.addEventListener("click", () => body.classList.remove("sidebar-open"));

    // Main wrapper + topbar: "Hello, name  » date" on the left, notifications + search on the right
    const wrap = document.createElement("div");
    wrap.className = "ab-main";
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    wrap.innerHTML = `
      <header class="ab-topbar" id="abTopbar">
        <button class="btn btn-icon d-xl-none" id="abMenuBtn" aria-label="Open menu"><i class="bi bi-list fs-5"></i></button>
        <div class="dash-hello min-w-0">
          <h1 class="text-truncate">Hello ${esc(u.firstName)}</h1>
          <span class="date d-none d-md-inline-flex"><i class="bi bi-chevron-double-right"></i>${today}</span>
        </div>
        <div class="ms-auto d-flex align-items-center gap-2 gap-md-3">
          <a href="${url("app/wallet.html")}" class="ab-wallet-chip d-none d-lg-inline-flex" title="Wallet balance">
            <i class="bi bi-wallet2 text-primary"></i><span data-balance class="tabular"></span>
            <span class="add" data-fund title="Fund wallet"><i class="bi bi-plus-lg"></i></span>
          </a>
          <a href="${url("app/cart.html")}" class="dash-icon-btn" aria-label="Cart"><i class="bi bi-bag"></i><span class="ab-dot-badge" data-cart-count hidden></span></a>
          <div class="dropdown">
            <button class="dash-icon-btn" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-label="Notifications"><i class="bi bi-bell-fill"></i><span class="dash-ping" data-notif-dot hidden></span></button>
            <div class="dropdown-menu dropdown-menu-end p-0" style="width:340px;max-width:calc(100vw - 2rem)">
              <div class="d-flex justify-content-between align-items-center px-3 pt-3 pb-2"><b>Notifications <span class="badge bg-primary ms-1" data-notif-count hidden></span></b><button class="btn btn-link btn-sm p-0" data-notif-read>Mark all read</button></div>
              <div data-notif-list style="max-height:360px;overflow:auto" class="px-2 pb-2"></div>
            </div>
          </div>
          <form class="dash-search d-none d-md-block" action="${url("app/marketplace.html")}" role="search">
            <input class="form-control" name="q" placeholder="Search here" aria-label="Search">
            <button class="btn" aria-label="Search"><i class="bi bi-search"></i></button>
          </form>
        </div>
      </header>`;
    main.parentNode.insertBefore(wrap, main);
    wrap.appendChild(main);
    body.insertBefore(backdrop, wrap);
    body.insertBefore(sidebar, backdrop);

    // Bottom nav
    const bn = document.createElement("nav");
    bn.className = "ab-bottomnav";
    bn.setAttribute("aria-label", "Bottom navigation");
    bn.innerHTML = `<div class="items">${BOTTOM.map((b) => b.fab
      ? `<a href="${url(b.href)}" class="fab ${b.id === page ? "active" : ""}"><span class="circle"><i class="bi ${b.icon}"></i></span>${b.label}</a>`
      : `<a href="${b.menu ? "#" : url(b.href)}" ${b.menu ? "data-open-sidebar" : ""} class="${b.id === page ? "active" : ""}"><i class="bi ${b.id === page ? b.icon + "-fill" : b.icon}"></i>${b.label}</a>`).join("")}</div>`;
    // -fill variants don't exist for every icon; fall back gracefully
    bn.querySelectorAll("a.active i").forEach((i) => { if (/bi-(grid|shop|credit-card)-fill/.test(i.className)) i.className = i.className.replace("-fill", ""); });
    body.appendChild(bn);

    // Behaviours
    document.getElementById("abMenuBtn").addEventListener("click", () => body.classList.add("sidebar-open"));
    bn.querySelector("[data-open-sidebar]").addEventListener("click", (e) => { e.preventDefault(); body.classList.add("sidebar-open"); });
    const tb = document.getElementById("abTopbar");
    window.addEventListener("scroll", () => tb.classList.toggle("scrolled", window.scrollY > 4), { passive: true });
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", toggleTheme));
    wrap.querySelector("[data-fund]").addEventListener("click", (e) => { e.preventDefault(); openFundModal(); });
    wrap.querySelector("[data-notif-read]").addEventListener("click", () => { state.notifications.forEach((n) => (n.read = true)); save(); refreshShell(); });
    document.querySelectorAll("[data-logout]").forEach((a) => a.addEventListener("click", auth.logout));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") body.classList.remove("sidebar-open"); });
    refreshShell();
  }

  /* ---------------- Website shell ----------------
     The public face of AutoBiz: homepage + every service page a visitor can browse
     (shop, eSIM, flights, gift cards, USD cards, bills). Classic website header with
     search and a services menu, plus a footer — no dashboard chrome. Guests are asked
     to log in only when they pay (see confirmPay / cart checkout).
     Used for guests on public pages, and for everyone on pages with data-shell="store". */
  const SERVICES = [
    { id: "home", label: "Home", icon: "bi-house-door", href: "index.html" },
    { id: "marketplace", label: "Shop", icon: "bi-shop", href: "app/marketplace.html" },
    { id: "esim", label: "eSIM", icon: "bi-sim", href: "app/esim.html" },
    { id: "flights", label: "Flights", icon: "bi-airplane", href: "app/flights.html" },
    { id: "giftcards", label: "Gift cards", icon: "bi-gift", href: "app/giftcards.html" },
    { id: "cards", label: "USD cards", icon: "bi-credit-card-2-front", href: "app/virtual-cards.html" },
    { id: "bills", label: "Airtime & bills", icon: "bi-lightning-charge", href: "app/bills.html" }
  ];

  function renderStoreShell(body, page, main) {
    body.classList.add("ab-store");
    const authed = auth.isAuthed();
    const u = state.user;
    const here = encodeURIComponent(auth.here());
    const cats = AB_DATA.categories;
    const curCat = qs("cat");
    const shopUrl = url("app/marketplace.html");
    const loginHref = `${url("login.html")}?next=${here}`;
    const signupHref = `${url("register.html")}?next=${here}`;
    const searchForm = (cls) => `
      <form class="sf-search ${cls}" action="${shopUrl}" role="search">
        <select name="cat" class="form-select d-none d-xl-block" aria-label="Category">
          <option value="">All categories</option>${cats.map((c) => `<option value="${c.id}" ${c.id === curCat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}
        </select>
        <input class="form-control" name="q" value="${esc(qs("q") || "")}" placeholder="Search products, brands and more…" aria-label="Search products">
        <button class="btn btn-primary" aria-label="Search"><i class="bi bi-search"></i></button>
      </form>`;
    const account = authed
      ? `<a href="${url("app/dashboard.html")}" class="sf-account"><span class="ab-avatar sm">${esc(u.firstName[0] + u.lastName[0])}</span><span class="d-none d-md-block"><small>Hi, ${esc(u.firstName)}</small><b>My account</b></span></a>`
      : `<a href="${loginHref}" class="sf-account"><i class="bi bi-person-circle"></i><span class="d-none d-md-block"><small>Hello, sign in</small><b>Account</b></span></a>`;

    const header = document.createElement("div");
    header.innerHTML = `
      <div class="sf-announce">
        <div class="sf-container d-flex align-items-center justify-content-center justify-content-md-between gap-3">
          <div class="d-none d-md-flex gap-4"><span><i class="bi bi-truck me-1"></i>Free delivery on 1,000+ items</span><span><i class="bi bi-globe2 me-1"></i>eSIMs for 120+ countries</span><span><i class="bi bi-lightning-charge me-1"></i>Instant airtime &amp; data</span></div>
          ${authed
            ? `<a href="${url("app/wallet.html")}"><i class="bi bi-wallet2 me-1"></i>Wallet: <b data-balance></b> <i class="bi bi-arrow-right"></i></a>`
            : `<a href="${signupHref}">Sign up &amp; get <b>₦1,000 off</b> your first order <i class="bi bi-arrow-right"></i></a>`}
        </div>
      </div>
      <header class="sf-header" id="abTopbar">
        <div class="sf-container sf-row">
          <a href="${url("index.html")}" class="sf-brand"><img src="${url("assets/img/logo.svg")}" alt="">AutoBiz</a>
          ${searchForm("d-none d-lg-flex")}
          <div class="ms-auto d-flex align-items-center gap-1 gap-sm-2">
            <button class="btn btn-icon sf-ghost d-none d-sm-inline-grid" data-theme-toggle aria-label="Toggle theme"><i class="bi"></i></button>
            ${account}
            <a href="${url("app/cart.html")}" class="sf-account ${page === "cart" ? "active" : ""}" aria-label="Cart">
              <span class="position-relative"><i class="bi bi-bag"></i><span class="ab-dot-badge" data-cart-count hidden></span></span>
              <span class="d-none d-md-block"><small>Cart</small><b data-cart-total class="tabular">₦0</b></span>
            </a>
            ${authed ? "" : `<a href="${signupHref}" class="btn btn-primary d-none d-lg-inline-block ms-1">Sign up</a>`}
          </div>
        </div>
        <div class="sf-container d-lg-none pb-2">${searchForm("w-100")}</div>
        <nav class="sf-cats" aria-label="Services">
          <div class="sf-container"><div class="ab-chips">
            ${SERVICES.map((s) => `<a href="${url(s.href)}" class="sf-cat ${s.id === page ? "active" : ""}"><i class="bi ${s.icon}"></i>${s.label}</a>`).join("")}
          </div></div>
        </nav>
      </header>`;

    const wrap = document.createElement("div");
    wrap.className = "ab-main";
    main.parentNode.insertBefore(wrap, main);
    [...header.children].forEach((el) => wrap.appendChild(el));
    wrap.appendChild(main);

    const year = new Date().getFullYear();
    const footer = document.createElement("footer");
    footer.className = "sf-footer";
    footer.innerHTML = `
      <div class="sf-container">
        <div class="sf-perks">
          ${[["bi-shield-check", "Buyer protection", "Refund if it doesn't arrive"], ["bi-lightning-charge", "Instant delivery", "Airtime, data & codes in seconds"], ["bi-lock", "Secure payments", "PIN-protected wallet"], ["bi-headset", "24/7 support", "Chat, call or email"]]
            .map(([i, t, s]) => `<div class="d-flex align-items-center gap-3"><span class="ab-icon tone-primary"><i class="bi ${i}"></i></span><div><div class="fw-bold fs-7">${t}</div><div class="fs-8 text-muted">${s}</div></div></div>`).join("")}
        </div>
        <div class="row g-4 py-4">
          <div class="col-lg-4">
            <a href="${url("index.html")}" class="sf-brand mb-2"><img src="${url("assets/img/logo.svg")}" alt="">AutoBiz</a>
            <p class="fs-7 text-muted mb-3">Shop, travel and pay from one Naira wallet — products from verified sellers, travel eSIMs, flights, USD cards, gift card trading, airtime, data and bills.</p>
            ${authed ? `<a href="${url("app/dashboard.html")}" class="btn btn-primary btn-sm px-3">Go to my account</a>` : `<a href="${signupHref}" class="btn btn-primary btn-sm px-3">Create free account</a>`}
          </div>
          <div class="col-6 col-md-4 col-lg-2"><h6>Shop</h6><ul>${cats.slice(0, 6).map((c) => `<li><a href="${shopUrl}?cat=${c.id}">${esc(c.name)}</a></li>`).join("")}</ul></div>
          <div class="col-6 col-md-4 col-lg-3"><h6>Services</h6><ul>${SERVICES.slice(2).map((s) => `<li><a href="${url(s.href)}">${s.label === "USD cards" ? "USD virtual cards" : s.label === "Gift cards" ? "Gift card exchange" : s.label === "eSIM" ? "Travel eSIM" : s.label === "Flights" ? "Flight booking" : s.label}</a></li>`).join("")}</ul></div>
          <div class="col-md-4 col-lg-3"><h6>Help</h6><ul>
            <li><a href="${authed ? url("app/orders.html") : auth.loginUrl("app/orders.html")}">Track my order</a></li>
            <li><a href="${url("index.html")}#faq">FAQs</a></li>
            <li><a href="${url("index.html")}#how">How AutoBiz works</a></li>
            <li>${authed ? `<a href="${url("app/settings.html")}">Account settings</a>` : `<a href="${loginHref}">Log in</a>`}</li></ul></div>
        </div>
        <div class="sf-legal"><span>© ${year} AutoBiz. All rights reserved.</span><span class="d-flex gap-3 align-items-center"><i class="bi bi-lock"></i>Secure payments<i class="bi bi-credit-card-2-front"></i><i class="bi bi-wallet2"></i><i class="bi bi-bank"></i></span></div>
      </div>`;
    wrap.appendChild(footer);

    // Mobile: bottom bar + "All services" sheet
    const BOTTOM_ITEMS = [
      { id: "home", label: "Home", icon: "bi-house-door", href: url("index.html") },
      { id: "marketplace", label: "Shop", icon: "bi-shop", href: shopUrl },
      { id: "cart", label: "Cart", icon: "bi-bag", href: url("app/cart.html"), fab: true },
      { id: "services", label: "Services", icon: "bi-grid", href: "#", sheet: true },
      { id: "account", label: authed ? "Account" : "Log in", icon: "bi-person", href: authed ? url("app/dashboard.html") : loginHref }
    ];
    const bn = document.createElement("nav");
    bn.className = "ab-bottomnav";
    bn.setAttribute("aria-label", "Bottom navigation");
    bn.innerHTML = `<div class="items">${BOTTOM_ITEMS.map((b) => {
      const active = b.id === page || (b.id === "services" && ["esim", "flights", "giftcards", "cards", "bills"].includes(page));
      return b.fab
        ? `<a href="${b.href}" class="fab ${active ? "active" : ""}"><span class="circle position-relative"><i class="bi ${b.icon}"></i><span class="ab-dot-badge" data-cart-count hidden></span></span>${b.label}</a>`
        : `<a href="${b.href}" ${b.sheet ? "data-open-services" : ""} class="${active ? "active" : ""}"><i class="bi ${b.icon}"></i>${b.label}</a>`;
    }).join("")}</div>`;
    body.appendChild(bn);
    bn.querySelector("[data-open-services]").addEventListener("click", (e) => {
      e.preventDefault();
      const tones = { esim: "violet", flights: "cyan", giftcards: "pink", cards: "success", bills: "warning", marketplace: "primary" };
      modal(`
        <div class="modal-header"><h5 class="modal-title">Everything on AutoBiz</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body pt-1">
          <div class="row g-2 mb-3">${SERVICES.slice(1).map((s) => `
            <div class="col-6"><a href="${url(s.href)}" class="ab-option d-flex align-items-center gap-2"><span class="ab-icon ab-icon-sm tone-${tones[s.id]}"><i class="bi ${s.icon}"></i></span><span class="fs-7 fw-semibold">${s.label}</span></a></div>`).join("")}
          </div>
          <div class="small-label mb-2">Shop by category</div>
          <div class="d-flex flex-wrap gap-2">${cats.map((c) => `<a href="${shopUrl}?cat=${c.id}" class="ab-chip"><i class="bi ${c.icon}"></i>${esc(c.name)}</a>`).join("")}</div>
        </div>`);
    });

    document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", toggleTheme));
    // Keep sticky offsets (filters, summaries) clear of the header
    const hdr = document.getElementById("abTopbar");
    const syncH = () => document.documentElement.style.setProperty("--ab-topbar-h", hdr.offsetHeight + "px");
    syncH(); window.addEventListener("resize", debounce(syncH, 150));
    window.addEventListener("scroll", () => hdr.classList.toggle("scrolled", window.scrollY > 4), { passive: true });
    const active = document.querySelector(".sf-cat.active"); if (active) active.scrollIntoView({ inline: "center", block: "nearest" });
    refreshShell();
  }

  function refreshShell() {
    const hide = state.settings.hideBalance, authed = auth.isAuthed();
    document.querySelectorAll("[data-balance]").forEach((el) => (el.textContent = hide && authed ? "₦ ••••••" : fmt.naira(wallet.balance(), 2)));
    document.querySelectorAll("[data-usd-balance]").forEach((el) => (el.textContent = hide && authed ? "$ ••••" : fmt.usd(authed ? state.wallet.usd : 0)));
    const c = cart.count();
    document.querySelectorAll("[data-cart-count]").forEach((el) => { el.textContent = c; el.hidden = c === 0; });
    document.querySelectorAll("[data-cart-total]").forEach((el) => (el.textContent = fmt.naira(cart.subtotal())));
    const unread = state.notifications.filter((n) => !n.read).length;
    document.querySelectorAll("[data-notif-count]").forEach((el) => { el.textContent = unread; el.hidden = unread === 0; });
    document.querySelectorAll("[data-notif-dot]").forEach((el) => (el.hidden = unread === 0));
    const list = document.querySelector("[data-notif-list]");
    if (list) list.innerHTML = state.notifications.length ? state.notifications.map((n) => `
      <div class="d-flex gap-3 p-2 rounded-3 ${n.read ? "" : "bg-surface-2"}">
        <span class="ab-icon ab-icon-sm tone-${n.tone}"><i class="bi ${n.icon}"></i></span>
        <div class="min-w-0"><div class="fw-semibold fs-7">${esc(n.title)}</div><div class="fs-8 text-muted">${esc(n.body)}</div><div class="fs-8 text-muted mt-1">${fmt.ago(n.time)}</div></div>
      </div>`).join("") : `<div class="ab-empty py-4 fs-7">You're all caught up</div>`;
    const dark = state.settings.theme === "dark";
    document.querySelectorAll("[data-theme-toggle] i").forEach((i) => (i.className = "bi " + (dark ? "bi-sun" : "bi-moon-stars")));
  }

  function notify(n) {
    state.notifications.unshift(Object.assign({ id: Date.now(), time: Date.now(), read: false, tone: "primary", icon: "bi-bell" }, n));
    state.notifications = state.notifications.slice(0, 30);
    save(); refreshShell();
  }

  /* ---------------- Toast ---------------- */
  function toast(html, type = "info", opts = {}) {
    let wrap = document.querySelector(".ab-toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "ab-toast-wrap"; wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
    const icons = { success: ["bi-check-circle-fill", "success"], error: ["bi-x-circle-fill", "danger"], warning: ["bi-exclamation-triangle-fill", "warning"], info: ["bi-info-circle-fill", "primary"] };
    const [ic, tone] = icons[type] || icons.info;
    const el = document.createElement("div");
    el.className = "ab-toast";
    el.setAttribute("role", "status");
    el.innerHTML = `<i class="bi ${ic} fs-5 text-${tone === "success" ? "success" : tone}" style="${tone === "warning" ? "color:var(--ab-warning)!important" : ""}"></i>
      <div class="flex-grow-1">${html}${opts.action ? `<div class="mt-1"><a href="${opts.action.href}" class="fw-bold fs-7">${opts.action.label} →</a></div>` : ""}</div>
      <button class="btn-close btn-sm" aria-label="Close"></button>`;
    wrap.appendChild(el);
    const close = () => { el.classList.add("hide"); setTimeout(() => el.remove(), 250); };
    el.querySelector(".btn-close").addEventListener("click", close);
    setTimeout(close, opts.duration || 3800);
  }

  /* ---------------- Modal helper ---------------- */
  function modal(html, { size = "", sheet = true, static: isStatic = false } = {}) {
    const el = document.createElement("div");
    el.className = "modal fade" + (sheet ? " ab-sheet" : "");
    el.tabIndex = -1;
    if (isStatic) { el.dataset.bsBackdrop = "static"; el.dataset.bsKeyboard = "false"; }
    el.innerHTML = `<div class="modal-dialog modal-dialog-centered ${size}"><div class="modal-content">${html}</div></div>`;
    document.body.appendChild(el);
    const m = new bootstrap.Modal(el);
    el.addEventListener("hidden.bs.modal", () => { m.dispose(); el.remove(); });
    m.show();
    return { el, modal: m, close: () => m.hide() };
  }

  /* ---------------- PIN confirmation ----------------
     confirmPay({ title, amount, rows:[[label,value]], note, currency }) → Promise<boolean>
     Demo: any 4-digit PIN works except 0000 (shows invalid). */
  function confirmPay(opts) {
    if (!auth.isAuthed()) {
      auth.requireLogin({ title: "Log in to continue", message: "Create a free account or log in to complete this payment. You'll come right back here." });
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const amountTxt = opts.currency === "usd" ? fmt.usd(opts.amount) : fmt.naira(opts.amount, 2);
      const insufficient = opts.currency !== "usd" && opts.skipBalanceCheck !== true && !wallet.canAfford(opts.amount);
      const m = modal(`
        <div class="modal-header"><h5 class="modal-title">${esc(opts.title || "Confirm payment")}</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
        <div class="modal-body pt-0">
          <div class="text-center py-3">
            <div class="small-label mb-1">${opts.amountLabel || "You're paying"}</div>
            <div class="fs-2 fw-800 tabular">${amountTxt}</div>
          </div>
          ${opts.rows && opts.rows.length ? `<div class="ab-summary mb-3">${opts.rows.map(([k, v]) => `<div class="row-item"><span>${esc(k)}</span><span>${v}</span></div>`).join("")}</div>` : ""}
          ${opts.currency !== "usd" && opts.skipBalanceCheck !== true ? `<div class="d-flex justify-content-between align-items-center p-3 rounded-3 border mb-3 ${insufficient ? "border-danger" : ""}">
            <div class="d-flex align-items-center gap-2"><span class="ab-icon ab-icon-sm tone-primary"><i class="bi bi-wallet2"></i></span><div><div class="fs-7 fw-semibold">Wallet balance</div><div class="fs-8 text-muted">${fmt.naira(wallet.balance(), 2)}</div></div></div>
            ${insufficient ? `<button class="btn btn-sm btn-soft" data-topup>Top up</button>` : `<i class="bi bi-check-circle-fill text-success"></i>`}
          </div>` : ""}
          ${insufficient ? `<div class="alert alert-danger py-2 fs-7 mb-0"><i class="bi bi-exclamation-circle me-1"></i>Insufficient balance. Fund your wallet to continue.</div>` : `
          <div class="text-center fs-7 text-muted mb-2">Enter your 4-digit transaction PIN</div>
          <div class="ab-pin mb-2">${[0, 1, 2, 3].map(() => `<input inputmode="numeric" maxlength="1" pattern="[0-9]" autocomplete="off" aria-label="PIN digit">`).join("")}</div>
          <div class="text-center fs-8 text-muted">Demo: any PIN works except 0000</div>`}
          ${opts.note ? `<div class="fs-8 text-muted mt-3 text-center">${opts.note}</div>` : ""}
        </div>
        <div class="modal-footer"><button class="btn btn-primary btn-lg w-100" data-confirm ${insufficient ? "disabled" : ""}><span class="label">${opts.cta || "Confirm & Pay"}</span></button></div>`);
      let done = false;
      const inputs = [...m.el.querySelectorAll(".ab-pin input")];
      const btn = m.el.querySelector("[data-confirm]");
      m.el.addEventListener("shown.bs.modal", () => inputs[0] && inputs[0].focus());
      inputs.forEach((inp, i) => {
        inp.addEventListener("input", () => {
          inp.value = inp.value.replace(/\D/g, "").slice(-1);
          if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
          if (inputs.every((x) => x.value)) btn.click();
        });
        inp.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); });
        inp.addEventListener("paste", (e) => {
          const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 4);
          if (t.length) { e.preventDefault(); t.split("").forEach((d, j) => inputs[j] && (inputs[j].value = d)); if (t.length === 4) btn.click(); }
        });
      });
      const topup = m.el.querySelector("[data-topup]");
      if (topup) topup.addEventListener("click", () => { m.close(); setTimeout(() => openFundModal(), 350); });
      btn.addEventListener("click", () => {
        const pin = inputs.map((x) => x.value).join("");
        if (pin.length < 4) { m.el.querySelector(".ab-pin").classList.add("shake"); setTimeout(() => m.el.querySelector(".ab-pin").classList.remove("shake"), 400); return; }
        if (pin === "0000") { inputs.forEach((x) => (x.value = "")); inputs[0].focus(); m.el.querySelector(".ab-pin").classList.add("shake"); setTimeout(() => m.el.querySelector(".ab-pin").classList.remove("shake"), 400); toast("Incorrect PIN. Try again.", "error"); return; }
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processing…`;
        setTimeout(() => { done = true; m.close(); resolve(true); }, opts.delay || 1100);
      });
      m.el.addEventListener("hidden.bs.modal", () => { if (!done) resolve(false); });
    });
  }

  /* ---------------- Success receipt ---------------- */
  function success({ title = "Successful", message = "", rows = [], actions = [], extra = "" } = {}) {
    const m = modal(`
      <div class="modal-body text-center pt-4 pb-2">
        <div class="ab-success-check"><i class="bi bi-check-lg"></i></div>
        <h4 class="mb-1">${esc(title)}</h4>
        <p class="text-muted mb-3">${message}</p>
        ${rows.length ? `<div class="ab-summary text-start mb-2">${rows.map(([k, v]) => `<div class="row-item"><span>${esc(k)}</span><span>${v}</span></div>`).join("")}</div>` : ""}
        ${extra}
      </div>
      <div class="modal-footer flex-column flex-sm-row gap-2">
        ${actions.map((a) => a.href ? `<a href="${a.href}" class="btn ${a.class || "btn-light-subtle"} flex-fill m-0">${a.label}</a>` : `<button class="btn ${a.class || "btn-light-subtle"} flex-fill m-0" data-act="${a.id || ""}">${a.label}</button>`).join("")}
        <button class="btn btn-primary flex-fill m-0" data-bs-dismiss="modal">Done</button>
      </div>`);
    actions.forEach((a) => { if (a.onClick) { const b = m.el.querySelector(`[data-act="${a.id}"]`); b && b.addEventListener("click", () => a.onClick(m)); } });
    return m;
  }

  /* ---------------- Fund wallet ---------------- */
  function openFundModal() {
    if (!auth.requireLogin({ title: "Log in to fund your wallet", message: "Create a free account or log in to add money to your AutoBiz wallet." })) return;
    const m = modal(`
      <div class="modal-header"><h5 class="modal-title">Fund wallet</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body pt-1">
        <div class="ab-segment w-100 mb-3" role="tablist"><button class="active" data-tab="bank">Bank transfer</button><button data-tab="card">Card</button><button data-tab="voucher">Voucher</button></div>
        <div data-pane="bank">
          <p class="fs-7 text-muted">Transfer to your dedicated account. Your wallet is credited automatically within 1 minute.</p>
          ${[["Wema Bank", "7821 4436 09"], ["Moniepoint MFB", "5093 2271 84"]].map(([b, n]) => `
          <div class="p-3 rounded-3 border mb-2 d-flex justify-content-between align-items-center">
            <div><div class="fs-8 text-muted">${b}</div><div class="fw-800 fs-5 tabular">${n}</div><div class="fs-8 text-muted">AutoBiz – ${esc(state.user.firstName)} ${esc(state.user.lastName)}</div></div>
            <button class="btn btn-sm btn-soft" data-copy="${n.replace(/\s/g, "")}"><i class="bi bi-copy me-1"></i>Copy</button>
          </div>`).join("")}
          <div class="fs-8 text-muted mt-2"><i class="bi bi-info-circle me-1"></i>A ₦50 stamp fee applies to transfers above ₦10,000.</div>
          <button class="btn btn-light-subtle w-100 mt-3" data-simulate><i class="bi bi-lightning me-1"></i>Simulate ₦50,000 transfer (demo)</button>
        </div>
        <div data-pane="card" hidden>
          <label class="form-label">Amount</label>
          <div class="input-group input-group-lg mb-2"><span class="input-group-text">₦</span><input type="number" class="form-control" min="100" placeholder="0.00" data-amount></div>
          <div class="d-flex gap-2 flex-wrap mb-3">${[5000, 10000, 20000, 50000].map((v) => `<button class="ab-chip" data-preset="${v}">${fmt.naira(v)}</button>`).join("")}</div>
          <div class="fs-8 text-muted mb-3">1.5% card processing fee (capped at ₦2,000). Secured by Paystack.</div>
          <button class="btn btn-primary btn-lg w-100" data-pay-card>Continue</button>
        </div>
        <div data-pane="voucher" hidden>
          <label class="form-label">Voucher PIN</label>
          <input class="form-control form-control-lg mb-3 tabular" placeholder="XXXX-XXXX-XXXX" maxlength="14" data-voucher>
          <button class="btn btn-primary btn-lg w-100" data-redeem>Redeem voucher</button>
        </div>
      </div>`);
    const el = m.el;
    el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      el.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
      el.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
    }));
    el.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy, "Account number copied")));
    el.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => (el.querySelector("[data-amount]").value = b.dataset.preset)));
    const fund = (amt, sub) => {
      wallet.credit(amt, { type: "funding", title: "Wallet Funding", subtitle: sub, icon: "bi-arrow-down-left", tone: "success" });
      notify({ icon: "bi-wallet2", tone: "success", title: "Wallet funded", body: `${fmt.naira(amt)} was added to your wallet.` });
      m.close();
      setTimeout(() => success({ title: "Wallet funded", message: `${fmt.naira(amt, 2)} has been added to your wallet.`, rows: [["New balance", fmt.naira(wallet.balance(), 2)], ["Method", sub]] }), 300);
    };
    el.querySelector("[data-simulate]").addEventListener("click", (e) => { loading(e.currentTarget, 1200).then(() => fund(50000, "Bank transfer · Wema")); });
    el.querySelector("[data-pay-card]").addEventListener("click", (e) => {
      const amt = Number(el.querySelector("[data-amount]").value);
      if (!amt || amt < 100) return toast("Enter an amount of at least ₦100", "warning");
      loading(e.currentTarget, 1500).then(() => fund(amt, "Debit card •••• 4081"));
    });
    el.querySelector("[data-redeem]").addEventListener("click", (e) => {
      const v = el.querySelector("[data-voucher]").value.replace(/\W/g, "");
      if (v.length < 12) return toast("Enter a valid 12-character voucher PIN", "warning");
      loading(e.currentTarget, 1000).then(() => fund(5000, "Voucher " + v.slice(0, 4) + "••••"));
    });
  }

  /* ---------------- Misc helpers ---------------- */
  function loading(btn, ms = 1000) {
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Please wait…`;
    return new Promise((r) => setTimeout(() => { btn.disabled = false; btn.innerHTML = html; r(); }, ms));
  }
  function copy(text, msg = "Copied to clipboard") {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(msg, "success")).catch(() => {
      const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); toast(msg, "success"); } catch (e) { toast("Copy failed", "error"); }
      t.remove();
    });
  }
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const flag = (code, w = 80) => `https://flagcdn.com/w${w}/${code}.png`;
  function productArt(p, size = "") {
    return `<div class="ab-product-art tone-${p.tone} ${size}"><i class="bi ${p.icon}"></i></div>`;
  }
  function txRow(t) {
    const statusCls = { success: "success", pending: "pending", failed: "failed" }[t.status] || "neutral";
    return `<li class="ab-list-item">
      <span class="ab-icon tone-${t.tone}"><i class="bi ${t.icon}"></i></span>
      <div class="flex-grow-1 min-w-0"><div class="title text-truncate">${esc(t.title)}</div><div class="meta text-truncate">${esc(t.subtitle || "")} · ${fmt.ago(t.date)}</div></div>
      <div class="text-end"><div class="fw-bold tabular ${t.direction === "in" ? "amount-in" : "amount-out"}">${t.direction === "in" ? "+" : "−"}${fmt.naira(t.amount)}</div><span class="ab-status ${statusCls} mt-1">${t.status}</span></div>
    </li>`;
  }

  // Members-only app pages: send guests to login, then bring them back here.
  // Runs immediately (app.js loads at the end of <body>) so protected content never renders.
  let redirecting = false;
  if (document.body && document.body.dataset.page && document.body.dataset.public !== "true" && !auth.isAuthed()) {
    redirecting = true;
    document.documentElement.style.visibility = "hidden";
    location.replace(auth.loginUrl(auth.here()));
  }

  window.AB = { store, fmt, esc, wallet, cart, wishlist, toast, modal, confirmPay, success, openFundModal, notify, loading, copy, qs, debounce, flag, url, productArt, txRow, refreshShell, toggleTheme, addTx, auth, safeNext };

  document.addEventListener("DOMContentLoaded", () => {
    if (redirecting) return;
    renderShell();
    document.querySelectorAll("[data-open-fund]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); openFundModal(); }));
    // Enable Bootstrap tooltips
    if (window.bootstrap) document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
  });
})();
