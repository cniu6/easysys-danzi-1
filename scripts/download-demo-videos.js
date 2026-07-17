/**
 * 下载演示视频到 public/videos/
 * Paris MONO 官网没有直接可下的成片；用可访问的公开样片占位。
 * 运行：npm run videos:demo
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const OUT = path.join(__dirname, "..", "public", "videos");
fs.mkdirSync(OUT, { recursive: true });

const JOBS = [
  {
    name: "paris-1.mp4",
    urls: [
      "https://www.w3schools.com/html/mov_bbb.mp4",
      "https://www.w3schools.com/html/movie.mp4",
    ],
  },
  {
    name: "paris-2.mp4",
    urls: [
      "https://www.w3schools.com/html/movie.mp4",
      "https://www.w3schools.com/html/mov_bbb.mp4",
    ],
  },
  {
    name: "chateau-1.mp4",
    urls: [
      "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      "https://www.w3schools.com/html/mov_bbb.mp4",
    ],
  },
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    const req = lib.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
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
          try {
            fs.unlinkSync(dest);
          } catch {}
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const total = Number(res.headers["content-length"] || 0);
        let got = 0;
        res.on("data", (c) => {
          got += c.length;
          if (total) {
            const p = ((got / total) * 100).toFixed(0);
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

async function downloadOne(job) {
  const dest = path.join(OUT, job.name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 100_000) {
    console.log(`已存在，跳过 ${job.name}`);
    return `/videos/${job.name}`;
  }
  for (const url of job.urls) {
    try {
      console.log(`下载 ${job.name}`);
      console.log(`  ← ${url}`);
      await download(url, dest);
      const size = fs.statSync(dest).size;
      if (size < 50_000) {
        console.warn("  太小，丢弃");
        fs.unlinkSync(dest);
        continue;
      }
      console.log(`  OK ${Math.round(size / 1024)}KB → /videos/${job.name}`);
      return `/videos/${job.name}`;
    } catch (e) {
      console.warn("  失败:", e.message);
    }
  }
  return null;
}

async function main() {
  const saved = [];
  for (const job of JOBS) {
    const file = await downloadOne(job);
    if (file) saved.push(file);
  }
  console.log("完成:", saved.length, "个文件");
  console.log(saved.join("\n"));
  if (!saved.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
