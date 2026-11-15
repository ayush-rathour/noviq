/* NOVIQ assistant
 * A built-in guide that runs entirely in the browser. It searches the product
 * catalogue and Blog Notes, and answers common questions from the site's own
 * FAQ. No external service, API key or tracking is involved.
 */
(() => {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */
  const esc = (s) =>
    String(s ?? "").replace(
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
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const money = (p) =>
    p.price_inr > 0
      ? `₹${Number(p.price_inr).toLocaleString("en-IN")}`
      : "Free";
  const FMT = { "notion template": "Notion", "html/css/js": "HTML" };
  const fmtLabel = (f) => FMT[String(f).toLowerCase()] || f;
  const contactHref = (topic, message) =>
    "contact.html?" + new URLSearchParams({ topic, message }).toString();

  /* ------------------------------------------------------------------ *
   * Text processing
   * ------------------------------------------------------------------ */
  const STOP = new Set(
    (
      "a an the is are am was were i me my mine you your yours we our us to of for in on at and or with " +
      "about can could would should do does did how what whats which where when who whom why it its this " +
      "that these those there any some please tell show give want need looking look find get got have has " +
      "had be been will from by as if so just like hi hello hey also more ok okay yes no not into out up " +
      "down over under below above than then them they their resource resources product products stuff " +
      "thing things anything something someone recommend suggest best good top popular new available one " +
      "ones im id ive let lets help price prices pricing cost costs much download downloads difference " +
      "between explain explained explanation versus vs meaning understand tell"
    ).split(" "),
  );
  // Words that set a filter rather than describe the topic.
  const FILTER_TOKENS = new Set(
    "free paid premium beginner beginners newbie intermediate advanced experienced cheap cheapest affordable budget pdf rs inr".split(
      " ",
    ),
  );
  const CAT_WORDS = {
    build: "build",
    learn: "learn",
    organize: "organize",
    organise: "organize",
    practice: "practice",
    bundle: "bundle",
    bundles: "bundle",
  };
  const SYN = {
    js: ["javascript"],
    py: ["python"],
    reactjs: ["react"],
    cheatsheet: ["cheat", "sheet"],
    cheatsheets: ["cheat", "sheet"],
    exercise: ["practice"],
    exercises: ["practice"],
    challenge: ["practice"],
    challenges: ["practice"],
    drills: ["practice"],
    tutorial: ["learn"],
    tutorials: ["learn"],
    study: ["learn"],
    studying: ["learn"],
    course: ["learn"],
    todo: ["tracker"],
    planner: ["tracker"],
    internet: ["internet", "web"],
    safety: ["security"],
    safe: ["security"],
    hacking: ["security"],
    privacy: ["security"],
    sql: ["database"],
    databases: ["database"],
    hosting: ["deploy"],
    deployment: ["deploy"],
    publish: ["deploy"],
    github: ["github", "git"],
    design: ["design", "ui", "ux"],
    flexbox: ["flexbox", "css"],
    grid: ["grid", "css"],
  };

  const stem = (w) => {
    if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss"))
      return w.slice(0, -1);
    return w;
  };
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9₹+# ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const tokens = (text, { keepStop = false } = {}) => {
    const out = [];
    for (const raw of norm(text).split(" ")) {
      if (!raw || /^\d+$/.test(raw) || raw === "₹") continue;
      if (!keepStop && STOP.has(raw)) continue;
      const extra = SYN[raw];
      if (extra) out.push(...extra);
      if (!extra || !extra.includes(raw)) out.push(stem(raw));
    }
    return out;
  };

  /* ------------------------------------------------------------------ *
   * Search index
   * ------------------------------------------------------------------ */
  const buildIndex = (products, notes) => {
    const entries = [];
    products.forEach((p) =>
      entries.push({
        kind: "product",
        item: p,
        fields: [
          [p.title, 5],
          [String(p.id || "").replace(/-/g, " "), 2],
          [p.category, 3],
          [p.description, 2],
          [(p.includes || []).join(" "), 1.5],
          [p.audience, 1],
          [(p.format || []).join(" "), 2],
          [p.level, 1.2],
        ],
      }),
    );
    notes.forEach((n) =>
      entries.push({
        kind: "note",
        item: n,
        fields: [
          [n.title, 5],
          [n.category, 2],
          [n.description, 2],
          [(n.sections || []).map((s) => s.heading).join(" "), 1.5],
          [(n.terms || []).map((t) => t.term).join(" "), 2],
          [n.intro, 1],
          [n.takeaway, 0.8],
        ],
      }),
    );
    entries.forEach(
      (e) => (e.fields = e.fields.map(([t, w]) => [new Set(tokens(t)), w])),
    );
    return entries;
  };

  // Edit distance, capped: returns max+1 as soon as it can't be within `max`.
  const within = (a, b, max) => {
    if (Math.abs(a.length - b.length) > max) return false;
    let prev2 = null;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let low = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
        if (
          prev2 &&
          i > 1 &&
          j > 1 &&
          a[i - 1] === b[j - 2] &&
          a[i - 2] === b[j - 1]
        )
          cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
        if (cur[j] < low) low = cur[j];
      }
      if (low > max) return false;
      prev2 = prev;
      prev = cur;
    }
    return prev[b.length] <= max;
  };

  const matchToken = (set, q) => {
    if (set.has(q)) return 1;
    for (const t of set) {
      if (q.length >= 3 && t.startsWith(q)) return 0.7;
      if (t.length >= 4 && q.length >= 4 && q.startsWith(t)) return 0.7;
    }
    // Typos: "javascrpt", "notoin".
    if (q.length >= 5)
      for (const t of set)
        if (t.length >= 5 && within(q, t, q.length >= 9 ? 2 : 1)) return 0.6;
    return 0;
  };

  // Words people commonly mistype that decide which answer they get.
  const KEY_WORDS =
    "order orders ordering refund refunds delivery delivered payment payments contact support bundle bundles notion javascript python resources explore download beginner beginners security database tracker practice workbook template templates invoice received receive transaction discount purchase checkout".split(
      " ",
    );
  const autocorrect = (lower, vocab) => {
    const known = vocab || new Set();
    return lower
      .split(" ")
      .map((w) => {
        if (
          w.length < 5 ||
          STOP.has(w) ||
          KEY_WORDS.includes(w) ||
          known.has(w) ||
          /\d/.test(w)
        )
          return w;
        const max = w.length >= 9 ? 2 : 1;
        const hit =
          KEY_WORDS.find((k) => within(w, k, max)) ||
          [...known].find((k) => k.length >= 5 && within(w, k, max));
        return hit || w;
      })
      .join(" ");
  };

  const scoreEntry = (entry, qTokens) => {
    let sum = 0,
      hit = 0;
    for (const q of qTokens) {
      let best = 0;
      for (const [set, w] of entry.fields) {
        const m = matchToken(set, q) * w;
        if (m > best) best = m;
      }
      if (best > 0) hit++;
      sum += best;
    }
    if (!hit) return 0;
    return sum * (0.5 + 0.5 * (hit / qTokens.length));
  };

  /* ------------------------------------------------------------------ *
   * Question and filter detection
   * ------------------------------------------------------------------ */
  const NOTE_RE =
    /\b(blog|blogs|note|notes|article|articles|read|reading|explain|explained|explanation|what is|what are|what's|whats|how does|how do|why|difference|versus|vs|meaning|understand|works?)\b/;

  const budgetOf = (s) => {
    const m =
      s.match(
        /(?:under|below|less than|within|upto|up to|max(?:imum)?|budget(?: of)?|around)\s*(?:rs\.?|inr|₹)?\s*(\d{2,5})/,
      ) || s.match(/(?:₹|rs\.?\s*|inr\s*)(\d{2,5})/);
    return m ? Number(m[1]) : 0;
  };

  const PAGES = [
    {
      re: /\b(explore|all resources|catalogue|catalog|shop|store)\b/,
      href: "explore.html",
      label: "Explore all resources",
    },
    { re: /\bbundles?\b/, href: "bundles.html", label: "View bundles" },
    {
      re: /\b(free library|free resources?|free downloads?|free page)\b/,
      href: "free-resources.html",
      label: "Open the free library",
    },
    {
      re: /\b(blog|notes|articles)\b/,
      href: "blog.html",
      label: "Open Blog Notes",
    },
    { re: /\babout\b/, href: "about.html", label: "About NOVIQ" },
    { re: /\bcontact\b/, href: "contact.html", label: "Contact NOVIQ" },
    { re: /\brefund/, href: "refund.html", label: "Read the refund policy" },
  ];

  const steps = (items) =>
    `<ol class="nq-steps">${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
  const talk = (topic, message, label) =>
    link(contactHref(topic, message), label);

  const FAQ = [
    {
      id: "greet",
      re: /^\s*(hi+|hello+|hey+|hola|namaste|yo|good (morning|afternoon|evening))\b[\s!.,?]*$/,
      html: () =>
        "<p>Hi! I'm the NOVIQ guide. I can find the right resource for you, explain how ordering and payment work, and help if something goes wrong with an order.</p><p>What would you like to do?</p>",
      chips: [
        "How do I order?",
        "Show free resources",
        "Best for beginners",
        "I paid but got no files",
      ],
      fb: false,
    },
    {
      id: "thanks",
      re: /\b(thanks|thank you|thx|ty|appreciate|shukriya|dhanyavad)\b/,
      html: () => "<p>You're welcome! Anything else I can help you find?</p>",
      chips: ["Show free resources", "Read blog notes", "Contact support"],
      fb: false,
    },
    {
      id: "bye",
      re: /^\s*(bye|goodbye|see you|cya|that'?s all|no thanks)\b/,
      html: () => "<p>Goodbye! I'll be here if you need anything else.</p>",
      chips: [],
      fb: false,
    },
    {
      id: "help",
      re: /^\s*(help|menu|options|what can you do|what can i ask|how can you help|how do you help)\b/,
      html: () =>
        "<p>Here's what I can do:</p><ul><li><b>Find resources</b>: ask for a topic, level, price or format</li><li><b>Explain ordering</b>: steps, UPI payment and delivery</li><li><b>Fix problems</b>: payment issues, missing files, refunds</li><li><b>Connect you to the team</b> if I can't answer</li></ul><p>Tap a suggestion below, or just type your question.</p>",
      chips: [
        "How do I order?",
        "Show free resources",
        "Payment methods",
        "I paid but got no files",
        "Contact support",
      ],
      fb: false,
    },
    {
      id: "identity",
      re: /\b(who are you|what are you|are you (a |an )?(bot|ai|human|real|robot|person)|your name)\b/,
      html: () =>
        "<p>I'm the NOVIQ guide, an automated assistant built into this site. I search NOVIQ's resources, free downloads and Blog Notes, and answer from the site's own FAQ. I'm not a person, so for anything I can't answer, the team replies by email.</p>",
      chips: ["How do I order?", "Show free resources", "Contact support"],
    },

    /* ---- support: specific problems first, so they win over general topics ---- */
    {
      id: "notreceived",
      re: /\b(i paid|ive paid|i have paid|already paid|just paid|payment (done|made|completed|successful))\b.{0,60}\b(no|not|nothing|didn t|haven t|havent|still|yet|never|waiting)\b|\b(not|nothing|haven t|havent|didn t|didnt|never|yet to|still waiting|waiting).{0,30}\b(received|recieved|receive|get|got|arrive|arrived|delivered|come|came)\b.{0,30}\b(file|files|email|mail|order|product|resource|link|pack)\b|\bwhere (is|are) my (file|files|order|email|mail|download|resource|pack)\b|\b(order|delivery) status\b|\btrack(ing)? (my |the )?(order|delivery)\b|\bno (email|mail|files?|link)\b|\b(received|got)\b.{0,12}\b(nothing|no (email|mail|files?))\b/,
      html: () =>
        `<p>Sorry for the wait. Every order is matched to its payment by hand, so files are emailed once the payment is confirmed. Please check these first:</p>${steps(
          [
            "<b>Look in spam or junk.</b> Our email can land there.",
            "<b>Check the email you entered.</b> Files go to the address from checkout.",
            "<b>Still nothing?</b> Send us your order reference and UPI transaction ID and we'll look into it.",
          ],
        )}<p>${talk("Delivery issue", "I paid but haven't received my files.\nOrder reference: \nUPI transaction ID: \nEmail I ordered with: ", "Report a delivery issue")}</p>`,
      chips: [
        "Where is the transaction ID?",
        "Refund policy",
        "Contact support",
      ],
    },
    {
      id: "payfail",
      re: /\b(payment|upi|transaction|txn|qr)\b.{0,20}\b(fail|failed|failing|not working|error|pending|stuck|declined|issue|problem|problems|won t work|doesn t work|isn t working)\b|\b(money|amount|payment)\b.{0,15}\b(deducted|debited|cut|charged|gone)\b|\b(failed|pending) (payment|transaction)\b|\bqr\b.{0,15}\b(not|won t|doesn t|can t)\b/,
      html: () =>
        `<p>Sorry about that. Here's what to do:</p>${steps([
          "<b>Payment failed in your UPI app?</b> Your bank usually returns the money on its own. You can then try again from checkout.",
          "<b>Payment went through?</b> Note the 12-digit transaction ID and enter it at checkout. If you've closed the page, send it to us and we'll match it to your order.",
          "<b>QR won't scan?</b> On your phone tap <i>Open UPI app</i>, or copy the UPI ID with the copy icon and pay to it in your UPI app.",
        ])}<p>${talk("Payment help", "I need help with my payment.\nResource: \nAmount: \nUPI transaction ID: \nWhat happened: ", "Get payment help")}</p>`,
      chips: [
        "Where is the transaction ID?",
        "I paid but got no files",
        "Contact support",
      ],
    },
    {
      id: "txnid",
      re: /\b(transaction|txn|utr|reference) (id|number|no)\b|\bwhere.{0,25}(find|see|get|check).{0,25}\b(transaction|utr|txn)\b|\b12 digit\b/,
      html: () =>
        `<p>The transaction ID is a 12-digit number your UPI app creates when you pay. To find it:</p>${steps(
          [
            "Open your UPI app and go to your payment history.",
            "Tap the payment you just made.",
            "Look for <i>Transaction ID</i>, <i>UTR</i> or <i>UPI Ref No.</i> (the name depends on the app) and enter those 12 digits at checkout.",
          ],
        )}`,
      chips: ["How do I order?", "Payment methods", "Contact support"],
    },
    {
      id: "wrongdetails",
      re: /\b(wrong|incorrect|mistake|typo|typed|change|update|correct|edit)\b.{0,25}\b(email|mail|transaction|utr|details|order)\b/,
      html: () =>
        `<p>No problem, we can fix that. Write to us with your order reference and the correct details, and we'll update your order.</p><p>${talk("Order enquiry", "I entered a wrong detail in my order.\nOrder reference: \nWhat I entered: \nCorrect detail: ", "Send the correction")}</p>`,
      chips: ["I paid but got no files", "Contact support"],
    },
    {
      id: "refundtime",
      re: /\bhow (long|many days).{0,25}refund|\brefund.{0,25}\b(time|take|takes|days|when|how long|status|arrive|credited)\b|\bwhen.{0,15}(get|receive).{0,10}(my )?refund/,
      html: () =>
        `<p>Approved refunds go back to the same account or UPI ID the payment came from, usually within 5 to 7 business days. Banks sometimes take a little longer to show it. Refund requests get a reply within 2 business days.</p><p>${link("refund.html", "Read the refund policy")}</p>`,
      chips: ["Request a refund", "Contact support"],
    },
    {
      id: "refund",
      re: /\b(refund|refunds|money back|return policy|returns?|cancel|cancell?ation|not satisfied|wrong file|corrupt|damaged|doesn'?t open|won'?t open)\b/,
      html: () =>
        `<p>Files are digital, so they can't be returned once delivered. We do refund faulty or missing files, duplicate payments, and orders that couldn't be delivered. Write to us within 7 days of receiving your files.</p><p>${link("refund.html", "Read the full refund policy")} or ${talk("Refund request", "I would like to ask about a refund.\nOrder reference: \nEmail I ordered with: \nWhat went wrong: ", "request a refund")}.</p>`,
      chips: [
        "How long do refunds take?",
        "How do I order?",
        "Contact support",
      ],
    },

    {
      id: "security",
      re: /\bis (it|this|noviq|the site|the website) (safe|legit|secure|genuine|real|trusted|a scam)\b|\b(safe|secure|legit|genuine|trustworthy|scam|fraud)\b.{0,20}\b(pay|payment|site|store|noviq|upi|website)\b/,
      html: () =>
        "<p>You pay inside your own UPI app, straight to NOVIQ's UPI ID. The site never asks for your UPI PIN or bank login, and you should never share them with anyone. Every order is also checked by a real person before files are sent.</p>",
      chips: ["How do I order?", "Refund policy", "Contact support"],
    },
    /* ---- ordering ---- */
    {
      id: "order",
      re: /\b(how|steps?|process|procedure|way|guide|kaise|kese|kaisey)\b.{0,30}\b(order|ordering|buy|buying|purchase|purchasing|checkout|kharid\w*)\b|\b(order|buy|purchase|checkout)(ing)? (steps?|process|procedure|flow|guide)\b|\bplace (an? |my )?order\b|\bsteps? (to|for) (order|buy|purchase|get)\b|\b(order|buy|purchase) (kaise|kese)\b|\bkaise (order|buy|purchase|kharid)|\b(want|wanna|like|need|ready|interested|looking)\b.{0,12}\b(to )?(order|buy|purchase)\b/,
      html: () =>
        `<p>Ordering is easy. It takes four steps:</p>${steps([
          `<b>Explore.</b> Browse ${link("explore.html", "Explore")}, ${link("bundles.html", "Bundles")} or the ${link("free-resources.html", "free library")} to find what you need.`,
          "<b>Select a pack.</b> Open a resource and check what's inside. Then tap <i>Buy now</i>, or <i>Add to cart</i> to buy a few together.",
          "<b>Follow the steps.</b> Checkout shows your items and total, then guides you through three short steps: <i>Pay</i>, <i>Confirm</i> and <i>Get files</i>.",
          "<b>Pay by UPI.</b> Scan the QR code with any UPI app, then enter your email and the 12-digit transaction ID. We email your files once the payment is confirmed.",
        ])}`,
      chips: [
        { label: "Explore resources", href: "explore.html" },
        "Payment methods",
        "When will I get my files?",
        "Show free resources",
      ],
    },
    {
      id: "payment",
      re: /\b(pay|paying|payment|payments|upi|gpay|google pay|phonepe|paytm|bhim)\b|\b(do you|does noviq|can i|can we) (accept|take|support)\b|\b(accept|accepted|supported)\b.{0,15}\b(method|methods|options|mode)\b/,
      html: () =>
        `<p>NOVIQ takes payments by <b>UPI</b>. You can use any UPI app, such as GPay, PhonePe, Paytm or BHIM. At checkout:</p>${steps(
          [
            "Scan the QR code (on your phone you can tap <i>Open UPI app</i>, or copy the UPI ID with the copy icon).",
            "Pay the amount shown. It's filled in for you.",
            "Enter your email and the 12-digit transaction ID. We email your files once the payment is confirmed.",
          ],
        )}<p>Stuck? ${talk("Payment help", "I need help with my payment.", "Ask about payment")}</p>`,
      chips: [
        "How do I order?",
        "Where is the transaction ID?",
        "Refund policy",
      ],
    },
    {
      id: "invoice",
      re: /\b(invoice|gst|receipt|bill)\b/,
      html: () =>
        `<p>If you need an invoice or a receipt, mention it in your message and the team will help.</p><p>${talk("Order enquiry", "I need an invoice for my order.\nOrder reference: \nName for the invoice: ", "Ask for an invoice")}</p>`,
      chips: ["How do I order?", "Contact support"],
    },
    {
      id: "delivery",
      re: /\b(deliver|delivery|delivered|receive my (files?|order|pack|purchase)|when (will|do) i (get|receive)|how (long|soon)|shipping|ship|send (me )?the files?|(get|find|access|open) my (files?|order|pack|purchase|download)|where (do|can) i (get|find|download) (my )?(files?|order|purchase))\b/,
      html: () =>
        `<p>Files are delivered privately by email after your payment is confirmed. Previews never contain the complete paid file. Free resources can be downloaded straight from their page.</p><p>${link("about.html#orders", "How delivery works")}</p>`,
      chips: [
        "I paid but got no files",
        "Show free resources",
        "Refund policy",
      ],
    },
    {
      id: "response",
      re: /\b(response time|reply time|how (long|fast|soon).{0,25}(reply|respond|answer|get back)|when.{0,25}(reply|respond|get back|hear back))\b/,
      html: () =>
        `<p>The team replies by email. Refund requests get a reply within 2 business days. To speed things up, include your order reference and UPI transaction ID.</p><p>${link("contact.html", "Open the contact form")}</p>`,
      chips: ["Contact support", "Refund policy"],
    },
    {
      id: "contact",
      re: /\b(contact|reach (you|out)|talk to|speak to|human|real person|agent|customer care|customer support|support|support team|phone|whatsapp|call you|email you|your email|address|complain\w*|report)\b/,
      html: () =>
        `<p>The quickest way is the contact form. A real person replies by email. Choose what fits:</p><ul><li>${talk("Delivery issue", "I paid but haven't received my files.\nOrder reference: \nUPI transaction ID: \nEmail I ordered with: ", "Paid, but no files yet")}</li><li>${talk("Payment help", "I need help with my payment.\nResource: \nAmount: \nUPI transaction ID: ", "Payment problem")}</li><li>${talk("Refund request", "I would like to ask about a refund.\nOrder reference: \nWhat went wrong: ", "Refund request")}</li><li>${talk("Question", "I have a question about: ", "Question about a resource")}</li></ul><p>Or see the ${link("contact.html#faq", "FAQ")} for quick answers.</p>`,
      chips: ["How do I order?", "Refund policy"],
    },

    /* ---- about the catalogue ---- */
    {
      id: "download",
      re: /\bhow\b.{0,25}\bdownload\b|\bdownload (link|button)\b/,
      html: () =>
        `<p>Free resources: open one and use its download button. No payment needed. Paid resources are emailed to you privately once your payment is confirmed.</p><p>${link("free-resources.html", "Open the free library")}</p>`,
      chips: ["Show free resources", "How do I order?"],
    },
    {
      id: "try",
      re: /\b(try before|sample|trial|demo|preview|test the quality|before i buy)\b/,
      html: () =>
        `<p>Yes. The free library has resources you can download without paying, so you can judge the quality first. Previews of paid files never contain the complete file.</p><p>${link("free-resources.html", "Open the free library")}</p>`,
      chips: ["Show free resources", "Read blog notes"],
    },
    {
      id: "formats",
      re: /\b(which|what) (file )?formats?\b|\bfile (types?|formats?)\b|\bformats? do you\b/,
      html: () =>
        "<p>NOVIQ offers PDF guides and workbooks, Notion templates, and HTML/CSS/JS starter files. Every product page lists its formats.</p>",
      chips: ["Notion templates", "PDF guides", "Starter kits"],
    },
    {
      id: "experience",
      re: /\b(do i need|need any|required) (any )?(experience|knowledge|background)\b|\bprerequisites?\b|\bwhat level\b|\bskill level\b/,
      html: () =>
        "<p>Each resource states its level and prerequisites up front, from complete beginner to intermediate. If you tell me what you already know, I can point you to a good starting place.</p>",
      chips: ["Best for beginners", "Intermediate resources"],
    },
    {
      id: "cart",
      re: /\b(cart|basket|enquiry list|wishlist|my list)\b/,
      html: () =>
        "<p>Your cart works like a basket. Use <i>+ Add to cart</i> on a resource, open the bag icon at the top right, and choose <i>Checkout</i> to pay for everything at once by UPI.</p>",
      chips: ["How do I order?", "Show free resources"],
    },
    {
      id: "licence",
      re: /\b(licen[cs]e|licensing|commercial use|resell|redistribut|share (it|them|the files?)|use (it|them) (for|in) (work|client|commercial))\b/,
      html: () =>
        `<p>I don't have licence terms in my information, so I don't want to guess. Please ask the team before you share or reuse a resource commercially.</p><p>${talk("Question", "I have a question about the licence and usage terms for your resources.", "Ask about usage terms")}</p>`,
      chips: ["Contact support"],
    },
    {
      id: "discount",
      re: /\b(discount|coupon|promo|promo code|voucher|offer code|sale|deal|student discount)\b/,
      html: () =>
        `<p>I don't see any discount codes on the site. Bundles combine several resources in a single order, and you can ask the team whether any offers are running.</p><p>${link("bundles.html", "View bundles")}</p>`,
      chips: ["Show bundles", "Contact support"],
    },
    {
      id: "bundlewhat",
      re: /\bwhat (is|are) (a |the )?bundles?\b|\bbundles? (mean|work|include)\b/,
      html: () =>
        `<p>A bundle groups several resources into one learning path and is bought as a single order. If one file in a bundle has a problem, we fix or replace that file first.</p><p>${link("bundles.html", "View bundles")}</p>`,
      chips: ["Show bundles", "How do I order?"],
    },
    {
      id: "about",
      re: /\b(about noviq|what is noviq|who (is|are) noviq|who made|who runs|made in)\b/,
      html: () =>
        `<p>NOVIQ is a digital resource store made in India. It offers visual guides, cheat sheets, Notion templates and starter kits for learners, builders and creators, plus free downloads and Blog Notes.</p><p>${link("about.html", "Read more about NOVIQ")}</p>`,
      chips: ["Show free resources", "How do I order?"],
    },
    {
      id: "overview",
      re: /\b(what do you (sell|offer|have)|what can i (buy|get|find)|categories|collections|browse|everything|show all|all resources|catalogue|catalog)\b/,
      html: (ctx) => {
        const n = (c) => ctx.products.filter((p) => p.category === c).length;
        return `<p>NOVIQ has four collections plus bundles:</p><ul><li><b>Build</b>: starter kits with real files (${n("build")})</li><li><b>Learn</b>: visual guides and cheat sheets (${n("learn")})</li><li><b>Organize</b>: Notion systems (${n("organize")})</li><li><b>Practice</b>: workbooks with solutions (${n("practice")})</li><li><b>Bundles</b>: complete learning paths (${n("bundle")})</li></ul>`;
      },
      chips: [
        "Show Build resources",
        "Show Learn resources",
        "Show free resources",
        "Read blog notes",
      ],
      links: [{ label: "Explore all", href: "explore.html" }],
    },
  ];

  /* ------------------------------------------------------------------ *
   * Reply engine
   * ------------------------------------------------------------------ */
  const PAGE_SIZE = 3;

  const levelMatches = (p, want) => {
    const l = String(p.level || "").toLowerCase();
    if (want === "beginner") return l.includes("beginner") || l.includes("all");
    return (
      l.includes("intermediate") || l.includes("advanced") || l.includes(" to ")
    );
  };

  const filterPool = (entries, f) =>
    entries.filter((e) => {
      const p = e.item;
      if (f.free && p.price_inr > 0) return false;
      if (f.paid && !(p.price_inr > 0)) return false;
      if (f.max && !(p.price_inr <= f.max)) return false;
      if (f.level && !levelMatches(p, f.level)) return false;
      if (f.format) {
        const fm = (p.format || []).join(" ").toLowerCase();
        if (!fm.includes(f.format)) return false;
      }
      if (f.cat && p.category !== f.cat) return false;
      return true;
    });

  const byFeatured = (a, b) =>
    (b.item.featured ? 1 : 0) - (a.item.featured ? 1 : 0);

  const fallbackReply = (q) => ({
    html: `<p>I couldn't find anything for “${esc(q)}”. Try a topic such as Git, CSS, JavaScript, React, Python or Notion, or tell me what you want to build.</p><p>You can also ask me how to order, how payment works, or what to do if something went wrong. If I can't help, ${link(contactHref("Question", `I was looking for: ${q}`), "the team will")}.</p>`,
    cards: [],
    chips: [
      "How do I order?",
      "Show free resources",
      "Read blog notes",
      { label: "Browse everything", href: "explore.html" },
      {
        label: "Ask the team",
        href: contactHref("Question", `I was looking for: ${q}`),
      },
    ],
  });

  const searchReply = (q, ctx) => {
    const lower = norm(q);
    const f = {};
    if (/\b(free|no cost|without paying|for nothing)\b/.test(lower))
      f.free = true;
    if (!f.free && /\b(paid|premium)\b/.test(lower)) f.paid = true;
    const max = budgetOf(lower);
    if (max) f.max = max;
    if (
      /\b(beginner|beginners|newbie|new to|just starting|never (coded|programmed))\b/.test(
        lower,
      )
    )
      f.level = "beginner";
    else if (/\b(intermediate|advanced|experienced)\b/.test(lower))
      f.level = "intermediate";
    if (/\bnotion\b/.test(lower)) f.format = "notion";
    else if (/\bpdf\b/.test(lower)) f.format = "pdf";
    const cheap = /\b(cheap|cheapest|lowest|affordable)\b/.test(lower);
    const priceAsk =
      /\b(price|prices|pricing|cost|costs|how much|rates?)\b/.test(lower);

    const all = tokens(lower);
    const qTokens = all.filter(
      (t) => !FILTER_TOKENS.has(t) && !NOTE_RE.test(t) && t !== "note",
    );
    const catTok = qTokens.find((t) => CAT_WORDS[t]);
    const contentTokens = qTokens.filter((t) => !CAT_WORDS[t]);
    if (catTok && !contentTokens.length) f.cat = CAT_WORDS[catTok];
    // Words like "learn" or "build" are too generic to rank by when the
    // person also named a topic ("learn python"), so score on the topic only.
    const scoreTokens = contentTokens.length ? contentTokens : qTokens;

    const noteIntent = NOTE_RE.test(lower);
    const hasFilter = Object.keys(f).length > 0;
    const productEntries = ctx.index.filter((e) => e.kind === "product");
    const noteEntries = ctx.index.filter((e) => e.kind === "note");

    // ---- Nothing to search for: browse by filter, or list latest notes.
    if (!qTokens.length || f.cat) {
      if (noteIntent && !hasFilter) {
        const list = noteEntries.slice(0, PAGE_SIZE + 1);
        if (list.length)
          return {
            html: "<p>Here are some Blog Notes to start with. They're free to read.</p>",
            cards: list,
            chips: [
              { label: "Open Blog Notes", href: "blog.html" },
              "Show free resources",
            ],
          };
      }
      if (hasFilter || priceAsk || cheap) {
        let pool = filterPool(productEntries, f);
        if (!pool.length) pool = productEntries;
        pool = [...pool].sort(
          cheap || priceAsk
            ? (a, b) => (a.item.price_inr || 0) - (b.item.price_inr || 0)
            : byFeatured,
        );
        if ((cheap || priceAsk) && !f.free) {
          const paid = pool.filter((e) => e.item.price_inr > 0);
          if (paid.length) pool = paid;
        }
        const shown = pool.slice(0, PAGE_SIZE + 1);
        const prices = productEntries
          .map((e) => e.item.price_inr)
          .filter((x) => x > 0);
        let intro = `<p>Here ${shown.length === 1 ? "is the match" : "are the matches"}:</p>`;
        if (priceAsk && !hasFilter && prices.length)
          intro = `<p>Paid resources range from ₹${Math.min(...prices)} to ₹${Math.max(...prices)} (bundles are at the top end), and the free library costs nothing. Here are the lowest-priced ones:</p>`;
        else if (f.free)
          intro = `<p>These ${pool.length > 1 ? `${pool.length} ` : ""}resources are free to download. No sign-up needed.</p>`;
        else if (f.max) intro = `<p>Resources up to ₹${f.max}:</p>`;
        else if (f.paid)
          intro = `<p>These are the paid resources, featured ones first:</p>`;
        else if (f.cat)
          intro = `<p>Here ${shown.length === 1 ? "is the" : "are the"} ${esc(f.cat === "bundle" ? "bundles" : cap(f.cat) + " resources")}:</p>`;
        const more = pool.length > shown.length;
        return {
          html: intro,
          cards: shown.slice(0, PAGE_SIZE + 1),
          rest: pool.slice(shown.length),
          chips: [
            ...(more ? ["Show more"] : []),
            ...(f.free
              ? [
                  {
                    label: "Open the free library",
                    href: "free-resources.html",
                  },
                ]
              : []),
            ...(more
              ? [{ label: "See all in Explore", href: "explore.html" }]
              : []),
            "How do I order?",
          ],
        };
      }
      return null;
    }

    // ---- Topic search.
    let pool = filterPool(productEntries, f);
    let relaxed = false;
    const rank = (entries) =>
      entries
        .map((e) => ({ e, s: scoreEntry(e, scoreTokens) }))
        .filter((x) => x.s >= 1.2)
        .sort((a, b) => b.s - a.s || byFeatured(a.e, b.e));
    let prods = rank(pool);
    if (!prods.length && hasFilter) {
      prods = rank(productEntries);
      relaxed = prods.length > 0;
    }
    const useNotes = !f.max && !f.format && !f.level;
    const notes = useNotes ? rank(noteEntries) : [];

    // Keep the best notes only if they are relevant relative to resources.
    const topP = prods[0]?.s || 0;
    const goodNotes = notes.filter(
      (n) => noteIntent || !topP || n.s >= topP * 0.6,
    );

    if (!prods.length && !goodNotes.length) return null;

    let cards, lead;
    if (noteIntent && goodNotes.length) {
      cards = [
        ...goodNotes.slice(0, PAGE_SIZE).map((x) => x.e),
        ...prods.slice(0, 2).map((x) => x.e),
      ];
      lead = "Here are Blog Notes that explain this";
      if (prods.length) lead += ", plus resources you can go deeper with";
    } else {
      cards = [
        ...prods.slice(0, PAGE_SIZE).map((x) => x.e),
        ...goodNotes.slice(0, prods.length ? 1 : PAGE_SIZE).map((x) => x.e),
      ];
      lead = prods.length
        ? `Here's what I found`
        : "I didn't find a resource for that, but these Blog Notes are free to read";
    }
    let html = `<p>${lead}:</p>`;
    if (priceAsk && prods.length) {
      const top = prods[0].e.item;
      html =
        prods.length === 1 || prods[0].s >= (prods[1]?.s || 0) * 1.5
          ? `<p><b>${esc(top.title)}</b> is ${money(top) === "Free" ? "free" : money(top)}.</p>`
          : `<p>Here are the matching resources with their prices:</p>`;
    }
    if (relaxed)
      html = `<p>I couldn't find an exact match for those filters, so these are the closest resources:</p>`;
    if (
      /\b(buy|order|purchase)\b/.test(lower) &&
      cards.some((c) => c.kind === "product")
    )
      html += `<p>To order, tap <i>Buy now</i> on a resource, or add it to your cart.</p>`;

    const mainTok = contentTokens[0] || qTokens[0];
    const shownSet = new Set(cards);
    const rest = [
      ...prods.map((x) => x.e),
      ...goodNotes.map((x) => x.e),
    ].filter((e) => !shownSet.has(e));
    return {
      html,
      cards,
      rest,
      chips: [
        ...(rest.length ? ["Show more"] : []),
        ...(rest.length
          ? [
              {
                label: "See more in Explore",
                href: `explore.html?q=${encodeURIComponent(mainTok)}`,
              },
            ]
          : []),
        "Show free resources",
        "How do I order?",
      ],
    };
  };

  // Follow-ups that only make sense after the bot has shown something.
  const MORE_RE =
    /^(show |see )?(me )?(more|next|another|others?|anything else|more please|show more)( please)?$/;
  const BUY_RE =
    /^(i (want|ll take|would like|d like) (to )?)?(buy|order|purchase|get|add|take)( me)? (it|this|that|this one|that one|the first one|first one|the first|1st|one)( to (my )?cart)?( please)?$|^(it|this one|that one|the first one|first one)$/;
  const ADD_ONLY_RE = /\badd\b.{0,12}\bcart\b/;

  const reply = (text, ctx, mem = {}) => {
    const q = String(text || "")
      .trim()
      .slice(0, 200);
    const raw = norm(q);
    if (!raw) return null;
    const lower = autocorrect(raw, ctx.vocab);
    const out = (r) => {
      if (r && r.cards && r.cards.length) {
        const first = r.cards.find((c) => c.kind === "product");
        mem.focus = first ? first.item : null;
      }
      mem.rest =
        r && r.rest ? r.rest : r && r.cards && r.cards.length ? [] : mem.rest;
      return r;
    };

    // "show more": next batch from the last search.
    if (MORE_RE.test(lower)) {
      if (mem.rest && mem.rest.length) {
        const batch = mem.rest.slice(0, PAGE_SIZE);
        const rest = mem.rest.slice(PAGE_SIZE);
        return out({
          html: "<p>Here are more:</p>",
          cards: batch,
          rest,
          chips: [
            ...(rest.length ? ["Show more"] : []),
            { label: "Browse everything", href: "explore.html" },
            "How do I order?",
          ],
        });
      }
      return {
        html: `<p>That's everything I found for that. You can ${link("explore.html", "browse every resource")}, or tell me a topic and I'll search again.</p>`,
        cards: [],
        chips: ["Show free resources", "Best for beginners", "How do I order?"],
      };
    }

    // "buy it", "add it to cart", "the first one": act on what was shown last.
    if (
      mem.focus &&
      (BUY_RE.test(lower) ||
        (ADD_ONLY_RE.test(lower) && lower.split(" ").length <= 6))
    ) {
      const p = mem.focus;
      const entry = { kind: "product", item: p };
      return {
        html:
          p.price_inr > 0
            ? `<p>Good pick. <b>${esc(p.title)}</b> is ${money(p)}. Tap <i>Buy now</i> to pay by UPI, or add it to your cart to buy more together.</p>`
            : `<p><b>${esc(p.title)}</b> is free. Tap <i>Download free</i> to get it. No payment needed.</p>`,
        cards: [entry],
        chips: ["How do I order?", "Payment methods", "Show more"],
      };
    }

    for (const f of FAQ) {
      if (f.re.test(lower)) {
        const r = {
          html: f.html(ctx),
          cards: [],
          chips: [
            ...(f.chips || []),
            ...(f.links || []).map((l) => ({ label: l.label, href: l.href })),
          ],
          fb: f.fb !== false,
          topic: f.id,
        };
        // "How do I order the Git guide?": show the steps and the pack itself.
        if (f.id === "order" && ctx.index.length) {
          const rest = lower
            .replace(
              /\b(how|do|does|can|could|to|i|we|you|order|ordering|buy|buying|purchase|purchasing|place|an|a|the|my|steps?|process|procedure|guide|checkout|kaise|kese|kharid\w*|want|wanna|like|would|need|ready|interested|looking|something|some|resource|resources|pack|packs)\b/g,
              " ",
            )
            .replace(/\s+/g, " ")
            .trim();
          if (rest.length >= 3) {
            const hit = searchReply(rest, ctx);
            const prod = hit && hit.cards.find((c) => c.kind === "product");
            if (prod) r.cards = [prod];
          }
        }
        return out(r);
      }
    }

    // "Open the blog", "take me to bundles", and so on.
    if (/\b(go to|open|take me|navigate|visit|link to|page)\b/.test(lower)) {
      const page = PAGES.find((p) => p.re.test(lower));
      if (page)
        return {
          html: `<p>Here you go: ${link(page.href, page.label)}.</p>`,
          cards: [],
          chips: [],
        };
    }

    const res = searchReply(lower, ctx);
    if (res) {
      res.fb = true;
      return out(res);
    }
    const fb = fallbackReply(q);
    fb.fb = false;
    return fb;
  };

  const makeContext = (products, notes) => {
    const vocab = new Set();
    [
      ...products.map((p) => `${p.title} ${p.category}`),
      ...notes.map((n) => n.title),
    ].forEach((t) =>
      norm(t)
        .split(" ")
        .forEach((w) => w.length >= 5 && vocab.add(w)),
    );
    return { products, notes, index: buildIndex(products, notes), vocab };
  };

  const Engine = { reply, makeContext, tokens, buildIndex, autocorrect };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window !== "undefined") window.NOVIQChatEngine = Engine;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ *
   * UI
   * ------------------------------------------------------------------ */
  const KEY = "noviq_chat_v2";
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    read() {
      try {
        return JSON.parse(sessionStorage.getItem(KEY) || "{}") || {};
      } catch {
        return {};
      }
    },
    write(data) {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(data));
      } catch {
        /* storage unavailable: the chat simply won't persist */
      }
    },
  };

  const cardHTML = (e) => {
    if (e.kind === "note") {
      const n = e.item;
      return `<div class="nq-card nq-note"><a class="nq-main" href="blog-note.html?slug=${encodeURIComponent(n.slug)}"><small>Blog note · ${esc(n.category)}</small><b>${esc(n.title)}</b><span>${esc(n.description)}</span><em>${esc(n.read_time)} · Free to read</em></a></div>`;
    }
    const p = e.item;
    const meta = [money(p), p.level, (p.format || []).map(fmtLabel).join(" · ")]
      .filter(Boolean)
      .join(" · ");
    const canAdd = typeof Cart !== "undefined" && p.price_inr > 0;
    const canBuy = typeof Checkout !== "undefined" && p.price_inr > 0;
    const acts = [];
    if (!p.price_inr && p.file)
      acts.push(
        `<a class="nq-act" href="${esc(p.file)}" download>Download free</a>`,
      );
    if (canBuy)
      acts.push(
        `<button class="nq-act" type="button" data-buy="${esc(p.id)}">Buy now</button>`,
      );
    if (canAdd)
      acts.push(
        `<button class="nq-act ${canBuy ? "ghost" : ""}" type="button" data-add="${esc(p.id)}">+ Add to cart</button>`,
      );
    acts.push(
      `<a class="nq-act ghost" href="product.html?slug=${encodeURIComponent(p.slug)}">Details</a>`,
    );
    return `<div class="nq-card"><a class="nq-main" href="product.html?slug=${encodeURIComponent(p.slug)}"><small>${esc(p.category)}</small><b>${esc(p.title)}</b><span>${esc(p.description)}</span><em>${esc(meta)}</em></a><div class="nq-acts">${acts.join("")}</div></div>`;
  };

  const init = () => {
    if (document.getElementById("nq-btn")) return;
    if (!document.querySelector('link[href$="chatbot.css"]')) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = "css/chatbot.css";
      document.head.appendChild(l);
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `<button id="nq-btn" class="nq-btn" type="button" aria-label="Open the NOVIQ assistant" aria-expanded="false" aria-controls="nq-panel"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-3.9A8 8 0 1 1 20 12Z"/><path d="M9 11h6M9 14h3.5"/></svg><span>Ask NOVIQ</span></button>` +
        `<div id="nq-panel" class="nq-panel" role="dialog" aria-modal="false" aria-label="NOVIQ assistant" hidden>` +
        `<header class="nq-head"><div class="nq-av" aria-hidden="true">N</div><div><b>NOVIQ Guide</b><small>Find resources, order, get help</small></div><button class="nq-x" type="button" aria-label="Close the assistant">×</button></header>` +
        `<div class="nq-log" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"></div>` +
        `<div class="nq-chips" aria-label="Suggested questions"></div>` +
        `<form class="nq-form" autocomplete="off"><input type="text" maxlength="200" placeholder="Ask: how do I order?" aria-label="Your message" enterkeyhint="send"><button type="submit" aria-label="Send">→</button></form>` +
        `<p class="nq-foot">Automated guide, answers from NOVIQ's catalogue and FAQ. <a href="contact.html">Contact support</a> · <button type="button" class="nq-clear">Clear chat</button></p>` +
        `</div>`,
    );

    const $ = (s) => document.querySelector(s);
    const btn = $("#nq-btn"),
      panel = $("#nq-panel"),
      log = $(".nq-log"),
      chipsBox = $(".nq-chips"),
      form = $(".nq-form"),
      input = $(".nq-form input");

    const mem = {}; // what was shown last, for "buy it" / "show more"
    const history = []; // messages typed, for the Up arrow
    let hIdx = 0;
    let state = store.read();
    state.msgs = Array.isArray(state.msgs) ? state.msgs.slice(-40) : [];
    const save = () => store.write(state);

    // Catalogue loads the first time it's needed.
    let ctxPromise = null;
    const getContext = () =>
      (ctxPromise ??= Promise.all([
        fetch("data/products.json")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
        fetch("data/blog-notes.json")
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]).then(([p, n]) =>
        makeContext(Array.isArray(p) ? p : [], Array.isArray(n) ? n : []),
      ));

    const renderChips = (chips = []) => {
      chipsBox.innerHTML = chips
        .map((c) =>
          typeof c === "string"
            ? `<button class="nq-chip" type="button" data-send="${esc(c)}">${esc(c)}</button>`
            : `<a class="nq-chip" href="${esc(c.href)}">${esc(c.label)}</a>`,
        )
        .join("");
    };

    const addMsg = (role, html, cardsHTML = "") => {
      const m = document.createElement("div");
      m.className = `nq-m nq-${role}`;
      m.innerHTML = `<div class="nq-bub">${html}</div>${cardsHTML ? `<div class="nq-cards">${cardsHTML}</div>` : ""}`;
      log.appendChild(m);
      return m;
    };
    const clearFb = () =>
      log.querySelectorAll(".nq-fb").forEach((n) => n.remove());
    const addFb = (m) => {
      if (!m || m.querySelector(".nq-fb")) return;
      m.insertAdjacentHTML(
        "beforeend",
        `<div class="nq-fb" role="group" aria-label="Was this helpful?"><span>Was this helpful?</span><button type="button" data-fb="up" aria-label="Yes, helpful"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4v-9h3Zm0 0 4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/></svg></button><button type="button" data-fb="down" aria-label="No, not helpful"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 13V4h3v9h-3Zm0 0-4 8a2 2 0 0 1-2-2v-4H5.5a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 6.7 4H17"/></svg></button></div>`,
      );
    };
    const scrollTo = (el, tall) => {
      log.scrollTo({
        top: tall ? el.offsetTop - 10 : log.scrollHeight,
        behavior: calm ? "auto" : "smooth",
      });
    };

    const restore = () => {
      log.innerHTML = "";
      if (!state.msgs.length) {
        const r = reply("hello", { products: [], notes: [], index: [] }, {});
        state.msgs.push({
          role: "bot",
          html: r.html,
          cards: "",
          chips: r.chips,
        });
      }
      state.msgs.forEach((m) => addMsg(m.role, m.html, m.cards || ""));
      const lastMsg = state.msgs[state.msgs.length - 1];
      if (lastMsg && lastMsg.role === "bot" && lastMsg.fb)
        addFb(log.lastElementChild);
      renderChips(lastMsg?.chips || []);
      log.scrollTop = log.scrollHeight;
      save();
    };

    const send = async (text) => {
      const t = String(text || "").trim();
      if (!t) return;
      history.push(t);
      hIdx = history.length;
      clearFb();
      addMsg("user", `<p>${esc(t)}</p>`);
      state.msgs.push({ role: "user", html: `<p>${esc(t)}</p>`, q: t });
      renderChips([]);
      scrollTo(log, false);

      const typing = addMsg(
        "bot",
        '<span class="nq-typing" aria-label="Typing"><i></i><i></i><i></i></span>',
      );
      scrollTo(typing, false);
      const [ctx] = await Promise.all([
        getContext(),
        new Promise((r) => setTimeout(r, calm ? 0 : 450)),
      ]);
      typing.remove();

      let r;
      try {
        r = reply(t, ctx, mem);
      } catch (err) {
        console.error("NOVIQ assistant error:", err);
      }
      if (!r)
        r = {
          html: `<p>Sorry, something went wrong on my side. You can ${link("explore.html", "browse every resource")} or ${link("contact.html", "contact the team")}.</p>`,
          cards: [],
          chips: ["Show free resources"],
        };
      if (
        !ctx.products.length &&
        !ctx.notes.length &&
        !r.cards.length &&
        /couldn't find/.test(r.html)
      )
        r.html += `<p>The catalogue didn't load, so please try ${link("explore.html", "Explore")} directly.</p>`;
      const cards = (r.cards || []).map(cardHTML).join("");
      const m = addMsg("bot", r.html, cards);
      if (r.fb) addFb(m);
      state.msgs.push({
        role: "bot",
        html: r.html,
        cards,
        chips: r.chips,
        fb: !!r.fb,
        q: t,
      });
      state.msgs = state.msgs.slice(-40);
      renderChips(r.chips);
      scrollTo(m, cards.length > 0 || m.offsetHeight > log.clientHeight * 0.45);
      save();
    };

    const open = (focus = true) => {
      panel.hidden = false;
      document.body.classList.add("nq-open");
      btn.setAttribute("aria-expanded", "true");
      state.open = true;
      save();
      getContext(); // warm the catalogue
      if (focus) input.focus({ preventScroll: true });
    };
    const close = (returnFocus = true) => {
      panel.hidden = true;
      document.body.classList.remove("nq-open");
      btn.setAttribute("aria-expanded", "false");
      state.open = false;
      save();
      if (returnFocus) btn.focus({ preventScroll: true });
    };

    btn.addEventListener("click", () => open());
    panel.querySelector(".nq-x").addEventListener("click", () => close());
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value;
      input.value = "";
      send(v);
    });
    chipsBox.addEventListener("click", (e) => {
      const c = e.target.closest("[data-send]");
      if (c) send(c.dataset.send);
    });
    panel.querySelector(".nq-clear").addEventListener("click", () => {
      state.msgs = [];
      mem.focus = null;
      mem.rest = [];
      restore();
      input.focus({ preventScroll: true });
    });
    // After "+ Add to cart" is clicked, cart.js updates the button text.
    // Mark it visually so the state is clear inside the chat.
    log.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) setTimeout(() => add.classList.add("added"), 0);
      if (e.target.closest("[data-buy]")) close(false);
      const fb = e.target.closest("[data-fb]");
      if (fb) {
        const row = fb.closest(".nq-fb");
        const lastQ =
          [...state.msgs].reverse().find((m) => m.role === "user")?.q || "";
        if (fb.dataset.fb === "up") {
          row.innerHTML = "<span>Glad that helped!</span>";
        } else {
          row.remove();
          const m = addMsg(
            "bot",
            `<p>Sorry I missed the mark. You can rephrase your question, or send it to the team and a real person will reply by email.</p><p>${link(contactHref("Question", `I asked the NOVIQ guide: ${lastQ}\nI need help with: `), "Send my question to the team")}</p>`,
          );
          state.msgs.push({
            role: "bot",
            html: m.querySelector(".nq-bub").innerHTML,
            cards: "",
            chips: [
              "How do I order?",
              "Show free resources",
              "Contact support",
            ],
          });
          renderChips([
            "How do I order?",
            "Show free resources",
            "Contact support",
          ]);
          scrollTo(m, false);
          save();
        }
      }
    });
    // Up / Down arrows recall what you typed earlier.
    input.addEventListener("keydown", (e) => {
      if (!history.length || (e.key !== "ArrowUp" && e.key !== "ArrowDown"))
        return;
      if (e.key === "ArrowUp" && hIdx > 0) hIdx--;
      else if (e.key === "ArrowDown" && hIdx < history.length) hIdx++;
      else return;
      e.preventDefault();
      input.value = history[hIdx] || "";
    });

    restore();
    if (state.open) open(false);
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
