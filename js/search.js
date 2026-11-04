const Search = {
  q: (Q.get("q") || "").toLowerCase().trim(),
  match(p) {
    return (p.title + " " + p.description + " " + p.category + " " + p.level)
      .toLowerCase()
      .includes(this.q);
  },
  bind(fn) {
    const i = $("#sq");
    if (!i) return;
    i.value = Q.get("q") || "";
    i.addEventListener("input", (e) => {
      this.q = e.target.value.toLowerCase().trim();
      fn();
    });
    if (Q.has("q")) i.focus();
  },
};
