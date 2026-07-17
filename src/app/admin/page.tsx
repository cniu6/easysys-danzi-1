"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/types/content";
import { FileBrowser } from "@/components/admin/FileManager";
import { ChangePasswordModal } from "@/components/admin/ChangePasswordModal";
import {
  AlbumsEditor,
  BasicEditor,
  ContactEditor,
  GalleryCardsEditor,
  HomeEditor,
  PagesEditor,
  PublicityEditor,
  ServicesEditor,
  VideosEditor,
} from "@/components/admin/AdminEditors";

type Tab =
  | "home"
  | "gallery"
  | "albums"
  | "services"
  | "videos"
  | "publicity"
  | "pages"
  | "contact"
  | "basic"
  | "files";

const NAV: { id: Tab; label: string; group: string }[] = [
  { id: "home", label: "首页轮播", group: "首页" },
  { id: "gallery", label: "作品入口卡片", group: "首页" },
  { id: "services", label: "服务区块", group: "首页" },
  { id: "videos", label: "视频区块", group: "首页" },
  { id: "publicity", label: "宣传花絮", group: "首页" },
  { id: "albums", label: "图库专辑", group: "内容" },
  { id: "pages", label: "内页文案", group: "内容" },
  { id: "contact", label: "联系方式", group: "内容" },
  { id: "basic", label: "品牌 / SEO / 导航", group: "设置" },
  { id: "files", label: "文件库", group: "资源" },
];

const TAB_TITLE: Record<Tab, string> = {
  home: "首页轮播",
  gallery: "作品入口卡片",
  albums: "图库专辑",
  services: "服务区块",
  videos: "视频区块",
  publicity: "宣传花絮",
  pages: "内页文案",
  contact: "联系方式",
  basic: "品牌 / SEO / 导航",
  files: "文件库",
};

/** 会话心跳间隔：每 2 分钟向服务端确认，过期则踢回登录 */
const SESSION_POLL_MS = 2 * 60 * 1000;

