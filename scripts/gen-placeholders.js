const fs = require("fs");
const path = require("path");

const dir = path.join("public", "images");
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(path.join("public", "uploads"), { recursive: true });

function svg(w, h, label, c1, c2) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="48%" fill="rgba(255,255,255,0.8)" font-family="Georgia, serif"
    font-size="${Math.round(Math.min(w, h) / 16)}" text-anchor="middle">${label}</text>
  <text x="50%" y="58%" fill="rgba(255,255,255,0.45)" font-family="sans-serif"
    font-size="${Math.round(Math.min(w, h) / 40)}" text-anchor="middle">placeholder</text>
</svg>`;
}

const files = [
  ["hero.svg", 1920, 1080, "PARIS LUMIERE", "#1a1612", "#3d3429"],
  ["photo-1.svg", 800, 1000, "STUDIO", "#2a2420", "#5c4f42"],
  ["photo-2.svg", 800, 1000, "PARIS", "#1e2430", "#4a5568"],
  ["photo-3.svg", 800, 1000, "CHATEAU", "#2c2418", "#6b5538"],
  ["photo-4.svg", 800, 1000, "PORTRAIT", "#241c1c", "#5a4040"],
  ["photo-5.svg", 800, 1000, "SEINE", "#1a2228", "#3d5566"],
  ["photo-6.svg", 800, 1000, "FASHION", "#1c1a20", "#4a4058"],
  ["video-1.svg", 1280, 720, "VIDEO 01", "#181818", "#333333"],
  ["video-2.svg", 1280, 720, "VIDEO 02", "#1a1814", "#3a3228"],
  ["video-3.svg", 1280, 720, "VIDEO 03", "#141818", "#2a3838"],
  ["service-1.svg", 1000, 700, "PRE-WEDDING", "#221e1a", "#4a4035"],
  ["service-2.svg", 1000, 700, "WEDDING", "#1e1a18", "#403530"],
  ["service-3.svg", 1000, 700, "PRODUCTION", "#181c20", "#303840"],
];

for (const [name, w, h, label, c1, c2] of files) {
  fs.writeFileSync(path.join(dir, name), svg(w, h, label, c1, c2), "utf8");
}

console.log("已生成占位图", files.length, "张");
