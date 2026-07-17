import type { I18nText, Lang, SocialLink } from "@/types/content";
import { t } from "@/lib/i18n";

/** 当前语言下是否有有效文案（去空白） */
export function hasText(text: I18nText | undefined, lang: Lang): boolean {
  return !!(t(text, lang) || "").trim();
}

/** 有效外链才展示社交图标 */
export function visibleSocials(list: SocialLink[] = []) {
  return list.filter((s) => {
    const u = (s.url || "").trim();
    return u && u !== "#" && u !== "/";
  });
}
