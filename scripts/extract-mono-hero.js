const fs = require("fs");
const path = require("path");
const https = require("https");
const sharp = require("sharp");

const html = fs.readFileSync(path.join(__dirname, "_mono-home.html"), "utf8");

// 按 slideshow 组件拆块
const parts = html.split("wixui-slideshow");
console.log("slideshow blocks", parts.length - 1);

const heroBlock = parts[1] || "";
const ids = [
  ...heroBlock.matchAll(/82615a_[a-f0-9]+~mv2\.(?:jpg|jpeg|png|webp)/gi),
].map((m) => m[0]);
const uniq = [...new Set(ids)];
console.log("hero slideshow media ids:", uniq);

// 全页常见大图
const all = [
  ...html.matchAll(/82615a_[a-f0-9]+~mv2\.(?:jpg|jpeg|png|webp)/gi),
].map((m) => m[0]);
console.log("page media unique", [...new Set(all)].length);

// DSC 命名
const dsc = [...html.matchAll(/DSC[0-9A-Za-z_]+/g)].map((m) => m[0]);
console.log("DSC names", [...new Set(dsc)]);

// 若 hero 块为空，从 JSON 里找 slides 的 image
const slideImgs = [
  ...html.matchAll(/"uri"\s*:\s*"(82615a_[^"]+~mv2\.(?:jpg|jpeg|png|webp))"/gi),
].map((m) => m[1]);
console.log("uri fields", [...new Set(slideImgs)].slice(0, 20));

const OUT = path.join(__dirname, "..", "public", "images", "hero");
fs.mkdirSync(OUT, { recursive: true });

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

async function main() {
  // 首页首屏 slideshow：优先用 hero 块；不够再补 DSC / 已知大图
  let list = uniq;
  if (list.length < 2) {
    // 从整页取前几张大图（排除 logo 小图）
    list = [...new Set(all)].filter((id) => !id.includes("cade972d"));
  }

  // 已知首页主视觉 DSC04548（搜索结果里的 hero）
  const known = [
    // 从页面里常出现的婚纱大图 —— 若上面没抓到再试整页前 N 张
  ];

  // 再从 HTML 抓带 fill w_ 大尺寸的图
  const big =
    html.match(
      /static\.wixstatic\.com\/media\/(82615a_[a-f0-9]+~mv2\.(?:jpg|jpeg|png|webp))\/v1\/fill\/w_1[0-9]{3}/gi
    ) || [];
  const bigIds = [
    ...new Set(
      big.map((u) => {
        const m = u.match(/82615a_[a-f0-9]+~mv2\.(?:jpg|jpeg|png|webp)/i);
        return m ? m[0] : null;
      }).filter(Boolean)
    ),
  ];
  console.log("large fill images", bigIds.length, bigIds.slice(0, 15));

  const finalIds = (bigIds.length >= 3 ? bigIds : list).slice(0, 8);
  console.log("download set", finalIds);

  const saved = [];
  for (let i = 0; i < finalIds.length; i++) {
    const id = finalIds[i];
    const name = `slide-${String(i + 1).padStart(2, "0")}.jpg`;
    const dest = path.join(OUT, name);
    try {
      console.log("下载", name, id);
      const buf = await download(`https://static.wixstatic.com/media/${id}`);
      await sharp(buf)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(dest);
      saved.push(`/images/hero/${name}`);
      console.log(" OK", Math.round(fs.statSync(dest).size / 1024) + "KB");
    } catch (e) {
      console.warn("失败", e.message);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "hero-slides.json"),
    JSON.stringify(saved, null, 2)
  );
  console.log("完成", saved);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
