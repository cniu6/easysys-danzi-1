"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { SiteContent, VideoItem } from "@/types/content";
import { ZoomLightbox, type ZoomLightboxItem } from "@/components/ZoomLightbox";

function embedUrl(item: VideoItem): string | null {
  if (item.type === "youtube") return `https://www.youtube.com/embed/${item.src}`;
  if (item.type === "vimeo") return `https://player.vimeo.com/video/${item.src}`;
  return null;
}

/** 把 VideoItem 转成灯箱条目（本地视频 / 外链嵌入） */
function toLightboxItem(item: VideoItem, lang: "zh" | "en" | "fr"): ZoomLightboxItem | null {
  const label = t(item.title, lang);
  const cover = (item.cover || "").trim() || undefined;
  if (item.type === "file" && item.src) {
    return { src: item.src, type: "video", poster: cover, label };
  }
  const embed = embedUrl(item);
  if (embed) {
    return {
      src: `${embed}?autoplay=1&rel=0`,
      type: "embed",
      poster: cover,
      label,
    };
  }
  return null;
}

/**
 * 视频卡片：封面预览，点击后开灯箱放大播放
 * - 本地文件：用视频首帧当封面
 * - YouTube/Vimeo：用封面图（可选）
 */
function VideoCard({
  item,
  content,
  lang,
  onOpen,
}: {
  item: VideoItem;
  content: SiteContent;
  lang: "zh" | "en" | "fr";
  onOpen: () => void;
}) {
  const [coverReady, setCoverReady] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const embed = embedUrl(item);
  const coverSrc = (item.cover || "").trim();
  const hasFile = item.type === "file" && !!item.src;
  const canPlay = !!embed || hasFile;
  /** 本地视频一律用视频首帧当封面，不再依赖另传封面图 */
  const useVideoPoster = hasFile;

  return (
    <article className="video-card">
      <div className="video-frame">
        <button
          type="button"
          className="video-cover"
          onClick={() => {
            if (!canPlay) return;
            onOpen();
          }}
          aria-label={
            canPlay
              ? `预览 ${t(item.title, lang)}`
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
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const list = [...items]
    .sort((a, b) => a.order - b.order)
    .slice(0, limit ?? items.length);

  // 可预览条目与灯箱 items 对齐（跳过无法播放的）
  const playable = list
    .map((item) => ({ item, lb: toLightboxItem(item, lang) }))
    .filter((x): x is { item: VideoItem; lb: ZoomLightboxItem } => !!x.lb);

  const lbItems = playable.map((x) => x.lb);

  const openItem = (id: string) => {
    const i = playable.findIndex((x) => x.item.id === id);
    if (i >= 0) setLbIndex(i);
  };

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
            onOpen={() => openItem(item.id)}
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

      {lbIndex !== null && lbItems.length > 0 ? (
        <ZoomLightbox
          items={lbItems}
          index={Math.min(lbIndex, lbItems.length - 1)}
          onClose={() => setLbIndex(null)}
          onIndex={setLbIndex}
        />
      ) : null}
    </section>
  );
}
