#!/usr/bin/env node
/**
 * 安全推送（任意仓库通用）：先试 git push，被 443 掐时自动走 gh api 原子提交。
 *
 *   node scripts/git-push-safe.mjs [仓库目录] [分支]
 *
 * 为什么需要它：本机到 github.com:443 间歇性阻断（详见维护文档 §11.1），
 * 每次手搓 blobs→tree→commit→ref 既慢又容易写错。这里把整条路径固化，并带上
 * 与文档一致的强断言——任何一步对不上就停手，绝不覆盖别人的提交。
 *
 * 判据与安全线：
 *   - 远端分支头必须等于本地 HEAD 的父提交（否则非快进，直接停）
 *   - 两个 blob 的 SHA 必须与本地 git rev-parse HEAD:<path> 一致
 *   - 建出的 tree SHA 必须等于本地 HEAD^{tree}（这条过了就等于文件内容全对）
 *   - 移 ref 用 force:false，非快进会被 GitHub 自己拒绝
 *   - 内容取 git cat-file 的仓库规范字节（core.autocrlf=true 时工作区是 CRLF，直接读会算错 SHA）
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const REPO_DIR = path.resolve(process.argv[2] || process.cwd());
const git = (args, opts = {}) =>
  execFileSync('git', ['-C', REPO_DIR, ...args], { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });

/* gh 走 keyring 里的凭据，显式清掉可能劫持登录态的环境变量令牌 */
const cleanEnv = { ...process.env };
delete cleanEnv.GH_TOKEN;
delete cleanEnv.GITHUB_TOKEN;
const gh = (args, payload) =>
  execFileSync('gh', args, {
    encoding: 'utf8', maxBuffer: 1 << 28, env: cleanEnv,
    input: payload === undefined ? undefined : JSON.stringify(payload),
  });

const say = (s) => console.log(s);
const die = (s) => { console.error('✗ ' + s); process.exit(1); };

/* ── 0. 定位仓库与分支 ── */
let remoteUrl;
try { remoteUrl = git(['remote', 'get-url', 'origin']).trim(); } catch { die('这个目录没有 origin 远端'); }
const m = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
if (!m) die(`无法从远端地址解析 owner/repo：${remoteUrl}`);
const [, OWNER, REPO] = m;
const BRANCH = process.argv[3] || git(['rev-parse', '--abbrev-ref', 'HEAD']).trim();
const API = `repos/${OWNER}/${REPO}`;
say(`仓库 ${OWNER}/${REPO} · 分支 ${BRANCH}`);

/* ── 1. 先试常规 push ── */
try {
  execFileSync('git', ['-C', REPO_DIR, 'push', 'origin', BRANCH], { encoding: 'utf8', env: cleanEnv, stdio: 'pipe' });
  say('✓ git push 直接成功');
  process.exit(0);
} catch (e) {
  const msg = String(e.stderr || e.stdout || e.message).split('\n').filter(Boolean).slice(-1)[0] || '';
  say(`  git push 未通（${msg.slice(0, 80)}），改走 gh api 原子提交`);
}

/* ── 2. 取本地对象 ── */
const HEAD = git(['rev-parse', 'HEAD']).trim();
const PARENT = git(['rev-parse', `${HEAD}^`]).trim();
const BASE_TREE = git(['rev-parse', `${PARENT}^{tree}`]).trim();
const WANT_TREE = git(['rev-parse', `${HEAD}^{tree}`]).trim();

const remoteSha = gh(['api', `${API}/git/ref/heads/${BRANCH}`, '--jq', '.object.sha']).trim();
if (remoteSha !== PARENT) {
  die(`远端 ${BRANCH} = ${remoteSha.slice(0, 8)}，不是本地 HEAD 的父提交 ${PARENT.slice(0, 8)}。\n` +
      `  说明远端已前进（或本地分叉）——先 fetch 并按 §10.3 判读，别强推。`);
}
say(`✓ 快进安全：远端 ${BRANCH} == 父提交 ${PARENT.slice(0, 8)}`);

const files = git(['diff', '--name-only', `${PARENT}..${HEAD}`]).trim().split('\n').filter(Boolean);
if (!files.length) die('这次提交没有文件差异，无需推送');
say(`  待传 ${files.length} 个文件`);

/* ── 3. blobs（逐个校验 SHA）── */
const entries = [];
for (const p of files) {
  const want = git(['rev-parse', `${HEAD}:${p}`]).trim();
  const bytes = git(['cat-file', 'blob', `${HEAD}:${p}`], { encoding: 'buffer' });
  const res = JSON.parse(gh(['api', `${API}/git/blobs`, '--method', 'POST', '-H', 'Content-Type: application/json', '--input', '-'],
    { content: bytes.toString('base64'), encoding: 'base64' }));
  if (res.sha !== want) die(`${p} 的 blob SHA 对不上（远端 ${res.sha} / 本地 ${want}）`);
  entries.push({ path: p, mode: '100644', type: 'blob', sha: res.sha });
}
say(`✓ ${entries.length} 个 blob SHA 与本地一致`);

/* ── 4. tree（这条过了等于内容全对）── */
const tree = JSON.parse(gh(['api', `${API}/git/trees`, '--method', 'POST', '-H', 'Content-Type: application/json', '--input', '-'],
  { base_tree: BASE_TREE, tree: entries }));
if (tree.sha !== WANT_TREE) die(`tree SHA ${tree.sha} ≠ 本地 ${WANT_TREE}`);
say(`✓ tree 与本地 HEAD^{tree} 一致`);

/* ── 5. commit（用本地原始 message 字节，含尾换行）── */
const raw = git(['cat-file', 'commit', HEAD]);
const message = raw.slice(raw.indexOf('\n\n') + 2);
const ident = (k) => {
  const [name, email, date] = git(['show', '-s', `--format=%${k}n|%${k}e|%${k}I`, HEAD]).trim().split('|');
  return { name, email, date };
};
const commit = JSON.parse(gh(['api', `${API}/git/commits`, '--method', 'POST', '-H', 'Content-Type: application/json', '--input', '-'],
  { message, tree: tree.sha, parents: [PARENT], author: ident('a'), committer: ident('c') }));
const same = commit.sha === HEAD;
say(`✓ commit ${commit.sha.slice(0, 8)}${same ? '（与本地 SHA 完全相同）' : '（与本地不同）'}`);

/* ── 6. 移 ref ── */
const patched = JSON.parse(gh(['api', `${API}/git/refs/heads/${BRANCH}`, '--method', 'PATCH', '-H', 'Content-Type: application/json', '--input', '-'],
  { sha: commit.sha, force: false }));
say(`✓ ref ${BRANCH} → ${patched.object.sha.slice(0, 8)}`);

if (same) {
  say('✓ 本地与远端 SHA 一致，无需对齐');
} else {
  say('⚠ SHA 与本地不同，按维护文档 §11.1 用「精确字节复现提交对象 + update-ref」对齐本地');
  say(`  远端提交：${commit.sha}`);
}
