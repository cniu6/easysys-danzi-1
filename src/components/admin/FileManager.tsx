"use client";

import { useCallback, useEffect, useState } from "react";

export type FileKind = "image" | "video" | "other";

export type FileEntry = {
  name: string;
  url: string;
  size: number;
  kind: FileKind;
};

type ListResult = {
  path: string;
  parent: string | null;
  folders: string[];
  files: FileEntry[];
};

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** 通知后台页：会话失效 */
function notifyAuthExpired(message?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("admin:auth-expired", {
      detail: { message: message || "登录已过期，请重新登录" },
    })
  );
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    notifyAuthExpired(typeof data.error === "string" ? data.error : undefined);
    throw new Error(data.error || "登录已过期");
  }
  if (!res.ok) throw new Error(data.error || "上传失败");
  return data.url as string;
}

type BrowserProps = {
  /** 初始目录，如 images/hero */
  startPath?: string;
  /** image | video | all */
  accept?: "image" | "video" | "all";
  /** 多选模式 */
  multiple?: boolean;
  /** 选中后回调（单选传一个，多选传多个） */
  onSelect?: (urls: string[]) => void;
  /** 是否显示「选用」按钮（弹窗模式） */
  pickMode?: boolean;
};

/** 可复用的文件浏览器：侧边文件库 / 选图弹窗共用 */
export function FileBrowser({
  startPath = "images",
  accept = "all",
  multiple = false,
  onSelect,
  pickMode = false,
}: BrowserProps) {
  const [path, setPath] = useState(startPath);
  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");

  const load = useCallback(async (p: string) => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        notifyAuthExpired(typeof json.error === "string" ? json.error : undefined);
        throw new Error(json.error || "登录已过期");
      }
      if (!res.ok) throw new Error(json.error || "加载失败");
      setData(json);
      setPath(json.path || p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(startPath);
  }, [load, startPath]);

  const visibleFiles = (data?.files || []).filter((f) => {
    if (accept === "image") return f.kind === "image";
    if (accept === "video") return f.kind === "video";
    return true;
  });

  const toggle = (url: string) => {
    if (!pickMode) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (multiple) {
        if (next.has(url)) next.delete(url);
        else next.add(url);
      } else {
        next.clear();
        next.add(url);
      }
      return next;
    });
  };

  const confirmPick = () => {
    if (!onSelect || !selected.size) return;
    onSelect([...selected]);
  };

  const crumbs = (path || "").split("/").filter(Boolean);

  return (
    <div className="fm-root">
      <div className="fm-toolbar">
        <div className="fm-crumbs">
          <button type="button" className="fm-crumb" onClick={() => load("")}>
            资源根
          </button>
          {crumbs.map((c, i) => {
            const p = crumbs.slice(0, i + 1).join("/");
            return (
              <span key={p}>
                <span className="fm-sep">/</span>
                <button type="button" className="fm-crumb" onClick={() => load(p)}>
                  {c}
                </button>
              </span>
            );
          })}
        </div>
        <div className="fm-toolbar-actions">
          <button type="button" className="admin-btn secondary" onClick={() => load(path)}>
            刷新
          </button>
          <label className="admin-btn secondary fm-upload-label">
            上传到 uploads
            <input
              type="file"
              accept={
                accept === "video"
                  ? "video/*"
                  : accept === "image"
                    ? "image/*"
                    : "image/*,video/*"
              }
              multiple={multiple}
              hidden
              onChange={async (e) => {
                const files = [...(e.target.files || [])];
                e.target.value = "";
                if (!files.length) return;
                try {
                  const urls: string[] = [];
                  for (const f of files) urls.push(await uploadFile(f));
                  setMsg(`已上传 ${urls.length} 个到 /uploads`);
                  await load("uploads");
                  if (pickMode && onSelect) {
                    if (multiple) onSelect(urls);
                    else onSelect([urls[0]]);
                  }
                } catch (er) {
                  setMsg(er instanceof Error ? er.message : "上传失败");
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="fm-shortcuts">
        {[
          ["images", "images"],
          ["images/hero", "hero 轮播"],
          ["images/gallery", "gallery 图库"],
          ["uploads", "uploads 上传"],
          ["videos", "videos 视频"],
        ].map(([p, label]) => (
          <button
            key={p}
            type="button"
            className={`fm-chip ${path === p ? "active" : ""}`}
            onClick={() => load(p)}
          >
            {label}
          </button>
        ))}
      </div>

      {msg ? <p className="admin-hint">{msg}</p> : null}
      {err ? <div className="admin-msg error">{err}</div> : null}
      {loading ? <p className="admin-hint">加载中…</p> : null}

      {!loading && data ? (
        <>
          <div className="fm-folders">
            {data.parent !== null ? (
              <button
                type="button"
                className="fm-folder"
                onClick={() => load(data.parent ?? "")}
              >
                ← 上级
              </button>
            ) : null}
            {data.folders.map((name) => (
              <button
                key={name}
                type="button"
                className="fm-folder"
                onClick={() => load(path ? `${path}/${name}` : name)}
              >
                📁 {name}
              </button>
            ))}
          </div>

          <div className="fm-grid">
            {visibleFiles.map((f) => {
              const active = selected.has(f.url);
              return (
                <button
                  key={f.url}
                  type="button"
                  className={`fm-card ${active ? "selected" : ""}`}
                  onClick={() => {
                    if (pickMode) toggle(f.url);
                    else if (onSelect) onSelect([f.url]);
                  }}
                  onDoubleClick={() => {
                    if (pickMode && onSelect) onSelect([f.url]);
                  }}
                  title={f.url}
                >
                  <div className="fm-thumb">
                    {f.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt="" loading="lazy" />
                    ) : f.kind === "video" ? (
                      <span className="fm-badge">VIDEO</span>
                    ) : (
                      <span className="fm-badge">FILE</span>
                    )}
                  </div>
                  <div className="fm-meta">
                    <span className="fm-name">{f.name}</span>
                    <span className="fm-size">{formatSize(f.size)}</span>
                  </div>
                </button>
              );
            })}
            {!visibleFiles.length ? (
              <p className="admin-hint">此目录暂无匹配文件</p>
            ) : null}
          </div>
        </>
      ) : null}

      {pickMode ? (
        <div className="fm-pick-bar">
          <span className="admin-hint">
            已选 {selected.size} 个{multiple ? "（可多选）" : "（单击选中，双击直接选用）"}
          </span>
          <button
            type="button"
            className="admin-btn"
            disabled={!selected.size}
            onClick={confirmPick}
          >
            选用选中文件
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** 选图/选视频弹窗 */
export function MediaPickerModal({
  open,
  onClose,
  onPick,
  accept = "image",
  multiple = false,
  startPath = "images",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (urls: string[]) => void;
  accept?: "image" | "video" | "all";
  multiple?: boolean;
  startPath?: string;
}) {
  if (!open) return null;

  return (
    <div className="fm-modal-mask" role="dialog" aria-modal="true">
      <div className="fm-modal">
        <div className="fm-modal-head">
          <strong>从文件库选择{multiple ? "（可多选）" : ""}</strong>
          <button type="button" className="admin-btn secondary" onClick={onClose}>
            关闭
          </button>
        </div>
        <FileBrowser
          startPath={startPath}
          accept={accept}
          multiple={multiple}
          pickMode
          onSelect={(urls) => {
            onPick(urls);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

/** 媒体路径字段：预览 + 手填 + 上传 + 文件库挑选 */
export function MediaField({
  label,
  value,
  onChange,
  accept = "image",
  onMsg,
  multiplePick,
  onPickMany,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accept?: "image" | "video" | "all";
  onMsg?: (m: { type: "ok" | "err"; text: string } | null) => void;
  /** 多选时走 onPickMany，不改 value */
  multiplePick?: boolean;
  onPickMany?: (urls: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const isImage =
    accept !== "video" &&
    (!!value.match(/\.(jpe?g|png|webp|gif|svg)(\?|$)/i) || value.startsWith("/images/"));

  return (
    <div className="admin-field media-field">
      <label>{label}</label>
      {isImage && value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="admin-preview" src={value} alt="" />
      ) : null}
      <input
        value={value}
        placeholder="/images/... 或 /uploads/..."
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="admin-actions" style={{ marginTop: 0 }}>
        <button type="button" className="admin-btn secondary" onClick={() => setOpen(true)}>
          从文件库选择
        </button>
        <label className="admin-btn secondary fm-upload-label">
          本地上传
          <input
            type="file"
            accept={
              accept === "video"
                ? "video/*"
                : accept === "image"
                  ? "image/*"
                  : "image/*,video/*"
            }
            hidden
            multiple={!!multiplePick}
            onChange={async (e) => {
              const files = [...(e.target.files || [])];
              e.target.value = "";
              if (!files.length) return;
              try {
                const urls: string[] = [];
                for (const f of files) urls.push(await uploadFile(f));
                if (multiplePick && onPickMany) onPickMany(urls);
                else onChange(urls[0]);
                onMsg?.({ type: "ok", text: "已上传，记得保存" });
              } catch (err) {
                onMsg?.({
                  type: "err",
                  text: err instanceof Error ? err.message : "上传失败",
                });
              }
            }}
          />
        </label>
      </div>
      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        accept={accept}
        multiple={!!multiplePick}
        startPath={accept === "video" ? "videos" : "images"}
        onPick={(urls) => {
          if (multiplePick && onPickMany) onPickMany(urls);
          else onChange(urls[0]);
          onMsg?.({ type: "ok", text: "已选择，记得保存" });
        }}
      />
    </div>
  );
}

export { uploadFile };
