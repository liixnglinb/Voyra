/**
 * LocalHub 云端前端 · 鉴权模块（Bmob 版）
 * 登录/注册/退出基于 Bmob 用户系统：
 *  - 邮箱密码（username 存邮箱）
 *  - 密码重置走邮箱
 * 会话由 Bmob SDK 自动持久化到 localStorage。
 */
import Bmob from './lib/bmob';

// ---------- 错误信息中文化 ----------
const ERROR_ZH = [
  ['invalid username/password', '邮箱或密码错误'],
  ['username or password error', '邮箱或密码错误'],
  ['user already exists', '该邮箱已注册，请直接登录'],
  ['already exists', '该邮箱已注册，请直接登录'],
  ['username taken', '该邮箱已注册，请直接登录'],
  ['invalid email', '邮箱格式不正确，请检查后重试'],
  ['password too short', '密码至少需要 6 位'],
  ['password should be at least', '密码至少需要 6 位'],
  ['email format', '邮箱格式不正确'],
  ['ratelimit', '操作太频繁，请稍后再试'],
  ['request too frequent', '操作太频繁，请稍后再试'],
  ['session missing', '登录会话已失效，请重新登录'],
  ['failed to fetch', '网络连接失败，请检查网络后重试'],
  ['network error', '网络连接失败，请检查网络后重试'],
  ['object not found', '记录不存在'],
  ['signup is disabled', '当前暂未开放注册'],
];

export function authErrorMessage(error) {
  const msg = (error && (error.message || error)) || '';
  const lower = String(msg).toLowerCase();
  for (const [en, zh] of ERROR_ZH) {
    if (lower.includes(en)) return zh;
  }
  if (!msg) return '操作失败，请稍后再试';
  return /[\u4e00-\u9fa5]/.test(msg) ? msg : '操作失败，请稍后再试';
}

// ---------- 会话 / 当前用户 ----------
function currentUserObj() {
  try {
    return Bmob.User.current ? Bmob.User.current() : null;
  } catch { return null; }
}

function mapUser(u) {
  if (!u) return null;
  const email = u.email || u.username || '';
  return {
    id: u.objectId || u.id || email,
    email,
    displayName: u.nickName || u.name || email.split('@')[0] || '用户',
    avatarUrl: u.avatarUrl || u.avatar_url || null,
  };
}

export function getSession() {
  return Promise.resolve({ data: { session: currentUserObj() ? { user: currentUserObj() } : null } });
}

export function onAuthStateChange(cb) {
  // Bmob 无实时会话监听，用轮询做轻量模拟
  let last = currentUserObj();
  const timer = setInterval(() => {
    const now = currentUserObj();
    if (!!now !== !!last || (now && (now.objectId !== (last && last.objectId)))) {
      last = now;
      cb(now ? mapUser(now) : null);
    }
  }, 1500);
  return { data: { subscription: { unsubscribe: () => clearInterval(timer) } } };
}

export function getToken() { const u = currentUserObj(); return (u && u.sessionToken) || null; }

export function getUser() { return mapUser(currentUserObj()); }

export async function isLoggedIn() { return !!currentUserObj(); }

// ---------- 邮箱密码 ----------
export async function login(email, password) {
  try {
    await Bmob.User().login(email, password);
  } catch (e) { throw new Error(authErrorMessage(e)); }
  return { user: mapUser(currentUserObj()) };
}

export async function register(email, password) {
  try {
    const u = Bmob.User();
    u.set('username', email);
    u.set('email', email);
    u.set('password', password);
    await u.register({ username: email, email, password });
  } catch (e) { throw new Error(authErrorMessage(e)); }
  return { user: mapUser(currentUserObj()) };
}

export async function resendConfirmation(email) {
  return requestEmailVerify(email);
}

export async function resetPassword(email) {
  try {
    await Bmob.requestPasswordReset({ email });
  } catch (e) { throw new Error(authErrorMessage(e)); }
  return { ok: true };
}

async function requestEmailVerify(email) {
  try {
    await Bmob.User().requestEmailVerify(email);
  } catch (e) { throw new Error(authErrorMessage(e)); }
  return { ok: true };
}

// ---------- 验证码（Bmob 不支持邮箱验证码登录，改为发送重置邮件提示） ----------
export async function sendCode(email) {
  try {
    await Bmob.requestPasswordReset({ email });
  } catch (e) { throw new Error(authErrorMessage(e)); }
  return { ok: true };
}

export async function loginWithCode(email) {
  throw new Error('该登录方式暂不可用，请使用邮箱密码登录');
}

// ---------- GitHub OAuth（Bmob 需后台配置，暂不支持） ----------
export async function signInWithGitHub() {
  throw new Error('GitHub 登录暂未开放，请使用邮箱密码登录');
}

// ---------- 更新资料 / 密码 ----------
export async function updateProfile(meta) {
  try { await Bmob.User().upInfo(meta); } catch (e) { throw new Error(authErrorMessage(e)); }
  return { user: mapUser(currentUserObj()) };
}

export async function changePassword(oldPassword, newPassword) {
  try { await Bmob.updateUserPassword({ oldPassword, newPassword }); } catch (e) { throw new Error(authErrorMessage(e)); }
  return { user: mapUser(currentUserObj()) };
}

// ---------- 退出 / 清理 ----------
export async function logout() { try { Bmob.User().logout(); } catch {} }

export function clearToken() { logout(); }

// ---------- 状态检查（兼容） ----------
export async function checkInit() { return { initialized: true, githubEnabled: false }; }
export async function fetchMe() { return getUser(); }
export async function completeGitHubLogin() { return false; }
export function subscribeAuth(cb) { return onAuthStateChange(cb); }

export default {
  getSession, onAuthStateChange, getToken, getUser, isLoggedIn,
  login, register, resendConfirmation, resetPassword, sendCode, loginWithCode,
  signInWithGitHub, logout, clearToken, checkInit, fetchMe,
  updateProfile, changePassword,
  completeGitHubLogin, subscribeAuth, authErrorMessage,
};
