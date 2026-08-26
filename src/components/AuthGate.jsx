import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { Lock, UserRound, X, LogOut, ShieldCheck } from 'lucide-react';
import { isAuthed, login, register, logout as doLogout, getSession, RETENTION_DAYS, SESSION_DAYS } from '../lib/auth';

/* ============================================================
   统一登录（日程中心 / 思维导图 / 宝宝护理 共用）
   - 不拦截进入：右上角登录按钮 → 弹出卡片（背景虚化）
   - 数据保存时才校验：未登录 → 提示登录
   - 注册需两遍密码，注册即登录
   ============================================================ */

const AuthCtx = createContext(null);
export function useAuth() {
  return useContext(AuthCtx);
}

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(isAuthed());
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const session = getSession();

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  }, []);

  /** 保存守卫：未登录 → 提示 + 弹登录卡片，返回 false；已登录 → 返回 true */
  const guard = useCallback(() => {
    if (!isAuthed()) {
      showToast('请先登录，登录后数据才会保存到你的账号');
      setOpen(true);
      return false;
    }
    return true;
  }, [showToast]);

  const handleLogout = useCallback(() => {
    doLogout();
    setAuthed(false);
    showToast('已退出登录');
  }, [showToast]);

  const ctx = useMemo(() => ({
    authed,
    username: session ? session.username : '',
    openLogin: () => setOpen(true),
    guard,
  }), [authed, session, guard]);

  return (
    <AuthCtx.Provider value={ctx}>
      {children}

      {/* ===== 右上角登录 / 用户按钮 ===== */}
      <div className="ag-fab">
        {authed ? (
          <div className="ag-fab-user">
            <span className="ag-fab-name">{session ? session.username : '已登录'}</span>
            <button className="ag-fab-btn" onClick={handleLogout} title="退出登录"><LogOut size={14} /></button>
          </div>
        ) : (
          <button className="ag-fab-btn ag-fab-login" onClick={() => setOpen(true)}>
            登录
          </button>
        )}
      </div>

      {/* ===== 登录卡片弹窗（背景虚化） ===== */}
      {open && (
        <LoginModal
          onClose={() => setOpen(false)}
          onSuccess={(msg) => { setAuthed(true); setOpen(false); showToast(msg); }}
        />
      )}

      {toast && <div className="ag-toast">{toast}</div>}

      <style>{`
        /* ===== 设计系统 · 融合 Voyra 首页（黑白极简 + 等宽点缀 + 金色标记） ===== */

        /* ===== 右上角按钮 ===== */
        .ag-fab {
          position: fixed; top: 14px; right: 14px; z-index: 1000;
          display: flex; align-items: center; gap: 8px;
        }
        .ag-fab-user {
          display: flex; align-items: center; gap: 6px;
          background: #fff; border: 1px solid rgba(27,27,27,.14); border-radius: 7px;
          padding: 5px 5px 5px 12px;
        }
        .ag-fab-name { font-size: 12px; color: #1b1b1b; font-weight: 700; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ag-fab-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid rgba(27,27,27,.18); border-radius: 7px; background: #fff;
          padding: 7px 13px; font-size: 12.5px; font-weight: 700; color: #1b1b1b;
          cursor: pointer; font-family: inherit;
          transition: background .16s ease, color .16s ease, border-color .16s ease;
        }
        .ag-fab-btn:hover { background: #1b1b1b; color: #fff; border-color: #1b1b1b; }
        .ag-fab-login { background: #fff; color: #A48830; border-color: #A48830; }
        .ag-fab-login:hover { background: #A48830; border-color: #A48830; color: #fff; }

        /* ===== 弹窗遮罩（亮底虚化，极简风） ===== */
        .ag-overlay {
          position: fixed; inset: 0; z-index: 900;
          display: flex; align-items: center; justify-content: center;
          background: rgba(250, 250, 248, .62);
          backdrop-filter: blur(14px) saturate(1.05); -webkit-backdrop-filter: blur(14px) saturate(1.05);
          animation: ag-fade .18s ease both; padding: 20px;
        }
        @keyframes ag-fade { from { opacity: 0; } to { opacity: 1; } }

        /* ===== 登录卡片 ===== */
        .ag-card {
          position: relative;
          width: 100%; max-width: 392px;
          background: #fff;
          border: 1px solid rgba(27,27,27,.16);
          border-radius: 10px;
          box-shadow: 0 24px 60px -22px rgba(27,27,27,.35);
          animation: ag-in .24s cubic-bezier(.16,1,.3,1) both;
          overflow: hidden;
        }
        .ag-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #1b1b1b 55%, #ffe08a 55%);
        }
        @keyframes ag-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

        .ag-card-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 22px 22px 0;
        }
        .ag-brand { display: flex; align-items: center; gap: 9px; }
        .ag-brand-dot { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid #A48830; flex-shrink: 0; }
        .ag-card-title { font-size: 17px; font-weight: 760; color: #1b1b1b; letter-spacing: -.02em; }
        .ag-card-sub { font-size: 10px; color: #9c9c9c; margin-top: 4px; letter-spacing: .06em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .ag-close {
          border: 0; background: transparent; cursor: pointer; color: #9c9c9c; padding: 4px;
          border-radius: 6px; transition: background .15s ease, color .15s ease;
        }
        .ag-close:hover { background: rgba(27,27,27,.06); color: #1b1b1b; }

        .ag-card-body { padding: 18px 22px 20px; }
        .ag-field { margin-bottom: 13px; }
        .ag-field label {
          display: flex; align-items: baseline; gap: 7px;
          font-size: 11px; color: #666; margin-bottom: 7px; font-weight: 700;
        }
        .ag-field label em { font-style: normal; font-size: 9px; color: #b0b0b0; letter-spacing: .08em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .ag-input {
          width: 100%; box-sizing: border-box;
          display: flex; align-items: center; gap: 9px;
          border: 1px solid rgba(27,27,27,.16); border-radius: 7px; background: #fff; padding: 0 12px;
          transition: border-color .16s ease, box-shadow .16s ease;
        }
        .ag-input:focus-within { border-color: #1b1b1b; }
        .ag-input svg { color: #b0b0b0; flex-shrink: 0; }
        .ag-input input {
          flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
          padding: 11px 0; font-size: 13.5px; color: #1b1b1b; font-family: inherit;
          box-shadow: none !important; -webkit-tap-highlight-color: transparent;
        }
        .ag-input input:focus { outline: none; box-shadow: none; }
        .ag-input input::placeholder { color: #c2c2c2; }

        .ag-btn {
          width: 100%; margin-top: 16px;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 12px; border: 0; border-radius: 8px; cursor: pointer;
          background: #A48830; color: #fff;
          font-size: 14px; font-weight: 700; letter-spacing: .02em; font-family: inherit;
          transition: background .16s ease, opacity .16s ease, transform .16s ease;
        }
        .ag-btn:hover { background: #8E7420; }
        .ag-btn:active { transform: translateY(1px); }
        .ag-btn:disabled { opacity: .5; cursor: not-allowed; }

        .ag-switch { text-align: center; margin-top: 14px; font-size: 12px; color: #888; }
        .ag-switch button {
          border: 0; background: transparent; padding: 0 1px; cursor: pointer;
          color: #1b1b1b; font-weight: 700; font-size: 12px; font-family: inherit;
          text-decoration: underline; text-decoration-color: #ffe08a; text-decoration-thickness: 2.5px; text-underline-offset: 3px;
        }

        .ag-error {
          margin-top: 11px; padding: 8px 12px; border-radius: 7px;
          background: #FDF3F3; border: 1px solid #F0C5C7;
          color: #B3403A; font-size: 12px; text-align: center;
        }

        /* ===== 说明区（等宽编号 + 金色标记） ===== */
        .ag-note { margin-top: 18px; border-top: 1px solid rgba(27,27,27,.09); padding-top: 15px; }
        .ag-note h4 {
          margin: 0 0 11px; display: flex; align-items: center; gap: 7px;
          font-size: 10px; font-weight: 700; color: #9c9c9c; letter-spacing: .12em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .ag-note h4 svg { color: #A48830; }
        .ag-note-item { display: flex; gap: 10px; align-items: flex-start; padding: 6px 0; }
        .ag-note-no {
          flex-shrink: 0; margin-top: 2px;
          font-size: 10px; font-weight: 700; color: #A48830; letter-spacing: .05em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .ag-note-item p { margin: 0; font-size: 11.5px; line-height: 1.68; color: #666; }
        .ag-note-item b { color: #1b1b1b; font-weight: 700; }

        /* ===== Toast ===== */
        .ag-toast {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
          z-index: 1200;
          background: #1b1b1b; color: #fff;
          border: 1px solid rgba(255,255,255,.12); border-radius: 7px;
          padding: 9px 16px; font-size: 12.5px;
          box-shadow: 0 8px 24px rgba(27,27,27,.28);
          animation: ag-fade .18s ease both;
        }
      `}</style>
    </AuthCtx.Provider>
  );
}

