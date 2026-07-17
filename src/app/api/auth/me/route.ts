import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionHours,
  readSession,
} from "@/lib/auth";

/**
 * GET /api/auth/me — 检查登录状态
 * 若 Cookie 过期/伪造，一并清除（自动超时清理）
 */
export async function GET() {
  const session = await readSession();

  if (session.invalidCookie) {
    const res = NextResponse.json({
      authenticated: false,
      expiresAt: null,
      sessionHours: getSessionHours(),
    });
    clearSessionCookie(res);
    return res;
  }

  return NextResponse.json({
    authenticated: session.authenticated,
    expiresAt: session.expiresAt,
    sessionHours: getSessionHours(),
  });
}
