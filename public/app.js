const config = window.APP_CONFIG || {};

const intro = document.querySelector("#intro");
const startButton = document.querySelector("#start");
const hint = document.querySelector("#hint");
const marker = document.querySelector("#marker");
const contentAnchor = document.querySelector("#content-anchor");
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
      "Vise tout le coffre noir et blanc, puis touche le sceau.";
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
let markerTracked = false;
let letterShown = false;
let lastMarkerSeenAt = 0;

// Keep the last valid marker pose briefly when tracking flickers.
// This prevents the letter from flashing off while the lock is still visible.
const TRACKING_GRACE_MS = 2000;

function copyMarkerPose() {
  if (!marker?.object3D || !contentAnchor?.object3D) {
    return;
  }

  const now = performance.now();

  if (marker.object3D.visible) {
    markerTracked = true;
    lastMarkerSeenAt = now;

    contentAnchor.object3D.position.copy(marker.object3D.position);
    contentAnchor.object3D.quaternion.copy(marker.object3D.quaternion);
    contentAnchor.object3D.scale.copy(marker.object3D.scale);
    contentAnchor.object3D.visible = true;
  } else if (
    markerTracked &&
    now - lastMarkerSeenAt > TRACKING_GRACE_MS
  ) {
    markerTracked = false;
    contentAnchor.object3D.visible = false;

    hint.textContent = unlocked
      ? "Reviens vers le coffre noir et blanc pour revoir le menu."
      : "Vise de nouveau tout le coffre noir et blanc.";
  }

  requestAnimationFrame(copyMarkerPose);
}

requestAnimationFrame(copyMarkerPose);

marker.addEventListener("markerFound", () => {
  console.log("Main marker detected");

  markerTracked = true;
  lastMarkerSeenAt = performance.now();
  contentAnchor.object3D.visible = true;

  hint.textContent = unlocked
    ? "Le menu caché est ouvert."
    : "Coffre détecté. Touche le sceau rouge.";

  scroll.setAttribute("visible", "true");

  // Only play the entrance animation once. Repeated markerFound events
  // caused by tracking jitter should not reset the letter to near-zero size.
  if (!letterShown) {
    letterShown = true;
    scroll.removeAttribute("animation__appear");
    scroll.setAttribute("scale", "0.01 0.01 0.01");

    requestAnimationFrame(() => {
      scroll.setAttribute(
        "animation__appear",
        "property: scale; from: 0.01 0.01 0.01; to: 1.35 1.35 1.35; dur: 900; easing: easeOutElastic"
      );
    });
  } else if (unlocked) {
    scroll.removeAttribute("animation__appear");
    scroll.setAttribute("scale", "1.5 1.5 1.5");
  } else {
    scroll.setAttribute("scale", "1.35 1.35 1.35");
  }
});

marker.addEventListener("markerLost", () => {
  console.log("Main marker temporarily lost");

  // Do not hide immediately. copyMarkerPose() keeps the last pose during
  // TRACKING_GRACE_MS and only hides after a sustained loss.
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
    "property: scale; to: 1.5 1.5 1.5; dur: 650; easing: easeInOutCubic"
  );

  seal.setAttribute("color", "#b8860b");

  hint.textContent = "La carte des boissons est révélée.";
});
