"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * 顶部路由切换进度条（黑底白条 / 白底黑条，随页面主题）
 * - 点击站内链接时开始动画
 * - pathname 变化后收尾消失
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath = useRef(pathname);
  const navigating = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    navigating.current = true;
    setFading(false);
    setVisible(true);
    setWidth(12);
    // 缓缓爬到约 82%，等路由完成再冲到 100%
    timerRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 82) return w;
        const step = w < 40 ? 8 : w < 65 ? 3.5 : 1.2;
        return Math.min(82, w + step);
      });
    }, 180);
  }, [clearTimers]);

  const finish = useCallback(() => {
    clearTimers();
    navigating.current = false;
    setWidth(100);
    setFading(true);
    doneTimerRef.current = setTimeout(() => {
      setVisible(false);
      setFading(false);
      setWidth(0);
    }, 280);
  }, [clearTimers]);

  // 路由切换：滚动到顶部 + 收尾进度条
  //（顶栏 fixed 时 Next 可能跳过自动滚顶，这里手动补上）
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    html.style.scrollBehavior = prev;

    if (navigating.current || visible) finish();
  }, [pathname, finish, visible]);

  // 拦截站内链接点击 / 前进后退
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // 同路径不触发（仅 hash 变化等）
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      start();
    };

    const onPopState = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
  }, [start, clearTimers]);

  if (!visible && width === 0) return null;

  return (
    <div
      className={`route-progress ${fading ? "is-done" : ""}`}
      role="progressbar"
      aria-hidden="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
    >
      <div className="route-progress-bar" style={{ width: `${width}%` }} />
    </div>
  );
}
