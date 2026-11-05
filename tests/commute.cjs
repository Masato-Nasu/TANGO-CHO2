const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const repo = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(repo,'index.html'),'utf8');
const tick = () => new Promise(r => setTimeout(r,0));
async function init(storage={}) {
 const dom = new JSDOM(html,{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
 const w = dom.window;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 for(const [k,v] of Object.entries(storage)) w.localStorage.setItem(k,v);
 w.eval(fs.readFileSync(path.join(repo,'script.js'),'utf8').replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("core-init-disabled", () => {'));
 w.eval('setupTabs();setupAddForm();');
 w.eval(fs.readFileSync(path.join(repo,'tangocho2-grammar.js'),'utf8'));
 w.eval(fs.readFileSync(path.join(repo,'tangocho2-commute.js'),'utf8'));
 await tick();
 return {dom,w,d:w.document};
}
const fixture = type => ({title:'Office update',passage:type==='Part 7'?Array(180).fill('office').join(' '):'',passageTranslation:type==='Part 7'?'お知らせの全文訳':'',questions:Array.from({length:type==='Part 7'?3:type==='Part 5'?2:5},(_,i)=>({prompt:type==='Part 5'?'Please ____ the report.':'What does the notice state?',options:['submit','A','B','C'],answer:0,explanation:'submitが正解。他の選択肢は文脈に合いません。',translation:'報告書を提出してください。',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',collocation:'submit a report',example:'Please submit the report.',translation:'報告書を提出してください。'}]}))});
(async()=>{
 let {dom,w,d}=await init();
 const input = word => {d.getElementById('word').value=word;d.getElementById('word').dispatchEvent(new w.Event('input',{bubbles:true}));};
 input('old');
 for(const id of ['meaning','synonyms','example','exampleTranslation','memo'])d.getElementById(id).value='old detail';
 input('new');
 for(const id of ['meaning','synonyms','example','exampleTranslation','memo'])assert.equal(d.getElementById(id).value,'');
 w.eval('getSynonymsSmart = () => new Promise(r => window.resolveSyn = r)');
 d.getElementById('synFetchBtn').click(); await tick();input('third');w.resolveSyn(['stale']);await tick();assert.equal(d.getElementById('synonyms').value,'');
 w.eval('translateToJaViaSpace = () => new Promise(r => window.resolveTranslate = r)');
 d.getElementById('translateBtn').click();await tick();input('fourth');w.resolveTranslate('古い訳');await tick();assert.equal(d.getElementById('meaning').value,'');
 w.eval('enrichTermViaAi = () => new Promise(r => window.resolveEnrich = r)');
 d.getElementById('aiAssistBtn').click();await tick();input('fifth');w.resolveEnrich({meaning:'古い意味',synonyms:[],example:'old',exampleTranslation:'旧',memo:'old'});await tick();assert.equal(d.getElementById('meaning').value,'');
 d.getElementById('commuteLevel').value='600';d.getElementById('commuteLevel').dispatchEvent(new w.Event('change'));
 assert.deepEqual([...d.querySelectorAll('#commuteLevel option')].map(o=>o.value),['600','700','800','900']);
 let calls=[];w.callOpenAiJson=async args=>{assert.equal(JSON.parse(args.input).level,600);assert.match(args.instruction,/targeting TOEIC 600/);const type=JSON.parse(args.input).type;calls.push(type);return fixture(type);};
 d.getElementById('commuteStart').click();await tick();await tick();assert.deepEqual(calls,['Part 7','Part 5','語彙']);
 assert.equal(d.querySelectorAll('.commute-question').length,3);
 assert.equal(d.querySelectorAll('.commute-feedback').length,0);
 d.getElementById('commuteGrade').click();assert.match(d.getElementById('commuteMsg').textContent,/すべて/);
 const choose=(i,value=JSON.parse(w.localStorage.getItem('tangoCho2Commute:v1')).groups[JSON.parse(w.localStorage.getItem('tangoCho2Commute:v1')).index].questions[i].answer)=>{const radio=d.querySelector(`[name="commuteQ${i}"][value="${value}"]`);radio.checked=true;radio.dispatchEvent(new w.Event('change',{bubbles:true}));};
 choose(0); const saved=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));dom.window.close();
 ({dom,w,d}=await init(saved));assert(d.querySelector('[name="commuteQ0"]:checked'));assert.equal(d.getElementById('commuteLevel').value,'600');assert.match(d.getElementById('commutePractice').textContent,/600点/);
 for(let group=0;group<3;group++){
  const count=group===0?3:5;
  for(let i=0;i<count;i++)choose(i);
  d.getElementById('commuteGrade').click();assert.equal(d.querySelectorAll('.commute-feedback').length,count);
  if(group===0){
   d.querySelector('[data-commute-save]').click();d.querySelector('[data-commute-save]').click();
   const words=w.eval('loadWords()');assert.equal(words.length,1);assert.equal(words[0].word,'submit');assert.equal(words[0].status,'default');assert.equal(words[0].exampleTranslation,'報告書を提出してください。');
  }
  d.getElementById('commuteNext').click();
 }
 assert.match(d.getElementById('commutePractice').textContent,/13 \/ 13/);
 assert.equal(JSON.parse(w.localStorage.getItem('tangoCho2CommuteHistory:v1')).length,1);
 d.getElementById('commuteResume').click();assert.equal(d.querySelectorAll('.commute-feedback').length,3);
 for(let i=0;i<3;i++)d.getElementById('commuteReviewNext').click();
 assert.equal(JSON.parse(w.localStorage.getItem('tangoCho2CommuteHistory:v1')).length,1);
 for(const level of [700,800,900]){
   dom.window.close();({dom,w,d}=await init({'tangoCho2CommuteLevel:v1':JSON.stringify(level),'tangoCho2CommuteAutoPrepare:v1':'false'}));
   d.getElementById('commuteMode').value='Part 5';
   w.callOpenAiJson=async args=>{assert.equal(JSON.parse(args.input).level,level);assert(args.instruction.includes(`targeting TOEIC ${level}`));assert(!args.instruction.includes('scoring 855'));return fixture('Part 5');};
   d.getElementById('commuteStart').click();await tick();await tick();assert.equal(JSON.parse(w.localStorage.getItem('tangoCho2Commute:v1')).level,level);
 }
 dom.window.close();
 ({dom,w,d}=await init({'tangoCho2CommuteAutoPrepare:v1':'false','tangoCho2CommuteRecent:v1':'["defer","amend"]'}));
 w.eval(`saveWords([
   {id:'1',word:'defer',meaning:'延期する'},
   {id:'2',word:'amend',meaning:'修正する'},
   {id:'3',word:'carry out',meaning:'実施する'},
   {id:'4',word:' Defer ',meaning:'延期する'}
 ])`);
 const generated=[];
 w.callOpenAiJson=async ({input})=>{
   const {type,savedTargets}=JSON.parse(input);
   generated.push({type,targets:savedTargets?.map(t=>t.word)});
   const group=fixture(type);
   if(type==='Part 7'||type==='Part 5'){
     if(generated.filter(call=>call.type===type).length===1)return group; // Missing targets must be retried.
     if(type==='Part 7'){
       group.passage+=' The team will carry out the inspection and defer the announcement.';
       return group;
     }
   }
   savedTargets?.forEach(({word},i)=>{
     const q=group.questions[i];
     q.terms[0].word=word;
     if(type==='Part 5') q.options[0]=word;
     else q.prompt=`What does “${word}” mean in this notice?`;
   });
   return group;
 };
 d.getElementById('commuteStart').click();await tick();await tick();
 assert.deepEqual(generated,[
   {type:'Part 7',targets:['carry out','defer']},
   {type:'Part 7',targets:['carry out','defer']},
   {type:'Part 5',targets:['carry out','defer']},
   {type:'Part 5',targets:['carry out','defer']},
   {type:'語彙',targets:['amend','carry out','defer']}
 ]);
 const practice=JSON.parse(w.localStorage.getItem('tangoCho2Commute:v1'));
 assert.equal(practice.groups.flatMap(g=>g.questions).length,13);
 assert.match(practice.groups[0].passage,/carry out.*defer/);
 const part5Answers=practice.groups[1].questions.map(q=>q.options[q.answer]);
 for(const target of ['carry out','defer'])assert(part5Answers.includes(target));
 dom.window.close();
 console.log('PASS: term-switch resets and stale async results; 13-question commute generation, answer gating, reload/resume, grading, deduplicated vocabulary registration and history');
})().catch(e=>{console.error(e);process.exit(1)});
