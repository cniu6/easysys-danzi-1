# 巴黎 MONO 风格作品集站

参考 [Paris MONO](https://www.parismono.com/) 的白底大图婚纱旅拍作品集风格，用 Next.js 重做的前台 + 简易 CMS。

支持 **中文 / English / Français**，浏览器语言自动识别，内容全部存在本地 JSON，上传图片写入 `public/uploads/`。

---

## 技术栈

| 项 | 说明 |
| --- | --- |
| 框架 | Next.js 15（App Router）+ React 19 + TypeScript |
| 样式 | 全局 CSS（`src/app/globals.css`），白底大图排版 |
| 内容 | `data/content.json` 文件型 CMS |
| 鉴权 | JWT Cookie（`jose`），后台登录 |
| 图片处理 | `sharp`（脚本侧下载/压缩用） |

---

## 快速启动

```bash
npm install
npm run dev
```

| 地址 | 用途 |
| --- | --- |
| http://localhost:3000 | 前台网站 |
| http://localhost:3000/admin | 后台内容管理 |

默认后台密码：`admin123`（`.env.local` 的 `ADMIN_PASSWORD`）。登录后右上角「修改密码」可写入 `.env.local`，**立即生效**无需重启。

生产构建：

```bash
npm run build
npm start
```

---

## 功能概览

### 前台

- **首页**：全屏 Hero 轮播（约 5s 自动切，左右箭头 + 圆点，交叉淡入淡出）+ 作品入口 / 服务 / 视频 / 宣传花絮
- **作品集**：首页卡片 Discover → 跳转对应图库（如 `/gallery/paris`）
- **图库页**：专辑瀑布流大图（`/gallery/[slug]`）
- **短地址**：专辑可配别名，如 `/paris` → `/gallery/paris`
- **内页**：照片 / 视频 / 服务 / 关于 / 联系
- **三语**：导航、文案、联系方式、页脚均可按语言切换

### 后台（`/admin`）

登录后可改：

- 首页 Hero（模式：单图 / 单视频 / 轮播；幻灯片增删排序）
- 图库专辑（slug、别名、多图上传）
- 作品入口卡片、服务、视频
- 各页面标题与正文
- 联系方式与社交链接
- 品牌 / Logo / SEO 标题描述
- 登录密码（弹窗修改，写入 `.env.local` 立即生效）

点「保存全部」写入 `data/content.json`；上传文件落到 `public/uploads/`。

---

## 页面路由

| 路径 | 说明 |
| --- | --- |
| `/` | 首页（Hero + 各区块） |
| `/photos` | 照片页 |
| `/videos` | 视频页 |
| `/services` | 服务页 |
| `/about` | 关于 |
| `/contact` | 联系 |
| `/gallery/[slug]` | 图库专辑，如 `/gallery/paris` |
| `/[alias]` | 短别名跳转，如 `/paris` |
| `/admin` | 后台管理 |

---

## 文件架构

```
web-daizi-1/
├── data/                      # 站点数据（核心）
│   ├── content.json           # 全站文案、图库、Hero、联系方式等
│   └── path-map.json          # 短地址 → /gallery/{slug} 映射（保存内容时自动生成）
│
├── public/                    # 静态资源（可直接 URL 访问）
│   ├── images/
│   │   ├── hero/              # 首页轮播图（从 MONO 官网抽取）
│   │   ├── gallery/paris/     # Paris 图库大图
│   │   ├── icons/             # Logo、社交图标
│   │   ├── mono/              # 从 MONO 下载的原始素材备份
│   │   └── *.jpg / *.png …    # 首页卡片、服务、宣传等常用图
│   ├── videos/                # 本地演示视频
│   └── uploads/               # CMS 上传文件（运行时写入）
│
├── scripts/                   # 一次性工具脚本（下载图、迁移数据等）
│   ├── download-mono.js
│   ├── extract-mono-hero.js   # 抽取官网 Hero 轮播图
│   ├── download-paris-gallery.js
│   ├── optimize-images.js
│   └── …
│
├── src/
│   ├── app/                   # Next.js App Router 页面与 API
│   │   ├── layout.tsx         # 根布局（字体、全局壳）
│   │   ├── page.tsx           # 首页
│   │   ├── globals.css        # 全站样式
│   │   ├── admin/page.tsx     # 后台 CMS 界面
│   │   ├── gallery/[slug]/   # 图库页
│   │   ├── [alias]/          # 短地址跳转
│   │   ├── photos|videos|services|about|contact/
│   │   └── api/
│   │       ├── content/       # GET/PUT 读写 content.json
│   │       ├── upload/        # 图片/视频上传
│   │       └── auth/          # login / logout / me
│   │
│   ├── components/            # UI 组件
│   │   ├── Hero.tsx           # 首页全屏轮播
│   │   ├── Header.tsx         # 顶栏（首页透明 / 内页白底）
│   │   ├── Footer.tsx
│   │   ├── SiteShell.tsx      # 布局壳（是否给 main 加顶栏留白）
│   │   ├── AlbumGallery.tsx   # 图库瀑布流
│   │   ├── PhotoGrid / ServiceGrid / VideoGrid / PublicityGrid
│   │   ├── *PageClient.tsx    # 各内页客户端渲染
│   │   ├── DocumentMeta.tsx   # 随语言切换 title / description
│   │   └── LazyImage.tsx
│   │
│   ├── context/
│   │   └── LanguageContext.tsx  # 语言状态 + localStorage
│   │
│   ├── lib/
│   │   ├── content.ts         # 读写 content.json、生成 path-map
│   │   ├── i18n.ts            # t()、浏览器语言检测
│   │   └── auth.ts            # JWT 登录校验
│   │
│   └── types/
│       └── content.ts         # SiteContent 等 TypeScript 类型
│
├── .env.local                 # 环境变量（勿提交真实密钥）
├── next.config.ts
├── package.json
└── README.md
```

---

## 内容数据结构（`data/content.json`）

类型定义见 `src/types/content.ts`。主要字段：

| 字段 | 含义 |
| --- | --- |
| `brand` / `logo` / `tagline` | 品牌名、Logo 路径、标语（三语） |
| `meta.title` / `meta.description` | SEO（三语） |
| `nav` | 导航文案 |
| `ui.explore` / `ui.discover` | 全局按钮文案 |
| `home.heroMode` | `"image"` \| `"video"` \| `"carousel"` |
| `home.heroSlides` | Hero 媒体列表（`src`、`type`、`order`） |
| `home.*Title` / `*Content` | 首页各区块标题与说明 |
| `gallery[]` | 首页作品入口卡片（图 + 标题 + `href`） |
| `albums[]` | 图库专辑：`slug`、`aliases[]`、`images[]`、标题 |
| `services[]` / `videos[]` | 服务与视频条目（含 Discover 的 `href`） |
| `publicity[]` | 宣传花絮图片路径 |
| `pages.*` | 内页标题 / 正文 / 媒体 |
| `contact` | 地址、邮箱、电话、社交（三语 + URL） |
| `footer` | 页脚品牌行、SIRET |

几乎所有面向用户的文字都是三语对象：

```json
{ "zh": "作品集", "en": "Portfolio", "fr": "PORTEFEUILLE" }
```

媒体路径一般写相对站内路径，例如：

- `/images/hero/slide-01.jpg`
- `/images/gallery/paris/paris-01.jpg`
- `/uploads/xxxx.jpg`（后台上传）

---

## 语言逻辑

优先级：

1. `localStorage` 键 `site_lang`（用户手动切换会记住）
2. 浏览器语言（`zh*` → 中文，`fr*` → 法语，`en*` → 英语）
3. 其它语言默认 **English**

相关文件：

- `src/lib/i18n.ts` — 检测、读写、`t()` 取文案
- `src/context/LanguageContext.tsx` — React Context
- `src/components/DocumentMeta.tsx` — 同步 `document.title` 与 meta description

---

## API 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/content` | 读取站点内容 |
| `PUT` | `/api/content` | 保存内容（需登录） |
| `POST` | `/api/upload` | 上传文件到 `public/uploads/`（需登录） |
| `POST` | `/api/auth/login` | 登录，写 JWT Cookie |
| `POST` | `/api/auth/logout` | 退出 |
| `GET` | `/api/auth/me` | 当前是否已登录、过期时间 |
| `POST` | `/api/auth/password` | 修改密码（写 `.env.local`，立即生效） |

---

## 环境变量（`.env.local`）

可参考 `.env.example` 复制为 `.env.local`（真实密钥不进 git）。

```env
# 后台登录密码（上线务必改掉；也可在后台「修改密码」写入）
ADMIN_PASSWORD=admin123

# JWT 签名密钥（至少 16 位，上线务必改成随机长字符串）
AUTH_SECRET=please-change-to-a-long-random-string

# 登录会话时长（小时），默认 12；到期 Cookie 失效并自动清理
AUTH_SESSION_HOURS=12
```

### 鉴权说明

- Cookie 名：`admin_session`（httpOnly，生产环境 Secure，SameSite=Lax）
- JWT 与 Cookie 同时按 `AUTH_SESSION_HOURS` 过期；`/api/auth/me` 及受保护写接口遇过期会清 Cookie
- 密码校验**实时读取** `.env.local`，后台改密后无需重启即可用新密码登录
- 登录/改密失败限流：同 IP 15 分钟内最多 8 次
- 写操作校验同源 Origin/Referer，降低 CSRF
- 后台每 2 分钟心跳检查会话，过期踢回登录页

---

## 静态资源说明

| 目录 | 用途 |
| --- | --- |
| `public/images/hero/` | 首页轮播（与官网 Hero 对应） |
| `public/images/gallery/paris/` | Paris 旅拍图库 |
| `public/images/mono/` | 从 MONO 站点批量下载的原始备份 |
| `public/images/icons/` | Logo、社交图标透明底 |
| `public/videos/` | 本地演示视频 |
| `public/uploads/` | CMS 上传，勿手删正在引用的文件 |

重新抓官网 Hero 图可运行：

```bash
node scripts/extract-mono-hero.js
```

（需已有 `scripts/_mono-home.html` 或先用分析脚本拉首页 HTML。）

---

## 开发约定（简要）

- **改文案 / 换图**：优先走 `/admin`，不要手改一半又后台覆盖；若直接改 `content.json`，保存后刷新即可。
- **新图库**：后台加 `albums` 条目，设好 `slug` 与 `aliases`，图片可传到 `uploads` 或放到 `public/images/gallery/...` 再填路径。
- **短链接**：专辑 `aliases` 保存后会更新 `data/path-map.json`，由 `[alias]` 页面做跳转。
- **样式**：站点视觉以白底、大图、少卡片为主，改 UI 优先动 `globals.css` 与现有组件，避免另起一套设计体系。

---

## 参考站点

- 主参考：[https://www.parismono.com/](https://www.parismono.com/)（巴黎 MONO 摄影工作室）
- 部分版式灵感：[Cult-Art](https://www.cult-artproductions.fr/)
