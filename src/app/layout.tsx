import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>PARIS MONO</title>
        <meta
          name="description"
          content="Wedding & travel photography in Paris"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
