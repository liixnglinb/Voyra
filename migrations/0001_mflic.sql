-- ModelFlow 授权服务 D1 初始化
-- Cloudflare 控制台 → Workers & Pages → voyra → 设置 → Functions → D1 数据库绑定：
--   1) 新建 D1 数据库（建议名 mflic）
--   2) 在 D1 控制台执行本文件（或用 wrangler d1 execute mflic --file=migrations/0001_mflic.sql）
--   3) 回到 Pages 项目绑定，变量名填 DB，选刚建的库
-- 注：Functions 首次被调用时会自动建表（幂等，见 functions/_mf.js 的 ensure()），
--     但**不会**播种任何授权码——固定码写在源码里等于公开，授权码一律通过管理后台
--     setup → 登录 → gen 生成（明文只在生成当次返回，库里存 SHA-256 哈希）。
--     本文件用于手动建表初始化，不再包含任何授权码。

CREATE TABLE IF NOT EXISTS codes(
  code       TEXT PRIMARY KEY,      -- 5 位授权码
  note       TEXT DEFAULT '',       -- 备注（发给谁/用途）
  is_admin   INTEGER DEFAULT 0,     -- 1=管理员码（不限机、不绑定）
  bound_mid  TEXT DEFAULT '',       -- 绑定的机器指纹
  bound_at   TEXT DEFAULT '',       -- 绑定时间
  revoked    INTEGER DEFAULT 0,     -- 1=已吊销
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS meta(
  k TEXT PRIMARY KEY,
  v TEXT
);

-- 历史上本文件曾明文插入 5 个初始授权码，随公开仓库暴露。
-- 已从当前版本移除（旧值仍在 git 历史中，视为已公开）。
-- 若你的 D1 里已经播种过那批码，请立即吊销，避免被继续使用：
--   UPDATE codes SET revoked=1 WHERE note='初始授权码';
-- 或登录管理后台（/modelflow/api/admin）逐条 revoke。
