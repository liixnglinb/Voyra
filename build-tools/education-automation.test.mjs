import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HUHST,chooseEducationNetwork,mergeEducationWeeks,activeJob,allowedSchoolURL,allowedReturnOrigin,educationTimetableLink} from '../src/lib/education-automation.js';
import {parseEducationRows} from '../src/lib/education-import.js';
test('real school login response keeps intranet; elapsed login time is irrelevant',async()=>{
  const result=await chooseEducationNetwork(async url=>({status:200,text:'湖南人文科技学院 教务系统 <input type="password">',url}));
  assert.equal(result.network,'campus');assert.equal(result.url,HUHST.intranet);
});
for(const [name,request]of [
  ['network failure',async()=>{throw Error('offline');}],['timeout',async()=>{throw Error('timeout');}],
  ['captive portal',async()=>({status:200,text:'登录校园宽带',url:'http://portal.invalid/'})],
  ['HTTP error',async()=>({status:503,text:'教务系统',url:HUHST.intranet})],
])test(`${name} selects external VPN exactly once`,async()=>{let calls=0;const route=await chooseEducationNetwork(async url=>{calls++;return request(url);});assert.equal(calls,1);assert.equal(route.url,HUHST.vpn);});
test('cancellation never triggers VPN fallback',async()=>{const controller=new AbortController();await assert.rejects(chooseEducationNetwork(async()=>{controller.abort();throw Error('stopped');},controller.signal));});
test('weekly rows use only the observed week, never invent a 1–16 semester',()=>{
  const rows=[['节次','星期一','星期二','星期三'],['1-2','高等数学\n教师：王老师\n教室：致远-120','','']];
  assert.deepEqual(parseEducationRows(rows,{week:8})[0].periods,[{day:1,slot:'1-2',f:8,t:8,type:'every'}]);
  assert.throws(()=>parseEducationRows(rows,{requireWeeks:true}),/没有周次/);
});
test('merge retains sparse weeks, different rooms and original metadata',()=>{
  const row=(week,room='A101')=>({name:'高等数学',teacher:'李老师',room,note:'带计算器',periods:[{day:4,slot:'1-2',f:week,t:week,type:'every'}]});
  const batches=[[row(1)],[row(2)],[row(4)],[row(4)],[row(5,'B201')]],before=structuredClone(batches);
  const result=mergeEducationWeeks(batches);assert.equal(result.length,2);assert.deepEqual(result[0].periods.map(p=>[p.f,p.t]),[[1,2],[4,4]]);assert.equal(result[1].room,'B201');assert.deepEqual(batches,before);
});
test('job IDs, return origin, school URL and TTL are bounded',()=>{
  const job={id:'a'.repeat(32),created:Date.now(),returnOrigin:'https://lxlrwxs.top'};assert.ok(activeJob(job));
  assert.ok(!activeJob({...job,created:Date.now()-3600001}));assert.ok(!activeJob({...job,id:'guessable'}));assert.ok(!activeJob({...job,returnOrigin:'https://evil.test'}));
  assert.equal(allowedSchoolURL('http://10.1.1.149.attacker.test/jsxsd'),false);assert.equal(allowedSchoolURL('javascript:alert(1)'),false);assert.equal(allowedReturnOrigin('http://127.0.0.1.evil:5173'),false);
});
test('the named overseas preview is supported without allowing arbitrary return sites',()=>{
 assert.ok(allowedReturnOrigin('https://voyra-overseas.edgeone.dev'));assert.ok(!allowedReturnOrigin('https://evil.edgeone.dev'));assert.ok(!allowedReturnOrigin('https://voyra-overseas.edgeone.dev.evil.test'));
});
test('student homepage menus resolve only read-only personal timetable links',()=>{
 const node=attrs=>({textContent:'我的课表',closest:()=>null,getAttribute:key=>attrs[key]||null});
 const doc=nodes=>({location:{href:'http://10.1.1.149/jsxsd/framework/xsMain.htmlx'},querySelectorAll:()=>nodes});
 assert.equal(educationTimetableLink([doc([node({'data-url':'/jsxsd/xskb/xskb_list.htmlx'})])]),'http://10.1.1.149/jsxsd/xskb/xskb_list.htmlx');
 assert.equal(educationTimetableLink([doc([node({onclick:"openMenu('/jsxsd/xskb/xskb_list.htmlx')"})])]),'http://10.1.1.149/jsxsd/xskb/xskb_list.htmlx');
 for(const href of['https://evil.test/jsxsd/xskb/list','javascript:alert(1)','/jsxsd/xskb/delete.do'])assert.equal(educationTimetableLink([doc([node({href})])]),null);
});
