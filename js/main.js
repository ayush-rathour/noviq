const Q = new URLSearchParams(location.search),
  $ = (s) => document.querySelector(s);
const enquiry = (topic = "Order enquiry", message = "") =>
  "contact.html?" + new URLSearchParams({ topic, message }).toString();
const NAV = [
  ["explore", "Explore"],
  ["bundles", "Bundles"],
  ["free-resources", "Free"],
  ["about", "About"],
  ["contact", "Contact"],
];
const CATS = ["build", "learn", "organize", "practice"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const pg = location.pathname.split("/").pop().replace(".html", "") || "index";
const on = (h) => h == pg || (h == "explore" && pg == "product");
const ask = enquiry("Question", "I have a question about your resources.");

$("#hdr").innerHTML = `<div class="hb"><a class="logo" href="index.html" aria-label="NOVIQ home"><span>NOV<b>IQ</b></span></a><nav id="nv" aria-label="Main">${NAV.map(([h, t]) => `<a class="${on(h) ? "on" : ""}" href="${h}.html"${on(h) ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav><div class="ha"><a class="ib" href="explore.html?q=" aria-label="Search resources"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a><button class="ib" id="cb" aria-label="Open enquiry list"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><em id="cc" class="z">0</em></button><button id="mb" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button></div></div>`;

document.body.insertAdjacentHTML("beforeend",
  `<div id="ov"></div><aside id="dr" aria-label="Menu"><div class="dh"><a class="logo" href="index.html"><span>NOV<b>IQ</b></span></a><button class="ib dx" aria-label="Close menu">✕</button></div><div class="dl">${[["index", "Home"], ...NAV].map(([h, t]) => `<a class="${h == pg ? "on" : ""}" href="${h}.html">${t}</a>`).join("")}</div><div class="dc">${CATS.map((c) => `<a href="explore.html?cat=${c}">${cap(c)}</a>`).join("")}</div><a class="btn" href="${ask}">Ask a question</a><p class="dm">Files are delivered privately after payment is confirmed.</p></aside>`);

const od = (o) => {
  document.body.classList.toggle("dr", o);
  $("#mb").setAttribute("aria-expanded", o);
};
$("#mb").onclick = () => od(true);
$("#ov").onclick = $(".dx").onclick = () => od(false);
document.querySelectorAll("#dr a").forEach((a) => a.addEventListener("click", () => od(false)));
addEventListener("keydown", (e) => e.key == "Escape" && od(false));

$("#ftr").innerHTML = `<footer><div class="ft w"><div><b>Original work</b>Original or properly licensed only</div><div><b>Private delivery</b>Sent after payment is confirmed</div><div><b>Human support</b>Real replies from the team</div><div><b>Clear details</b>Contents, level and formats up front</div></div><div class="w"><div class="fm"><div><a class="logo" href="index.html"><span>NOV<b>IQ</b></span></a><p style="margin:16px 0 22px;max-width:34ch">Practical digital resources for learners, builders and creators.</p><a class="btn sm" href="${ask}">Ask a question</a></div><div><h4>Shop</h4>${CATS.map((c) => `<a href="explore.html?cat=${c}">${cap(c)}</a>`).join("")}<a href="bundles.html">Bundles</a></div><div><h4>Company</h4><a href="about.html">About</a><a href="free-resources.html">Free resources</a><a href="contact.html">Contact</a></div><div><h4>Support</h4><a href="contact.html">Order enquiry</a><a href="about.html#orders">How delivery works</a><a href="contact.html#faq">FAQ and refunds</a><a href="about.html#standards">Product standards</a></div></div><div class="fb"><span>© ${new Date().getFullYear()} NOVIQ · Made in India</span><a href="#top" aria-label="Back to top">Back to top ↑</a></div></div><div class="big" aria-hidden="true">NOVIQ</div></footer>`;

const cf = $("#cf");
if (cf) {
  const topic = Q.get("topic"), message = Q.get("message");
  if (topic && $("#cf-topic")) {
    const o = [...$("#cf-topic").options].find((o) => o.value === topic || o.text === topic);
    if (o) $("#cf-topic").value = o.value;
  }
  if (message && $("#cf-message")) $("#cf-message").value = message;
}

document.body.insertAdjacentHTML("afterbegin", '<div id="prog"></div>');
document.body.id = "top";
const sc = () => {
  const h = document.documentElement;
  $("#prog").style.width = (scrollY / (h.scrollHeight - innerHeight || 1)) * 100 + "%";
  $("#hdr").classList.toggle("s", scrollY > 20);
};
addEventListener("scroll", sc, { passive: true });
sc();

// Seamless navigation: warm the next page on hover/touch
const warmed = new Set();
const warm = (e) => {
  const a = e.target.closest && e.target.closest("a[href]");
  if (!a || a.origin !== location.origin || warmed.has(a.href) || a.hash && a.pathname === location.pathname) return;
  warmed.add(a.href);
  const l = document.createElement("link");
  l.rel = "prefetch";
  l.href = a.href;
  document.head.appendChild(l);
};
document.addEventListener("pointerover", warm, { passive: true });
document.addEventListener("touchstart", warm, { passive: true });

// Reveal on scroll (cards only, keeps the page calm)
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { threshold: 0.08 });
const rv = () => document.querySelectorAll(".card:not(.rv),.step:not(.rv),.band:not(.rv)").forEach((e, i) => {
  e.classList.add("rv");
  e.style.transitionDelay = (i % 4) * 60 + "ms";
  io.observe(e);
});
new MutationObserver(rv).observe(document.body, { childList: true, subtree: true });
rv();
