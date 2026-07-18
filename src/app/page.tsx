import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { Hero } from "@/components/Hero";
import { PhotoGrid } from "@/components/PhotoGrid";
import { ServiceGrid } from "@/components/ServiceGrid";
import { PublicityGrid } from "@/components/PublicityGrid";
import { VideoGrid } from "@/components/VideoGrid";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const content = getContent();
  const showVideos =
    content.home?.showVideosSection !== false &&
    content.pages?.videos?.enabled !== false;

  return (
    <SiteShell content={content}>
      <Hero content={content} />
      <PhotoGrid items={content.gallery ?? []} content={content} />
      <ServiceGrid items={content.services ?? []} content={content} />
      <PublicityGrid content={content} />
      {showVideos ? (
        <VideoGrid items={content.videos ?? []} content={content} limit={2} />
      ) : null}
    </SiteShell>
  );
}
