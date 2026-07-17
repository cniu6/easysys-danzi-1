import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { readEnvLocalValue } from "@/lib/env-file";

/** 后台会话 Cookie 名（httpOnly，前端不可读） */
export const COOKIE_NAME = "admin_session";

/** 兼容旧 Cookie，登录成功/退出时一并清理 */
const LEGACY_COOKIE = "cms_token";

/** 默认会话时长：12 小时 */
const DEFAULT_SESSION_HOURS = 12;

/** 从环境变量读取会话小时数（优先 .env.local 实时值） */
export function getSessionHours(): number {
  const raw = readEnvLocalValue("AUTH_SESSION_HOURS") || process.env.AUTH_SESSION_HOURS;
  const n = raw ? Number(raw) : DEFAULT_SESSION_HOURS;
  if (!Number.isFinite(n) || n <= 0 || n > 24 * 30) {
    return DEFAULT_SESSION_HOURS;
  }
  return Math.floor(n);
}

/** Cookie / JWT 共用的秒数 */
export function getSessionMaxAgeSec(): number {
  return getSessionHours() * 60 * 60;
}

function getSecretBytes(): Uint8Array {
  const secret = (
    readEnvLocalValue("AUTH_SECRET") ||
    process.env.AUTH_SECRET ||
    ""
  ).trim();
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("生产环境必须配置至少 16 位的 AUTH_SECRET");
    }
    // 仅本地开发回退，勿用于上线
    return new TextEncoder().encode("dev-only-insecure-auth-secret");
  }
  return new TextEncoder().encode(secret);
}

/** Cookie 统一属性（登录 / 退出 / 清理共用，避免残留） */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** 在响应上写入会话 Cookie */
export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions(getSessionMaxAgeSec()));
  // 清掉旧名 Cookie，避免双会话混乱
  res.cookies.set(LEGACY_COOKIE, "", sessionCookieOptions(0));
}

/** 在响应上清除会话（退出 / 过期 / 伪造） */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", sessionCookieOptions(0));
  res.cookies.set(LEGACY_COOKIE, "", sessionCookieOptions(0));
}

/** 实时读取后台密码（.env.local 优先，改密后无需重启） */
function getExpectedPassword(): string {
  return readEnvLocalValue("ADMIN_PASSWORD") || "";
}

/**
 * 常量时间比较密码，降低时序侧信道风险
 * 密码来自 .env.local 的 ADMIN_PASSWORD，不做任何字符串拼接进查询/命令
 */
export function verifyPassword(password: unknown): boolean {
  if (typeof password !== "string") return false;
  // 限制长度，防超大 body 拖垮对比
  if (password.length === 0 || password.length > 256) return false;

  const expected = getExpectedPassword();
  if (!expected || expected.length === 0 || expected.length > 256) {
    return false;
  }

  // 用 hash 再比，避免明文长度不同直接暴露；两边同算法定长
  const a = createHash("sha256").update(password, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** 签发登录 JWT，exp 与 Cookie maxAge 一致（默认 12h） */
export async function createToken(): Promise<string> {
  const hours = getSessionHours();
  return new SignJWT({ role: "admin", typ: "session" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(getSecretBytes());
}

export type SessionInfo = {
  authenticated: boolean;
  /** 过期时间戳（毫秒），未登录为 null */
  expiresAt: number | null;
  /** 是否存在无效 Cookie（过期/伪造），调用方应清理 */
  invalidCookie: boolean;
};

/** 校验 token 字符串 */
export async function verifyTokenPayload(
  token: string
): Promise<{ ok: true; payload: JWTPayload } | { ok: false }> {
  if (!token || token.length > 4096) return { ok: false };
  // JWT 只允许 base64url 字符，挡一下明显垃圾
  if (!/^[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+$/.test(token)) {
    return { ok: false };
  }
  try {
    const { payload } = await jwtVerify(token, getSecretBytes(), {
      algorithms: ["HS256"],
    });
    if (payload.role !== "admin") return { ok: false };
    return { ok: true, payload };
  } catch {
    return { ok: false };
  }
}

/** 读取当前请求会话（不改 Cookie；无效时标记 invalidCookie） */
export async function readSession(): Promise<SessionInfo> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value || jar.get(LEGACY_COOKIE)?.value;
  if (!token) {
    return { authenticated: false, expiresAt: null, invalidCookie: false };
  }
  const result = await verifyTokenPayload(token);
  if (!result.ok) {
    return { authenticated: false, expiresAt: null, invalidCookie: true };
  }
  const exp = result.payload.exp;
  return {
    authenticated: true,
    expiresAt: typeof exp === "number" ? exp * 1000 : null,
    invalidCookie: false,
  };
}

/** 是否已登录（路由守卫用） */
export async function isAuthenticated(): Promise<boolean> {
  const s = await readSession();
  return s.authenticated;
}

/** 统一 401，并清掉过期/无效 Cookie */
export function unauthorizedResponse(message = "未登录或登录已过期") {
  const res = NextResponse.json(
    { error: message, code: "AUTH_REQUIRED" },
    { status: 401 }
  );
  clearSessionCookie(res);
  return res;
}
