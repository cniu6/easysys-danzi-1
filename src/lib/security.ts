import { NextRequest, NextResponse } from "next/server";

/**
 * 同源校验：写操作要求 Origin/Referer 与当前 Host 一致，降低 CSRF 风险
 * （Cookie 已是 SameSite=Lax + httpOnly，此为额外一层）
 */
export function assertSameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // 部分浏览器同域 POST 可能无 Origin，再看 Referer
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // 无 Origin/Referer：拒绝写操作（登录页 fetch 同源会带 Origin）
  return false;
}

export function forbiddenOrigin() {
  return NextResponse.json({ error: "非法请求来源" }, { status: 403 });
}

/** 简单内存限流（单机有效；防登录爆破） */
type Bucket = { count: number; resetAt: number };

const loginBuckets = new Map<string, Bucket>();

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 分钟
const LOGIN_MAX_ATTEMPTS = 8;

function clientKey(req: NextRequest): string {
  // 优先取代理真实 IP，并做长度限制防污染
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const ip = (xf || req.headers.get("x-real-ip") || "unknown").slice(0, 64);
  // 只保留安全字符
  return ip.replace(/[^a-zA-Z0-9.:_-]/g, "_");
}

/** 登录是否被限流；true = 应拒绝 */
export function isLoginRateLimited(req: NextRequest): boolean {
  const key = clientKey(req);
  const now = Date.now();
  const b = loginBuckets.get(key);
  if (!b || now >= b.resetAt) {
    loginBuckets.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return b.count >= LOGIN_MAX_ATTEMPTS;
}

/** 记录一次失败登录 */
export function recordLoginFailure(req: NextRequest) {
  const key = clientKey(req);
  const now = Date.now();
  const b = loginBuckets.get(key);
  if (!b || now >= b.resetAt) {
    loginBuckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  b.count += 1;
}

/** 登录成功后重置该 IP 计数 */
export function clearLoginFailures(req: NextRequest) {
  loginBuckets.delete(clientKey(req));
}

/** 定期清理过期限流桶，避免 Map 无限增长 */
let lastSweep = 0;
export function sweepRateLimitBuckets() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of loginBuckets) {
    if (now >= b.resetAt) loginBuckets.delete(k);
  }
}

/**
 * 粗校验站点内容结构，挡明显脏数据 / 超大 payload
 * （最终写入 JSON 文件，不做 eval、不拼进 shell）
 */
export function validateSiteContentPayload(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const o = body as Record<string, unknown>;
  // 拒绝原型污染常见键作为顶层（防御性）
  const keys = Object.keys(o);
  if (keys.some((k) => k === "__proto__" || k === "constructor" || k === "prototype")) {
    return false;
  }
  if (!o.brand || !o.contact || !o.home || !o.nav) return false;
  // 体积上限约 8MB 字符（防止撑爆内存）
  try {
    if (JSON.stringify(body).length > 8 * 1024 * 1024) return false;
  } catch {
    return false;
  }
  return true;
}
