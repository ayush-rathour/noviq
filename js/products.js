// Product catalogue and product-detail rendering.
// All catalogue text is escaped before it is inserted into HTML.
const escapeHTML = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );

const safeCategory = (value = "") =>
  /^[a-z0-9-]+$/i.test(value) ? value : "general";

const safeDownloadUrl = (value = "") => {
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const money = (product) =>
  product.price_inr > 0
    ? `₹${Number(product.price_inr).toLocaleString("en-IN")}`
    : "Free";

const FORMAT_LABELS = {
  "notion template": "Notion",
  "html/css/js": "HTML",
};
const fmtLabel = (f = "") => FORMAT_LABELS[String(f).toLowerCase()] || f;

// 1 bar = beginner, 2 = beginner to intermediate, 3 = intermediate and up.
const levelBars = (level = "") => {
  const l = level.toLowerCase();
  if (!l || l.includes("all")) return 0;
  if (l.includes(" to ")) return 2;
  if (l.includes("intermediate") || l.includes("advanced")) return 3;
  return l.includes("beginner") ? 1 : 0;
};
const levelChip = (level = "") => {
  const n = levelBars(level);
  const bars = n
    ? `<svg class="bars" width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">${[0, 1, 2]
        .map(
          (i) =>
            `<rect x="${i * 5}" y="${8 - i * 3}" width="3.6" height="${4 + i * 3}" rx="1"${i < n ? "" : ' class="off"'}/>`,
        )
        .join("")}</svg>`
    : "";
  return `<span class="lv">${bars}${escapeHTML(level)}</span>`;
};

// Cover: a designed template per category. If a product has a "cover" image
// (WebP recommended), it is lazy-loaded and replaces the generated art.
const coverHTML = (product) => {
  const category = safeCategory(product.category);
  const formats = Array.isArray(product.format) ? product.format : [];
  if (product.cover) {
    return `<img class="cv-img" src="${escapeHTML(product.cover)}" alt="${escapeHTML(product.cover_alt || product.title + " cover")}" width="${+product.cover_w || 800}" height="${+product.cover_h || 600}" loading="lazy" decoding="async">`;
  }
  return `${artFor(category)}
    <span class="cv-tag">${icon(category, 14)}${escapeHTML(cap(product.category || "resource"))}</span>
    <div class="cv-bot">
      <b>${escapeHTML(product.title)}</b>
      <div class="cv-fmt">${formats.map((f) => `<i>${escapeHTML(fmtLabel(f))}</i>`).join("")}</div>
    </div>`;
};

const card = (product) => {
  const category = safeCategory(product.category);
  return `
    <a class="card" href="product.html?slug=${encodeURIComponent(product.slug || "")}">
      ${product.badge ? `<span class="badge">${escapeHTML(product.badge)}</span>` : ""}
      <div class="cov c-${category}${product.cover ? " has-img" : ""}">${coverHTML(product)}</div>
      <div class="cb">
        <small>${escapeHTML(product.category)}</small>
        <h3>${escapeHTML(product.title)}</h3>
        <p>${escapeHTML(product.description)}</p>
        <div class="pr"><span>${money(product)}</span>${levelChip(product.level)}</div>
      </div>
    </a>`;
};

// Skeleton placeholders shown while products.json loads.
const skCard = () =>
  `<div class="skc" aria-hidden="true"><div class="sk sk-cov"></div><div class="sk sk-l s40"></div><div class="sk sk-l s85 tall"></div><div class="sk sk-l s70"></div></div>`;
const skGrid = (n = 3) => Array.from({ length: n }, skCard).join("");
document.querySelectorAll("[data-grid]").forEach((grid) => {
  if (!grid.children.length) grid.innerHTML = skGrid(3);
  grid.setAttribute("aria-busy", "true");
});
if ($("#ex") && !$("#ex").children.length) {
  $("#ex").innerHTML = skGrid(6);
  $("#ex").setAttribute("aria-busy", "true");
}

const load = fetch("data/products.json")
  .then((response) => {
    if (!response.ok)
      throw new Error(`Catalogue request failed (${response.status})`);
    return response.json();
  })
  .then((products) => {
    if (!Array.isArray(products)) throw new Error("Invalid product catalogue");
    return products;
  });

load
  .then((products) => {
    document.querySelectorAll("[data-grid]").forEach((grid) => {
      const type = grid.dataset.grid;
      const visibleProducts = products.filter((product) => {
        if (type === "featured") return product.featured;
        if (type === "free") return !product.price_inr;
        if (type === "bundles") return product.category === "bundle";
        return true;
      });

      grid.removeAttribute("aria-busy");
      grid.innerHTML = visibleProducts.length
        ? visibleProducts.map(card).join("")
        : '<p class="empty-state">More resources are coming soon.</p>';
    });

    const productRoot = $("#prod");
    if (!productRoot) return;

    const product = products.find((item) => item.slug === Q.get("slug"));
    if (!product) {
      productRoot.innerHTML = `
        <section class="light"><div class="w">
          <p class="eyebrow">NOT FOUND</p>
          <h1>We couldn't find that resource.</h1>
          <p class="lead">It may have moved, or the link may be incorrect.</p>
          <a class="btn" href="explore.html">Explore all resources <span>→</span></a>
        </div></section>`;
      return;
    }

    document.title = `${product.title} | NOVIQ`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", product.description || "NOVIQ resource details.");

    const isFree = !product.price_inr;
    const category = safeCategory(product.category);
    const formats = Array.isArray(product.format) ? product.format : [];
    const includedItems = Array.isArray(product.includes)
      ? product.includes
      : [];
    const related = products
      .filter(
        (item) => item.category === product.category && item.id !== product.id,
      )
      .slice(0, 3);
    const downloadUrl = safeDownloadUrl(product.file);

    const primaryAction =
      isFree && downloadUrl
        ? `<a class="btn" href="${escapeHTML(downloadUrl)}" download>Download free <span>↓</span></a>`
        : `<a class="btn" href="${enquiry(
            "Order enquiry",
            `I'd like to order: ${product.title} (${product.id})`,
          )}">Enquire by email <span>→</span></a>`;

    const addToListAction = isFree
      ? ""
      : `<button class="btn o" type="button" data-add="${escapeHTML(product.id)}">+ Add to enquiry list</button>`;

    const cues = (
      isFree
        ? [
            ["download", "Instant download"],
            ["check", "No sign-up needed"],
            ["shield", "Original work"],
          ]
        : [
            ["lock", "Sent privately by email"],
            ["eye", "Preview before you buy"],
            ["shield", "No payment on this site"],
          ]
    )
      .map(([i, t]) => `<li>${icon(i, 16)}<span>${t}</span></li>`)
      .join("");

    productRoot.innerHTML = `
      <section class="light product-detail">
        <div class="w two">
          <div class="cov c-${category} product-cover${product.cover ? " has-img" : ""}">${coverHTML(product)}</div>

          <div class="product-copy">
            <div class="crumb"><a href="explore.html">Explore</a><span>/</span><a href="explore.html?cat=${category}">${escapeHTML(product.category)}</a></div>
            <h1>${escapeHTML(product.title)}</h1>
            <p class="lead">${escapeHTML(product.description)}</p>
            <div class="price">${money(product)}</div>

            <div class="meta" aria-label="Product information">
              ${levelChip(product.level)}
              ${formats.map((format) => `<span class="fmt">${escapeHTML(fmtLabel(format))}</span>`).join("")}
            </div>

            <div class="product-actions" id="pa">
              ${primaryAction}
              ${addToListAction}
              <a class="btn o" href="contact.html?topic=Question&amp;message=${encodeURIComponent(`I have a question about ${product.title} (${product.id}).`)}">Ask a question</a>
            </div>

            <ul class="cues">${cues}</ul>

            <div class="product-section">
              <h3>Who it's for</h3>
              <p>${escapeHTML(product.audience)}</p>
            </div>
            <div class="product-section">
              <h3>What's included</h3>
              <ul>${includedItems.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
            </div>
            <div class="product-section">
              <h3>Prerequisites</h3>
              <p>${escapeHTML(product.prereq)}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="product-process">
        <div class="w">
          <h2>How ordering works</h2>
          <div class="steps">
          <div class="step"><b>01</b><p><strong>Send your enquiry</strong><br>Tell us which resource you'd like. Your email opens with the product details included.</p></div>
          <div class="step"><b>02</b><p><strong>Receive a reply</strong><br>We'll respond with payment details and an order reference.</p></div>
          <div class="step"><b>03</b><p><strong>Get your resource</strong><br>After payment is confirmed, we'll send the files to you privately.</p></div>
          </div>
          ${related.length ? `<div class="related-products"><h2>You may also like</h2><div class="grid">${related.map(card).join("")}</div></div>` : ""}
        </div>
      </section>

      <div class="buybar" id="bb" role="region" aria-label="Order this resource">
        <div><small>${escapeHTML(product.title)}</small><b>${money(product)}</b></div>
        ${primaryAction.replace('class="btn"', 'class="btn sm"')}
      </div>`;

    // Mobile order bar: stays out of the way while the main buttons are visible.
    document.body.classList.add("has-buybar");
    const pa = $("#pa"),
      bb = $("#bb");
    if (pa && bb && "IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => bb.classList.toggle("hide", entry.isIntersecting),
        { threshold: 0.2 },
      ).observe(pa);
    }
  })
  .catch((error) => {
    console.error("NOVIQ catalogue error:", error);
    document.querySelectorAll("[data-grid], #ex, #prod").forEach((element) => {
      element.innerHTML = `
        <div class="w empty-state">
          <h2>We couldn't load the resources.</h2>
          <p>Please refresh the page. If the problem continues, open NOVIQ through a local server such as VS Code Live Server.</p>
        </div>`;
    });
  });
