const correctSentence = [
  "The brave prince",
  "entered",
  "the dark forest",
  "alone"
];

const zoneOccupant = { 0: null, 1: null, 2: null, 3: null };
const popup = document.getElementById("result-popup");
const resetButton = document.getElementById("reset-button");

let active = null;
let offsetX = 0;
let offsetY = 0;
let popupTimer = null;

function makeTilesDraggable() {
  const tiles = Array.from(document.querySelectorAll(".word-tile"));
  const positions = tiles.map((tile) => {
    const rect = tile.getBoundingClientRect();
    return { tile, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });

  positions.forEach(({ tile, left, top, width, height }) => {
    tile.style.position = "absolute";
    tile.style.left = `${left}px`;
    tile.style.top = `${top}px`;
    tile.style.width = `${width}px`;
    tile.style.height = `${height}px`;
  });
}

function arrangeLooseTiles() {
  const looseTiles = Array.from(document.querySelectorAll(".word-tile")).filter(
    (tile) => tile.dataset.zone === undefined
  );
  if (!looseTiles.length) return;

  const dropRow = document.querySelector(".drop-row");
  const dropRect = dropRow.getBoundingClientRect();
  const gap = Math.min(Math.max(window.innerWidth * 0.03, 22), 46);
  const marginTop = Math.min(Math.max(window.innerHeight * 0.075, 48), 70);
  const shuffledWords = ["entered", "alone", "The brave prince", "the dark forest"];
  const orderedTiles = shuffledWords
    .map((word) => looseTiles.find((tile) => tile.dataset.word === word))
    .filter(Boolean);
  const availableWidth = window.innerWidth - 28;
  const rowWidth = orderedTiles.reduce((sum, tile) => sum + tile.offsetWidth, 0) + gap * (orderedTiles.length - 1);
  const shouldWrap = rowWidth > availableWidth;
  const rows = shouldWrap
    ? [orderedTiles.slice(0, 2), orderedTiles.slice(2)]
    : [orderedTiles];
  let y = dropRect.bottom + marginTop;

  rows.forEach((row) => {
    const currentRowWidth = row.reduce((sum, tile) => sum + tile.offsetWidth, 0) + gap * (row.length - 1);
    let x = (window.innerWidth - currentRowWidth) / 2;
    const rowHeight = Math.max(...row.map((tile) => tile.offsetHeight));

    row.forEach((tile) => {
      tile.style.left = `${x}px`;
      tile.style.top = `${y}px`;
      x += tile.offsetWidth + gap;
    });

    y += rowHeight + 18;
  });
}

function getZoneId(zone) {
  return Number(zone.id.replace("zone-", ""));
}

function clearPopup() {
  clearTimeout(popupTimer);
  popup.className = "result-popup";
  popup.textContent = "";
}

function showPopup(isCorrect) {
  clearPopup();
  popup.textContent = isCorrect ? "Right!" : "Wrong!";
  popup.classList.add("show", isCorrect ? "correct" : "wrong");

  popupTimer = setTimeout(() => {
    popup.classList.remove("show");
  }, 1800);
}

function checkAnswer() {
  const filledZones = Object.values(zoneOccupant).filter(Boolean).length;
  if (filledZones !== correctSentence.length) return;

  const currentSentence = correctSentence.map((_, index) => {
    const tile = zoneOccupant[index];
    return tile ? tile.dataset.word : "";
  });

  const isCorrect = currentSentence.every((word, index) => word === correctSentence[index]);
  showPopup(isCorrect);
}

function getOverlappingZone(tile) {
  const tileRect = tile.getBoundingClientRect();
  const centerX = tileRect.left + tileRect.width / 2;
  const centerY = tileRect.top + tileRect.height / 2;
  let bestZone = null;
  let bestDistance = Infinity;

  document.querySelectorAll(".drop-zone").forEach((zone) => {
    const zoneRect = zone.getBoundingClientRect();
    const insideZone =
      centerX >= zoneRect.left &&
      centerX <= zoneRect.right &&
      centerY >= zoneRect.top &&
      centerY <= zoneRect.bottom;

    if (!insideZone) return;

    const zoneCenterX = zoneRect.left + zoneRect.width / 2;
    const zoneCenterY = zoneRect.top + zoneRect.height / 2;
    const distance = Math.hypot(centerX - zoneCenterX, centerY - zoneCenterY);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestZone = zone;
    }
  });

  return bestZone;
}

