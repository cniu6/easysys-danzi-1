"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { PhotoGrid } from "@/components/PhotoGrid";
import type { SiteContent } from "@/types/content";

export function PhotosPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const page = content.pages.photos;

  return (
    <>
      <div className="page-hero">
        <p className="eyebrow">{t(content.ui.explore, lang)}</p>
        <h1>{t(page.title, lang)}</h1>
        <p>{t(page.content, lang)}</p>
      </div>
      <PhotoGrid items={content.gallery} content={content} showHeader={false} />
    </>
  );
}
