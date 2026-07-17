"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { VideoGrid } from "@/components/VideoGrid";
import type { SiteContent } from "@/types/content";

export function VideosPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const page = content.pages.videos;

  if (page.enabled === false) {
    return (
      <div className="page-hero">
        <h1>{t(page.title, lang)}</h1>
        <p>
          {lang === "zh"
            ? "视频页面暂未开放"
            : lang === "fr"
              ? "La page vidéos est temporairement fermée"
              : "Videos page is currently disabled"}
        </p>
      </div>
    );
  }

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
