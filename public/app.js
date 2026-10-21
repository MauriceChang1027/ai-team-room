'use strict';
const $ = id => document.getElementById(id);
const roleDefaults = [
  {id:'manager',name:'主管',label:'協調分工 · 整合成果',initial:'主',ink:'#6861bc',bg:'#eeecfb'},
  {id:'researcher',name:'研究員',label:'蒐集資料 · 核實來源',initial:'研',ink:'#498984',bg:'#e6f2ef'},
  {id:'planner',name:'策劃員',label:'拆解問題 · 規劃步驟',initial:'策',ink:'#b48644',bg:'#fbf0df'},
  {id:'executor',name:'執行員',label:'動手製作 · 產出成果',initial:'執',ink:'#5e85ad',bg:'#e9f0fa'},
  {id:'reviewer',name:'審核員',label:'檢查遺漏 · 提出修正',initial:'審',ink:'#a4718a',bg:'#f7eaf1'},
];
let token = '', state = {}, messageSignature = '', pending = false, polling = false, connectionLost = false;
let lastBusy = false;
function el(tag, cls, text) { const e=document.createElement(tag); if(cls)e.className=cls; if(text!==undefined)e.textContent=text; return e; }
function roleInfo(id) { return roleDefaults.find(r=>r.id===id)||{id,name:id==='user'?'你':'系統',initial:id==='user'?'你':'!',ink:'#8f7049',bg:'#fff0dc'}; }
function avatar(role) { const a=el('span','avatar',role.initial);a.style.setProperty('--role-ink',role.ink);a.style.setProperty('--role-bg',role.bg);return a; }
function notice(text='') { $('notice').textContent=text;$('notice').hidden=!text; }
async function api(path,body) {
  const options=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json','X-Room-Token':token},body:JSON.stringify(body)};
  const response=await fetch(path,{...options,cache:'no-store'});
  let result;try{result=await response.json();}catch{throw new Error('服務回應異常，請重新啟動本機服務。');}
  if(!response.ok)throw new Error(result.error||result.message||'操作未完成，請稍後重試。');return result;
}
function buildMembers() {
  for(const r of roleDefaults) {
    const b=el('button','member');b.type='button';b.dataset.role=r.id;b.title=`請${r.name}回覆`;b.setAttribute('aria-label',`請${r.name}回覆`);b.append(avatar(r));
    const d=el('span','member-details');d.append(el('span','member-name',r.name),el('span','member-description',r.label));
    b.append(d,el('span','member-indicator'));b.onclick=()=>{$('mode').value='single';$('role').value=r.id;routeChanged();$('prompt').focus();};$('members').append(b);
    const option=el('option','',r.name);option.value=r.id;$('role').append(option);
  }
}
function renderMessages(messages) {
  const signature=JSON.stringify(messages);
  if(signature===messageSignature)return;
  const nearBottom=messageSignature===''||$('feed').scrollHeight-$('feed').scrollTop-$('feed').clientHeight<160;
  messageSignature=signature;$('messages').replaceChildren();$('welcome').hidden=messages.length>0;
  for(const m of messages) {
    const r=roleInfo(m.role);const row=el('article',`message ${m.role}`);row.append(avatar(r));const content=el('div','message-content');
    const meta=el('div','message-meta');const date=new Date(m.createdAt);const t=el('time','',Number.isNaN(date.getTime())?'':date.toLocaleTimeString('zh-HK',{hour:'2-digit',minute:'2-digit',hour12:false}));
    if(!Number.isNaN(date.getTime()))t.dateTime=date.toISOString();meta.append(el('strong','',m.name||r.name),t);
    const body=el('div','message-text',m.text||'');content.append(meta,body);
    const tools=el('div','message-tools');const copy=el('button','copy-button','複製訊息');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(m.text||'');copy.textContent='已複製 ✓';setTimeout(()=>copy.textContent='複製訊息',1400);}catch{notice('未能自動複製，請選取訊息文字後複製。');}};tools.append(copy);content.append(tools);row.append(content);$('messages').append(row);
  }
  if(nearBottom||messages.at(-1)?.role==='user')$('feed').scrollTop=$('feed').scrollHeight;
}
function render(next) {
  state=next;renderMessages(next.messages||[]);const ready=Boolean(next.auth?.ready);
  $('connection-dot').className=`status-dot ${ready?'ready':'error'}`;
  $('connection-text').textContent=next.busy?(next.status||'團隊正在工作…'):(next.auth?.message||next.status||'尚未連接');
  $('activity').hidden=!next.busy;$('activity-text').textContent=next.status||`${roleInfo(next.activeRole).name}正在回覆…`;
  document.querySelectorAll('.member').forEach(b=>{const active=next.busy&&b.dataset.role===next.activeRole;b.classList.toggle('active',active);b.setAttribute('aria-current',active?'true':'false');});
  $('send').disabled=pending||next.busy||!ready;$('stop').hidden=!next.busy;$('clear').disabled=next.busy||pending;
  $('export').disabled=!(next.messages||[]).length;
  $('send').firstChild.textContent=$('mode').value==='single'?'請成員回覆 ':'開始協作 ';
  if(next.busy&&!lastBusy)$('feed').scrollTop=$('feed').scrollHeight;lastBusy=next.busy;
}
function routeChanged() {$('role').hidden=$('mode').value!=='single';if(state)render(state);}
async function bootstrap() {try{const b=await api('/api/bootstrap');token=b.token;render(b);connectionLost=false;notice();}catch(e){notice(e.message);$('connection-text').textContent='無法連接本機服務';$('connection-dot').className='status-dot error';}}
async function poll() {if(polling||!token)return;polling=true;try{const s=await api('/api/state');render(s);if(connectionLost){connectionLost=false;notice();}}catch{connectionLost=true;$('send').disabled=true;$('connection-text').textContent='服務已中斷，請保持啟動器開啟';$('connection-dot').className='status-dot error';}finally{polling=false;}}
$('composer').addEventListener('submit',async e=>{e.preventDefault();if(pending||state.busy||!state.auth?.ready)return;const text=$('prompt').value.trim();if(!text){$('prompt').focus();return;}pending=true;render(state);notice();try{await api('/api/message',{text,mode:$('mode').value,role:$('role').value});$('prompt').value='';await poll();}catch(error){notice(error.message);}finally{pending=false;render(state);}});
$('prompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();$('composer').requestSubmit();}});
$('prompt').addEventListener('input',()=>{$('character-count').textContent=$('prompt').value.length>1000?`${$('prompt').value.length.toLocaleString()} / 12,000`:'Enter 傳送 · Shift + Enter 換行';});
$('mode').onchange=routeChanged;
$('stop').onclick=async()=>{try{await api('/api/stop',{});await poll();}catch(e){notice(e.message);}};
$('clear').onclick=async()=>{if(!confirm('清空本機群組的全部對話？如要保留，請先匯出。'))return;try{await api('/api/clear',{});await poll();}catch(e){notice(e.message);}};
$('export').onclick=async()=>{try{const response=await fetch('/api/export',{cache:'no-store'});if(!response.ok)throw new Error('匯出失敗');const url=URL.createObjectURL(await response.blob());const a=el('a');a.href=url;a.download=`AI團隊對話-${new Date().toISOString().slice(0,10)}.md`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{notice('未能匯出，請先確認本機服務仍在運作。');}};
$('help-toggle').onclick=()=>{$('help').hidden=!$('help').hidden;};$('help-open').onclick=()=>{$('help').hidden=!$('help').hidden;};$('help-close').onclick=()=>{$('help').hidden=true;};$('recheck').onclick=()=>bootstrap();
document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{$('prompt').value=b.dataset.example;$('prompt').focus();});
buildMembers();bootstrap();setInterval(poll,1200);
