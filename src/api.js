/* ============================================================
   LocalHub 云端前端 · API 层（Bmob 后端版）
   数据读写走 Bmob user_data 表（按用户隔离）。
   接口签名与原 electronAPI 一致，页面代码无需改动。
   ============================================================ */
import Bmob, { currentUserId, USER_TABLE } from './lib/bmob';

async function requireUid() {
  // 去掉登录门禁后，先用固定本地 ID 隔离数据，后续要上线可恢复真实用户体系
  const uid = currentUserId();
  return uid || 'local-user';
}

async function findRow(uid, key) {
  const q = Bmob.Query(USER_TABLE);
  q.equalTo('userKey', '==', uid);
  q.equalTo('key', '==', key);
  q.limit(1);
  const rows = await q.find();
  return rows && rows[0] ? rows[0] : null;
}

export async function saveData(key, value) {
  const uid = await requireUid();
  const row = await findRow(uid, key);
  const q = Bmob.Query(USER_TABLE);
  if (row && row.objectId) { q.set('id', row.objectId); }
  q.set('userKey', uid);
  q.set('key', key);
  q.set('value', JSON.stringify(value));
  await q.save();
  return { ok: true };
}

export async function loadData(key) {
  const uid = await requireUid();
  const row = await findRow(uid, key);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value || null; }
}

export async function deleteData(key) {
  const uid = await requireUid();
  const row = await findRow(uid, key);
  if (row && row.objectId) { const q = Bmob.Query(USER_TABLE); await q.destroy(row.objectId); }
  return { ok: true };
}

// ============ 外部链接（浏览器新标签打开） ============
export async function openExternal(url) {
  if (!url) return null;
  window.open(url, '_blank', 'noopener,noreferrer');
  return null;
}

// ============ 网站图标（第三方 favicon 服务，国内可达） ============
export async function fetchFavicon(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return { ok: true, data: `https://favicon.im/${u.hostname}?larger=true` };
  } catch {
    return null;
  }
}

// ============ 系统信息（云端版本简化为浏览器信息） ============
export async function systemInfo() {
  const cpus = navigator.hardwareConcurrency || 4;
  const mem = (navigator && navigator.deviceMemory) || 8;
  return {
    electronVersion: 'web', cpus,
    freemem: mem * 1024 ** 3,
    platform: navigator.platform || 'web',
  };
}

// ============ 云端不可用能力（原 Electron 专属） ============
export async function detectFfmpeg() { return null; }
export async function getVideoWorkflowPath() { return null; }
export async function openFolderDialog() { return null; }
export async function openFilesDialog() { return null; }
export async function saveFileDialog() { return null; }

// ============ 思维导图（浏览器直接访问独立前端文件） ============
export async function mindmapStart() { return { ready: true, port: -1, url: '/mindmap-app/' }; }
export async function mindmapStatus() { return { ready: true, port: -1, url: '/mindmap-app/' }; }
export async function canvasStatus() { return { ready: true, port: -1, url: '/canvas' }; }

export const electronAPI = {
  saveData, loadData, deleteData, openExternal, fetchFavicon,
  systemInfo, detectFfmpeg, getVideoWorkflowPath,
  openFolderDialog, openFilesDialog, saveFileDialog,
  mindmapStart, mindmapStatus, canvasStatus,
};

export default electronAPI;
