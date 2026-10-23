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
      const clone=cell.cloneNode(true);clone.querySelectorAll('script,style,img,iframe').forEach(el=>el.remove());
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
function weekPeriods(text){
  const value=String(text||'').replace(/\[\s*周\s*\]|\(\s*\[?周\]?\s*\)/g,'周');
  const type=/[（(\[]\s*单(?:周)?\s*[)）\]]|单周/.test(value)?'odd':/[（(\[]\s*双(?:周)?\s*[)）\]]|双周/.test(value)?'even':'every';
  const group=value.match(/(?:第)?\s*(\d{1,2}(?:\s*[-—–~至到,，、]\s*\d{1,2})*)\s*周/);
  if(!group)return [{f:1,t:16,type}];
  const result=[];
  for(const part of group[1].split(/[,，、]/)){
    const [f,t=f]=part.split(/[-—–~至到]/).map(v=>Number(v.trim()));
    if(f>=1&&t<=20&&f<=t)result.push({f,t,type});
  }
  return result.length?result:[{f:1,t:16,type}];
}
export function parseEducationRows(rows){
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
        const periods=weekPeriods(block).map(weeks=>({day,slot,...weeks}));
        const signature=JSON.stringify({name,teacher,room,periods});if(seen.has(signature))continue;seen.add(signature);
        courses.push({id:`edu-${i}-${col}-${courses.length}`,name,teacher,room,note:note.join(' · '),periods});
      }
    }
  }
  return courses;
}
