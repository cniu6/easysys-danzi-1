"use client";

import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import type { GalleryItem, SiteContent } from "@/types/content";

export function PhotoGrid({
  items,
  content,
  limit,
  showHeader = true,
}: {
  items: GalleryItem[];
  content: SiteContent;
  limit?: number;
  showHeader?: boolean;
}) {
  const { lang } = useLang();
  const list = [...items]
    .sort((a, b) => a.order - b.order)
    .slice(0, limit ?? items.length);

  return (
    <section className="section photo-section">
      {showHeader ? (
        <div className="section-head">
          <p className="eyebrow">{t(content.ui.explore, lang)}</p>
          <h2>{t(content.home.portfolioTitle, lang)}</h2>
          <p className="section-desc">{t(content.home.portfolioContent, lang)}</p>
        </div>
      ) : null}

      <div className="photo-grid">
        {list.map((item) => (
          <article key={item.id} className="photo-card">
            <div className="photo-frame">
              <LazyImage src={item.image} alt={t(item.title, lang)} />
            </div>
            <div className="photo-meta">
              <span>{t(item.title, lang)}</span>
              <h3>{t(item.category, lang)}</h3>
            </div>
            <Link href={item.href || "/gallery/paris"} className="btn-discover">
              {t(content.ui.discover, lang)}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
