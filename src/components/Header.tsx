"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/context/LanguageContext";
import { LANGS, t } from "@/lib/i18n";
import type { SiteContent } from "@/types/content";

export function Header({ content }: { content: SiteContent }) {
  const { lang, setLang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === "/";
  // 首页顶部透明白字；滚动后或非首页 → 白底深色
  const overlay = isHome && !scrolled && !open;

  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const links = [
    { href: "/", label: content.nav.home },
    { href: "/services", label: content.nav.services },
    { href: "/photos", label: content.nav.photos },
    { href: "/videos", label: content.nav.videos },
    { href: "/contact", label: content.nav.contact },
  ];

  const logoSrc = overlay
    ? "/images/logo-white.png"
    : content.logo || "/images/logo.png";

  return (
    <header className={`site-header ${overlay ? "is-overlay" : "is-solid"}`}>
      <div className="header-inner">
        <Link href="/" className="brand-logo" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={t(content.brand, lang)} />
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
        </button>

        <nav className={`main-nav ${open ? "open" : ""}`}>
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {t(item.label, lang)}
            </Link>
          ))}
          <div className="lang-switch" aria-label="language">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                className={lang === l.code ? "active" : ""}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
