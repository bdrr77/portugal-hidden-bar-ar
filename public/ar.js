const config = window.APP_CONFIG || {};

const intro = document.querySelector("#intro");
const introCopy = document.querySelector("#intro-copy");
const startButton = document.querySelector("#start");
const hint = document.querySelector("#hint");
const scene = document.querySelector("#scene");
const marker = document.querySelector("#marker");
const contentAnchor = document.querySelector("#content-anchor");
const choiceCard = document.querySelector("#choice-card");
const bluePill = document.querySelector("#blue-pill");
const redPill = document.querySelector("#red-pill");
const barName = document.querySelector("#bar-name");

const scanTimeoutMs = 45_000;
const scanTimeoutKey = "ar-scan-timeout";

barName.textContent = config.barName || "O Cofre Escondido";

if (window.sessionStorage.getItem(scanTimeoutKey) === "1") {
  window.sessionStorage.removeItem(scanTimeoutKey);
  introCopy.textContent =
    "La recherche a expiré après 45 secondes. Tu peux réessayer.";
  startButton.disabled = false;
  startButton.textContent = "Entrer dans le bar caché";
}

let scanTimeoutId = null;
let choiceUnlocked = false;

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

function clearScanTimeout() {
  if (scanTimeoutId !== null) {
    window.clearTimeout(scanTimeoutId);
    scanTimeoutId = null;
  }
}

function stopAR() {
  clearScanTimeout();

  const video =
    document.querySelector("#arjs-video") ||
    document.querySelector("video");

  if (video?.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.pause();
    video.srcObject = null;
  }

  scene?.pause();
  scene?.setAttribute("visible", "false");
}

function returnToLandingPage() {
  if (choiceUnlocked) {
    return;
  }

  // AR.js does not reliably restart after its media tracks are stopped.
  // Reloading gives the landing page a fresh camera and marker state.
  window.sessionStorage.setItem(scanTimeoutKey, "1");
  stopAR();
  window.location.reload();
}

function beginScanTimeout() {
  clearScanTimeout();
  scanTimeoutId = window.setTimeout(returnToLandingPage, scanTimeoutMs);
}

async function startCamera() {
  startButton.disabled = true;
  startButton.textContent = "Ouverture de la caméra...";

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
    hint.textContent = "Vise tout le coffre noir et blanc.";

    beginScanTimeout();
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

let markerTracked = false;
let cardShown = false;
let lastMarkerSeenAt = 0;

const trackingGraceMs = 2000;

function copyMarkerPose() {
  if (!marker?.object3D || !contentAnchor?.object3D) {
    requestAnimationFrame(copyMarkerPose);
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
  } else if (markerTracked && now - lastMarkerSeenAt > trackingGraceMs) {
    markerTracked = false;
    contentAnchor.object3D.visible = false;
    hint.textContent = "Vise de nouveau tout le coffre noir et blanc.";
  }

  requestAnimationFrame(copyMarkerPose);
}

requestAnimationFrame(copyMarkerPose);

marker.addEventListener("markerFound", () => {
  if (choiceUnlocked) {
    return;
  }

  choiceUnlocked = true;
  clearScanTimeout();

  markerTracked = true;
  lastMarkerSeenAt = performance.now();
  contentAnchor.object3D.visible = true;

  hint.textContent = "Blue pill or red pill?";
  choiceCard.setAttribute("visible", "true");

  if (!cardShown) {
    cardShown = true;
    choiceCard.removeAttribute("animation__appear");
    choiceCard.setAttribute("scale", "0.01 0.01 0.01");

    requestAnimationFrame(() => {
      choiceCard.setAttribute(
        "animation__appear",
        "property: scale; from: 0.01 0.01 0.01; to: 1.35 1.35 1.35; dur: 850; easing: easeOutElastic"
      );
    });
  } else {
    choiceCard.setAttribute("scale", "1.35 1.35 1.35");
  }
});

marker.addEventListener("markerLost", () => {
  // The last pose remains visible for trackingGraceMs.
});

function goTo(path) {
  stopAR();
  window.location.assign(path);
}

bluePill.addEventListener("click", () => {
  hint.textContent = "Ouverture de la carte officielle...";
  goTo("/official-drinks.html");
});

redPill.addEventListener("click", () => {
  hint.textContent = "Ouverture du menu underground...";
  goTo("/underground-menu.html");
});

window.addEventListener("pagehide", stopAR);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAR();
  }
});
