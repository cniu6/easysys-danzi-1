"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaItem, SiteContent } from "@/types/content";

/** 对齐 Paris MONO（Wix Slideshow OutIn）：约 5s 自动切，700ms 交叉淡入淡出 */
const INTERVAL_MS = 5000;

/** 首页 Hero：全屏轮播，左右按钮 + 圆点，柔和交叉淡入淡出 */
export function Hero({ content }: { content: SiteContent }) {
  const mode = content.home?.heroMode || "carousel";
  const slides = [...(content.home?.heroSlides || [])]
    .filter((s) => s.src)
    .sort((a, b) => a.order - b.order);

  if (!slides.length) {
    return <section className="hero hero-fullscreen hero-empty" />;
  }

  if (mode === "carousel" || slides.length > 1) {
    return <HeroCarousel slides={slides} />;
  }

  return (
    <section className="hero hero-fullscreen">
      <HeroMedia slide={slides[0]} eager />
      <div className="hero-veil" />
    </section>
  );
}

function HeroCarousel({ slides }: { slides: MediaItem[] }) {
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  idxRef.current = idx;

  const clearTimer = () => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  };

  const changeTo = (next: number) => {
    if (slides.length < 2) return;
    if (next === idxRef.current) return;
    setIdx(next);
  };

  const armTimer = () => {
    clearTimer();
    if (slides.length < 2) return;
    timer.current = setInterval(() => {
      const cur = idxRef.current;
      setIdx((cur + 1) % slides.length);
    }, INTERVAL_MS);
  };

  useEffect(() => {
    armTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  // 手动切换后重置自动播放计时
  const go = (next: number) => {
    changeTo(next);
    armTimer();
  };

  return (
    <section className="hero hero-fullscreen">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`hero-slide ${i === idx ? "is-active" : ""}`}
          aria-hidden={i !== idx}
        >
          <HeroMedia slide={slide} eager={i === 0 || Math.abs(i - idx) <= 1} />
        </div>
      ))}
      <div className="hero-veil" />

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            className="hero-nav hero-nav-prev"
            aria-label="上一张"
            onClick={() =>
              go((idxRef.current - 1 + slides.length) % slides.length)
            }
          >
            ‹
          </button>
          <button
            type="button"
            className="hero-nav hero-nav-next"
            aria-label="下一张"
            onClick={() => go((idxRef.current + 1) % slides.length)}
          >
            ›
          </button>
          <div className="hero-dots">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={i === idx ? "active" : ""}
                aria-label={`slide ${i + 1}`}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function HeroMedia({ slide, eager }: { slide: MediaItem; eager?: boolean }) {
  if (slide.type === "video") {
    return (
      <video
        className="hero-media"
        src={slide.src}
        poster={slide.poster}
        autoPlay
        muted
        loop
        playsInline
        preload={eager ? "auto" : "none"}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className="hero-media"
      src={slide.src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
