"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ fontSize: 18, marginBottom: 8 }}>加载失败</h1>
        <p style={{ opacity: 0.65, marginBottom: 16 }}>
          请稍后重试。若持续出现，多半是 data/content.json 未初始化。
        </p>
        {error?.digest ? (
          <p style={{ fontSize: 12, opacity: 0.4 }}>Digest: {error.digest}</p>
        ) : null}
        <button type="button" onClick={() => reset()}>
          重试
        </button>
      </div>
    </div>
  );
}
