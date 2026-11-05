(() => {
  const root = document.querySelector("#article-root");
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
      root.innerHTML = `<section class="light article-hero"><div class="w"><a class="article-back" href="free-resources.html#blog-notes">← Back to Blog Notes</a><p class="eyebrow">${esc(note.category)} / NOVIQ NOTES</p><h1>${esc(note.title)}</h1><p class="lead">${esc(note.description)}</p><div class="article-byline"><span>${esc(note.date)}</span><span>${esc(note.read_time)}</span><span>Free to read</span></div><div class="article-art blog-cover-${esc(note.theme)}"><span class="blog-cover-index">N° ${esc(note.number)}</span>${cover.art[note.theme] || cover.art.code || ""}<span class="blog-cover-word">${esc(cover.words[note.theme] || "EXPLORE. LEARN. BUILD.")}</span><span class="blog-cover-bottom">NOVIQ / NOTES</span></div></div></section><section class="article-section"><div class="article-layout"><article class="article-content"><p class="article-intro">${esc(note.intro)}</p>${note.sections.map((s, i) => `<section><span class="article-count">0${i + 1}</span><h2>${esc(s.heading)}</h2><p>${esc(s.body)}</p></section>`).join("")}${note.terms?.length ? `<section class="article-glossary"><span class="article-count">REFERENCE</span><h2>Quick glossary</h2><dl>${note.terms.map((t) => `<div><dt>${esc(t.term)}</dt><dd>${esc(t.meaning)}</dd></div>`).join("")}</dl></section>` : ""}${note.quick_check?.length ? `<section class="article-quick-check"><span class="article-count">RECAP</span><h2>Check your understanding</h2>${note.quick_check.map((q) => `<details><summary>${esc(q.question)}</summary><p>${esc(q.answer)}</p></details>`).join("")}</section>` : ""}<div class="article-takeaway"><span>THE KEY TAKEAWAY</span><p>${esc(note.takeaway)}</p></div><a class="article-back article-bottom-back" href="free-resources.html#blog-notes">← Explore more Blog Notes</a></article><aside class="article-aside"><span>IN THIS NOTE</span><ol>${note.sections.map((s, i) => `<li><a href="#">${esc(s.heading)}</a></li>`).join("")}</ol><p>Part of the NOVIQ free learning library.</p></aside></div></section>`;
      root
        .querySelectorAll(".article-aside a")
        .forEach((a, i) => (a.href = `#article-section-${i}`));
      root
        .querySelectorAll(".article-content > section")
        .forEach((s, i) => (s.id = `article-section-${i}`));
    })
    .catch(() => {
      root.innerHTML =
        '<section class="light"><div class="w"><p class="eyebrow">NOTE NOT FOUND</p><h1>We couldn’t find that note.</h1><p class="lead">This note may have moved or the link may be incorrect.</p><a class="btn" href="free-resources.html#blog-notes">Explore free resources <span>→</span></a></div></section>';
    });
})();
