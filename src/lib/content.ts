import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type { SiteContent } from "@/types/content";

const DATA_DIR = path.join(process.cwd(), "data");
const CONTENT_PATH = path.join(DATA_DIR, "content.json");
const PATH_MAP = path.join(DATA_DIR, "path-map.json");

/** 读取站点内容（服务端） */
export function getContent(): SiteContent {
  if (!existsSync(CONTENT_PATH)) {
    throw new Error("内容文件不存在：data/content.json");
  }
  const raw = readFileSync(CONTENT_PATH, "utf-8");
  return JSON.parse(raw) as SiteContent;
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
  writeFileSync(CONTENT_PATH, JSON.stringify(content, null, 2), "utf-8");
  writePathMap(content);
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
