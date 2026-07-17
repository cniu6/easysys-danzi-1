"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { I18nText } from "@/types/content";

export type ZoomLightboxItem = {
  src: string;
  type: "image" | "video";
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
 * 通用灯箱：左右切换 + 图片放大/缩小/拖拽 + 视频播放
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
  }, [index, items.length, onClose, onIndex, resetView]);

  if (!item) return null;

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut = () =>
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2));
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });

  return (
    <div className="zoom-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="zoom-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <div className="zoom-lb-bar">
          <div className="zoom-lb-info">
            <strong>
              {item.label || item.src.split("/").pop() || "预览"}
              {item.type === "video" ? " · VIDEO" : ""}
            </strong>
            <span>
              {index + 1} / {items.length}
              {item.type === "image" ? ` · ${Math.round(zoom * 100)}%` : ""}
            </span>
          </div>
          <div className="zoom-lb-actions">
            {item.type === "image" ? (
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
          className={`zoom-lb-body ${item.type === "image" && zoom > 1 ? "is-zoomed" : ""}`}
          onWheel={(e) => {
            if (item.type !== "image") return;
            e.preventDefault();
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
          }}
        >
          {item.type === "video" ? (
            <video
              key={item.src}
              src={item.src}
              poster={item.poster}
              controls
              autoPlay
              playsInline
              className="zoom-lb-video"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt=""
              className="zoom-lb-img"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                cursor: zoom > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
              }}
              onDoubleClick={() => {
                if (zoom > 1) resetView();
                else setZoom(2);
              }}
              onPointerDown={(e) => {
                if (zoom <= 1) {
                  zoomIn();
                  return;
                }
                dragging.current = true;
                last.current = { x: e.clientX, y: e.clientY };
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!dragging.current) return;
                const dx = e.clientX - last.current.x;
                const dy = e.clientY - last.current.y;
                last.current = { x: e.clientX, y: e.clientY };
                setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
              }}
              onPointerUp={(e) => {
                dragging.current = false;
                try {
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerCancel={() => {
                dragging.current = false;
              }}
            />
          )}
        </div>

        <p className="zoom-lb-hint">
          {t(item.type === "image" ? HINT_IMAGE : HINT_VIDEO, uiLang)}
        </p>
      </div>
    </div>
  );
}
