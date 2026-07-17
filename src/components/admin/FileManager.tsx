"use client";

import { useCallback, useEffect, useState } from "react";
import { isImageSrc, isVideoSrc } from "@/lib/media";
import { ZoomLightbox } from "@/components/ZoomLightbox";

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

type TreeNode = {
  name: string;
  path: string;
  children: TreeNode[];
};

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function notifyAuthExpired(message?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("admin:auth-expired", {
      detail: { message: message || "登录已过期，请重新登录" },
    })
  );
}

async function uploadFile(file: File, dir = "uploads"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("dir", dir);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    notifyAuthExpired(typeof data.error === "string" ? data.error : undefined);
    throw new Error(data.error || "登录已过期");
  }
  if (!res.ok) throw new Error(data.error || "上传失败");
  return data.url as string;
}

/** 上传目标：当前在 videos 下则传到 videos，否则 uploads */
function uploadDirFor(path: string) {
  if (path === "videos" || path.startsWith("videos/")) return path || "videos";
  if (path === "uploads" || path.startsWith("uploads/")) return path || "uploads";
  return "uploads";
}

/** 大图 / 视频预览灯箱（支持缩放） */
function MediaLightbox({
  entry,
  onClose,
}: {
  entry: FileEntry;
  onClose: () => void;
}) {
  return (
    <ZoomLightbox
      items={[
        {
          src: entry.url,
          type: entry.kind === "video" ? "video" : "image",
          label: `${entry.name} · ${formatSize(entry.size)}`,
        },
      ]}
      index={0}
      onClose={onClose}
      onIndex={() => {}}
    />
  );
}

/** 左侧目录树节点 */
function TreeBranch({
  node,
  current,
  depth,
  onOpen,
}: {
  node: TreeNode;
  current: string;
  depth: number;
  onOpen: (p: string) => void;
}) {
  const active = current === node.path;
  const inPath = current === node.path || current.startsWith(`${node.path}/`);
  const [open, setOpen] = useState(depth < 2 || inPath);

  useEffect(() => {
    if (inPath) setOpen(true);
  }, [inPath]);

  const hasKids = node.children.length > 0;

  return (
    <div className="fm-tree-branch">
      <div
        className={`fm-tree-row ${active ? "active" : ""}`}
        style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}
      >
        {hasKids ? (
          <button
            type="button"
            className="fm-tree-toggle"
            aria-label={open ? "收起" : "展开"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="fm-tree-toggle-spacer" />
        )}
        <button type="button" className="fm-tree-label" onClick={() => onOpen(node.path)}>
          <span className="fm-tree-icon">{hasKids || depth === 0 ? "📁" : "📂"}</span>
          {node.name}
        </button>
      </div>
      {open && hasKids
        ? node.children.map((c) => (
            <TreeBranch
              key={c.path}
              node={c}
              current={current}
              depth={depth + 1}
              onOpen={onOpen}
            />
          ))
        : null}
    </div>
  );
}

type BrowserProps = {
  startPath?: string;
  accept?: "image" | "video" | "all";
  multiple?: boolean;
  onSelect?: (urls: string[]) => void;
  pickMode?: boolean;
};

