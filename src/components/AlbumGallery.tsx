"use client";

import { useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import { ZoomLightbox } from "@/components/ZoomLightbox";
import { normalizeAlbumMedia } from "@/lib/media";
import type { Album } from "@/types/content";

/** 图库列表页（参考 MONO /fr/paris），支持图片 + 视频 + 灯箱缩放 */
export function AlbumGallery({ album }: { album: Album }) {
  const { lang } = useLang();
  const items = normalizeAlbumMedia(album);
  const [lb, setLb] = useState<number | null>(null);

  const lbItems = items.map((m) => ({
    src: m.src,
    type: m.type as "image" | "video",
    poster: m.poster,
    label: m.src.split("/").pop(),
  }));

  return (
    <>
      <div className="page-hero">
        <p className="eyebrow">{t(album.subtitle, lang)}</p>
        <h1>{t(album.title, lang)}</h1>
      </div>
      <section className="section album-section">
        <div className="album-masonry">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              className={`album-item ${m.type === "video" ? "is-video" : ""}`}
              onClick={() => setLb(i)}
            >
              {m.type === "video" ? (
                <>
                  {m.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.poster} alt="" loading="lazy" />
                  ) : (
                    <video src={m.src} muted playsInline preload="metadata" />
                  )}
                  <span className="album-video-badge">▶ VIDEO</span>
                </>
              ) : (
                <LazyImage src={m.src} alt="" />
              )}
            </button>
          ))}
        </div>
      </section>

      {lb !== null && lbItems.length ? (
        <ZoomLightbox
          items={lbItems}
          index={lb}
          onClose={() => setLb(null)}
          onIndex={setLb}
        />
      ) : null}
    </>
  );
}
