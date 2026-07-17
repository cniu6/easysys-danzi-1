/** 支持的语言 */
export type Lang = "zh" | "en" | "fr";

/** 三语文案 */
export type I18nText = Record<Lang, string>;

/** 媒体：图片或视频（本地上传路径或外链 URL） */
export interface MediaItem {
  id: string;
  type: "image" | "video";
  src: string;
  /** 视频封面 */
  poster?: string;
  order: number;
}

/** 首页作品入口卡片 */
export interface GalleryItem {
  id: string;
  image: string;
  title: I18nText;
  category: I18nText;
  /** Discover 跳转，如 /gallery/paris */
  href: string;
  order: number;
}

export interface VideoItem {
  id: string;
  type: "youtube" | "vimeo" | "file";
  src: string;
  /** 可选封面；本地 file 类型留空则前台用视频首帧 */
  cover: string;
  title: I18nText;
  description: I18nText;
  /** Discover 跳转图库 */
  href: string;
  order: number;
}

export interface ServiceItem {
  id: string;
  image: string;
  title: I18nText;
  description: I18nText;
  /** Discover 跳转图库 */
  href: string;
  order: number;
}

export interface SocialLink {
  id: string;
  label: I18nText;
  image: string;
  url: string;
}

export interface ContactInfo {
  address: I18nText;
  email: I18nText;
  phone: I18nText;
  phoneCn: I18nText;
  wechat: I18nText;
  note: I18nText;
  phoneLabel: I18nText;
  emailLabel: I18nText;
  addressLabel: I18nText;
  socials: SocialLink[];
}

/** 通用页面区块：标题 + 正文 + 媒体 */
export interface PageSection {
  id: string;
  /** 是否启用该页面（关则导航隐藏，访问可提示关闭） */
  enabled: boolean;
  title: I18nText;
  content: I18nText;
  media: MediaItem[];
}

/** 关于页「选择我们的理由」条目 */
export interface AboutReason {
  id: string;
  title: I18nText;
  content: I18nText;
  order: number;
}

/** 关于页完整结构（对齐 Paris MONO About） */
export interface AboutPageData extends PageSection {
  /** 顶部问候，如 Bonjour */
  greeting: I18nText;
  /** 主视觉大图 */
  heroImage: string;
  /** WHY CHOOSE US 标题 */
  whyTitle: I18nText;
  reasons: AboutReason[];
  /** 诚招贤士标题 */
  joinTitle: I18nText;
  joinContent: I18nText;
  joinPositions: I18nText;
  /** 招聘简历邮箱 */
  joinEmail: string;
}

/** 图库专辑中的单条媒体（图片或视频） */
export interface AlbumMediaItem {
  id: string;
  type: "image" | "video";
  src: string;
  /** 视频封面（可选） */
  poster?: string;
  order: number;
}

/** 图库专辑页（类似 /fr/paris） */
export interface Album {
  id: string;
  /** 主路径 slug：访问 /gallery/{slug} */
  slug: string;
  /**
   * 额外短地址（可后台随意增减），如 paris、studio
   * 会跳转到 /gallery/{slug}
   */
  aliases: string[];
  enabled: boolean;
  title: I18nText;
  subtitle: I18nText;
  /**
   * 媒体列表（图片 + 视频）
   * 旧数据可能只有 images，读取时用 normalizeAlbumMedia 归一化
   */
  media?: AlbumMediaItem[];
  /** @deprecated 兼容旧字段，保存时会与 media 同步 */
  images?: string[];
}

/** 首页 Hero：单图 / 单视频 / 轮播 */
export type HeroMode = "image" | "video" | "carousel";

export interface SiteContent {
  brand: I18nText;
  logo: string;
  tagline: I18nText;
  meta: {
    title: I18nText;
    description: I18nText;
  };
  nav: {
    home: I18nText;
    photos: I18nText;
    videos: I18nText;
    services: I18nText;
    about: I18nText;
    contact: I18nText;
  };
  /** 全局按钮文案 */
  ui: {
    explore: I18nText;
    discover: I18nText;
  };
  /** 首页配置 */
  home: {
    heroMode: HeroMode;
    heroSlides: MediaItem[];
    portfolioTitle: I18nText;
    portfolioContent: I18nText;
    servicesTitle: I18nText;
    servicesContent: I18nText;
    videosTitle: I18nText;
    videosContent: I18nText;
    publicityTitle: I18nText;
    publicityContent: I18nText;
    /** 首页是否显示视频区块（可与视频页开关独立） */
    showVideosSection: boolean;
  };
  /** 各内页区块 */
  pages: {
    photos: PageSection;
    videos: PageSection;
    services: PageSection;
    about: AboutPageData;
    contact: PageSection;
  };
  gallery: GalleryItem[];
  videos: VideoItem[];
  services: ServiceItem[];
  publicity: string[];
  albums: Album[];
  contact: ContactInfo;
  footer: {
    brandLine: I18nText;
    siretLabel: I18nText;
    siret: string;
  };
}
