import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
const files=['server.js','audit.js',...['extension','lib','public','tests','tools'].flatMap(walk)].filter(f=>f.endsWith('.js'));
for(const file of files){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json'));
assert.equal(manifest.version,JSON.parse(fs.readFileSync('package.json')).version);
for(const file of [manifest.background.service_worker,manifest.options_page])assert.ok(fs.existsSync('extension/'+file));
const html=fs.readFileSync('extension/dashboard.html','utf8'),js=fs.readFileSync('extension/dashboard.js','utf8');
for(const [,id]of js.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes(`id="${id}"`),'Missing dashboard element: '+id);
assert.ok(html.includes('class="inline-option"')&&html.includes('id="cleanup"'),'Responsive cleanup control missing');
assert.ok(!/<label\\s+class="panel"/i.test(html),'Inline label cannot be a block-level panel');
console.log(`Syntax checked ${files.length} JavaScript files; manifest and dashboard references valid.`);
