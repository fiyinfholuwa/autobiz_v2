/* ==========================================================================
   AutoBiz v2 — Shared auth helpers (login / register / forgot password)
   window.ABAuth
   ========================================================================== */
(function () {
  "use strict";

  const BRAND = {
    login: {
      title: "Welcome back to the <span style='color:#a9f5dc'>new</span> AutoBiz.",
      text: "Your wallet, cards, eSIMs, orders and bookings are right where you left them.",
      feats: [
        ["bi-shop", "Marketplace", "Shop verified sellers with buyer protection"],
        ["bi-sim", "Travel eSIM", "Data in 120+ countries, installed by QR"],
        ["bi-credit-card-2-front", "USD virtual cards", "Pay Netflix, AWS, Amazon & more"],
        ["bi-gift", "Gift card exchange", "Top rates, paid in minutes"]
      ]
    },
    register: {
      title: "Join 1.2M+ people who shop, travel &amp; pay smarter.",
      text: "Create your free account in under 3 minutes. No paperwork, no branch visits.",
      feats: [
        ["bi-lightning-charge", "Instant airtime, data & bills", "Up to 4% cashback"],
        ["bi-airplane", "Flights in Naira", "200+ airlines, instant e-tickets"],
        ["bi-shield-lock", "Bank-grade security", "PIN-protected, 256-bit encrypted"],
        ["bi-people", "Earn as a reseller", "Discounted VTU & eSIM rates"]
      ]
    },
    forgot: {
      title: "Locked out? We'll get you back in.",
      text: "Reset your password securely with a one-time code sent to your email.",
      feats: [
        ["bi-envelope-check", "Verify your email", "We'll send a 6-digit code"],
        ["bi-key", "Choose a new password", "Make it strong and unique"],
        ["bi-shield-check", "Your money stays safe", "Withdrawals need your PIN too"]
      ]
    }
  };

  function renderBrand() {
    const el = document.querySelector("[data-auth-brand]");
    if (!el) return;
    const b = BRAND[el.dataset.authBrand] || BRAND.login;
    el.innerHTML = `
      <a href="./index.html" class="brand"><img src="./assets/img/logo.svg" alt="">AutoBiz <span class="ver">v2</span></a>
      <div class="my-auto py-5">
        <h2 class="mb-3">${b.title}</h2>
        <p class="lead-t mb-0">${b.text}</p>
        <ul class="auth-feats">${b.feats.map(([i, t, s]) => `<li><span class="ic"><i class="bi ${i}"></i></span><span>${t}<small>${s}</small></span></li>`).join("")}</ul>
      </div>
      <div class="auth-quote">
        <div class="mb-2" style="color:#ffd43b">★★★★★</div>
        <p class="mb-3" style="color:rgba(255,255,255,.9)">“Sold a $200 Apple card and the money hit my wallet before I finished my tea.”</p>
        <div class="d-flex align-items-center gap-2"><span class="av">TB</span><div><div class="fw-bold fs-7">Tolu Bankole</div><div class="fs-8" style="color:rgba(255,255,255,.65)">Freelance designer, Lagos</div></div></div>
      </div>`;
  }

  function initTheme() {
    const sync = () => {
      const dark = AB.store.get("settings").theme === "dark";
      document.querySelectorAll("[data-auth-theme] i").forEach((i) => (i.className = "bi " + (dark ? "bi-sun" : "bi-moon-stars")));
    };
    document.querySelectorAll("[data-auth-theme]").forEach((b) => b.addEventListener("click", () => { AB.toggleTheme(); sync(); }));
    sync();
  }

  function initPassToggles(root = document) {
    root.querySelectorAll(".toggle-pass").forEach((btn) => {
      if (btn.dataset.bound) return; btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const inp = btn.parentElement.querySelector("input");
        const show = inp.type === "password";
        inp.type = show ? "text" : "password";
        btn.innerHTML = `<i class="bi ${show ? "bi-eye-slash" : "bi-eye"}"></i>`;
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        btn.setAttribute("aria-pressed", show);
      });
    });
  }

  /* Validation */
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const normPhone = (v) => v.replace(/[\s()-]/g, "");
  const isPhone = (v) => /^(\+?234|0)[789][01]\d{8}$/.test(normPhone(v));
  function setInvalid(input, msg) {
    input.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    let fb = input.closest(".field")?.querySelector(".invalid-feedback");
    if (fb) { fb.textContent = msg; fb.style.display = "block"; }
    return false;
  }
  function clearInvalid(input) {
    input.classList.remove("is-invalid");
    input.removeAttribute("aria-invalid");
    const fb = input.closest(".field")?.querySelector(".invalid-feedback");
    if (fb) fb.style.display = "";
  }
  function autoClear(form) {
    form.querySelectorAll("input, select").forEach((i) => i.addEventListener("input", () => clearInvalid(i)));
  }

  /* Password strength: returns { score 0-4, label, color, rules } */
  function strength(pw) {
    const rules = { len: pw.length >= 8, upper: /[A-Z]/.test(pw), num: /\d/.test(pw), sym: /[^A-Za-z0-9]/.test(pw) };
    let score = Object.values(rules).filter(Boolean).length;
    if (pw.length >= 12 && score >= 3) score = 4;
    if (!pw) score = 0;
    const meta = [["Too weak", "var(--ab-danger)"], ["Weak", "var(--ab-danger)"], ["Fair", "var(--ab-warning)"], ["Good", "#4dabf7"], ["Strong", "var(--ab-accent)"]][score];
    return { score, label: meta[0], color: meta[1], rules };
  }
  function bindStrength(input, meterWrap) {
    const update = () => {
      const s = strength(input.value);
      meterWrap.querySelectorAll(".strength span").forEach((b, i) => (b.style.background = i < s.score ? s.color : ""));
      const lbl = meterWrap.querySelector("[data-strength-label]");
      if (lbl) { lbl.textContent = input.value ? s.label : ""; lbl.style.color = s.color; }
      meterWrap.querySelectorAll("[data-rule]").forEach((li) => {
        const ok = s.rules[li.dataset.rule];
        li.classList.toggle("ok", ok);
        li.querySelector("i").className = "bi " + (ok ? "bi-check-circle-fill" : "bi-circle");
      });
    };
    input.addEventListener("input", update); update();
    return () => strength(input.value);
  }

  /* OTP / PIN boxes. container gets n inputs. */
  function codeInput(container, n, { onComplete, secret = false, label = "Digit" } = {}) {
    container.innerHTML = Array.from({ length: n }, (_, i) => `<input type="text" inputmode="numeric" maxlength="1" autocomplete="${i === 0 && !secret ? "one-time-code" : "off"}" aria-label="${label} ${i + 1} of ${n}">`).join("");
    const inputs = [...container.querySelectorAll("input")];
    const value = () => inputs.map((x) => x.value).join("");
    const check = () => { container.classList.remove("is-invalid"); if (value().length === n && onComplete) onComplete(value()); };
    inputs.forEach((inp, i) => {
      inp.addEventListener("input", () => {
        const digits = inp.value.replace(/\D/g, "");
        if (digits.length > 1) { // autofill / fast typing
          digits.slice(0, n - i).split("").forEach((d, j) => { inputs[i + j].value = d; inputs[i + j].classList.add("filled"); });
          (inputs[Math.min(i + digits.length, n - 1)]).focus();
        } else {
          inp.value = digits;
          inp.classList.toggle("filled", !!digits);
          if (digits && inputs[i + 1]) inputs[i + 1].focus();
        }
        check();
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !inp.value && inputs[i - 1]) { inputs[i - 1].value = ""; inputs[i - 1].classList.remove("filled"); inputs[i - 1].focus(); e.preventDefault(); }
        if (e.key === "ArrowLeft" && inputs[i - 1]) inputs[i - 1].focus();
        if (e.key === "ArrowRight" && inputs[i + 1]) inputs[i + 1].focus();
      });
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("paste", (e) => {
        const t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, n);
        if (!t) return;
        e.preventDefault();
        t.split("").forEach((d, j) => { inputs[j].value = d; inputs[j].classList.add("filled"); });
        inputs[Math.min(t.length, n - 1)].focus();
        check();
      });
    });
    if (secret) inputs.forEach((i) => (i.style.webkitTextSecurity = "disc"));
    return {
      value, inputs,
      focus: () => inputs[0].focus(),
      clear() { inputs.forEach((x) => { x.value = ""; x.classList.remove("filled"); }); inputs[0].focus(); },
      error() { container.classList.add("is-invalid", "shake"); setTimeout(() => container.classList.remove("shake"), 420); }
    };
  }

  /* Resend countdown: button text "Resend code" / "Resend in 0:59" */
  function countdown(btn, secs, onResend) {
    let timer;
    const start = () => {
      let left = secs;
      btn.disabled = true;
      const tick = () => {
        btn.innerHTML = `Resend in <span class="tabular">${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span>`;
        if (left-- <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = "Resend code"; }
      };
      tick(); clearInterval(timer); timer = setInterval(tick, 1000);
    };
    btn.addEventListener("click", () => { if (btn.disabled) return; onResend && onResend(); start(); });
    start();
    return { restart: start, stop: () => clearInterval(timer) };
  }

  function maskEmail(e) {
    const [u, d] = e.split("@"); if (!d) return e;
    return u.slice(0, 2) + "•".repeat(Math.max(1, Math.min(u.length - 2, 5))) + "@" + d;
  }

  function busy(btn, label = "Please wait…") {
    const html = btn.innerHTML; btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${label}`;
    return () => { btn.disabled = false; btn.innerHTML = html; };
  }

  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wrap = document.createElement("div"); wrap.className = "confetti";
    const colors = ["#2348ff", "#7048e8", "#e64980", "#12b886", "#f59f00", "#1098ad"];
    wrap.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${1.8 + Math.random() * 1.8}s;animation-delay:${Math.random() * .5}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join("");
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4200);
  }

  // Where to go after signing in: ?next= (validated to stay inside the app) or the dashboard
  function nextUrl() { const n = AB.safeNext(AB.qs("next")); return "./" + (n || "app/dashboard.html"); }
  // Carry ?next= across login <-> register <-> forgot-password links
  function carryNext() {
    const n = AB.safeNext(AB.qs("next")); if (!n) return;
    document.querySelectorAll("a[href]").forEach((a) => {
      const h = a.getAttribute("href");
      if (/(^|\/)(login|register|forgot-password)\.html(\?|$)/.test(h)) a.href = h + (h.includes("?") ? "&" : "?") + "next=" + encodeURIComponent(n);
    });
  }

  function socialSignIn(btn, provider) {
    const done = busy(btn, `Connecting to ${provider}…`);
    setTimeout(() => {
      done();
      sessionStorage.setItem("ab_session", "1");
      AB.toast(`Signed in with ${provider}`, "success");
      setTimeout(() => (location.href = nextUrl()), 600);
    }, 1300);
  }

  window.ABAuth = { renderBrand, initTheme, initPassToggles, isEmail, isPhone, normPhone, setInvalid, clearInvalid, autoClear, strength, bindStrength, codeInput, countdown, maskEmail, busy, confetti, socialSignIn, nextUrl };

  document.addEventListener("DOMContentLoaded", () => {
    renderBrand(); initTheme(); initPassToggles(); carryNext();
    document.querySelectorAll("[data-social]").forEach((b) => b.addEventListener("click", () => socialSignIn(b, b.dataset.social)));
  });
})();
