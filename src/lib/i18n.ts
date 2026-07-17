import type { Lang } from "@/types/content";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "fr", label: "FRANÇAIS" },
];

const STORAGE_KEY = "site_lang";

/** 按当前语言取文案 */
export function t(text: { zh: string; en: string; fr: string } | undefined, lang: Lang): string {
  if (!text) return "";
  return text[lang] || text.zh || text.en || "";
}

/** 是否为支持的语言 */
export function isLang(v: string | null | undefined): v is Lang {
  return v === "zh" || v === "en" || v === "fr";
}

/**
 * 浏览器语言 → zh / fr / en
 * 没有、或其它语言 → english
 */
export function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const list = [...(navigator.languages || []), navigator.language || ""]
    .filter(Boolean)
    .map((x) => x.toLowerCase());

  for (const code of list) {
    if (code.startsWith("zh")) return "zh";
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("en")) return "en";
  }
  return "en";
}

/** 读 localStorage；无效则返回 null */
export function getStoredLang(): Lang | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

/** 写入 localStorage */
export function setStoredLang(lang: Lang) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // 隐私模式等写失败时忽略
  }
}

/**
 * 最终语言优先级：
 * 1. localStorage 已选语言
 * 2. 浏览器语言（仅 zh/fr/en）
 * 3. 其它 → en
 */
export function resolveInitialLang(): Lang {
  return getStoredLang() ?? detectBrowserLang();
}

export { STORAGE_KEY };
