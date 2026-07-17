import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";

/** 允许浏览的 public 下根目录 */
const ROOTS = new Set(["images", "uploads", "videos"]);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

function kindOf(name: string): "image" | "video" | "other" {
  const ext = path.extname(name).toLowerCase();
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  return "other";
}

/** 规范化并校验相对 public 的路径，防穿越 / 空字节注入 */
function resolveSafe(rel: string): { abs: string; rel: string } | null {
  if (typeof rel !== "string" || rel.length > 512) return null;
  if (rel.includes("\0")) return null;

  const cleaned = rel
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+/g, "/")
    .replace(/\.\./g, "");

  // 只允许安全路径字符
  if (cleaned && !/^[a-zA-Z0-9_\-./]+$/.test(cleaned)) return null;

  const top = cleaned.split("/")[0] || "";
  if (!ROOTS.has(top) && cleaned !== "") return null;

  const publicRoot = path.resolve(process.cwd(), "public");
  const abs = cleaned ? path.resolve(publicRoot, cleaned) : publicRoot;
  const relToRoot = path.relative(publicRoot, abs);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) return null;

  return { abs, rel: cleaned };
}

/**
 * GET /api/files?path=images/hero
 * 列出文件夹与文件，供后台文件管理器使用
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  const rawParam = req.nextUrl.searchParams.get("path");
  const raw = rawParam === null ? "images" : rawParam;

  if (raw === "" || raw === ".") {
    return NextResponse.json({
      path: "",
      parent: null,
      folders: [...ROOTS],
      files: [],
    });
  }

  const safe = resolveSafe(raw);
  if (!safe) {
    return NextResponse.json({ error: "非法路径" }, { status: 400 });
  }

  if (!existsSync(safe.abs)) {
    return NextResponse.json({
      path: safe.rel,
      parent: parentOf(safe.rel),
      folders: [],
      files: [],
    });
  }

  const entries = await readdir(safe.abs, { withFileTypes: true });
  const folders: string[] = [];
  const files: {
    name: string;
    url: string;
    size: number;
    kind: "image" | "video" | "other";
  }[] = [];

  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    if (/[\\/\0]/.test(ent.name)) continue;

    if (ent.isDirectory()) {
      folders.push(ent.name);
      continue;
    }
    if (!ent.isFile()) continue;
    const full = path.join(safe.abs, ent.name);
    const st = await stat(full);
    files.push({
      name: ent.name,
      url: `/${safe.rel}/${ent.name}`.replace(/\/+/g, "/"),
      size: st.size,
      kind: kindOf(ent.name),
    });
  }

  folders.sort((a, b) => a.localeCompare(b));
  files.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    path: safe.rel,
    parent: parentOf(safe.rel),
    folders,
    files,
  });
}

function parentOf(rel: string): string | null {
  const parts = rel.split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}
