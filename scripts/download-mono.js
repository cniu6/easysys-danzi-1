const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const OUT_DIR = path.join(__dirname, "..", "public", "images", "mono");
fs.mkdirSync(OUT_DIR, { recursive: true });

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
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

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    lib
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(dest)));
      })
      .on("error", (err) => {
        try {
          fs.unlinkSync(dest);
        } catch {}
        reject(err);
      });
  });
}

/** Wix 媒体 URL 取较高清版本 */
function toHiRes(url) {
  // 去掉缩放参数，尽量拿原图
  const base = url.split("/v1/")[0];
  if (base.includes("static.wixstatic.com/media/")) {
    return `${base}/v1/fill/w_1200,h_1600,al_c,q_85,enc_avif,quality_auto/${path.basename(base)}`;
  }
  return url;
}

function cleanName(url, index) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const raw = parts.find((p) => p.includes(".")) || `img-${index}`;
    return raw.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  } catch {
    return `img-${index}.jpg`;
  }
}

async function main() {
  const pages = [
    "https://www.parismono.com/fr",
    "https://www.parismono.com",
    "https://www.parismono.com/zh",
  ];

  const all = new Set();
  for (const page of pages) {
    try {
      console.log("抓取页面:", page);
      const html = await fetchText(page);
      const matches = html.match(/https:\/\/static\.wixstatic\.com\/media\/[^"'\\\s)]+/g) || [];
      matches.forEach((m) => all.add(m.replace(/\\u002F/g, "/").replace(/\\/g, "")));
      // 也抓 wix 编码的 \\u002F 形式
      const enc = html.match(/static\.wixstatic\.com\\u002Fmedia\\u002F[^"'\\\s]+/g) || [];
      enc.forEach((m) => {
        const fixed = ("https://" + m).replace(/\\u002F/g, "/");
        all.add(fixed);
      });
    } catch (e) {
      console.warn("页面失败", page, e.message);
    }
  }

  // 过滤掉明显的小图标 / logo 以外我们都要；优先大图
  const list = [...all].filter((u) => {
    const low = u.toLowerCase();
    if (low.includes("favicon")) return false;
    if (low.endsWith(".svg") && low.includes("icon")) return false;
    return true;
  });

  console.log("找到图片 URL:", list.length);
  fs.writeFileSync(
    path.join(__dirname, "mono-image-urls.json"),
    JSON.stringify(list, null, 2),
    "utf8"
  );

  const saved = [];
  let i = 0;
  for (const url of list) {
    i += 1;
    const name = `${String(i).padStart(2, "0")}-${cleanName(url, i)}`;
    const dest = path.join(OUT_DIR, name);
    // 尝试直接下原 media 路径（去掉 /v1/...）
    const origin = url.split("/v1/")[0];
    const candidates = [origin, url];
    let ok = false;
    for (const c of candidates) {
      try {
        console.log(`下载 ${i}/${list.length}:`, c.slice(0, 90));
        await download(c, dest);
        const size = fs.statSync(dest).size;
        if (size > 2000) {
          saved.push({ file: `/images/mono/${name}`, source: c, size });
          ok = true;
          break;
        }
      } catch (e) {
        console.warn("  失败:", e.message);
      }
    }
    if (!ok) console.warn("  跳过:", url);
  }

  fs.writeFileSync(
    path.join(__dirname, "mono-downloaded.json"),
    JSON.stringify(saved, null, 2),
    "utf8"
  );
  console.log("完成，成功:", saved.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
