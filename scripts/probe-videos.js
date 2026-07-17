const fs = require("fs");
const path = require("path");
const https = require("https");

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            Accept: "*/*",
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchText(res.headers.location).then(resolve, reject);
            return;
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        }
      )
      .on("error", reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://www.parismono.com/" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try {
            fs.unlinkSync(dest);
          } catch {}
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error("HTTP " + res.statusCode));
          return;
        }
        const total = Number(res.headers["content-length"] || 0);
        let got = 0;
        res.on("data", (c) => {
          got += c.length;
          if (total) process.stdout.write(`\r  ${((got / total) * 100).toFixed(1)}%`);
        });
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            process.stdout.write("\n");
            resolve();
          });
        });
      })
      .on("error", reject);
  });
}

async function main() {
  const html = await fetchText("https://www.parismono.com/fr");
  fs.writeFileSync(path.join(__dirname, "_mono-dump.html"), html, "utf8");

  // 搜一切可疑关键字
  const keys = ["mp4", "webm", "video", "youtube", "vimeo", "wixstatic.com/video", "playback", "MediaPlayer"];
  for (const k of keys) {
    const re = new RegExp(`.{0,80}${k}.{0,80}`, "gi");
    const hits = html.match(re) || [];
    console.log(`\n=== ${k} hits: ${hits.length} ===`);
    hits.slice(0, 8).forEach((h) => console.log(h.replace(/\s+/g, " ").slice(0, 160)));
  }

  // 抽所有 static.wixstatic / video.wixstatic URL
  const urls = [
    ...(html.match(/https:\\u002F\\u002F[^"\\]+/g) || []).map((u) =>
      u.replace(/\\u002F/g, "/").replace(/\\/g, "")
    ),
    ...(html.match(/https:\/\/[^"'\\\s>]+/g) || []),
  ];
  const media = [...new Set(urls)].filter(
    (u) =>
      /\.(mp4|webm|mov)/i.test(u) ||
      /video\.wixstatic/i.test(u) ||
      /youtube|vimeo/i.test(u) ||
      /\/video\//i.test(u)
  );
  console.log("\n媒体 URL:", media.length);
  media.slice(0, 30).forEach((u) => console.log(u));

  // 找页面里的内部链接，看有没有 video 页
  const links = [...new Set((html.match(/href="(\/[^"]+)"/g) || []).map((h) => h.slice(6, -1)))];
  console.log("\n站内链接样本:", links.filter((l) => /video|film|movie|reel|portfolio|service/i.test(l)).slice(0, 20));

  // Wix 有时把 masterPage 数据放在 script#wix-warmup-data 或类似
  const warmup = html.match(/<script[^>]*id="[^"]*warmup[^"]*"[^>]*>([\s\S]*?)<\/script>/i);
  if (warmup) {
    const inner = warmup[1];
    const vids = inner.match(/https[^"\\]+?\.(mp4|webm)/gi) || [];
    console.log("warmup videos", vids.length, vids.slice(0, 5));
  }

  // 尝试常见 Wix video CDN 模式：从图片 id 推不了，搜 "qualities"
  const qualities = html.match(/"qualities"\s*:\s*\[[^\]]+\]/g) || [];
  console.log("qualities blocks", qualities.length);
  qualities.slice(0, 3).forEach((q) => console.log(q.slice(0, 200)));

  const outDir = path.join(__dirname, "..", "public", "videos");
  fs.mkdirSync(outDir, { recursive: true });

  // 若仍没有：用本地已有作品图生成短演示 mp4（ffmpeg），保证站点有本地视频可用
  if (!media.length) {
    console.log("\n站点无直接视频文件。检查是否有 ffmpeg 可生成演示短片…");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
