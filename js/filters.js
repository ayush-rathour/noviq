const Filters = {
  cat: Q.get("cat") || "all",
  list: ["all", "build", "learn", "organize", "practice", "bundle"],
};
if ($("#fl"))
  load.then((P) => {
    const draw = () => {
      $("#fl").innerHTML = Filters.list
        .map(
          (x) =>
            `<button class="chip ${x == Filters.cat ? "on" : ""}" data-c="${x}">${x[0].toUpperCase() + x.slice(1)}</button>`,
        )
        .join("");
      const L = P.filter(
        (p) =>
          (Filters.cat == "all" || p.category == Filters.cat) &&
          Search.match(p),
      );
      $("#ex").innerHTML =
        L.map(card).join("") ||
        "<p>No resources match. Try another search.</p>";
      $("#cnt").textContent = L.length + " resources";
    };
    $("#fl").onclick = (e) => {
      if (e.target.dataset.c) {
        Filters.cat = e.target.dataset.c;
        draw();
      }
    };
    Search.bind(draw);
    draw();
  });
