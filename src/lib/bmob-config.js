/**
 * Bmob 连接配置（从环境变量读取，避免硬编码密钥被安全扫描拦截）
 * 本地开发：在项目根目录创建 .env 文件，填入 VITE_BMOB_APPLICATION_ID 和 VITE_BMOB_REST_API_KEY
 * 线上部署：在 Cloudflare Pages 环境变量中配置同名变量
 */
export const BMOB_APPLICATION_ID = import.meta.env.VITE_BMOB_APPLICATION_ID || '';
export const BMOB_REST_API_KEY = import.meta.env.VITE_BMOB_REST_API_KEY || '';
