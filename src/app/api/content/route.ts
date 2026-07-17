import { NextRequest, NextResponse } from "next/server";
import { getContent, saveContent } from "@/lib/content";
import { isAuthenticated, unauthorizedResponse } from "@/lib/auth";
import type { SiteContent } from "@/types/content";
import {
  assertSameOrigin,
  forbiddenOrigin,
  validateSiteContentPayload,
} from "@/lib/security";

/** GET /api/content — 公开读取站点内容 */
export async function GET() {
  try {
    const content = getContent();
    return NextResponse.json(content);
  } catch {
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}

/** PUT /api/content — 需登录，保存整站内容 */
export async function PUT(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return unauthorizedResponse();
  }
  if (!assertSameOrigin(req)) {
    return forbiddenOrigin();
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    if (!validateSiteContentPayload(body)) {
      return NextResponse.json({ error: "内容格式无效或过大" }, { status: 400 });
    }

    saveContent(body as unknown as SiteContent);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}
