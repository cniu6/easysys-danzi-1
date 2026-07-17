"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** 根边距，提前多少开始加载 */
  rootMargin?: string;
};

/**
 * 图片懒加载：进入视口附近才真正请求 src
 * 兼容原生 loading="lazy"，并加 IntersectionObserver 做占位切换
 */
export function LazyImage({
  src,
  alt = "",
  className,
  rootMargin = "200px 0px",
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 不支持 IO 时直接显示
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={visible ? src : undefined}
      data-src={src}
      alt={alt}
      className={`lazy-img ${loaded ? "is-loaded" : ""} ${className || ""}`}
      style={style}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      {...rest}
    />
  );
}
