import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lock, UserRound, X, LogOut, ShieldCheck } from 'lucide-react';
import { createAvatar } from '@dicebear/core';
import * as pixelArt from '@dicebear/pixel-art';
import { isAuthed, login, register, logout as doLogout, getSession, RETENTION_DAYS, SESSION_DAYS } from '../lib/auth';

/* ============================================================
   统一登录（日程中心 / 思维导图 / 宝宝护理 共用）
   - 不拦截进入：右上角登录按钮 → 弹出卡片（背景虚化）
   - 数据保存时才校验：未登录 → 提示登录
   - 注册需两遍密码，注册即登录
   ============================================================ */

const MOBILE_MQ = '(max-width: 767px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_MQ).matches : false),
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_MQ);
    const on = (e) => setMobile(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

/* 头像在浏览器本地生成，不发第三方请求：api.dicebear.com 在国内移动网络不稳，
   把用户名当 seed 发给外部站点也是无谓的外流。同名 seed 出同一张图。 */
function avatarFor(username) {
  if (!username) return '';
  try {
    return createAvatar(pixelArt, { seed: username, size: 64 }).toDataUri();
  } catch {
    return ''; // 生成失败退回小人图标，不让页头空掉
  }
}


const AuthCtx = createContext(null);
export function useAuth() {
  return useContext(AuthCtx);
}

/**
 * variant: 'light'（白底页面，默认） | 'dark'（深色页面，如思维导图）
 */
export default function AuthGate({ children, variant = 'light' }) {
  const [authed, setAuthed] = useState(isAuthed());
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const session = getSession();
  const isMobile = useIsMobile();
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);
  const username = session ? session.username : '';
  const avatarUri = useMemo(() => avatarFor(username), [username]);

  /* 头像面板：点外部或 Esc 收起 */
  useEffect(() => {
    if (!acctOpen) return undefined;
    const onDown = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAcctOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [acctOpen]);

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
      <div className={variant === 'dark' ? 'ag-fab ag-fab--dark' : 'ag-fab'} ref={acctRef}>
        {authed ? (
          isMobile ? (
            <>
              <button type="button" className="ag-avatar" aria-expanded={acctOpen} aria-label="账户"
                onClick={() => setAcctOpen((v) => !v)}>
                {avatarUri ? <img src={avatarUri} alt="" width={36} height={36} /> : <UserRound size={19} />}
              </button>
              {acctOpen && (
                <div className="ag-acct-panel" role="dialog" aria-label="账户">
                  <span className="ag-acct-name">{username || '已登录'}</span>
                  <button className="ag-fab-btn" onClick={() => { setAcctOpen(false); handleLogout(); }}>
                    <LogOut size={12} />退出登录
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="ag-fab-user">
              <span className="ag-fab-name">{session ? session.username : '已登录'}</span>
              <button className="ag-fab-btn" onClick={handleLogout} title="退出登录"><LogOut size={12} /></button>
            </div>
          )
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

        /* ===== 右上角按钮（紧凑版） ===== */
        .ag-fab {
          position: fixed; top: 12px; right: 12px; z-index: 1000;
          display: flex; align-items: center; gap: 6px;
        }
        .ag-fab-user {
          display: flex; align-items: center; gap: 5px;
          background: #fff; border: 1px solid rgba(27,27,27,.14); border-radius: 999px;
          padding: 3px 3px 3px 10px;
        }
        .ag-fab-name { font-size: 11px; color: #1b1b1b; font-weight: 700; max-width: 88px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ag-fab-btn {
          display: inline-flex; align-items: center; gap: 5px;
          border: 1px solid rgba(27,27,27,.18); border-radius: 999px; background: #fff;
          padding: 5px 11px; font-size: 11.5px; font-weight: 700; color: #1b1b1b;
          cursor: pointer; font-family: inherit;
          transition: background .16s ease, color .16s ease, border-color .16s ease;
        }
        .ag-fab-btn:hover { background: #1b1b1b; color: #fff; border-color: #1b1b1b; }
        .ag-fab-login { background: #fff; color: #A48830; border-color: #A48830; }
        .ag-fab-login:hover { background: #A48830; border-color: #A48830; color: #fff; }

        /* ===== 深色页面变体（思维导图 #0A0A0A 底） ===== */
        .ag-fab--dark .ag-fab-user { background: rgba(24,24,24,.9); border-color: rgba(255,255,255,.16); }
        .ag-fab--dark .ag-fab-name { color: #f2f2f2; }
        .ag-fab--dark .ag-fab-btn { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.16); color: #ececec; }
        .ag-fab--dark .ag-fab-btn:hover { background: #fff; color: #111; border-color: #fff; }
        .ag-fab--dark .ag-fab-login { background: rgba(24,24,24,.9); color: #ffe08a; border-color: rgba(255,224,138,.45); }
        .ag-fab--dark .ag-fab-login:hover { background: #A48830; border-color: #A48830; color: #fff; }

        /* 手机上右上角浮标不能压住页头标题：收紧尺寸，页头另行避让 */
        @media (max-width: 767px) {
          /* 头像与页头里那排按钮同一中心线：页头 top 10，内容区（56 高减去 8 下内边距）
             居中后中心在 34；头像 12 + 44/2 = 34 */
          .ag-fab { top: 12px; right: 10px; gap: 6px; }
          .ag-fab-user { padding: 4px 4px 4px 10px; min-height: var(--ctl-md); }
          .ag-fab-name { max-width: 64px; font-size: var(--fs-meta); }
          .ag-fab-btn { min-height: var(--ctl-md); padding: 0 12px; font-size: var(--fs-meta); }
          /* 用户名胶囊 + 退出按钮（实测占宽 ~130px）→ 一个 44px 头像，
             44 是拇指命中区下限，里面 36px 才是看得见的圆。 */
          .ag-avatar { display: grid; place-items: center; width: 44px; height: 44px; padding: 0;
            border: 1px solid rgba(27,27,27,.14); border-radius: 50%; background: #fff; overflow: hidden; cursor: pointer; }
          .ag-avatar img { display: block; width: 36px; height: 36px; border-radius: 50%; image-rendering: pixelated; }
          .ag-acct-panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 1001;
            display: grid; gap: 10px; width: 190px; padding: 12px;
            border: 1px solid rgba(27,27,27,.14); border-radius: 13px; background: #fff;
            box-shadow: 0 18px 38px -20px rgba(20,20,20,.55); }
          .ag-acct-name { color: #1b1b1b; font-size: var(--fs-label); font-weight: 700; overflow-wrap: anywhere; }
          .ag-acct-panel .ag-fab-btn { justify-content: center; }
          .ag-fab--dark .ag-avatar { background: rgba(24,24,24,.9); border-color: rgba(255,255,255,.16); }
          .ag-fab--dark .ag-acct-panel { background: #141414; border-color: rgba(255,255,255,.16); }
          .ag-fab--dark .ag-acct-name { color: #f2f2f2; }
        }

        /* ===== 弹窗遮罩（亮底虚化，极简风） ===== */
        /* ===== 登录弹窗（agm-* 独立命名空间） =====
           之前这套类名是 ag-card-* / ag-note-item，被外壳 Layout 的
           [class*="card"]、[class*="note-item"] 兜底规则命中，标题、副标题、
           说明项全被套上卡片边框 —— 换命名空间 + portal 到 body 双重隔离。 */
        .agm-overlay {
          position: fixed; inset: 0; z-index: 1400;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(250, 250, 248, .66);
          backdrop-filter: blur(14px) saturate(1.05); -webkit-backdrop-filter: blur(14px) saturate(1.05);
          animation: agm-fade .18s ease both;
        }
        @keyframes agm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes agm-in { from { opacity: 0; transform: translateY(10px) scale(.985) } to { opacity: 1; transform: none } }

        .agm-card {
          position: relative;
          width: 100%; max-width: 372px;
          max-height: calc(100dvh - 32px);
          display: flex; flex-direction: column;
          background: #fff;
          border: 1px solid rgba(27, 27, 27, .1);
          border-radius: 18px;
          box-shadow: 0 24px 60px -28px rgba(27, 27, 27, .4);
          animation: agm-in .22s cubic-bezier(.16, 1, .3, 1) both;
          overflow: hidden;
        }

        .agm-head {
          flex: 0 0 auto;
          display: flex; align-items: flex-start; gap: 10px;
          padding: 18px 16px 12px 18px;
        }
        .agm-head-main { flex: 1 1 auto; min-width: 0; }
        .agm-dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          border: 1.5px solid #A48830; margin-right: 8px; vertical-align: 2px;
        }
        .agm-title { display: inline; font-size: 18px; font-weight: 760; color: #1b1b1b; letter-spacing: -.02em; }
        .agm-sub {
          margin-top: 4px;
          font-size: 9.5px; letter-spacing: .14em; color: #a8a8a8;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .agm-x {
          flex: none; width: 32px; height: 32px; margin: -4px -4px 0 0;
          display: grid; place-items: center;
          border: 0; border-radius: 9px; background: transparent;
          color: #9c9c9c; cursor: pointer;
          transition: background .15s ease, color .15s ease;
        }
        .agm-x:hover { background: rgba(27, 27, 27, .06); color: #1b1b1b; }

        .agm-body {
          flex: 1 1 auto; min-height: 0; overflow-y: auto;
          padding: 2px 18px 18px;
          -webkit-overflow-scrolling: touch;
        }
        .agm-field { margin-bottom: 12px; }
        .agm-label {
          display: flex; align-items: baseline; gap: 6px;
          margin-bottom: 6px;
          font-size: 12px; font-weight: 700; color: #444;
        }
        .agm-label em {
          font-style: normal; font-size: 9px; color: #b8b8b8; letter-spacing: .1em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .agm-input {
          display: flex; align-items: center; gap: 9px;
          height: 48px; padding: 0 13px;
          border: 1px solid rgba(27, 27, 27, .14); border-radius: 11px;
          background: #fff;
          transition: border-color .16s ease, box-shadow .16s ease;
        }
        .agm-input:focus-within { border-color: #A48830; box-shadow: 0 0 0 3px rgba(164, 136, 48, .12); }
        .agm-input svg { flex: none; color: #b0b0b0; }
        .agm-input input {
          flex: 1 1 auto; min-width: 0; height: 100%;
          border: 0; outline: 0; background: transparent;
          font-size: 16px; color: #1b1b1b; font-family: inherit;
          -webkit-appearance: none; appearance: none;
        }
        .agm-input input::placeholder { color: #c2c2c2; font-size: 14px; }

        .agm-err {
          margin: 2px 0 10px; padding: 9px 12px; border-radius: 10px;
          background: #FDF3F3; border: 1px solid #F0C5C7;
          color: #B3403A; font-size: 12.5px; text-align: center;
        }

        .agm-submit {
          width: 100%; height: 48px; margin-top: 4px;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          border: 0; border-radius: 11px; cursor: pointer;
          background: #A48830; color: #fff;
          font-size: 15px; font-weight: 750; letter-spacing: .02em; font-family: inherit;
          transition: background .16s ease, transform .12s ease, opacity .16s ease;
        }
        .agm-submit:hover { background: #8E7420; }
        .agm-submit:active { transform: translateY(1px); }
        .agm-submit:disabled { opacity: .55; cursor: not-allowed; }

        .agm-switch { margin-top: 12px; text-align: center; font-size: 12.5px; color: #8a8a8a; }
        .agm-switch button {
          border: 0; background: transparent; padding: 2px 3px; cursor: pointer;
          color: #1b1b1b; font-weight: 700; font-size: 12.5px; font-family: inherit;
          text-decoration: underline; text-decoration-color: #ffe08a; text-decoration-thickness: 2.5px; text-underline-offset: 3px;
        }

        .agm-note {
          margin-top: 16px; padding-top: 14px;
          border-top: 1px solid rgba(27, 27, 27, .08);
        }
        .agm-note-h {
          display: flex; align-items: center; gap: 6px; margin-bottom: 8px;
          font-size: 10px; font-weight: 700; color: #a0a0a0; letter-spacing: .12em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .agm-note-h svg { color: #A48830; }
        .agm-note-row { display: flex; gap: 9px; padding: 5px 0; }
        .agm-note-row + .agm-note-row { border-top: 1px dashed rgba(27, 27, 27, .06); }
        .agm-no {
          flex: none; margin-top: 1px;
          font-size: 9.5px; font-weight: 700; color: #A48830; letter-spacing: .04em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .agm-note-row p { margin: 0; font-size: 11.5px; line-height: 1.62; color: #7a7a7a; }
        .agm-note-row b { color: #1b1b1b; font-weight: 700; }

        /* 手机上：贴底更稳、留出安全区，正文可滚 */
        @media (max-width: 480px) {
          .agm-overlay { padding: 12px; align-items: flex-end; }
          .agm-card {
            max-width: 100%;
            border-radius: 18px 18px 14px 14px;
            max-height: calc(100dvh - 24px);
          }
          .agm-head { padding: 16px 12px 10px 16px; }
          .agm-body { padding: 2px 16px calc(16px + env(safe-area-inset-bottom, 0px)); }
          .agm-title { font-size: 17px; }
        }

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

  return createPortal(
    <div className="agm-overlay" onClick={onClose}>
      <form
        className="agm-card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        aria-label={mode === 'login' ? '登录' : '注册并登录'}
      >
        <div className="agm-head">
          <div className="agm-head-main">
            <div>
              <span className="agm-dot" />
              <span className="agm-title">{mode === 'login' ? '登录' : '注册并登录'}</span>
            </div>
            <div className="agm-sub">VOYRA / UNIFIED ACCOUNT</div>
          </div>
          <button type="button" className="agm-x" onClick={onClose} aria-label="关闭"><X size={17} /></button>
        </div>

        <div className="agm-body">
          <div className="agm-field">
            <label className="agm-label" htmlFor="agm-user">账号 <em>ACCOUNT</em></label>
            <div className="agm-input">
              <UserRound size={15} />
              <input id="agm-user" value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder="你的账号" autoComplete="username" enterKeyHint="next" />
            </div>
          </div>

          <div className="agm-field">
            <label className="agm-label" htmlFor="agm-pass">密码 <em>PASSWORD</em></label>
            <div className="agm-input">
              <Lock size={15} />
              <input id="agm-pass" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位密码"
                autoComplete={mode === 'login' ? 'off' : 'new-password'}
                enterKeyHint={mode === 'login' ? 'go' : 'next'} />
            </div>
          </div>

          {mode === 'register' && (
            <div className="agm-field">
              <label className="agm-label" htmlFor="agm-confirm">确认密码 <em>CONFIRM</em></label>
              <div className="agm-input">
                <Lock size={15} />
                <input id="agm-confirm" type="password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再次输入密码" autoComplete="new-password" enterKeyHint="go" />
              </div>
            </div>
          )}

          {error && <div className="agm-err" role="alert">{error}</div>}

          <button type="submit" className="agm-submit" disabled={busy}>
            {busy ? '请稍候…' : (mode === 'login' ? '登录' : '注册并登录')}
          </button>

          <div className="agm-switch">
            {mode === 'login' ? (
              <>还没有账号？<button type="button" onClick={() => { setMode('register'); setError(''); }}>注册一个</button></>
            ) : (
              <>已有账号？<button type="button" onClick={() => { setMode('login'); setError(''); }}>直接登录</button></>
            )}
          </div>

          <div className="agm-note">
            <div className="agm-note-h"><ShieldCheck size={12} />登录说明</div>
            <div className="agm-note-row">
              <span className="agm-no">01</span>
              <p>登录后自动同步到<b>日程中心、思维导图、宝宝护理</b>三个工具，登录一次全部可用。</p>
            </div>
            <div className="agm-note-row">
              <span className="agm-no">02</span>
              <p>超过 <b>{RETENTION_DAYS} 天</b>未登录，你的数据将被<b>自动删除</b>。</p>
            </div>
            <div className="agm-note-row">
              <span className="agm-no">03</span>
              <p>一次登录有效 <b>{SESSION_DAYS} 天</b>，到期后重新登录即可，数据不会丢失。</p>
            </div>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
