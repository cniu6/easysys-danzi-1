import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import { assertSameOrigin, forbiddenOrigin } from "@/lib/security";

/** MIME → 允许的扩展名（不信任原始文件名） */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

/** POST /api/upload — 上传图片/视频到 public/uploads */
export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }
  if (!assertSameOrigin(req)) {
    return forbiddenOrigin();
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const mime = (file.type || "").toLowerCase();
    const ext = MIME_TO_EXT[mime];
    if (!ext) {
      return NextResponse.json(
        { error: "仅支持 jpg/png/webp/gif/mp4/webm" },
        { status: 400 }
      );
    }

    if (file.size <= 0 || file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "文件过大或为空（最大 50MB）" }, { status: 400 });
    }

    // 服务端生成安全文件名，杜绝路径注入
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const dest = path.join(uploadDir, safeName);
    // 二次确认仍在 uploads 内
    if (!dest.startsWith(path.resolve(uploadDir))) {
      return NextResponse.json({ error: "非法路径" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    await writeFile(dest, Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/${safeName}` });
  } catch {
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
