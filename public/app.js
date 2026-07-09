const config = window.APP_CONFIG || {};

const intro = document.querySelector("#intro");
const introCopy = document.querySelector("#intro-copy");
const startButton = document.querySelector("#start");
const hint = document.querySelector("#hint");
const scene = document.querySelector("#scene");
const marker = document.querySelector("#marker");
const choiceOverlay = document.querySelector("#choice-overlay");
const bluePill = document.querySelector("#blue-pill");
const redPill = document.querySelector("#red-pill");
const barName = document.querySelector("#bar-name");

const SCAN_TIMEOUT_MS = 45_000;

barName.textContent = config.barName || "La Matrissse";

let choiceUnlocked = false;
let scanTimeoutId = null;
let sessionExpired = false;

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

  sessionExpired = true;
  stopAR();

  hint.classList.add("hidden");
  choiceOverlay.classList.add("hidden");
  intro.classList.remove("hidden");

  introCopy.textContent =
    "La recherche a expiré après 45 secondes. Appuie pour recommencer.";

  startButton.disabled = false;
  startButton.textContent = "Recommencer";
}

function beginScanTimeout() {
  clearScanTimeout();
  scanTimeoutId = window.setTimeout(returnToLandingPage, SCAN_TIMEOUT_MS);
}

async function startCamera() {
  if (sessionExpired) {
    window.location.reload();
    return;
  }

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
    hint.textContent = "Vise tout le symbole noir et blanc.";

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

function revealChoice() {
  if (choiceUnlocked) {
    return;
  }

  choiceUnlocked = true;
  clearScanTimeout();

  hint.classList.add("hidden");
  choiceOverlay.classList.remove("hidden");

  // The camera, marker detector and WebGL renderer are no longer needed once
  // the choice is visible. Stopping them reduces heat and battery use.
  stopAR();

  window.setTimeout(() => bluePill.focus({ preventScroll: true }), 250);
}

marker.addEventListener("markerFound", revealChoice);

marker.addEventListener("markerLost", () => {
  if (!choiceUnlocked) {
    hint.textContent = "Vise de nouveau tout le symbole noir et blanc.";
  }
});

function goTo(path) {
  stopAR();
  window.location.assign(path);
}

bluePill.addEventListener("click", () => {
  bluePill.disabled = true;
  redPill.disabled = true;
  goTo("/official-drinks.html");
});

redPill.addEventListener("click", () => {
  bluePill.disabled = true;
  redPill.disabled = true;
  goTo("/underground-menu.html");
});

window.addEventListener("pagehide", stopAR);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAR();
  }
});
