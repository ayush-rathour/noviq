/* NOVIQ support page: quick-help shortcuts, topic hints and FAQ search. */
(() => {
  "use strict";
  const cf = document.getElementById("cf");
  if (!cf) return;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const topic = document.getElementById("cf-topic"),
    message = document.getElementById("cf-message"),
    hint = document.getElementById("cf-hint"),
    ref = document.getElementById("cf-ref");

  const HINTS = {
    "Order enquiry": [
      "Which resource would you like? Add the email you'll order with.",
      "Which resource are you interested in?",
    ],
    "Payment help": [
      "Include the amount, the resource and the 12-digit UPI transaction ID.",
      "Tell us what happened with your payment.",
    ],
    "Delivery issue": [
      "Include your order reference, the email you ordered with and the UPI transaction ID.",
      "Tell us what you haven't received.",
    ],
    "Refund request": [
      "Include your order reference, the email you ordered with and what went wrong. Please write within 7 days of receiving your files.",
      "What went wrong with your order?",
    ],
    Question: [
      "Ask anything about contents, level or formats.",
      "What would you like to know?",
    ],
    Support: [
      "Tell us what you need and we'll take it from there.",
      "How can we help?",
    ],
  };
  const applyHint = () => {
    const h = HINTS[topic.value] || HINTS.Support;
    hint.textContent = h[0];
    message.placeholder = h[1];
  };
  topic.addEventListener("change", applyHint);
  applyHint();

  // Quick help: choose the topic and drop in a short template to fill in.
  const buttons = [...document.querySelectorAll(".help-btn")];
  let lastTemplate = "";
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      const opt = [...topic.options].find(
        (o) => o.value === b.dataset.topic || o.text === b.dataset.topic,
      );
      if (opt) topic.value = opt.value;
      applyHint();
      const tpl = b.dataset.msg || "";
      // Never overwrite something the person typed themselves.
      if (!message.value.trim() || message.value === lastTemplate) {
        message.value = tpl;
        lastTemplate = tpl;
      }
      buttons.forEach((x) => x.classList.toggle("on", x === b));
      cf.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      (ref && /Delivery|Refund|Payment/.test(b.dataset.topic)
        ? ref
        : message
      ).focus({ preventScroll: true });
    }),
  );

  // FAQ search
  const q = document.getElementById("faq-q"),
    empty = document.getElementById("faq-empty"),
    items = [...document.querySelectorAll("#faq details")];
  if (q) {
    q.addEventListener("input", () => {
      const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      let shown = 0,
        last = null;
      items.forEach((d) => {
        const hit = words.every((w) => d.textContent.toLowerCase().includes(w));
        d.hidden = !hit;
        if (hit) {
          shown++;
          last = d;
        }
      });
      empty.hidden = shown > 0;
      if (words.length && shown === 1) last.open = true;
    });
  }
})();
