import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const metadata=`// ==UserScript==
// @name         Voyra 教务课表导入
// @namespace    https://lxlrwxs.top/
// @version      2.0.0
// @description  湖南人文科技学院：内网优先、外网回退、登录后逐周识别，返回 Voyra 核对保存。不读取账号密码。
// @match        https://lxlrwxs.top/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        http://10.1.1.149/*
// @match        https://10.1.1.149/*
// @match        http://vpn.huhst.edu.cn/*
// @match        https://vpn.huhst.edu.cn/*
// @connect      10.1.1.149
// @connect      vpn.huhst.edu.cn
// @connect      *.huhst.edu.cn
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @noframes
// @run-at       document-idle
// @updateURL    https://lxlrwxs.top/jsxsd-import.user.js
// @downloadURL  https://lxlrwxs.top/jsxsd-import.user.js
// ==/UserScript==
`;
const result=await build({entryPoints:['build-tools/education-helper.entry.js'],bundle:true,format:'iife',target:'es2020',write:false,legalComments:'none'});
const output=metadata+result.outputFiles[0].text;
const path='public/jsxsd-import.user.js';
if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==output)throw Error('Run npm run build:education before committing');}
else await writeFile(path,output);
console.log(`Education helper: ${(Buffer.byteLength(output)/1024).toFixed(1)} KB`);
