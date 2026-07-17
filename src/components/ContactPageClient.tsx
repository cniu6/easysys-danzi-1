"use client";

import { useLang } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";
import type { SiteContent, SocialLink } from "@/types/content";

function visibleSocials(list: SocialLink[] = []) {
  return list.filter((s) => {
    const u = (s.url || "").trim();
    return u && u !== "#" && u !== "/";
  });
}

export function ContactPageClient({ content }: { content: SiteContent }) {
  const { lang } = useLang();
  const c = content.contact;
  const socials = visibleSocials(c.socials);
  const email = t(c.email, lang);
  const phone = t(c.phone, lang);
  const phoneCn = t(c.phoneCn, lang);
  const wechat = t(c.wechat, lang);

  return (
    <>
      <div className="page-hero">
        <h1>{t(content.pages.contact.title, lang)}</h1>
        <p>{t(c.note, lang)}</p>
      </div>
      <div className="contact-panel">
        <div className="contact-card">
          <p>
            <strong>{t(c.addressLabel, lang)}</strong>
            <br />
            {t(c.address, lang)}
          </p>
          {email ? (
            <p>
              <strong>{t(c.emailLabel, lang)}</strong>
              <br />
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          ) : null}
          {phone ? (
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
