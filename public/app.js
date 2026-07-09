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

const unlockedPanel =
  document.querySelector("#unlocked-panel");

const unlockedMenu =
  document.querySelector("#unlocked-menu");

barName.textContent =
  config.barName || "O Cofre Escondido";

const drinks =
  Array.isArray(config.menu)
    ? config.menu.slice(0, 6)
    : [];

/*
 * Populate the AR menu.
 */
drinks.forEach((drink, index) => {
  const line =
    document.createElement("a-text");

  const detail =
    drink.detail
      ? ` — ${drink.detail}`
      : "";

  line.setAttribute(
    "value",
    `${drink.name}${detail}`
  );

  line.setAttribute(
    "color",
    "#34200f"
  );

  line.setAttribute(
    "align",
    "center"
  );

  line.setAttribute(
    "width",
    "2.35"
  );

  line.setAttribute(
    "position",
    `0 ${0.22 - index * 0.16} 0`
  );

  line.setAttribute(
    "visible",
    "false"
  );

  line.classList.add("drink-line");

  menuLines.appendChild(line);
});

/*
 * Populate the permanent HTML menu.
 */
drinks.forEach((drink) => {
  const item =
    document.createElement("div");

  item.className =
    "unlocked-menu-item";

  const name =
    document.createElement("span");

  name.className =
    "unlocked-menu-name";

  name.textContent =
    drink.name || "Boisson";

  item.appendChild(name);

  if (drink.detail) {
    const detail =
      document.createElement("span");

    detail.className =
      "unlocked-menu-detail";

    detail.textContent =
      drink.detail;

    item.appendChild(detail);
  }

  unlockedMenu.appendChild(item);
});

if (drinks.length === 0) {
  const empty =
    document.createElement("div");

  empty.className =
    "unlocked-menu-item";

  empty.textContent =
    "La carte sera bientôt disponible.";

  unlockedMenu.appendChild(empty);
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

async function getCameraVideo(
  timeoutMs = 10000
) {
  const startedAt =
    Date.now();

  while (
    Date.now() - startedAt < timeoutMs
  ) {
    const video =
      document.querySelector("#arjs-video") ||
      document.querySelector("video");

    if (video) {
      return video;
    }

    await wait(100);
  }

  throw new Error(
    "AR.js camera video was not created"
  );
}

/*
 * Keep the WebGL render dimensions synchronized with
 * the visible scene dimensions. This prevents circles
 * and other objects from being stretched vertically.
 */
function resizeScene() {
  if (
    !scene ||
    !scene.renderer ||
    !scene.camera
  ) {
    return;
  }

  const rect =
    scene.getBoundingClientRect();

  const width =
    Math.max(
      1,
      Math.round(rect.width)
    );

  const height =
    Math.max(
      1,
      Math.round(rect.height)
    );

  scene.renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      2
    )
  );

  scene.renderer.setSize(
    width,
    height,
    false
  );

  scene.camera.aspect =
    width / height;

  scene.camera.updateProjectionMatrix();
}

if (scene.hasLoaded) {
  resizeScene();
} else {
  scene.addEventListener(
    "loaded",
    resizeScene,
    { once: true }
  );
}

window.addEventListener(
  "resize",
  () => {
    window.setTimeout(
      resizeScene,
      50
    );
  }
);

window.addEventListener(
  "orientationchange",
  () => {
    window.setTimeout(
      resizeScene,
      350
    );
  }
);

async function startCamera() {
  startButton.disabled = true;

  startButton.textContent =
    "Ouverture de la caméra…";

  try {
    const video =
      await getCameraVideo();

    video.setAttribute(
      "autoplay",
      ""
    );

    video.setAttribute(
      "muted",
      ""
    );

    video.setAttribute(
      "playsinline",
      ""
    );

    video.setAttribute(
      "webkit-playsinline",
      ""
    );

    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    await video.play();

    window.setTimeout(
      resizeScene,
      300
    );

    intro.classList.add("hidden");
    hint.classList.remove("hidden");

    hint.textContent =
      "Vise la serrure du coffre, puis touche le sceau.";
  } catch (error) {
    console.error(
      "Camera startup failed:",
      error
    );

    startButton.disabled = false;

    startButton.textContent =
      "Réessayer";

    hint.classList.remove("hidden");

    hint.textContent =
      "La caméra ne démarre pas. Vérifie les autorisations du navigateur.";
  }
}

startButton.addEventListener(
  "click",
  startCamera
);

let unlocked = false;

marker.addEventListener(
  "markerFound",
  () => {
    console.log(
      "Main marker detected"
    );

    if (unlocked) {
      hint.textContent =
        "Le coffre est déjà déverrouillé.";

      return;
    }

    hint.textContent =
      "Coffre trouvé. Touche le sceau rouge.";

    scroll.removeAttribute(
      "animation__appear"
    );

    scroll.setAttribute(
      "visible",
      "true"
    );

    scroll.setAttribute(
      "scale",
      "0.01 0.01 0.01"
    );

    requestAnimationFrame(() => {
      scroll.setAttribute(
        "animation__appear",
        [
          "property: scale",
          "from: 0.01 0.01 0.01",
          "to: 0.78 0.78 0.78",
          "dur: 900",
          "easing: easeOutElastic"
        ].join("; ")
      );
    });
  }
);

marker.addEventListener(
  "markerLost",
  () => {
    console.log(
      "Main marker lost"
    );

    if (unlocked) {
      return;
    }

    hint.textContent =
      "Reviens sur la serrure du coffre.";

    scroll.removeAttribute(
      "animation__appear"
    );

    scroll.setAttribute(
      "visible",
      "false"
    );

    scroll.setAttribute(
      "scale",
      "0.01 0.01 0.01"
    );
  }
);

seal.addEventListener(
  "click",
  () => {
    if (unlocked) {
      return;
    }

    unlocked = true;

    document
      .querySelectorAll(".drink-line")
      .forEach((line, index) => {
        line.setAttribute(
          "visible",
          "true"
        );

        line.setAttribute(
          `animation__reveal${index}`,
          [
            "property: text.opacity",
            "from: 0",
            "to: 1",
            `delay: ${index * 140}`,
            "dur: 650"
          ].join("; ")
        );
      });

    scroll.removeAttribute(
      "animation__appear"
    );

    scroll.setAttribute(
      "animation__open",
      [
        "property: scale",
        "to: 1 1 1",
        "dur: 650",
        "easing: easeInOutCubic"
      ].join("; ")
    );

    seal.setAttribute(
      "color",
      "#b8860b"
    );

    hint.textContent =
      "La carte des boissons est révélée.";

    window.setTimeout(() => {
      unlockedPanel.classList.remove(
        "hidden"
      );

      hint.classList.add(
        "hidden"
      );
    }, 700);
  }
);