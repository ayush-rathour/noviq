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
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
  const money = (p) =>
    p.price_inr > 0 ? `₹${Number(p.price_inr).toLocaleString("en-IN")}` : "Free";
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
    "free beginner beginners newbie intermediate advanced experienced cheap cheapest affordable budget pdf rs inr".split(
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
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
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

  const matchToken = (set, q) => {
    if (set.has(q)) return 1;
    for (const t of set) {
      if (q.length >= 3 && t.startsWith(q)) return 0.7;
      if (t.length >= 4 && q.length >= 4 && q.startsWith(t)) return 0.7;
    }
    return 0;
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
    { re: /\b(explore|all resources|catalogue|catalog|shop|store)\b/, href: "explore.html", label: "Explore all resources" },
    { re: /\bbundles?\b/, href: "bundles.html", label: "View bundles" },
    { re: /\b(free library|free resources?|free downloads?|free page)\b/, href: "free-resources.html", label: "Open the free library" },
    { re: /\b(blog|notes|articles)\b/, href: "blog.html", label: "Open Blog Notes" },
    { re: /\babout\b/, href: "about.html", label: "About NOVIQ" },
    { re: /\bcontact\b/, href: "contact.html", label: "Contact NOVIQ" },
    { re: /\brefund/, href: "refund.html", label: "Read the refund policy" },
  ];

  const FAQ = [
    {
      id: "greet",
      re: /^\s*(hi+|hello+|hey+|hola|namaste|yo|good (morning|afternoon|evening))\b[\s!.,?]*$/,
      html: () =>
        "<p>Hi! I'm the NOVIQ guide. Tell me what you want to learn or build and I'll find matching resources, free downloads and Blog Notes. You can also ask me how ordering, delivery or refunds work.</p>",
      chips: ["Show free resources", "Best for beginners", "Notion templates", "How do I order?"],
    },
    {
      id: "thanks",
      re: /\b(thanks|thank you|thx|ty|appreciate)\b/,
      html: () => "<p>You're welcome! Anything else I can help you find?</p>",
      chips: ["Show free resources", "Read blog notes", "Contact the team"],
    },
    {
      id: "bye",
      re: /^\s*(bye|goodbye|see you|cya|that'?s all|no thanks)\b/,
      html: () => "<p>Goodbye! I'll be here if you need anything else.</p>",
      chips: [],
    },
    {
      id: "identity",
      re: /\b(who are you|what are you|are you (a |an )?(bot|ai|human|real|robot)|your name)\b/,
      html: () =>
        "<p>I'm the NOVIQ guide, an assistant built into this site. I search NOVIQ's resources, free downloads and Blog Notes, and answer from the site's own FAQ. For anything I can't answer, the team replies by email.</p>",
      chips: ["Show free resources", "How do I order?", "Contact the team"],
    },
    {
      id: "refund",
      re: /\b(refund|refunds|money back|return policy|returns?|cancel|cancell?ation|not satisfied|wrong file|corrupt|damaged|doesn'?t open|won'?t open)\b/,
      html: () =>
        `<p>Files are digital, so they can't be returned once delivered. We do refund faulty or missing files, duplicate payments, and orders that couldn't be delivered. Write to us within 7 days of receiving your files.</p><p>${link("refund.html", "Read the full refund policy")} or ${link(contactHref("Support", "I would like to ask about a refund.\nOrder reference: \nWhat went wrong: "), "request a refund")}.</p>`,
      chips: ["How do I order?", "Contact the team"],
    },
    {
      id: "order",
      re: /\bhow\b.{0,25}\b(order|buy|purchase)\b|\b(order|purchase)(ing)? process\b|\bplace an? order\b|\bhow does (ordering|buying)\b|\bhow (to|do i) enquire\b/,
      html: () =>
        `<p>Ordering takes three steps:</p><ul><li><b>Send an enquiry.</b> Open a resource and choose <i>Enquire by email</i>, or add several to your enquiry list.</li><li><b>Get payment details.</b> We reply with payment instructions and an order reference.</li><li><b>Receive your files.</b> Once payment is confirmed, they're sent to you privately.</li></ul><p>No payment is taken on this site.</p>`,
      chips: ["Show free resources", "Refund policy", "Contact the team"],
    },
    {
      id: "payment",
      re: /\b(pay|paying|payment|payments|upi|gpay|google pay|phonepe|paytm|net ?banking|credit card|debit card|invoice|gst|receipt)\b/,
      html: () =>
        `<p>No payment is taken on this site. After you send an enquiry, we reply with payment instructions and an order reference. If you need a particular payment method or an invoice, mention it in your enquiry and the team will confirm.</p><p>${link(contactHref("Order enquiry", "I have a question about payment."), "Ask about payment")}</p>`,
      chips: ["How do I order?", "Refund policy"],
    },
    {
      id: "delivery",
      re: /\b(deliver|delivery|delivered|receive my|when (will|do) i (get|receive)|how (long|soon)|shipping|ship|send (me )?the file|get my file|access my)\b/,
      html: () =>
        `<p>Files are delivered privately by email after your payment is confirmed. Previews never contain the complete paid file. Free resources can be downloaded straight away from their page.</p><p>${link("about.html#orders", "How delivery works")}</p>`,
      chips: ["Show free resources", "Refund policy"],
    },
    {
      id: "contact",
      re: /\b(contact|reach (you|out)|talk to|speak to|human|customer care|customer support|support team|phone|whatsapp|call you|email you|your email|address)\b/,
      html: () =>
        `<p>The contact form is the best way to reach the team, and they reply by email. For orders, include the resource you're interested in.</p><p>${link("contact.html", "Open the contact form")}</p>`,
      chips: ["How do I order?", "Refund policy"],
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
        "<p>The enquiry list works like a basket. Use <i>+ Add to enquiry list</i> on a resource, open the bag icon at the top right, and choose <i>Continue by email</i> to send one enquiry for everything. No payment is taken there.</p>",
      chips: ["How do I order?", "Show free resources"],
    },
    {
      id: "licence",
      re: /\b(licen[cs]e|licensing|commercial use|resell|redistribut|share (it|them|the files?)|use (it|them) (for|in) (work|client|commercial))\b/,
      html: () =>
        `<p>I don't have licence terms in my information, so I don't want to guess. Please ask the team before you share or reuse a resource commercially.</p><p>${link(contactHref("Question", "I have a question about the licence and usage terms for your resources."), "Ask about usage terms")}</p>`,
      chips: ["Contact the team"],
    },
    {
      id: "discount",
      re: /\b(discount|coupon|promo|promo code|voucher|offer code|sale|deal|student discount)\b/,
      html: () =>
        `<p>I don't see any discount codes on the site. Bundles combine several resources in a single order, and you can ask the team whether any offers are running.</p><p>${link("bundles.html", "View bundles")}</p>`,
      chips: ["Show bundles", "Contact the team"],
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
      chips: ["Show Build resources", "Show Learn resources", "Show free resources", "Read blog notes"],
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
    return l.includes("intermediate") || l.includes("advanced") || l.includes(" to ");
  };

  const filterPool = (entries, f) =>
    entries.filter((e) => {
      const p = e.item;
      if (f.free && p.price_inr > 0) return false;
      if (f.max && !(p.price_inr <= f.max)) return false;
      if (f.level && !levelMatches(p, f.level)) return false;
      if (f.format) {
        const fm = (p.format || []).join(" ").toLowerCase();
        if (!fm.includes(f.format)) return false;
      }
      if (f.cat && p.category !== f.cat) return false;
      return true;
    });

  const byFeatured = (a, b) => (b.item.featured ? 1 : 0) - (a.item.featured ? 1 : 0);

  const fallbackReply = (q) => ({
    html: `<p>I couldn't find anything for “${esc(q)}”. Try a topic such as Git, CSS, JavaScript, React, Python or Notion, or tell me what you want to build.</p>`,
    cards: [],
    chips: [
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
    if (/\b(free|no cost|without paying|for nothing)\b/.test(lower)) f.free = true;
    const max = budgetOf(lower);
    if (max) f.max = max;
    if (/\b(beginner|beginners|newbie|new to|just starting|never (coded|programmed))\b/.test(lower))
      f.level = "beginner";
    else if (/\b(intermediate|advanced|experienced)\b/.test(lower)) f.level = "intermediate";
    if (/\bnotion\b/.test(lower)) f.format = "notion";
    else if (/\bpdf\b/.test(lower)) f.format = "pdf";
    const cheap = /\b(cheap|cheapest|lowest|affordable)\b/.test(lower);
    const priceAsk = /\b(price|prices|pricing|cost|costs|how much|rates?)\b/.test(lower);

    const all = tokens(lower);
    const qTokens = all.filter((t) => !FILTER_TOKENS.has(t) && !NOTE_RE.test(t) && t !== "note");
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
            chips: [{ label: "Open Blog Notes", href: "blog.html" }, "Show free resources"],
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
        const prices = productEntries.map((e) => e.item.price_inr).filter((x) => x > 0);
        let intro = `<p>Here ${shown.length === 1 ? "is the match" : "are the matches"}:</p>`;
        if (priceAsk && !hasFilter && prices.length)
          intro = `<p>Paid resources range from ₹${Math.min(...prices)} to ₹${Math.max(...prices)} (bundles are at the top end), and the free library costs nothing. Here are the lowest-priced ones:</p>`;
        else if (f.free)
          intro = `<p>These ${pool.length > 1 ? `${pool.length} ` : ""}resources are free to download. No sign-up needed.</p>`;
        else if (f.max)
          intro = `<p>Resources up to ₹${f.max}:</p>`;
        else if (f.cat)
          intro = `<p>Here ${shown.length === 1 ? "is the" : "are the"} ${esc(f.cat === "bundle" ? "bundles" : cap(f.cat) + " resources")}:</p>`;
        const more = pool.length > shown.length;
        return {
          html: intro,
          cards: shown.slice(0, PAGE_SIZE + 1),
          chips: [
            ...(f.free ? [{ label: "Open the free library", href: "free-resources.html" }] : []),
            ...(more ? [{ label: "See all in Explore", href: "explore.html" }] : []),
            "Read blog notes",
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
    const goodNotes = notes.filter((n) => noteIntent || !topP || n.s >= topP * 0.6);

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
    if (relaxed)
      html = `<p>I couldn't find an exact match for those filters, so these are the closest resources:</p>`;
    if (/\b(buy|order|purchase|get)\b/.test(lower) && cards.some((c) => c.kind === "product"))
      html += `<p>To order, open a resource and choose <i>Enquire by email</i>, or add it to your enquiry list.</p>`;

    const mainTok = contentTokens[0] || qTokens[0];
    const hidden = prods.length + goodNotes.length - cards.length;
    return {
      html,
      cards,
      chips: [
        ...(hidden > 0 ? [{ label: "See more in Explore", href: `explore.html?q=${encodeURIComponent(mainTok)}` }] : []),
        "Show free resources",
        "How do I order?",
      ],
    };
  };

  const reply = (text, ctx) => {
    const q = String(text || "").trim().slice(0, 200);
    const lower = norm(q);
    if (!lower) return null;

    for (const f of FAQ) {
      if (f.re.test(lower)) {
        return {
          html: f.html(ctx),
          cards: [],
          chips: [...(f.chips || []), ...(f.links || []).map((l) => ({ label: l.label, href: l.href }))],
        };
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

    return searchReply(q, ctx) || fallbackReply(q);
  };

  const makeContext = (products, notes) => ({
    products,
    notes,
    index: buildIndex(products, notes),
  });

  const Engine = { reply, makeContext, tokens, buildIndex };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  if (typeof window !== "undefined") window.NOVIQChatEngine = Engine;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------------ *
   * UI
   * ------------------------------------------------------------------ */
  const KEY = "noviq_chat_v1";
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
    const acts = [];
    if (!p.price_inr && p.file)
      acts.push(`<a class="nq-act" href="${esc(p.file)}" download>Download free</a>`);
    if (canAdd)
      acts.push(`<button class="nq-act" type="button" data-add="${esc(p.id)}">+ Enquiry list</button>`);
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
        `<header class="nq-head"><div class="nq-av" aria-hidden="true">N</div><div><b>NOVIQ Guide</b><small>Find resources and get answers</small></div><button class="nq-x" type="button" aria-label="Close the assistant">×</button></header>` +
        `<div class="nq-log" role="log" aria-live="polite" aria-label="Conversation" tabindex="0"></div>` +
        `<div class="nq-chips" aria-label="Suggested questions"></div>` +
        `<form class="nq-form" autocomplete="off"><input type="text" maxlength="200" placeholder="Ask about Git, Notion, refunds…" aria-label="Your message" enterkeyhint="send"><button type="submit" aria-label="Send">→</button></form>` +
        `<p class="nq-foot">Answers come from NOVIQ's catalogue and FAQ. <button type="button" class="nq-clear">Clear chat</button></p>` +
        `</div>`,
    );

    const $ = (s) => document.querySelector(s);
    const btn = $("#nq-btn"),
      panel = $("#nq-panel"),
      log = $(".nq-log"),
      chipsBox = $(".nq-chips"),
      form = $(".nq-form"),
      input = $(".nq-form input");

    let state = store.read();
    state.msgs = Array.isArray(state.msgs) ? state.msgs.slice(-40) : [];
    const save = () => store.write(state);

    // Catalogue loads the first time it's needed.
    let ctxPromise = null;
    const getContext = () =>
      (ctxPromise ??= Promise.all([
        fetch("data/products.json").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("data/blog-notes.json").then((r) => (r.ok ? r.json() : [])).catch(() => []),
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
    const scrollTo = (el, tall) => {
      log.scrollTo({ top: tall ? el.offsetTop - 10 : log.scrollHeight, behavior: calm ? "auto" : "smooth" });
    };

    const restore = () => {
      log.innerHTML = "";
      if (!state.msgs.length) {
        const r = reply("hello", { products: [], notes: [], index: [] });
        state.msgs.push({ role: "bot", html: r.html, cards: "", chips: r.chips });
      }
      state.msgs.forEach((m) => addMsg(m.role, m.html, m.cards || ""));
      renderChips(state.msgs[state.msgs.length - 1]?.chips || []);
      log.scrollTop = log.scrollHeight;
      save();
    };

    const send = async (text) => {
      const t = String(text || "").trim();
      if (!t) return;
      addMsg("user", `<p>${esc(t)}</p>`);
      state.msgs.push({ role: "user", html: `<p>${esc(t)}</p>` });
      renderChips([]);
      scrollTo(log, false);

      const typing = addMsg("bot", '<span class="nq-typing" aria-label="Typing"><i></i><i></i><i></i></span>');
      scrollTo(typing, false);
      const [ctx] = await Promise.all([
        getContext(),
        new Promise((r) => setTimeout(r, calm ? 0 : 450)),
      ]);
      typing.remove();

      let r;
      try {
        r = reply(t, ctx);
      } catch (err) {
        console.error("NOVIQ assistant error:", err);
      }
      if (!r)
        r = {
          html: `<p>Sorry, something went wrong on my side. You can ${link("explore.html", "browse every resource")} or ${link("contact.html", "contact the team")}.</p>`,
          cards: [],
          chips: ["Show free resources"],
        };
      if (!ctx.products.length && !ctx.notes.length && !r.cards.length && /couldn't find/.test(r.html))
        r.html += `<p>The catalogue didn't load, so please try ${link("explore.html", "Explore")} directly.</p>`;
      const cards = (r.cards || []).map(cardHTML).join("");
      const m = addMsg("bot", r.html, cards);
      state.msgs.push({ role: "bot", html: r.html, cards, chips: r.chips });
      state.msgs = state.msgs.slice(-40);
      renderChips(r.chips);
      scrollTo(m, cards.length > 0);
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
      restore();
      input.focus({ preventScroll: true });
    });
    // After "+ Enquiry list" is clicked, cart.js updates the button text.
    // Mark it visually so the state is clear inside the chat.
    log.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) setTimeout(() => add.classList.add("added"), 0);
    });

    restore();
    if (state.open) open(false);
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
