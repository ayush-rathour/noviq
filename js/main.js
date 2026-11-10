const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
const Q = new URLSearchParams(location.search),
  $ = (s) => document.querySelector(s);
const enquiry = (topic = "Order enquiry", message = "") =>
  "contact.html?" + new URLSearchParams({ topic, message }).toString();
const NAV = [
  ["explore", "Explore"],
  ["bundles", "Bundles"],
  ["free-resources", "Free"],
  ["blog", "Blog"],
  ["about", "About"],
  ["contact", "Contact"],
];
const CATS = ["build", "learn", "organize", "practice"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const pg = location.pathname.split("/").pop().replace(".html", "") || "index";
const on = (h) =>
  h == pg ||
  (h == "explore" && pg == "product") ||
  (h == "blog" && pg == "blog-note");
const ask = enquiry("Question", "I have a question about your resources.");

// ---- Shared visuals: icons and category cover art --------------------------
const ICON_PATHS = {
  build: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  learn:
    '<circle cx="6" cy="6.5" r="2.2"/><circle cx="18" cy="9" r="2.2"/><circle cx="11" cy="18" r="2.2"/><path d="m8 7 8 1.6M7 8.5l3 7.5M16.8 11l-4.6 5.3"/>',
  organize:
    '<rect x="3.5" y="4" width="4.8" height="16" rx="1.4"/><rect x="9.7" y="4" width="4.8" height="10" rx="1.4"/><rect x="15.9" y="4" width="4.6" height="13" rx="1.4"/>',
  practice:
    '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".9" fill="currentColor"/>',
  bundle:
    '<path d="m12 4 8.5 4.2L12 12.4 3.5 8.2 12 4Z"/><path d="m3.5 12.2 8.5 4.2 8.5-4.2M3.5 16.2 12 20.4l8.5-4.2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.4"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  shield:
    '<path d="M12 3.5 19 6v5.6c0 4.3-2.9 7.3-7 8.9-4.1-1.6-7-4.6-7-8.9V6l7-2.5Z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.6"/><path d="m4 7.5 8 6 8-6"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7.2"/>',
  download:
    '<path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14"/>',
};
const icon = (name, size = 20) =>
  `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.learn}</svg>`;

const ART = {
  build:
    '<rect x="6" y="8" width="92" height="66" rx="9" class="a-soft"/><rect x="6" y="8" width="92" height="66" rx="9" class="a-line"/><path d="M6 24h92" class="a-line"/><circle cx="16" cy="16" r="2.4" class="a-ink"/><circle cx="25" cy="16" r="2.4" class="a-ink"/><path d="m38 42-10 9 10 9M66 42l10 9-10 9M57 38l-6 26" class="a-line"/><rect x="84" y="46" width="58" height="46" rx="9" class="a-1"/><path d="M96 63h34M96 76h20" class="a-w"/>',
  learn:
    '<path d="m30 70 32-34 42 16 20-32M62 36l16 46M104 52 78 82" class="a-line"/><circle cx="30" cy="70" r="9" class="a-ink"/><circle cx="62" cy="36" r="13" class="a-1"/><circle cx="104" cy="52" r="9" class="a-ink"/><circle cx="124" cy="20" r="7" class="a-2"/><circle cx="78" cy="82" r="8" class="a-ink"/>',
  organize:
    '<rect x="6" y="6" width="42" height="88" rx="9" class="a-soft"/><rect x="54" y="6" width="42" height="88" rx="9" class="a-soft"/><rect x="102" y="6" width="42" height="88" rx="9" class="a-soft"/><rect x="12" y="14" width="30" height="16" rx="5" class="a-1"/><rect x="12" y="36" width="30" height="16" rx="5" class="a-line"/><rect x="60" y="14" width="30" height="22" rx="5" class="a-2"/><rect x="60" y="42" width="30" height="12" rx="5" class="a-line"/><rect x="108" y="14" width="30" height="12" rx="5" class="a-ink"/>',
  practice:
    '<circle cx="104" cy="52" r="42" class="a-line"/><circle cx="104" cy="52" r="27" class="a-line"/><circle cx="104" cy="52" r="12" class="a-1"/><path d="m14 12 82 38M14 12l10 2M14 12l4 9" class="a-w"/>',
  bundle:
    '<rect x="62" y="30" width="60" height="60" rx="11" class="a-soft" transform="rotate(8 92 60)"/><rect x="48" y="22" width="60" height="60" rx="11" class="a-line" transform="rotate(-4 78 52)"/><rect x="34" y="12" width="60" height="60" rx="11" class="a-1"/><path d="M48 32h32M48 44h22M48 56h28" class="a-w"/>',
};
const artFor = (c) =>
  `<svg class="cv-art" viewBox="0 0 150 100" preserveAspectRatio="xMaxYMid meet" aria-hidden="true">${ART[c] || ART.learn}</svg>`;

const fillIcons = () =>
  document.querySelectorAll("[data-ico]:not([data-done])").forEach((e) => {
    e.innerHTML = icon(e.dataset.ico, +e.dataset.size || 26);
    e.dataset.done = 1;
  });

$("#hdr").innerHTML =
  `<div class="hb"><a class="logo" href="index.html" aria-label="NOVIQ home"><span>NOV<b>IQ</b></span></a><nav id="nv" aria-label="Main">${NAV.map(([h, t]) => `<a class="${on(h) ? "on" : ""}" href="${h}.html"${on(h) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav><div class="ha"><a class="ib" href="explore.html?q=" aria-label="Search resources"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a><button class="ib" id="cb" aria-label="Open enquiry list"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><em id="cc" class="z">0</em></button><button id="mb" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button></div></div>`;

document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="ov"></div><aside id="dr" aria-label="Menu"><div class="dh"><a class="logo" href="index.html"><span>NOV<b>IQ</b></span></a><button class="ib dx" aria-label="Close menu">✕</button></div><div class="dl">${[["index", "Home"], ...NAV].map(([h, t]) => `<a class="${on(h) ? "on" : ""}" href="${h}.html">${t}</a>`).join("")}</div><div class="dc">${CATS.map((c) => `<a href="explore.html?cat=${c}">${cap(c)}</a>`).join("")}</div><a class="btn" href="${ask}">Ask a question</a><p class="dm">Files are delivered privately after payment is confirmed.</p></aside>`,
);

const od = (o) => {
  document.body.classList.toggle("dr", o);
  $("#mb").setAttribute("aria-expanded", o);
};
$("#mb").onclick = () => od(true);
$("#ov").onclick = $(".dx").onclick = () => od(false);
document
  .querySelectorAll("#dr a")
  .forEach((a) => a.addEventListener("click", () => od(false)));
addEventListener("keydown", (e) => e.key == "Escape" && od(false));

$("#ftr").innerHTML =
  `<footer><div class="ft w"><div><b>Original work</b>Original or properly licensed only</div><div><b>Private delivery</b>Sent after payment is confirmed</div><div><b>Human support</b>Real replies from the team</div><div><b>Clear details</b>Contents, level and formats up front</div></div><div class="w"><div class="fm"><div><a class="logo" href="index.html"><span>NOV<b>IQ</b></span></a><p style="margin:16px 0 22px;max-width:34ch">Practical digital resources for learners, builders and creators.</p><a class="btn sm" href="${ask}">Ask a question</a></div><div><h4>Shop</h4>${CATS.map((c) => `<a href="explore.html?cat=${c}">${cap(c)}</a>`).join("")}<a href="bundles.html">Bundles</a></div><div><h4>Company</h4><a href="about.html">About</a><a href="free-resources.html">Free resources</a><a href="blog.html">Blog Notes</a><a href="contact.html">Contact</a></div><div><h4>Support</h4><a href="contact.html">Order enquiry</a><a href="about.html#orders">How delivery works</a><a href="contact.html#faq">FAQ and refunds</a><a href="about.html#standards">Product standards</a></div></div><div class="fb"><span>© ${new Date().getFullYear()} NOVIQ · Made in India</span><a href="#top" aria-label="Back to top">Back to top ↑</a></div></div><div class="big" aria-hidden="true">NOVIQ</div></footer>`;

const cf = $("#cf");
if (cf) {
  const topic = Q.get("topic"),
    message = Q.get("message");
  if (topic && $("#cf-topic")) {
    const o = [...$("#cf-topic").options].find(
      (o) => o.value === topic || o.text === topic,
    );
    if (o) $("#cf-topic").value = o.value;
  }
  if (message && $("#cf-message")) $("#cf-message").value = message;

  // Send without leaving the page, then show a thank-you screen.
  const thanks = $("#thanks"),
    err = $("#cf-err");
  cf.addEventListener("submit", async (e) => {
    if (!thanks || !window.fetch) return; // falls back to a normal form post
    e.preventDefault();
    if (!cf.reportValidity()) return;
    const btn = cf.querySelector('button[type="submit"]'),
      label = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Sending…";
    err.hidden = true;
    try {
      const res = await fetch(cf.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(cf),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error("send failed");
      $("#th-name").textContent = (cf.elements.name.value || "").trim().split(/\s+/)[0] || "there";
      $("#th-email").textContent = cf.elements.email.value;
      cf.closest("[data-form-wrap]").hidden = true;
      thanks.hidden = false;
      thanks.focus({ preventScroll: true });
      scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
      cf.reset();
    } catch (x) {
      err.textContent =
        "Your message didn't send. Check your connection and try again.";
      err.hidden = false;
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });
  $("#th-again")?.addEventListener("click", () => {
    thanks.hidden = true;
    $("[data-form-wrap]").hidden = false;
    const b = cf.querySelector('button[type="submit"]');
    b.disabled = false;
    b.innerHTML = 'Send enquiry <span>&rarr;</span>';
    cf.elements.name.focus();
  });
}

document.body.insertAdjacentHTML("afterbegin", '<div id="prog"></div>');
document.body.id = "top";
const sc = () => {
  const h = document.documentElement;
  $("#prog").style.width =
    (scrollY / (h.scrollHeight - innerHeight || 1)) * 100 + "%";
  $("#hdr").classList.toggle("s", scrollY > 20);
};
addEventListener("scroll", sc, { passive: true });
sc();

// Seamless navigation: warm the next page on hover/touch
const warmed = new Set();
const warm = (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (
    !a ||
    a.origin !== location.origin ||
    warmed.has(a.href) ||
    (a.hash && a.pathname === location.pathname)
  )
    return;
  warmed.add(a.href);
  const l = document.createElement("link");
  l.rel = "prefetch";
  l.href = a.href;
  document.head.appendChild(l);
};
document.addEventListener("pointerover", warm, { passive: true });
document.addEventListener("touchstart", warm, { passive: true });

// Gentle reveal on scroll. Skipped entirely for reduced-motion visitors.
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
);
const RV =
  ".card:not(.rv),.step:not(.rv),.band:not(.rv),.idx a:not(.rv),.val>div:not(.rv),.tile:not(.rv),.std li:not(.rv)";
const rv = () =>
  document.querySelectorAll(RV).forEach((e, i) => {
    e.classList.add("rv");
    if (calm) return e.classList.add("in");
    e.style.transitionDelay = (i % 4) * 60 + "ms";
    io.observe(e);
  });
new MutationObserver(rv).observe(document.body, {
  childList: true,
  subtree: true,
});
rv();
fillIcons();
