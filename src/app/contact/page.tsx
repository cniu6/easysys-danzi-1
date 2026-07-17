import { getContent } from "@/lib/content";
import { SiteShell } from "@/components/SiteShell";
import { ContactPageClient } from "@/components/ContactPageClient";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const content = getContent();
  return (
    <SiteShell content={content}>
      <ContactPageClient content={content} />
    </SiteShell>
  );
}
