/**
 * LocalHub 云端前端 · Bmob 后端封装
 * 使用 hydrogen-js-sdk 提供：数据表 CRUD + 会话。
 * 需在 Bmob 控制台手动创建表：user_data（字段 userKey/key/value）
 */
import Bmob from 'hydrogen-js-sdk';
import { BMOB_APPLICATION_ID, BMOB_REST_API_KEY } from './bmob-config';

Bmob.initialize(BMOB_APPLICATION_ID, BMOB_REST_API_KEY);

export const USER_TABLE = 'user_data';

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
