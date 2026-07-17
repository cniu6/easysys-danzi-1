"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { LazyImage } from "@/components/LazyImage";
import type { Album } from "@/types/content";

/** 图库列表页（参考 MONO /fr/paris） */
export function AlbumGallery({ album }: { album: Album }) {
  const { lang } = useLang();

  return (
    <>
      <div className="page-hero">
        <p className="eyebrow">{t(album.subtitle, lang)}</p>
        <h1>{t(album.title, lang)}</h1>
      </div>
      <section className="section album-section">
        <div className="album-masonry">
          {album.images.map((src, i) => (
            <div key={`${src}-${i}`} className="album-item">
              <LazyImage src={src} alt="" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
