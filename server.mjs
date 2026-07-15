import { createServer } from "node:http";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const publicUrl = (process.env.PUBLIC_URL || `http://${host}:${port}`).replace(/\/+$/, "");
const barName = process.env.BAR_NAME || "O Cofre Escondido";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const menuDataFile = process.env.MENU_DATA_FILE || "/tmp/hidden-bar-menu.json";
const sessionMaxAgeSeconds = 60 * 60 * 12;
const maxBodyBytes = 1024 * 1024;

const defaultMenu = [
  { name: "Porto Tónico", detail: "Porto branco, água tónica, limão" },
  { name: "Ginjinha", detail: "Licor de ginja" },
  { name: "Poncha da Madeira", detail: "Aguardente, mel e citrinos" },
  { name: "Navegador", detail: "Rum escuro, ananás e canela" },
  { name: "Maré Alta", detail: "Sem álcool — lima, hortelã e água com gás" }
];
const defaultOfficialDrinks = [
  { name: "Super Bock", detail: "Portuguese lager" },
  { name: "Sagres", detail: "Portuguese lager" },
  { name: "Vinho Verde", detail: "Fresh Portuguese white wine" },
  { name: "Douro Tinto", detail: "Red wine from the Douro Valley" },
  { name: "Porto", detail: "Portuguese fortified wine" },
  { name: "Água com Gás", detail: "Sparkling mineral water" }
];


function parseMenu(raw, fallback) {
  if (!raw) return fallback;

  try {
    const value = JSON.parse(raw);

    if (!Array.isArray(value) || value.length === 0) {
      return fallback;
    }

    return value.map((item) =>
      typeof item === "string"
        ? { name: item, detail: "" }
        : {
            name: String(item.name || ""),
            detail: String(item.detail || "")
          }
    );
  } catch {
    return raw
      .split("|")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, detail: "" }));
  }
}

const menu = parseMenu(process.env.DRINKS, defaultMenu);
const officialDrinks = parseMenu(
  process.env.OFFICIAL_DRINKS,
  defaultOfficialDrinks
);
let menuState = await loadMenuState();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".patt": "text/plain; charset=utf-8"
};

function send(res, status, contentType, body) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function sendJson(res, status, body) {
  send(res, status, "application/json; charset=utf-8", JSON.stringify(body));
}

function sanitizeMenu(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 100)
    .map((item) => ({
      name: String(item?.name || "").trim().slice(0, 120),
      detail: String(item?.detail || "").trim().slice(0, 400)
    }))
    .filter((item) => item.name);
}

function defaultMenuState() {
  return {
    menu: sanitizeMenu(menu),
    officialDrinks: sanitizeMenu(officialDrinks)
  };
}

async function loadMenuState() {
  try {
    const raw = await readFile(menuDataFile, "utf8");
    const value = JSON.parse(raw);
    const loaded = {
      menu: sanitizeMenu(value.menu),
      officialDrinks: sanitizeMenu(value.officialDrinks)
    };

    if (loaded.menu.length || loaded.officialDrinks.length) {
      return {
        menu: loaded.menu.length ? loaded.menu : sanitizeMenu(menu),
        officialDrinks: loaded.officialDrinks.length
          ? loaded.officialDrinks
          : sanitizeMenu(officialDrinks)
      };
    }
  } catch {
    // First boot, invalid JSON, or a read-only path: fall back to env/defaults.
  }

  return defaultMenuState();
}

async function saveMenuState(nextState) {
  const safeState = {
    menu: sanitizeMenu(nextState.menu),
    officialDrinks: sanitizeMenu(nextState.officialDrinks)
  };
  const tempPath = `${menuDataFile}.${process.pid}.tmp`;

  await mkdir(dirname(menuDataFile), { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(safeState, null, 2)}\n`);
  await rename(tempPath, menuDataFile);
  menuState = safeState;
}

function signSession(payload) {
  return createHmac("sha256", sessionSecret).update(payload).digest("base64url");
}

function createSessionCookie() {
  const expires = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;
  const payload = `admin.${expires}`;
  const signature = signSession(payload);

  return `bar_admin=${payload}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionMaxAgeSeconds}`;
}

function clearSessionCookie() {
  return "bar_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

function isAdminRequest(req) {
  if (!adminPassword) return false;

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)bar_admin=([^;]+)/);
  if (!match) return false;

  const parts = match[1].split(".");
  if (parts.length !== 3) return false;

  const [role, expires, signature] = parts;
  const payload = `${role}.${expires}`;
  const expectedSignature = signSession(payload);

  return (
    role === "admin" &&
    Number(expires) > Math.floor(Date.now() / 1000) &&
    safeEqual(signature, expectedSignature)
  );
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      throw new Error("Request body is too large");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleAdminApi(req, res, url) {
  if (url.pathname === "/api/admin/login" && req.method === "POST") {
    if (!adminPassword) {
      sendJson(res, 503, { error: "Admin access is not configured" });
      return true;
    }

    try {
      const body = await readJsonBody(req);
      if (safeEqual(String(body.password || ""), adminPassword)) {
        res.setHeader("Set-Cookie", createSessionCookie());
        sendJson(res, 200, { ok: true });
      } else {
        sendJson(res, 401, { error: "Invalid password" });
      }
    } catch {
      sendJson(res, 400, { error: "Invalid request" });
    }
    return true;
  }

  if (url.pathname === "/api/admin/logout" && req.method === "POST") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (!url.pathname.startsWith("/api/admin/")) return false;

  if (!isAdminRequest(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return true;
  }

  if (url.pathname === "/api/admin/menu" && req.method === "GET") {
    sendJson(res, 200, menuState);
    return true;
  }

  if (url.pathname === "/api/admin/menu" && req.method === "PUT") {
    try {
      const body = await readJsonBody(req);
      await saveMenuState(body);
      sendJson(res, 200, menuState);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Could not save menu" });
    }
    return true;
  }

  sendJson(res, 404, { error: "Not found" });
  return true;
}

async function serveStatic(pathname, res) {
  let relativePath = pathname === "/" ? "/index.html" : pathname;
  if (relativePath === "/ar" || relativePath === "/ar/") relativePath = "/ar.html";

  try {
    relativePath = decodeURIComponent(relativePath);
  } catch {
    send(res, 400, "text/plain; charset=utf-8", "Bad request");
    return;
  }

  const safePath = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(process.cwd(), "public", safePath);

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }

    const data = await readFile(filePath);
    const extension = extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || "application/octet-stream";

    if ([".patt", ".html", ".js"].includes(extension)) {
      res.setHeader("Cache-Control", "no-store");
    }

    send(res, 200, contentType, data);
  } catch {
    send(res, 404, "text/plain; charset=utf-8", "Not found");
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (await handleAdminApi(req, res, url)) {
    return;
  }

  if (url.pathname === "/healthz") {
    send(
      res,
      200,
      "application/json; charset=utf-8",
      JSON.stringify({ status: "ok" })
    );
    return;
  }

  if (url.pathname === "/config.js") {
    res.setHeader("Cache-Control", "no-store");

    send(
      res,
      200,
      "application/javascript; charset=utf-8",
      `window.APP_CONFIG=${JSON.stringify({
        publicUrl,
        barName,
        menu: menuState.menu,
        officialDrinks: menuState.officialDrinks
      })};`
    );
    return;
  }

  await serveStatic(url.pathname, res);
}).listen(port, "0.0.0.0", () => {
  console.log(`Portugal Hidden Bar AR listening on :${port}`);
  console.log(`Public URL: ${publicUrl}`);
});
