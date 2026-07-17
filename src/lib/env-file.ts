import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const ENV_LOCAL = path.join(process.cwd(), ".env.local");

/**
 * 解析 .env 单行值（支持双引号/单引号，去掉行尾注释）
 * 不做命令执行，纯文本解析，防注入
 */
function parseEnvValue(raw: string): string {
  let v = raw.trim();
  if (!v) return "";

  // 去掉未引号包裹时的行尾 # 注释
  if (!(v.startsWith('"') || v.startsWith("'"))) {
    const hash = v.search(/\s+#/);
    if (hash >= 0) v = v.slice(0, hash).trim();
  }

  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    const inner = v.slice(1, -1);
    // 仅还原常见转义，不 eval
    return inner.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return v;
}

/** 写入 .env 时安全转义（含空格/特殊字符则加双引号） */
function formatEnvValue(value: string): string {
  if (/[\s#"'$\\]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** 仅允许安全的环境变量名 */
function isSafeEnvKey(key: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(key);
}

/**
 * 从 .env.local 实时读取某个键（改完立刻生效，不依赖重启 Next）
 * 读失败则回退 process.env
 */
export function readEnvLocalValue(key: string): string | null {
  if (!isSafeEnvKey(key)) return null;
  try {
    if (!existsSync(ENV_LOCAL)) {
      const fallback = process.env[key];
      return fallback && fallback.length > 0 ? fallback : null;
    }
    const text = readFileSync(ENV_LOCAL, "utf8");
    const lines = text.split(/\r?\n/);
    // 从后往前找，后写覆盖先写
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const k = line.slice(0, eq).trim();
      if (k !== key) continue;
      const val = parseEnvValue(line.slice(eq + 1));
      return val.length > 0 ? val : null;
    }
  } catch {
    // 读文件失败则用内存环境变量
  }
  const fallback = process.env[key];
  return fallback && fallback.length > 0 ? fallback : null;
}

/**
 * 更新 .env.local 中某一键；不存在则追加
 * 同时同步 process.env，保证当前进程立刻可用
 */
export function writeEnvLocalValue(key: string, value: string): void {
  if (!isSafeEnvKey(key)) {
    throw new Error("非法环境变量名");
  }
  // 禁止换行写入，防止 .env 注入多行恶意配置
  if (/[\r\n\0]/.test(value)) {
    throw new Error("值不能包含换行或空字符");
  }
  if (value.length > 512) {
    throw new Error("值过长");
  }

  const line = `${key}=${formatEnvValue(value)}`;
  let text = "";
  if (existsSync(ENV_LOCAL)) {
    text = readFileSync(ENV_LOCAL, "utf8");
  }

  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(text)) {
    text = text.replace(re, line);
  } else {
    const trimmed = text.replace(/\s+$/, "");
    text = trimmed ? `${trimmed}\n\n${line}\n` : `${line}\n`;
  }

  writeFileSync(ENV_LOCAL, text, "utf8");
  process.env[key] = value;
}

/** 新密码格式校验，返回错误文案或 null */
export function validateNewPassword(password: string): string | null {
  if (typeof password !== "string") return "密码无效";
  if (password.length < 6) return "新密码至少 6 位";
  if (password.length > 128) return "新密码最多 128 位";
  if (/[\r\n\0]/.test(password)) return "密码不能包含换行";
  // 避免极端控制字符
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(password)) {
    return "密码包含非法字符";
  }
  return null;
}
