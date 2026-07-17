import { NextRequest, NextResponse } from "next/server";
import {
  isAuthenticated,
  unauthorizedResponse,
  verifyPassword,
} from "@/lib/auth";
import {
  assertSameOrigin,
  forbiddenOrigin,
  isLoginRateLimited,
  recordLoginFailure,
  sweepRateLimitBuckets,
} from "@/lib/security";
import { validateNewPassword, writeEnvLocalValue } from "@/lib/env-file";

/**
 * POST /api/auth/password — 修改后台密码
 * 写入 .env.local 的 ADMIN_PASSWORD，并同步 process.env，立即生效（无需重启）
 */
export async function POST(req: NextRequest) {
  try {
    sweepRateLimitBuckets();

    if (!(await isAuthenticated())) {
      return unauthorizedResponse();
    }
    if (!assertSameOrigin(req)) {
      return forbiddenOrigin();
    }

    // 复用登录限流，防改密接口被撞
    if (isLoginRateLimited(req)) {
      return NextResponse.json(
        { error: "尝试过于频繁，请稍后再试" },
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

    const { currentPassword, newPassword, confirmPassword } = body as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json({ error: "请填写完整" }, { status: 400 });
    }

    if (typeof confirmPassword === "string" && confirmPassword !== newPassword) {
      return NextResponse.json({ error: "两次新密码不一致" }, { status: 400 });
    }

    if (!verifyPassword(currentPassword)) {
      recordLoginFailure(req);
      return NextResponse.json({ error: "当前密码错误" }, { status: 401 });
    }

    const formatErr = validateNewPassword(newPassword);
    if (formatErr) {
      return NextResponse.json({ error: formatErr }, { status: 400 });
    }

    if (verifyPassword(newPassword)) {
      return NextResponse.json({ error: "新密码不能与当前密码相同" }, { status: 400 });
    }

    writeEnvLocalValue("ADMIN_PASSWORD", newPassword);

    return NextResponse.json({
      ok: true,
      message: "密码已更新到 .env.local，立即生效",
    });
  } catch {
    return NextResponse.json({ error: "修改失败" }, { status: 500 });
  }
}
