const fs = require("fs");

const c = JSON.parse(fs.readFileSync("data/content.json", "utf8"));
const paris = JSON.parse(fs.readFileSync("scripts/paris-gallery.json", "utf8"));

c.albums = c.albums.map((a) => {
  if (a.slug === "paris") {
    return {
      ...a,
      images: paris,
      aliases: ["paris", "fr/paris", "pre-wedding-paris"],
    };
  }
  if (a.slug === "studio") {
    return { ...a, aliases: a.aliases?.length ? a.aliases : ["studio", "pre-wedding-studio"] };
  }
  if (a.slug === "chateau") {
    return {
      ...a,
      aliases: a.aliases?.length ? a.aliases : ["chateau", "castle", "pre-wedding-chateau"],
    };
  }
  return { ...a, aliases: a.aliases || [] };
});

c.services = c.services.map((s, i) => ({
  ...s,
  href: s.href || (i === 0 ? "/gallery/paris" : "/gallery/chateau"),
}));

c.videos = c.videos.map((v, i) => ({
  ...v,
  href: v.href || (i === 0 ? "/gallery/paris" : "/gallery/chateau"),
}));

fs.writeFileSync("data/content.json", JSON.stringify(c, null, 2), "utf8");

const map = {};
for (const album of c.albums) {
  if (!album.enabled) continue;
  const t = `/gallery/${album.slug}`;
  map[t] = t;
  for (const raw of album.aliases || []) {
    const a = String(raw).trim().replace(/^\/+/, "").replace(/\/+$/, "");
    if (a) map[`/${a}`] = t;
  }
}
fs.writeFileSync("data/path-map.json", JSON.stringify(map, null, 2), "utf8");
console.log("paris", paris.length, "path-map keys", Object.keys(map));
