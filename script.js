const ZONE_W = 110;
const ZONE_H = 44;
const ZONE_GAP = 20;

// Track which tile occupies each zone (null = empty)
const zoneOccupant = { 0: null, 1: null, 2: null, 3: null };

// Position drop zones in a centered row in the top third of the screen
function positionZones() {
  const zones = document.querySelectorAll('.drop-zone');
  const totalW = zones.length * ZONE_W + (zones.length - 1) * ZONE_GAP;
  const startX = (window.innerWidth - totalW) / 2;
  const y = Math.round(window.innerHeight * 0.28);

  zones.forEach((zone, i) => {
    zone.style.left = (startX + i * (ZONE_W + ZONE_GAP)) + 'px';
    zone.style.top  = y + 'px';
  });
}

// Scatter tiles randomly in the bottom portion of the screen
function scatter(tile) {
  const padding = 60;
  const topBoundary = Math.round(window.innerHeight * 0.55);
  const maxX = window.innerWidth  - tile.offsetWidth  - padding;
  const maxY = window.innerHeight - tile.offsetHeight - padding;
  tile.style.left = (padding + Math.random() * (maxX - padding)) + 'px';
  tile.style.top  = (topBoundary + Math.random() * (maxY - topBoundary)) + 'px';
}

// Returns the zone element whose bounds contain the tile's center, or null
function getOverlappingZone(tile) {
  const tr = tile.getBoundingClientRect();
  const cx = tr.left + tr.width  / 2;
  const cy = tr.top  + tr.height / 2;

  let best = null;
  let bestDist = Infinity;

  document.querySelectorAll('.drop-zone').forEach(zone => {
    const zr = zone.getBoundingClientRect();
    if (cx >= zr.left && cx <= zr.right && cy >= zr.top && cy <= zr.bottom) {
      const dist = Math.hypot(cx - (zr.left + zr.width / 2), cy - (zr.top + zr.height / 2));
      if (dist < bestDist) { bestDist = dist; best = zone; }
    }
  });

  return best;
}

// Snap a tile into a zone, centered
function snapToZone(tile, zone) {
  const zr   = zone.getBoundingClientRect();
  const tr   = tile.getBoundingClientRect();
  const newLeft = zr.left + (zr.width  - tr.width)  / 2;
  const newTop  = zr.top  + (zr.height - tr.height) / 2;

  tile.classList.add('snapping');
  tile.style.left = newLeft + 'px';
  tile.style.top  = newTop  + 'px';
  tile.style.transform = 'scale(1)';

  tile.addEventListener('transitionend', () => {
    tile.classList.remove('snapping');
  }, { once: true });

  const zoneId = parseInt(zone.id.split('-')[1]);
  zoneOccupant[zoneId] = tile;
  tile.dataset.zone = zoneId;
  zone.classList.add('filled');
  zone.classList.remove('hovered');
}

// Free a tile from its zone
function freeFromZone(tile) {
  const zoneId = tile.dataset.zone;
  if (zoneId !== undefined) {
    zoneOccupant[zoneId] = null;
    delete tile.dataset.zone;
    const zone = document.getElementById('zone-' + zoneId);
    if (zone) zone.classList.remove('filled', 'hovered');
  }
}

// ── Dragging ────────────────────────────────────────────────────────────────

let active  = null;
let offsetX = 0;
let offsetY = 0;

function onPointerDown(e) {
  active = e.currentTarget;
  const rect = active.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;

  freeFromZone(active);

  active.classList.remove('snapping');
  active.classList.add('dragging');
  active.style.zIndex = Date.now();
  e.preventDefault();
}

function onPointerMove(e) {
  if (!active) return;
  active.style.left = (e.clientX - offsetX) + 'px';
  active.style.top  = (e.clientY - offsetY) + 'px';

  // Highlight the zone the tile is hovering over
  document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('hovered'));
  const hovered = getOverlappingZone(active);
  if (hovered) {
    const zId = parseInt(hovered.id.split('-')[1]);
    if (!zoneOccupant[zId]) hovered.classList.add('hovered');
  }
}

function onPointerUp() {
  if (!active) return;
  active.classList.remove('dragging');
  document.querySelectorAll('.drop-zone').forEach(z => z.classList.remove('hovered'));

  const zone = getOverlappingZone(active);
  if (zone) {
    const zoneId = parseInt(zone.id.split('-')[1]);
    if (!zoneOccupant[zoneId]) {
      snapToZone(active, zone);
    }
  }

  active = null;
}

// ── Init ─────────────────────────────────────────────────────────────────────

positionZones();

document.querySelectorAll('.word-tile').forEach(tile => {
  scatter(tile);
  tile.addEventListener('mousedown', onPointerDown);
});

document.addEventListener('mousemove', onPointerMove);
document.addEventListener('mouseup',   onPointerUp);
