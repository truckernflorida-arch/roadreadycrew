/* Road Ready Crew: small vanilla JS. Nav, reveal-on-scroll, forms, pay calculator, referral links. */
(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  var CONTACT_EMAIL = "hello@roadreadycrew.com";
  var FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;
  var CONTACT_PHONE = ""; // TODO: put the Google Voice number here, e.g. "(321) 555-0123"

  /* ---------- Mobile nav ---------- */
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  if (btn && nav) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Referral code from URL (?ref=) ---------- */
  var params = new URLSearchParams(location.search);
  var job = (params.get("job") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
  if (job) document.querySelectorAll('input[name="job"]').forEach(function (i) { i.value = job; });
  var ref = (params.get("ref") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  if (ref) {
    document.querySelectorAll('input[name="referral_code"]').forEach(function (i) { i.value = ref; });
    var rb = document.querySelector(".ref-banner");
    if (rb) { rb.querySelector("b").textContent = ref; rb.classList.add("show"); }
    try { sessionStorage.setItem("rrc_ref", ref); } catch (e) {}
  } else {
    try {
      var saved = sessionStorage.getItem("rrc_ref");
      if (saved) document.querySelectorAll('input[name="referral_code"]').forEach(function (i) { if (!i.value) i.value = saved; });
    } catch (e) {}
  }

  /* ---------- Helpers ---------- */
  function formToObject(form) {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      if (k in data) { data[k] = [].concat(data[k], v); } else { data[k] = v; }
    });
    return data;
  }
  function summary(data, labels) {
    return Object.keys(data).filter(function (k) { return k !== "_honey" && k !== "form" && k.charAt(0) !== "_" && data[k] !== ""; }).map(function (k) {
      var v = Array.isArray(data[k]) ? data[k].join(", ") : data[k];
      return (labels[k] || k) + ": " + v;
    }).join("\n");
  }
  function labelMap(form) {
    var map = { referral_code: "Referral code", job: "Job applied for", submitted_at: "Submitted", page: "Page" };
    form.querySelectorAll("[name]").forEach(function (el) {
      if (map[el.name] || el.type === "hidden") return;
      var fs = el.closest("fieldset");
      var lab = el.id && form.querySelector('label[for="' + el.id + '"]');
      var group = el.closest("[data-label]");
      map[el.name] = (group && group.getAttribute("data-label")) || (lab && lab.textContent.replace(/\*/g, "").trim()) || el.name;
      if (el.type === "checkbox" && !group && fs && !lab) map[el.name] = el.name;
    });
    return map;
  }
  function post(url, body) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 9000);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { if (!j || String(j.success) !== "true") throw new Error((j && j.message) || "Form service error"); return j; },
            function (e) { clearTimeout(t); throw e; });
  }

  /* ---------- Forms: POST JSON to FormSubmit.co AJAX, friendly fallback if the endpoint isn't live yet ---------- */
  document.querySelectorAll("form[data-rrc-form]").forEach(function (form) {
    var notice = document.getElementById(form.getAttribute("data-notice"));
    var submit = form.querySelector('[type="submit"]');
    var submitText = submit ? submit.innerHTML : "";

    // At least one box required in checkbox groups marked data-require-one
    function checkGroups() {
      var ok = true;
      form.querySelectorAll("[data-require-one]").forEach(function (g) {
        var boxes = g.querySelectorAll('input[type="checkbox"]');
        var any = Array.prototype.some.call(boxes, function (b) { return b.checked; });
        boxes[0].setCustomValidity(any ? "" : "Pick at least one.");
        if (!any) ok = false;
      });
      return ok;
    }
    form.addEventListener("change", checkGroups);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      checkGroups();
      form.classList.add("was-validated");
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = formToObject(form);
      if (data._honey) return; // honeypot: bots fill hidden field
      data.submitted_at = new Date().toISOString();
      data.page = location.pathname;
      if (submit) { submit.disabled = true; submit.textContent = "Sending…"; }

      var name = (data.full_name || data.contact_name || data.your_name || "").split(" ")[0];
      var after = function (ok) {
        if (submit) { submit.disabled = false; submit.innerHTML = submitText; }
        if (form.hasAttribute("data-referral")) buildReferral(form, data);
        if (!notice) return;
        var title = notice.querySelector("h3"), body = notice.querySelector("p"), extra = notice.querySelector(".fallback");
        notice.className = "notice show " + (ok ? "ok" : "warn");
        title.textContent = "Thanks" + (name ? ", " + name : "") + "! " + (ok ? "We got it." : "One more step.");
        body.textContent = ok ? notice.getAttribute("data-ok") : notice.getAttribute("data-fallback");
        if (extra) {
          extra.hidden = ok;
          var mail = extra.querySelector("a[data-mailto]");
          if (mail) {
            var subj = notice.getAttribute("data-subject") || "Website form";
            mail.href = "mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(summary(data, labelMap(form)));
          }
          var ph = extra.querySelector("[data-phone]");
          if (ph) ph.textContent = CONTACT_PHONE || "our phone line (number coming soon)";
        }
        if (!form.hasAttribute("data-referral")) form.hidden = true;
        notice.setAttribute("tabindex", "-1");
        notice.focus({ preventScroll: true });
        notice.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      };
      var payload = {};
      Object.keys(data).forEach(function (k) { payload[k] = Array.isArray(data[k]) ? data[k].join(", ") : data[k]; });
      payload._subject = data.form === "carrier"
        ? "New carrier lead: " + (data.company_name || "")
        : "New driver lead: " + (data.full_name || "") + " " + (data.phone || "");
      payload._template = "table";
      payload._captcha = "false";
      payload._honey = "";
      if (data.email) payload._replyto = data.email;
      post(FORM_ENDPOINT, payload).then(function () { after(true); }, function () { after(false); });
    });
  });

  /* ---------- Referral link builder ---------- */
  function buildReferral(form, data) {
    var first = (data.your_name || "driver").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "driver";
    var digits = (data.your_phone || "").replace(/\D/g, "");
    var code = first + (digits.slice(-4) || Math.floor(1000 + Math.random() * 9000));
    var base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    var link = base + "drivers.html?ref=" + code;
    var out = document.getElementById("ref-output");
    if (!out) return;
    out.hidden = false;
    var input = out.querySelector("input");
    input.value = link;
    var share = out.querySelector("[data-share]");
    if (share) {
      share.hidden = !navigator.share;
      share.onclick = function () { navigator.share({ title: "Road Ready Crew", text: "Looking for a CDL-A job? Road Ready Crew is trucker-run and drivers never pay. Apply here:", url: link }).catch(function () {}); };
    }
    var copy = out.querySelector("[data-copy]");
    if (copy) copy.onclick = function () {
      input.select();
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { copy.textContent = "Copied!"; }, function () { document.execCommand && document.execCommand("copy"); copy.textContent = "Copied!"; });
      setTimeout(function () { copy.textContent = "Copy link"; }, 2200);
    };
    var sms = out.querySelector("[data-sms]");
    if (sms) sms.href = "sms:?&body=" + encodeURIComponent("Looking for a CDL-A job? Road Ready Crew is trucker-run and drivers never pay a dime. Apply here: " + link);
  }

  /* ---------- Pay-per-mile calculator ---------- */
  var calc = document.getElementById("pay-calc");
  if (calc) {
    var cpm = calc.querySelector("#cpm"), miles = calc.querySelector("#miles"), weeks = calc.querySelector("#weeks");
    var outW = calc.querySelector("#out-week"), outY = calc.querySelector("#out-year"), outH = calc.querySelector("#out-note");
    var money = function (n) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); };
    var run = function () {
      var c = parseFloat(cpm.value), m = parseFloat(miles.value), w = parseFloat(weeks.value);
      if (!(c > 0) || !(m > 0) || !(w > 0)) { outW.textContent = "—"; outY.textContent = "—"; outH.textContent = "Enter your cents per mile, miles per week and weeks worked."; return; }
      var dollarsPerMile = c >= 10 ? c / 100 : c; // accept 62 (cents) or 0.62 (dollars)
      var wk = dollarsPerMile * m, yr = wk * w;
      outW.textContent = money(wk);
      outY.textContent = money(yr);
      outH.textContent = "At " + (dollarsPerMile * 100).toFixed(1).replace(/\.0$/, "") + "¢/mile × " + m.toLocaleString() + " miles × " + w + " weeks. Gross, before taxes and deductions.";
    };
    calc.addEventListener("input", run);
    calc.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    run();
  }

  /* ---------- Share buttons ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".share-btn"), function (b) {
    var status = b.parentNode.querySelector(".share-status");
    var say = function (t) { if (status) { status.textContent = t; setTimeout(function () { status.textContent = ""; }, 2500); } };
    b.addEventListener("click", function () {
      var url = b.getAttribute("data-share-url") || location.href, title = b.getAttribute("data-share-title") || document.title;
      if (navigator.share) { navigator.share({ title: title, text: "CDL-A job via Road Ready Crew", url: url }).catch(function () {}); return; }
      var fallback = function () {
        var t = document.createElement("textarea"); t.value = url; t.setAttribute("readonly", ""); t.style.position = "absolute"; t.style.left = "-9999px";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); say("Link copied!"); } catch (e) { say(url); }
        document.body.removeChild(t);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { say("Link copied!"); }, fallback);
      else fallback();
    });
  });
})();
