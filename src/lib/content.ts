import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from "fs";
import path from "path";
import type { SiteContent } from "@/types/content";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTENT_PATH = path.join(DATA_DIR, "content.json");
const PATH_MAP = path.join(DATA_DIR, "path-map.json");
/** Docker 镜像内种子目录（空持久卷盖住 data 时从此恢复） */
const SEED_DATA_DIR = path.join(process.cwd(), "seed", "data");

/**
 * 判断 public 下本地媒体是否真实存在。
 * 外链（http/https）或空路径不校验。
 */
function publicFileExists(url: string): boolean {
  const u = (url || "").trim();
  if (!u || /^https?:\/\//i.test(u) || u.startsWith("data:")) return true;
  if (!u.startsWith("/")) return true;
  const rel = u.replace(/^\/+/, "").split("?")[0].split("#")[0];
  if (!rel) return true;
  return existsSync(path.join(process.cwd(), "public", rel));
}

/**
 * 清理已删除文件留下的无效本地路径，避免前台/后台持续 404。
 * 只清空本地路径；不改写外链。
 */
function sanitizeMissingLocalMedia(content: SiteContent): SiteContent {
  const next = structuredClone(content);

  for (const v of next.videos || []) {
    if (v.src && !publicFileExists(v.src)) v.src = "";
    if (v.cover && !publicFileExists(v.cover)) v.cover = "";
  }

  for (const album of next.albums || []) {
    if (Array.isArray(album.media)) {
      album.media = album.media.filter((m) => {
        if (!m?.src) return false;
        return publicFileExists(m.src);
      });
    }
    if (Array.isArray(album.images)) {
      album.images = album.images.filter((src) => publicFileExists(src));
    }
    if (album.cover && !publicFileExists(album.cover)) album.cover = "";
  }

  for (const slide of next.home?.heroSlides || []) {
    if (slide.src && !publicFileExists(slide.src)) slide.src = "";
    if (slide.poster && !publicFileExists(slide.poster)) slide.poster = "";
  }

  for (const card of next.gallery || []) {
    if (card.image && !publicFileExists(card.image)) card.image = "";
  }

  for (const s of next.services || []) {
    if (s.image && !publicFileExists(s.image)) s.image = "";
  }

  if (Array.isArray(next.publicity)) {
    next.publicity = next.publicity.filter((src) => publicFileExists(src));
  }

  if (next.pages?.about?.heroImage && !publicFileExists(next.pages.about.heroImage)) {
    next.pages.about.heroImage = "";
  }

  for (const page of Object.values(next.pages || {})) {
    if (!page || !Array.isArray(page.media)) continue;
    for (const m of page.media) {
      if (m.src && !publicFileExists(m.src)) m.src = "";
      if (m.poster && !publicFileExists(m.poster)) m.poster = "";
    }
  }

  return next;
}

/** 把种子目录文件拷到 data（仅缺文件时） */
function ensureDataFromSeed(): void {
  if (!existsSync(SEED_DATA_DIR)) return;
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  for (const name of readdirSync(SEED_DATA_DIR)) {
    const dest = path.join(DATA_DIR, name);
    if (existsSync(dest)) continue;
    try {
      copyFileSync(path.join(SEED_DATA_DIR, name), dest);
      console.warn(`[content] 已从 seed 恢复缺失文件: data/${name}`);
    } catch (err) {
      console.error(`[content] 无法写入 data/${name}`, err);
    }
  }
}

/** 解析 content.json；失败返回 null */
function parseContentFile(filePath: string): SiteContent | null {
  try {
    if (!existsSync(filePath)) return null;
    const raw = readFileSync(filePath, "utf-8").trim();
    if (!raw) return null;
    return JSON.parse(raw) as SiteContent;
  } catch (err) {
    console.error(`[content] 解析失败: ${filePath}`, err);
    return null;
  }
}

/** 读取站点内容（服务端）；缺文件时自动从 seed 恢复，避免整站白屏 */
export function getContent(): SiteContent {
  ensureDataFromSeed();

  let parsed = parseContentFile(CONTENT_PATH);
  if (!parsed) {
    // 卷权限只读或写入失败时，直接读种子，保证前台能开
    const seedPath = path.join(SEED_DATA_DIR, "content.json");
    parsed = parseContentFile(seedPath);
  }

  if (!parsed) {
    throw new Error(
      `内容文件不可用。cwd=${process.cwd()} path=${CONTENT_PATH} seed=${path.join(SEED_DATA_DIR, "content.json")}`
    );
  }

  return sanitizeMissingLocalMedia(parsed);
}

/** 根据 albums.aliases 生成短地址 → 正式图库路径映射 */
export function buildPathMap(content: SiteContent): Record<string, string> {
  const map: Record<string, string> = {};
  for (const album of content.albums || []) {
    if (!album.enabled || !album.slug) continue;
    const target = `/gallery/${album.slug}`;
    map[target] = target;
    for (const raw of album.aliases || []) {
      const a = raw.trim().replace(/^\/+/, "").replace(/\/+$/, "");
      if (!a) continue;
      map[`/${a}`] = target;
    }
  }
  return map;
}

function writePathMap(content: SiteContent) {
  const map = buildPathMap(content);
  writeFileSync(PATH_MAP, JSON.stringify(map, null, 2), "utf-8");
}

/** 保存站点内容（CMS 写入） */
export function saveContent(content: SiteContent): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  // 写入前再清一遍失效本地路径，防止后台旧状态把已删文件写回去
  const cleaned = sanitizeMissingLocalMedia(content);
  // 先写临时文件再 rename，降低半截 JSON 风险
  const tmp = `${CONTENT_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(cleaned, null, 2), "utf-8");
  try {
    renameSync(tmp, CONTENT_PATH);
  } catch {
    writeFileSync(CONTENT_PATH, JSON.stringify(cleaned, null, 2), "utf-8");
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
  writePathMap(cleaned);
}

/** 中间件读取路径映射 */
export function readPathMap(): Record<string, string> {
  if (!existsSync(PATH_MAP)) {
    try {
      writePathMap(getContent());
    } catch {
      return {};
    }
  }
  try {
    return JSON.parse(readFileSync(PATH_MAP, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}
