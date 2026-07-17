import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { AboutPageClient } from "@/components/AboutPageClient";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  const content = getContent();
  return (
    <SiteShell content={content}>
      <AboutPageClient content={content} />
    </SiteShell>
  );
}
