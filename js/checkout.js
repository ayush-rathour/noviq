// NOVIQ checkout UI. Wire your gateway by defining window.NOVIQ_PAY(order) (see README note below).
//
// order = { items:[{id,title,price_inr}], amount_inr, amount_paise, method:"upi"|"card"|"netbanking",
//           customer:{name,email} }
// Inside NOVIQ_PAY: create a Razorpay order on YOUR server, open Razorpay Checkout with the
// returned order_id, then call NOVIQ.checkoutResult(true | false, message) from its handler.
(() => {
  const METHODS = [
    ["upi", "UPI", "GPay, PhonePe, Paytm, BHIM"],
    ["card", "Card", "Credit &amp; debit cards"],
    ["netbanking", "Netbanking", "All major Indian banks"],
  ];
  let modal;
  const close = () => document.body.classList.remove("co-open");

  const open = async (ids) => {
    const products = await load;
    const items = ids.map((id) => products.find((p) => p.id === id && p.price_inr > 0)).filter(Boolean);
    if (!items.length) return;
    const total = items.reduce((s, p) => s + p.price_inr, 0);
    const worth = items.reduce((s, p) => s + (p.category === "bundle" ? bundleWorth(p) || p.price_inr : p.price_inr), 0);
    document.body.classList.remove("ct");
    modal?.remove();
    document.body.insertAdjacentHTML("beforeend", `
      <div id="co" role="dialog" aria-modal="true" aria-labelledby="co-t">
        <div class="co-bg" data-co-close></div>
        <form class="co-card" novalidate>
          <button type="button" class="co-x" data-co-close aria-label="Close checkout">×</button>
          <h2 id="co-t">Checkout</h2>
          <ul class="co-items">${items.map((p) => `<li><span>${escapeHTML(p.title)}</span><b>${inr(p.price_inr)}</b></li>`).join("")}</ul>
          <div class="co-field"><label for="co-n">Full name</label><input id="co-n" name="name" autocomplete="name" required></div>
          <div class="co-field"><label for="co-e">Email <small>(your files are sent here)</small></label><input id="co-e" name="email" type="email" autocomplete="email" required></div>
          <fieldset class="co-pay"><legend>Pay with</legend>
            ${METHODS.map(([v, t, s], i) => `<label><input type="radio" name="method" value="${v}"${i ? "" : " checked"}><span><b>${t}</b><small>${s}</small></span></label>`).join("")}
          </fieldset>
          <div class="co-tot"><span>Total</span><span>${worth > total ? `<s class="was">${inr(worth)}</s>` : ""}<b>${inr(total)}</b></span></div>
          <button class="btn co-go" type="submit">Pay ${inr(total)} securely <span>→</span></button>
          <p class="co-msg" role="alert" hidden></p>
          <p class="co-trust">${icon("lock", 14)} Encrypted payment · Instant email delivery · 7-day refund</p>
        </form>
      </div>`);
    modal = document.getElementById("co");
    document.body.classList.add("co-open");
    modal.querySelector("input").focus();
    const msg = modal.querySelector(".co-msg");
    const say = (t, ok) => { msg.hidden = !t; msg.textContent = t || ""; msg.classList.toggle("ok", !!ok); };

    modal.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, name = f.name.value.trim(), email = f.email.value.trim();
      if (!name || !/^\S+@\S+\.\S+$/.test(email)) return say("Please enter your name and a valid email.");
      const order = { items: items.map(({ id, title, price_inr }) => ({ id, title, price_inr })),
        amount_inr: total, amount_paise: total * 100, method: f.method.value, customer: { name, email } };
      if (typeof window.NOVIQ_PAY !== "function") {
        const body = [`Order for ${name} <${email}>`, ...items.map((p) => `- ${p.title} (${inr(p.price_inr)})`), `Total: ${inr(total)}`, `Preferred method: ${order.method}`].join("\n");
        say("Online payment is being switched on. Opening an email so we can complete your order manually.");
        setTimeout(() => (location.href = enquiry("Order", body)), 900);
        return;
      }
      f.querySelector(".co-go").disabled = true; say("Opening secure payment…", true);
      try { await window.NOVIQ_PAY(order); } catch (err) { console.error(err); NOVIQ.checkoutResult(false, "Payment couldn't start. Please try again."); }
    });
  };

  window.NOVIQ = Object.assign(window.NOVIQ || {}, {
    openCheckout: open,
    checkoutResult(ok, message) {
      const f = modal?.querySelector("form"); if (!f) return;
      if (ok) { Cart.clear(); f.innerHTML = `<div class="co-done"><span>${icon("check", 28)}</span><h2>Payment received</h2><p>${escapeHTML(message || "Your files are on their way to your email.")}</p><button class="btn" type="button" data-co-close>Continue browsing</button></div>`; }
      else { f.querySelector(".co-go").disabled = false; const m = f.querySelector(".co-msg"); m.hidden = false; m.classList.remove("ok"); m.textContent = message || "Payment failed. You haven't been charged."; }
    },
  });

  document.addEventListener("click", (e) => {
    const buy = e.target.closest("[data-buy]");
    if (buy) return open([buy.dataset.buy]);
    if (e.target.closest("[data-checkout]")) return open(Cart.get());
    if (e.target.closest("[data-co-close]")) close();
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && close());
})();
