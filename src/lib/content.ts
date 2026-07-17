import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { SiteContent } from "@/types/content";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTENT_PATH = path.join(DATA_DIR, "content.json");
const PATH_MAP = path.join(DATA_DIR, "path-map.json");

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

/** 读取站点内容（服务端） */
export function getContent(): SiteContent {
  if (!existsSync(CONTENT_PATH)) {
    throw new Error("内容文件不存在：data/content.json");
  }
  const raw = readFileSync(CONTENT_PATH, "utf-8");
  return sanitizeMissingLocalMedia(JSON.parse(raw) as SiteContent);
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
  writeFileSync(CONTENT_PATH, JSON.stringify(cleaned, null, 2), "utf-8");
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
