"use client";

import { useState } from "react";

/** 后台修改密码弹窗：写入 .env.local，立即生效 */
export function ChangePasswordModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    if (newPassword !== confirmPassword) {
      setErr("两次新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      setErr("新密码至少 6 位");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.code === "AUTH_REQUIRED") {
        window.dispatchEvent(
          new CustomEvent("admin:auth-expired", {
            detail: { message: data.error || "登录已过期" },
          })
        );
        return;
      }
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "修改失败");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess(data.message || "密码已更新，立即生效");
      onClose();
    } catch {
      setErr("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fm-modal-mask" role="dialog" aria-modal="true">
      <div className="fm-modal" style={{ maxWidth: 440 }}>
        <div className="fm-modal-head">
          <strong>修改登录密码</strong>
          <button type="button" className="admin-btn secondary" onClick={onClose}>
            关闭
          </button>
        </div>
        <p className="admin-hint" style={{ marginBottom: "1rem" }}>
          将写入项目根目录 <code>.env.local</code> 的 <code>ADMIN_PASSWORD</code>
          ，保存后立即生效，无需重启服务。当前登录会话仍有效。
        </p>
        <form onSubmit={submit} autoComplete="off">
          {err ? <div className="admin-msg error">{err}</div> : null}
          <div className="admin-field">
            <label>当前密码</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              maxLength={128}
              autoComplete="current-password"
            />
          </div>
          <div className="admin-field">
            <label>新密码（至少 6 位）</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
          <div className="admin-field">
            <label>确认新密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              maxLength={128}
              autoComplete="new-password"
            />
          </div>
          <div className="admin-actions">
            <button className="admin-btn" type="submit" disabled={loading}>
              {loading ? "保存中…" : "确认修改"}
            </button>
            <button
              className="admin-btn secondary"
              type="button"
              onClick={onClose}
              disabled={loading}
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