function snapToZone(tile, zone) {
  const zoneRect = zone.getBoundingClientRect();
  const tileRect = tile.getBoundingClientRect();
  const newLeft = zoneRect.left + (zoneRect.width - tileRect.width) / 2;
  const newTop = zoneRect.top + (zoneRect.height - tileRect.height) / 2;
  const zoneId = getZoneId(zone);

  tile.classList.add("snapping");
  tile.style.left = `${newLeft}px`;
  tile.style.top = `${newTop}px`;
  tile.style.transform = "scale(1)";

  tile.addEventListener(
    "transitionend",
    () => {
      tile.classList.remove("snapping");
    },
    { once: true }
  );

  zoneOccupant[zoneId] = tile;
  tile.dataset.zone = zoneId;
  zone.classList.add("filled");
  zone.classList.remove("hovered");
  checkAnswer();
}

function freeFromZone(tile) {
  const zoneId = tile.dataset.zone;
  if (zoneId === undefined) return;

  zoneOccupant[zoneId] = null;
  delete tile.dataset.zone;

  const zone = document.getElementById(`zone-${zoneId}`);
  if (zone) zone.classList.remove("filled", "hovered");
}

function resetGame() {
  active = null;
  clearPopup();

  Object.keys(zoneOccupant).forEach((zoneId) => {
    zoneOccupant[zoneId] = null;
    const zone = document.getElementById(`zone-${zoneId}`);
    if (zone) zone.classList.remove("filled", "hovered");
  });

  document.querySelectorAll(".word-tile").forEach((tile) => {
    delete tile.dataset.zone;
    tile.classList.remove("dragging", "snapping");
    tile.style.transform = "scale(1)";
  });

  arrangeLooseTiles();
}

function onPointerDown(event) {
  active = event.currentTarget;
  const rect = active.getBoundingClientRect();
  offsetX = event.clientX - rect.left;
  offsetY = event.clientY - rect.top;

  clearPopup();
  freeFromZone(active);

  active.setPointerCapture(event.pointerId);
  active.classList.remove("snapping");
  active.classList.add("dragging");
  active.style.zIndex = String(Date.now());
  event.preventDefault();
}

function onPointerMove(event) {
  if (!active) return;

  active.style.left = `${event.clientX - offsetX}px`;
  active.style.top = `${event.clientY - offsetY}px`;

  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("hovered"));
  const hoveredZone = getOverlappingZone(active);

  if (!hoveredZone) return;

  const zoneId = getZoneId(hoveredZone);
  if (!zoneOccupant[zoneId]) hoveredZone.classList.add("hovered");
}

function onPointerUp() {
  if (!active) return;

  active.classList.remove("dragging");
  document.querySelectorAll(".drop-zone").forEach((zone) => zone.classList.remove("hovered"));

  const zone = getOverlappingZone(active);
  if (zone) {
    const zoneId = getZoneId(zone);
    if (!zoneOccupant[zoneId]) snapToZone(active, zone);
  }

  active = null;
}

function runLandingScreen() {
  const landing = document.getElementById("landing-screen");
  if (!landing) return;

  // Hold for ~3.5s (including the 0.3s + 0.7s text animation = 1s), then fade out over 0.9s
  const holdMs = 3500;
  const fadeDurationMs = 900;

  setTimeout(() => {
    landing.classList.add("fade-out");
    setTimeout(() => {
      landing.classList.add("hidden");
    }, fadeDurationMs);
  }, holdMs);
}

window.addEventListener("load", () => {
  runLandingScreen();
  makeTilesDraggable();
  arrangeLooseTiles();

  document.querySelectorAll(".word-tile").forEach((tile) => {
    tile.addEventListener("pointerdown", onPointerDown);
  });

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  window.addEventListener("resize", arrangeLooseTiles);
  resetButton.addEventListener("click", resetGame);
});
