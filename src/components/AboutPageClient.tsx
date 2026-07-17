"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import type { SiteContent } from "@/types/content";

export function AboutPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const page = content.pages.about;

  return (
    <>
      <div className="page-hero">
        <p className="eyebrow">{t(content.brand, lang)}</p>
        <h1>{t(page.title, lang)}</h1>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <p className="prose-block">{t(page.content, lang)}</p>
        {page.media?.length ? (
          <div className="publicity-grid" style={{ marginTop: "2rem" }}>
            {page.media
              .filter((m) => m.type === "image" && m.src)
              .map((m) => (
                <LazyImage key={m.id} src={m.src} alt="" />
              ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
