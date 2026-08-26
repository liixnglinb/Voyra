import { writeFile } from 'node:fs/promises';

const root = new URL('../public/mindmap-app/', import.meta.url);

/* 源文件（mindmap.css / mindmap-app.js / mindmap-bridge.js）已从 public 移除，
   min 版为最终产物，直接跳过压缩步骤以加速构建。 */
await writeFile(new URL('.minify-skipped', root), 'min versions are pre-built; sources removed 2026-08-26', 'utf8');
