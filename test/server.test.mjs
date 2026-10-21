import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('local room boundaries without model usage',async t=>{
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'ai-team-room-test-'));
  await fs.copyFile(path.join(source,'server.mjs'),path.join(temporary,'server.mjs'));
  await fs.cp(path.join(source,'public'),path.join(temporary,'public'),{recursive:true});
  const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
  const child=spawn(process.execPath,[path.join(temporary,'server.mjs')],{env:{...process.env,PORT:String(port),CODEX_BIN:path.join(temporary,'not-installed.exe')},stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  t.after(async()=>{child.kill();await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2000))]);await fs.rm(temporary,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${port}`;
  let initial;
  for(let i=0;i<50;i++){
    try{initial=await(await fetch(`${base}/api/bootstrap`,{signal:AbortSignal.timeout(1000)})).json();break;}catch{await new Promise(r=>setTimeout(r,100));}
  }
  assert.ok(initial,'server did not start: '+output);
  const post=(route,body,headers={})=>fetch(`${base}${route}`,{method:'POST',headers:{'Content-Type':'application/json','X-Room-Token':initial.token,...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
  await t.test('missing CLI is explicit and cannot start a model',async()=>{
    assert.equal(initial.roles.length,5);assert.equal(initial.auth.ready,false);assert.ok(initial.auth.message);
    assert.equal((await post('/api/message',{text:'test',mode:'team'})).status,409);
    const state=await(await fetch(`${base}/api/state`)).json();assert.equal(state.busy,false);assert.equal(state.messages.length,0);
  });
  await t.test('requires a valid mutation token',async()=>{
    assert.equal((await post('/api/clear',{}, {'X-Room-Token':'wrong'})).status,403);
    assert.equal((await post('/api/shutdown',{}, {'X-Room-Token':'wrong'})).status,403);
  });
  await t.test('rejects cross-site origins and unexpected Host',async()=>{
    assert.equal((await post('/api/stop',{}, {Origin:'https://unrelated.example'})).status,403);
    const code=await new Promise((resolve,reject)=>{http.get(`${base}/api/state`,{headers:{Host:`unrelated.example:${port}`}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
    assert.equal(code,403);
  });
  await t.test('validates role, input length and empty tasks before execution',async()=>{
    for(const body of [{text:'test',mode:'single',role:'invalid'},{text:'x'.repeat(12001),mode:'team'},{text:' ',mode:'team'},{text:'test',mode:'invalid'}])assert.equal((await post('/api/message',body)).status,400);
  });
  await t.test('serves only approved static assets with protection headers',async()=>{
    for(const file of ['/','/app.js','/style.css','/mobile.css'])assert.equal((await fetch(base+file)).status,200);
    for(const file of ['/server.mjs','/data/history.json','/Start.ps1'])assert.equal((await fetch(base+file)).status,404);
    const response=await fetch(base);assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
  });
  await t.test('exports Markdown and supports safe idle stop and clear',async()=>{
    assert.ok((await(await fetch(`${base}/api/export`)).text()).startsWith('# '));
    assert.equal((await post('/api/stop',{})).status,200);assert.equal((await post('/api/clear',{})).status,200);
  });
});
