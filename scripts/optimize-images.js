const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC = path.join(__dirname, "..", "public", "images", "mono");
const OUT = path.join(__dirname, "..", "public", "images");

/** 去重后的关键资源映射（源文件 -> 输出名） */
const MAP = [
  ["01-82615a_cade972d382d47a59e23c89861c93ed5_mv2.png", "logo.png", null],
  ["03-82615a_f8f51a5331044c0582a0f051159a0feb_mv2.jpg", "hero.jpg", 1920],
  ["04-82615a_0e6662d4d5074e469584f15aa0abf10a_mv2.jpg", "photo-studio.jpg", 1200],
  ["06-82615a_e51213784af4438d8eb776c467f6080c_mv2.jpg", "photo-paris.jpg", 1200],
  ["08-82615a_4aa0a07c83144cf2bb76f170e39184e5_mv2.jpg", "photo-chateau.jpg", 1200],
  ["10-82615a_3ce83c2c1816472a8a8f7d9739ead0d0_mv2.jpg", "service-prewedding.jpg", 1400],
  ["12-82615a_2a3ac17fca594ac1bf3b6626c270ea06_mv2.jpg", "service-wedding.jpg", 1400],
  ["14-82615a_f60e482029f44359ac50352a626b645d_mv2.webp", "publicity-1.webp", 1000],
  ["15-82615a_b7f7e581786446239cf8e883934ab6a7_mv2.webp", "publicity-2.webp", 1000],
  ["16-82615a_ff6d8bef64dd49d19d9389040cc6f132_mv2.webp", "publicity-3.webp", 1000],
  ["17-82615a_2f6efabd68aa4da8a274247e59c780a6_mv2.webp", "publicity-4.webp", 1000],
  ["18-82615a_1a5dedb707cd475c9ab58ccc75ce6a64_mv2.jpg", "publicity-5.jpg", 1000],
  ["19-82615a_6c502333410b468b9d2e346e960a53cc_mv2.webp", "publicity-6.webp", 1000],
  ["24-82615a_ca02fcbf90844b9faa01a9519bc72849_mv2.png", "social-wechat.png", null],
  ["22-11062b_7fc95bac711041dcb9691b6a09192a84_mv2.png", "social-tiktok.png", null],
  ["26-11062b_ca1d837ce7194421b781ee7384061a8e_mv2.png", "social-instagram.png", null],
  ["28-11062b_362ef89dec51403eb0ee59a21bde967c_mv2.png", "social-facebook.png", null],
];

async function run() {
  for (const [srcName, outName, maxW] of MAP) {
    const src = path.join(SRC, srcName);
    const dest = path.join(OUT, outName);
    if (!fs.existsSync(src)) {
      console.warn("缺少:", srcName);
      continue;
    }
    if (!maxW) {
      fs.copyFileSync(src, dest);
      console.log("复制", outName);
      continue;
    }
    const img = sharp(src);
    const meta = await img.metadata();
    let pipeline = sharp(src).rotate();
    if (meta.width && meta.width > maxW) {
      pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
    }
    if (outName.endsWith(".webp")) {
      await pipeline.webp({ quality: 82 }).toFile(dest);
    } else if (outName.endsWith(".png")) {
      await pipeline.png().toFile(dest);
    } else {
      await pipeline.jpeg({ quality: 82, mozjpeg: true }).toFile(dest);
    }
    const size = fs.statSync(dest).size;
    console.log("压缩", outName, Math.round(size / 1024) + "KB");
  }

  // 视频封面复用作品图
  const covers = [
    ["photo-paris.jpg", "video-1.jpg"],
    ["photo-chateau.jpg", "video-2.jpg"],
    ["service-wedding.jpg", "video-3.jpg"],
  ];
  for (const [a, b] of covers) {
    fs.copyFileSync(path.join(OUT, a), path.join(OUT, b));
  }
  console.log("完成");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
