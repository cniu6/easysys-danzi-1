const fs = require("fs");
const path = require("path");
const https = require("https");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "public", "images", "gallery", "paris");
fs.mkdirSync(OUT, { recursive: true });

// 从 MONO /fr/paris 页抓到的更多图片 id
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
  "82615a_1d971bbf55d94dd0bb781dbdfc69896e~mv2.jpg",
  "82615a_720e81e9c8e34c19b8aa9b5b29e172bf~mv2.jpg",
  "82615a_871460dab55b456eaf683f5d9a93f06d~mv2.jpg",
  "82615a_a37177288bad4436be0d396b79ed760f~mv2.jpg",
  "82615a_48cd1a7ed37c440598e4cd475e158ab0~mv2.jpg",
  "82615a_5c9e813c96d340e0a09f746a1ea31cf9~mv2.jpg",
  "82615a_ad95b42c344643b59b8334ad3ff303b3~mv2.jpg",
  "82615a_dbee4396f5c247c6a26046a85b75fcee~mv2.jpg",
  "82615a_508e0e86f8614d40bbb3d027ed006ae4~mv2.jpg",
  "82615a_1bbdfb58a1d64129bf0a58d0c04537f0~mv2.jpg",
  "82615a_d6a84f705b0249998e44141e54ce4252~mv2.jpg",
  "82615a_8ca3bf2dc4ad4444aec4f8823574926b~mv2.jpg",
  "82615a_a54480dd68af49a9a43eae25a5ff6058~mv2.jpg",
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
    const name = `paris-${String(i + 1).padStart(2, "0")}.jpg`;
    const dest = path.join(OUT, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) {
      saved.push(`/images/gallery/paris/${name}`);
      console.log("跳过已有", name);
      continue;
    }
    try {
      console.log("下载", name);
      const buf = await download(`https://static.wixstatic.com/media/${id}`);
      await sharp(buf)
        .rotate()
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(dest);
      saved.push(`/images/gallery/paris/${name}`);
      console.log(" OK", Math.round(fs.statSync(dest).size / 1024) + "KB");
    } catch (e) {
      console.warn("失败", name, e.message);
    }
  }
  fs.writeFileSync(path.join(__dirname, "paris-gallery.json"), JSON.stringify(saved, null, 2));
  console.log("完成", saved.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
