import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { buildSpecMarkdown, COMMON_RULES, SOFTWARE_SPECS, STATE_MATRIX, UI_SECTIONS } from '../src/data/software-ui-spec.js';

test('Seven dimensions and five products have concrete rules and acceptance checks',()=>{
  assert.equal(UI_SECTIONS.length,7);
  assert.equal(SOFTWARE_SPECS.length,5);
  assert.equal(new Set(SOFTWARE_SPECS.map((x)=>x.id)).size,5);
  for (const object of [{rules:COMMON_RULES},...SOFTWARE_SPECS]) {
    assert.deepEqual(Object.keys(object.rules),UI_SECTIONS.map((s)=>s.id));
    for (const section of UI_SECTIONS) for(const item of object.rules[section.id]) {
      assert.ok(item.name.length>1);
      assert.ok(item.rule.length>12);
      assert.ok(item.check.length>5);
    }
  }
});
test('Each product has all dimensions, a navigation inventory and edge-case checklist',()=>{
  for(const p of SOFTWARE_SPECS){
    assert.ok(p.nav.length>=4);
    assert.ok(p.acceptance.length>=6);
    assert.equal(Object.values(p.rules).flat().length,14);
  }
});
test('Every product download route resolves to a real landing page',async()=>{
  for(const p of SOFTWARE_SPECS) await access(new URL(`../public${p.route}index.html`,import.meta.url));
});
test('State matrix covers six primitives in eight states',()=>{
  assert.equal(STATE_MATRIX.length,6);
  STATE_MATRIX.forEach((r)=>assert.equal(r.length,9));
});
test('Exports inherit the platform baseline and only the selected product',()=>{
  for(const p of SOFTWARE_SPECS){
    const text=buildSpecMarkdown(p.id);
    assert.ok(text.includes('## 平台通用规范'));
    assert.ok(text.includes(`## ${p.name} · ${p.en}`));
    for(const other of SOFTWARE_SPECS.filter((x)=>x.id!==p.id)) assert.ok(!text.includes(`## ${other.name} · ${other.en}`));
    assert.ok(text.includes('不代表所有业务交互已实现'));
  }
});
test('The public spec has no secrets or local personal paths',()=>{
  const text=buildSpecMarkdown();
  assert.doesNotMatch(text,/(?:ghp_|gho_|sk-[A-Za-z0-9]|AKID[A-Za-z0-9]|BMOB_REST_KEY|COS_SECRET_KEY|C:\\Users\\|Desktop\\)/);
});
test('Generated Markdown is current',async()=>{
  const text=await readFile(new URL('../docs/voyra-software-ui-spec.md',import.meta.url),'utf8');
  assert.equal(text.replace(/\r\n/g,'\n'),buildSpecMarkdown());
});
test('All seven landing pages use shared assets exactly once',async()=>{
  for(const slug of ['modelflow','checkin','local-toolbox','billtrace','token-monitor','zenew','ai-chronicle']){
    const text=await readFile(new URL(`../public/${slug}/index.html`,import.meta.url),'utf8');
    assert.equal(text.split('landing-cards.css').length-1,1);
    assert.equal(text.split('landing-cards.js').length-1,1);
    assert.equal((text.match(/<div(?:\s|>)/g)||[]).length,(text.match(/<\/div>/g)||[]).length,`${slug}: div balance`);
  }
});
test('Shared motion obeys reduced-motion and forced-colors settings',async()=>{
  for(const name of ['../public/design-system/voyra-foundation.css','../public/design-system/landing-cards.css','../design-system/software-base.css','../src/styles/dashboard-cards.css','../src/styles/design-system.css']){
    const text=await readFile(new URL(name,import.meta.url),'utf8');
    assert.ok(text.includes('prefers-reduced-motion'));
    if(!name.includes('foundation'))assert.ok(text.includes('forced-colors'));
  }
});
test('Public website no longer exposes the software UI specification',async()=>{
  const app=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8');
  const home=await readFile(new URL('../src/pages/Dashboard.jsx',import.meta.url),'utf8');
  assert.ok(!app.includes('path="/design-system"'));
  assert.ok(!home.includes('DesignSystemEntry'));
  assert.ok(!home.includes('软件 UI 规范'));
});
