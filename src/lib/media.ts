import type { Album, AlbumMediaItem } from "@/types/content";

/** 根据路径判断是否为视频 */
export function isVideoSrc(src: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(src || "");
}

/** 根据路径判断是否为图片 */
export function isImageSrc(src: string): boolean {
  return /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(src || "");
}

/** 把旧 images[] / 新 media[] 统一成有序媒体列表 */
export function normalizeAlbumMedia(album: Album): AlbumMediaItem[] {
  if (album.media && album.media.length > 0) {
    return [...album.media].sort((a, b) => a.order - b.order);
  }
  return (album.images || []).map((src, i) => ({
    id: `legacy-${i}-${src.slice(-12)}`,
    type: isVideoSrc(src) ? "video" : "image",
    src,
    order: i + 1,
  }));
}

/** 写回专辑时同步 media + images */
export function syncAlbumMediaFields(
  media: AlbumMediaItem[]
): Pick<Album, "media" | "images"> {
  const sorted = [...media].sort((a, b) => a.order - b.order);
  return {
    media: sorted,
    images: sorted.map((m) => m.src),
  };
}

export function makeAlbumMedia(
  src: string,
  order: number,
  type?: "image" | "video"
): AlbumMediaItem {
  const kind = type || (isVideoSrc(src) ? "video" : "image");
  return {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: kind,
    src,
    order,
  };
}
