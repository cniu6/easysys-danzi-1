import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { PhotosPageClient } from "@/components/PhotosPageClient";

export const dynamic = "force-dynamic";

export default function PhotosPage() {
  const content = getContent();
  return (
    <SiteShell content={content}>
      <PhotosPageClient content={content} />
    </SiteShell>
  );
}
