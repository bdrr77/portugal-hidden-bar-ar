const config = window.APP_CONFIG || {};
const pageType = document.body.dataset.menuType;
const isOfficial = pageType === "official";
const items = isOfficial
  ? config.officialDrinks
  : config.menu;

const barName = config.barName || "O Cofre Escondido";
const title = document.querySelector("#page-title");
const subtitle = document.querySelector("#page-subtitle");
const list = document.querySelector("#drink-list");

document.title = isOfficial
  ? `Carte officielle — ${barName}`
  : `Menu underground — ${barName}`;

title.textContent = isOfficial ? "Official drinks" : "Underground menu";
subtitle.textContent = isOfficial
  ? `The public drinks selection at ${barName}.`
  : `The hidden selection unlocked at ${barName}.`;

const drinks = Array.isArray(items) ? items : [];

if (drinks.length === 0) {
  const empty = document.createElement("li");
  empty.className = "empty";
  empty.textContent = "No drinks have been configured yet.";
  list.appendChild(empty);
} else {
  drinks.forEach((drink) => {
    const item = document.createElement("li");
    item.className = "drink-card";

    const name = document.createElement("h2");
    name.className = "drink-name";
    name.textContent = drink?.name || "Drink";

    const detail = document.createElement("p");
    detail.className = "drink-detail";
    detail.textContent = drink?.detail || "";

    item.append(name);
    if (detail.textContent) item.append(detail);
    list.appendChild(item);
  });
}
