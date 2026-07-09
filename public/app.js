const config = window.APP_CONFIG || {};

const intro = document.querySelector("#intro");
const startButton = document.querySelector("#start");
const hint = document.querySelector("#hint");
const marker = document.querySelector("#marker");
const choiceOverlay = document.querySelector("#choice-overlay");
const bluePill = document.querySelector("#blue-pill");
const redPill = document.querySelector("#red-pill");
const barName = document.querySelector("#bar-name");

barName.textContent = config.barName || "O Cofre Escondido";

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
    hint.textContent = "Vise tout le coffre noir et blanc.";
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

let choiceUnlocked = false;

function revealChoice() {
  if (choiceUnlocked) {
    return;
  }

  choiceUnlocked = true;
  hint.classList.add("hidden");
  choiceOverlay.classList.remove("hidden");

  // Focus the first real screen button for accessibility without requiring
  // the camera or AR cursor to move.
  window.setTimeout(() => bluePill.focus({ preventScroll: true }), 250);
}

marker.addEventListener("markerFound", revealChoice);

marker.addEventListener("markerLost", () => {
  // Once the chest has been recognized, the screen-space choice remains open.
  // Tracking loss cannot rotate or hide the menu.
  if (!choiceUnlocked) {
    hint.textContent = "Vise de nouveau tout le coffre noir et blanc.";
  }
});

function goTo(path) {
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
