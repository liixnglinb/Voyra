/* ============================================================
   LocalHub 云端前端 · API 层（Bmob 后端版）
   数据读写走 Bmob user_data 表（按用户隔离）。
   接口签名与原 electronAPI 一致，页面代码无需改动。
   ============================================================ */
import { USER_TABLE, BMOB_READY } from './lib/bmob';
import { currentUid } from './lib/auth';
import { accountCloudQuery, ensureDeviceSession, sessionRequest } from './lib/device-session';
import { createScheduleCloud, SCHEDULE_CLOUD_KEY } from './lib/schedule-cloud';

const scheduleClouds=new Map();
function scheduleCloud(expectedUid){
  const uid=currentUid();
  const assertCurrent=()=>{
    if(!uid||currentUid()!==uid||(expectedUid&&expectedUid!==uid)){
      const error=Error('请重新登录以恢复云端同步，本机课表已保留。');error.code='AUTH_REQUIRED';throw error;
    }
  };
  assertCurrent();
  if(!scheduleClouds.has(uid))scheduleClouds.set(uid,createScheduleCloud({Bmob:{Query:accountCloudQuery(uid)},uid,storage:localStorage,assertCurrent}));
  return scheduleClouds.get(uid);
}

/* 云端未配置（缺环境变量）时快速失败，调用方已有 catch，页面自动降级为本地模式 */
function ensureCloud() {
  if (!BMOB_READY) throw new Error('Bmob 环境变量未配置，云端功能不可用');
}

async function requireUid() {
  const uid=currentUid();
  if(!uid)throw Object.assign(Error('请登录后同步，本机数据已保留。'),{code:'AUTH_REQUIRED'});
  return uid;
}

async function findRow(uid, key) {
  const q = accountCloudQuery(uid)(USER_TABLE);
  q.equalTo('userKey', '==', uid);
  q.equalTo('key', '==', key);
  q.limit(1);
  const rows = await q.find();
  return rows && rows[0] ? rows[0] : null;
}

export async function saveData(key, value, options={}) {
  ensureCloud();
  if(key===SCHEDULE_CLOUD_KEY)return scheduleCloud(options.uid).save(value);
  const uid = await requireUid();
  const row = await findRow(uid, key);
  const q = accountCloudQuery(uid)(USER_TABLE);
  if (row && row.objectId) { q.set('id', row.objectId); }
  q.set('userKey', uid);
  q.set('key', key);
  q.set('value', JSON.stringify(value));
  // The server sets account ownership and a private ACL from the verified device session.
  await q.save();
  return { ok: true };
}

export async function loadData(key, options={}) {
  ensureCloud();
  if(key===SCHEDULE_CLOUD_KEY)return scheduleCloud(options.uid).load();
  const uid = await requireUid();
  const row = await findRow(uid, key);
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return row.value || null; }
}

export async function deleteData(key) {
  ensureCloud();
  const uid = await requireUid();
  const row = await findRow(uid, key);
  if (row && row.objectId) { const token=await ensureDeviceSession(uid); await sessionRequest('/cloud-data',{action:'delete',key,objectId:row.objectId},token); }
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
