"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { ServiceGrid } from "@/components/ServiceGrid";
import type { SiteContent } from "@/types/content";

export function ServicesPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const page = content.pages.services;

  return (
    <>
      <div className="page-hero">
        <p className="eyebrow">{t(content.ui.explore, lang)}</p>
        <h1>{t(page.title, lang)}</h1>
        <p>{t(page.content, lang)}</p>
      </div>
      <ServiceGrid items={content.services} content={content} showHeader={false} />
    </>
  );
}
