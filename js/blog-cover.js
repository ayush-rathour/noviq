(function () {
  const coverWords = {
    internet: "CONNECTED.",
    git: "VERSIONED.",
    design: "VISUALS.",
    code: "THE WEB, BUILT.",
    api: "CONNECTED SYSTEMS.",
    database: "DATA STRUCTURE.",
    deploy: "CONFIDENCE SHIPPING.",
    security: "STAY AWARE.",
  };
  const coverArt = {
    internet:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><circle cx="120" cy="70" r="43" fill="none" stroke="#CBF36A" stroke-width="3"/><ellipse cx="120" cy="70" rx="18" ry="43" fill="none" stroke="#FFFFFF" stroke-width="2"/><path d="M78 70h84M88 48h64M88 92h64" fill="none" stroke="#6A4CFF" stroke-width="3"/><circle cx="120" cy="70" r="5" fill="#CBF36A"/></svg>',
    git: '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><path d="M80 36l40-18 40 18v48l-40 24-40-24z" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M96 42v35m0-35l28 15m0 0v30m0-30l22-14" fill="none" stroke="#FFFFFF" stroke-width="3"/><circle cx="96" cy="42" r="6" fill="#6A4CFF"/><circle cx="124" cy="57" r="6" fill="#CBF36A"/><circle cx="124" cy="87" r="6" fill="#6A4CFF"/><circle cx="146" cy="43" r="6" fill="#FFFFFF"/></svg>',
    design:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><rect x="66" y="28" width="108" height="78" rx="10" fill="none" stroke="#FFFFFF" stroke-width="3"/><path d="M66 48h108" stroke="#6A4CFF" stroke-width="3"/><circle cx="80" cy="38" r="3" fill="#CBF36A"/><rect x="82" y="61" width="30" height="30" rx="5" fill="#6A4CFF"/><path d="M124 65h34M124 77h27M124 89h20" stroke="#CBF36A" stroke-width="4" stroke-linecap="round"/></svg>',
    code: '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><path d="M95 42L65 70l30 28M145 42l30 28-30 28M132 30l-24 80" fill="none" stroke="#CBF36A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="65" cy="70" r="5" fill="#6A4CFF"/><circle cx="175" cy="70" r="5" fill="#6A4CFF"/></svg>',
    api: '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><rect x="52" y="42" width="54" height="54" rx="10" fill="none" stroke="#FFFFFF" stroke-width="3"/><rect x="134" y="42" width="54" height="54" rx="10" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M108 58h22m-8-8l8 8-8 8M132 80h-22m8-8l-8 8 8 8" fill="none" stroke="#6A4CFF" stroke-width="4" stroke-linecap="round"/></svg>',
    database:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><ellipse cx="120" cy="35" rx="48" ry="16" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M72 35v65c0 9 21 16 48 16s48-7 48-16V35M72 57c0 9 21 16 48 16s48-7 48-16M72 79c0 9 21 16 48 16s48-7 48-16" fill="none" stroke="#FFFFFF" stroke-width="3"/><path d="M120 35v65" stroke="#6A4CFF" stroke-width="2" stroke-dasharray="4 6"/></svg>',
    deploy:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><rect x="54" y="68" width="48" height="36" rx="6" fill="none" stroke="#FFFFFF" stroke-width="3"/><path d="M66 81l8 7-8 7m15 0h10M104 86h31m-10-10l10 10-10 10M151 103V58m-10 10l10-10 10 10M137 47h28" fill="none" stroke="#CBF36A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M104 86h31" stroke="#6A4CFF" stroke-width="4"/></svg>',
    security:
      '<svg class="blog-cover-visual" viewBox="0 0 240 140" aria-hidden="true"><path d="M120 20l48 18v30c0 29-19 48-48 61-29-13-48-32-48-61V38z" fill="none" stroke="#CBF36A" stroke-width="3"/><path d="M98 69l15 15 30-33" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="120" cy="70" r="61" fill="none" stroke="#6A4CFF" stroke-width="2" stroke-dasharray="5 8"/></svg>',
  };

  window.NOVIQBlogCover = { art: coverArt, words: coverWords };
})();
