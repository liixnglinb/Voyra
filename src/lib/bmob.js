/**
 * LocalHub 云端前端 · Bmob 后端封装
 * 使用 hydrogen-js-sdk 提供：数据表 CRUD + 会话。
 * 需在 Bmob 控制台手动创建表：user_data（字段 userKey/key/value）
 */
import Bmob from 'hydrogen-js-sdk';
import { BMOB_APPLICATION_ID, BMOB_REST_API_KEY } from './bmob-config';

export const USER_TABLE = 'user_data';

/** 环境变量是否已配置；缺失时云端功能自动降级为"本地模式"，页面不崩 */
export const BMOB_READY = Boolean(BMOB_APPLICATION_ID && BMOB_REST_API_KEY);

if (BMOB_READY) {
  Bmob.initialize(BMOB_APPLICATION_ID, BMOB_REST_API_KEY);
} else if (import.meta.env.DEV) {
  console.warn('[Voyra] 未配置 Bmob 环境变量（VITE_BMOB_APPLICATION_ID / VITE_BMOB_REST_API_KEY），云端功能已降级为本地模式。请复制 .env.example 为 .env.local 并填入真实值。');
}

/** 当前登录用户 objectId；未登录返回 null */
export function currentUserId() {
  try {
    const u = Bmob.User.current ? Bmob.User.current() : null;
    return (u && (u.objectId || u.id)) || null;
  } catch {
    return null;
  }
}

export default Bmob;
