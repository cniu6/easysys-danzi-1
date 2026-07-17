"use client";

import { useState } from "react";
import type {
  Album,
  GalleryItem,
  HeroMode,
  I18nText,
  Lang,
  MediaItem,
  SiteContent,
  VideoItem,
} from "@/types/content";
import { MediaField } from "./FileManager";
import { ZoomLightbox } from "@/components/ZoomLightbox";
import {
  makeAlbumMedia,
  normalizeAlbumMedia,
  syncAlbumMediaFields,
} from "@/lib/media";

export const emptyI18n = (): I18nText => ({ zh: "", en: "", fr: "" });
export const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

type Msg = { type: "ok" | "err"; text: string } | null;
type SetContent = (c: SiteContent) => void;

export function I18nFields({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: I18nText;
  onChange: (v: I18nText) => void;
  multiline?: boolean;
}) {
  const langs: { code: Lang; name: string }[] = [
    { code: "zh", name: "中文" },
    { code: "en", name: "EN" },
    { code: "fr", name: "FR" },
  ];
  return (
    <div className="admin-panel" style={{ padding: "0.85rem", marginBottom: "0.75rem" }}>
      <strong style={{ display: "block", marginBottom: "0.5rem" }}>{label}</strong>
      <div className="admin-row">
        {langs.map((l) => (
          <div className="admin-field" key={l.code}>
            <label>{l.name}</label>
            {multiline ? (
              <textarea
                value={value?.[l.code] || ""}
                onChange={(e) => onChange({ ...value, [l.code]: e.target.value })}
              />
            ) : (
              <input
                value={value?.[l.code] || ""}
                onChange={(e) => onChange({ ...value, [l.code]: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  const home = content.home;
  const slides = [...(home.heroSlides || [])].sort((a, b) => a.order - b.order);

  function setSlides(heroSlides: MediaItem[]) {
    setContent({ ...content, home: { ...home, heroSlides } });
  }

  return (
    <div>
      <div className="admin-panel">
        <h2>首页全屏轮播（Hero）</h2>
        <p className="admin-hint">
          对应前台首页最上方大图。轮播约 5 秒自动切换。单图/单视频只用列表第一张。
        </p>
        <div className="admin-field">
          <label>显示方式</label>
          <select
            value={home.heroMode}
            onChange={(e) =>
              setContent({
                ...content,
                home: { ...home, heroMode: e.target.value as HeroMode },
              })
            }
          >
            <option value="carousel">轮播图（推荐）</option>
            <option value="image">单图片</option>
            <option value="video">单视频</option>
          </select>
        </div>
      </div>

      {slides.map((s, i) => (
        <div className="admin-item" key={s.id}>
          <div className="admin-item-head">
            <strong>第 {i + 1} 张</strong>
            <button
              type="button"
              className="admin-btn danger"
              onClick={() => setSlides(home.heroSlides.filter((x) => x.id !== s.id))}
            >
              删除
            </button>
          </div>
          <div className="admin-field">
            <label>类型</label>
            <select
              value={s.type}
              onChange={(e) => {
                setSlides(
                  home.heroSlides.map((x) =>
                    x.id === s.id
                      ? { ...x, type: e.target.value as "image" | "video" }
                      : x
                  )
                );
              }}
            >
              <option value="image">图片</option>
              <option value="video">视频</option>
            </select>
          </div>
          <MediaField
            label="图片 / 视频"
            value={s.src}
            accept={s.type === "video" ? "video" : "image"}
            onChange={(src) =>
              setSlides(home.heroSlides.map((x) => (x.id === s.id ? { ...x, src } : x)))
            }
            onMsg={onMsg}
          />
          {s.type === "video" ? (
            <MediaField
              label="视频封面"
              value={s.poster || ""}
              accept="image"
              onChange={(poster) =>
                setSlides(
                  home.heroSlides.map((x) => (x.id === s.id ? { ...x, poster } : x))
                )
              }
              onMsg={onMsg}
            />
          ) : null}
        </div>
      ))}

      <button
        type="button"
        className="admin-btn"
        onClick={() =>
          setSlides([
            ...home.heroSlides,
            {
              id: uid("hero"),
              type: "image",
              src: "/images/hero/slide-01.jpg",
              order: home.heroSlides.length + 1,
            },
          ])
        }
      >
        + 添加一张
      </button>

      <div style={{ marginTop: "1.5rem" }}>
        <I18nFields
          label="首页「作品集」区块标题"
          value={home.portfolioTitle}
          onChange={(portfolioTitle) =>
            setContent({ ...content, home: { ...home, portfolioTitle } })
          }
        />
        <I18nFields
          label="首页「作品集」区块说明"
          value={home.portfolioContent}
          multiline
          onChange={(portfolioContent) =>
            setContent({ ...content, home: { ...home, portfolioContent } })
          }
        />
      </div>
    </div>
  );
}

export function AlbumsEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  const albums = content.albums || [];
  /** 当前打开的灯箱：哪个专辑、第几张 */
  const [lb, setLb] = useState<{ albumId: string; index: number } | null>(null);

  function update(id: string, patch: Partial<Album>) {
    setContent({
      ...content,
      albums: albums.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  }

  function setMedia(id: string, media: Album["media"]) {
    const synced = syncAlbumMediaFields(media || []);
    update(id, synced);
  }

  const lbAlbum = lb ? albums.find((a) => a.id === lb.albumId) : null;
  const lbItems = lbAlbum
    ? normalizeAlbumMedia(lbAlbum).map((m) => ({
        src: m.src,
        type: m.type as "image" | "video",
        poster: m.poster,
        label: m.src.split("/").pop(),
      }))
    : [];

  return (
    <div>
      <div className="admin-panel">
        <h2>图库专辑</h2>
        <p className="admin-hint">
          前台访问：/gallery/slug 。可添加<strong>图片和视频</strong>。短地址 aliases
          每行一个（如 paris）。缩略图点击可灯箱预览（支持放大缩小）。
        </p>
      </div>
      {albums.map((a) => {
        const media = normalizeAlbumMedia(a);
        return (
          <div className="admin-item" key={a.id}>
            <div className="admin-item-head">
              <strong>/gallery/{a.slug}</strong>
              <button
                type="button"
                className="admin-btn danger"
                onClick={() =>
                  setContent({ ...content, albums: albums.filter((x) => x.id !== a.id) })
                }
              >
                删除专辑
              </button>
            </div>
            <div className="admin-field">
              <label>主 slug（英文短名）</label>
              <input value={a.slug} onChange={(e) => update(a.id, { slug: e.target.value })} />
            </div>
            <div className="admin-field">
              <label>短地址 aliases（每行一个，不要写开头 /）</label>
              <textarea
                value={(a.aliases || []).join("\n")}
                placeholder={"paris\nstudio"}
                onChange={(e) =>
                  update(a.id, {
                    aliases: e.target.value
                      .split("\n")
                      .map((s) => s.trim().replace(/^\/+/, ""))
                      .filter(Boolean),
                  })
                }
              />
              <p className="admin-hint">
                可用：/gallery/{a.slug}
                {(a.aliases || []).map((x) => ` 、/${x}`).join("")}
              </p>
            </div>
            <I18nFields
              label="图库标题"
              value={a.title}
              onChange={(title) => update(a.id, { title })}
            />
            <I18nFields
              label="图库副标题"
              value={a.subtitle}
              onChange={(subtitle) => update(a.id, { subtitle })}
            />

            <div className="admin-field">
              <label>
                已添加媒体（{media.length}）· 点缩略图预览 · 点 × 移除
              </label>
              {media.length ? (
                <div className="album-admin-strip">
                  {media.map((m, i) => (
                    <div key={m.id} className="album-admin-chip">
                      <button
                        type="button"
                        className="album-admin-chip-main"
                        title="点击预览"
                        onClick={() => setLb({ albumId: a.id, index: i })}
                      >
                        {m.type === "video" ? (
                          <video src={m.src} muted playsInline preload="metadata" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.src} alt="" />
                        )}
                        <span className="fm-kind-tag">
                          {m.type === "video" ? "VIDEO" : "IMG"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="album-admin-chip-x"
                        aria-label="移除"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMedia(
                            a.id,
                            media
                              .filter((x) => x.id !== m.id)
                              .map((x, idx) => ({ ...x, order: idx + 1 }))
                          );
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-hint">还没有媒体，下面批量添加即可</p>
              )}

              <MediaField
                label="批量添加图片/视频"
                value=""
                accept="all"
                multiplePick
                pickerOnly
                onChange={() => {}}
                onPickMany={(urls) => {
                  const base = media.length;
                  const added = urls.map((src, i) => makeAlbumMedia(src, base + i + 1));
                  setMedia(a.id, [...media, ...added]);
                  onMsg({
                    type: "ok",
                    text: `已加入 ${urls.length} 个，记得保存`,
                  });
                }}
                onMsg={onMsg}
              />
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="admin-btn"
        onClick={() =>
          setContent({
            ...content,
            albums: [
              ...albums,
              {
                id: uid("album"),
                slug: `album-${albums.length + 1}`,
                aliases: [],
                enabled: true,
                title: emptyI18n(),
                subtitle: emptyI18n(),
                media: [],
                images: [],
              },
            ],
          })
        }
      >
        + 添加图库专辑
      </button>

      {lb && lbItems.length ? (
        <ZoomLightbox
          items={lbItems}
          index={Math.min(lb.index, lbItems.length - 1)}
          onClose={() => setLb(null)}
          onIndex={(i) => setLb({ ...lb, index: i })}
        />
      ) : null}
    </div>
  );
}

export function GalleryCardsEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  return (
    <div>
      <div className="admin-panel">
        <h2>首页作品入口卡片</h2>
        <p className="admin-hint">
          对应前台首页 Portfolio 三张大图卡片。「了解更多」跳转到图库路径，如 /gallery/paris
        </p>
      </div>
      {content.gallery.map((g, i) => (
        <div className="admin-item" key={g.id}>
          <div className="admin-item-head">
            <strong>卡片 {i + 1}</strong>
            <button
              type="button"
              className="admin-btn danger"
              onClick={() =>
                setContent({
                  ...content,
                  gallery: content.gallery.filter((x) => x.id !== g.id),
                })
              }
            >
              删除
            </button>
          </div>
          <MediaField
            label="封面图"
            value={g.image}
            accept="image"
            onChange={(image) => {
              const gallery = [...content.gallery];
              gallery[i] = { ...g, image };
              setContent({ ...content, gallery });
            }}
            onMsg={onMsg}
          />
          <div className="admin-field">
            <label>跳转链接 href</label>
            <input
              value={g.href || ""}
              placeholder="/gallery/paris"
              list="album-href-list"
              onChange={(e) => {
                const gallery = [...content.gallery];
                gallery[i] = { ...g, href: e.target.value };
                setContent({ ...content, gallery });
              }}
            />
          </div>
          <I18nFields
            label="标题"
            value={g.title}
            onChange={(title) => {
              const gallery = [...content.gallery];
              gallery[i] = { ...g, title };
              setContent({ ...content, gallery });
            }}
          />
          <I18nFields
            label="分类小字"
            value={g.category}
            onChange={(category) => {
              const gallery = [...content.gallery];
              gallery[i] = { ...g, category };
              setContent({ ...content, gallery });
            }}
          />
        </div>
      ))}
      <datalist id="album-href-list">
        {(content.albums || []).map((a) => (
          <option key={a.id} value={`/gallery/${a.slug}`} />
        ))}
      </datalist>
      <button
        type="button"
        className="admin-btn"
        onClick={() =>
          setContent({
            ...content,
            gallery: [
              ...content.gallery,
              {
                id: uid("g"),
                image: "/images/photo-paris.jpg",
                title: emptyI18n(),
                category: emptyI18n(),
                href: "/gallery/paris",
                order: content.gallery.length + 1,
              } satisfies GalleryItem,
            ],
          })
        }
      >
        + 添加卡片
      </button>
    </div>
  );
}

export function ServicesEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  return (
    <div>
      <I18nFields
        label="首页服务区标题"
        value={content.home.servicesTitle}
        onChange={(servicesTitle) =>
          setContent({ ...content, home: { ...content.home, servicesTitle } })
        }
      />
      <I18nFields
        label="首页服务区说明"
        value={content.home.servicesContent}
        multiline
        onChange={(servicesContent) =>
          setContent({ ...content, home: { ...content.home, servicesContent } })
        }
      />
      {content.services.map((s, i) => (
        <div className="admin-item" key={s.id}>
          <div className="admin-item-head">
            <strong>服务 {i + 1}</strong>
            <button
              type="button"
              className="admin-btn danger"
              onClick={() =>
                setContent({
                  ...content,
                  services: content.services.filter((x) => x.id !== s.id),
                })
              }
            >
              删除
            </button>
          </div>
          <MediaField
            label="配图"
            value={s.image}
            accept="image"
            onChange={(image) => {
              const services = [...content.services];
              services[i] = { ...s, image };
              setContent({ ...content, services });
            }}
            onMsg={onMsg}
          />
          <I18nFields
            label="标题"
            value={s.title}
            onChange={(title) => {
              const services = [...content.services];
              services[i] = { ...s, title };
              setContent({ ...content, services });
            }}
          />
          <I18nFields
            label="介绍"
            value={s.description}
            multiline
            onChange={(description) => {
              const services = [...content.services];
              services[i] = { ...s, description };
              setContent({ ...content, services });
            }}
          />
          <div className="admin-field">
            <label>「了解更多」跳转图库</label>
            <input
              value={s.href || ""}
              placeholder="/gallery/paris"
              list="album-href-list"
              onChange={(e) => {
                const services = [...content.services];
                services[i] = { ...s, href: e.target.value };
                setContent({ ...content, services });
              }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="admin-btn"
        onClick={() =>
          setContent({
            ...content,
            services: [
              ...content.services,
              {
                id: uid("s"),
                image: "/images/service-prewedding.jpg",
                title: emptyI18n(),
                description: emptyI18n(),
                href: "/gallery/paris",
                order: content.services.length + 1,
              },
            ],
          })
        }
      >
        + 添加服务
      </button>
    </div>
  );
}

export function VideosEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  return (
    <div>
      <I18nFields
        label="首页视频区标题"
        value={content.home.videosTitle}
        onChange={(videosTitle) =>
          setContent({ ...content, home: { ...content.home, videosTitle } })
        }
      />
      <I18nFields
        label="首页视频区说明"
        value={content.home.videosContent}
        multiline
        onChange={(videosContent) =>
          setContent({ ...content, home: { ...content.home, videosContent } })
        }
      />
      {content.videos.map((v, i) => (
        <div className="admin-item" key={v.id}>
          <div className="admin-item-head">
            <strong>视频 {i + 1}</strong>
            <button
              type="button"
              className="admin-btn danger"
              onClick={() =>
                setContent({
                  ...content,
                  videos: content.videos.filter((x) => x.id !== v.id),
                })
              }
            >
              删除
            </button>
          </div>
          <div className="admin-field">
            <label>类型</label>
            <select
              value={v.type}
              onChange={(e) => {
                const videos = [...content.videos];
                videos[i] = { ...v, type: e.target.value as VideoItem["type"] };
                setContent({ ...content, videos });
              }}
            >
              <option value="file">本地 / URL 文件</option>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
            </select>
          </div>
          <MediaField
            label={v.type === "file" ? "视频文件（选好即可，封面用视频首帧）" : "视频 ID"}
            value={v.src}
            accept="video"
            onChange={(src) => {
              const videos = [...content.videos];
              // 选本地视频后清空封面，前台自动用视频首帧
              videos[i] = {
                ...v,
                src,
                cover: v.type === "file" ? "" : v.cover,
              };
              setContent({ ...content, videos });
            }}
            onMsg={onMsg}
          />
          {/* 本地文件不需要封面；YouTube/Vimeo 才建议填封面 */}
          {v.type !== "file" ? (
            <MediaField
              label="封面图（外链视频建议填写）"
              value={v.cover}
              accept="image"
              onChange={(cover) => {
                const videos = [...content.videos];
                videos[i] = { ...v, cover };
                setContent({ ...content, videos });
              }}
              onMsg={onMsg}
            />
          ) : (
            <p className="admin-hint" style={{ marginTop: "-0.35rem" }}>
              本地视频无需单独选封面，前台自动显示视频首帧。
            </p>
          )}
          <I18nFields
            label="标题"
            value={v.title}
            onChange={(title) => {
              const videos = [...content.videos];
              videos[i] = { ...v, title };
              setContent({ ...content, videos });
            }}
          />
          <I18nFields
            label="简介"
            value={v.description}
            multiline
            onChange={(description) => {
              const videos = [...content.videos];
              videos[i] = { ...v, description };
              setContent({ ...content, videos });
            }}
          />
          <div className="admin-field">
            <label>「了解更多」跳转图库</label>
            <input
              value={v.href || ""}
              placeholder="/gallery/paris"
              list="album-href-list"
              onChange={(e) => {
                const videos = [...content.videos];
                videos[i] = { ...v, href: e.target.value };
                setContent({ ...content, videos });
              }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="admin-btn"
        onClick={() =>
          setContent({
            ...content,
            videos: [
              ...content.videos,
              {
                id: uid("v"),
                type: "file",
                src: "",
                cover: "",
                title: emptyI18n(),
                description: emptyI18n(),
                href: "/gallery/paris",
                order: content.videos.length + 1,
              },
            ],
          })
        }
      >
        + 添加视频
      </button>
    </div>
  );
}

export function PublicityEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  const list = content.publicity || [];

  return (
    <div>
      <I18nFields
        label="首页宣传花絮标题"
        value={content.home.publicityTitle}
        onChange={(publicityTitle) =>
          setContent({ ...content, home: { ...content.home, publicityTitle } })
        }
      />
      <I18nFields
        label="首页宣传花絮说明"
        value={content.home.publicityContent}
        multiline
        onChange={(publicityContent) =>
          setContent({ ...content, home: { ...content.home, publicityContent } })
        }
      />
      <div className="admin-panel">
        <h2>花絮图片（{list.length}）</h2>
        <div className="fm-thumb-strip">
          {list.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" />
          ))}
        </div>
        <div className="admin-field">
          <label>路径列表（每行一张）</label>
          <textarea
            value={list.join("\n")}
            onChange={(e) =>
              setContent({
                ...content,
                publicity: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <MediaField
          label="从文件库添加"
          value=""
          accept="image"
          multiplePick
          onChange={() => {}}
          onPickMany={(urls) => {
            setContent({ ...content, publicity: [...list, ...urls] });
            onMsg({ type: "ok", text: `已加入 ${urls.length} 张，记得保存` });
          }}
          onMsg={onMsg}
        />
      </div>
    </div>
  );
}

export function PagesEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg?: (m: Msg) => void;
}) {
  const map: { key: keyof SiteContent["pages"]; label: string }[] = [
    { key: "photos", label: "作品集页 /photos" },
    { key: "videos", label: "视频页 /videos" },
    { key: "services", label: "服务页 /services" },
    { key: "about", label: "关于页 /about" },
    { key: "contact", label: "联系页 /contact" },
  ];

  const about = content.pages.about;

  return (
    <div>
      <div className="admin-panel">
        <h2>页面开关</h2>
        <p className="admin-hint">关闭后导航不显示；视频还可单独控制首页是否出现视频区块。</p>
        {map.map(({ key, label }) => {
          const page = content.pages[key];
          return (
            <label key={key} className="admin-check">
              <input
                type="checkbox"
                checked={page.enabled !== false}
                onChange={(e) =>
                  setContent({
                    ...content,
                    pages: {
                      ...content.pages,
                      [key]: { ...page, enabled: e.target.checked },
                    },
                  })
                }
              />
              启用 {label}
            </label>
          );
        })}
        <label className="admin-check">
          <input
            type="checkbox"
            checked={content.home.showVideosSection !== false}
            onChange={(e) =>
              setContent({
                ...content,
                home: { ...content.home, showVideosSection: e.target.checked },
              })
            }
          />
          首页显示视频区块
        </label>
      </div>

      {map.map(({ key, label }) => {
        if (key === "about") return null;
        const page = content.pages[key];
        return (
          <div key={key} className="admin-panel">
            <h2>{label}</h2>
            <I18nFields
              label="页面标题"
              value={page.title}
              onChange={(title) =>
                setContent({
                  ...content,
                  pages: { ...content.pages, [key]: { ...page, title } },
                })
              }
            />
            <I18nFields
              label="页面正文"
              value={page.content}
              multiline
              onChange={(pageContent) =>
                setContent({
                  ...content,
                  pages: {
                    ...content.pages,
                    [key]: { ...page, content: pageContent },
                  },
                })
              }
            />
          </div>
        );
      })}

      <div className="admin-panel">
        <h2>关于页 /about（完整结构）</h2>
        <I18nFields
          label="问候语（如 Bonjour）"
          value={about.greeting || emptyI18n()}
          onChange={(greeting) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, greeting } },
            })
          }
        />
        <I18nFields
          label="页面标题"
          value={about.title}
          onChange={(title) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, title } },
            })
          }
        />
        <I18nFields
          label="工作室介绍正文"
          value={about.content}
          multiline
          onChange={(pageContent) =>
            setContent({
              ...content,
              pages: {
                ...content.pages,
                about: { ...about, content: pageContent },
              },
            })
          }
        />
        <MediaField
          label="关于页大图"
          value={about.heroImage || ""}
          accept="image"
          onChange={(heroImage) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, heroImage } },
            })
          }
          onMsg={onMsg || (() => {})}
        />
        <I18nFields
          label="选择我们的理由 · 标题"
          value={about.whyTitle || emptyI18n()}
          onChange={(whyTitle) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, whyTitle } },
            })
          }
        />
        {(about.reasons || []).map((r, i) => (
          <div className="admin-item" key={r.id}>
            <div className="admin-item-head">
              <strong>理由 {i + 1}</strong>
              <button
                type="button"
                className="admin-btn danger"
                onClick={() =>
                  setContent({
                    ...content,
                    pages: {
                      ...content.pages,
                      about: {
                        ...about,
                        reasons: about.reasons.filter((x) => x.id !== r.id),
                      },
                    },
                  })
                }
              >
                删除
              </button>
            </div>
            <I18nFields
              label="标题"
              value={r.title}
              onChange={(title) => {
                const reasons = [...about.reasons];
                reasons[i] = { ...r, title };
                setContent({
                  ...content,
                  pages: { ...content.pages, about: { ...about, reasons } },
                });
              }}
            />
            <I18nFields
              label="说明"
              value={r.content}
              multiline
              onChange={(desc) => {
                const reasons = [...about.reasons];
                reasons[i] = { ...r, content: desc };
                setContent({
                  ...content,
                  pages: { ...content.pages, about: { ...about, reasons } },
                });
              }}
            />
          </div>
        ))}
        <button
          type="button"
          className="admin-btn"
          onClick={() =>
            setContent({
              ...content,
              pages: {
                ...content.pages,
                about: {
                  ...about,
                  reasons: [
                    ...(about.reasons || []),
                    {
                      id: uid("reason"),
                      title: emptyI18n(),
                      content: emptyI18n(),
                      order: (about.reasons?.length || 0) + 1,
                    },
                  ],
                },
              },
            })
          }
        >
          + 添加理由
        </button>
        <I18nFields
          label="诚招贤士 · 标题"
          value={about.joinTitle || emptyI18n()}
          onChange={(joinTitle) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, joinTitle } },
            })
          }
        />
        <I18nFields
          label="诚招贤士 · 正文"
          value={about.joinContent || emptyI18n()}
          multiline
          onChange={(joinContent) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, joinContent } },
            })
          }
        />
        <I18nFields
          label="所需岗位"
          value={about.joinPositions || emptyI18n()}
          multiline
          onChange={(joinPositions) =>
            setContent({
              ...content,
              pages: { ...content.pages, about: { ...about, joinPositions } },
            })
          }
        />
        <div className="admin-field">
          <label>招聘邮箱</label>
          <input
            value={about.joinEmail || ""}
            onChange={(e) =>
              setContent({
                ...content,
                pages: {
                  ...content.pages,
                  about: { ...about, joinEmail: e.target.value },
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export function ContactEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  const contact = content.contact;
  const socials = contact.socials || [];

  function patchContact(patch: Partial<typeof contact>) {
    setContent({ ...content, contact: { ...contact, ...patch } });
  }

  return (
    <div>
      <div className="admin-panel">
        <h2>联系方式</h2>
        <p className="admin-hint">
          某项<strong>内容</strong>三语都留空（或当前语言为空）则前台不显示该行；
          「邮箱 / 地址 / 电话」等<strong>标签名</strong>请保留多语言，方便以后再用。
        </p>
      </div>

      <I18nFields
        label="地址标签名（如：地址 / Address）"
        value={contact.addressLabel}
        onChange={(addressLabel) => patchContact({ addressLabel })}
      />
      <I18nFields
        label="地址内容（留空则前台不显示整行）"
        value={contact.address}
        onChange={(address) => patchContact({ address })}
      />
      <I18nFields
        label="邮箱标签名（如：邮箱 / Email）"
        value={contact.emailLabel}
        onChange={(emailLabel) => patchContact({ emailLabel })}
      />
      <I18nFields
        label="邮箱内容（留空则前台不显示整行）"
        value={contact.email}
        onChange={(email) => patchContact({ email })}
      />
      <I18nFields
        label="电话标签名（如：电话 / Tel）"
        value={contact.phoneLabel}
        onChange={(phoneLabel) => patchContact({ phoneLabel })}
      />
      <I18nFields
        label="电话内容（留空则前台不显示整行）"
        value={contact.phone}
        onChange={(phone) => patchContact({ phone })}
      />
      <I18nFields
        label="国内电话补充（可选，整段文案）"
        value={contact.phoneCn}
        onChange={(phoneCn) => patchContact({ phoneCn })}
      />
      <I18nFields
        label="微信（可选）"
        value={contact.wechat}
        onChange={(wechat) => patchContact({ wechat })}
      />
      <I18nFields
        label="联系页顶部说明"
        value={contact.note}
        multiline
        onChange={(note) => patchContact({ note })}
      />

      <div className="admin-panel" style={{ marginTop: "1.25rem" }}>
        <h2>社交链接</h2>
        <p className="admin-hint">
          可随意添加 / 删除。URL 留空则前台不显示该图标；记得填图标与名称。
        </p>
        {socials.map((s, i) => (
          <div className="admin-item" key={s.id}>
            <div className="admin-item-head">
              <strong>社交 {i + 1}</strong>
              <button
                type="button"
                className="admin-btn danger"
                onClick={() =>
                  patchContact({ socials: socials.filter((x) => x.id !== s.id) })
                }
              >
                删除
              </button>
            </div>
            <I18nFields
              label="名称（无访问）"
              value={s.label}
              onChange={(label) => {
                const next = [...socials];
                next[i] = { ...s, label };
                patchContact({ socials: next });
              }}
            />
            <MediaField
              label="图标"
              value={s.image}
              accept="image"
              onChange={(image) => {
                const next = [...socials];
                next[i] = { ...s, image };
                patchContact({ socials: next });
              }}
              onMsg={onMsg}
            />
            <div className="admin-field">
              <label>链接 URL（留空则前台隐藏）</label>
              <input
                value={s.url}
                placeholder="https://..."
                onChange={(e) => {
                  const next = [...socials];
                  next[i] = { ...s, url: e.target.value };
                  patchContact({ socials: next });
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="admin-btn"
          onClick={() =>
            patchContact({
              socials: [
                ...socials,
                {
                  id: uid("social"),
                  label: { zh: "新社交", en: "Social", fr: "Réseau" },
                  image: "/images/social-instagram.png",
                  url: "",
                },
              ],
            })
          }
        >
          + 添加社交链接
        </button>
      </div>
    </div>
  );
}

export function BasicEditor({
  content,
  setContent,
  onMsg,
}: {
  content: SiteContent;
  setContent: SetContent;
  onMsg: (m: Msg) => void;
}) {
  return (
    <div>
      <I18nFields
        label="品牌名"
        value={content.brand}
        onChange={(brand) => setContent({ ...content, brand })}
      />
      <MediaField
        label="Logo"
        value={content.logo}
        accept="image"
        onChange={(logo) => setContent({ ...content, logo })}
        onMsg={onMsg}
      />
      <I18nFields
        label="浏览器标题"
        value={content.meta.title}
        onChange={(title) =>
          setContent({ ...content, meta: { ...content.meta, title } })
        }
      />
      <I18nFields
        label="搜索引擎描述"
        value={content.meta.description}
        multiline
        onChange={(description) =>
          setContent({ ...content, meta: { ...content.meta, description } })
        }
      />
      <I18nFields
        label="页脚品牌行"
        value={content.footer.brandLine}
        onChange={(brandLine) =>
          setContent({ ...content, footer: { ...content.footer, brandLine } })
        }
      />
      <div className="admin-field">
        <label>SIRET（法国企业号）</label>
        <input
          value={content.footer.siret}
          onChange={(e) =>
            setContent({
              ...content,
              footer: { ...content.footer, siret: e.target.value },
            })
          }
        />
      </div>
      <div className="admin-panel">
        <h2>导航文案</h2>
        {(
          [
            ["home", "首页"],
            ["photos", "作品集"],
            ["videos", "视频"],
            ["services", "服务"],
            ["about", "关于"],
            ["contact", "联系"],
          ] as const
        ).map(([key, label]) => (
          <I18nFields
            key={key}
            label={label}
            value={content.nav[key]}
            onChange={(v) =>
              setContent({ ...content, nav: { ...content.nav, [key]: v } })
            }
          />
        ))}
      </div>
    </div>
  );
}
