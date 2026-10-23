import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthStore, mergeHealth, unpackHealth, parseHealthImport, importHealth, readingLabel, healthCsv, stable } from '../src/lib/health-records.js';
import { healthFixture } from './health-log-fixtures.mjs';
const a = healthFixture[0], b = healthFixture[1];
function fixture(value, options = {}) {
  const map = new Map(value === undefined ? [] : [['HealthBpData_test', typeof value === 'string' ? value : JSON.stringify(value)]]);
  const storage = { getItem:key => map.get(key) ?? null, setItem:(key,value) => map.set(key,value) };
  const store = new HealthStore({storage,key:'HealthBpData_test',now:()=>1000,...options});
  return {store,map,storage};
}
test('both historical shapes preserve identifiers, times, notes and unknown fields', () => {
  for (const value of [[a], {records:[a],custom:42}]) {
    const {store} = fixture(value);
    assert.deepEqual(store.payload.records,[a]);
    store.upsert({...a,sys:129},a.id);
    assert.deepEqual(store.payload.records[0].device,a.device);
    assert.equal(store.payload.records[0].time,a.time);
    assert.equal(store.payload.records[0].note,a.note);
    assert.equal(store.payload.records[0].id,a.id);
  }
});
test('first original snapshot is immutable across edits and deletions', () => {
  const original = JSON.stringify([a,b]),{store,map}=fixture(original);
  store.upsert({...a,sys:130},a.id); store.remove(b.id); store.upsert({...a,sys:131},a.id);
  assert.equal(map.get('HealthBpData_test.original-v1'),original);
  assert.deepEqual(store.backup().recovery.original,[a,b]);
});
test('empty or absent legacy cloud cannot delete local history', () => {
  for (const remote of [null,[],{records:[]}]) assert.deepEqual(mergeHealth([a,b],remote).records,[a,b]);
});
test('unversioned conflicting records are retained once, including after repeated sync', () => {
  const remote={...a,sys:155};
  const first=mergeHealth([a],[remote]);
  assert.equal(first.records.length,2);
  assert.ok(first.records.some(r=>r.sys===128));assert.ok(first.records.some(r=>r.sys===155));
  assert.equal(mergeHealth(first,[remote]).records.length,2);
});
test('legacy cloud arrays and cloud-only rows are merged, never replaced', async () => {
  let cloud=[b];
  const {store}=fixture([a],{cloud:{load:async()=>cloud,save:async value=>{cloud=value;}}});
  await store.sync();
  assert.deepEqual(store.payload.records,[a,b]);assert.deepEqual(cloud.records,[a,b]);
});
test('new edit wins over an in-flight older cloud read', async () => {
  let release;const held=new Promise(resolve=>{release=resolve;});let cloud={records:[a,b]},loads=0;
  const {store}=fixture([a],{cloud:{load:async()=>{if(++loads===1)await held;return cloud;},save:async value=>{cloud=value;}}});
  const sync=store.sync();store.upsert({...a,sys:133},a.id);release();await sync;
  assert.equal(store.payload.records.find(r=>r.id===a.id).sys,133);
  assert.ok(store.payload.records.some(r=>r.id===b.id));assert.equal(cloud.records.find(r=>r.id===a.id).sys,133);
  assert.deepEqual(store.backup().recovery.cloudOriginal,{records:[a,b]});
});
test('saves are serialized and edits during a save get a second merged write', async () => {
  let release;const held=new Promise(resolve=>{release=resolve;});let cloud=null,active=0,maximum=0,saves=0;
  const {store}=fixture([a],{cloud:{load:async()=>cloud,save:async value=>{active++;maximum=Math.max(active,maximum);if(++saves===1)await held;cloud=value;active--;}}});
  const sync=store.sync();await new Promise(resolve=>setTimeout(resolve,0));
  store.upsert(b);release();await sync;
  assert.equal(maximum,1);assert.equal(saves,2);assert.equal(cloud.records.length,2);
});
test('failed cloud saves leave local edits intact and retry does not duplicate them', async () => {
  let fail=true,cloud={records:[a]};
  const {store,map}=fixture([a],{cloud:{load:async()=>cloud,save:async value=>{if(fail)throw Error('offline');cloud=value;}}});
  store.upsert(b);await store.sync();assert.equal(store.status,'error');assert.equal(JSON.parse(map.get(store.key)).records.length,2);
  fail=false;await store.sync();assert.equal(store.status,'synced');assert.equal(cloud.records.length,2);
});
test('failed load never uploads local data over an unknown cloud history', async () => {
  let saves=0;const {store}=fixture([a],{cloud:{load:async()=>{throw Error('unavailable');},save:async()=>{saves++;}}});
  store.upsert(b);await store.sync();assert.equal(store.payload.records.length,2);assert.equal(saves,0);
});
test('explicit deletion syncs, persists after reload, and can be undone', async () => {
  let cloud={records:[a,b]};const api={load:async()=>cloud,save:async value=>{cloud=value;}};
  const {store,storage}=fixture([a,b],{cloud:api});await store.sync();store.remove(a.id);await store.sync();
  assert.equal(cloud.records.length,1);
  const reopened=new HealthStore({storage,key:store.key,cloud:api,now:()=>2000});await reopened.sync();
  assert.equal(reopened.payload.records.length,1);reopened.upsert(a);await reopened.sync();
  assert.deepEqual(cloud.records.find(r=>r.id===a.id),a);
});
test('JSON import merges, skips exact duplicates and preserves conflicting values', () => {
  const changed={...a,note:'另一个设备的备注'}, extra={...b,id:'new-backup'};
  const imported=parseHealthImport(JSON.stringify([a,changed,extra]));const result=importHealth({records:[a]},imported);
  assert.equal(result.added,2);assert.equal(result.skipped,1);assert.equal(result.conflicts,1);
  assert.equal(result.payload.records.length,3);assert.equal(result.payload.records[0].note,a.note);
  assert.equal(importHealth(result.payload,imported).added,0);
});
test('backup restore ignores deletion markers and recovers removed records without removing current ones', () => {
  const {store}=fixture([a,b]);store.remove(a.id);const backup=store.backup();
  const result=store.import({records:[a],_healthSync:{deleted:{[b.id]:999999}}});
  assert.equal(result.added,1);assert.equal(store.payload.records.length,2);
  assert.equal(backup.recovery.snapshots[0].value.records.length,2);
});
test('fresh account starts empty, never fabricates demo readings', () => {assert.deepEqual(fixture().store.payload.records,[]);});
test('corrupt local data stays unchanged and is exportable', async () => {
  const {store,map}=fixture('{broken json');assert.equal(store.loadError,true);
  assert.throws(()=>store.upsert(a));await store.sync();assert.equal(map.get(store.key),'{broken json');
  assert.equal(store.backup().recovery.original,'{broken json');
});
test('storage quota failure reports failure and does not mutate current records', () => {
  const {store,map,storage}=fixture([a]);storage.setItem=()=>{throw Error('quota');};
  assert.throws(()=>store.upsert(b),/quota/);assert.deepEqual(store.payload.records,[a]);assert.equal(map.get(store.key),JSON.stringify([a]));
});
test('account switch during cloud load cannot save or expose another account', async () => {
  let current=true,release,saves=0;const held=new Promise(resolve=>{release=resolve;});
  const {store,map}=fixture([a],{isCurrent:()=>current,cloud:{load:async()=>{await held;return {records:[b]};},save:async()=>{saves++;}}});
  const sync=store.sync();current=false;release();await sync;assert.equal(saves,0);assert.equal(map.get(store.key),JSON.stringify([a]));assert.throws(()=>store.upsert(b));
});
test('a second tab writing a new record is included in subsequent local saves', () => {
  const {store,map}=fixture([a]);map.set(store.key,JSON.stringify({records:[a,b]}));
  store.upsert({...a,sys:132});assert.equal(store.payload.records.length,2);assert.ok(store.payload.records.some(r=>r.id===b.id));
});
test('invalid imports leave records intact and CSV quotes embedded punctuation', () => {
  assert.throws(()=>parseHealthImport('{bad'));assert.throws(()=>parseHealthImport('{"records":[{"sys":"bad"}]}'));
  assert.throws(()=>unpackHealth({something:[]}));
  const csv=healthCsv([{...a,note:'备注含 "引号",逗号\n换行'}]);assert.ok(csv.includes('"备注含 ""引号"",逗号\n换行"'));assert.ok(csv.startsWith('\uFEFF'));
});
test('reading labels use the household reference without calling low readings normal', () => {
  assert.equal(readingLabel(135,80).kind,'high');assert.equal(readingLabel(120,85).kind,'high');
  assert.equal(readingLabel(80,50).text,'低于家庭参考线');assert.equal(readingLabel('',80).kind,'unknown');
});
test('full backup roundtrip preserves all original record fields', () => {
  const {store}=fixture({records:[a,b],custom:'keep'});store.upsert({...a,sys:134});
  const backup=JSON.stringify(store.backup());const imported=parseHealthImport(backup);
  assert.equal(stable(imported.records),stable(store.payload.records));assert.equal(imported.custom,'keep');
});
