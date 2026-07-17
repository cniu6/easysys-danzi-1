"use client";

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

  function update(id: string, patch: Partial<Album>) {
    setContent({
      ...content,
      albums: albums.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  }

  return (
    <div>
      <div className="admin-panel">
        <h2>图库专辑</h2>
        <p className="admin-hint">
          前台访问：/gallery/slug 。短地址写在 aliases（每行一个），例如 paris → 访问 /paris
          会跳转到对应图库。图片可用「从文件库选择」批量加入。
        </p>
      </div>
      {albums.map((a) => (
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
              删除
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
          <I18nFields label="图库标题" value={a.title} onChange={(title) => update(a.id, { title })} />
          <I18nFields
            label="图库副标题"
            value={a.subtitle}
            onChange={(subtitle) => update(a.id, { subtitle })}
          />
          <div className="admin-field">
            <label>图片列表（{a.images.length} 张）</label>
            <div className="fm-thumb-strip">
              {a.images.slice(0, 12).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" />
              ))}
              {a.images.length > 12 ? (
                <span className="admin-hint">+{a.images.length - 12}</span>
              ) : null}
            </div>
            <textarea
              value={a.images.join("\n")}
              onChange={(e) =>
                update(a.id, {
                  images: e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
            <MediaField
              label="从文件库批量添加图片"
              value=""
              accept="image"
              multiplePick
              onChange={() => {}}
              onPickMany={(urls) => {
                update(a.id, { images: [...a.images, ...urls] });
                onMsg({ type: "ok", text: `已加入 ${urls.length} 张，记得保存` });
              }}
              onMsg={onMsg}
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
            albums: [
              ...albums,
              {
                id: uid("album"),
                slug: `album-${albums.length + 1}`,
                aliases: [],
                enabled: true,
                title: emptyI18n(),
                subtitle: emptyI18n(),
                images: [],
              },
            ],
          })
        }
      >
        + 添加图库专辑
      </button>
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
            label={v.type === "file" ? "视频文件" : "视频 ID"}
            value={v.src}
            accept="video"
            onChange={(src) => {
              const videos = [...content.videos];
              videos[i] = { ...v, src };
              setContent({ ...content, videos });
            }}
            onMsg={onMsg}
          />
          <MediaField
            label="封面图"
            value={v.cover}
            accept="image"
            onChange={(cover) => {
              const videos = [...content.videos];
              videos[i] = { ...v, cover };
              setContent({ ...content, videos });
            }}
            onMsg={onMsg}
          />
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
                src: "/videos/paris-1.mp4",
                cover: "/images/video-1.jpg",
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
}: {
  content: SiteContent;
  setContent: SetContent;
}) {
  const map: { key: keyof SiteContent["pages"]; label: string }[] = [
    { key: "photos", label: "作品集页 /photos" },
    { key: "videos", label: "视频页 /videos" },
    { key: "services", label: "服务页 /services" },
    { key: "about", label: "关于页 /about" },
    { key: "contact", label: "联系页 /contact" },
  ];

  return (
    <div>
      <p className="admin-hint" style={{ marginBottom: "1rem" }}>
        各内页顶部标题与正文，与前台导航名称一致。
      </p>
      {map.map(({ key, label }) => {
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
  return (
    <div>
      <I18nFields
        label="地址"
        value={content.contact.address}
        onChange={(address) =>
          setContent({ ...content, contact: { ...content.contact, address } })
        }
      />
      <I18nFields
        label="邮箱"
        value={content.contact.email}
        onChange={(email) =>
          setContent({ ...content, contact: { ...content.contact, email } })
        }
      />
      <I18nFields
        label="电话"
        value={content.contact.phone}
        onChange={(phone) =>
          setContent({ ...content, contact: { ...content.contact, phone } })
        }
      />
      <div className="admin-panel">
        <h2>社交链接（URL 留空则前台不显示）</h2>
        {content.contact.socials.map((s, i) => (
          <div className="admin-item" key={s.id}>
            <strong>{s.id}</strong>
            <MediaField
              label="图标"
              value={s.image}
              accept="image"
              onChange={(image) => {
                const socials = [...content.contact.socials];
                socials[i] = { ...s, image };
                setContent({ ...content, contact: { ...content.contact, socials } });
              }}
              onMsg={onMsg}
            />
            <div className="admin-field">
              <label>链接 URL</label>
              <input
                value={s.url}
                onChange={(e) => {
                  const socials = [...content.contact.socials];
                  socials[i] = { ...s, url: e.target.value };
                  setContent({ ...content, contact: { ...content.contact, socials } });
                }}
              />
            </div>
          </div>
        ))}
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
