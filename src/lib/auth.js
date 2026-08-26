/* ============================================================
   统一登录 · 认证服务（Bmob 用户体系）
   - 登录态：localStorage 持久化（SESSION_DAYS 天免登录）
   - 数据保留：RETENTION_DAYS 天未登录 → 下次登录时自动清除该账号数据
   - 登录一个 = 日程中心 / 思维导图 / 宝宝护理 全部登录
   ============================================================ */
import Bmob, { USER_TABLE } from './bmob';

const SESSION_KEY = 'voyra_session_v1';
const META_KEY = '_meta';

export const RETENTION_DAYS = 180;   // 数据保留期
export const SESSION_DAYS = 30;      // 登录有效期

/** 读取当前会话（自动校验 30 天过期） */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.uid) return null;
    if (Date.now() > s.expiresAt) {
      clearSession();
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

/** 是否已登录 */
export function isAuthed() {
  return !!getSession();
}

/** 当前用户 id；未登录返回 null */
export function currentUid() {
  const s = getSession();
  return s ? s.uid : null;
}

/** 退出登录 */
export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  try { Bmob.User.logout(); } catch { /* ignore */ }
}

/** 按用户隔离的本地存储 key（日程中心 / 思维导图用） */
export function userKey(base) {
  const uid = currentUid();
  return uid ? `${base}_${uid}` : `${base}_local`;
}

function setSession(user) {
  const uid = (user && (user.objectId || user.id)) || null;
  if (!uid) return null;
  const s = {
    uid,
    username: user.username || '',
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_DAYS * 864e5,
  };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  return s;
}

async function findRow(uid, key) {
  try {
    const q = Bmob.Query(USER_TABLE);
    q.equalTo('userKey', '==', uid);
    q.equalTo('key', '==', key);
    q.limit(1);
    const rows = await q.find();
    return rows && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}

async function readMeta(uid) {
  const row = await findRow(uid, META_KEY);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return {}; }
}

async function writeMeta(uid, meta) {
  try {
    const q = Bmob.Query(USER_TABLE);
    const row = await findRow(uid, META_KEY);
    if (row && row.objectId) q.set('id', row.objectId);
    q.set('userKey', uid);
    q.set('key', META_KEY);
    q.set('value', JSON.stringify(meta));
    await q.save();
  } catch { /* ignore */ }
}

/** 清除该账号的全部数据（保留期到期时调用） */
async function purgeUserData(uid) {
  try {
    const q = Bmob.Query(USER_TABLE);
    q.equalTo('userKey', '==', uid);
    const rows = await q.find();
    for (const row of rows || []) {
      try { await Bmob.Query(USER_TABLE).destroy(row.objectId); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

/** 登录：校验保留期 → 更新最后登录时间 → 建立会话 */
export async function login(username, password) {
  const user = await Bmob.User.login(username, password);
  const uid = user.objectId || user.id;
  // 超过保留期未登录 → 自动清除该账号数据
  const meta = await readMeta(uid);
  if (meta && meta.lastLoginAt && Date.now() - meta.lastLoginAt > RETENTION_DAYS * 864e5) {
    await purgeUserData(uid);
  }
  await writeMeta(uid, { lastLoginAt: Date.now() });
  setSession(user);
  return user;
}

/** 注册：建号即建会话 */
export async function register(username, password) {
  const user = await Bmob.User.register({ username, password });
  const uid = user.objectId || user.id;
  await writeMeta(uid, { lastLoginAt: Date.now() });
  setSession(user);
  return user;
}

/** 退出登录 */
export function logout() {
  clearSession();
}
