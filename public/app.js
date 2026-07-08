const config = window.APP_CONFIG || {};
const intro = document.querySelector("#intro");
const start = document.querySelector("#start");
const hint = document.querySelector("#hint");
const marker = document.querySelector("#marker");
const scroll = document.querySelector("#scroll");
const seal = document.querySelector("#seal");
const menuLines = document.querySelector("#menu-lines");
const barName = document.querySelector("#bar-name");

barName.textContent = config.barName || "O Cofre Escondido";

const drinks = Array.isArray(config.menu) ? config.menu : [];
drinks.slice(0, 6).forEach((drink, index) => {
  const line = document.createElement("a-text");
  const detail = drink.detail ? ` — ${drink.detail}` : "";
  line.setAttribute("value", `${drink.name}${detail}`);
  line.setAttribute("color", "#34200f");
  line.setAttribute("align", "center");
  line.setAttribute("width", "2.35");
  line.setAttribute("position", `0 ${0.22 - index * 0.16} 0`);
  line.setAttribute("visible", "false");
  line.classList.add("drink-line");
  menuLines.appendChild(line);
});

start.addEventListener("click", () => {
  intro.classList.add("hidden");
  hint.classList.remove("hidden");
});

marker.addEventListener("markerFound", () => {
  hint.textContent = "Coffre trouvé. Touche le sceau rouge.";
  scroll.setAttribute("animation__appear", {
    property: "scale",
    from: "0.01 0.01 0.01",
    to: "0.78 0.78 0.78",
    dur: 900,
    easing: "easeOutElastic"
  });
});

marker.addEventListener("markerLost", () => {
  hint.textContent = "Reviens sur la serrure du coffre.";
});

let open = false;
seal.addEventListener("click", () => {
  open = !open;

  document.querySelectorAll(".drink-line").forEach((line, index) => {
    line.setAttribute("visible", open);
    if (open) {
      line.setAttribute(`animation__reveal${index}`, {
        property: "text.opacity",
        from: 0,
        to: 1,
        delay: index * 140,
        dur: 650
      });
    }
  });

  scroll.setAttribute("animation__open", {
    property: "scale",
    to: open ? "1 1 1" : "0.78 0.78 0.78",
    dur: 650,
    easing: "easeInOutCubic"
  });

  seal.setAttribute("color", open ? "#b8860b" : "#8b1d1d");
  hint.textContent = open ? "La carte des boissons est révélée." : "Touche le sceau pour ouvrir.";
});
