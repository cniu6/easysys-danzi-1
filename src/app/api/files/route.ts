import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { assertSameOrigin, forbiddenOrigin } from "@/lib/security";

/** 允许浏览/删除的 public 下根目录 */
const ROOTS = ["images", "uploads", "videos"] as const;
const ROOT_SET = new Set<string>(ROOTS);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]);
const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);

export type TreeNode = {
  name: string;
  path: string;
  children: TreeNode[];
};

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

  if (cleaned && !/^[a-zA-Z0-9_\-./]+$/.test(cleaned)) return null;

  const top = cleaned.split("/")[0] || "";
  if (!ROOT_SET.has(top) && cleaned !== "") return null;

  const publicRoot = path.resolve(process.cwd(), "public");
  const abs = cleaned ? path.resolve(publicRoot, cleaned) : publicRoot;
  const relToRoot = path.relative(publicRoot, abs);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) return null;

  return { abs, rel: cleaned };
}

function parentOf(rel: string): string | null {
  const parts = rel.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return "";
  return parts.slice(0, -1).join("/");
}

/** 递归构建目录树（仅文件夹，深度限制防过大） */
async function buildFolderTree(rel: string, depth = 0): Promise<TreeNode[]> {
  if (depth > 8) return [];
  const safe = resolveSafe(rel);
  if (!safe || !existsSync(safe.abs)) return [];

  const entries = await readdir(safe.abs, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !/[\\/\0]/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  const nodes: TreeNode[] = [];
  for (const name of dirs) {
    const childRel = rel ? `${rel}/${name}` : name;
    nodes.push({
      name,
      path: childRel,
      children: await buildFolderTree(childRel, depth + 1),
    });
  }
  return nodes;
}

/**
 * GET /api/files?path=images/hero
 * GET /api/files?tree=1  → 返回三根目录的文件夹树
 */
export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }

  if (req.nextUrl.searchParams.get("tree") === "1") {
    const tree: TreeNode[] = [];
    for (const root of ROOTS) {
      const abs = path.join(process.cwd(), "public", root);
      tree.push({
        name: root,
        path: root,
        children: existsSync(abs) ? await buildFolderTree(root) : [],
      });
    }
    return NextResponse.json({ tree });
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
    // 跳过占位空文件
    if (ent.name === ".gitkeep") continue;
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

/**
 * DELETE /api/files?url=/uploads/xxx.jpg
 * 仅允许删除 uploads/ 与 videos/ 下文件（保护 images 静态素材）
 * 或 ?allowImages=1 时也可删 images（需显式）
 */
export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }
  if (!assertSameOrigin(req)) {
    return forbiddenOrigin();
  }

  const urlPath = req.nextUrl.searchParams.get("url") || "";
  const cleaned = urlPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const safe = resolveSafe(cleaned);
  if (!safe || !safe.rel) {
    return NextResponse.json({ error: "非法路径" }, { status: 400 });
  }

  const top = safe.rel.split("/")[0];
  // 默认只允许删 uploads / videos，避免误删整站图库素材
  if (top !== "uploads" && top !== "videos") {
    return NextResponse.json(
      { error: "仅允许删除 uploads 或 videos 下的文件" },
      { status: 403 }
    );
  }

  if (!existsSync(safe.abs)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const st = await stat(safe.abs);
  if (!st.isFile()) {
    return NextResponse.json({ error: "只能删除文件" }, { status: 400 });
  }

  await unlink(safe.abs);
  return NextResponse.json({ ok: true });
}
