import { notFound } from "next/navigation";
import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { AlbumGallery } from "@/components/AlbumGallery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function GalleryAlbumPage(props: PageProps) {
  // Next.js 15：先 unwrap，避免 DevTools 枚举 Promise params 报错
  const { slug } = await props.params;
  const content = getContent();
  const album = (content.albums || []).find((a) => a.slug === slug && a.enabled);
  if (!album) notFound();

  return (
    <SiteShell content={content}>
      <AlbumGallery album={album} />
    </SiteShell>
  );
}
