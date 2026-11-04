// The enquiry list is stored locally in the visitor's browser.
const Cart = {
  key: "noviq_cart",

  get() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key) || "[]");
      return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === "string"))] : [];
    } catch {
      return [];
    }
  },

  set(ids) {
    try {
      localStorage.setItem(this.key, JSON.stringify(ids));
    } catch (error) {
      console.warn("NOVIQ couldn't save the enquiry list:", error);
    }
    this.paint();
  },

  add(id) {
    if (!id) return;
    const ids = this.get();
    if (!ids.includes(id)) this.set([...ids, id]);
    else this.paint();
  },

  remove(id) {
    this.set(this.get().filter((item) => item !== id));
  },

  clear() {
    this.set([]);
  },

  async paint() {
    const ids = this.get();
    const count = $("#cc");
    const itemsRoot = $("#ci");
    const summaryRoot = $("#cs");
    if (!count || !itemsRoot || !summaryRoot) return;

    count.textContent = ids.length;
    count.classList.toggle("z", ids.length === 0);

    try {
      const products = await load;
      const selected = ids
        .map((id) => products.find((product) => product.id === id))
        .filter(Boolean);
      const total = selected.reduce((sum, product) => sum + (Number(product.price_inr) || 0), 0);

      if (!selected.length) {
        itemsRoot.innerHTML = `
          <div class="ce">
            <p class="empty-title">Your list is empty</p>
            <p>Find a resource you like and add it here. You can send one enquiry for everything.</p>
            <a href="explore.html">Explore resources →</a>
          </div>`;
        summaryRoot.innerHTML = "";
        return;
      }

      itemsRoot.innerHTML = selected.map((product) => `
        <div class="ci">
          <div class="ci-info">
            <b>${escapeHTML(product.title)}</b>
            <small>${product.price_inr ? `₹${Number(product.price_inr).toLocaleString("en-IN")}` : "Free"}</small>
          </div>
          <button type="button" data-rm="${escapeHTML(product.id)}" aria-label="Remove ${escapeHTML(product.title)} from enquiry list">×</button>
        </div>`).join("");

      const orderMessage = [
        "I'd like to enquire about the following NOVIQ resources:",
        ...selected.map((product) => `- ${product.title} (${product.price_inr ? `₹${product.price_inr}` : "Free"}) · ID: ${product.id}`),
        `Total (indicative): ₹${total.toLocaleString("en-IN")}`,
        "Please share the next steps for ordering.",
      ].join("\n");

      summaryRoot.innerHTML = `
        <div class="tot">
          <span>Total <small>(indicative)</small></span>
          <b>₹${total.toLocaleString("en-IN")}</b>
        </div>
        <a class="btn" href="${enquiry("Order enquiry", orderMessage)}">
          Continue by email <span>→</span>
        </a>
        <button class="btn o" type="button" id="cl">Clear list</button>
        <p class="cart-note">No payment is taken here. We'll confirm availability and payment details by email.</p>`;
    } catch (error) {
      console.error("NOVIQ enquiry list error:", error);
      itemsRoot.innerHTML = '<p class="ce">Your list could not be loaded. Please refresh the page.</p>';
      summaryRoot.innerHTML = "";
    }
  },
};

document.body.insertAdjacentHTML(
  "beforeend",
  '<aside id="ct" aria-label="Enquiry list" aria-live="polite"><div class="dh"><h3>Enquiry list</h3><button class="ib cx" type="button" aria-label="Close enquiry list">×</button></div><div id="ci"></div><div id="cs"></div></aside>',
);

const toggleCart = (open) => document.body.classList.toggle("ct", open);

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const removeButton = event.target.closest("[data-rm]");

  if (addButton) {
    Cart.add(addButton.dataset.add);
    toggleCart(true);
  }
  if (removeButton) Cart.remove(removeButton.dataset.rm);
  if (event.target.closest("#cb")) toggleCart(true);
  if (event.target.closest(".cx")) toggleCart(false);
  if (event.target.closest("#cl")) Cart.clear();
});

$("#ov")?.addEventListener("click", () => toggleCart(false));
addEventListener("keydown", (event) => {
  if (event.key === "Escape") toggleCart(false);
});

Cart.paint();
