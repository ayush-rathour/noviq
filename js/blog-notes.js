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
