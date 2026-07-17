const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const OUT = path.join(__dirname, "..", "public", "videos");
fs.mkdirSync(OUT, { recursive: true });

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/json,*/*",
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
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Referer: "https://www.parismono.com/",
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try {
            fs.unlinkSync(dest);
          } catch {}
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const total = Number(res.headers["content-length"] || 0);
        let got = 0;
        res.on("data", (c) => {
          got += c.length;
          if (total) {
            const p = ((got / total) * 100).toFixed(1);
            process.stdout.write(`\r  ${p}% ${Math.round(got / 1024 / 1024)}MB`);
          }
        });
        res.pipe(file);
        file.on("finish", () => {
          file.close(() => {
            process.stdout.write("\n");
            resolve(dest);
          });
        });
      }
    );
    req.on("error", (err) => {
      try {
        fs.unlinkSync(dest);
      } catch {}
      reject(err);
    });
  });
}

function uniq(arr) {
  return [...new Set(arr)];
}

async function main() {
  const pages = [
    "https://www.parismono.com/fr",
    "https://www.parismono.com",
    "https://www.parismono.com/zh",
  ];

  const found = {
    videoFiles: [],
    youtube: [],
    vimeo: [],
    wixVideo: [],
  };

  for (const page of pages) {
    console.log("抓取", page);
    let html = "";
    try {
      html = await fetchText(page);
    } catch (e) {
      console.warn("失败", e.message);
      continue;
    }

    // 直接 mp4/webm
    const files = html.match(/https?:\/\/[^"'\\\s>]+\.(mp4|webm|mov)(\?[^"'\\\s>]*)?/gi) || [];
    found.videoFiles.push(...files);

    // youtube
    const yt1 = html.match(/youtube\.com\/(?:embed\/|watch\?v=|shorts\/)([a-zA-Z0-9_-]{6,})/g) || [];
    const yt2 = html.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/g) || [];
    yt1.forEach((m) => {
      const id = m.split(/embed\/|watch\?v=|shorts\//).pop();
      if (id) found.youtube.push(id.replace(/[^a-zA-Z0-9_-]/g, ""));
    });
    yt2.forEach((m) => found.youtube.push(m.split("/").pop().replace(/[^a-zA-Z0-9_-]/g, "")));

    // vimeo
    const vm = html.match(/player\.vimeo\.com\/video\/(\d+)/g) || [];
    vm.forEach((m) => found.vimeo.push(m.split("/").pop()));

    // wix video CDN
    const wix =
      html.match(/https?:\/\/video\.wixstatic\.com\/[^"'\\\s>]+/gi) ||
      html.match(/https?:\/\/[^"'\\\s>]*wixstatic[^"'\\\s>]*\.(mp4|webm)/gi) ||
      [];
    found.wixVideo.push(...wix);

    // 反斜杠编码
    const enc = html.match(/video\.wixstatic\.com\\u002F[^"'\\\s]+/g) || [];
    enc.forEach((m) => {
      found.wixVideo.push(("https://" + m).replace(/\\u002F/g, "/"));
    });

    // JSON 里常见 videoUrl / uri
    const jsonUrls =
      html.match(/"(?:url|videoUrl|fileUrl|uri)"\s*:\s*"(https?:[^"]+\.(?:mp4|webm)[^"]*)"/gi) || [];
    jsonUrls.forEach((m) => {
      const u = m.match(/https?:[^"]+/);
      if (u) found.videoFiles.push(u[0].replace(/\\u002F/g, "/").replace(/\\\//g, "/"));
    });
  }

  found.videoFiles = uniq(found.videoFiles.map((u) => u.replace(/\\u002F/g, "/").replace(/\\\//g, "/")));
  found.wixVideo = uniq(found.wixVideo.map((u) => u.replace(/\\u002F/g, "/").replace(/\\\//g, "/")));
  found.youtube = uniq(found.youtube);
  found.vimeo = uniq(found.vimeo);

  const report = path.join(__dirname, "mono-videos-found.json");
  fs.writeFileSync(report, JSON.stringify(found, null, 2), "utf8");
  console.log("发现视频资源:", JSON.stringify(found, null, 2));

  const allDownload = uniq([...found.videoFiles, ...found.wixVideo]);
  const saved = [];

  if (!allDownload.length) {
    console.log("页面 HTML 里没有直接视频文件链接（可能是 YouTube/Vimeo 嵌入或动态加载）");
    if (found.youtube.length) console.log("YouTube IDs:", found.youtube.join(", "));
    if (found.vimeo.length) console.log("Vimeo IDs:", found.vimeo.join(", "));
  }

  let i = 0;
  for (const url of allDownload) {
    i += 1;
    const clean = url.split("?")[0];
    const ext = (clean.match(/\.(mp4|webm|mov)$/i) || [, "mp4"])[1].toLowerCase();
    const name = `mono-video-${String(i).padStart(2, "0")}.${ext}`;
    const dest = path.join(OUT, name);
    try {
      console.log(`下载 ${i}/${allDownload.length}`, url.slice(0, 100));
      await download(url, dest);
      const size = fs.statSync(dest).size;
      if (size < 10000) {
        console.warn("  文件过小，可能无效，删除");
        fs.unlinkSync(dest);
        continue;
      }
      saved.push({ file: `/videos/${name}`, source: url, size });
      console.log("  OK", Math.round(size / 1024 / 1024) + "MB");
    } catch (e) {
      console.warn("  失败", e.message);
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "mono-videos-downloaded.json"),
    JSON.stringify({ saved, youtube: found.youtube, vimeo: found.vimeo }, null, 2),
    "utf8"
  );
  console.log("完成，本地视频:", saved.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
