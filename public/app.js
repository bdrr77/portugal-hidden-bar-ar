const config = window.APP_CONFIG || {};

const intro = document.querySelector("#intro");
const startButton = document.querySelector("#start");
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

async function getCameraVideo(timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const video =
      document.querySelector("#arjs-video") ||
      document.querySelector("video");

    if (video) {
      return video;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("AR.js camera video was not created");
}

async function startCamera() {
  startButton.disabled = true;
  startButton.textContent = "Ouverture de la caméra…";

  try {
    const video = await getCameraVideo();

    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    await video.play();

    intro.classList.add("hidden");
    hint.classList.remove("hidden");
    hint.textContent =
      "Vise la serrure du coffre, puis touche le sceau.";
  } catch (error) {
    console.error("Camera startup failed:", error);

    startButton.disabled = false;
    startButton.textContent = "Réessayer";

    hint.classList.remove("hidden");
    hint.textContent =
      "La caméra ne démarre pas. Vérifie les autorisations du navigateur.";
  }
}

startButton.addEventListener("click", startCamera);

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

  hint.textContent = open
    ? "La carte des boissons est révélée."
    : "Touche le sceau pour ouvrir.";
});

window.addEventListener("load", () => {
  setTimeout(() => {
    const video = document.querySelector("#arjs-video, video");
    const scene = document.querySelector("a-scene");

    const diagnostics = {
      aframeLoaded: typeof AFRAME !== "undefined",
      sceneLoaded: scene?.hasLoaded ?? false,
      videoFound: Boolean(video),
      videoPaused: video?.paused,
      videoReadyState: video?.readyState,
      videoWidth: video?.videoWidth,
      videoHeight: video?.videoHeight,
      hasStream: Boolean(video?.srcObject),
      protocol: location.protocol
    };

    console.log("AR diagnostics", diagnostics);

    const box = document.createElement("pre");
    box.style.cssText = `
      position:fixed;
      top:8px;
      left:8px;
      right:8px;
      z-index:99999;
      padding:10px;
      margin:0;
      background:rgba(0,0,0,.8);
      color:white;
      font:12px monospace;
      white-space:pre-wrap;
    `;
    box.textContent = JSON.stringify(diagnostics, null, 2);
    document.body.appendChild(box);
  }, 4000);
});