import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {parseEducationTable,readEducationFile,decodeEducationText} from '../src/lib/education-import.js';
const header=['课程名称','教师','星期','节次','周次','教室'];
const row=['线性代数','张老师','星期二','3-4节','3,5,9','致远-101'];
test('list exports preserve sparse weeks, teacher, room and numeric weekdays',()=>{
 const [course]=parseEducationTable([header,row]);assert.equal(course.teacher,'张老师');assert.equal(course.room,'致远-101');assert.deepEqual(course.periods.map(p=>p.f),[3,5,9]);assert.ok(course.periods.every(p=>p.t===p.f&&p.day===2&&p.slot==='3-4'));
 const [numeric]=parseEducationTable([header,['大学英语','王老师',4,'1-2节、3-4节','2-20周（双）','播馨-304']]);assert.equal(numeric.periods.length,2);assert.ok(numeric.periods.every(p=>p.day===4&&p.type==='even'&&p.t===20));
});
test('grid exports preserve explicit weeks and reject missing or partly unsupported weeks',()=>{
 const rows=[['节次','周一','周二','周三'],['1-2','高等数学\n教师：王老师\n教室：致远-120\n1-20周','','']];assert.equal(parseEducationTable(rows)[0].periods[0].t,20);
 for(const weeks of ['', '1-18,21周'])assert.throws(()=>parseEducationTable([rows[0],['1-2','高等数学\n'+weeks,'','']]),/周次/);
});
test('a malformed course cannot silently disappear from a list import',()=>{
 assert.throws(()=>parseEducationTable([header,row,['第二门课','老师','未知','1-2节','1-18','A101']]),/星期或节次/);
 assert.throws(()=>parseEducationTable([header,row,['第二门课','老师','周三','1-2节','','A101']]),/没有周次/);
});
function workbookFile(sheets){const book=XLSX.utils.book_new();for(const [name,rows]of sheets)XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),name);return new File([XLSX.write(book,{type:'array',bookType:'xlsx'})],'学校课表.xlsx');}
test('all workbook sheets are parsed before exposing a result, with real sheet progress',async()=>{
 const progress=[],result=await readEducationFile(workbookFile([['第一张课表',[header,row]],['第二张课表',[header,['大学英语','刘老师','周四','5-6节','1-18','播馨-304']]]]),p=>progress.push(p));assert.equal(result.courses.length,2);assert.equal(result.sheets,2);assert.deepEqual(progress.filter(p=>p.phase==='parsing').map(p=>p.done),[0,1,1,2]);
 await assert.rejects(readEducationFile(workbookFile([['已识别',[header,row]],['缺少周次',[header,['第二门课','老师','周三','1-2节','','A101']]]])),/没有周次/);
});
test('TSV files retain multiline cells and legacy text encoding is decoded locally',async()=>{
 const file=new File(['节次\t周一\t周二\t周三\n1-2\t"英语\n刘老师\n播馨-304\n2-18周（双）"\t\t'],'课表.tsv');const result=await readEducationFile(file);assert.equal(result.courses[0].periods[0].type,'even');assert.equal(result.courses[0].teacher,'刘老师');
 const bytes=new Uint8Array([...new TextEncoder().encode('<meta charset="gb2312">'),0xd6,0xdc]);assert.ok(decodeEducationText(bytes).endsWith('周'));
 await assert.rejects(readEducationFile({name:'大文件.xlsx',size:8*1024*1024+1}),/8 MB/);
});
