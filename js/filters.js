const Filters = {
  cat: Q.get("cat") || "all",
  sort: "featured",
  list: ["all", "build", "learn", "organize", "practice", "bundle"],
};
if ($("#fl"))
  load.then((P) => {
    const sorts = {
      featured: (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0),
      low: (a, b) => (a.price_inr || 0) - (b.price_inr || 0),
      high: (a, b) => (b.price_inr || 0) - (a.price_inr || 0),
    };
    const draw = () => {
      $("#fl").innerHTML = Filters.list
        .map((x) => `<button class="chip ${x == Filters.cat ? "on" : ""}" data-c="${x}">${x == "all" ? "All" : x[0].toUpperCase() + x.slice(1)}</button>`)
        .join("");
      const L = P.filter((p) => (Filters.cat == "all" || p.category == Filters.cat) && Search.match(p)).sort(sorts[Filters.sort]);
      $("#ex").innerHTML = L.map(card).join("") ||
        '<p class="empty-state">No resources match. Try another search or category.</p>';
      $("#cnt").textContent = L.length + (L.length == 1 ? " resource" : " resources");
    };
    $("#fl").onclick = (e) => {
      if (e.target.dataset.c) { Filters.cat = e.target.dataset.c; draw(); }
    };
    $("#so")?.addEventListener("change", (e) => { Filters.sort = e.target.value; draw(); });
    Search.bind(draw);
    draw();
  });
