"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import { hasText, visibleSocials } from "@/lib/contact";
import type { SiteContent } from "@/types/content";

export function ContactPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const c = content.contact;
  const socials = visibleSocials(c.socials);
  const address = t(c.address, lang).trim();
  const email = t(c.email, lang).trim();
  const phone = t(c.phone, lang).trim();
  const phoneCn = t(c.phoneCn, lang).trim();
  const wechat = t(c.wechat, lang).trim();
  const note = t(c.note, lang).trim();

  return (
    <>
      <div className="page-hero">
        <h1>{t(content.pages.contact.title, lang)}</h1>
        {note ? <p>{note}</p> : null}
      </div>
      <div className="contact-panel">
        <div className="contact-card">
          {hasText(c.address, lang) ? (
            <p>
              {/* 标签文案保留在 CMS；值为空整行不显示 */}
              <strong>{t(c.addressLabel, lang)}</strong>
              <br />
              {address}
            </p>
          ) : null}
          {hasText(c.email, lang) ? (
            <p>
              <strong>{t(c.emailLabel, lang)}</strong>
              <br />
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          ) : null}
          {hasText(c.phone, lang) ? (
            <p>
              <strong>{t(c.phoneLabel, lang)}</strong>
              <br />
              {phone}
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
    </>
  );
}
