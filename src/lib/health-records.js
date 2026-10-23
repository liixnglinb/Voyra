// Keep HealthBpData_<uid> and health-bp-v1 compatible with existing clients.
// Optional metadata distinguishes explicit edits/deletions from a missing cloud row.
export const HEALTH_CLOUD_KEY = 'health-bp-v1';
const copy = value => JSON.parse(JSON.stringify(value));
export const stable = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.keys(v).sort().reduce((out, key) => { out[key] = v[key]; return out; }, {}) : v);
function hash(value) {
  let n = 2166136261;
  for (const ch of stable(value)) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
  return (n >>> 0).toString(36);
}
export const recordKey = record => String(record.id ?? `legacy-${hash(record)}`);
export function unpackHealth(value) {
  if (value == null) return { records: [], _healthSync: { modified: {}, deleted: {} } };
  const payload = Array.isArray(value) ? { records: value } : value;
  if (!payload || !Array.isArray(payload.records) || payload.records.some(r => !r || typeof r !== 'object' || Array.isArray(r))) {
    throw Error('记录格式无法识别，原数据已保留。请先导出备份。');
  }
  const meta = payload._healthSync || {};
  return { ...copy(payload), _healthSync: { version: 1, modified: { ...meta.modified }, deleted: { ...meta.deleted } } };
}
const stamp = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function maxMap(a, b) {
  const out = { ...a };
  for (const [key, value] of Object.entries(b || {})) out[key] = Math.max(stamp(out[key]), stamp(value));
  return out;
}

// A legacy cloud response, including [], never removes a local-only record.
// Unversioned conflicting values are retained as an identifiable second record.
export function mergeHealth(localValue, cloudValue) {
  const local = unpackHealth(localValue), cloud = unpackHealth(cloudValue);
  const modified = maxMap(local._healthSync.modified, cloud._healthSync.modified);
  const deleted = maxMap(local._healthSync.deleted, cloud._healthSync.deleted);
  const rows = new Map();
  const add = (record, revisions) => {
    const key = recordKey(record), revision = stamp(revisions[key]);
    if (stamp(deleted[key]) > 0 && stamp(deleted[key]) >= revision) return;
    const current = rows.get(key);
    if (!current) { rows.set(key, { record, revision }); return; }
    if (stable(current.record) === stable(record)) { current.revision = Math.max(current.revision, revision); return; }
    if (current.revision !== revision) {
      if (revision > current.revision) rows.set(key, { record, revision });
      return;
    }
    const conflict = { ...record, id: `${key}~${hash(record)}`, _healthConflictOf: key };
    const conflictKey = recordKey(conflict);
    if (!stamp(deleted[conflictKey])) rows.set(conflictKey, { record: conflict, revision });
  };
  local.records.forEach(r => add(r, local._healthSync.modified));
  cloud.records.forEach(r => add(r, cloud._healthSync.modified));
  return { ...cloud, ...local, records: [...rows.values()].map(v => v.record), _healthSync: { version: 1, modified, deleted } };
}

export function importHealth(current, incoming) {
  const records = unpackHealth(incoming).records;
  // Imports add records. They never apply another device's deletion metadata.
  const base = unpackHealth(current);
  const result = copy(base);
  let added = 0, skipped = 0, conflicts = 0;
  for (const record of records) {
    const key = recordKey(record);
    if (result.records.some(r => stable(r) === stable(record))) { skipped++; continue; }
    let next = record;
    if (result.records.some(r => recordKey(r) === key)) {
      next = { ...record, id: `${key}~${hash(record)}`, _healthConflictOf: key };
      if (result.records.some(r => stable(r) === stable(next))) { skipped++; continue; }
      conflicts++;
    }
    result.records.push(next);
    added++;
  }
  return { payload: result, added, skipped, conflicts };
}

export function parseHealthImport(text) {
  const parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  const payload = unpackHealth(parsed);
  for (const r of payload.records) {
    if (!['sys', 'dia', 'hr'].every(k => r[k] !== '' && Number.isFinite(Number(r[k])) && Number(r[k]) > 0)
      || !r.time || !Number.isFinite(new Date(r.time).getTime())) throw Error('备份中有无效的读数或测量时间，未导入任何记录。');
  }
  return payload;
}

export function readingLabel(sys, dia) {
  if (![sys, dia].every(v => v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) > 0)) return { kind: 'unknown', text: '待补充读数' };
  if (Number(sys) >= 135 || Number(dia) >= 85) return { kind: 'high', text: '高于家庭参考线' };
  return { kind: 'neutral', text: '低于家庭参考线' };
}
export function healthCsv(records) {
  const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return '\uFEFF' + [
    ['测量时间', '时段', '收缩压(mmHg)', '舒张压(mmHg)', '心率(bpm)', '脉压差(mmHg)', '备注'],
    ...records.map(r => [r.time, r.period, r.sys, r.dia, r.hr, Number(r.sys) - Number(r.dia), r.note]),
  ].map(row => row.map(cell).join(',')).join('\r\n');
}

