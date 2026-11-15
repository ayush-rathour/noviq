// The cart is stored locally in the visitor's browser.
const Cart = {
  key: "noviq_cart",

  get() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.key) || "[]");
      return Array.isArray(saved)
        ? [...new Set(saved.filter((id) => typeof id === "string"))]
        : [];
    } catch {
      return [];
    }
  },

  set(ids) {
    try {
      localStorage.setItem(this.key, JSON.stringify(ids));
    } catch (error) {
      console.warn("NOVIQ couldn't save the cart:", error);
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
      const total = selected.reduce(
        (sum, product) => sum + (Number(product.price_inr) || 0),
        0,
      );

      if (!selected.length) {
        itemsRoot.innerHTML = `
          <div class="ce">
            <p class="empty-title">Your cart is empty</p>
            <p>Find a resource you like and add it here. Check out once for everything.</p>
            <a href="explore.html">Explore resources →</a>
          </div>`;
        summaryRoot.innerHTML = "";
        return;
      }

      itemsRoot.innerHTML = selected
        .map(
          (product) => `
        <div class="ci">
          <div class="ci-info">
            <b>${escapeHTML(product.title)}</b>
            <small>${product.price_inr ? `₹${Number(product.price_inr).toLocaleString("en-IN")}` : "Free"}</small>
          </div>
          <button type="button" data-rm="${escapeHTML(product.id)}" aria-label="Remove ${escapeHTML(product.title)} from cart">×</button>
        </div>`,
        )
        .join("");

      const orderMessage = [
        "I'd like to enquire about the following NOVIQ resources:",
        ...selected.map(
          (product) =>
            `- ${product.title} (${product.price_inr ? `₹${product.price_inr}` : "Free"}) · ID: ${product.id}`,
        ),
        `Total (indicative): ₹${total.toLocaleString("en-IN")}`,
        "Please share the next steps for ordering.",
      ].join("\n");

      summaryRoot.innerHTML = `
        <div class="tot">
          <span>Total</span>
          <b>₹${total.toLocaleString("en-IN")}</b>
        </div>
        <button class="btn" type="button" data-checkout>Checkout · ₹${total.toLocaleString("en-IN")} <span>→</span></button>
        <a class="cart-alt" href="${enquiry("Order enquiry", orderMessage)}">Prefer to order by email?</a>
        <button class="btn o" type="button" id="cl">Clear cart</button>
        <p class="cart-note">Pay by UPI · Files sent to your email · 7-day refund</p>`;
    } catch (error) {
      console.error("NOVIQ cart error:", error);
      itemsRoot.innerHTML =
        '<p class="ce">Your list could not be loaded. Please refresh the page.</p>';
      summaryRoot.innerHTML = "";
    }
  },
};

document.body.insertAdjacentHTML(
  "beforeend",
  '<aside id="ct" aria-label="Cart" aria-live="polite"><div class="dh"><h3>Your cart</h3><button class="ib cx" type="button" aria-label="Close cart">×</button></div><div id="ci"></div><div id="cs"></div></aside>',
);

// Small confirmation toast: shows what changed without opening the drawer.
let toastTimer;
const hideToast = () => {
  clearTimeout(toastTimer);
  $("#toast")?.classList.remove("show");
};
const showToast = (message) => {
  let el = $("#toast");
  if (!el) {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="toast" role="status" aria-live="polite"></div>',
    );
    el = $("#toast");
    el.addEventListener("mouseenter", () => clearTimeout(toastTimer));
    el.addEventListener(
      "mouseleave",
      () => (toastTimer = setTimeout(hideToast, 2200)),
    );
  }
  el.innerHTML = `<span class="t-ico">${icon("check", 16)}</span><span class="t-msg"></span><button type="button" data-open-list>View list</button>`;
  el.querySelector(".t-msg").textContent = message;
  // restart the entrance so repeated adds feel acknowledged
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  const badge = $("#cb");
  badge?.classList.remove("bump");
  void badge?.offsetWidth;
  badge?.classList.add("bump");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4200);
};

