const config = window.APP_CONFIG || {};

const intro = document.querySelector("#intro");
const startButton = document.querySelector("#start");
const hint = document.querySelector("#hint");
const marker = document.querySelector("#marker");
const scroll = document.querySelector("#scroll");
const seal = document.querySelector("#seal");
const menuLines = document.querySelector("#menu-lines");
const barName = document.querySelector("#bar-name");
const scene = document.querySelector("#scene");

function syncARCanvasSize() {
  if (!scene.renderer) {
    return;
  }

  const canvas = scene.renderer.domElement;

  const width = Math.round(
    window.visualViewport?.width || document.documentElement.clientWidth
  );

  const height = Math.round(
    window.visualViewport?.height || document.documentElement.clientHeight
  );

  /*
   * Keep the CSS display dimensions and WebGL drawing-buffer dimensions
   * at the same aspect ratio. Without this, circles become ovals.
   */
  scene.style.width = `${width}px`;
  scene.style.height = `${height}px`;

  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  scene.renderer.setPixelRatio(window.devicePixelRatio || 1);
  scene.renderer.setSize(width, height, false);

  /*
   * The cursor camera also needs the same viewport aspect ratio.
   */
  const camera = scene.camera;

  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

scene.addEventListener("renderstart", () => {
  syncARCanvasSize();

  /*
   * AR.js performs some delayed resizing after initialization,
   * especially on iOS, so repeat after it has finished.
   */
  setTimeout(syncARCanvasSize, 100);
  setTimeout(syncARCanvasSize, 500);
  setTimeout(syncARCanvasSize, 1000);
});

window.addEventListener("resize", syncARCanvasSize);
window.addEventListener("orientationchange", () => {
  setTimeout(syncARCanvasSize, 250);
});

window.visualViewport?.addEventListener("resize", syncARCanvasSize);

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
    syncARCanvasSize();
    setTimeout(syncARCanvasSize, 250);

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

let unlocked = false;

marker.addEventListener("markerFound", () => {
  console.log("Main marker detected");

  hint.textContent = unlocked
    ? "The hidden menu is open."
    : "Chest found. Touch the red seal.";

  scroll.setAttribute("visible", "true");

  if (!unlocked) {
    scroll.removeAttribute("animation__appear");
    scroll.setAttribute("scale", "0.01 0.01 0.01");

    requestAnimationFrame(() => {
      scroll.setAttribute(
        "animation__appear",
        "property: scale; from: 0.01 0.01 0.01; to: 0.78 0.78 0.78; dur: 900; easing: easeOutElastic"
      );
    });
  } else {
    scroll.removeAttribute("animation__appear");
    scroll.setAttribute("scale", "1 1 1");
  }
});

marker.addEventListener("markerLost", () => {
  console.log("Main marker lost");

  if (unlocked) {
    hint.textContent =
      "Point the camera back at the marker to see the menu.";
    return;
  }

  hint.textContent = "Point the camera back at the lock.";

  scroll.removeAttribute("animation__appear");
  scroll.setAttribute("visible", "false");
  scroll.setAttribute("scale", "0.01 0.01 0.01");
});

seal.addEventListener("click", () => {
  if (unlocked) {
    return;
  }

  unlocked = true;

  document.querySelectorAll(".drink-line").forEach((line, index) => {
    line.setAttribute("visible", "true");

    line.setAttribute(
      `animation__reveal${index}`,
      `property: text.opacity; from: 0; to: 1; delay: ${
        index * 140
      }; dur: 650`
    );
  });

  scroll.removeAttribute("animation__appear");

  scroll.setAttribute(
    "animation__open",
    "property: scale; to: 1 1 1; dur: 650; easing: easeInOutCubic"
  );

  seal.setAttribute("color", "#b8860b");

  hint.textContent = "The drinks menu is revealed.";
});
