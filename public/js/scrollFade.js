// scrollFade.js: page background fades from start to end colour as you scroll down

const start = { r: 235, g: 235, b: 229 }; // #EBEBE5
const end   = { r: 215, g: 214, b: 204 }; // #D7D6CC

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateBackground() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  // Pages too short to scroll stay at the start colour (avoids dividing by 0).
  // Clamp to 0–1 so overscroll "bounce" can't push the colour out of range.
  const t = maxScroll > 0
    ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
    : 0;

  const r = Math.round(lerp(start.r, end.r, t));
  const g = Math.round(lerp(start.g, end.g, t));
  const b = Math.round(lerp(start.b, end.b, t));

  document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
}

// Scroll events can fire many times per frame; update at most once per frame
let queued = false;
function queueUpdate() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    updateBackground();
  });
}

window.addEventListener("scroll", queueUpdate, { passive: true });
window.addEventListener("resize", queueUpdate);
document.addEventListener("player:pagechanged", queueUpdate); // after an SPA page swap
updateBackground();