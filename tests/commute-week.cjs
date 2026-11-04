const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const repo=path.resolve(__dirname,'..'),KEY='tangoCho2Commute:v1',ARCHIVE='tangoCho2CommuteArchive:v1',HISTORY='tangoCho2CommuteHistory:v1';
const NOW=Date.parse('2026-11-04T12:00:00+09:00'),DAY=86400000;
function session(id,complete=true){return {id,index:complete?2:1,complete,answerLayoutVersion:1,level:800,groups:[3,5,5].map((count,g)=>({type:['Part 7','Part 5','語彙'][g],title:id+' title',passage:g===0?Array(130).fill('office').join(' '):'',passageTranslation:g===0?'本文訳':'',graded:complete||g===0,questions:Array.from({length:count},(_,i)=>({prompt:g===1?'Please ____ the report.':'What is needed?',options:['correct '+id,'wrong B','wrong C','wrong D'],answer:0,choice:complete||g===0?(i===0?1:0):null,explanation:'正答の解説 '+id,translation:'訳 '+id,terms:[{word:'report',meaning:'報告書 '+id,pronunciation:'rɪˈpɔːt',example:'Read the report.',translation:'報告書を読んでください。',collocation:'read a report'}]}))}))};}
async function init(storage={}){
 const dom=new JSDOM(fs.readFileSync(path.join(repo,'index.html'),'utf8'),{url:'https://test.invalid',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const OriginalDate=w.Date;w.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 for(const [key,value]of Object.entries(storage))w.localStorage.setItem(key,value);
 w.eval(fs.readFileSync(path.join(repo,'script.js'),'utf8').replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("core-init-disabled", () => {'));w.eval('setupTabs();setupAddForm();');
 w.eval(fs.readFileSync(path.join(repo,'tangocho2-grammar.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(repo,'tangocho2-commute.js'),'utf8'));await new Promise(r=>setTimeout(r,0));return {dom,w,d};
}
(async()=>{
 const archive=[];for(let day=0;day<7;day++)for(let run=0;run<2;run++){const id=`day${day}-${run}`;archive.push({id,at:new Date(NOW-day*DAY-(run+1)*3600000).toISOString(),session:session(id)});}
 const cutoff=Date.parse('2026-10-29T00:00:00+09:00');
 archive.push({id:'boundary',at:new Date(cutoff).toISOString(),session:session('boundary')},{id:'expired',at:new Date(cutoff-1).toISOString(),session:session('expired')});
 let a=await init({[ARCHIVE]:JSON.stringify(archive),[KEY]:JSON.stringify(session('running',false))});
 assert.equal(a.d.querySelectorAll('[data-history-open]').length,16);assert(!a.d.querySelector('[data-history-open="expired"]'));assert(a.d.querySelector('[data-history-open="boundary"]'));
 const before=a.w.localStorage.getItem(KEY),storedBefore=a.w.localStorage.getItem(ARCHIVE);
 a.d.querySelector('[data-history-open="day6-1"]').click();assert.match(a.d.getElementById('commuteReview').textContent,/自分の回答：B\. wrong B/);assert.match(a.d.getElementById('commuteReview').textContent,/不正解/);assert.match(a.d.getElementById('commuteReview').textContent,/正答：A\. correct day6-1/);
 a.d.querySelector('button[data-review-group="1"]').click();assert.equal(a.d.querySelectorAll('#commuteReview .commute-feedback').length,5);assert.equal(a.w.localStorage.getItem(KEY),before);assert.equal(a.w.localStorage.getItem(ARCHIVE),storedBefore);
 a.d.querySelector('[data-review-save]').click();assert.equal(a.w.eval('loadWords()')[0].meaning,'報告書 day6-1');a.d.getElementById('commuteReviewClose').click();assert.equal(a.w.localStorage.getItem(KEY),before);
 // Save a partially answered group, then finish: archive is updated by ID, not duplicated.
 for(let i=0;i<5;i++){const radio=a.d.querySelector(`[name="commuteQ${i}"][value="0"]`);radio.checked=true;radio.dispatchEvent(new a.w.Event('change',{bubbles:true}));}
 a.d.getElementById('commuteGrade').click();a.d.getElementById('commuteNext').click();
 for(let i=0;i<5;i++){const radio=a.d.querySelector(`[name="commuteQ${i}"][value="0"]`);radio.checked=true;radio.dispatchEvent(new a.w.Event('change',{bubbles:true}));}
 a.d.getElementById('commuteGrade').click();a.d.getElementById('commuteNext').click();
 const complete=a.w.localStorage.getItem(KEY);assert(JSON.parse(complete).complete);const entries=JSON.parse(a.w.localStorage.getItem(ARCHIVE));assert.equal(entries.filter(x=>x.id==='running').length,1);assert(entries.find(x=>x.id==='running').session.complete);
 a.d.getElementById('commuteResume').click();for(let i=0;i<3;i++)a.d.getElementById('commuteReviewNext').click();assert.equal(a.w.localStorage.getItem(KEY),complete);
 const snapshot=Object.fromEntries(Object.keys(a.w.localStorage).map(k=>[k,a.w.localStorage.getItem(k)]));a.dom.window.close();a=await init(snapshot);a.d.querySelector('[data-history-open="day6-1"]').click();assert.match(a.d.getElementById('commuteReview').textContent,/正答の解説 day6-1/);a.dom.window.close();
 // Upgrade can recover the remaining latest response, but cannot reconstruct summary-only history.
 a=await init({[KEY]:JSON.stringify(session('legacy')),[HISTORY]:JSON.stringify([{id:'legacy',at:new Date(NOW-DAY).toISOString()},{id:'score-only',at:new Date(NOW-DAY).toISOString()}])});assert(a.d.querySelector('[data-history-open="legacy"]'));assert(!a.d.querySelector('[data-history-open="score-only"]'));a.dom.window.close();
 // Storage failure is visible and blocks replacing the only remaining full current response.
 a=await init({[KEY]:JSON.stringify(session('quota',false))});const quotaBefore=a.w.localStorage.getItem(KEY);const original=a.w.Storage.prototype.setItem;a.w.Storage.prototype.setItem=function(key,value){if(key===ARCHIVE)throw new Error('full');return original.call(this,key,value);};let calls=0;a.w.confirm=()=>true;a.w.callOpenAiJson=async()=>{calls++;};a.d.getElementById('commuteStart').click();assert.equal(calls,0);assert.equal(a.w.localStorage.getItem(KEY),quotaBefore);assert.match(a.d.getElementById('commuteArchiveStatus').textContent,/保存できません/);a.dom.window.close();
 console.log('PASS: seven Japan-calendar days including boundary, multiple daily sessions, preserved own answers and explanations, independent review and registration, partial/completed upserts, reload, legacy recovery and quota protection');
})().catch(e=>{console.error(e);process.exit(1)});