/* ================= 登录 / 注册卡片 ================= */
function LoginModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login');           // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const u = username.trim();
    if (!u || password.length < 6) { setError('请输入账号和至少 6 位密码'); return; }
    if (mode === 'register' && password !== confirm) { setError('两次输入的密码不一致'); return; }
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login(u, password);
        onSuccess('登录成功');
      } else {
        await register(u, password);
        onSuccess('注册成功，已自动登录');
      }
    } catch {
      setError(mode === 'login' ? '登录失败：账号或密码不正确' : '注册失败：该账号可能已被注册');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ag-overlay" onClick={onClose}>
      <form className="ag-card" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="ag-card-head">
          <div className="ag-brand">
            <span className="ag-brand-dot" />
            <div>
              <div className="ag-card-title">{mode === 'login' ? '登录' : '注册并登录'}</div>
              <div className="ag-card-sub">VOYRA / UNIFIED ACCOUNT</div>
            </div>
          </div>
          <button type="button" className="ag-close" onClick={onClose} aria-label="关闭"><X size={17} /></button>
        </div>

        <div className="ag-card-body">
          <div className="ag-field">
            <label>账号 <em>ACCOUNT</em></label>
            <div className="ag-input">
              <UserRound size={15} />
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="你的账号" autoComplete="username" />
            </div>
          </div>

          <div className="ag-field">
            <label>密码 <em>PASSWORD</em></label>
            <div className="ag-input">
              <Lock size={15} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位密码"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="ag-field">
              <label>确认密码 <em>CONFIRM</em></label>
              <div className="ag-input">
                <Lock size={15} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {error && <div className="ag-error">{error}</div>}

          <button type="submit" className="ag-btn" disabled={busy}>
            {busy ? '请稍候…' : (mode === 'login' ? '登录' : '注册并登录')}
          </button>

          <div className="ag-switch">
            {mode === 'login' ? (
              <>还没有账号？<button type="button" onClick={() => { setMode('register'); setError(''); }}>注册一个</button></>
            ) : (
              <>已有账号？<button type="button" onClick={() => { setMode('login'); setError(''); }}>直接登录</button></>
            )}
          </div>

          <div className="ag-note">
            <h4><ShieldCheck size={13} /> 登录说明</h4>
            <div className="ag-note-item">
              <span className="ag-note-no">01</span>
              <p>登录后自动同步到<b>日程中心、思维导图、宝宝护理</b>三个工具，登录一次全部可用。</p>
            </div>
            <div className="ag-note-item">
              <span className="ag-note-no">02</span>
              <p>超过 <b>{RETENTION_DAYS} 天</b>未登录，你的数据将被<b>自动删除</b>。</p>
            </div>
            <div className="ag-note-item">
              <span className="ag-note-no">03</span>
              <p>一次登录有效 <b>{SESSION_DAYS} 天</b>，到期后重新登录即可，数据不会丢失。</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
