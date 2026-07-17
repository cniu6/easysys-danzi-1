const https = require("https");
const fs = require("fs");
const path = require("path");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      })
      .on("error", reject);
  });
}

(async () => {
  const html = await fetchText("https://www.parismono.com/");
  fs.writeFileSync(path.join(__dirname, "_mono-home.html"), html, "utf8");

  // 找 slider / slideshow / carousel 相关
  const keys = ["slideshow", "slider", "carousel", "SlideShow", "WRichImage", "hero", "backgroundImage"];
  for (const k of keys) {
    const re = new RegExp(`.{0,60}${k}.{0,120}`, "gi");
    const hits = html.match(re) || [];
    console.log(`\n=== ${k}: ${hits.length} ===`);
    hits.slice(0, 5).forEach((h) => console.log(h.replace(/\s+/g, " ").slice(0, 180)));
  }

  // 大图 media（首页首屏常见大尺寸）
  const medias =
    html.match(/https:\\u002F\\u002Fstatic\.wixstatic\.com\\u002Fmedia\\u002F[^"\\]+/g) || [];
  const decoded = [...new Set(medias.map((m) => m.replace(/\\u002F/g, "/")))];
  console.log("\nmedia count", decoded.length);
  decoded.slice(0, 25).forEach((u) => console.log(u.slice(0, 140)));

  // data-testid / fill layers
  const fills = html.match(/data-testid="[^"]*slide[^"]*"/gi) || [];
  console.log("\nslide testids", fills.slice(0, 20));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
