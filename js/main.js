const Q = new URLSearchParams(location.search),
  $ = (s) => document.querySelector(s);
const enquiry = (topic = "Order enquiry", message = "") =>
  "contact.html?" + new URLSearchParams({ topic, message }).toString();
const NAV = [
  ["index", "Home"],
  ["explore", "Explore"],
  ["bundles", "Bundles"],
  ["free-resources", "Free Resources"],
  ["about", "About"],
  ["contact", "Contact"],
];
const pg = location.pathname.split("/").pop().replace(".html", "") || "index";
$("#hdr").innerHTML =
  `<div class="ann">Free resources available · Orders handled personally <a href="free-resources.html">Browse free →</a></div><div class="w hb"><a class="logo" href="index.html">NOV<b>IQ</b>.</a><nav id="nv" aria-label="Main">${NAV.map(([h, t]) => `<a class="${h == pg || (h == "explore" && pg == "product") ? "on" : ""}" href="${h}.html">${t}</a>`).join("")}</nav><div class="ha"><a class="ib" href="explore.html?q=" aria-label="Search resources"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></a><button class="ib" id="cb" aria-label="Open enquiry list"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><em id="cc" class="z">0</em></button><a class="btn sm" href="${enquiry("Question", "I have a question about your resources.")}" >Email enquiry</a><button id="mb" aria-label="Open menu" aria-expanded="false"><i></i><i></i></button></div></div>`;
document.body.insertAdjacentHTML(
  "beforeend",
  `<div id="ov"></div><aside id="dr" aria-label="Menu"><div class="dh"><a class="logo" href="index.html">NOV<b>IQ</b>.</a><button class="ib dx" aria-label="Close menu">✕</button></div><div class="dl">${NAV.map(([h, t], i) => `<a class="${h == pg ? "on" : ""}" href="${h}.html"><small>0${i + 1}</small>${t}</a>`).join("")}</div><div class="dc">${["build", "learn", "organize", "practice"].map((c) => `<a href="explore.html?cat=${c}">${c[0].toUpperCase() + c.slice(1)}</a>`).join("")}</div><a class="btn" href="${enquiry("Question", "I have a question about your resources.")}" >Email NOVIQ <span>→</span></a><p class="dm">LEARN. BUILD. CREATE.<br>Files delivered privately after payment is confirmed.</p></aside>`,
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
  `<footer><div class="ft w"><div><b>Original</b>Original or properly licensed work only</div><div><b>Private delivery</b>Files sent privately after payment is confirmed</div><div><b>Human support</b>Real replies from the NOVIQ team</div><div><b>Clear formats</b>Contents, level and formats stated up front</div></div><div class="w"><div class="fm"><div><a class="logo" href="index.html">NOV<b>IQ</b>.</a><p style="opacity:.7;margin:14px 0 20px;max-width:34ch">Practical digital resources for learners, builders and creators. Learn. Build. Create.</p><a class="btn sm" href="${enquiry("Question", "I have a question about your resources.")}" >Email NOVIQ <span>→</span></a></div><div><h4>Shop</h4>${["build", "learn", "organize", "practice"].map((c) => `<a href="explore.html?cat=${c}">${c[0].toUpperCase() + c.slice(1)}</a>`).join("")}<a href="bundles.html">Bundles</a></div><div><h4>Company</h4><a href="about.html">About</a><a href="free-resources.html">Free resources</a><a href="contact.html">Contact</a></div><div><h4>Support</h4><a href="contact.html">Order enquiry</a><a href="terms.html">Terms</a><a href="refund.html">Refunds</a><a href="delivery.html">Delivery</a><a href="about.html">Product standards</a></div></div><div class="fb"><span>© ${new Date().getFullYear()} NOVIQ · Made in India</span><span>Orders confirmed manually · Files delivered privately</span><a href="#" aria-label="Back to top">Back to top ↑</a></div></div><div class="big" aria-hidden="true">NOVIQ.</div></footer>`;
const cf = $("#cf");
if (cf) {
  const topic = Q.get("topic");
  const message = Q.get("message");
  if (topic && $("#cf-topic")) {
    const option = [...$("#cf-topic").options].find((o) => o.value === topic || o.text === topic);
    if (option) $("#cf-topic").value = option.value;
  }
  if (message && $("#cf-message")) $("#cf-message").value = message;
}
document.body.insertAdjacentHTML("afterbegin", '<div id="prog"></div>');
const sc = () => {
  const h = document.documentElement;
  $("#prog").style.width =
    (scrollY / (h.scrollHeight - innerHeight || 1)) * 100 + "%";
  $("#hdr").classList.toggle("s", scrollY > 20);
};
addEventListener("scroll", sc, { passive: true });
sc();
const io = new IntersectionObserver(
  (es) =>
    es.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }),
  { threshold: 0.1 },
);
const rv = () =>
  document
    .querySelectorAll(
      ".card:not(.rv),.tile:not(.rv),.step:not(.rv),.band:not(.rv)",
    )
    .forEach((e, i) => {
      e.classList.add("rv");
      e.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(e);
    });
new MutationObserver(rv).observe(document.body, {
  childList: true,
  subtree: true,
});
rv();