/** 可复用的文件浏览器：左侧树 + 右侧网格 + 预览灯箱 */
export function FileBrowser({
  startPath = "images",
  accept = "all",
  multiple = false,
  onSelect,
  pickMode = false,
}: BrowserProps) {
  const [path, setPath] = useState(startPath);
  const [data, setData] = useState<ListResult | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<FileEntry | null>(null);
  const [filter, setFilter] = useState<"all" | "image" | "video">(
    accept === "all" ? "all" : accept
  );

  const loadTree = useCallback(async () => {
    try {
      const res = await fetch("/api/files?tree=1", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        notifyAuthExpired(typeof json.error === "string" ? json.error : undefined);
        return;
      }
      if (res.ok && Array.isArray(json.tree)) setTree(json.tree);
    } catch {
      // 树加载失败不阻塞主列表
    }
  }, []);

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
    loadTree();
  }, [load, loadTree, startPath]);

  const visibleFiles = (data?.files || []).filter((f) => {
    const byAccept =
      accept === "image"
        ? f.kind === "image"
        : accept === "video"
          ? f.kind === "video"
          : true;
    const byFilter =
      filter === "all" ? true : filter === "image" ? f.kind === "image" : f.kind === "video";
    return byAccept && byFilter;
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

  const deleteFile = async (f: FileEntry) => {
    if (!confirm(`确定删除？\n${f.url}\n（仅 uploads / videos 可删）`)) return;
    try {
      const res = await fetch(`/api/files?url=${encodeURIComponent(f.url)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        notifyAuthExpired(typeof json.error === "string" ? json.error : undefined);
        return;
      }
      if (!res.ok) throw new Error(json.error || "删除失败");
      setMsg(`已删除 ${f.name}`);
      if (preview?.url === f.url) setPreview(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(f.url);
        return next;
      });
      await load(path);
      await loadTree();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "删除失败");
    }
  };

  const crumbs = (path || "").split("/").filter(Boolean);
  const canDeleteHere = path.startsWith("uploads") || path.startsWith("videos");
  const canUploadHere =
    path.startsWith("uploads") || path.startsWith("videos") || path === "";
  const uploadTarget = uploadDirFor(path || "uploads");

  return (
    <div className="fm-root">
      <div className="fm-layout">
        {/* 左侧目录树 */}
        <aside className="fm-tree" aria-label="目录树">
          <div className="fm-tree-head">目录</div>
          <button
            type="button"
            className={`fm-tree-root ${path === "" ? "active" : ""}`}
            onClick={() => load("")}
          >
            资源根
          </button>
          {tree.map((n) => (
            <TreeBranch key={n.path} node={n} current={path} depth={0} onOpen={load} />
          ))}
        </aside>

        {/* 右侧内容区 */}
        <div className="fm-main">
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
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => {
                  load(path);
                  loadTree();
                }}
              >
                刷新
              </button>
              {canUploadHere ? (
                <label className="admin-btn secondary fm-upload-label">
                  上传到 {uploadTarget}
                  <input
                    type="file"
                    accept={
                      accept === "video"
                        ? "video/*"
                        : accept === "image"
                          ? "image/*"
                          : "image/*,video/*"
                    }
                    multiple={multiple || !pickMode}
                    hidden
                    onChange={async (e) => {
                      const files = [...(e.target.files || [])];
                      e.target.value = "";
                      if (!files.length) return;
                      try {
                        const urls: string[] = [];
                        for (const f of files) urls.push(await uploadFile(f, uploadTarget));
                        setMsg(`已上传 ${urls.length} 个到 /${uploadTarget}`);
                        await load(uploadTarget);
                        await loadTree();
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
              ) : null}
            </div>
          </div>

          {accept === "all" ? (
            <div className="fm-shortcuts">
              {(
                [
                  ["all", "全部"],
                  ["image", "仅图片"],
                  ["video", "仅视频"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={`fm-chip ${filter === k ? "active" : ""}`}
                  onClick={() => setFilter(k)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {msg ? <p className="admin-hint">{msg}</p> : null}
          {err ? <div className="admin-msg error">{err}</div> : null}
          {loading ? <p className="admin-hint">加载中…</p> : null}

          {!loading && data ? (
            <>
              {data.folders.length || data.parent !== null ? (
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
              ) : null}

              <div className="fm-grid">
                {visibleFiles.map((f) => {
                  const active = selected.has(f.url);
                  return (
                    <div
                      key={f.url}
                      className={`fm-card ${active ? "selected" : ""} ${
                        preview?.url === f.url ? "previewing" : ""
                      }`}
                      title={f.url}
                    >
                      <button
                        type="button"
                        className="fm-card-main"
                        onClick={() => {
                          if (pickMode) toggle(f.url);
                          else setPreview(f);
                        }}
                        onDoubleClick={() => {
                          if (pickMode && onSelect) onSelect([f.url]);
                          else setPreview(f);
                        }}
                      >
                        <div className="fm-thumb">
                          {f.kind === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={f.url} alt="" loading="lazy" />
                          ) : f.kind === "video" ? (
                            <video
                              src={f.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="fm-video-thumb"
                            />
                          ) : (
                            <span className="fm-badge">FILE</span>
                          )}
                          {f.kind === "video" ? (
                            <span className="fm-kind-tag">VIDEO</span>
                          ) : null}
                        </div>
                        <div className="fm-meta">
                          <span className="fm-name">{f.name}</span>
                          <span className="fm-size">{formatSize(f.size)}</span>
                        </div>
                      </button>
                      <div className="fm-card-actions">
                        <button
                          type="button"
                          className="fm-mini-btn"
                          onClick={() => setPreview(f)}
                        >
                          预览
                        </button>
                        {pickMode ? (
                          <button
                            type="button"
                            className="fm-mini-btn"
                            onClick={() => toggle(f.url)}
                          >
                            {active ? "取消" : "选用"}
                          </button>
                        ) : null}
                        {canDeleteHere ? (
                          <button
                            type="button"
                            className="fm-mini-btn danger"
                            onClick={() => deleteFile(f)}
                          >
                            删除
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {!visibleFiles.length ? (
                  <p className="admin-hint">
                    {path === "videos"
                      ? "videos 目录暂无视频。可点上方「上传到 videos」放入成片。"
                      : "此目录暂无匹配文件"}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {pickMode ? (
            <div className="fm-pick-bar">
              <span className="admin-hint">
                已选 {selected.size} 个
                {multiple ? "（可多选）" : "（单击选中，双击直接选用）"}
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
          ) : (
            <p className="admin-hint" style={{ marginTop: "0.75rem" }}>
              左侧点文件夹切换目录；视频在「videos」。uploads / videos 可上传与删除。
            </p>
          )}
        </div>
      </div>

      {preview ? <MediaLightbox entry={preview} onClose={() => setPreview(null)} /> : null}
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
          <strong>
            从文件库选择
            {accept === "video" ? "视频" : accept === "image" ? "图片" : "媒体"}
            {multiple ? "（可多选）" : ""}
          </strong>
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

/** 媒体路径字段：缩略预览（点击放大）+ 手填 + 上传 + 文件库挑选 */
export function MediaField({
  label,
  value,
  onChange,
  accept = "image",
  onMsg,
  multiplePick,
  onPickMany,
  /** 批量选用：不显示路径输入框 */
  pickerOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accept?: "image" | "video" | "all";
  onMsg?: (m: { type: "ok" | "err"; text: string } | null) => void;
  multiplePick?: boolean;
  onPickMany?: (urls: string[]) => void;
  pickerOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  /** 资源加载失败时隐藏预览，避免一直刷 404 */
  const [broken, setBroken] = useState(false);
  /** 点击缩略图后打开灯箱放大 */
  const [lbOpen, setLbOpen] = useState(false);

  useEffect(() => {
    setBroken(false);
    setLbOpen(false);
  }, [value]);

  const showImage = !pickerOnly && !!value && !broken && isImageSrc(value);
  const showVideo = !pickerOnly && !!value && !broken && isVideoSrc(value);
  const uploadDir = accept === "video" ? "videos" : "uploads";

  return (
    <div className="admin-field media-field">
      <label>{label}</label>
      {showImage ? (
        <button
          type="button"
          className="admin-preview-hit"
          onClick={() => setLbOpen(true)}
          title="点击放大预览"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="admin-preview"
            src={value}
            alt=""
            onError={() => setBroken(true)}
          />
          <span className="admin-preview-hint">点击放大</span>
        </button>
      ) : null}
      {showVideo ? (
        <button
          type="button"
          className="admin-preview-hit is-video"
          onClick={() => setLbOpen(true)}
          title="点击放大预览"
        >
          <video
            key={value}
            className="admin-preview-video"
            src={value}
            muted
            playsInline
            preload="metadata"
            onError={() => setBroken(true)}
          />
          <span className="admin-preview-play" aria-hidden>
            ▶
          </span>
          <span className="admin-preview-hint">点击放大播放</span>
        </button>
      ) : null}
      {!pickerOnly && value && broken ? (
        <p className="admin-hint" style={{ margin: "6px 0 0", color: "#b45309" }}>
          文件不存在或无法加载，请重新选择或清空路径
        </p>
      ) : null}
      {!pickerOnly ? (
        <input
          value={value}
          placeholder="/images/... 或 /videos/... 或 /uploads/..."
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
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
                for (const f of files) urls.push(await uploadFile(f, uploadDir));
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
      {lbOpen && (showImage || showVideo) ? (
        <ZoomLightbox
          items={[
            {
              src: value,
              type: showVideo ? "video" : "image",
              label,
            },
          ]}
          index={0}
          onClose={() => setLbOpen(false)}
          onIndex={() => {}}
        />
      ) : null}
    </div>
  );
}

export { uploadFile };