/** One account's store. All cloud operations are serialized and account checked. */
export class HealthStore {
  constructor({ storage, key, cloud, isCurrent = () => true, now = () => Date.now() }) {
    Object.assign(this, { storage, key, cloud, isCurrent, now });
    this.listeners = new Set();
    this.running = null;
    this.status = 'local';
    this.error = '';
    this.generation = 0;
    this.loadError = false;
    try { this.payload = unpackHealth(JSON.parse(storage.getItem(key) || 'null')); }
    catch (e) { this.payload = unpackHealth(null); this.loadError = true; this.error = e.message; this.status = 'error'; }
  }
  snapshot() { return { records: this.payload.records, status: this.status, error: this.error }; }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach(fn => fn(this.snapshot())); }
  saveLocal(next) {
    if (!this.isCurrent()) throw Error('账号已切换，请重新打开血压记录。');
    if (this.loadError) throw Error('原记录无法读取，请先在数据管理中导出原始备份。');
    // The first original snapshot is immutable. Failure to back it up aborts the write.
    const raw = this.storage.getItem(this.key);
    if (raw !== null && this.storage.getItem(`${this.key}.original-v1`) === null) this.storage.setItem(`${this.key}.original-v1`, raw);
    this.storage.setItem(this.key, JSON.stringify(next));
    this.payload = next;
  }
  archive(value, reason) {
    if (!this.isCurrent()) throw Error('账号已切换，请重新打开血压记录。');
    const key = `${this.key}.recovery-v1`;
    const entries = JSON.parse(this.storage.getItem(key) || '[]');
    if (entries.at(-1)?.value && stable(entries.at(-1).value) === stable(value)) return;
    this.storage.setItem(key, JSON.stringify([...entries, { time: this.now(), reason, value }].slice(-8)));
  }
  revision() {
    return Math.max(this.now(), ...Object.values(this.payload._healthSync.modified).map(stamp), ...Object.values(this.payload._healthSync.deleted).map(stamp)) + 1;
  }
  upsert(record, previousKey = null) {
    const next = copy(this.payload), key = recordKey(record), revision = this.revision();
    this.archive(this.payload, '修改前');
    next.records = next.records.filter(r => recordKey(r) !== key && recordKey(r) !== previousKey);
    next.records.push(record);
    next._healthSync.modified[key] = revision;
    delete next._healthSync.deleted[key];
    if (previousKey && previousKey !== key) next._healthSync.deleted[previousKey] = revision;
    this.commit(next);
  }
  remove(key) {
    const next = copy(this.payload);
    this.archive(this.payload, '删除前');
    next.records = next.records.filter(r => recordKey(r) !== key);
    next._healthSync.deleted[key] = this.revision();
    this.commit(next);
  }
  import(value) {
    const result = importHealth(this.payload, value);
    if (!result.added) return result;
    this.archive(this.payload, '导入前');
    const existing = new Set(this.payload.records.map(recordKey)), revision = this.revision();
    for (const r of result.payload.records) if (!existing.has(recordKey(r))) {
      result.payload._healthSync.modified[recordKey(r)] = revision;
      delete result.payload._healthSync.deleted[recordKey(r)];
    }
    this.commit(result.payload);
    return result;
  }
  commit(next) {
    // Include changes made by another tab since this view was opened.
    const disk = unpackHealth(JSON.parse(this.storage.getItem(this.key) || 'null'));
    this.saveLocal(mergeHealth(next, disk)); // A failed local write must not report success.
    this.generation++;
    this.error = '';
    this.status = this.cloud ? 'saving' : 'local';
    this.emit();
    this.sync();
  }
  sync() {
    if (this.running) return this.running;
    if (!this.cloud || !this.isCurrent() || this.loadError) return Promise.resolve();
    this.running = this.reconcile().finally(() => { this.running = null; });
    return this.running;
  }
  async reconcile() {
    this.status = 'syncing'; this.error = ''; this.emit();
    try {
      // Re-read before every save, merging any local edits made while awaiting cloud.
      while (this.isCurrent()) {
        const remote = await this.cloud.load();
        if (!this.isCurrent()) return;
        if (remote != null && this.storage.getItem(`${this.key}.cloud-original-v1`) === null) {
          this.storage.setItem(`${this.key}.cloud-original-v1`, JSON.stringify(remote));
        }
        const next = mergeHealth(this.payload, remote);
        if (stable(next) !== stable(this.payload)) {
          this.archive(this.payload, '同步前本机');
          if (remote != null) this.archive(remote, '同步前云端');
          this.saveLocal(next);
          this.emit();
        }
        const generation = this.generation;
        if (stable(next) !== stable(unpackHealth(remote))) {
          if (remote != null) this.archive(remote, '云端写入前');
          this.status = 'saving'; this.emit();
          await this.cloud.save(copy(next));
          if (!this.isCurrent()) return;
        }
        if (generation === this.generation) break;
      }
      if (this.isCurrent()) { this.status = 'synced'; this.emit(); }
    } catch (e) {
      if (this.isCurrent()) { this.status = 'error'; this.error = e.message || '云端暂时不可用，本机记录已保留。'; this.emit(); }
    }
  }
  backup() {
    const parse = raw => { try { return JSON.parse(raw); } catch { return raw; } };
    return { ...this.payload, exportedAt: new Date(this.now()).toISOString(),
      recovery: { original: parse(this.storage.getItem(`${this.key}.original-v1`) || this.storage.getItem(this.key)),
        cloudOriginal: parse(this.storage.getItem(`${this.key}.cloud-original-v1`)),
        snapshots: parse(this.storage.getItem(`${this.key}.recovery-v1`) || '[]') } };
  }
}
