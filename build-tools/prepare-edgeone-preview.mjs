import {cp,readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {resolve,sep,dirname} from 'node:path';
import {build} from 'esbuild';

const input=resolve(process.argv[2]||'dist'),target=resolve(process.argv[3]||'output/performance-20261025/edgeone-preview');
if(!target.startsWith(resolve('output')+sep))throw Error('Preview package must be inside output');
let exists=false;try{await access(target);exists=true;}catch{}if(exists)throw Error('Use a fresh preview directory');
await cp(input,target,{recursive:true});
const bundled=await build({entryPoints:['build-tools/edgeone-origin-proxy.mjs'],bundle:true,format:'esm',target:'es2020',write:false});
for(const route of ['share.js','s/[id].js','ocr.js','prompt-admin/verify.js','ac-api/latest.js','bt-api/latest.js','tm-api/latest.js','modelflow/api/[[path]].js']){
  const file=resolve(target,'edge-functions',route);await mkdir(dirname(file),{recursive:true});await writeFile(file,bundled.outputFiles[0].text);
}
const headers=[];let current;
for(const line of (await readFile(resolve(input,'_headers'),'utf8')).split(/\r?\n/)){
  if(!line||line.startsWith('#'))continue;
  if(line.startsWith('/')){current={source:line.trim(),headers:[]};headers.push(current);continue;}
  const field=line.match(/^\s+([^:]+):\s*(.+)$/);if(field&&current)current.headers.push({key:field[1],value:field[2]});
}
for(const [source,value]of [['/assets/*','public, max-age=31536000, immutable'],['/','public, max-age=0, must-revalidate'],['/index.html','public, max-age=0, must-revalidate'],['/share','no-store'],['/s/*','no-store'],['/ocr','no-store'],['/modelflow/api/*','no-store']])headers.push({source,headers:[{key:'Cache-Control',value}]});
const redirects=[];for(const line of (await readFile(resolve(input,'_redirects'),'utf8')).split(/\r?\n/)){const parts=line.trim().split(/\s+/);if(line.startsWith('/')&&parts.length===3)redirects.push({source:parts[0],destination:parts[1],statusCode:Number(parts[2])});}
await writeFile(resolve(target,'edgeone.json'),JSON.stringify({headers,redirects},null,2));
console.log(JSON.stringify({prepared:target,functions:8,apiOrigin:'https://voyra-121.pages.dev',userData:'remains at original API',productionDNS:'unchanged'}));
