import "./globals.css";
import { RouteProgressBar } from "@/components/RouteProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <head>
        <title>PARIS MONO</title>
        <meta
          name="description"
          content="Wedding & travel photography in Paris"
        />
      </head>
      <body>
        <RouteProgressBar />
        {children}
      </body>
    </html>
  );
}
