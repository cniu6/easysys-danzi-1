import { NextRequest, NextResponse } from "next/server";
import {
  createToken,
  getSessionHours,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import {
  assertSameOrigin,
  clearLoginFailures,
  forbiddenOrigin,
  isLoginRateLimited,
  recordLoginFailure,
  sweepRateLimitBuckets,
} from "@/lib/security";

/** POST /api/auth/login — 后台登录（默认 12h，见 AUTH_SESSION_HOURS） */
export async function POST(req: NextRequest) {
  try {
    sweepRateLimitBuckets();

    if (!assertSameOrigin(req)) {
      return forbiddenOrigin();
    }

    if (isLoginRateLimited(req)) {
      return NextResponse.json(
        { error: "尝试过于频繁，请 15 分钟后再试" },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const password = (body as { password?: unknown }).password;
    if (!verifyPassword(password)) {
      recordLoginFailure(req);
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    clearLoginFailures(req);
    const token = await createToken();
    const res = NextResponse.json({
      ok: true,
      expiresInHours: getSessionHours(),
    });
    setSessionCookie(res, token);
    return res;
  } catch {
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
