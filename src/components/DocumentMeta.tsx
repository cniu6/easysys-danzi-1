"use client";

import { useEffect } from "react";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { SiteContent } from "@/types/content";

/** 随语言切换同步 document title / meta description */
export function DocumentMeta({ content }: { content: SiteContent }) {
  const { lang, ready } = useLang();

  useEffect(() => {
    if (!ready || !content.meta) return;
    document.title = t(content.meta.title, lang);

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", t(content.meta.description, lang));
    document.documentElement.lang = lang;
  }, [content.meta, lang, ready]);

  return null;
}
