"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import type { SiteContent } from "@/types/content";

export function PublicityGrid({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const images = content.publicity || [];
  if (!images.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <p className="eyebrow">{t(content.ui.explore, lang)}</p>
        <h2>{t(content.home.publicityTitle, lang)}</h2>
        <p className="section-desc">{t(content.home.publicityContent, lang)}</p>
      </div>
      <div className="publicity-grid">
        {images.map((src) => (
          <LazyImage key={src} src={src} alt="" />
        ))}
      </div>
    </section>
  );
}
