// Product catalogue and product-detail rendering.
// All catalogue text is escaped before it is inserted into HTML.
const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

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

const card = (product) => {
  const category = safeCategory(product.category);
  const formats = Array.isArray(product.format) ? product.format : [];

  return `
    <a class="card" href="product.html?slug=${encodeURIComponent(product.slug || "")}">
      ${product.badge ? `<span class="badge">${escapeHTML(product.badge)}</span>` : ""}
      <div class="cov c-${category}">
        <b>${escapeHTML(product.title)}</b>
        <span>${formats.map(escapeHTML).join(" · ")}</span>
      </div>
      <div class="cb">
        <small>${escapeHTML(product.category)}</small>
        <h3>${escapeHTML(product.title)}</h3>
        <p>${escapeHTML(product.description)}</p>
        <div class="pr"><span>${money(product)}</span><span class="lv">${escapeHTML(product.level || "")}</span></div>
      </div>
    </a>`;
};

const load = fetch("data/products.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Catalogue request failed (${response.status})`);
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

    const isFree = !product.price_inr;
    const category = safeCategory(product.category);
    const formats = Array.isArray(product.format) ? product.format : [];
    const includedItems = Array.isArray(product.includes) ? product.includes : [];
    const related = products
      .filter((item) => item.category === product.category && item.id !== product.id)
      .slice(0, 3);
    const downloadUrl = safeDownloadUrl(product.file);

    const primaryAction = isFree && downloadUrl
      ? `<a class="btn" href="${escapeHTML(downloadUrl)}" download>Download free <span>↓</span></a>`
      : `<a class="btn" href="${enquiry(
          "Order enquiry",
          `I'd like to order: ${product.title} (${product.id})`,
        )}">Enquire by email <span>→</span></a>`;

    const addToListAction = isFree
      ? ""
      : `<button class="btn o" type="button" data-add="${escapeHTML(product.id)}">+ Add to enquiry list</button>`;

    productRoot.innerHTML = `
      <section class="light product-detail">
        <div class="w two">
          <div class="cov c-${category} product-cover">
            <span class="cover-label">NOVIQ RESOURCE</span>
            <b>${escapeHTML(product.title)}</b>
            <span>${formats.map(escapeHTML).join(" · ")}</span>
          </div>

          <div class="product-copy">
            <div class="crumb"><a href="explore.html">Explore</a><span>/</span><a href="explore.html?cat=${category}">${escapeHTML(product.category)}</a></div>
            <h1>${escapeHTML(product.title)}</h1>
            <p class="lead">${escapeHTML(product.description)}</p>
            <div class="price">${money(product)}</div>

            <div class="meta" aria-label="Product information">
              <span>${escapeHTML(product.level)}</span>
              ${formats.map((format) => `<span>${escapeHTML(format)}</span>`).join("")}
            </div>

            <div class="product-actions">
              ${primaryAction}
              ${addToListAction}
              <a class="btn o" href="contact.html?topic=Question&amp;message=${encodeURIComponent(`I have a question about ${product.title} (${product.id}).`)}">Ask a question</a>
            </div>

            <div class="trust"><span>Original work</span><span>Private delivery</span><span>Human support</span></div>
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
      </section>`;
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
