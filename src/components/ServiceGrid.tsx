"use client";

import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import type { ServiceItem, SiteContent } from "@/types/content";

export function ServiceGrid({
  items,
  content,
  showHeader = true,
}: {
  items: ServiceItem[];
  content: SiteContent;
  showHeader?: boolean;
}) {
  const { lang } = useLang();
  const list = [...items].sort((a, b) => a.order - b.order);

  return (
    <section className="section service-section">
      {showHeader ? (
        <div className="section-head">
          <p className="eyebrow">{t(content.ui.explore, lang)}</p>
          <h2>{t(content.home.servicesTitle, lang)}</h2>
          <p className="section-desc">{t(content.home.servicesContent, lang)}</p>
        </div>
      ) : null}

      <div className="service-grid">
        {list.map((item) => (
          <article key={item.id} className="service-card">
            <div className="service-media">
              <LazyImage src={item.image} alt={t(item.title, lang)} />
            </div>
            <div className="service-body">
              <p className="service-eyebrow">{t(content.ui.explore, lang)}</p>
              <h3>{t(item.title, lang)}</h3>
              <p>{t(item.description, lang)}</p>
              <Link href={item.href || "/gallery/paris"} className="btn-discover">
                {t(content.ui.discover, lang)}
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
