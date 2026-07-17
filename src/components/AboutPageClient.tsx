"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { AboutPageData, SiteContent } from "@/types/content";

/** 关于页：简介 + 大图 + 选择理由 + 诚招贤士（对齐 MONO About 结构） */
export function AboutPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const page = content.pages.about as AboutPageData;

  if (page.enabled === false) {
    return (
      <div className="page-hero">
        <h1>{t(page.title, lang)}</h1>
        <p>
          {lang === "zh"
            ? "关于页面暂未开放"
            : lang === "fr"
              ? "La page À propos est temporairement fermée"
              : "About page is currently disabled"}
        </p>
      </div>
    );
  }

  const reasons = [...(page.reasons || [])].sort((a, b) => a.order - b.order);

  // 正文按空行拆成段落
  const paragraphs = t(page.content, lang)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="about-page">
      <section className="about-intro section">
        <p className="about-greeting">{t(page.greeting || content.ui.explore, lang)}</p>
        <h1 className="about-title">{t(page.title, lang)}</h1>
        <div className="about-prose">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {page.heroImage ? (
        <section className="about-hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.heroImage} alt="" />
        </section>
      ) : null}

      <section className="about-why section">
        <h2 className="about-section-title">{t(page.whyTitle, lang)}</h2>
        <div className="about-reasons">
          {reasons.map((r) => (
            <article key={r.id} className="about-reason">
              <h3>{t(r.title, lang)}</h3>
              <p>{t(r.content, lang)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-join section">
        <h2 className="about-section-title">{t(page.joinTitle, lang)}</h2>
        <div className="about-prose">
          {t(page.joinContent, lang)
            .split(/\n+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
        <p className="about-positions">{t(page.joinPositions, lang)}</p>
        {page.joinEmail ? (
          <p className="about-email">
            {lang === "zh"
              ? "请将简历发送至该邮箱："
              : lang === "fr"
                ? "Envoyez votre CV à : "
                : "Please send your resume to: "}
            <a href={`mailto:${page.joinEmail}`}>{page.joinEmail}</a>
          </p>
        ) : null}
      </section>
    </div>
  );
}
