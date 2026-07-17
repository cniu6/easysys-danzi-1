"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { VideoGrid } from "@/components/VideoGrid";
import type { SiteContent } from "@/types/content";

export function VideosPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const page = content.pages.videos;

  return (
    <>
      <div className="page-hero">
        <p className="eyebrow">{t(content.ui.explore, lang)}</p>
        <h1>{t(page.title, lang)}</h1>
        <p>{t(page.content, lang)}</p>
      </div>
      <VideoGrid items={content.videos} content={content} showHeader={false} />
    </>
  );
}
