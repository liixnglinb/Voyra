import React, { useState, useEffect } from 'react';
import {
  subscribeAuth, getSession, login, register, resendConfirmation, resetPassword, logout,
} from '../auth';
import {
  ShieldCheck, Eye, EyeOff,
  UserPlus, LogIn, Sparkles,
} from 'lucide-react';

export default function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');       // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  useEffect(() => {
    getSession().then(({ data }) => {
      if (data?.session?.user) { setUser(mapLocal(data.session.user)); setAuthed(true); }
    });
    const unsub = subscribeAuth((u) => {
      setUser(u);
      setAuthed(!!u);
      if (!u) { setEmail(''); setPassword(''); setConfirm(''); setErr(''); }
    });
    return () => { if (unsub && unsub.data) unsub.data.subscription.unsubscribe(); };
  }, []);

  function mapLocal(u) {
    return {
      id: u.id, email: u.email || '',
      displayName: u.user_metadata?.name || u.email?.split('@')[0] || '用户',
      avatarUrl: u.user_metadata?.avatar_url || null,
    };
  }

  const validateEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('请输入正确的邮箱地址'); return false; }
    return true;
  };

  const doSubmit = async (e) => {
    e.preventDefault();
    setErr(''); setMsg('');

    if (mode === 'register') {
      if (!validateEmail()) return;
      if (password.length < 6) { setErr('密码至少 6 位'); return; }
      if (password !== confirm) { setErr('两次输入的密码不一致'); return; }
      setBusy(true);
      try {
        const data = await register(email, password);
        if (data && data.user) { setAuthed(true); setUser(data.user); }
        else { setMsg('注册成功，请登录'); setMode('login'); }
      } catch (ex) {
        const m = regErrText(ex);
        if (/已注册|已存在/.test(m)) {
          setMsg(m + '，已为你切换到登录');
          setMode('login');
        } else { setErr(m); }
      }
      finally { setBusy(false); }
      return;
    }

    if (!validateEmail()) return;
    if (!password) { setErr('请输入密码'); return; }
    setBusy(true);
    try { await login(email, password); }
    catch (ex) { setErr(ex.message || '登录失败'); }
    finally { setBusy(false); }
  };

  const regErrText = (ex) => ex.message || '注册失败，请稍后再试';

  const handleResendConfirmation = async () => {
    if (!validateEmail()) return;
    setBusy(true);
    setErr(''); setMsg('');
    try {
      await resendConfirmation(email);
      setMsg('新的验证邮件已发送，请在手机上打开最新邮件');
    } catch (ex) { setErr(ex.message || '发送失败'); }
    finally { setBusy(false); }
  };
  const handleForget = async () => {
    setErr(''); setMsg('');
    if (!validateEmail()) return;
    setBusy(true);
    try { await resetPassword(email); setMsg('重置密码邮件已发送，请查收'); }
    catch (ex) { setErr(ex.message || '发送失败'); }
    finally { setBusy(false); }
  };

  const handleLogout = async () => {
    await logout();
    setAuthed(false); setUser(null);
  };

  const switchMode = (m) => { setMode(m); setErr(''); setMsg(''); setShowPw(false); };

  const chgPw = (v) => {
    setPassword(v); if (err) setErr('');
    let s = 0;
    if (v.length >= 6) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    setPwStrength(v ? s : 0);
  };

  if (!authed) {
    return (
      <div className="sx-root">
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          .sx-root {
            min-height: 100vh; width: 100%;
            display: flex; align-items: center; justify-content: center;
            padding: 24px;
            background: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          .sx-card { width: 100%; max-width: 372px; }

          .sx-brand { display: flex; align-items: center; gap: 9px; margin-bottom: 26px; }
          .sx-brand-ico {
            width: 30px; height: 30px; border-radius: 8px;
            background: #1A1D24; color: #FFFFFF;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .sx-brand-txt { font-weight: 700; font-size: 16px; color: #1A1D24; letter-spacing: -0.01em; }

          /* 顶部主 tab：登录 / 注册 */
          .sx-tabs-main { display: flex; gap: 22px; border-bottom: 1px solid #F0F1F4; }
          .sx-tab-main {
            appearance: none; border: none; background: none; cursor: pointer; padding: 0 0 9px;
            font: 600 14px/1 "PingFang SC", system-ui, sans-serif; color: #8A8F99;
            border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .15s ease;
          }
          .sx-tab-main.sx-on { color: #1A1D24; border-bottom-color: #1A1D24; }

          .sx-form { width: 100%; padding-top: 20px; display: flex; flex-direction: column; gap: 18px; }

          .sx-field { display: flex; flex-direction: column; gap: 7px; }
          .sx-label { font: 500 12.5px/1 "PingFang SC", system-ui, sans-serif; color: #4A4E57; }
          .sx-label-row { display: flex; justify-content: space-between; align-items: center; }
          .sx-link { appearance: none; border: none; background: none; padding: 0; cursor: pointer; font: 500 12px/1 "PingFang SC", system-ui, sans-serif; color: #4A4E57; transition: color .15s ease; }
          .sx-link:hover { color: #1A1D24; }

          .sx-input-wrap { position: relative; display: flex; align-items: center; }
          .sx-input {
            width: 100%; height: 42px; padding: 0 12px; margin: 0;
            border-radius: 8px; border: 1px solid #E5E7EB;
            background: #FFFFFF; color: #1A1D24;
            font: 500 14px/1 "PingFang SC", system-ui, sans-serif; outline: none;
            transition: all .15s ease;
          }
          .sx-input:hover { border-color: #C9CDD6; }
          .sx-input:focus { border-color: #1A1D24; box-shadow: 0 0 0 3px rgba(20, 24, 33, 0.06); }
          .sx-input::placeholder { color: #B4B8C0; }

          .sx-toggle-pw {
            position: absolute; right: 4px; z-index: 2;
            width: 32px; height: 32px; border-radius: 6px; border: none;
            background: transparent; color: #A6ABB4;
            display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
            transition: all .15s ease;
          }
          .sx-input.has-eye { padding-right: 44px; }
          .sx-toggle-pw:hover { background: #F1F2F5; color: #1A1D24; }

          .sx-strength { height: 2px; border-radius: 999px; background: #F1F2F5; overflow: hidden; margin-top: 2px; }
          .sx-strength i { display: block; height: 100%; border-radius: 999px; transition: width .2s ease, background .2s ease; }

          .sx-error { display: flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 8px; background: #FDF1F1; border: 1px solid #FBC6C6; color: #DC2626; font: 500 12.5px/1.4 "PingFang SC", system-ui, sans-serif; }
          .sx-msg { display: flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 8px; background: #EFFAF4; border: 1px solid #C6F0DA; color: #16A34A; font: 500 12.5px/1.4 "PingFang SC", system-ui, sans-serif; }
          .sx-resend { appearance: none; border: 0; background: none; padding: 0; color: #2563EB; font: 500 12px/1.4 "PingFang SC", system-ui, sans-serif; cursor: pointer; text-align: left; }
          .sx-resend:disabled { opacity: .55; cursor: not-allowed; }

          .sx-submit {
            width: 100%; height: 42px; margin-top: 2px;
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            border: none; cursor: pointer; border-radius: 8px;
            color: #FFFFFF; font: 600 14px/1 "PingFang SC", system-ui, sans-serif;
            background: #1A1D24; transition: all .15s ease;
          }
          .sx-submit:hover:not(:disabled) { background: #2A2E38; }
          .sx-submit:active:not(:disabled) { background: #111318; }
          .sx-submit:disabled { opacity: .45; cursor: not-allowed; }
          .sx-spinner { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: #FFFFFF; animation: sxspin .7s linear infinite; }
          @keyframes sxspin { to { transform: rotate(360deg); } }

          .sx-row { display: flex; align-items: center; justify-content: flex-end; }
          .sx-check { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; font-size: 12.5px; color: #4A4E57; }
          .sx-check input { width: 15px; height: 15px; accent-color: #1A1D24; margin: 0; cursor: pointer; }
        `}</style>

        <div className="sx-card">
          <div className="sx-brand">
            <div className="sx-brand-ico"><Sparkles size={15} strokeWidth={2} /></div>
            <div className="sx-brand-txt">LocalHub</div>
          </div>

          {/* 主 tab：登录 / 注册 */}
          <div className="sx-tabs-main" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={'sx-tab-main ' + (mode === 'login' ? 'sx-on' : '')} onClick={() => switchMode('login')}>登录</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={'sx-tab-main ' + (mode === 'register' ? 'sx-on' : '')} onClick={() => switchMode('register')}>注册</button>
          </div>

          <form onSubmit={doSubmit} className="sx-form">
            <div className="sx-field">
              <label className="sx-label">邮箱</label>
              <input type="email" value={email} autoComplete="email" onChange={(e) => { setEmail(e.target.value); if (err) setErr(''); }} placeholder="name@example.com" className="sx-input" autoFocus />
            </div>

            {mode === 'register' ? (<>
              <div className="sx-field">
                <label className="sx-label">密码</label>
                <div className="sx-input-wrap">
                  <input type={showPw ? 'text' : 'password'} value={password} autoComplete="new-password" onChange={(e) => { chgPw(e.target.value); }} placeholder="至少 6 位" className="sx-input has-eye" />
                  <button type="button" className="sx-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && <div className="sx-strength"><i style={{ width: (pwStrength / 4) * 100 + '%', background: pwStrength <= 1 ? '#EF4444' : pwStrength === 2 ? '#F59E0B' : pwStrength === 3 ? '#16A34A' : '#22C55E' }} /></div>}
              </div>
              <div className="sx-field">
                <label className="sx-label">确认密码</label>
                <div className="sx-input-wrap">
                  <input type={showPw ? 'text' : 'password'} value={confirm} autoComplete="new-password" onChange={(e) => { setConfirm(e.target.value); if (err) setErr(''); }} placeholder="再次输入密码" className="sx-input has-eye" />
                  <button type="button" className="sx-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>) : (
              <div className="sx-field">
                <div className="sx-label-row">
                  <label className="sx-label">密码</label>
                  <button type="button" className="sx-link" onClick={handleForget}>忘记密码？</button>
                </div>
                <div className="sx-input-wrap">
                  <input type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" onChange={(e) => { setPassword(e.target.value); if (err) setErr(''); }} placeholder="请输入密码" className="sx-input has-eye" />
                  <button type="button" className="sx-toggle-pw" onClick={() => setShowPw((v) => !v)} tabIndex={-1} aria-label={showPw ? '隐藏密码' : '显示密码'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {err && <div className="sx-error"><ShieldCheck size={14} strokeWidth={1.8} /><span>{err}</span></div>}
            {mode === 'login' && /尚未验证/.test(err) && email && (
              <button type="button" className="sx-resend" onClick={handleResendConfirmation} disabled={busy}>重新发送验证邮件</button>
            )}
            {msg && <div className="sx-msg"><ShieldCheck size={14} strokeWidth={1.8} /><span>{msg}</span></div>}

            {mode === 'register' ? (
              <button type="submit" disabled={busy || !email || !password || !confirm} className="sx-submit">
                {busy ? (<><span className="sx-spinner" /><span>注册中…</span></>) : (<><UserPlus size={16} strokeWidth={2} /><span>创建账号</span></>)}
              </button>
            ) : (<>
              <div className="sx-row">
                <label className="sx-check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>记住我</span></label>
              </div>
              <button type="submit" disabled={busy || !email || !password} className="sx-submit">
                {busy ? (<><span className="sx-spinner" /><span>登录中…</span></>) : (<><LogIn size={16} strokeWidth={2} /><span>登录</span></>)}
              </button>
            </>)}
          </form>
        </div>
      </div>
    );
  }

  return children({ onLogout: handleLogout, user });
}