const toggleCart = (open) => document.body.classList.toggle("ct", open);

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const removeButton = event.target.closest("[data-rm]");

  if (addButton) {
    const id = addButton.dataset.add;
    const already = Cart.get().includes(id);
    Cart.add(id);
    addButton.innerHTML = "✓ In your cart";
    addButton.classList.add("added");
    load
      .then((list) => list.find((item) => item.id === id))
      .then((item) =>
        showToast(
          already
            ? `${item ? item.title : "This resource"} is already in your list`
            : `${item ? item.title : "Resource"} added to your cart`,
        ),
      )
      .catch(() => showToast("Added to your cart"));
  }
  if (event.target.closest("[data-open-list]")) {
    hideToast();
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

/* ---------- UPI QR code (byte mode, error correction M, versions 1-10) ---------- */
const qrMatrix = (text) => {
  const data = [...new TextEncoder().encode(text)];
  const ECC = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
    BLK = [1, 1, 2, 2, 2, 4, 4, 4, 5, 5];
  const raw = (v) => {
    let r = (16 * v + 128) * v + 64;
    if (v >= 2) {
      const n = Math.floor(v / 7) + 2;
      r -= (25 * n - 10) * n - 55;
      if (v >= 7) r -= 36;
    }
    return r;
  };
  const cap = (v) => Math.floor(raw(v) / 8) - ECC[v - 1] * BLK[v - 1];
  let ver = 1;
  while (ver <= 10 && 4 + (ver < 10 ? 8 : 16) + data.length * 8 > cap(ver) * 8)
    ver++;
  if (ver > 10) throw new Error("QR text too long");

  const bits = [],
    put = (v, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    };
  put(4, 4);
  put(data.length, ver < 10 ? 8 : 16);
  data.forEach((b) => put(b, 8));
  const capBits = cap(ver) * 8;
  put(0, Math.min(4, capBits - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) put(pad, 8);
  const cw = [];
  for (let i = 0; i < bits.length; i += 8)
    cw.push(parseInt(bits.slice(i, i + 8).join(""), 2));

  const mul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  };
  const gen = (d) => {
    const r = new Array(d).fill(0);
    r[d - 1] = 1;
    let root = 1;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < d) r[j] ^= r[j + 1];
      }
      root = mul(root, 2);
    }
    return r;
  };
  const rs = (blk, g) => {
    const res = g.map(() => 0);
    for (const b of blk) {
      const f = b ^ res.shift();
      res.push(0);
      g.forEach((c, i) => (res[i] ^= mul(c, f)));
    }
    return res;
  };
  const nb = BLK[ver - 1],
    ecl = ECC[ver - 1],
    rawCw = Math.floor(raw(ver) / 8);
  const nShort = nb - (rawCw % nb),
    shortLen = Math.floor(rawCw / nb),
    g = gen(ecl),
    blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - ecl + (i < nShort ? 0 : 1),
      d = cw.slice(k, k + len);
    k += len;
    const e = rs(d, g);
    if (i < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++)
    blocks.forEach((b, j) => {
      if (i !== shortLen - ecl || j >= nShort) out.push(b[i]);
    });

  const n = ver * 4 + 17,
    mod = Array.from({ length: n }, () => new Array(n).fill(false)),
    fn = Array.from({ length: n }, () => new Array(n).fill(false)),
    set = (x, y, d) => {
      mod[y][x] = d;
      fn[y][x] = true;
    },
    bit = (x, i) => ((x >>> i) & 1) !== 0;
  for (let i = 0; i < n; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  [
    [3, 3],
    [n - 4, 3],
    [3, n - 4],
  ].forEach(([cx, cy]) => {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy)),
          x = cx + dx,
          y = cy + dy;
        if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
      }
  });
  const na = ver > 1 ? Math.floor(ver / 7) + 2 : 0;
  if (na) {
    const step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2,
      pos = [6];
    for (let p = n - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
    pos.forEach((cy, i) =>
      pos.forEach((cx, j) => {
        if (
          (i === 0 && j === 0) ||
          (i === 0 && j === na - 1) ||
          (i === na - 1 && j === 0)
        )
          return;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }),
    );
  }
  const fmt = (mask) => {
    let r = mask;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((mask << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(b, i));
    set(8, 7, bit(b, 6));
    set(8, 8, bit(b, 7));
    set(7, 8, bit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(b, i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, bit(b, i));
    for (let i = 8; i < 15; i++) set(8, n - 15 + i, bit(b, i));
    set(8, n - 8, true);
  };
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const a = n - 11 + (i % 3),
        c = Math.floor(i / 3);
      set(a, c, bit(b, i));
      set(c, a, bit(b, i));
    }
  }
  fmt(0);
  let k = 0;
  for (let r = n - 1; r >= 1; r -= 2) {
    if (r === 6) r = 5;
    for (let v = 0; v < n; v++)
      for (let j = 0; j < 2; j++) {
        const x = r - j,
          y = ((r + 1) & 2) === 0 ? n - 1 - v : v;
        if (!fn[y][x] && k < out.length * 8) {
          mod[y][x] = bit(out[k >>> 3], 7 - (k & 7));
          k++;
        }
      }
  }
  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const apply = (m) => {
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
  };
  const penalty = () => {
    let p = 0;
    const lines = mod.map((r) => r.map(Number).join(""));
    for (let x = 0; x < n; x++)
      lines.push(mod.map((r) => Number(r[x])).join(""));
    for (const s of lines) {
      (s.match(/0+|1+/g) || []).forEach((r) => {
        if (r.length >= 5) p += r.length - 2;
      });
      p += 40 * (s.match(/(?=10111010000|00001011101)/g) || []).length;
    }
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) {
        const c = mod[y][x];
        if (
          c === mod[y][x + 1] &&
          c === mod[y + 1][x] &&
          c === mod[y + 1][x + 1]
        )
          p += 3;
      }
    const dark = mod.flat().filter(Boolean).length;
    return p + (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
  };
  let best = 0,
    bp = Infinity;
  for (let m = 0; m < 8; m++) {
    apply(m);
    fmt(m);
    const p = penalty();
    if (p < bp) {
      bp = p;
      best = m;
    }
    apply(m);
  }
  apply(best);
  fmt(best);
  return mod;
};
const qrSVG = (text) => {
  const m = qrMatrix(text),
    n = m.length,
    q = 4;
  let d = "";
  m.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) d += `M${x + q},${y + q}h1v1h-1z`;
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + q * 2} ${n + q * 2}" shape-rendering="crispEdges" role="img" aria-label="UPI payment QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#0d1230"/></svg>`;
};

