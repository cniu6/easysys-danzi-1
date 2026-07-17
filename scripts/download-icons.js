const fs = require("fs");
const path = require("path");
const https = require("https");
const sharp = require("sharp");

const OUT = path.join(__dirname, "..", "public", "images");
fs.mkdirSync(OUT, { recursive: true });

/** 透明图标：用 Wix fill + enc_png 保留透明通道 */
const ICONS = [
  {
    name: "logo.png",
    // Logo 高清透明 PNG
    url: "https://static.wixstatic.com/media/82615a_cade972d382d47a59e23c89861c93ed5~mv2.png/v1/fill/w_628,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_png/MONOLOGO%202022%20final%20V2%20n%20.png",
    // 备用原文件
    fallback: "https://static.wixstatic.com/media/82615a_cade972d382d47a59e23c89861c93ed5~mv2.png",
  },
  {
    name: "icon-unknown.png",
    url: "https://static.wixstatic.com/media/82615a_340ed6896bb343a895335991b6a3cafe~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_png/82615a_340ed6896bb343a895335991b6a3cafe~mv2.png",
    fallback: "https://static.wixstatic.com/media/82615a_340ed6896bb343a895335991b6a3cafe~mv2.png",
  },
  {
    name: "social-tiktok.png",
    url: "https://static.wixstatic.com/media/11062b_7fc95bac711041dcb9691b6a09192a84~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_png/11062b_7fc95bac711041dcb9691b6a09192a84~mv2.png",
    fallback: "https://static.wixstatic.com/media/11062b_7fc95bac711041dcb9691b6a09192a84~mv2.png",
  },
  {
    name: "social-xiaohongshu.png",
    url: "https://static.wixstatic.com/media/82615a_ca02fcbf90844b9faa01a9519bc72849~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_png/82615a_ca02fcbf90844b9faa01a9519bc72849~mv2.png",
    fallback: "https://static.wixstatic.com/media/82615a_ca02fcbf90844b9faa01a9519bc72849~mv2.png",
  },
  {
    name: "social-instagram.png",
    url: "https://static.wixstatic.com/media/11062b_ca1d837ce7194421b781ee7384061a8e~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_png/11062b_ca1d837ce7194421b781ee7384061a8e~mv2.png",
    fallback: "https://static.wixstatic.com/media/11062b_ca1d837ce7194421b781ee7384061a8e~mv2.png",
  },
  {
    name: "social-facebook.png",
    url: "https://static.wixstatic.com/media/11062b_362ef89dec51403eb0ee59a21bde967c~mv2.png/v1/fill/w_200,h_200,al_c,q_85,usm_0.66_1.00_0.01,enc_png/11062b_362ef89dec51403eb0ee59a21bde967c~mv2.png",
    fallback: "https://static.wixstatic.com/media/11062b_362ef89dec51403eb0ee59a21bde967c~mv2.png",
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "image/png,image/*,*/*" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

/**
 * 若整图近乎黑底白图：把接近黑色的像素变透明，白/浅色保留
 * 用于 Logo（白字黑底）做成透明底白字；社交图标若是黑图标则反相处理
 */
async function makeTransparent(buf, mode) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const a = px[i + 3];
    const lum = (r + g + b) / 3;

    if (mode === "logo-white-on-black") {
      // 黑底去掉，保留亮色笔画
      if (lum < 40) {
        px[i + 3] = 0;
      } else {
        // 提升对比，做成纯白图标
        px[i] = 255;
        px[i + 1] = 255;
        px[i + 2] = 255;
        px[i + 3] = a < 10 ? 255 : a;
      }
    } else if (mode === "icon-black") {
      // 近白底透明，保留深色图标；若几乎全黑不透明则当黑图标透明化周边
      if (lum > 230) {
        px[i + 3] = 0;
      } else if (lum < 30 && a > 200) {
        // 已经是黑图标，保持
        px[i] = 0;
        px[i + 1] = 0;
        px[i + 2] = 0;
      }
    } else if (mode === "icon-auto") {
      // 统计：若平均偏黑且不透明，当白底黑图标失败时改为「黑底白图标」或「纯黑图标」
      // 这里：暗像素保留为黑，亮像素透明
      if (lum > 200) {
        px[i + 3] = 0;
      } else {
        px[i] = 0;
        px[i + 1] = 0;
        px[i + 2] = 0;
        if (a < 5) px[i + 3] = 255;
      }
    }
  }

  return sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function analyze(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  let light = 0;
  let transparent = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 20) {
      transparent++;
      continue;
    }
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (lum < 50) dark++;
    else if (lum > 200) light++;
  }
  return {
    w: info.width,
    h: info.height,
    darkRatio: dark / n,
    lightRatio: light / n,
    transparentRatio: transparent / n,
  };
}

async function main() {
  for (const item of ICONS) {
    let buf = null;
    for (const u of [item.url, item.fallback]) {
      try {
        console.log("下载", item.name, u.slice(0, 90));
        buf = await download(u);
        if (buf.length > 500) break;
      } catch (e) {
        console.warn("  失败", e.message);
      }
    }
    if (!buf) {
      console.error("跳过", item.name);
      continue;
    }

    const stats = await analyze(buf);
    console.log("  分析", stats);

    let out = buf;
    const isLogo = item.name === "logo.png";

    // 已有透明通道且不全黑：直接存
    if (stats.transparentRatio > 0.05 && stats.darkRatio + stats.lightRatio > 0.01) {
      out = await sharp(buf).png().toBuffer();
      console.log("  已有透明，直接保存");
    } else if (isLogo) {
      // Logo：常见白字黑底 → 透明底白字；再额外出一份黑字透明版给白底顶栏
      const whiteLogo = await makeTransparent(buf, "logo-white-on-black");
      fs.writeFileSync(path.join(OUT, "logo-white.png"), whiteLogo);
      // 顶栏白底用黑字：把白笔画反相成黑
      const { data, info } = await sharp(whiteLogo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const px = Buffer.from(data);
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 10) {
          px[i] = 0;
          px[i + 1] = 0;
          px[i + 2] = 0;
        }
      }
      out = await sharp(px, {
        raw: { width: info.width, height: info.height, channels: 4 },
      })
        .png()
        .toBuffer();
      console.log("  Logo：生成透明黑字 + logo-white.png");
    } else if (stats.darkRatio > 0.8 && stats.transparentRatio < 0.05) {
      // 几乎全黑不透明方块：用 fill 版失败了，尝试把非纯黑边缘抠出来很难
      // 再试原图 + auto
      out = await makeTransparent(buf, "icon-auto");
      console.log("  全黑图，尝试 auto 透明化");
    } else {
      out = await makeTransparent(buf, "icon-auto");
      console.log("  自动透明化");
    }

    const dest = path.join(OUT, item.name);
    fs.writeFileSync(dest, out);
    console.log("  写入", item.name, out.length, "bytes");
  }

  // 兼容旧文件名
  const xhs = path.join(OUT, "social-xiaohongshu.png");
  if (fs.existsSync(xhs)) {
    fs.copyFileSync(xhs, path.join(OUT, "social-wechat.png"));
  }
  console.log("完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
