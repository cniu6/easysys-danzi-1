import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { VideosPageClient } from "@/components/VideosPageClient";

export const dynamic = "force-dynamic";

export default function VideosPage() {
  const content = getContent();
  return (
    <SiteShell content={content}>
      <VideosPageClient content={content} />
    </SiteShell>
  );
}
