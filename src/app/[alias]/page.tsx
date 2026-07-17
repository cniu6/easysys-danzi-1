import { notFound, redirect } from "next/navigation";
import { getContent } from "@/lib/content";

export const dynamic = "force-dynamic";

/** 系统保留路径，不走图库短地址 */
const RESERVED = new Set([
  "api",
  "admin",
  "gallery",
  "photos",
  "videos",
  "services",
  "about",
  "contact",
  "uploads",
  "images",
  "_next",
  "favicon.ico",
]);

/**
 * 短地址跳转：/paris → /gallery/paris
 * 后台 albums.aliases 可随意增减
 */
type PageProps = {
  params: Promise<{ alias: string }>;
};

export default async function AliasRedirectPage(props: PageProps) {
  // Next.js 15：先 unwrap，避免 DevTools 枚举 Promise params 报错
  const { alias } = await props.params;
  if (RESERVED.has(alias.toLowerCase())) notFound();

  const content = getContent();
  const key = alias.toLowerCase();
  const album = (content.albums || []).find((a) => {
    if (!a.enabled) return false;
    if (a.slug.toLowerCase() === key) return true;
    return (a.aliases || []).some((x) => x.trim().toLowerCase() === key);
  });

  if (!album) notFound();
  redirect(`/gallery/${album.slug}`);
}
