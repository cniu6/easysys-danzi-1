"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#111",
          color: "#eee",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>页面暂时无法加载</h1>
          <p style={{ opacity: 0.7, lineHeight: 1.6 }}>
            服务端渲染出错。若刚部署，请确认已挂载持久卷并重新部署；或查看容器日志中的
            [content] / [entrypoint] 信息。
          </p>
          {error?.digest ? (
            <p style={{ fontSize: 12, opacity: 0.45 }}>Digest: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "10px 18px",
              border: "1px solid #555",
              background: "transparent",
              color: "#eee",
              cursor: "pointer",
            }}
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
