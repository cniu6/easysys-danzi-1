const fs = require("fs");
const path = require("path");
const https = require("https");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "public", "images", "gallery", "paris");
fs.mkdirSync(OUT, { recursive: true });

const IDS = [
  "82615a_fa7eec37baf549828fe24b2f083905f4~mv2.jpg",
  "82615a_898af50e54f341d2bcd1c48ba089e294~mv2.jpg",
  "82615a_428320f3ee404b97921b05c3c1ce5a8c~mv2.jpg",
  "82615a_daa90b9445744a7a8ee76f48cc161616~mv2.jpg",
  "82615a_7a7523f1a1ce46c59964a0e2a59f30c8~mv2.jpg",
  "82615a_1a9448e2c99f4010863df7bd1a36b4b4~mv2.jpg",
  "82615a_1fa9f657301247f7ac24ff7a740da4f9~mv2.jpg",
  "82615a_bb29d7efdcc544f7b2fc9f309d51f68e~mv2.jpg",
  "82615a_bbf00664d29b4b58982abcb353f66cde~mv2.jpg",
  "82615a_127ca8e1ed0447e4b50cb9d0fba5a707~mv2.jpg",
  "82615a_a51b53cbd08547c6b9d053160409c66a~mv2.jpg",
  "82615a_851f262b146d4c5e886c81bcef04f315~mv2.jpg",
];

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
  const saved = [];
  for (let i = 0; i < IDS.length; i++) {
    const id = IDS[i];
    const url = `https://static.wixstatic.com/media/${id}`;
    const name = `paris-${String(i + 1).padStart(2, "0")}.jpg`;
    const dest = path.join(OUT, name);
    try {
      console.log("下载", name);
      const buf = await download(url);
      await sharp(buf)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(dest);
      saved.push(`/images/gallery/paris/${name}`);
      console.log(" OK", Math.round(fs.statSync(dest).size / 1024) + "KB");
    } catch (e) {
      console.warn("失败", e.message);
    }
  }
  fs.writeFileSync(path.join(__dirname, "paris-gallery.json"), JSON.stringify(saved, null, 2));
  console.log("完成", saved.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
