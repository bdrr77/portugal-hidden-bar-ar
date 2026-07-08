import express from "express";
import QRCode from "qrcode";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const port = Number(process.env.PORT || 8080);
const publicUrl = (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, "");
const barName = process.env.BAR_NAME || "O Cofre Escondido";
const menu = parseMenu(process.env.DRINKS);

app.disable("x-powered-by");
app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
  })
);

app.get("/config.js", (_req, res) => {
  res.type("application/javascript");
  res.set("Cache-Control", "no-store");
  res.send(
    `window.APP_CONFIG=${JSON.stringify({
      publicUrl,
      barName,
      menu
    })};`
  );
});

app.get("/anchor.svg", async (_req, res, next) => {
  try {
    const targetUrl = `${publicUrl}/`;
    const qr = await QRCode.toString(targetUrl, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin: 1,
      color: { dark: "#111111", light: "#f7efd5" }
    });

    const qrBody = qr
      .replace(/^<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "");

    res.type("image/svg+xml");
    res.set("Cache-Control", "no-store");
    res.send(renderAnchorSvg({ qrBody, barName }));
  } catch (error) {
    next(error);
  }
});

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Portugal Hidden Bar AR listening on :${port}`);
  console.log(`Public URL: ${publicUrl}`);
});

function parseMenu(raw) {
  const fallback = [
    { name: "Porto Tónico", detail: "Porto branco, água tónica, limão" },
    { name: "Ginjinha", detail: "Licor de ginja, servido à maneira de Lisboa" },
    { name: "Poncha da Madeira", detail: "Aguardente, mel e citrinos" },
    { name: "Navegador", detail: "Rum escuro, ananás e canela" },
    { name: "Maré Alta", detail: "Sem álcool — lima, hortelã e água com gás" }
  ];

  if (!raw) return fallback;

  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || value.length === 0) return fallback;
    return value.map((item) =>
      typeof item === "string"
        ? { name: item, detail: "" }
        : { name: String(item.name || ""), detail: String(item.detail || "") }
    );
  } catch {
    return raw
      .split("|")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name, detail: "" }));
  }
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAnchorSvg({ qrBody, barName }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 1000 1000">
  <defs>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6c351b"/>
      <stop offset=".45" stop-color="#9a542a"/>
      <stop offset="1" stop-color="#48210f"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0ce70"/>
      <stop offset=".5" stop-color="#a56a17"/>
      <stop offset="1" stop-color="#f6dd8b"/>
    </linearGradient>
    <pattern id="tiles" width="80" height="80" patternUnits="userSpaceOnUse">
      <rect width="80" height="80" fill="#f4f0df"/>
      <path d="M0 40L40 0L80 40L40 80Z" fill="none" stroke="#2467a2" stroke-width="8"/>
      <circle cx="40" cy="40" r="10" fill="#2467a2"/>
    </pattern>
    <filter id="shadow">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-opacity=".45"/>
    </filter>
  </defs>

  <rect width="1000" height="1000" rx="38" fill="url(#tiles)"/>
  <rect x="35" y="35" width="930" height="930" rx="30" fill="none" stroke="#123a5a" stroke-width="18"/>

  <text x="500" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="42" font-weight="bold" fill="#16374e">${escapeXml(barName)}</text>
  <text x="500" y="135" text-anchor="middle" font-family="Georgia,serif" font-size="23" fill="#16374e">O segredo abre-se aos navegadores</text>

  <g filter="url(#shadow)">
    <path d="M190 355 Q500 130 810 355 L810 510 L190 510Z" fill="url(#wood)" stroke="#291208" stroke-width="22"/>
    <path d="M205 365 Q500 175 795 365" fill="none" stroke="url(#gold)" stroke-width="42"/>
    <rect x="165" y="485" width="670" height="350" rx="34" fill="url(#wood)" stroke="#291208" stroke-width="24"/>
    <path d="M175 575H825M175 745H825" stroke="#2f160b" stroke-width="18" opacity=".75"/>
    <path d="M245 490V830M755 490V830" stroke="url(#gold)" stroke-width="38"/>
    <path d="M170 530H830M170 790H830" stroke="url(#gold)" stroke-width="34"/>
  </g>

  <!-- AR.js Hiro marker, presented as the chest lock plate. -->
  <g transform="translate(390 520)">
    <rect width="220" height="220" rx="14" fill="url(#gold)" stroke="#4a2d08" stroke-width="12"/>
    <g transform="translate(30 30) scale(.625)">
      <rect width="256" height="256" fill="#000"/>
      <rect x="32" y="32" width="192" height="192" fill="#fff"/>
      <path fill="#000" d="M50 50h38v62h80V50h38v156h-38v-62H88v62H50z"/>
      <path fill="#000" d="M101 75h54v23h-54zM101 158h54v23h-54z"/>
    </g>
  </g>

  <!-- QR is embedded in the picture; it launches the AR page. -->
  <g transform="translate(690 175)">
    <rect x="-20" y="-20" width="250" height="250" rx="18" fill="#f7efd5" stroke="#16374e" stroke-width="10"/>
    <svg width="210" height="210" viewBox="0 0 37 37" preserveAspectRatio="xMidYMid meet">
      ${qrBody}
    </svg>
    <text x="105" y="260" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="#16374e">SCAN</text>
  </g>

  <text x="500" y="910" text-anchor="middle" font-family="Georgia,serif" font-size="27" font-style="italic" fill="#153850">Scanne le QR, puis vise la serrure du coffre.</text>
  <text x="500" y="948" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#153850">Imprimer à 100 % — format final 10 × 10 cm</text>
</svg>`;
}
