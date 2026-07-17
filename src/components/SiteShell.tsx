"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DocumentMeta } from "@/components/DocumentMeta";
import { LanguageProvider } from "@/context/LanguageContext";
import type { SiteContent } from "@/types/content";
import type { ReactNode } from "react";

export function SiteShell({
  content,
  children,
}: {
  content: SiteContent;
  children: ReactNode;
}) {
  return (
    <LanguageProvider>
      <DocumentMeta content={content} />
      <Header content={content} />
      <MainOffset>{children}</MainOffset>
      <Footer content={content} />
    </LanguageProvider>
  );
}

/** 非首页给固定顶栏留空，避免内容被挡住 */
function MainOffset({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  return (
    <main className={isHome ? "is-home" : "with-header-offset"}>
      {children}
    </main>
  );
}
