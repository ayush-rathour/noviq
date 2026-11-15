// Blog Notes: cover art, notes list and article page (each part runs only where its page elements exist).
(function () {
  const coverWords = {
    internet: "CONNECTED.",
    git: "VERSIONED.",
    design: "VISUALS.",
    code: "THE WEB, BUILT.",
    api: "CONNECTED SYSTEMS.",
    database: "DATA STRUCTURE.",
    deploy: "CONFIDENCE SHIPPING.",
    security: "STAY AWARE.",
  };
  const coverArt = {
    internet:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><circle cx="120" cy="70" r="43" fill="none" stroke="#CBF36A" stroke-width="3"/><ellipse cx="120" cy="70" rx="18" ry="43" fill="none" stroke="#FFFFFF" stroke-width="2"/><path d="M78 70h84M88 48h64M88 92h64" fill="none" stroke="#6A4CFF" stroke-width="3"/><circle cx="120" cy="70" r="5" fill="#CBF36A"/></svg>',
    git: '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><path d="M80 36l40-18 40 18v48l-40 24-40-24z" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M96 42v35m0-35l28 15m0 0v30m0-30l22-14" fill="none" stroke="#FFFFFF" stroke-width="3"/><circle cx="96" cy="42" r="6" fill="#6A4CFF"/><circle cx="124" cy="57" r="6" fill="#CBF36A"/><circle cx="124" cy="87" r="6" fill="#6A4CFF"/><circle cx="146" cy="43" r="6" fill="#FFFFFF"/></svg>',
    design:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><rect x="66" y="28" width="108" height="78" rx="10" fill="none" stroke="#FFFFFF" stroke-width="3"/><path d="M66 48h108" stroke="#6A4CFF" stroke-width="3"/><circle cx="80" cy="38" r="3" fill="#CBF36A"/><rect x="82" y="61" width="30" height="30" rx="5" fill="#6A4CFF"/><path d="M124 65h34M124 77h27M124 89h20" stroke="#CBF36A" stroke-width="4" stroke-linecap="round"/></svg>',
    code: '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><path d="M95 42L65 70l30 28M145 42l30 28-30 28M132 30l-24 80" fill="none" stroke="#CBF36A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="65" cy="70" r="5" fill="#6A4CFF"/><circle cx="175" cy="70" r="5" fill="#6A4CFF"/></svg>',
    api: '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><rect x="52" y="42" width="54" height="54" rx="10" fill="none" stroke="#FFFFFF" stroke-width="3"/><rect x="134" y="42" width="54" height="54" rx="10" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M108 58h22m-8-8l8 8-8 8M132 80h-22m8-8l-8 8 8 8" fill="none" stroke="#6A4CFF" stroke-width="4" stroke-linecap="round"/></svg>',
    database:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><ellipse cx="120" cy="35" rx="48" ry="16" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M72 35v65c0 9 21 16 48 16s48-7 48-16V35M72 57c0 9 21 16 48 16s48-7 48-16M72 79c0 9 21 16 48 16s48-7 48-16" fill="none" stroke="#FFFFFF" stroke-width="3"/><path d="M120 35v65" stroke="#6A4CFF" stroke-width="2" stroke-dasharray="4 6"/></svg>',
    deploy:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><rect x="54" y="68" width="48" height="36" rx="6" fill="none" stroke="#FFFFFF" stroke-width="3"/><path d="M66 81l8 7-8 7m15 0h10M104 86h31m-10-10l10 10-10 10M151 103V58m-10 10l10-10 10 10M137 47h28" fill="none" stroke="#CBF36A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M104 86h31" stroke="#6A4CFF" stroke-width="4"/></svg>',
    security:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><path d="M120 20l48 18v30c0 29-19 48-48 61-29-13-48-32-48-61V38z" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M98 69l15 15 30-33" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="120" cy="70" r="61" fill="none" stroke="#6A4CFF" stroke-width="2" stroke-dasharray="5 8"/></svg>',
  };

  window.NOVIQBlogCover = { art: coverArt, words: coverWords };
})();

