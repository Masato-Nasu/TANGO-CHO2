const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),Q='tangoCho2CommuteQueue:v1',S='tangoCho2Commute:v1';
const tick=()=>new Promise(r=>setTimeout(r,0));
const wait=async test=>{for(let i=0;i<300;i++){if(test())return;await new Promise(r=>setTimeout(r,5));}throw new Error('Timed out');};
const fixture=(type,n)=>({title:'Office update '+n,passage:type==='Part 7'?Array(180).fill('office').join(' '):'',passageTranslation:type==='Part 7'?'お知らせの訳':'',questions:Array.from({length:type==='Part 7'?3:5},()=>({prompt:type==='Part 5'?'Please ____ the report.':'What does the notice say?',options:['submit','A','B','C'],answer:0,explanation:'submitが適切です。',translation:'報告書を提出してください。',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',collocation:'submit a report',example:'Please submit the report.',translation:'報告書を提出してください。'}]}))});
async function init(type='wifi',storage={},failAt=0){
 const dom=new JSDOM(fs.readFileSync(path.join(repo,'index.html'),'utf8'),{url:'https://test.invalid',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,connection=new w.EventTarget();connection.type=type;
 Object.defineProperty(w.navigator,'connection',{value:connection});Object.defineProperty(w.navigator,'onLine',{get:()=>connection.type!=='offline'});
 w.HTMLElement.prototype.scrollIntoView=function(){};
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 w.eval(fs.readFileSync(path.join(repo,'script.js'),'utf8').replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("core-init-disabled", () => {'));
 w.eval('setupTabs();setupAddForm();ensureAiSettingsLoaded=async()=>({});getOpenAiApiKey=()=>"test-placeholder";');
 let calls=[];w.callOpenAiJson=async args=>{const data=JSON.parse(args.input);calls.push(data);if(calls.length===failAt)throw new Error('AI unavailable');return fixture(data.type,calls.length);};
 w.eval(fs.readFileSync(path.join(repo,'tangocho2-grammar.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(repo,'tangocho2-commute.js'),'utf8'));await tick();
 return {dom,w,d,calls,connection,snapshot:()=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]))};
}
(async()=>{
 let a=await init('cellular');await new Promise(r=>setTimeout(r,130));a.d.getElementById('commutePrepare').click();await tick();assert.equal(a.calls.length,0);a.dom.window.close();
 a=await init('unknown');await new Promise(r=>setTimeout(r,130));assert.equal(a.calls.length,0);assert(a.d.getElementById('commuteOfflineStatus').textContent.includes('自動判定できません'));
 a.d.getElementById('commutePrepare').click();await wait(()=>JSON.parse(a.w.localStorage.getItem(Q)||'[]').length===2);assert.equal(a.calls.length,6);a.dom.window.close();
 a=await init('wifi',{'tangoCho2CommuteLevel:v1':'700'});await wait(()=>JSON.parse(a.w.localStorage.getItem(Q)||'[]').length===2);
 assert.equal(a.calls.length,6);assert(a.calls.every(x=>x.level===700));let queued=JSON.parse(a.w.localStorage.getItem(Q));assert.equal(new Set(queued.map(x=>x.id)).size,2);assert.equal(a.w.localStorage.getItem(S),null);
 const storage=a.snapshot();a.dom.window.close();a=await init('wifi',storage);await new Promise(r=>setTimeout(r,130));assert.equal(a.calls.length,0);
 a.d.querySelector('[data-offline-start]').click();assert.equal(JSON.parse(a.w.localStorage.getItem(Q)).length,1);const active=JSON.parse(a.w.localStorage.getItem(S));assert(active.preparedAt);
 const storage2=a.snapshot();a.dom.window.close();a=await init('wifi',storage2);await new Promise(r=>setTimeout(r,130));assert.equal(a.calls.length,0,'active prepared set counts toward the two-set limit');
 a.connection.type='offline';a.w.dispatchEvent(new a.w.Event('offline'));
 for(let group=0;group<3;group++){
  for(let i=0;i<(group===0?3:5);i++){const current=JSON.parse(a.w.localStorage.getItem(S));const radio=a.d.querySelector(`[name="commuteQ${i}"][value="${current.groups[current.index].questions[i].answer}"]`);radio.checked=true;radio.dispatchEvent(new a.w.Event('change',{bubbles:true}));}
  a.d.getElementById('commuteGrade').click();assert.equal(a.d.querySelectorAll('.commute-feedback').length,group===0?3:5);a.d.getElementById('commuteNext').click();
 }
 assert.match(a.d.getElementById('commutePractice').textContent,/13 \/ 13/);a.d.querySelector('[data-offline-start]').click();assert.notEqual(JSON.parse(a.w.localStorage.getItem(S)).id,active.id);assert.equal(a.calls.length,0);assert.equal(JSON.parse(a.w.localStorage.getItem(Q)).length,0);a.dom.window.close();
 a=await init('wifi',{},4);await wait(()=>a.d.getElementById('commuteOfflineStatus').textContent.includes('AI unavailable'));assert.equal(JSON.parse(a.w.localStorage.getItem(Q)).length,1);a.w.dispatchEvent(new a.w.Event('offline'));assert(a.d.getElementById('commuteOfflineStatus').textContent.includes('AI unavailable'));a.d.dispatchEvent(new a.w.Event('visibilitychange'));await wait(()=>JSON.parse(a.w.localStorage.getItem(Q)).length===2);assert.equal(a.calls.length,7);a.dom.window.close();
 a=await init('wifi');a.w.callOpenAiJson=async args=>{a.calls.push(JSON.parse(args.input));a.connection.type='cellular';return fixture(JSON.parse(args.input).type,1);};await wait(()=>a.d.getElementById('commuteOfflineStatus').textContent.includes('停止しました'));assert.equal(a.calls.length,1);assert.equal(a.w.localStorage.getItem(Q),null);a.dom.window.close();
 a=await init('wifi');a.w.Storage.prototype.setItem=function(key){if(key===Q)throw new Error('storage full');};await wait(()=>a.d.getElementById('commuteOfflineStatus').textContent.includes('storage full'));assert.equal(a.w.localStorage.getItem(Q),null);assert.equal(a.d.querySelectorAll('[data-offline-start]').length,0);a.dom.window.close();
 // A manually generated active set from the old app also occupies one of the two slots.
 const oldActive=JSON.parse(storage2[S]);delete oldActive.preparedAt;oldActive.groups[0].questions[0].choice=oldActive.groups[0].questions[0].answer;
 const oldState={...storage2,[S]:JSON.stringify(oldActive)};
 a=await init('wifi',oldState);await new Promise(r=>setTimeout(r,130));assert.equal(a.calls.length,0);assert.match(a.d.getElementById('commuteOfflineStatus').textContent,/解答中1回分.*保存済み1回分.*合計2\/2/);
 const oldActiveId=oldActive.id,oldChoice=oldActive.groups[0].questions[0].choice;
 assert(!a.d.querySelector('[data-offline-start]').disabled);a.w.confirm=()=>{throw new Error('Unexpected overwrite confirmation');};
 a.d.querySelector('[data-offline-start]').click();assert.notEqual(JSON.parse(a.w.localStorage.getItem(S)).id,oldActiveId);
 a.d.querySelector(`[data-offline-start="${oldActiveId}"]`).click();assert.equal(JSON.parse(a.w.localStorage.getItem(S)).groups[0].questions[0].choice,oldChoice);
 const switched=a.snapshot();a.dom.window.close();a=await init('offline',switched);assert.equal(JSON.parse(a.w.localStorage.getItem(S)).id,oldActiveId);assert.equal(a.d.querySelectorAll('[data-offline-start]').length,1);a.dom.window.close();
 // The ordinary Create button must append a second set instead of replacing the first.
 a=await init('unknown',{[S]:JSON.stringify(oldActive)});a.w.confirm=()=>{throw new Error('Unexpected overwrite confirmation');};
 const original=a.w.localStorage.getItem(S);a.d.getElementById('commuteStart').click();await wait(()=>JSON.parse(a.w.localStorage.getItem(Q)||'[]').length===1);assert.equal(a.calls.length,3);assert.equal(a.w.localStorage.getItem(S),original);
 a.d.getElementById('commuteStart').click();await tick();assert.equal(a.calls.length,3);assert.match(a.d.getElementById('commuteMsg').textContent,/2回分は保存済み/);a.dom.window.close();
 // If the initial automatic check runs while manual generation is busy, fill the missing set when it finishes.
 a=await init('wifi');a.w.callOpenAiJson=async args=>{a.calls.push(JSON.parse(args.input));if(a.calls.length===1)await new Promise(r=>setTimeout(r,180));return fixture(JSON.parse(args.input).type,a.calls.length);};
 a.d.getElementById('commuteStart').click();await wait(()=>a.w.localStorage.getItem(S)&&JSON.parse(a.w.localStorage.getItem(Q)||'[]').length===1);assert.equal(a.calls.length,6);a.dom.window.close();
 // Keep a failed switch lossless, even if writing the active slot fails after parking both sets.
 a=await init('offline',oldState);const beforeSwitch=a.w.localStorage.getItem(S),setItem=a.w.Storage.prototype.setItem;
 a.w.Storage.prototype.setItem=function(key,value){if(key===S)throw new Error('full');return setItem.call(this,key,value);};
 a.d.querySelector('[data-offline-start]').click();assert.equal(a.w.localStorage.getItem(S),beforeSwitch);assert.match(a.d.getElementById('commuteMsg').textContent,/問題と回答は残しています/);const failedSwitch=a.snapshot();a.dom.window.close();a=await init('offline',failedSwitch);assert.equal(a.d.querySelectorAll('[data-offline-start]').length,1);assert.equal(JSON.parse(a.w.localStorage.getItem(S)).groups[0].questions[0].choice,oldChoice);a.dom.window.close();
 console.log('PASS: Wi-Fi auto-preparation of two distinct saved sets; cellular/unknown gating, manual fallback, no refill on reload with active set, offline grading and second-set activation, partial failure recovery, network-switch halt and quota safety');
})().catch(e=>{console.error(e);process.exit(1)});
