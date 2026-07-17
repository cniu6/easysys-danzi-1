"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { I18nText } from "@/types/content";

export type ZoomLightboxItem = {
  src: string;
  /** image=图片；video=本地视频；embed=YouTube/Vimeo 等 iframe */
  type: "image" | "video" | "embed";
  poster?: string;
  label?: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.35;

const HINT_IMAGE: I18nText = {
  zh: "滚轮缩放 · 双击放大/还原 · 放大后可拖拽 · ← → 切换 · Esc 关闭",
  en: "Scroll to zoom · Double-click to zoom/reset · Drag when zoomed · ← → · Esc",
  fr: "Molette pour zoomer · Double-clic zoom/réinit. · Glisser si zoomé · ← → · Échap",
};

const HINT_VIDEO: I18nText = {
  zh: "滚轮缩放 · 双击放大/还原 · 放大后可拖拽 · ← → 切换 · Esc 关闭",
  en: "Scroll to zoom · Double-click to zoom/reset · Drag when zoomed · ← → · Esc",
  fr: "Molette pour zoomer · Double-clic zoom/réinit. · Glisser si zoomé · ← → · Échap",
};

const HINT_EMBED: I18nText = {
  zh: "← → 切换 · Esc 关闭",
  en: "← → to switch · Esc to close",
  fr: "← → pour changer · Échap pour fermer",
};

const CLOSE_LABEL: I18nText = {
  zh: "关闭",
  en: "Close",
  fr: "Fermer",
};

/**
 * 通用灯箱：左右切换 + 图片/视频放大缩小拖拽 + 本地视频 / 外链嵌入播放
 */
export function ZoomLightbox({
  items,
  index,
  onClose,
  onIndex,
}: {
  items: ZoomLightboxItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const { lang, ready } = useLang();
  /** 后台无 LanguageProvider 时 ready=false，提示用中文 */
  const uiLang = ready ? lang : "zh";
  const item = items[index];
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
  }, [index, item?.src, resetView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && items.length > 1) {
        onIndex((index + 1) % items.length);
      }
      if (e.key === "ArrowLeft" && items.length > 1) {
        onIndex((index - 1 + items.length) % items.length);
      }
      // 嵌入页不支持缩放快捷键
      if (item?.type === "embed") return;
      if (e.key === "+" || e.key === "=") {
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      }
      if (e.key === "-" || e.key === "_") {
        setZoom((z) => {
          const next = Math.max(MIN_ZOOM, z - ZOOM_STEP);
          if (next <= 1) setOffset({ x: 0, y: 0 });
          return next;
        });
      }
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndex, resetView, item?.type]);

  // 打开时锁滚动，避免背景跟着滚
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!item) return null;

  const canZoom = item.type === "image" || item.type === "video";
  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () =>
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });

  const mediaStyle =
    canZoom
      ? {
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          cursor: zoom > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
        }
      : undefined;

  const onMediaDoubleClick = () => {
    if (!canZoom) return;
    if (zoom > 1) resetView();
    else setZoom(2);
  };

  const onMediaPointerDown = (e: ReactPointerEvent) => {
    if (!canZoom) return;
    // 点在视频控件条上时不拦截，留给原生控制条
    if (item.type === "video") {
      const el = e.target as HTMLElement;
      if (el.tagName === "VIDEO") {
        const rect = el.getBoundingClientRect();
        // 底部约 48px 为控件区，避免拖拽抢占
        if (e.clientY > rect.bottom - 48) return;
      }
    }
    if (zoom <= 1) {
      zoomIn();
      return;
    }
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMediaPointerMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };

  const onMediaPointerUp = (e: ReactPointerEvent) => {
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const typeTag =
    item.type === "video" ? " · VIDEO" : item.type === "embed" ? " · EMBED" : "";

  const hint =
    item.type === "image" ? HINT_IMAGE : item.type === "video" ? HINT_VIDEO : HINT_EMBED;

  return (
    <div className="zoom-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`zoom-lightbox-inner ${item.type !== "image" ? "is-media" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zoom-lb-bar">
          <div className="zoom-lb-info">
            <strong>
              {item.label || item.src.split("/").pop() || "预览"}
              {typeTag}
            </strong>
            <span>
              {index + 1} / {items.length}
              {canZoom ? ` · ${Math.round(zoom * 100)}%` : ""}
            </span>
          </div>
          <div className="zoom-lb-actions">
            {canZoom ? (
              <>
                <button type="button" className="fm-lb-btn" onClick={zoomOut} title="-">
                  −
                </button>
                <button type="button" className="fm-lb-btn" onClick={resetView} title="0">
                  {Math.round(zoom * 100)}%
                </button>
                <button type="button" className="fm-lb-btn" onClick={zoomIn} title="+">
                  +
                </button>
              </>
            ) : null}
            <button type="button" className="fm-lb-btn fm-lb-btn-close" onClick={onClose}>
              {t(CLOSE_LABEL, uiLang)}
            </button>
          </div>
        </div>

        {items.length > 1 ? (
          <>
            <button
              type="button"
              className="zoom-lb-nav prev"
              aria-label="prev"
              onClick={() => onIndex((index - 1 + items.length) % items.length)}
            >
              ‹
            </button>
            <button
              type="button"
              className="zoom-lb-nav next"
              aria-label="next"
              onClick={() => onIndex((index + 1) % items.length)}
            >
              ›
            </button>
          </>
        ) : null}

        <div
          className={`zoom-lb-body ${canZoom && zoom > 1 ? "is-zoomed" : ""}`}
          onWheel={(e) => {
            if (!canZoom) return;
            e.preventDefault();
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
          }}
        >
          {item.type === "embed" ? (
            <iframe
              key={item.src}
              src={item.src}
              title={item.label || "embed"}
              className="zoom-lb-embed"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : item.type === "video" ? (
            <video
              key={item.src}
              src={item.src}
              poster={item.poster}
              controls
              autoPlay
              playsInline
              className="zoom-lb-video"
              draggable={false}
              style={mediaStyle}
              onDoubleClick={onMediaDoubleClick}
              onPointerDown={onMediaPointerDown}
              onPointerMove={onMediaPointerMove}
              onPointerUp={onMediaPointerUp}
              onPointerCancel={() => {
                dragging.current = false;
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt=""
              className="zoom-lb-img"
              draggable={false}
              style={mediaStyle}
              onDoubleClick={onMediaDoubleClick}
              onPointerDown={onMediaPointerDown}
              onPointerMove={onMediaPointerMove}
              onPointerUp={onMediaPointerUp}
              onPointerCancel={() => {
                dragging.current = false;
              }}
            />
          )}
        </div>

        <p className="zoom-lb-hint">{t(hint, uiLang)}</p>
      </div>
    </div>
  );
}
