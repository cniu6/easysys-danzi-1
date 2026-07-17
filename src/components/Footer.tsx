"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { hasText, visibleSocials } from "@/lib/contact";
import type { SiteContent } from "@/types/content";

export function Footer({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const c = content.contact;
  const year = new Date().getFullYear();
  const socials = visibleSocials(c.socials);
  const email = t(c.email, lang).trim();
  const phone = t(c.phone, lang).trim();
  const phoneCn = t(c.phoneCn, lang).trim();
  const wechat = t(c.wechat, lang).trim();
  const address = t(c.address, lang).trim();

  return (
    <footer className="site-footer" id="contact">
      <div className="footer-inner">
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.logo || "/images/logo.png"}
            alt={t(content.brand, lang)}
            style={{ height: 48, margin: "0 auto 0.75rem" }}
          />
          <p>{t(content.tagline, lang)}</p>
        </div>
        <div className="footer-contact">
          <h3>{t(content.pages.contact.title, lang)}</h3>
          {hasText(c.address, lang) ? (
            <p>
              {t(c.addressLabel, lang)}：{address}
            </p>
          ) : null}
          {hasText(c.email, lang) ? (
            <p>
              {t(c.emailLabel, lang)}：
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          ) : null}
          {hasText(c.phone, lang) ? (
            <p>
              {t(c.phoneLabel, lang)}：{phone}
            </p>
          ) : null}
          {phoneCn ? <p>{phoneCn}</p> : null}
          {wechat ? <p>WeChat: {wechat}</p> : null}
          {socials.length ? (
            <div className="social-row">
              {socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  aria-label={t(s.label, lang)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={t(s.label, lang)} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="footer-copy">
        ©{year} {t(content.footer.brandLine, lang)}
        {content.footer.siret
          ? ` | ${t(content.footer.siretLabel, lang)}: ${content.footer.siret}`
          : ""}
      </div>
    </footer>
  );
}
