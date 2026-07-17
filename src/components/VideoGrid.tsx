"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import type { SiteContent, VideoItem } from "@/types/content";

function embedUrl(item: VideoItem): string | null {
  if (item.type === "youtube") return `https://www.youtube.com/embed/${item.src}`;
  if (item.type === "vimeo") return `https://player.vimeo.com/video/${item.src}`;
  return null;
}

function VideoCard({
  item,
  content,
  lang,
}: {
  item: VideoItem;
  content: SiteContent;
  lang: "zh" | "en" | "fr";
}) {
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "240px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const embed = embedUrl(item);

  return (
    <article ref={wrapRef} className="video-card">
      <div className="video-frame">
        {playing && embed ? (
          <iframe
            src={`${embed}?autoplay=1`}
            title={t(item.title, lang)}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : playing && item.type === "file" ? (
          <video src={item.src} controls autoPlay playsInline preload="metadata" />
        ) : (
          <button
            type="button"
            className="video-cover"
            onClick={() => setPlaying(true)}
            aria-label={t(item.title, lang)}
          >
            {inView ? <LazyImage src={item.cover} alt="" /> : <span className="lazy-placeholder" />}
            <span className="play-btn" aria-hidden>
              ▶
            </span>
          </button>
        )}
      </div>
      <div className="video-meta">
        <h3>{t(item.title, lang)}</h3>
        <p>{t(item.description, lang)}</p>
        {item.href ? (
          <div style={{ marginTop: "0.85rem" }}>
            <Link href={item.href} className="btn-discover">
              {t(content.ui.discover, lang)}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function VideoGrid({
  items,
  content,
  limit,
  showHeader = true,
}: {
  items: VideoItem[];
  content: SiteContent;
  limit?: number;
  showHeader?: boolean;
}) {
  const { lang } = useLang();
  const list = [...items]
    .sort((a, b) => a.order - b.order)
    .slice(0, limit ?? items.length);

  return (
    <section className="section video-section">
      {showHeader ? (
        <div className="section-head">
          <p className="eyebrow">{t(content.ui.explore, lang)}</p>
          <h2>{t(content.home.videosTitle, lang)}</h2>
          <p className="section-desc">{t(content.home.videosContent, lang)}</p>
        </div>
      ) : null}

      <div className="video-grid">
        {list.map((item) => (
          <VideoCard key={item.id} item={item} content={content} lang={lang} />
        ))}
      </div>

      {limit && items.length > limit ? (
        <div className="section-more">
          <Link href={list[0]?.href || "/gallery/paris"} className="btn-discover">
            {t(content.ui.discover, lang)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