function formatRemain(ms: number) {
  if (ms <= 0) return "已过期";
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h > 0) return `约 ${h} 小时 ${mm} 分`;
  return `约 ${mm} 分钟`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [sessionHours, setSessionHours] = useState(12);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [pwdOpen, setPwdOpen] = useState(false);
  const loggingOut = useRef(false);

  /** 强制退出到登录页（会话过期 / 401） */
  const forceLogout = useCallback(async (reason?: string) => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // 忽略网络错误，本地仍清状态
    }
    setAuthed(false);
    setContent(null);
    setExpiresAt(null);
    if (reason) setMsg({ type: "err", text: reason });
    loggingOut.current = false;
  }, []);

  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const me = await res.json();
      if (typeof me.sessionHours === "number") setSessionHours(me.sessionHours);
      if (!me.authenticated) {
        setAuthed(false);
        setContent(null);
        setExpiresAt(null);
        return false;
      }
      setAuthed(true);
      setExpiresAt(typeof me.expiresAt === "number" ? me.expiresAt : null);
      return true;
    } catch {
      return false;
    }
  }, []);

  const load = useCallback(async () => {
    const ok = await checkSession();
    if (ok) {
      const c = await fetch("/api/content", { cache: "no-store" }).then((r) => r.json());
      setContent(c);
    }
  }, [checkSession]);

  useEffect(() => {
    load();
  }, [load]);

  // 登录后周期性校验会话；到期自动清理
  useEffect(() => {
    if (!authed) return;

    const poll = window.setInterval(async () => {
      const ok = await checkSession();
      if (!ok) {
        await forceLogout("登录已过期，请重新登录");
      }
    }, SESSION_POLL_MS);

    const tick = window.setInterval(() => setNowTick(Date.now()), 30_000);

    // 页面重新可见时立刻检查
    const onVis = () => {
      if (document.visibilityState === "visible") {
        checkSession().then((ok) => {
          if (!ok) forceLogout("登录已过期，请重新登录");
        });
      }
    };

    // 上传 / 文件库 API 返回 401 时触发
    const onAuthExpired = (ev: Event) => {
      const detail = (ev as CustomEvent<{ message?: string }>).detail;
      forceLogout(detail?.message || "登录已过期，请重新登录");
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("admin:auth-expired", onAuthExpired);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("admin:auth-expired", onAuthExpired);
    };
  }, [authed, checkSession, forceLogout]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({
        type: "err",
        text: typeof data.error === "string" ? data.error : "登录失败",
      });
      return;
    }
    setPassword("");
    setMsg({
      type: "ok",
      text: `登录成功，会话 ${data.expiresInHours || sessionHours} 小时后自动过期`,
    });
    await load();
  }

  async function logout() {
    await forceLogout();
    setMsg({ type: "ok", text: "已退出登录" });
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        await forceLogout(data.error || "登录已过期，请重新登录");
        return;
      }
      if (!res.ok) throw new Error(data.error || "保存失败");
      setMsg({ type: "ok", text: "已保存到前台" });
      // 保存成功顺便刷新会话信息
      await checkSession();
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "保存失败" });
    } finally {
      setSaving(false);
    }
  }

  if (authed === null) {
    return (
      <div className="admin-body">
        <div className="admin-wrap">加载中…</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-body">
        <form className="admin-login" onSubmit={login} autoComplete="off">
          <h1>内容管理</h1>
          <p>
            登录后可管理站点内容。会话默认 {sessionHours} 小时，过期需重新登录。
          </p>
          {msg ? (
            <div className={`admin-msg ${msg.type === "err" ? "error" : ""}`}>{msg.text}</div>
          ) : null}
          <div className="admin-field">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              maxLength={256}
              autoComplete="current-password"
            />
          </div>
          <button className="admin-btn" type="submit">
            登录
          </button>
        </form>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="admin-body">
        <div className="admin-wrap">加载内容…</div>
      </div>
    );
  }

  const groups = [...new Set(NAV.map((n) => n.group))];
  const remainMs = expiresAt ? expiresAt - nowTick : null;

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${navOpen ? "open" : ""}`}>
        <div className="admin-sidebar-brand">
          <strong>内容管理</strong>
          <span>与前台一一对应</span>
          {remainMs !== null ? (
            <span className="admin-session-hint">会话剩余 {formatRemain(remainMs)}</span>
          ) : null}
        </div>
        <nav className="admin-side-nav">
          {groups.map((g) => (
            <div key={g} className="admin-nav-group">
              <div className="admin-nav-group-title">{g}</div>
              {NAV.filter((n) => n.group === g).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={tab === n.id ? "active" : ""}
                  onClick={() => {
                    setTab(n.id);
                    setNavOpen(false);
                  }}
                >
                  {n.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="admin-sidebar-mask"
          aria-label="关闭菜单"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="admin-main">
        <header className="admin-main-top">
          <div className="admin-main-top-left">
            <button
              type="button"
              className="admin-btn secondary admin-menu-btn"
              onClick={() => setNavOpen((v) => !v)}
            >
              菜单
            </button>
            <div>
              <h1>{TAB_TITLE[tab]}</h1>
              <p className="admin-hint">改完点右上角「保存全部」，前台才会更新</p>
            </div>
          </div>
          <div className="admin-actions" style={{ marginTop: 0 }}>
            <a className="admin-btn secondary" href="/" target="_blank" rel="noreferrer">
              打开前台
            </a>
            {tab !== "files" ? (
              <button className="admin-btn" type="button" onClick={save} disabled={saving}>
                {saving ? "保存中…" : "保存全部"}
              </button>
            ) : null}
            <button
              className="admin-btn secondary"
              type="button"
              onClick={() => setPwdOpen(true)}
            >
              修改密码
            </button>
            <button className="admin-btn secondary" type="button" onClick={logout}>
              退出
            </button>
          </div>
        </header>

        {msg ? (
          <div className={`admin-msg ${msg.type === "err" ? "error" : ""}`}>{msg.text}</div>
        ) : null}

        <div className="admin-main-body">
          {tab === "home" ? (
            <HomeEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "gallery" ? (
            <GalleryCardsEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "albums" ? (
            <AlbumsEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "services" ? (
            <ServicesEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "videos" ? (
            <VideosEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "publicity" ? (
            <PublicityEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "pages" ? (
            <PagesEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "contact" ? (
            <ContactEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "basic" ? (
            <BasicEditor content={content} setContent={setContent} onMsg={setMsg} />
          ) : null}
          {tab === "files" ? (
            <div className="admin-panel">
              <h2>站点文件库</h2>
              <p className="admin-hint" style={{ marginBottom: "1rem" }}>
                浏览 public 下的 images / uploads / videos。编辑内容时点「从文件库选择」也会打开同样界面。
              </p>
              <FileBrowser
                startPath="images"
                accept="all"
                onSelect={undefined}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ChangePasswordModal
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        onSuccess={(text) => setMsg({ type: "ok", text })}
      />
    </div>
  );
}
