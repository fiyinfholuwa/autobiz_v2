/* ==========================================================================
   AutoBiz v2 — Flight booking (client-side demo)
   Search → results (seeded, deterministic) → 5-step booking → e-ticket → My trips
   ========================================================================== */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  /* ---------------- Helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let fmt, esc, store;

  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const dayLabel = (s, o = { weekday: "short", day: "numeric", month: "short" }) => parse(s).toLocaleDateString("en-GB", o);
  const hm = (mins) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
  const dur = (m) => `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
  const nextDay = (mins) => (mins >= 1440 ? `<sup>+${Math.floor(mins / 1440)}</sup>` : "");
  const r100 = (n) => Math.round(n / 100) * 100;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

  /* Seeded PRNG */
  function seed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    let a = (h ^= h >>> 16) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- Reference data ---------------- */
  let AP, AL;
  const COORD = {
    LOS: [6.577, 3.321], ABV: [9.007, 7.263], PHC: [5.015, 6.95], KAN: [12.048, 8.524], ENU: [6.474, 7.562], QOW: [5.427, 7.206],
    ACC: [5.605, -0.167], NBO: [-1.319, 36.928], JNB: [-26.139, 28.246], DXB: [25.253, 55.366], LHR: [51.47, -0.454],
    JFK: [40.641, -73.778], IAH: [29.99, -95.336], YYZ: [43.678, -79.625], CDG: [49.01, 2.548], IST: [41.275, 28.752],
    DOH: [25.273, 51.608], ADD: [8.977, 38.799]
  };
  const HUBS = { EK: { code: "DXB", city: "Dubai" }, QR: { code: "DOH", city: "Doha" }, TK: { code: "IST", city: "Istanbul" }, ET: { code: "ADD", city: "Addis Ababa" }, KQ: { code: "NBO", city: "Nairobi" }, AF: { code: "CDG", city: "Paris" }, BA: { code: "LHR", city: "London" } };
  const NG = ["P4", "W3", "VK", "UN", "IBM"];
  const INTL = ["EK", "BA", "TK", "ET", "QR", "KQ", "AF"];
  const AL_F = { P4: 1, W3: 0.97, VK: 0.9, UN: 0.93, IBM: 1.08, EK: 1.14, BA: 1.2, TK: 0.97, ET: 0.9, QR: 1.12, KQ: 0.94, AF: 1.1 };
  const CABINS = { Economy: { m: 1, label: "Economy", icon: "bi-person" }, Premium: { m: 1.65, label: "Premium Economy", icon: "bi-star" }, Business: { m: 2.9, label: "Business", icon: "bi-briefcase" }, First: { m: 4.3, label: "First", icon: "bi-gem" } };
  const ISO = { Nigeria: "ng", Ghana: "gh", Kenya: "ke", "South Africa": "za", UAE: "ae", "United Kingdom": "gb", "United States": "us", Canada: "ca", France: "fr", Turkey: "tr" };
  const POPULAR = [["LOS", "ABV"], ["LOS", "DXB"], ["ABV", "LHR"], ["LOS", "ACC"], ["LOS", "PHC"], ["LOS", "JFK"], ["ABV", "KAN"]];
  const TIME_BUCKETS = [
    { k: "early", label: "Early", sub: "00–06", icon: "bi-moon-stars", test: (m) => m < 360 },
    { k: "morning", label: "Morning", sub: "06–12", icon: "bi-sunrise", test: (m) => m >= 360 && m < 720 },
    { k: "afternoon", label: "Afternoon", sub: "12–18", icon: "bi-sun", test: (m) => m >= 720 && m < 1080 },
    { k: "evening", label: "Evening", sub: "18–24", icon: "bi-sunset", test: (m) => m >= 1080 }
  ];

  function dist(a, b) {
    const [la1, lo1] = COORD[a], [la2, lo2] = COORD[b], R = 6371, rad = Math.PI / 180;
    const dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const isDomestic = (a, b) => AP[a].country === "Nigeria" && AP[b].country === "Nigeria";
  const apLabel = (c) => (AP[c] ? `${AP[c].city} (${c})` : c);

  /* ---------------- Flight generator (deterministic) ---------------- */
  const cache = new Map();
  function generate(from, to, date) {
    const key = `${from}-${to}-${date}`;
    if (cache.has(key)) return cache.get(key);
    const r = seed(key);
    const rint = (a, b) => a + Math.floor(r() * (b - a + 1));
    const domestic = isDomestic(from, to);
    const D = dist(from, to);
    let cands = [];
    if (domestic) NG.forEach((c) => cands.push({ al: c, via: null }));
    else {
      INTL.forEach((c) => {
        const h = HUBS[c];
        if (h.code === from || h.code === to) cands.push({ al: c, via: null });
        else if ((dist(from, h.code) + dist(h.code, to)) / D < 1.6) cands.push({ al: c, via: h });
      });
      if ((AP[from].country === "Nigeria" || AP[to].country === "Nigeria") && D < 7000) {
        cands.push({ al: "P4", via: null });
        if (D < 3000) cands.push({ al: "W3", via: null });
      }
      if (!cands.length) cands = INTL.map((c) => ({ al: c, via: HUBS[c] }));
    }
    const n = domestic ? rint(8, 12) : rint(6, 10);
    const days = Math.round((parse(date) - parse(today())) / 864e5);
    const wd = parse(date).getDay();
    const dateF = (days < 3 ? 1.22 : days < 7 ? 1.1 : days < 21 ? 1 : 0.93) * (wd === 5 || wd === 0 ? 1.06 : 1);
    const offset = rint(0, cands.length - 1);
    const used = new Set();
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = i < cands.length ? cands[(i + offset) % cands.length] : cands[Math.floor(r() * cands.length)];
      let via = c.via;
      if (domestic && r() < 0.15) {
        const hub = ["ABV", "LOS"].find((h) => h !== from && h !== to);
        if (hub) via = { code: hub, city: AP[hub].city };
      }
      let dep, guard = 0;
      do { dep = rint(66, 264) * 5; guard++; } while (used.has(c.al + dep) && guard < 20);
      used.add(c.al + dep);
      const num = rint(100, 979);
      const legs = via ? [[from, via.code], [via.code, to]] : [[from, to]];
      const lay = via ? rint(14, 50) * 5 : 0;
      let t = dep;
      const segments = legs.map(([a, b], j) => {
        const mins = Math.round((dist(a, b) / 790 * 60 + 32) / 5) * 5;
        const s = { from: a, to: b, fromCity: AP[a] ? AP[a].city : via.city, toCity: AP[b] ? AP[b].city : via.city, dep: t, arr: t + mins, mins, flightNo: `${c.al} ${num + j * 2}` };
        t += mins + lay;
        return s;
      });
      const arr = segments[segments.length - 1].arr;
      const base = domestic ? 42000 + D * 92 : 185000 + D * 108;
      const peak = (dep >= 360 && dep < 540) || (dep >= 1020 && dep < 1200) ? 1.08 : 1;
      const price = r100(base * AL_F[c.al] * (via ? 0.86 : 1) * (0.86 + r() * 0.38) * peak * dateF);
      out.push({
        id: `${c.al}${num}-${from}${to}-${date}`, airline: c.al, flightNo: `${c.al} ${num}`, from, to, date, dep, arr,
        duration: arr - dep, stops: via ? 1 : 0, via, segments, layover: lay, price, refundable: r() < 0.38, seatsLeft: rint(2, 14), domestic
      });
    }
    out.sort((a, b) => a.dep - b.dep);
    cache.set(key, out);
    return out;
  }
  const fareFor = (f, cabin) => r100(f.price * CABINS[cabin].m);
  const refundableFor = (f, cabin) => f.refundable || cabin === "Business" || cabin === "First";
  function bagsFor(f, cabin) {
    const hold = f.domestic
      ? { Economy: "1 × 20kg", Premium: "1 × 25kg", Business: "2 × 30kg", First: "2 × 32kg" }[cabin]
      : { Economy: "2 × 23kg", Premium: "2 × 23kg", Business: "2 × 32kg", First: "3 × 32kg" }[cabin];
    return { hold, cabin: cabin === "Economy" ? "1 × 7kg" : "2 × 7kg" };
  }
  function paxFare(fare, pax) {
    const child = r100(fare * 0.75), inf = r100(fare * 0.1);
    return { adult: fare, child, inf, total: fare * pax.adults + child * pax.children + inf * pax.infants };
  }
  const cheapest = (from, to, date, cabin) => Math.min(...generate(from, to, date).map((f) => fareFor(f, cabin)));

  /* ---------------- State ---------------- */
  const S = { trip: "oneway", legs: [], ret: "", pax: { adults: 1, children: 0, infants: 0 }, cabin: "Economy" };
  let search = null;     // frozen copy of the submitted search
  let legIdx = 0;        // which leg we are choosing
  let picks = [];        // selected flights per leg
  let F = null;          // active filters
  let sortBy = "best";
  let current = [];      // flights for current leg (with fare)
  let booking = null;
  let searchTimer = null;

  /* ====================================================================== */
  function init() {
    ({ fmt, esc, store } = AB);
    AP = Object.fromEntries(AB_DATA.airports.map((a) => [a.code, a]));
    AL = Object.fromEntries(AB_DATA.airlines.map((a) => [a.code, a]));
    const t1 = addDays(today(), 1);
    S.legs = [{ from: "LOS", to: "", date: t1 }, { from: "", to: "", date: addDays(t1, 3) }];
    S.ret = addDays(t1, 7);
    const qf = AB.qs("from"), qt = AB.qs("to");
    if (qf && AP[qf.toUpperCase()]) S.legs[0].from = qf.toUpperCase();
    if (qt && AP[qt.toUpperCase()]) S.legs[0].to = qt.toUpperCase();

    const pr = document.createElement("div"); pr.id = "printRoot"; document.body.appendChild(pr);
    window.addEventListener("afterprint", () => { document.body.classList.remove("printing"); pr.innerHTML = ""; });

    bindSearchForm();
    renderLegRows();
    renderPax();
    renderPopular();
    renderDiscover();
    bindResults();
    bindViews();
    renderTrips();
    store.on((k) => { if (k === "bookings") renderTrips(); if (k === "wallet" || k === "transactions") { if (booking && booking.step === 4) renderSummary(); } });

    if (location.hash === "#trips") showView("trips");
    if (qf && qt && S.legs[0].from && S.legs[0].to) doSearch();
  }

  /* ---------------- Views ---------------- */
  function bindViews() {
    $$("#viewSeg [data-view]").forEach((b) => b.addEventListener("click", () => showView(b.dataset.view)));
    document.addEventListener("click", (e) => { const g = e.target.closest("[data-goto]"); if (g) showView(g.dataset.goto); });
    window.addEventListener("hashchange", () => { if (location.hash === "#trips") showView("trips"); });
    $("#backToResults").addEventListener("click", () => {
      if (!confirmLeave()) return;
      booking = null; legIdx = search.legs.length - 1; picks = picks.slice(0, legIdx);
      showView("search"); renderResults();
    });
  }
  function confirmLeave() { return !booking || booking.step === 0 || window.confirm("Leave booking? Details you entered will be lost."); }
  function showView(v) {
    const inBooking = !!booking;
    $("#searchView").hidden = !(v === "search" && !inBooking);
    $("#bookView").hidden = !(v === "search" && inBooking);
    $("#tripsView").hidden = v !== "trips";
    $$("#viewSeg [data-view]").forEach((b) => { const on = b.dataset.view === v; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    if (v === "trips") { if (location.hash !== "#trips") history.replaceState(null, "", "#trips"); renderTrips(); }
    else if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ====================================================================== */
  /*  SEARCH FORM                                                           */
  /* ====================================================================== */
  function airportField(id, label, code, icon) {
    const a = AP[code];
    return `<div class="fl-col">
      <label class="fl-field" for="${id}">
        <span class="fl-lbl"><i class="bi ${icon}"></i>${label}</span>
        <input id="${id}" class="fl-input" data-ap role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" placeholder="City or airport" value="${a ? esc(apLabel(code)) : ""}" data-code="${a ? code : ""}" spellcheck="false">
        <div class="fl-sub" data-sub>${a ? esc(a.name + ", " + a.country) : "&nbsp;"}</div>
      </label>
      <ul class="fl-ac" id="${id}-list" role="listbox" hidden></ul>
      <div class="fl-err" data-err-for="${id}"></div>
    </div>`;
  }
  function dateField(id, label, val, min) {
    return `<div class="fl-col fl-col-date">
      <label class="fl-field" for="${id}">
        <span class="fl-lbl"><i class="bi bi-calendar-event"></i>${label}</span>
        <input type="date" id="${id}" class="fl-input" value="${val}" min="${min}" required>
        <div class="fl-sub" data-sub>${val ? dayLabel(val, { weekday: "long" }) : "&nbsp;"}</div>
      </label>
      <div class="fl-err" data-err-for="${id}"></div>
    </div>`;
  }
  function renderLegRows() {
    const t = today();
    const l0 = S.legs[0], l1 = S.legs[1];
    let html = `<div class="fl-row" data-leg="0">
      <div class="fl-ft">${airportField("from0", "From", l0.from, "bi-geo-alt")}
        <button type="button" class="fl-swap" data-swap="0" aria-label="Swap origin and destination"><i class="bi bi-arrow-left-right"></i></button>
        ${airportField("to0", "To", l0.to, "bi-pin-map")}</div>
      ${dateField("date0", "Depart", l0.date, t)}
      ${S.trip === "round" ? dateField("ret", "Return", S.ret, l0.date || t)
        : S.trip === "oneway" ? `<div class="fl-col"><button type="button" class="fl-addret" id="addRet"><i class="bi bi-plus-circle me-1"></i>Add return</button></div>`
        : `<div class="fl-col d-none d-md-block"></div>`}
    </div>`;
    if (S.trip === "multi") {
      html += `<div class="fl-row leg2" data-leg="1">
        <div class="fl-ft">${airportField("from1", "From (flight 2)", l1.from, "bi-geo-alt")}
          <button type="button" class="fl-swap" data-swap="1" aria-label="Swap origin and destination for flight 2"><i class="bi bi-arrow-left-right"></i></button>
          ${airportField("to1", "To (flight 2)", l1.to, "bi-pin-map")}</div>
        ${dateField("date1", "Depart (flight 2)", l1.date, l0.date || t)}
      </div>
      <div class="fs-8 text-muted mt-2"><i class="bi bi-info-circle me-1"></i>Multi-city supports up to 2 flights.</div>`;
    }
    $("#legRows").innerHTML = html;
    $$("#legRows [data-ap]").forEach(bindTypeahead);
    $$("#legRows input[type=date]").forEach((inp) => inp.addEventListener("change", () => {
      readDates();
      inp.closest(".fl-field").querySelector("[data-sub]").innerHTML = inp.value ? dayLabel(inp.value, { weekday: "long" }) : "&nbsp;";
      clearErr(inp.id);
      if (inp.id === "date0") {
        ["ret", "date1"].forEach((id) => { const x = $("#" + id); if (x) { x.min = inp.value || today(); if (x.value && inp.value && x.value < inp.value) { x.value = id === "ret" ? addDays(inp.value, 3) : addDays(inp.value, 2); x.dispatchEvent(new Event("change")); } } });
      }
    }));
    $$("#legRows [data-swap]").forEach((b) => b.addEventListener("click", () => {
      const i = +b.dataset.swap, L = S.legs[i];
      [L.from, L.to] = [L.to, L.from];
      b.classList.toggle("spin");
      setAp($("#from" + i), L.from); setAp($("#to" + i), L.to);
    }));
    const ar = $("#addRet");
    if (ar) ar.addEventListener("click", () => { setTrip("round"); setTimeout(() => $("#ret") && $("#ret").focus(), 0); });
  }
  function readDates() {
    if ($("#date0")) S.legs[0].date = $("#date0").value;
    if ($("#ret")) S.ret = $("#ret").value;
    if ($("#date1")) S.legs[1].date = $("#date1").value;
  }
  function setAp(inp, code) {
    if (!inp) return;
    const a = AP[code];
    inp.value = a ? apLabel(code) : "";
    inp.dataset.code = a ? code : "";
    inp.closest(".fl-field").querySelector("[data-sub]").innerHTML = a ? esc(a.name + ", " + a.country) : "&nbsp;";
    const [, kind, i] = inp.id.match(/(from|to)(\d)/);
    S.legs[+i][kind] = a ? code : "";
    if (a) clearErr(inp.id);
  }
  function bindTypeahead(inp) {
    const list = $("#" + inp.id + "-list");
    let items = [], active = -1;
    const render = () => {
      const q = inp.value.trim().toLowerCase().replace(/\(.*\)/, "").trim();
      const exactSel = inp.dataset.code && inp.value === apLabel(inp.dataset.code);
      items = AB_DATA.airports.filter((a) => exactSel || !q || [a.code, a.city, a.name, a.country].some((v) => v.toLowerCase().includes(q)));
      items.sort((a, b) => (b.code.toLowerCase() === q) - (a.code.toLowerCase() === q) || (b.city.toLowerCase().startsWith(q)) - (a.city.toLowerCase().startsWith(q)));
      active = items.length ? 0 : -1;
      list.innerHTML = items.length ? items.map((a, i) => `<li role="option" id="${inp.id}-o${i}" data-code="${a.code}" class="${i === active ? "active" : ""}" aria-selected="${i === active}">
          <span class="code">${a.code}</span><div class="min-w-0"><div class="fw-semibold fs-7 text-truncate">${esc(a.city)}, ${esc(a.country)}</div><div class="fs-8 text-muted text-truncate">${esc(a.name)}</div></div></li>`).join("")
        : `<li class="empty" aria-disabled="true">No airports match “${esc(inp.value)}”</li>`;
      open(true);
    };
    const open = (on) => { list.hidden = !on; inp.setAttribute("aria-expanded", on); if (!on) inp.removeAttribute("aria-activedescendant"); else if (active > -1) inp.setAttribute("aria-activedescendant", `${inp.id}-o${active}`); };
    const move = (d) => {
      if (!items.length) return;
      active = (active + d + items.length) % items.length;
      $$("li", list).forEach((li, i) => { li.classList.toggle("active", i === active); li.setAttribute("aria-selected", i === active); });
      const el = $(`#${inp.id}-o${active}`); el && el.scrollIntoView({ block: "nearest" });
      inp.setAttribute("aria-activedescendant", `${inp.id}-o${active}`);
    };
    const choose = (code) => {
      setAp(inp, code); open(false);
      // jump to next logical field
      const next = inp.id.startsWith("from") ? $("#" + inp.id.replace("from", "to")) : null;
      if (next && !next.dataset.code) next.focus();
    };
    inp.addEventListener("focus", () => { inp.select(); render(); });
    inp.addEventListener("input", () => { inp.dataset.code = ""; render(); });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); list.hidden ? render() : move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { if (!list.hidden && items[active]) { e.preventDefault(); choose(items[active].code); } }
      else if (e.key === "Escape") open(false);
      else if (e.key === "Tab" && !list.hidden && items[active] && inp.value.trim() && !inp.dataset.code) choose(items[active].code);
    });
    list.addEventListener("mousedown", (e) => { const li = e.target.closest("li[data-code]"); if (li) { e.preventDefault(); choose(li.dataset.code); } });
    inp.addEventListener("blur", () => setTimeout(() => {
      open(false);
      if (!inp.dataset.code) {
        const q = inp.value.trim().toUpperCase();
        const m = AP[q] || AB_DATA.airports.find((a) => a.city.toUpperCase() === q);
        if (m) setAp(inp, m.code);
        else { const [, kind, i] = inp.id.match(/(from|to)(\d)/); S.legs[+i][kind] = ""; inp.closest(".fl-field").querySelector("[data-sub]").innerHTML = "&nbsp;"; }
      }
    }, 120));
  }

  function setTrip(t) {
    readDates();
    S.trip = t;
    $$("#tripSeg [data-trip]").forEach((b) => { const on = b.dataset.trip === t; b.classList.toggle("active", on); b.setAttribute("aria-checked", on); });
    if (t === "round" && (!S.ret || S.ret < S.legs[0].date)) S.ret = addDays(S.legs[0].date || today(), 7);
    if (t === "multi") {
      if (!S.legs[1].from && S.legs[0].to) S.legs[1].from = S.legs[0].to;
      if (!S.legs[1].date || S.legs[1].date < S.legs[0].date) S.legs[1].date = addDays(S.legs[0].date || today(), 3);
    }
    renderLegRows();
  }

  /* Passengers & cabin */
  function renderPax() {
    const p = S.pax, seated = p.adults + p.children;
    const rows = [
      ["adults", "Adults", "12+ years", p.adults > 1, seated < 9],
      ["children", "Children", "2–11 years", p.children > 0, seated < 9],
      ["infants", "Infants", "Under 2 · on lap", p.infants > 0, p.infants < p.adults]
    ];
    $("#paxSteppers").innerHTML = rows.map(([k, l, s, canDec, canInc]) => `
      <div class="d-flex justify-content-between align-items-center py-2">
        <div><div class="fw-semibold fs-7">${l}</div><div class="fs-8 text-muted">${s}</div></div>
        <div class="stepper"><button type="button" data-pax="${k}" data-d="-1" ${canDec ? "" : "disabled"} aria-label="Remove one ${l.toLowerCase().replace(/s$/, "")}"><i class="bi bi-dash"></i></button>
          <output aria-live="polite" aria-label="${l}">${p[k]}</output>
          <button type="button" data-pax="${k}" data-d="1" ${canInc ? "" : "disabled"} aria-label="Add one ${l.toLowerCase().replace(/s$/, "")}"><i class="bi bi-plus"></i></button></div>
      </div>`).join("");
    const note = p.infants >= p.adults && p.infants > 0 ? "Each infant must travel with an adult." : seated >= 9 ? "Maximum of 9 seated travellers per booking." : "Max 9 travellers. Infants travel on an adult's lap.";
    $("#paxNote").textContent = note;
    $("#paxNote").classList.toggle("text-warning", note !== "Max 9 travellers. Infants travel on an adult's lap.");
    $("#cabinOpts").innerHTML = Object.entries(CABINS).map(([k, c]) => `<div class="col-6"><button type="button" class="ab-option py-2 fs-7 fw-semibold ${S.cabin === k ? "active" : ""}" data-cabin="${k}" aria-pressed="${S.cabin === k}"><i class="bi ${c.icon} me-1 text-primary"></i>${c.label}</button></div>`).join("");
    const total = p.adults + p.children + p.infants;
    $("#paxLabel").textContent = `${plural(total, "Traveller")} · ${CABINS[S.cabin].label}`;
  }

  function bindSearchForm() {
    $$("#tripSeg [data-trip]").forEach((b) => b.addEventListener("click", () => setTrip(b.dataset.trip)));
    $("#paxMenu").addEventListener("click", (e) => {
      const s = e.target.closest("[data-pax]");
      if (s) {
        const k = s.dataset.pax; S.pax[k] = Math.max(0, S.pax[k] + +s.dataset.d);
        if (S.pax.infants > S.pax.adults) S.pax.infants = S.pax.adults;
        renderPax();
        const again = $(`#paxSteppers [data-pax="${k}"][data-d="${s.dataset.d}"]`);
        (again && !again.disabled ? again : $(`#paxSteppers [data-pax="${k}"]:not(:disabled)`))?.focus();
      }
      const c = e.target.closest("[data-cabin]");
      if (c) { S.cabin = c.dataset.cabin; renderPax(); $(`#cabinOpts [data-cabin="${S.cabin}"]`).focus(); }
    });
    $("#paxDone").addEventListener("click", () => bootstrap.Dropdown.getOrCreateInstance($("#paxBtn")).hide());
    $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); doSearch(); });
  }

  function err(id, msg) {
    const inp = $("#" + id); if (!inp) return;
    inp.closest(".fl-field").classList.add("is-invalid");
    inp.setAttribute("aria-invalid", "true");
    const el = $(`[data-err-for="${id}"]`); el.textContent = msg; el.classList.add("show");
  }
  function clearErr(id) {
    const inp = $("#" + id); if (!inp) return;
    inp.closest(".fl-field").classList.remove("is-invalid");
    inp.removeAttribute("aria-invalid");
    const el = $(`[data-err-for="${id}"]`); if (el) el.classList.remove("show");
  }
  function validateSearch() {
    readDates();
    $$("#legRows .fl-field.is-invalid input").forEach((i) => clearErr(i.id));
    const t = today();
    const legsN = S.trip === "multi" ? 2 : 1;
    let ok = true;
    for (let i = 0; i < legsN; i++) {
      const L = S.legs[i];
      if (!L.from) { err("from" + i, "Choose a departure airport"); ok = false; }
      if (!L.to) { err("to" + i, "Choose a destination airport"); ok = false; }
      if (L.from && L.to && L.from === L.to) { err("to" + i, "Destination must differ from origin"); ok = false; }
      if (!L.date) { err("date" + i, "Pick a departure date"); ok = false; }
      else if (L.date < t) { err("date" + i, "Date can't be in the past"); ok = false; }
      else if (L.date > addDays(t, 330)) { err("date" + i, "Bookings open 330 days ahead"); ok = false; }
    }
    if (S.trip === "round") {
      if (!S.ret) { err("ret", "Pick a return date"); ok = false; }
      else if (S.legs[0].date && S.ret < S.legs[0].date) { err("ret", "Return must be on/after departure"); ok = false; }
    }
    if (S.trip === "multi" && S.legs[1].date && S.legs[0].date && S.legs[1].date < S.legs[0].date) { err("date1", "Flight 2 must be on/after flight 1"); ok = false; }
    if (!ok) { const f = $("#legRows .is-invalid input"); f && f.focus(); AB.toast("Please fix the highlighted fields", "warning"); }
    return ok;
  }

  function doSearch() {
    if (!validateSearch()) return;
    const L0 = S.legs[0];
    const legs = S.trip === "round" ? [{ ...L0 }, { from: L0.to, to: L0.from, date: S.ret }]
      : S.trip === "multi" ? [{ ...L0 }, { ...S.legs[1] }] : [{ ...L0 }];
    search = { trip: S.trip, legs: legs.map((l) => ({ from: l.from, to: l.to, date: l.date })), pax: { ...S.pax }, cabin: S.cabin };
    legIdx = 0; picks = [];
    loadLeg(true);
  }

  /* ---------------- Popular / discover ---------------- */
  function renderPopular() {
    $("#popularRoutes").innerHTML = POPULAR.map(([a, b]) => `<button type="button" class="ab-chip" data-route="${a}-${b}">${a} <i class="bi bi-arrow-right"></i> ${b}</button>`).join("");
    $("#popularRoutes").addEventListener("click", (e) => {
      const c = e.target.closest("[data-route]"); if (!c) return;
      const [a, b] = c.dataset.route.split("-");
      if (S.trip === "multi") setTrip("oneway");
      readDates();
      if (!S.legs[0].date || S.legs[0].date < today()) S.legs[0].date = addDays(today(), 1);
      S.legs[0].from = a; S.legs[0].to = b;
      renderLegRows();
      doSearch();
    });
  }
  function renderDiscover() {
    const d = addDays(today(), 7);
    const dests = [["LOS", "DXB", "#c8102e,#7a0a1d", "bi-buildings"], ["ABV", "LHR", "#1e3a8a,#0b1a4d", "bi-bank"], ["LOS", "ACC", "#0e7490,#0b4f6c", "bi-tree"], ["LOS", "ABV", "#15803d,#0b4f2c", "bi-geo"], ["LOS", "JFK", "#7048e8,#3b1fa6", "bi-building"], ["LOS", "IST", "#dc2626,#7f1d1d", "bi-moon-stars"]];
    $("#destGrid").innerHTML = dests.map(([a, b, g, ic]) => {
      const to = AP[b];
      return `<div class="col-6 col-md-4 col-xl-2"><button type="button" class="dest-card ab-card-hover" style="background:linear-gradient(135deg,${g})" data-dest="${a}-${b}" aria-label="Search ${AP[a].city} to ${to.city}">
        <i class="bi ${ic} bg-ic" aria-hidden="true"></i>
        <img src="${AB.flag(ISO[to.country], 40)}" alt="" loading="lazy">
        <div><div class="fw-800 fs-6">${esc(to.city)}</div><div class="fs-8 opacity-75">from ${a}</div><div class="fw-bold fs-7 mt-1">${fmt.naira(cheapest(a, b, d, "Economy"))}</div></div>
      </button></div>`;
    }).join("");
    $("#destGrid").addEventListener("click", (e) => {
      const c = e.target.closest("[data-dest]"); if (!c) return;
      const [a, b] = c.dataset.dest.split("-");
      if (S.trip === "multi") setTrip("oneway");
      S.legs[0] = { from: a, to: b, date: d };
      renderLegRows(); doSearch();
    });
  }

  /* ====================================================================== */
  /*  RESULTS                                                               */
  /* ====================================================================== */
  function bindResults() {
    $("#modifyBtn").addEventListener("click", () => { window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => $("#to0") && $("#to0").focus({ preventScroll: true }), 350); });
    $$("#sortSeg [data-sort]").forEach((b) => b.addEventListener("click", () => {
      sortBy = b.dataset.sort; $$("#sortSeg [data-sort]").forEach((x) => x.classList.toggle("active", x === b)); renderList();
    }));
    $("#dateStrip").addEventListener("click", (e) => {
      const b = e.target.closest("[data-date]"); if (!b || b.disabled) return;
      search.legs[legIdx].date = b.dataset.date;
      // keep later legs chronological
      for (let i = legIdx + 1; i < search.legs.length; i++) if (search.legs[i].date < b.dataset.date) search.legs[i].date = b.dataset.date;
      syncFormFromSearch();
      loadLeg(false);
    });
    $("#flightList").addEventListener("click", (e) => {
      const s = e.target.closest("[data-select]");
      if (s) return selectFlight(s.dataset.select);
      const r = e.target.closest("[data-reset-filters]");
      if (r) { resetFilters(); renderFilters(); renderList(); }
    });
    $("#pickedLegs").addEventListener("click", (e) => {
      const c = e.target.closest("[data-change-leg]"); if (!c) return;
      legIdx = +c.dataset.changeLeg; picks = picks.slice(0, legIdx); loadLeg(false);
    });
    $("#filterBody").addEventListener("input", onFilter);
    $("#filterBody").addEventListener("click", (e) => {
      const tb = e.target.closest("[data-time]");
      if (tb) { const k = tb.dataset.time; F.times.has(k) ? F.times.delete(k) : F.times.add(k); tb.classList.toggle("active"); tb.setAttribute("aria-pressed", F.times.has(k)); renderList(); }
      if (e.target.closest("[data-clear]")) { resetFilters(); renderFilters(); renderList(); }
    });
  }
  function syncFormFromSearch() {
    // reflect date strip choice back into the search form
    S.legs[0].date = search.legs[0].date;
    if (search.trip === "round") S.ret = search.legs[1].date;
    if (search.trip === "multi") S.legs[1].date = search.legs[1].date;
    renderLegRows();
  }

  function loadLeg(scroll) {
    $("#discover").hidden = true;
    $("#results").hidden = false;
    renderResultsHead();
    $("#flightList").innerHTML = Array.from({ length: 4 }, () => `
      <div class="card"><div class="card-body"><div class="d-flex gap-3 align-items-center">
        <div class="skeleton" style="width:40px;height:40px;border-radius:12px"></div>
        <div class="flex-grow-1"><div class="skeleton mb-2" style="height:14px;width:45%"></div><div class="skeleton" style="height:10px;width:28%"></div></div>
        <div class="skeleton d-none d-sm-block" style="height:30px;width:110px"></div></div>
        <div class="skeleton mt-3" style="height:10px;width:100%"></div></div></div>`).join("");
    $("#filterBody").innerHTML = `<div class="skeleton mb-3" style="height:14px;width:60%"></div><div class="skeleton mb-2" style="height:10px"></div><div class="skeleton mb-2" style="height:10px"></div><div class="skeleton" style="height:10px;width:70%"></div>`;
    $("#resCount").innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Searching ${AL ? Object.keys(AL).length : 12} airlines…`;
    $("#dateStrip").innerHTML = "";
    const sb = $("#searchBtn"); sb.disabled = true;
    if (scroll) setTimeout(() => $("#results").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { sb.disabled = false; renderResults(); }, 900);
  }

  function renderResultsHead() {
    const L = search.legs[legIdx], p = search.pax;
    const n = p.adults + p.children + p.infants;
    const multi = search.legs.length > 1;
    $("#legStepLabel").textContent = multi ? (search.trip === "round" ? (legIdx === 0 ? "Step 1 of 2 · Select outbound" : "Step 2 of 2 · Select return") : `Flight ${legIdx + 1} of 2 · Select flight`) : "Select your flight";
    $("#resTitle").innerHTML = `${esc(AP[L.from].city)} <i class="bi bi-arrow-right fs-6 text-muted"></i> ${esc(AP[L.to].city)}`;
    $("#resSub").textContent = `${dayLabel(L.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${plural(n, "traveller")} · ${CABINS[search.cabin].label}`;
    $("#pickedLegs").innerHTML = picks.map((f, i) => `
      <div class="picked-leg d-flex flex-wrap gap-2 align-items-center mb-3">
        <i class="bi bi-check-circle-fill text-success"></i>
        <div class="min-w-0 flex-grow-1"><div class="fs-8 text-muted fw-semibold">${search.trip === "round" ? "Outbound" : "Flight " + (i + 1)} selected · ${dayLabel(f.date)}</div>
          <div class="fw-bold fs-7 text-truncate">${f.from} ${hm(f.dep)} → ${f.to} ${hm(f.arr)} · ${esc(AL[f.airline].name)} · ${fmt.naira(fareFor(f, search.cabin))}</div></div>
        <button type="button" class="btn btn-sm btn-light-subtle" data-change-leg="${i}">Change</button>
      </div>`).join("");
  }

  function renderResults() {
    renderResultsHead();
    const L = search.legs[legIdx];
    current = generate(L.from, L.to, L.date).map((f) => ({ ...f, fare: fareFor(f, search.cabin), ref: refundableFor(f, search.cabin) }));
    resetFilters();
    renderDateStrip();
    renderFilters();
    renderList();
  }

  function renderDateStrip() {
    const L = search.legs[legIdx];
    const minDate = legIdx > 0 ? search.legs[legIdx - 1].date : today();
    const days = [-3, -2, -1, 0, 1, 2, 3].map((o) => addDays(L.date, o));
    const prices = days.map((d) => (d >= minDate ? cheapest(L.from, L.to, d, search.cabin) : null));
    const low = Math.min(...prices.filter((x) => x != null));
    $("#dateStrip").innerHTML = days.map((d, i) => `
      <button type="button" data-date="${d}" class="${d === L.date ? "active" : ""} ${prices[i] === low ? "low" : ""}" ${prices[i] == null ? "disabled" : ""} aria-pressed="${d === L.date}" aria-label="${dayLabel(d, { weekday: "long", day: "numeric", month: "long" })}${prices[i] ? ", from " + fmt.naira(prices[i]) : ", unavailable"}">
        <div class="d">${dayLabel(d, { weekday: "short", day: "numeric", month: "short" })}</div>
        <div class="p tabular">${prices[i] ? fmt.naira(prices[i]) : "—"}</div>
      </button>`).join("");
    const act = $("#dateStrip .active");
    if (act) $("#dateStrip").scrollLeft = act.offsetLeft - $("#dateStrip").clientWidth / 2 + act.clientWidth / 2;
  }

  function resetFilters() {
    const max = current.length ? Math.max(...current.map((f) => f.fare)) : 0;
    F = { stops: new Set(), airlines: new Set(), times: new Set(), maxPrice: max, refundable: false, ceiling: max };
  }
  function activeFilterCount() {
    return F.stops.size + F.airlines.size + F.times.size + (F.refundable ? 1 : 0) + (F.maxPrice < F.ceiling ? 1 : 0);
  }
  function renderFilters() {
    const minBy = (fn) => { const m = {}; current.forEach((f) => { const k = fn(f); m[k] = Math.min(m[k] ?? Infinity, f.fare); }); return m; };
    const stopsMin = minBy((f) => f.stops), alMin = minBy((f) => f.airline);
    const lo = Math.min(...current.map((f) => f.fare)), hi = F.ceiling;
    const step = hi - lo > 200000 ? 5000 : 1000;
    $("#filterBody").innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2"><span class="fw-bold">Filter results</span><button type="button" class="btn btn-link btn-sm p-0" data-clear>Reset</button></div>
      <div class="flt-group"><h6>Stops</h6>
        ${[0, 1].filter((s) => stopsMin[s] != null).map((s) => `<label class="flt-check"><input class="form-check-input" type="checkbox" data-f="stops" value="${s}" ${F.stops.has(s) ? "checked" : ""}>${s === 0 ? "Direct" : "1 stop"}<span class="pr">${fmt.naira(stopsMin[s])}</span></label>`).join("")}
      </div>
      <div class="flt-group"><h6>Departure time</h6>
        <div class="time-grid">${TIME_BUCKETS.map((b) => `<button type="button" class="ab-option ${F.times.has(b.k) ? "active" : ""}" data-time="${b.k}" aria-pressed="${F.times.has(b.k)}"><i class="bi ${b.icon}"></i>${b.label}<div class="fs-8 text-muted">${b.sub}</div></button>`).join("")}</div>
      </div>
      <div class="flt-group"><h6>Max price</h6>
        <input type="range" class="form-range" data-f="price" min="${lo}" max="${hi}" step="${step}" value="${F.maxPrice}" aria-label="Maximum price">
        <div class="d-flex justify-content-between fs-8 text-muted fw-semibold"><span>${fmt.naira(lo)}</span><span class="text-body fw-bold" id="priceOut">Up to ${fmt.naira(F.maxPrice)}</span></div>
      </div>
      <div class="flt-group"><h6>Airlines</h6>
        ${Object.keys(alMin).sort((a, b) => alMin[a] - alMin[b]).map((c) => `<label class="flt-check"><input class="form-check-input" type="checkbox" data-f="airlines" value="${c}" ${F.airlines.has(c) ? "checked" : ""}><span class="al-logo sm" style="background:${AL[c].color}">${c}</span><span class="text-truncate">${esc(AL[c].name)}</span><span class="pr">${fmt.naira(alMin[c])}</span></label>`).join("")}
      </div>
      <div class="flt-group"><div class="form-check form-switch d-flex align-items-center gap-2 ps-0 m-0">
        <input class="form-check-input ms-0" type="checkbox" role="switch" id="fRef" data-f="refundable" ${F.refundable ? "checked" : ""}>
        <label class="form-check-label fs-7 fw-semibold" for="fRef">Refundable fares only</label></div>
      </div>`;
  }
  function onFilter(e) {
    const t = e.target, k = t.dataset.f; if (!k) return;
    if (k === "stops") { const v = +t.value; t.checked ? F.stops.add(v) : F.stops.delete(v); }
    if (k === "airlines") { t.checked ? F.airlines.add(t.value) : F.airlines.delete(t.value); }
    if (k === "price") { F.maxPrice = +t.value; $("#priceOut").textContent = "Up to " + fmt.naira(F.maxPrice); }
    if (k === "refundable") F.refundable = t.checked;
    renderList();
  }

  function scoreBest(list) {
    const minP = Math.min(...list.map((f) => f.fare)), minD = Math.min(...list.map((f) => f.duration));
    return (f) => f.fare / minP + 0.8 * (f.duration / minD) + 0.25 * f.stops;
  }
  function renderList() {
    const filtered = current.filter((f) =>
      (!F.stops.size || F.stops.has(f.stops)) &&
      (!F.airlines.size || F.airlines.has(f.airline)) &&
      (!F.times.size || TIME_BUCKETS.some((b) => F.times.has(b.k) && b.test(f.dep))) &&
      f.fare <= F.maxPrice && (!F.refundable || f.ref));
    const fc = activeFilterCount();
    $("#filterCount").textContent = fc; $("#filterCount").hidden = !fc;
    $("#filterApply").textContent = `Show ${plural(filtered.length, "flight")}`;

    // tag winners across the full set (stable reference)
    const best = scoreBest(current);
    const cheapestF = [...current].sort((a, b) => a.fare - b.fare)[0];
    const fastestF = [...current].sort((a, b) => a.duration - b.duration || a.fare - b.fare)[0];
    const bestF = [...current].sort((a, b) => best(a) - best(b))[0];
    const sortBtn = (k, txt) => { const b = $(`#sortSeg [data-sort="${k}"] small`); b.textContent = txt; };
    sortBtn("cheapest", fmt.naira(cheapestF.fare));
    sortBtn("fastest", dur(fastestF.duration));
    sortBtn("best", fmt.naira(bestF.fare) + " · " + dur(bestF.duration));

    const cmp = { cheapest: (a, b) => a.fare - b.fare || a.duration - b.duration, fastest: (a, b) => a.duration - b.duration || a.fare - b.fare, best: (a, b) => best(a) - best(b) }[sortBy];
    filtered.sort(cmp);
    $("#resCount").textContent = `${plural(filtered.length, "flight")} found${filtered.length !== current.length ? ` (of ${current.length})` : ""} · prices per adult, incl. taxes`;
    if (!filtered.length) {
      $("#flightList").innerHTML = `<div class="card"><div class="ab-empty"><span class="ab-icon ab-icon-xl tone-warning"><i class="bi bi-funnel"></i></span><h6>No flights match your filters</h6><p class="fs-7">Try widening your price range or removing a filter.</p><button class="btn btn-primary btn-sm" data-reset-filters>Clear filters</button></div></div>`;
      return;
    }
    const tags = (f) => f.id === cheapestF.id ? ["Cheapest", "tone-success"] : f.id === fastestF.id ? ["Fastest", "tone-cyan"] : f.id === bestF.id ? ["Best value", "tone-primary"] : null;
    $("#flightList").innerHTML = filtered.map((f, i) => flightCard(f, tags(f), i)).join("");
  }

  function flightCard(f, tag, i) {
    const al = AL[f.airline], p = search.pax, pt = paxFare(f.fare, p);
    const n = p.adults + p.children + p.infants;
    const bags = bagsFor(f, search.cabin);
    const cid = "fd-" + f.id.replace(/[^a-z0-9]/gi, "");
    return `<article class="card fl-card position-relative ${tag ? "tagged" : ""} fade-up" style="animation-delay:${Math.min(i, 8) * 0.03}s" aria-label="${esc(al.name)} ${f.flightNo}, ${hm(f.dep)} to ${hm(f.arr)}, ${fmt.naira(f.fare)}">
      ${tag ? `<span class="fl-tag ${tag[1]}">${tag[0]}</span>` : ""}
      <div class="card-body">
        <div class="fl-grid">
          <div class="d-flex align-items-center gap-2 min-w-0">
            <span class="al-logo" style="background:${al.color}">${f.airline}</span>
            <div class="min-w-0"><div class="fw-bold fs-7 text-truncate">${esc(al.name)}</div><div class="fs-8 text-muted">${f.segments.map((s) => s.flightNo).join(" · ")}</div></div>
          </div>
          <div class="fl-times">
            <div><div class="t tabular">${hm(f.dep)}</div><div class="c">${f.from}</div></div>
            <div class="fl-line"><div>${dur(f.duration)}</div><div class="bar">${f.stops ? '<span class="stop"></span>' : ""}</div>
              <div class="${f.stops ? "stops" : "direct"}">${f.stops ? `1 stop · ${f.via.code}` : "Direct"}</div></div>
            <div class="text-end"><div class="t tabular">${hm(f.arr % 1440)}${nextDay(f.arr)}</div><div class="c">${f.to}</div></div>
          </div>
          <div class="fl-price">
            <div class="amt tabular">${fmt.naira(f.fare)}</div>
            <div class="fs-8 text-muted">${n > 1 ? `${fmt.naira(pt.total)} for ${n}` : "per adult"}</div>
            <button type="button" class="btn btn-primary btn-sm mt-2 px-3 d-none d-md-inline-block" data-select="${f.id}">Select <i class="bi bi-arrow-right"></i></button>
          </div>
        </div>
        <div class="fl-meta">
          <span><i class="bi bi-suitcase2"></i>${bags.hold}</span>
          <span><i class="bi bi-backpack"></i>${bags.cabin} cabin</span>
          <span class="${f.ref ? "text-success" : ""}"><i class="bi ${f.ref ? "bi-arrow-counterclockwise" : "bi-x-circle"}"></i>${f.ref ? "Refundable" : "Non-refundable"}</span>
          ${f.seatsLeft <= 5 ? `<span style="color:var(--ab-danger)"><i class="bi bi-fire"></i>${f.seatsLeft} seats left</span>` : ""}
          <button type="button" class="btn btn-link btn-sm p-0 ms-auto fw-semibold fs-8" data-bs-toggle="collapse" data-bs-target="#${cid}" aria-expanded="false" aria-controls="${cid}">Flight details <i class="bi bi-chevron-down"></i></button>
        </div>
        <div class="collapse" id="${cid}">${segmentsHtml(f)}</div>
        <button type="button" class="btn btn-primary w-100 mt-3 d-md-none" data-select="${f.id}">Select · ${fmt.naira(f.fare)}</button>
      </div>
    </article>`;
  }
  function segmentsHtml(f) {
    return `<div class="seg-tl">${f.segments.map((s, j) => `
      <div class="pt"><div class="fw-bold fs-7">${hm(s.dep % 1440)}${nextDay(s.dep)} · ${esc(s.fromCity)} (${s.from})</div><div class="fs-8 text-muted">${AP[s.from] ? esc(AP[s.from].name) : esc(s.fromCity) + " Intl"}</div></div>
      <div class="fs-8 text-muted my-2 ps-1"><i class="bi bi-airplane me-1"></i>${esc(AL[f.airline].name)} ${s.flightNo} · ${dur(s.mins)} · ${CABINS[search ? search.cabin : "Economy"].label}</div>
      <div class="pt"><div class="fw-bold fs-7">${hm(s.arr % 1440)}${nextDay(s.arr)} · ${esc(s.toCity)} (${s.to})</div><div class="fs-8 text-muted">${AP[s.to] ? esc(AP[s.to].name) : esc(s.toCity) + " Intl"}</div></div>
      ${j < f.segments.length - 1 ? `<div class="layover"><i class="bi bi-clock-history me-1"></i>${dur(f.layover)} layover in ${esc(f.via.city)}</div>` : ""}`).join("")}</div>`;
  }

  function selectFlight(id) {
    const f = current.find((x) => x.id === id); if (!f) return;
    picks[legIdx] = f;
    if (legIdx < search.legs.length - 1) {
      legIdx++;
      if (search.legs[legIdx].date < f.date) search.legs[legIdx].date = f.date;
      AB.toast(`${search.trip === "round" ? "Outbound" : "Flight 1"} selected. Now choose your ${search.trip === "round" ? "return" : "second"} flight.`, "success");
      loadLeg(true);
      return;
    }
    startBooking();
  }

  /* ====================================================================== */
  /*  BOOKING                                                               */
  /* ====================================================================== */
  const STEPS = ["Review", "Passengers", "Seats", "Add-ons", "Payment"];
  const isIntl = () => booking.legs.some((l) => !l.flight.domestic);

  function startBooking() {
    const p = search.pax;
    const travellers = [];
    for (let i = 0; i < p.adults; i++) travellers.push({ type: "adult", label: `Adult ${i + 1}` });
    for (let i = 0; i < p.children; i++) travellers.push({ type: "child", label: `Child ${i + 1}` });
    for (let i = 0; i < p.infants; i++) travellers.push({ type: "infant", label: `Infant ${i + 1}` });
    travellers.forEach((t) => Object.assign(t, { title: "", first: "", last: "", dob: "", passport: "", expiry: "", nationality: "Nigerian" }));
    const u = store.get("user");
    booking = {
      step: 0, maxStep: 0, trip: search.trip, cabin: search.cabin, pax: { ...p },
      legs: picks.map((f, i) => ({ from: search.legs[i].from, to: search.legs[i].to, date: search.legs[i].date, flight: f })),
      travellers, contact: { email: u.email || "", phone: u.phone || "" },
      seats: {}, seatLeg: 0, seatPax: 0, seatsSkipped: false,
      addons: { bags: 0, insurance: false, priority: false }, agree: false
    };
    showView("search");
    renderBooking();
  }

  function totals() {
    const b = booking, pax = b.pax, intl = isIntl();
    const seated = pax.adults + pax.children, all = seated + pax.infants;
    let fare = 0;
    const perLeg = b.legs.map((l) => { const pf = paxFare(fareFor(l.flight, b.cabin), pax); fare += pf.total; return pf; });
    const taxes = r100(fare * 0.18);
    const seats = Object.values(b.seats).reduce((a, s) => a + (s.price || 0), 0);
    const bagPrice = intl ? 48000 : 12000;
    const bags = b.addons.bags * bagPrice * b.legs.length;
    const insPrice = intl ? 14500 : 2500;
    const insurance = b.addons.insurance ? insPrice * all : 0;
    const prioPrice = 3500;
    const priority = b.addons.priority ? prioPrice * seated * b.legs.length : 0;
    const total = fare + seats + bags + insurance + priority;
    return { fare, perLeg, taxes, base: fare - taxes, seats, bags, bagPrice, insurance, insPrice, priority, prioPrice, total, seated, all };
  }

  function renderBooking() {
    const b = booking;
    $("#bkSteps").innerHTML = STEPS.map((s, i) => `<li class="${i < b.step ? "done" : ""} ${i === b.step ? "active" : ""}">
      <button type="button" data-step="${i}" ${i < b.step ? "" : "tabindex='-1'"} aria-current="${i === b.step ? "step" : "false"}"><span class="n">${i < b.step ? '<i class="bi bi-check-lg"></i>' : i + 1}</span><span class="lbl">${s}</span></button></li>`).join("");
    $$("#bkSteps [data-step]").forEach((x) => x.addEventListener("click", () => { const i = +x.dataset.step; if (i < b.step) { b.step = i; renderBooking(); } }));
    [stepReview, stepPassengers, stepSeats, stepAddons, stepPayment][b.step]();
    renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function go(step) { booking.step = step; booking.maxStep = Math.max(booking.maxStep, step); renderBooking(); }
  const navBtns = (backLbl, nextLbl, extra = "") => `<div class="d-flex flex-column-reverse flex-sm-row gap-2 justify-content-between mt-3">
      <button type="button" class="btn btn-light-subtle" data-nav="back"><i class="bi bi-arrow-left me-1"></i>${backLbl}</button>
      <div class="d-flex flex-column flex-sm-row gap-2">${extra}<button type="button" class="btn btn-primary px-4" data-nav="next">${nextLbl} <i class="bi bi-arrow-right ms-1"></i></button></div></div>`;
  function bindNav(onNext, onBack) {
    $('#stepBody [data-nav="next"]').addEventListener("click", onNext);
    $('#stepBody [data-nav="back"]').addEventListener("click", onBack || (() => go(booking.step - 1)));
  }

  function legCard(l, i) {
    const f = l.flight, al = AL[f.airline], bags = bagsFor(f, booking.cabin);
    const lbl = booking.trip === "round" ? (i === 0 ? "Outbound" : "Return") : booking.legs.length > 1 ? `Flight ${i + 1}` : "Departure";
    return `<div class="leg-card mb-3">
      <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
        <div class="d-flex align-items-center gap-2"><span class="al-logo sm" style="background:${al.color}">${f.airline}</span><div><div class="fw-bold fs-7">${lbl} · ${dayLabel(l.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div><div class="fs-8 text-muted">${esc(al.name)} · ${CABINS[booking.cabin].label}</div></div></div>
        <span class="ab-status ${refundableFor(f, booking.cabin) ? "success" : "neutral"}">${refundableFor(f, booking.cabin) ? "Refundable" : "Non-refundable"}</span>
      </div>
      <div class="fl-times my-2">
        <div><div class="t tabular">${hm(f.dep)}</div><div class="c">${f.from} · ${esc(AP[f.from].city)}</div></div>
        <div class="fl-line"><div>${dur(f.duration)}</div><div class="bar">${f.stops ? '<span class="stop"></span>' : ""}</div><div class="${f.stops ? "stops" : "direct"}">${f.stops ? "1 stop · " + f.via.code : "Direct"}</div></div>
        <div class="text-end"><div class="t tabular">${hm(f.arr % 1440)}${nextDay(f.arr)}</div><div class="c">${f.to} · ${esc(AP[f.to].city)}</div></div>
      </div>
      <details class="fs-7"><summary class="fw-semibold text-primary" style="cursor:pointer">Itinerary details</summary>${segmentsHtml(f)}</details>
      <div class="fs-8 text-muted mt-2"><i class="bi bi-suitcase2 me-1"></i>${bags.hold} checked · ${bags.cabin} cabin</div>
    </div>`;
  }

  /* Step 1 — Review */
  function stepReview() {
    const b = booking, intl = isIntl();
    const allRef = b.legs.every((l) => refundableFor(l.flight, b.cabin));
    $("#stepBody").innerHTML = `
      <div class="card mb-3"><div class="card-header"><h6 class="card-title">Your itinerary</h6></div><div class="card-body">${b.legs.map(legCard).join("")}</div></div>
      <div class="card"><div class="card-header"><h6 class="card-title">Fare rules</h6></div><div class="card-body pt-2">
        <div class="rule"><i class="bi bi-arrow-counterclockwise ${allRef ? "text-success" : "text-danger"}"></i><div><div class="fw-semibold">${allRef ? "Refundable" : "Non-refundable"}</div><div class="fs-8 text-muted">${allRef ? "Cancel before departure and get 85% of the total paid back to your wallet." : "On cancellation only airport taxes & fees are refunded to your wallet."}</div></div></div>
        <div class="rule"><i class="bi bi-calendar2-week text-primary"></i><div><div class="fw-semibold">Date change</div><div class="fs-8 text-muted">Allowed up to 24h before departure · ${fmt.naira(intl ? 45000 : 10000)} fee + fare difference.</div></div></div>
        <div class="rule"><i class="bi bi-person-badge text-primary"></i><div><div class="fw-semibold">Name correction</div><div class="fs-8 text-muted">Names must match ${intl ? "passports" : "a valid government ID"}. Minor corrections only.</div></div></div>
        <div class="rule"><i class="bi bi-clock text-primary"></i><div><div class="fw-semibold">Check-in</div><div class="fs-8 text-muted">Online check-in opens 24h before departure. Counter closes ${intl ? "60" : "45"} min before.</div></div></div>
        ${intl ? `<div class="rule"><i class="bi bi-passport text-warning"></i><div><div class="fw-semibold">Travel documents</div><div class="fs-8 text-muted">Passport valid 6 months beyond travel and any required visas are your responsibility.</div></div></div>` : ""}
      </div></div>
      ${navBtns("Change flights", "Continue to passengers")}`;
    bindNav(() => go(1), () => { $("#backToResults").click(); });
  }

  /* Step 2 — Passengers */
  function stepPassengers() {
    const b = booking, intl = isIntl(), u = store.get("user");
    const titles = { adult: ["Mr", "Mrs", "Ms", "Dr"], child: ["Master", "Miss"], infant: ["Master", "Miss"] };
    const fld = (i, k, label, input, col = "col-sm-6") => `<div class="${col}"><label class="form-label" for="p${i}-${k}">${label}</label>${input}<div class="invalid-feedback" data-fb="p${i}-${k}"></div></div>`;
    $("#stepBody").innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div><h5 class="mb-0">Who's travelling?</h5><div class="fs-7 text-muted">Enter names exactly as on ${intl ? "the passport" : "a valid ID"}.</div></div>
        <button type="button" class="btn btn-soft btn-sm" id="fillMe"><i class="bi bi-person-check me-1"></i>I'm Adult 1 (${esc(u.firstName)})</button>
      </div>
      <form id="paxForm" novalidate>
      ${b.travellers.map((t, i) => `
        <div class="card pax-card mb-3"><div class="card-header">
          <span class="ab-icon ab-icon-sm ${t.type === "adult" ? "tone-primary" : t.type === "child" ? "tone-violet" : "tone-pink"}"><i class="bi ${t.type === "infant" ? "bi-balloon-heart" : t.type === "child" ? "bi-emoji-smile" : "bi-person"}"></i></span>
          <div><h6 class="card-title">${t.label}</h6><div class="fs-8 text-muted">${t.type === "adult" ? "12+ years" : t.type === "child" ? "2–11 years on travel date" : "Under 2 on travel date · travels on lap"}</div></div>
        </div><div class="card-body"><div class="row g-3">
          ${fld(i, "title", "Title", `<select class="form-select" id="p${i}-title" data-i="${i}" data-k="title"><option value="">Select</option>${titles[t.type].map((x) => `<option ${t.title === x ? "selected" : ""}>${x}</option>`).join("")}</select>`, "col-sm-3 col-5")}
          ${fld(i, "dob", "Date of birth", `<input type="date" class="form-control" id="p${i}-dob" data-i="${i}" data-k="dob" value="${t.dob}" max="${today()}">`, "col-sm-4 col-7")}
          <div class="col-sm-5 d-none d-sm-block"></div>
          ${fld(i, "first", "First name", `<input class="form-control" id="p${i}-first" data-i="${i}" data-k="first" value="${esc(t.first)}" autocomplete="given-name" placeholder="As on ID">`)}
          ${fld(i, "last", "Last name", `<input class="form-control" id="p${i}-last" data-i="${i}" data-k="last" value="${esc(t.last)}" autocomplete="family-name" placeholder="As on ID">`)}
          ${intl ? `
          ${fld(i, "passport", "Passport number", `<input class="form-control text-uppercase" id="p${i}-passport" data-i="${i}" data-k="passport" value="${esc(t.passport)}" maxlength="9" placeholder="e.g. A01234567">`, "col-sm-4")}
          ${fld(i, "expiry", "Passport expiry", `<input type="date" class="form-control" id="p${i}-expiry" data-i="${i}" data-k="expiry" value="${t.expiry}" min="${today()}">`, "col-sm-4 col-6")}
          ${fld(i, "nationality", "Nationality", `<select class="form-select" id="p${i}-nationality" data-i="${i}" data-k="nationality">${["Nigerian", "Ghanaian", "Kenyan", "South African", "British", "American", "Canadian", "Other"].map((x) => `<option ${t.nationality === x ? "selected" : ""}>${x}</option>`).join("")}</select>`, "col-sm-4 col-6")}` : ""}
        </div></div></div>`).join("")}
        <div class="card"><div class="card-header"><h6 class="card-title">Contact details</h6><div class="fs-8 text-muted">E-ticket and flight updates go here.</div></div>
          <div class="card-body"><div class="row g-3">
            <div class="col-sm-6"><label class="form-label" for="c-email">Email</label><div class="input-icon"><i class="bi bi-envelope"></i><input type="email" class="form-control" id="c-email" data-c="email" value="${esc(b.contact.email)}" autocomplete="email"></div><div class="invalid-feedback" data-fb="c-email"></div></div>
            <div class="col-sm-6"><label class="form-label" for="c-phone">Phone</label><div class="input-icon"><i class="bi bi-telephone"></i><input type="tel" class="form-control" id="c-phone" data-c="phone" value="${esc(b.contact.phone)}" autocomplete="tel" inputmode="tel" placeholder="080..."></div><div class="invalid-feedback" data-fb="c-phone"></div></div>
          </div></div></div>
      </form>
      ${navBtns("Back", "Continue to seats")}`;
    const form = $("#paxForm");
    const onField = (e) => {
      const t = e.target;
      if (t.dataset.k) { b.travellers[+t.dataset.i][t.dataset.k] = t.dataset.k === "passport" ? t.value.toUpperCase() : t.value; }
      if (t.dataset.c) b.contact[t.dataset.c] = t.value.trim();
      if (t.classList.contains("is-invalid")) setFb(t.id, "");
    };
    form.addEventListener("input", onField);
    form.addEventListener("change", onField);
    $("#fillMe").addEventListener("click", () => {
      const t = b.travellers[0];
      Object.assign(t, { first: u.firstName, last: u.lastName, title: t.title || "Ms" });
      $("#p0-first").value = t.first; $("#p0-last").value = t.last; $("#p0-title").value = t.title;
      ["p0-first", "p0-last", "p0-title"].forEach((id) => setFb(id, ""));
      $("#p0-dob").focus();
    });
    bindNav(() => { if (validatePax()) go(2); });
  }
  function setFb(id, msg) {
    const el = $("#" + id); if (!el) return;
    el.classList.toggle("is-invalid", !!msg);
    const fb = $(`[data-fb="${id}"]`); if (fb) { fb.textContent = msg; fb.style.display = msg ? "block" : ""; }
  }
  function ageOn(dob, on) {
    const d = parse(dob), o = parse(on);
    let a = o.getFullYear() - d.getFullYear();
    if (o.getMonth() < d.getMonth() || (o.getMonth() === d.getMonth() && o.getDate() < d.getDate())) a--;
    return a;
  }
  function validatePax() {
    const b = booking, intl = isIntl();
    const first = b.legs[0].date, last = b.legs[b.legs.length - 1].date;
    const nameRe = /^[A-Za-z][A-Za-z' -]*[A-Za-z]$/;
    let ok = true;
    const bad = (id, m) => { setFb(id, m); ok = false; };
    b.travellers.forEach((t, i) => {
      ["title", "first", "last", "dob", "passport", "expiry"].forEach((k) => setFb(`p${i}-${k}`, ""));
      if (!t.title) bad(`p${i}-title`, "Required");
      if (!t.first.trim()) bad(`p${i}-first`, "Enter first name"); else if (!nameRe.test(t.first.trim()) || t.first.trim().length < 2) bad(`p${i}-first`, "Letters only, min 2 characters");
      if (!t.last.trim()) bad(`p${i}-last`, "Enter last name"); else if (!nameRe.test(t.last.trim()) || t.last.trim().length < 2) bad(`p${i}-last`, "Letters only, min 2 characters");
      if (!t.dob) bad(`p${i}-dob`, "Enter date of birth");
      else if (t.dob > today()) bad(`p${i}-dob`, "Can't be in the future");
      else {
        const age = ageOn(t.dob, first);
        if (t.type === "adult" && age < 12) bad(`p${i}-dob`, "Adults must be 12+ on travel date");
        if (t.type === "adult" && age > 110) bad(`p${i}-dob`, "Check the year");
        if (t.type === "child" && (age < 2 || age > 11)) bad(`p${i}-dob`, "Children must be 2–11 on travel date");
        if (t.type === "infant" && ageOn(t.dob, last) >= 2) bad(`p${i}-dob`, "Infants must be under 2 for the whole trip");
      }
      if (intl) {
        if (!/^[A-Z0-9]{6,9}$/.test(t.passport)) bad(`p${i}-passport`, "6–9 letters/numbers");
        if (!t.expiry) bad(`p${i}-expiry`, "Enter expiry date");
        else { const sixM = parse(last); sixM.setMonth(sixM.getMonth() + 6); if (t.expiry < iso(sixM)) bad(`p${i}-expiry`, "Must be valid 6 months after travel"); }
      }
    });
    setFb("c-email", ""); setFb("c-phone", "");
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(b.contact.email)) bad("c-email", "Enter a valid email address");
    if (!/^(0[789][01]\d{8}|\+?234[789][01]\d{8})$/.test(b.contact.phone.replace(/\s/g, ""))) bad("c-phone", "Enter a valid Nigerian phone number");
    if (!ok) { const f = $("#stepBody .is-invalid"); if (f) { f.scrollIntoView({ behavior: "smooth", block: "center" }); f.focus({ preventScroll: true }); } AB.toast("Please complete the traveller details", "warning"); }
    return ok;
  }

  /* Step 3 — Seats */
  function seatLayout(cabin) {
    if (cabin === "Business" || cabin === "First") return { cols: ["A", "C", "D", "F"], aisleAfter: 1, rows: cabin === "First" ? [1, 2, 3] : [3, 4, 5, 6, 7, 8], xl: [], wide: true };
    const start = cabin === "Premium" ? 9 : 12;
    const end = cabin === "Premium" ? 13 : 32;
    const rows = []; for (let r = start; r <= end; r++) rows.push(r);
    return { cols: ["A", "B", "C", "D", "E", "F"], aisleAfter: 2, rows, xl: cabin === "Premium" ? [9] : [12, 20, 21], wide: false };
  }
  const seatedTravellers = () => booking.travellers.map((t, i) => ({ ...t, i })).filter((t) => t.type !== "infant");
  function stepSeats() {
    const b = booking, intl = isIntl();
    const seated = seatedTravellers();
    if (b.seatPax >= seated.length) b.seatPax = 0;
    const l = b.legs[b.seatLeg], f = l.flight;
    const lay = seatLayout(b.cabin);
    const r = seed(f.id + "|seats");
    const taken = new Set();
    lay.rows.forEach((row) => lay.cols.forEach((c) => { if (r() < 0.4) taken.add(row + c); }));
    const xlPrice = intl ? 22000 : 6000;
    const mine = (seat) => { const e = Object.entries(b.seats).find(([k, v]) => k.startsWith(b.seatLeg + "-") && v.seat === seat); return e ? +e[0].split("-")[1] : null; };
    const activeP = seated[b.seatPax];
    const initials = (t) => (t.first && t.last ? (t.first[0] + t.last[0]).toUpperCase() : t.label.replace(/\D/g, "") ? t.label[0] + t.label.replace(/\D/g, "") : "?");
    const rowsHtml = lay.rows.map((row) => `<div class="seat-row"><span class="rn">${row}</span>${lay.cols.map((c, ci) => {
      const id = row + c, owner = mine(id), isXl = lay.xl.includes(row), tk = taken.has(id) && owner == null;
      const pos = c === "A" || c === "F" ? "window" : (lay.wide || c === "C" || c === "D") ? "aisle" : "middle";
      const cls = ["seat", lay.wide ? "wide" : "", isXl ? "xl" : "", tk ? "taken" : "", owner != null ? (owner === activeP.i ? "mine" : "other") : ""].join(" ");
      const label = `Seat ${id}, ${pos}${isXl ? ", extra legroom " + fmt.naira(xlPrice) : ", included"}${tk ? ", taken" : ""}${owner != null ? ", selected for " + b.travellers[owner].label : ""}`;
      return `<button type="button" class="${cls}" data-seat="${id}" data-xl="${isXl ? 1 : 0}" ${tk ? "disabled" : ""} aria-label="${label}" title="${label}" aria-pressed="${owner != null}">${owner != null ? esc(initials(b.travellers[owner])) : c}</button>${ci === lay.aisleAfter ? '<span class="aisle"></span>' : ""}`;
    }).join("")}${lay.xl.includes(row) && !lay.wide ? '<span class="exit">EXIT</span>' : '<span class="rn"></span>'}</div>`).join("");
    const head = `<div class="seat-head"><span class="rn" style="width:26px"></span>${lay.cols.map((c, ci) => `<span style="${lay.wide ? "width:44px" : ""}">${c}</span>${ci === lay.aisleAfter ? '<span class="aisle"></span>' : ""}`).join("")}</div>`;
    $("#stepBody").innerHTML = `
      <div class="card"><div class="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center">
        <div><h6 class="card-title">Choose your seats</h6><div class="fs-8 text-muted">Optional — skip and seats are assigned free at check-in.</div></div>
        ${b.legs.length > 1 ? `<div class="ab-segment" role="tablist">${b.legs.map((x, i) => `<button type="button" data-sleg="${i}" class="${i === b.seatLeg ? "active" : ""}">${x.from} → ${x.to}</button>`).join("")}</div>` : ""}
      </div><div class="card-body">
        <div class="small-label mb-2">Selecting for</div>
        <div class="pax-pick mb-3">${seated.map((t, k) => { const s = b.seats[`${b.seatLeg}-${t.i}`]; return `<button type="button" class="ab-option ${k === b.seatPax ? "active" : ""}" data-spax="${k}"><div class="fw-bold fs-7">${esc(t.first ? t.first + " " + t.last : t.label)}</div><div class="fs-8 text-muted">${s ? `Seat ${s.seat}${s.price ? " · " + fmt.naira(s.price) : " · Free"}` : "No seat yet"}</div></button>`; }).join("")}</div>
        <div class="legend mb-3"><span><span class="seat"></span>Included</span><span><span class="seat xl"></span>Extra legroom · ${fmt.naira(xlPrice)}</span><span><span class="seat taken"></span>Taken</span><span><span class="seat mine"></span>Selected</span>${seated.length > 1 ? '<span><span class="seat other"></span>Other traveller</span>' : ""}</div>
        <div class="seat-wrap"><div class="plane" role="group" aria-label="Seat map ${l.from} to ${l.to}, ${CABINS[b.cabin].label} cabin">${head}${rowsHtml}</div></div>
        <div class="fs-8 text-muted text-center mt-2">${esc(AL[f.airline].name)} ${f.flightNo} · ${CABINS[b.cabin].label} cabin${f.stops ? " · seat applies to all segments" : ""}</div>
      </div></div>
      ${navBtns("Back", "Continue to add-ons", `<button type="button" class="btn btn-light-subtle" id="skipSeats">Skip seat selection</button>`)}`;
    $$("#stepBody [data-sleg]").forEach((x) => x.addEventListener("click", () => { b.seatLeg = +x.dataset.sleg; stepSeats(); renderSummary(); }));
    $$("#stepBody [data-spax]").forEach((x) => x.addEventListener("click", () => { b.seatPax = +x.dataset.spax; stepSeats(); }));
    $$("#stepBody [data-seat]").forEach((x) => x.addEventListener("click", () => {
      const id = x.dataset.seat, key = `${b.seatLeg}-${activeP.i}`;
      const owner = mine(id);
      if (owner === activeP.i) delete b.seats[key];
      else if (owner != null) { AB.toast(`Seat ${id} is already chosen for ${esc(b.travellers[owner].label)}`, "warning"); return; }
      else {
        b.seats[key] = { seat: id, price: x.dataset.xl === "1" ? xlPrice : 0 };
        b.seatsSkipped = false;
        // auto-advance: next traveller without a seat on this leg, else next leg
        const nextP = seated.findIndex((t) => !b.seats[`${b.seatLeg}-${t.i}`]);
        if (nextP > -1) b.seatPax = nextP;
        else if (b.seatLeg < b.legs.length - 1 && seated.some((t) => !b.seats[`${b.seatLeg + 1}-${t.i}`])) { b.seatLeg++; b.seatPax = 0; AB.toast(`Now choose seats for ${b.legs[b.seatLeg].from} → ${b.legs[b.seatLeg].to}`, "info"); }
      }
      const y = window.scrollY; stepSeats(); renderSummary(); window.scrollTo(0, y);
      const again = $(`#stepBody [data-seat="${id}"]`); again && again.focus({ preventScroll: true });
    }));
    $("#skipSeats").addEventListener("click", () => { b.seats = {}; b.seatsSkipped = true; b.seatLeg = 0; AB.toast("Seats will be assigned free at check-in", "info"); go(3); });
    bindNav(() => { b.seatLeg = 0; go(3); });
  }

  /* Step 4 — Add-ons */
  function stepAddons() {
    const b = booking, t = totals(), legsN = b.legs.length;
    $("#stepBody").innerHTML = `
      <div class="card"><div class="card-header"><h6 class="card-title">Make your trip better</h6><div class="fs-8 text-muted">All add-ons are optional.</div></div>
      <div class="card-body d-grid gap-3 addon">
        <div class="ab-option ${b.addons.bags ? "active" : ""}" style="cursor:default">
          <span class="ab-icon tone-orange"><i class="bi bi-suitcase2"></i></span>
          <div class="flex-grow-1 min-w-0"><div class="fw-bold">Extra checked bag</div><div class="fs-8 text-muted">23kg per bag · ${fmt.naira(t.bagPrice)} per bag, per flight${legsN > 1 ? ` (×${legsN} flights)` : ""}</div></div>
          <div class="stepper"><button type="button" data-bag="-1" aria-label="Remove a bag" ${b.addons.bags ? "" : "disabled"}><i class="bi bi-dash"></i></button><output aria-live="polite">${b.addons.bags}</output><button type="button" data-bag="1" aria-label="Add a bag" ${b.addons.bags >= t.seated * 2 ? "disabled" : ""}><i class="bi bi-plus"></i></button></div>
        </div>
        <button type="button" class="ab-option ${b.addons.insurance ? "active" : ""}" data-addon="insurance" aria-pressed="${b.addons.insurance}">
          <span class="ab-icon tone-success"><i class="bi bi-shield-plus"></i></span>
          <div class="flex-grow-1 min-w-0"><div class="fw-bold">Travel insurance</div><div class="fs-8 text-muted">Medical cover, trip cancellation & lost baggage · ${fmt.naira(t.insPrice)} per traveller</div></div>
          <span class="fw-bold fs-7 text-nowrap me-3">${fmt.naira(t.insPrice * t.all)}</span>
        </button>
        <button type="button" class="ab-option ${b.addons.priority ? "active" : ""}" data-addon="priority" aria-pressed="${b.addons.priority}">
          <span class="ab-icon tone-violet"><i class="bi bi-lightning-charge"></i></span>
          <div class="flex-grow-1 min-w-0"><div class="fw-bold">Priority boarding</div><div class="fs-8 text-muted">Board first & fast-track security · ${fmt.naira(t.prioPrice)} per traveller, per flight</div></div>
          <span class="fw-bold fs-7 text-nowrap me-3">${fmt.naira(t.prioPrice * t.seated * legsN)}</span>
        </button>
      </div></div>
      ${navBtns("Back", "Continue to payment")}`;
    $$("#stepBody [data-bag]").forEach((x) => x.addEventListener("click", () => { b.addons.bags = Math.max(0, b.addons.bags + +x.dataset.bag); stepAddons(); renderSummary(); $(`#stepBody [data-bag="${x.dataset.bag}"]`)?.focus(); }));
    $$("#stepBody [data-addon]").forEach((x) => x.addEventListener("click", () => { const k = x.dataset.addon; b.addons[k] = !b.addons[k]; stepAddons(); renderSummary(); $(`#stepBody [data-addon="${k}"]`).focus(); }));
    bindNav(() => go(4));
  }

  /* Step 5 — Payment */
  function stepPayment() {
    const b = booking, t = totals();
    const seatTxt = (i) => b.legs.map((_, li) => b.seats[`${li}-${i}`]?.seat || "—").join(" / ");
    $("#stepBody").innerHTML = `
      <div class="card mb-3"><div class="card-header"><h6 class="card-title">Review & pay</h6></div><div class="card-body">
        ${b.legs.map((l, i) => `<div class="d-flex align-items-center gap-3 ${i ? "mt-3 pt-3 border-top" : ""}"><span class="al-logo sm" style="background:${AL[l.flight.airline].color}">${l.flight.airline}</span>
          <div class="flex-grow-1 min-w-0"><div class="fw-bold">${l.from} ${hm(l.flight.dep)} → ${l.to} ${hm(l.flight.arr % 1440)}${nextDay(l.flight.arr)}</div><div class="fs-8 text-muted">${dayLabel(l.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${esc(AL[l.flight.airline].name)} ${l.flight.flightNo} · ${dur(l.flight.duration)}</div></div></div>`).join("")}
        <hr>
        <div class="small-label mb-2">Travellers</div>
        <ul class="ab-list">${b.travellers.map((p, i) => `<li class="ab-list-item py-2"><span class="ab-icon ab-icon-sm tone-primary"><i class="bi bi-person"></i></span><div class="flex-grow-1 min-w-0"><div class="title text-truncate">${esc(p.title + " " + p.first + " " + p.last)}</div><div class="meta">${p.label}${p.passport ? " · " + esc(p.passport) : ""}</div></div><div class="fs-8 text-muted text-end">${p.type === "infant" ? "On lap" : "Seat " + seatTxt(i)}</div></li>`).join("")}</ul>
        <div class="fs-8 text-muted mt-2"><i class="bi bi-envelope me-1"></i>${esc(b.contact.email)} · <i class="bi bi-telephone ms-1 me-1"></i>${esc(b.contact.phone)}</div>
      </div></div>
      <div class="card"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center p-3 rounded-3 border mb-3 ${AB.wallet.canAfford(t.total) ? "" : "border-danger"}">
          <div class="d-flex align-items-center gap-2"><span class="ab-icon ab-icon-sm tone-primary"><i class="bi bi-wallet2"></i></span><div><div class="fs-7 fw-semibold">Pay from wallet</div><div class="fs-8 text-muted">Balance: <span data-balance></span></div></div></div>
          ${AB.wallet.canAfford(t.total) ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<button type="button" class="btn btn-sm btn-soft" data-open-fund-x>Top up</button>'}
        </div>
        <div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="agree" ${b.agree ? "checked" : ""}><label class="form-check-label fs-7" for="agree">I accept the fare rules and confirm traveller names match their travel documents.</label><div class="invalid-feedback">You must accept the fare rules to continue.</div></div>
      </div></div>
      ${navBtns("Back", `Pay ${fmt.naira(t.total)}`)}`;
    AB.refreshShell();
    $("#agree").addEventListener("change", (e) => { b.agree = e.target.checked; e.target.classList.remove("is-invalid"); });
    const tu = $("#stepBody [data-open-fund-x]"); if (tu) tu.addEventListener("click", AB.openFundModal);
    const nb = $('#stepBody [data-nav="next"]'); nb.id = "payBtn"; nb.innerHTML = `<i class="bi bi-lock-fill me-1"></i>Pay ${fmt.naira(t.total)}`;
    bindNav(pay);
  }

  function renderSummary() {
    if (!booking) return;
    const b = booking, t = totals(), p = b.pax;
    const rows = [];
    b.legs.forEach((l, i) => {
      const pf = t.perLeg[i];
      rows.push([`${l.from} → ${l.to}`, ""]);
      if (p.adults) rows.push([`  Adult × ${p.adults}`, fmt.naira(pf.adult * p.adults)]);
      if (p.children) rows.push([`  Child × ${p.children}`, fmt.naira(pf.child * p.children)]);
      if (p.infants) rows.push([`  Infant × ${p.infants}`, fmt.naira(pf.inf * p.infants)]);
    });
    $("#bookSummary").innerHTML = `<div class="card"><div class="card-header d-flex justify-content-between align-items-center"><h6 class="card-title">Price summary</h6><span class="ab-status info">${CABINS[b.cabin].label}</span></div>
      <div class="card-body">
        <div class="ab-summary mb-3">
          ${rows.map(([k, v]) => v ? `<div class="row-item"><span class="ps-2">${esc(k.trim())}</span><span class="tabular">${v}</span></div>` : `<div class="row-item"><span class="fw-bold" style="color:var(--ab-text)">${esc(k)}</span><span></span></div>`).join("")}
          <div class="row-item"><span>Base fare</span><span class="tabular">${fmt.naira(t.base)}</span></div>
          <div class="row-item"><span>Taxes & fees (incl.)</span><span class="tabular">${fmt.naira(t.taxes)}</span></div>
          ${t.seats ? `<div class="row-item"><span>Seat selection</span><span class="tabular">${fmt.naira(t.seats)}</span></div>` : ""}
          ${t.bags ? `<div class="row-item"><span>Extra bags × ${b.addons.bags}</span><span class="tabular">${fmt.naira(t.bags)}</span></div>` : ""}
          ${t.insurance ? `<div class="row-item"><span>Travel insurance</span><span class="tabular">${fmt.naira(t.insurance)}</span></div>` : ""}
          ${t.priority ? `<div class="row-item"><span>Priority boarding</span><span class="tabular">${fmt.naira(t.priority)}</span></div>` : ""}
          <div class="row-item"><span>Service fee</span><span class="text-success">Free</span></div>
          <div class="row-item total"><span>Total</span><span class="tabular" id="sumTotal">${fmt.naira(t.total)}</span></div>
        </div>
        <div class="fs-8 text-muted"><i class="bi bi-shield-lock me-1"></i>Fares are guaranteed once payment is completed. ${b.legs.every((l) => refundableFor(l.flight, b.cabin)) ? "Refundable (85%)." : "Non-refundable (taxes only)."}</div>
      </div></div>`;
  }

  function makePnr() {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s; const existing = new Set((store.get("bookings") || []).map((x) => x.pnr));
    do { s = Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join(""); } while (existing.has(s));
    return s;
  }

  async function pay() {
    const b = booking, agree = $("#agree");
    if (!b.agree) { agree.classList.add("is-invalid"); agree.focus(); AB.toast("Please accept the fare rules", "warning"); return; }
    const t = totals();
    const first = b.legs[0], lastL = b.legs[b.legs.length - 1];
    const route = b.trip === "round" ? `${first.from} ⇄ ${first.to}` : b.legs.map((l) => l.from).concat(lastL.to).join(" → ");
    const ok = await AB.confirmPay({
      title: "Confirm flight payment", amount: t.total, cta: `Pay ${fmt.naira(t.total)}`,
      rows: [["Route", esc(route)], ["Date", dayLabel(first.date) + (b.legs.length > 1 ? " – " + dayLabel(lastL.date) : "")], ["Travellers", String(b.travellers.length)], ["Cabin", CABINS[b.cabin].label]],
      note: "Your e-ticket will be issued instantly."
    });
    if (!ok) return;
    const pnr = makePnr();
    const tx = AB.wallet.debit(t.total, { type: "flight", title: `Flight ${route}`, subtitle: `${AL[first.flight.airline].name} · PNR ${pnr}`, icon: "bi-airplane", tone: "cyan" });
    if (!tx) { AB.toast("Insufficient wallet balance", "error"); return; }
    const rec = {
      id: fmt.ref("FL"), pnr, trip: b.trip, cabin: b.cabin,
      legs: b.legs.map((l) => ({ from: l.from, to: l.to, date: l.date, flight: stripFlight(l.flight) })),
      passengers: b.travellers.map(({ type, label, title, first, last, dob, passport, nationality }) => ({ type, label, title, first: first.trim(), last: last.trim(), dob, passport, nationality })),
      seats: b.seats, seatsSkipped: b.seatsSkipped, addons: { ...b.addons }, contact: { ...b.contact },
      fare: t.fare, taxes: t.taxes, total: t.total, refundable: b.legs.every((l) => refundableFor(l.flight, b.cabin)),
      status: "Confirmed", createdAt: Date.now(), txId: tx.id
    };
    store.update("bookings", (list) => [rec, ...(list || [])]);
    AB.notify({ icon: "bi-airplane", tone: "cyan", title: `Flight booked · ${pnr}`, body: `${route} on ${dayLabel(first.date)} is confirmed.` });
    booking = null; picks = []; legIdx = 0;
    showView("trips");
    setTimeout(() => showTicket(rec, true), 350);
  }
  const stripFlight = (f) => ({ id: f.id, airline: f.airline, flightNo: f.flightNo, from: f.from, to: f.to, date: f.date, dep: f.dep, arr: f.arr, duration: f.duration, stops: f.stops, via: f.via, segments: f.segments, layover: f.layover, domestic: f.domestic });

  /* ====================================================================== */
  /*  E-TICKET                                                              */
  /* ====================================================================== */
  function barcode(str) {
    const r = seed(str); let x = 0, bars = "";
    while (x < 196) { const w = 1 + Math.floor(r() * 3); if (r() > 0.35) bars += `<rect x="${x}" y="0" width="${w}" height="56"/>`; x += w + 1 + Math.floor(r() * 2); }
    return `<svg viewBox="0 0 200 56" preserveAspectRatio="none" aria-hidden="true" fill="currentColor">${bars}</svg>`;
  }
  function boardingPass(rec, li, pi) {
    const l = rec.legs[li], f = l.flight, al = AL[f.airline], p = rec.passengers[pi];
    const seat = rec.seats[`${li}-${pi}`]?.seat || (p.type === "infant" ? "Lap" : "At check-in");
    const gate = String.fromCharCode(65 + (seed(f.id + "g")() * 6 | 0)) + (1 + (seed(f.id + "n")() * 24 | 0));
    const boarding = hm((f.dep - (f.domestic ? 30 : 45) + 1440) % 1440);
    return `<div class="bp">
      <div class="bp-main">
        <div class="bp-top" style="--al:${al.color}"><span class="al-logo">${f.airline}</span>${esc(al.name)}<span class="ms-auto fs-8 opacity-75 text-uppercase" style="letter-spacing:.08em">Boarding pass · ${CABINS[rec.cabin].label}</span></div>
        <div class="bp-route">
          <div><div class="code">${f.from}</div><div class="city">${esc(AP[f.from].city)}</div><div class="fw-bold mt-1">${hm(f.dep)}</div></div>
          <div class="mid"><i class="bi bi-airplane-fill"></i>${dur(f.duration)}<br>${f.stops ? "via " + f.via.code : "Direct"}</div>
          <div class="text-end"><div class="code">${f.to}</div><div class="city">${esc(AP[f.to].city)}</div><div class="fw-bold mt-1">${hm(f.arr % 1440)}${nextDay(f.arr)}</div></div>
        </div>
        <div class="bp-grid">
          <div style="grid-column:span 2"><div class="k">Passenger</div><div class="v">${esc((p.title + " " + p.first + " " + p.last).toUpperCase())}</div></div>
          <div><div class="k">Date</div><div class="v">${dayLabel(l.date, { day: "2-digit", month: "short", year: "numeric" })}</div></div>
          <div><div class="k">Flight</div><div class="v">${f.flightNo}</div></div>
          <div><div class="k">Boarding</div><div class="v">${boarding}</div></div>
          <div><div class="k">Gate</div><div class="v">${gate}</div></div>
          <div><div class="k">Seat</div><div class="v">${seat}</div></div>
          <div><div class="k">Class</div><div class="v">${rec.cabin}</div></div>
          <div><div class="k">Status</div><div class="v" style="color:${rec.status === "Cancelled" ? "var(--ab-danger)" : "var(--ab-accent)"}">${rec.status.toUpperCase()}</div></div>
        </div>
      </div>
      <div class="bp-perf" aria-hidden="true"></div>
      <div class="bp-stub">
        <div><div class="small-label">Booking ref (PNR)</div><div class="pnr">${rec.pnr}</div></div>
        <div>${barcode(rec.pnr + li + pi)}<div class="fs-8 text-muted mt-1 tabular">${rec.pnr}-${li + 1}${pi + 1}-${f.flightNo.replace(" ", "")}</div></div>
        <div class="fs-8 text-muted">${f.from} → ${f.to} · ${esc(p.first)}</div>
      </div>
    </div>`;
  }
  function ticketsHtml(rec) {
    return rec.legs.map((_, li) => rec.passengers.map((_, pi) => boardingPass(rec, li, pi)).join("")).join("");
  }
  function showTicket(rec, fresh) {
    const m = AB.modal(`
      <div class="modal-header align-items-start">
        <div>${fresh ? `<div class="d-flex align-items-center gap-2 mb-1"><span class="ab-status success">Payment successful</span></div>` : ""}<h5 class="modal-title">E-ticket · ${rec.pnr}</h5><div class="fs-8 text-muted">${esc(rec.legs.map((l) => l.from).concat(rec.legs[rec.legs.length - 1].to).join(" → "))} · ${plural(rec.passengers.length, "traveller")} · ${fmt.naira(rec.total)}</div></div>
        <button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body pt-2">
        ${rec.status === "Cancelled" ? `<div class="alert alert-danger py-2 fs-7"><i class="bi bi-x-circle me-1"></i>This booking was cancelled${rec.refund ? ` · ${fmt.naira(rec.refund)} refunded to wallet` : ""}.</div>` : ""}
        <div id="ticketArea">${ticketsHtml(rec)}</div>
        <div class="fs-8 text-muted"><i class="bi bi-info-circle me-1"></i>Present this pass with a valid ${rec.legs.some((l) => !l.flight.domestic) ? "passport" : "ID"} at the airport. A copy was sent to ${esc(rec.contact.email)}.</div>
      </div>
      <div class="modal-footer flex-column flex-sm-row gap-2">
        <button type="button" class="btn btn-light-subtle flex-fill m-0" data-copy-pnr><i class="bi bi-copy me-1"></i>Copy PNR</button>
        <button type="button" class="btn btn-light-subtle flex-fill m-0" data-print><i class="bi bi-printer me-1"></i>Print ticket</button>
        <button type="button" class="btn btn-primary flex-fill m-0" data-bs-dismiss="modal">Done</button>
      </div>`, { size: "modal-lg" });
    $("[data-copy-pnr]", m.el).addEventListener("click", () => AB.copy(rec.pnr, "PNR copied"));
    $("[data-print]", m.el).addEventListener("click", () => printTicket(rec));
    return m;
  }
  function printTicket(rec) {
    const root = $("#printRoot");
    root.innerHTML = `<div style="font-family:var(--ab-font);padding:8px"><h3 style="margin:0 0 4px">AutoBiz · E-ticket</h3><div style="margin-bottom:16px;color:#5b6380;font-size:13px">PNR <b>${rec.pnr}</b> · Issued ${fmt.datetime(rec.createdAt)} · Total ${fmt.naira(rec.total)}</div>${ticketsHtml(rec)}</div>`;
    document.body.classList.add("printing");
    window.print();
    setTimeout(() => { document.body.classList.remove("printing"); root.innerHTML = ""; }, 600);
  }

  /* ====================================================================== */
  /*  MY TRIPS                                                              */
  /* ====================================================================== */
  let tripTab = "upcoming";
  const isPast = (rec) => rec.status === "Cancelled" || rec.legs[rec.legs.length - 1].date < today();
  function renderTrips() {
    const list = store.get("bookings") || [];
    const up = list.filter((r) => !isPast(r)).sort((a, b) => a.legs[0].date.localeCompare(b.legs[0].date) || a.legs[0].flight.dep - b.legs[0].flight.dep);
    const past = list.filter(isPast).sort((a, b) => b.createdAt - a.createdAt);
    const tc = $("#tripCount"); tc.textContent = up.length; tc.hidden = !up.length;
    if (!$("#tripTabs").dataset.bound) {
      $("#tripTabs").dataset.bound = 1;
      $$("#tripTabs [data-tt]").forEach((b) => b.addEventListener("click", () => { tripTab = b.dataset.tt; $$("#tripTabs [data-tt]").forEach((x) => x.classList.toggle("active", x === b)); renderTrips(); }));
      $("#tripList").addEventListener("click", (e) => {
        const v = e.target.closest("[data-view-ticket]"), c = e.target.closest("[data-cancel]");
        const all = store.get("bookings") || [];
        if (v) showTicket(all.find((r) => r.id === v.dataset.viewTicket));
        if (c) cancelBooking(all.find((r) => r.id === c.dataset.cancel));
        const cp = e.target.closest("[data-copy]"); if (cp) AB.copy(cp.dataset.copy, "PNR copied");
      });
    }
    $$("#tripTabs [data-tt]").forEach((b) => (b.innerHTML = (b.dataset.tt === "upcoming" ? "Upcoming" : "Past &amp; cancelled") + ` <span class="text-muted fs-8">(${b.dataset.tt === "upcoming" ? up.length : past.length})</span>`));
    const rows = tripTab === "upcoming" ? up : past;
    if (!rows.length) {
      $("#tripList").innerHTML = `<div class="card"><div class="ab-empty">
        <span class="ab-icon ab-icon-xl tone-cyan"><i class="bi ${tripTab === "upcoming" ? "bi-airplane" : "bi-clock-history"}"></i></span>
        <h6>${tripTab === "upcoming" ? "No upcoming trips" : "No past trips yet"}</h6>
        <p class="fs-7 mb-3">${tripTab === "upcoming" ? "Book a flight and your e-tickets will show up here." : "Completed and cancelled bookings will appear here."}</p>
        <button type="button" class="btn btn-primary btn-sm" data-goto="search"><i class="bi bi-search me-1"></i>Search flights</button></div></div>`;
      return;
    }
    $("#tripList").innerHTML = rows.map(tripCard).join("");
  }
  function tripCard(rec) {
    const L0 = rec.legs[0], f = L0.flight, al = AL[f.airline], last = rec.legs[rec.legs.length - 1];
    const cancelled = rec.status === "Cancelled", past = isPast(rec);
    const days = Math.round((parse(L0.date) - parse(today())) / 864e5);
    const route = rec.trip === "round" ? `${esc(AP[L0.from].city)} <i class="bi bi-arrow-left-right fs-7 text-muted"></i> ${esc(AP[L0.to].city)}` : rec.legs.map((l) => esc(AP[l.from].city)).concat(esc(AP[last.to].city)).join(' <i class="bi bi-arrow-right fs-7 text-muted"></i> ');
    return `<article class="card trip-card ${cancelled ? "cancelled" : ""}"><div class="card-body">
      <div class="d-flex flex-wrap gap-3 align-items-start">
        <span class="al-logo" style="background:${al.color}">${f.airline}</span>
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex flex-wrap align-items-center gap-2 mb-1"><span class="route">${route}</span>
            <span class="ab-status ${cancelled ? "failed" : past ? "neutral" : "success"}">${cancelled ? "Cancelled" : past ? "Completed" : rec.status}</span>
            ${!past && days >= 0 && days <= 30 ? `<span class="badge tone-cyan">${days === 0 ? "Today" : days === 1 ? "Tomorrow" : "In " + days + " days"}</span>` : ""}
          </div>
          <div class="fs-7 text-muted">${rec.legs.map((l) => `${dayLabel(l.date)} · ${hm(l.flight.dep)}`).join("  —  ")} · ${esc(al.name)} ${f.flightNo}</div>
          <div class="fs-8 text-muted mt-1">${plural(rec.passengers.length, "traveller")} · ${CABINS[rec.cabin].label} · ${rec.refundable ? "Refundable" : "Non-refundable"}${cancelled && rec.refund ? ` · Refunded ${fmt.naira(rec.refund)}` : ""}</div>
        </div>
        <div class="text-sm-end">
          <div class="fw-800 fs-5 tabular">${fmt.naira(rec.total)}</div>
          <button type="button" class="btn btn-link btn-sm p-0 fs-8 fw-semibold" data-copy="${rec.pnr}" aria-label="Copy PNR ${rec.pnr}">PNR <span class="font-monospace">${rec.pnr}</span> <i class="bi bi-copy"></i></button>
        </div>
      </div>
      <div class="d-flex flex-wrap gap-2 mt-3 pt-3 border-top">
        <button type="button" class="btn btn-soft btn-sm" data-view-ticket="${rec.id}"><i class="bi bi-ticket-perforated me-1"></i>View ticket</button>
        ${!past ? `<button type="button" class="btn btn-light-subtle btn-sm text-danger" data-cancel="${rec.id}"><i class="bi bi-x-circle me-1"></i>Cancel booking</button>` : ""}
      </div>
    </div></article>`;
  }
  function cancelBooking(rec) {
    if (!rec || rec.status === "Cancelled") return;
    const refund = rec.refundable ? Math.round(rec.total * 0.85) : rec.taxes;
    const m = AB.modal(`
      <div class="modal-header"><h5 class="modal-title">Cancel booking ${rec.pnr}?</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body pt-1">
        <div class="d-flex gap-3 p-3 rounded-3 mb-3 ${rec.refundable ? "tone-success" : "tone-warning"}"><i class="bi ${rec.refundable ? "bi-arrow-counterclockwise" : "bi-exclamation-triangle"} fs-4"></i>
          <div class="fs-7"><div class="fw-bold">${rec.refundable ? "Refundable fare" : "Non-refundable fare"}</div>${rec.refundable ? "You'll get 85% of the total paid back to your wallet. A 15% cancellation fee applies." : "Only airport taxes & fees are refunded. The base fare and add-ons are forfeited."}</div></div>
        <div class="ab-summary">
          <div class="row-item"><span>Amount paid</span><span class="tabular">${fmt.naira(rec.total)}</span></div>
          <div class="row-item"><span>${rec.refundable ? "Cancellation fee (15%)" : "Non-refundable portion"}</span><span class="tabular text-danger">−${fmt.naira(rec.total - refund)}</span></div>
          <div class="row-item total"><span>Refund to wallet</span><span class="tabular text-success">${fmt.naira(refund)}</span></div>
        </div>
        <div class="fs-8 text-muted mt-2">This can't be undone. All boarding passes on this booking will be voided.</div>
      </div>
      <div class="modal-footer flex-column-reverse flex-sm-row gap-2">
        <button type="button" class="btn btn-light-subtle flex-fill m-0" data-bs-dismiss="modal">Keep booking</button>
        <button type="button" class="btn btn-danger flex-fill m-0" data-confirm-cancel>Cancel & refund ${fmt.naira(refund)}</button>
      </div>`);
    $("[data-confirm-cancel]", m.el).addEventListener("click", (e) => {
      AB.loading(e.currentTarget, 1000).then(() => {
        store.update("bookings", (list) => list.map((r) => (r.id === rec.id ? { ...r, status: "Cancelled", refund, cancelledAt: Date.now() } : r)));
        if (refund > 0) AB.wallet.credit(refund, { type: "refund", title: `Flight refund · ${rec.pnr}`, subtitle: `${rec.legs[0].from} → ${rec.legs[0].to} cancelled`, icon: "bi-arrow-counterclockwise", tone: "cyan" });
        AB.notify({ icon: "bi-airplane", tone: "danger", title: `Booking ${rec.pnr} cancelled`, body: `${fmt.naira(refund)} has been refunded to your wallet.` });
        m.close();
        setTimeout(() => AB.success({ title: "Booking cancelled", message: `${fmt.naira(refund, 2)} has been refunded to your wallet.`, rows: [["PNR", rec.pnr], ["Refund", fmt.naira(refund, 2)], ["New balance", fmt.naira(AB.wallet.balance(), 2)]] }), 350);
      });
    });
  }
})();
