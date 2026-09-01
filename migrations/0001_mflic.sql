-- ModelFlow 授权服务 D1 初始化
-- Cloudflare 控制台 → Workers & Pages → voyra → 设置 → Functions → D1 数据库绑定：
--   1) 新建 D1 数据库（建议名 mflic）
--   2) 在 D1 控制台执行本文件（或用 wrangler d1 execute mflic --file=migrations/0001_mflic.sql）
--   3) 回到 Pages 项目绑定，变量名填 DB，选刚建的库
-- 注：Functions 首次被调用时也会自动建表并播种以下 5 个码（幂等），本文件用于手动初始化。

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

INSERT OR IGNORE INTO codes(code,note,is_admin,created_at) VALUES
  ('H2DTH','初始授权码',0,'2026-09-01 00:00:00'),
  ('2FMGW','初始授权码',0,'2026-09-01 00:00:00'),
  ('NFE8H','初始授权码',0,'2026-09-01 00:00:00'),
  ('GX7VJ','初始授权码',0,'2026-09-01 00:00:00'),
  ('9GAQF','初始授权码',0,'2026-09-01 00:00:00');