/* ---------- Checkout: pay by UPI, confirm, get files by email ---------- */
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newRef = () =>
  "NVQ-" +
  Array.from(
    crypto.getRandomValues(new Uint8Array(6)),
    (b) => REF_CHARS[b % 32],
  ).join("");
const upiLink = (amount, ref) =>
  `upi://pay?pa=${encodeURIComponent(SITE.upi)}&pn=${encodeURIComponent(SITE.upiName)}&am=${amount}.00&cu=INR&tn=${encodeURIComponent("NOVIQ " + ref)}`;

const Checkout = {
  el: null,
  close() {
    document.body.classList.remove("co-open");
  },
  pane(name) {
    this.el
      .querySelectorAll("[data-pane]")
      .forEach((p) => (p.hidden = p.dataset.pane !== name));
    this.el
      .querySelectorAll(".co-steps li")
      .forEach((li) =>
        li.classList.toggle(
          "on",
          li.dataset.step === name ||
            (name === "done" && li.dataset.step === "confirm"),
        ),
      );
    this.el.querySelector(".co-card").scrollTop = 0;
  },
  async open(ids) {
    const products = await load;
    const items = ids
      .map((id) => products.find((p) => p.id === id && p.price_inr > 0))
      .filter(Boolean);
    if (!items.length) return;
    const total = items.reduce((s, p) => s + p.price_inr, 0),
      worth = items.reduce(
        (s, p) =>
          s +
          (p.category === "bundle"
            ? bundleWorth(p) || p.price_inr
            : p.price_inr),
        0,
      ),
      ref = newRef(),
      list = items
        .map((p) => `- ${p.title} (${inr(p.price_inr)}) [${p.id}]`)
        .join("\n"),
      ready = !!SITE.upi;
    document.body.classList.remove("ct");
    this.el?.remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="co" role="dialog" aria-modal="true" aria-labelledby="co-t">
        <div class="co-bg" data-co-close></div>
        <div class="co-card">
          <button type="button" class="co-x" data-co-close aria-label="Close checkout">×</button>
          <h2 id="co-t">Checkout</h2>
          <ol class="co-steps"><li class="on" data-step="pay"><b>1</b>Pay</li><li data-step="confirm"><b>2</b>Confirm</li><li data-step="files"><b>3</b>Get files</li></ol>

          <div data-pane="pay">
            <ul class="co-items">${items.map((p) => `<li><span>${escapeHTML(p.title)}</span><b>${inr(p.price_inr)}</b></li>`).join("")}</ul>
            <div class="co-tot"><span>Total</span><span>${worth > total ? `<s class="was">${inr(worth)}</s>` : ""}<b>${inr(total)}</b></span></div>
            ${
              ready
                ? `
            <div class="co-upi">
              <div class="co-qr">${qrSVG(upiLink(total, ref))}</div>
              <div class="co-how">
                <b>Scan with any UPI app</b>
                <small>GPay, PhonePe, Paytm, BHIM. The amount is filled in for you.</small>
                <a class="btn co-app" href="${escapeHTML(upiLink(total, ref))}">Open UPI app <span>→</span></a>
                <button type="button" class="co-copy" data-copy="${escapeHTML(SITE.upi)}"><span>${escapeHTML(SITE.upi)}</span><i>Copy</i></button>
              </div>
            </div>
            <button type="button" class="btn co-go" data-co-next>I've paid ${inr(total)} <span>→</span></button>`
                : `
            <p class="co-msg">Online payment is being set up. Send us your order by email and we'll share payment details.</p>
            <a class="btn co-go" href="${enquiry("Order enquiry", `I'd like to order:\n${list}\nTotal: ${inr(total)}`)}">Order by email <span>→</span></a>`
            }
            <div class="co-soon"><span>Card</span><span>Netbanking</span><small>Coming soon</small></div>
          </div>

          <form data-pane="confirm" hidden novalidate>
            <p class="co-lead">Almost done. Tell us where to send your files and which payment to match.</p>
            <div class="co-field"><label for="co-e">Your email <small>(files are sent here)</small></label><input id="co-e" name="email" type="email" autocomplete="email" inputmode="email" required></div>
            <div class="co-field"><label for="co-u">UPI transaction ID <small>(12 digits, shown in your UPI app)</small></label><input id="co-u" name="utr" inputmode="numeric" maxlength="12" pattern="[0-9]{12}" placeholder="e.g. 412345678901" required></div>
            <input type="text" name="botcheck" tabindex="-1" autocomplete="off" hidden>
            <button class="btn co-go" type="submit">Confirm order <span>→</span></button>
            <button type="button" class="co-back" data-co-back>← Back to payment</button>
            <p class="co-msg" role="alert" hidden></p>
          </form>

          <div data-pane="done" class="co-done" hidden></div>
          <p class="co-trust">${icon("lock", 14)} Order ${ref} · 7-day refund promise</p>
        </div>
      </div>`,
    );
    const el = (this.el = document.getElementById("co"));
    document.body.classList.add("co-open");
    el.querySelector("[data-co-next],.co-go")?.focus({ preventScroll: true });

    const form = el.querySelector("form"),
      msg = form.querySelector(".co-msg");
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-co-next]")) {
        this.pane("confirm");
        form.email.focus();
      }
      if (e.target.closest("[data-co-back]")) this.pane("pay");
      const c = e.target.closest("[data-copy]");
      if (c)
        navigator.clipboard?.writeText(c.dataset.copy).then(() => {
          c.querySelector("i").textContent = "Copied ✓";
          setTimeout(() => (c.querySelector("i").textContent = "Copy"), 1800);
        });
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = form.email.value.trim(),
        utr = form.utr.value.trim();
      msg.hidden = false;
      msg.classList.remove("ok");
      if (!/^\S+@\S+\.\S+$/.test(email))
        return (msg.textContent = "Please enter a valid email address.");
      if (!/^\d{12}$/.test(utr))
        return (msg.textContent =
          "The UPI transaction ID is 12 digits. Find it in your payment details.");
      const btn = form.querySelector(".co-go"),
        label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Sending…";
      msg.hidden = true;
      try {
        const body = new FormData();
        body.append("access_key", SITE.formKey);
        body.append("subject", `NOVIQ order ${ref} · ${inr(total)}`);
        body.append("from_name", "NOVIQ Store");
        body.append("email", email);
        body.append(
          "message",
          `Order ${ref}\nAmount: ${inr(total)} (UPI)\nUPI transaction ID: ${utr}\nCustomer email: ${email}\n\nItems:\n${list}`,
        );
        body.append("botcheck", form.botcheck.value);
        const res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { Accept: "application/json" },
          body,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) throw new Error("send failed");
        Cart.clear();
        el.querySelector(".co-done").innerHTML =
          `<span class="co-check">${icon("check", 30)}</span><h2>Order received</h2><p>We're matching your payment now. Your files will be emailed to <b>${escapeHTML(email)}</b> as soon as it's confirmed.</p><div class="co-ref"><small>Order reference</small><b>${ref}</b></div><button class="btn" type="button" data-co-close>Keep browsing</button>`;
        this.pane("done");
      } catch (err) {
        console.error("NOVIQ order error:", err);
        btn.disabled = false;
        btn.innerHTML = label;
        msg.hidden = false;
        msg.innerHTML = `We couldn't send your order. Check your connection and try again, or <a href="${enquiry("Order " + ref, `Order ${ref}\nUPI transaction ID: ${utr}\nEmail: ${email}\n${list}`)}">send it by email</a>.`;
      }
    });
  },
};

document.addEventListener("click", (e) => {
  const buy = e.target.closest("[data-buy]");
  if (buy) return Checkout.open([buy.dataset.buy]);
  if (e.target.closest("[data-checkout]")) return Checkout.open(Cart.get());
  if (e.target.closest("[data-co-close]")) Checkout.close();
});
document.addEventListener(
  "keydown",
  (e) => e.key === "Escape" && Checkout.close(),
);
