const https = require("https");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolve, reject);
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode !== 200) reject(new Error("HTTP " + res.statusCode));
          else resolve(Buffer.concat(chunks));
        });
      })
      .on("error", reject);
  });
}

async function main() {
  // 尝试常见 about 路径
  const pages = [
    "https://www.parismono.com/",
    "https://www.parismono.com/about-us",
    "https://www.parismono.com/fr/about",
    "https://www.parismono.com/about",
  ];
  let html = "";
  for (const u of pages) {
    try {
      const buf = await get(u);
      html += buf.toString("utf8");
      console.log("ok", u, buf.length);
    } catch (e) {
      console.log("fail", u, e.message);
    }
  }

  const dsc = [...html.matchAll(/DSC06362[^"'\\\s<>]*/gi)].map((m) => m[0]);
  console.log("DSC names", [...new Set(dsc)]);

  // 找含 DSC06362 的 media id
  const around = html.match(/82615a_[a-f0-9]+[^"'\\\s]*DSC06362[^"'\\\s]*/gi);
  console.log("around", around);

  const allIds = [
    ...html.matchAll(/82615a_[a-f0-9]{20,}~mv2\.(?:jpg|jpeg|png|webp)/gi),
  ].map((m) => m[0]);
  console.log("unique media", [...new Set(allIds)].length);

  // 直接用文件名在 wix static 上不一定行；从 HTML 抽 uri
  const withDsc = html.match(/[^"'\\\s]*DSC06362[^"'\\\s]*/gi) || [];
  console.log("withDsc", [...new Set(withDsc)].slice(0, 10));

  // 下载：若找到完整 wix URL
  const wixUrls = [
    ...html.matchAll(
      /https:\/\/static\.wixstatic\.com\/media\/[^"'\\\s]*DSC06362[^"'\\\s]*/gi
    ),
  ].map((m) => m[0]);
  console.log("wixUrls", wixUrls);

  const outDir = path.join(__dirname, "..", "public", "images", "about");
  fs.mkdirSync(outDir, { recursive: true });
  const dest = path.join(outDir, "about-hero.jpg");

  if (wixUrls[0]) {
    const buf = await get(wixUrls[0].split("/v1/")[0]);
    await sharp(buf)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(dest);
    console.log("saved", dest);
    return;
  }

  // 备选：用已有 hero/巴黎图作为 about 配图不够时，再试 media 列表里搜
  // 用户提到 DSC06362 — 在 mono 备份里找
  const monoDir = path.join(__dirname, "..", "public", "images", "mono");
  if (fs.existsSync(monoDir)) {
    const files = fs.readdirSync(monoDir);
    console.log("mono files sample", files.slice(0, 5), "count", files.length);
  }

  // 用已下载的一张高质量婚纱图临时，并打印提示
  const fallback = path.join(__dirname, "..", "public", "images", "service-wedding.jpg");
  if (fs.existsSync(fallback)) {
    fs.copyFileSync(fallback, dest);
    console.log("fallback copied to", dest);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
