import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || "0.0.0.0";
const publicUrl = (process.env.PUBLIC_URL || `http://${host}:${port}`).replace(/\/+$/, "");
const barName = process.env.BAR_NAME || "O Cofre Escondido";

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

async function serveStatic(pathname, res) {
  let relativePath = pathname === "/" ? "/index.html" : pathname;

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
        menu,
        officialDrinks
      })};`
    );
    return;
  }

  await serveStatic(url.pathname, res);
}).listen(port, "0.0.0.0", () => {
  console.log(`Portugal Hidden Bar AR listening on :${port}`);
  console.log(`Public URL: ${publicUrl}`);
});
