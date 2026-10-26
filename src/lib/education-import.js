// Preserve quoted multiline spreadsheet cells; a split('\n').split('\t') loses them.
export function parseTabularText(text){
  const rows=[];let row=[],cell='',quoted=false;
  const input=String(text||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"'&&(quoted||cell==='')){if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(ch==='\t'&&!quoted){row.push(cell);cell='';}
    else if(ch==='\n'&&!quoted){row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';}
    else cell+=ch;
  }
  row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
  return rows;
}
export function htmlTimetableRows(html,doc=document){
  const template=doc.createElement('template');template.innerHTML=String(html||'');
  const tables=[...template.content.querySelectorAll('table')];
  const table=tables.sort((a,b)=>(b.textContent.match(/(?:周|星期)[一二三四五六日天]/g)||[]).length-(a.textContent.match(/(?:周|星期)[一二三四五六日天]/g)||[]).length)[0];
  if(!table)return [];
  const rows=[];
  for(const [ri,tr]of[...table.rows].entries()){
    rows[ri]||=[];let ci=0;
    for(const cell of tr.cells){
      while(rows[ri][ci]!==undefined)ci++;
      const clone=cell.cloneNode(true);clone.querySelectorAll('script,style,img,iframe,[hidden],[style*="display: none"],[style*="display:none"]').forEach(el=>el.remove());
      clone.querySelectorAll('hr').forEach(el=>el.replaceWith(doc.createTextNode('\n\n')));
      clone.querySelectorAll('font[title]').forEach(el=>{
        if(/教师|老师/.test(el.title))el.prepend(doc.createTextNode('教师：'));
        else if(/教室|地点/.test(el.title))el.prepend(doc.createTextNode('教室：'));
      });
      clone.querySelectorAll('br').forEach(el=>el.replaceWith(doc.createTextNode('\n')));
      clone.querySelectorAll('div,p,li').forEach(el=>el.append(doc.createTextNode('\n')));
      const value=clone.textContent.replace(/\u00a0/g,' ').trim();
      for(let dr=0;dr<Math.min(30,cell.rowSpan||1);dr++){rows[ri+dr]||=[];for(let dc=0;dc<Math.min(20,cell.colSpan||1);dc++)rows[ri+dr][ci+dc]=value;}
      ci+=cell.colSpan||1;
    }
  }
  return rows.map(row=>Array.from({length:row.length},(_,i)=>row[i]||''));
}
const CN={一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,日:7,天:7};
const slotByNumber=n=>n<=2?'1-2':n<=4?'3-4':n<=6?'5-6':n<=8?'7-8':n<=10?'晚自习1':'晚自习2';
export function educationSlot(text){
  const value=String(text||'').replace(/\d{1,2}[:：]\d{2}(?:\s*[-—~至]\s*\d{1,2}[:：]\d{2})?/g,'').trim();
  if(/晚/.test(value))return /2|二/.test(value)?'晚自习2':'晚自习1';
  const chinese=value.match(/第([一二三四五六])大节/);if(chinese)return slotByNumber(CN[chinese[1]]*2);
  const period=value.match(/(?:第)?\s*(\d{1,2})(?:\s*[-—~至,，、]\s*\d{1,2})?\s*(?:节|$|[)）])/);
  return period&&Number(period[1])>=1&&Number(period[1])<=12?slotByNumber(Number(period[1])):null;
}
function weekPeriods(text,{week,requireWeeks=false}={}){
  if(week)return [{f:week,t:week,type:'every'}];
  const value=String(text||'').replace(/\[\s*周\s*\]|\(\s*\[?周\]?\s*\)/g,'周');
  const type=/[（(\[]\s*单(?:周)?\s*[)）\]]|单周/.test(value)?'odd':/[（(\[]\s*双(?:周)?\s*[)）\]]|双周/.test(value)?'even':'every';
  const group=value.match(/(?:第)?\s*(\d{1,2}(?:\s*[-—–~至到,，、]\s*\d{1,2})*)\s*周/);
  if(!group){if(requireWeeks)throw Error('部分课程没有周次，请切换到学期课表，或选择具体周次后重试。');return [{f:1,t:16,type}];}
  const result=[];
  for(const part of group[1].split(/[,，、]/)){
    const [f,t=f]=part.split(/[-—–~至到]/).map(v=>Number(v.trim()));
    if(f>=1&&t<=20&&f<=t)result.push({f,t,type});
  }
  if(!result.length&&requireWeeks)throw Error('课程周次超出 1–20 周，无法完整导入。');
  return result.length?result:[{f:1,t:16,type}];
}
export function parseEducationRows(rows,options={}){
  let header=-1,days=[];
  for(let i=0;i<rows.length;i++){
    const mapped=rows[i].map((cell,col)=>{const day=String(cell).trim().match(/^(?:星期|周)\s*([一二三四五六日天])(?:\s|$)/);return day?{col,day:CN[day[1]]}:null;}).filter(Boolean);
    if(mapped.length>=3){header=i;days=mapped;break;}
  }
  if(header<0)return [];
  const courses=[];const seen=new Set();
  for(let i=header+1;i<rows.length;i++){
    const row=rows[i],slot=row.slice(0,days[0].col).map(educationSlot).find(Boolean);if(!slot)continue;
    for(const {col,day}of days){
      const cell=String(row[col]||'').trim();if(!cell||/^(?:无|空|休息|午休|—|-)$/.test(cell))continue;
      // A blank line separates different courses occupying alternating weeks.
      const blocks=cell.split(/\n\s*\n+/).filter(Boolean);
      for(const block of blocks){
        const parts=block.replace(/<br\s*\/?>/gi,'\n').split(/\n|[；;]/).map(v=>v.trim()).filter(Boolean);
        const name=parts.find(v=>!/^\d{1,2}[:：]/.test(v)&&!/^\d+\s*[-—~,，至]\s*\d+\s*周/.test(v));
        if(!name||/^(?:星期|周)[一二三四五六日天]/.test(name))continue;
        let teacher='',room='';const note=[];
        for(const item of parts.slice(parts.indexOf(name)+1)){
          if(/\d\s*(?:周|\(\[?周|\[周)/.test(item)||/\d\s*[-—~至]\s*\d+.*周/.test(item))continue;
          if(!teacher&&/^(?:教师|老师|授课教师)[:：]/.test(item)){teacher=item.replace(/^(?:教师|老师|授课教师)[:：]\s*/,'');continue;}
          if(!room&&(/^(?:教室|地点|上课地点)[:：]/.test(item)||/楼|教室|体育馆|操场|球场|[A-Z]\d{3}|^\d+-\d{3}|^[\u4e00-\u9fa5]{1,6}-\d{3}/.test(item))){room=item.replace(/^(?:教室|地点|上课地点)[:：]\s*/,'');continue;}
          if(!teacher&&(/老师|教授|讲师|助教/.test(item)||/^[\u4e00-\u9fa5·]{2,5}$/.test(item))){teacher=item;continue;}
          note.push(item);
        }
        const periods=weekPeriods(block,options).map(weeks=>({day,slot,...weeks}));
        const signature=JSON.stringify({name,teacher,room,periods});if(seen.has(signature))continue;seen.add(signature);
        courses.push({id:`edu-${i}-${col}-${courses.length}`,name,teacher,room,note:note.join(' · '),periods});
      }
    }
  }
  return courses;
}

// File/paste imports require explicit weeks. They cannot prove that an unseen
// school week is empty, so they never invent a semester for missing metadata.
function checkEducationWeeks(value){
  const text=String(value||'').replace(/\[\s*周\s*\]|\(\s*\[?周\]?\s*\)/g,'周');
  for(const match of text.matchAll(/(\d{1,2}(?:\s*[-—–~至到,，、]\s*\d{1,2})*)\s*周/g)){
    if(match[1].match(/\d+/g).some(n=>Number(n)<1||Number(n)>20))throw Error('课程周次超出 1–20 周，未导入任何课程。请检查原课表。');
  }
  return text;
}
export function parseEducationTable(rows){
  for(const row of rows)for(const value of row)checkEducationWeeks(value);
  const grid=parseEducationRows(rows,{requireWeeks:true});
  if(grid.length)return grid;
  const headers={name:/^(?:课程名称|课程名|科目|课名)$/,teacher:/^(?:授课教师|授课老师|教师|老师)$/,room:/^(?:上课地点|上课教室|教室|地点|场地)$/,day:/^(?:星期|周几)$/,slot:/^(?:节次|上课节次)$/,weeks:/^(?:周次|周数|上课周|起止周)$/};
  let columns=null;const result=[];
  for(const [index,row]of rows.entries()){
    const candidate={};row.forEach((value,col)=>{const text=String(value||'').replace(/\s/g,'');for(const [key,re]of Object.entries(headers))if(re.test(text))candidate[key]=col;});
    if(candidate.name!==undefined&&candidate.day!==undefined&&candidate.slot!==undefined){columns=candidate;continue;}
    if(!columns)continue;
    const name=String(row[columns.name]||'').trim();if(!name)continue;
    const dayText=String(row[columns.day]||'').trim(),day=/^[1-7]$/.test(dayText)?Number(dayText):CN[dayText.match(/^(?:(?:星期|周)\s*)?([一二三四五六日天])$/)?.[1]];
    const slotText=String(row[columns.slot]||''),slots=[...new Set(slotText.split(/[、,，;；]/).map(educationSlot).filter(Boolean))];
    if(!day||!slots.length)throw Error(`第 ${index+1} 行「${name}」的星期或节次无法识别，未导入任何课程。`);
    let weeks=columns.weeks===undefined?'':String(row[columns.weeks]||'').trim();
    if(!weeks)throw Error(`「${name}」没有周次，请导出带周次的学期课表后重试。`);
    if(!/周/.test(weeks))weeks+='周';checkEducationWeeks(weeks);
    const ranges=weekPeriods(weeks,{requireWeeks:true});
    result.push({id:`edu-list-${index}`,name,teacher:String(row[columns.teacher]||'').trim(),room:String(row[columns.room]||'').trim(),periods:slots.flatMap(slot=>ranges.map(range=>({day,slot,...range})))});
  }
  return result;
}
export function decodeEducationText(buffer){
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer),text=new TextDecoder().decode(bytes);
  return /charset\s*=\s*["']?\s*(?:gb2312|gbk|gb18030)/i.test(text.slice(0,2048))||text.includes('\uFFFD')?new TextDecoder('gb18030').decode(bytes):text;
}
export async function readEducationFile(file,onProgress=()=>{}){
  if(!file||file.size>8*1024*1024)throw Error('请选择小于 8 MB 的课表文件。');
  onProgress({phase:'reading',name:file.name,done:0,total:0});
  const buffer=await file.arrayBuffer(),extension=file.name.split('.').at(-1)?.toLowerCase(),head=decodeEducationText(new Uint8Array(buffer).slice(0,2048));
  const courses=[];let total=1;
  if(['html','htm','txt','tsv'].includes(extension)||/<(?:!doctype|html|table)\b/i.test(head)){
    const text=decodeEducationText(buffer),rows=/<table\b/i.test(text)?htmlTimetableRows(text):parseTabularText(text);
    onProgress({phase:'parsing',name:file.name,done:0,total});courses.push(...parseEducationTable(rows));
    onProgress({phase:'parsing',name:file.name,done:1,total});
  }else if(['xls','xlsx'].includes(extension)){
    const XLSX=await import('xlsx'),book=XLSX.read(buffer,{type:'array'});total=book.SheetNames.length;
    for(const [index,name]of book.SheetNames.entries()){
      const sheet=book.Sheets[name],rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
      for(const merge of sheet['!merges']||[])for(let r=merge.s.r;r<=Math.min(merge.e.r,rows.length-1);r++)for(let c=merge.s.c;c<=merge.e.c;c++){
        rows[r]||=[];if(rows[r][c]===''||rows[r][c]===undefined)rows[r][c]=rows[merge.s.r]?.[merge.s.c]||'';
      }
      onProgress({phase:'parsing',name:file.name,sheet:name,done:index,total});
      courses.push(...parseEducationTable(rows));onProgress({phase:'parsing',name:file.name,sheet:name,done:index+1,total});
      await new Promise(done=>setTimeout(done,0));
    }
  }else throw Error('请选择 Excel、HTML 网页或制表符文本课表文件。');
  if(!courses.length)throw Error('没有识别到课程。请导出带星期、节次和周次的完整课表，或改用复制粘贴。');
  return {courses,source:file.name,sheets:total};
}
