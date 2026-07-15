const loginPanel = document.querySelector("#login-panel");
const editorPanel = document.querySelector("#editor-panel");
const loginForm = document.querySelector("#login-form");
const menuForm = document.querySelector("#menu-form");
const logoutButton = document.querySelector("#logout-button");
const saveButton = document.querySelector("#save-button");
const statusText = document.querySelector("#status");
const template = document.querySelector("#drink-row-template");
const lists = {
  officialDrinks: document.querySelector("#official-list"),
  menu: document.querySelector("#underground-list")
};

let state = {
  officialDrinks: [],
  menu: []
};

function setStatus(message) {
  statusText.textContent = message;
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function createRow(listName, drink = { name: "", detail: "" }) {
  const row = template.content.firstElementChild.cloneNode(true);
  const nameInput = row.querySelector(".drink-name-input");
  const detailInput = row.querySelector(".drink-detail-input");
  const removeButton = row.querySelector(".remove-button");

  nameInput.value = drink.name || "";
  detailInput.value = drink.detail || "";
  removeButton.addEventListener("click", () => {
    row.remove();
    if (lists[listName].children.length === 0) {
      lists[listName].append(createRow(listName));
    }
  });

  return row;
}

function renderList(listName) {
  lists[listName].replaceChildren();
  const drinks = state[listName].length ? state[listName] : [{ name: "", detail: "" }];

  drinks.forEach((drink) => {
    lists[listName].append(createRow(listName, drink));
  });
}

function renderEditor() {
  renderList("officialDrinks");
  renderList("menu");
}

function collectList(listName) {
  return [...lists[listName].querySelectorAll(".drink-row")]
    .map((row) => ({
      name: row.querySelector(".drink-name-input").value.trim(),
      detail: row.querySelector(".drink-detail-input").value.trim()
    }))
    .filter((drink) => drink.name);
}

async function loadMenu() {
  state = await requestJson("/api/admin/menu");
  renderEditor();
  loginPanel.classList.add("hidden");
  editorPanel.classList.remove("hidden");
  setStatus("");
}

async function tryExistingSession() {
  try {
    await loadMenu();
  } catch {
    loginPanel.classList.remove("hidden");
    editorPanel.classList.add("hidden");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector("button");

  submitButton.disabled = true;
  try {
    await requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: formData.get("password") })
    });
    loginForm.reset();
    await loadMenu();
  } catch (error) {
    alert(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

menuForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  setStatus("Saving...");

  try {
    state = await requestJson("/api/admin/menu", {
      method: "PUT",
      body: JSON.stringify({
        officialDrinks: collectList("officialDrinks"),
        menu: collectList("menu")
      })
    });
    renderEditor();
    setStatus("Saved");
  } catch (error) {
    setStatus(error.message);
  } finally {
    saveButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  await requestJson("/api/admin/logout", { method: "POST", body: "{}" });
  editorPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
});

document.querySelectorAll(".add-button").forEach((button) => {
  button.addEventListener("click", () => {
    lists[button.dataset.list].append(createRow(button.dataset.list));
  });
});

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-button").forEach((tab) => {
      tab.classList.toggle("active", tab === button);
    });
    document.querySelectorAll(".menu-editor").forEach((section) => {
      section.classList.toggle("active", section.dataset.section === button.dataset.target);
    });
  });
});

tryExistingSession();