(() => {
  const grid = document.querySelector("#blog-grid");
  if (!grid) return;
  const search = document.querySelector("#blog-search");
  const filters = [...document.querySelectorAll("[data-blog-filter]")];
  let notes = [];
  let active = "all";
  const escapeHTML = (value = "") =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const coverArt = window.NOVIQBlogCover?.art || {};
  const coverWords = window.NOVIQBlogCover?.words || {};
  const card = (
    note,
  ) => `<a class="blog-card" href="blog-note.html?slug=${encodeURIComponent(note.slug)}">
    <div class="blog-cover blog-cover-${escapeHTML(note.theme)}"><span class="blog-cover-index">N° ${escapeHTML(note.number)}</span>${coverArt[note.theme] || coverArt.code}<span class="blog-cover-word">${escapeHTML(coverWords[note.theme] || "EXPLORE. LEARN. BUILD.")}</span><span class="blog-cover-bottom">NOVIQ / NOTES</span></div>
    <div class="blog-card-body"><div class="blog-meta"><span>${escapeHTML(note.category)}</span><span>${escapeHTML(note.read_time)}</span></div><h3>${escapeHTML(note.title)}</h3><p>${escapeHTML(note.description)}</p><span class="blog-read">Read note <span aria-hidden="true">↗</span></span></div>
  </a>`;
  const render = () => {
    const q = (search?.value || "").trim().toLowerCase();
    const shown = notes.filter(
      (n) =>
        (active === "all" || n.category === active) &&
        (!q ||
          `${n.title} ${n.description} ${n.category}`
            .toLowerCase()
            .includes(q)),
    );
    grid.innerHTML = shown.length
      ? shown.map(card).join("")
      : '<p class="blog-empty">No notes match that search. Try another keyword or category.</p>';
  };
  filters.forEach((button) =>
    button.addEventListener("click", () => {
      active = button.dataset.blogFilter;
      filters.forEach((b) => {
        const selected = b === button;
        b.classList.toggle("active", selected);
        b.setAttribute("aria-pressed", String(selected));
      });
      render();
    }),
  );
  search?.addEventListener("input", render);
  fetch("data/blog-notes.json")
    .then((r) => {
      if (!r.ok) throw new Error("Could not load notes");
      return r.json();
    })
    .then((data) => {
      notes = Array.isArray(data) ? data : [];
      render();
    })
    .catch(() => {
      grid.innerHTML =
        '<p class="blog-empty">Blog Notes are temporarily unavailable. Please try again shortly.</p>';
    });
})();

(() => {
  const root = document.querySelector("#article-root");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("slug");
  const esc = (v) =>
    String(v || "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  fetch("data/blog-notes.json")
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.json();
    })
    .then((notes) => {
      const note = notes.find((n) => n.slug === slug);
      if (!note) throw new Error();
      document.title = `${note.title} | NOVIQ Blog Notes`;
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", note.description);
      const cover = window.NOVIQBlogCover || { art: {}, words: {} };
      root.innerHTML = `<section class="light article-hero"><div class="w"><a class="article-back" href="blog.html">← Back to Blog Notes</a><p class="eyebrow">${esc(note.category)} / NOVIQ NOTES</p><h1>${esc(note.title)}</h1><p class="lead">${esc(note.description)}</p><div class="article-byline"><span>${esc(note.date)}</span><span>${esc(note.read_time)}</span><span>Free to read</span></div><div class="article-art blog-cover-${esc(note.theme)}"><span class="blog-cover-index">N° ${esc(note.number)}</span>${cover.art[note.theme] || cover.art.code || ""}<span class="blog-cover-word">${esc(cover.words[note.theme] || "EXPLORE. LEARN. BUILD.")}</span><span class="blog-cover-bottom">NOVIQ / NOTES</span></div></div></section><section class="article-section"><div class="article-layout"><article class="article-content"><p class="article-intro">${esc(note.intro)}</p>${note.sections.map((s, i) => `<section><span class="article-count">0${i + 1}</span><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></section>`).join("")}${note.terms?.length ? `<section class="article-glossary"><span class="article-count">REFERENCE</span><h2>Quick glossary</h2><dl>${note.terms.map((t) => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.meaning)}</dd></div>`).join("")}</dl></section>` : ""}${note.quick_check?.length ? `<section class="article-quick-check"><span class="article-count">RECAP</span><h2>Check your understanding</h2>${note.quick_check.map((q) => `<details><summary>${esc(q.question)}</summary><p>${esc(q.answer)}</p></details>`).join("")}</section>` : ""}<div class="article-takeaway"><span>THE KEY TAKEAWAY</span><p>${esc(note.takeaway)}</p></div><a class="article-back article-bottom-back" href="blog.html">← Explore more Blog Notes</a></article><aside class="article-aside"><span>IN THIS NOTE</span><ol>${note.sections.map((s, i) => `<li><a href="#">${esc(s.heading)}</a></li>`).join("")}</ol><p>Part of the NOVIQ free learning library.</p></aside></div></section>`;
      root
        .querySelectorAll(".article-aside a")
        .forEach((a, i) => (a.href = `#article-section-${i}`));
      root
        .querySelectorAll(".article-content > section")
        .forEach((s, i) => (s.id = `article-section-${i}`));
    })
    .catch(() => {
      root.innerHTML =
        '<section class="light"><div class="w"><p class="eyebrow">NOTE NOT FOUND</p><h1>We couldn’t find that note.</h1><p class="lead">This note may have moved or the link may be incorrect.</p><a class="btn" href="blog.html">Explore free resources <span>→</span></a></div></section>';
    });
})();
