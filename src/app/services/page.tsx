import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { ServicesPageClient } from "@/components/ServicesPageClient";

export const dynamic = "force-dynamic";

export default function ServicesPage() {
  const content = getContent();
  return (
    <SiteShell content={content}>
      <ServicesPageClient content={content} />
    </SiteShell>
  );
}
