"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { SiteContent, VideoItem } from "@/types/content";

function embedUrl(item: VideoItem): string | null {
  if (item.type === "youtube") return `https://www.youtube.com/embed/${item.src}`;
  if (item.type === "vimeo") return `https://player.vimeo.com/video/${item.src}`;
  return null;
}

/**
 * 视频卡片：
 * - 本地文件：未播放时直接用视频首帧当封面（不必另传封面图）
 * - YouTube/Vimeo：用封面图（可选）
 * - 点击后才真正播放
 */
function VideoCard({
  item,
  content,
  lang,
  activeId,
  onActivate,
}: {
  item: VideoItem;
  content: SiteContent;
  lang: "zh" | "en" | "fr";
  activeId: string | null;
  onActivate: (id: string | null) => void;
}) {
  const playing = activeId === item.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLElement>(null);
  const [coverReady, setCoverReady] = useState(false);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // 自动播放被拦时仍保留控件
        });
      }
    } else {
      el.pause();
    }
  }, [playing]);

  const embed = embedUrl(item);
  const coverSrc = (item.cover || "").trim();
  const hasFile = item.type === "file" && !!item.src;
  const canPlay = !!embed || hasFile;
  /** 本地视频一律用视频首帧当封面，不再依赖另传封面图 */
  const useVideoPoster = hasFile;

  return (
    <article ref={wrapRef} className={`video-card ${playing ? "is-playing" : ""}`}>
      <div className="video-frame">
        {playing && embed ? (
          <>
            <iframe
              src={`${embed}?autoplay=1&rel=0`}
              title={t(item.title, lang)}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
            <button
              type="button"
              className="video-close"
              aria-label="关闭视频"
              onClick={() => onActivate(null)}
            >
              ×
            </button>
          </>
        ) : playing && hasFile ? (
          <>
            <video
              ref={videoRef}
              className="video-player"
              src={item.src}
              poster={coverSrc || undefined}
              controls
              playsInline
              preload="auto"
              onEnded={() => onActivate(null)}
            />
            <button
              type="button"
              className="video-close"
              aria-label="关闭视频"
              onClick={() => onActivate(null)}
            >
              ×
            </button>
          </>
        ) : (
          <button
            type="button"
            className="video-cover"
            onClick={() => {
              if (!canPlay) return;
              onActivate(item.id);
            }}
            aria-label={
              canPlay
                ? `播放 ${t(item.title, lang)}`
                : `${t(item.title, lang)}（暂无视频文件）`
            }
            disabled={!canPlay}
          >
            {useVideoPoster ? (
              <video
                className="video-cover-video"
                src={item.src}
                muted
                playsInline
                preload="metadata"
                // 定在开头附近，显示首帧
                onLoadedData={(e) => {
                  try {
                    e.currentTarget.currentTime = 0.1;
                  } catch {
                    // ignore
                  }
                }}
              />
            ) : coverSrc && !coverError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt=""
                loading="lazy"
                decoding="async"
                className={coverReady ? "is-ready" : ""}
                onLoad={() => setCoverReady(true)}
                onError={() => setCoverError(true)}
              />
            ) : (
              <span className="video-cover-fallback" />
            )}
            <span className="video-cover-dim" aria-hidden />
            {canPlay ? (
              <span className="play-btn" aria-hidden>
                ▶
              </span>
            ) : (
              <span className="video-need-upload">待上传成片</span>
            )}
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
  const [activeId, setActiveId] = useState<string | null>(null);
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
          <VideoCard
            key={item.id}
            item={item}
            content={content}
            lang={lang}
            activeId={activeId}
            onActivate={setActiveId}
          />
        ))}
      </div>

      {limit && items.length > limit ? (
        <div className="section-more">
          <Link href="/videos" className="btn-discover">
            {t(content.ui.discover, lang)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
