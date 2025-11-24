// scrollFade.js

const start = { r: 235, g: 235, b: 229 }; // #EBEBE5
const end   = { r: 215, g: 214, b: 204 }; // #D7D6CC

function lerp(a, b, t) {
  return a + (b - a) * t;
}

window.addEventListener("scroll", () => {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  const scrollPercent = window.scrollY / maxScroll;

  const r = Math.round(lerp(start.r, end.r, scrollPercent));
  const g = Math.round(lerp(start.g, end.g, scrollPercent));
  const b = Math.round(lerp(start.b, end.b, scrollPercent));

  document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
});
