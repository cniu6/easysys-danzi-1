import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

/** POST /api/auth/logout — 退出并清除会话 Cookie */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
