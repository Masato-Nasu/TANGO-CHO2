const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(repo,'index.html'),'utf8'),{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('tangoCho2CommuteAutoPrepare:v1','false');
 w.eval(fs.readFileSync(path.join(repo,'script.js'),'utf8').replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("core-init-disabled", () => {'));
 w.eval('setupTabs();setupAddForm();');
 for(const file of ['tangocho2-grammar.js','tangocho2-part5.js','tangocho2-commute.js']){let source=fs.readFileSync(path.join(repo,file),'utf8');if(file==='tangocho2-grammar.js')source=source.replace('Object.freeze({create})','Object.freeze({create,bank})');w.eval(source);}
 await tick();
 let aiCalls=0;w.callOpenAiJson=async()=>{aiCalls++;throw Error('offline drill must not request AI');};
 const wordsBefore=w.localStorage.getItem('tangoCho2Words');
 for(const mode of ['GRAMMAR','CAUSATIVE']){
  const control=d.getElementById('p5Mode');control.value=mode;control.dispatchEvent(new w.Event('change'));
  assert(d.getElementById('p5Priority').disabled);d.getElementById('p5Count').value='30';
  d.getElementById('p5Start').click();await tick();
  const seen=new Set(),positions=[0,0,0,0];let causatives=0;
  for(let i=0;i<30;i++){
   const text=d.querySelector('.p5-sentence').textContent;assert(!seen.has(text),'no repeated question within a drill');seen.add(text);
   assert.match(d.querySelector('.p5-label').textContent,new RegExp(`${i+1} / 30`));
   // The correct answer is retained in the original question bank, not derived from displayed option position.
   const expected=w.TC2Grammar.bank.find(q=>q.prompt===text);
   assert(expected);if(expected.category==='causative')causatives++;
   const options=[...d.querySelectorAll('[data-p5-answer]')];const index=options.findIndex(b=>b.textContent.slice(1).trim()===expected.options[expected.answer]);assert(index>=0);positions[index]++;
   const wrong=mode==='GRAMMAR'&&i===0;options[wrong?(index+1)%4:index].click();assert.match(d.getElementById('p5Feedback').textContent,wrong?/^不正解 ·/:/^正解 ·/);assert(d.getElementById('p5Feedback').textContent.includes(expected.translation));
   d.getElementById('p5Next').click();
  }
  assert.equal(causatives,mode==='CAUSATIVE'?30:6);assert(Math.max(...positions)-Math.min(...positions)<=1);
 }
 assert.equal(aiCalls,0);assert.equal(w.localStorage.getItem('tangoCho2Words'),wordsBefore);
 const stats=JSON.parse(w.localStorage.getItem('tangoCho2Part5Stats:v1'));assert.equal(Object.keys(stats.words).length,0);assert.equal(Object.values(stats.grammar).reduce((n,x)=>n+x.attempts,0),60);assert.equal(Object.values(stats.grammar).reduce((n,x)=>n+x.correct,0),59);
 assert.match(d.getElementById('p5Stats').textContent,/60問/);
 d.getElementById('commuteMode').value='Part 5';
 w.callOpenAiJson=async args=>{aiCalls++;assert.match(args.instruction,/At 800\/900/);return {title:'Business grammar',passage:'',passageTranslation:'',questions:Array.from({length:5},()=>({prompt:'Please ____ the report.',options:['submit','submission','submissive','submissively'],answer:0,translation:'報告書を提出してください。',explanation:'動詞の原形です。',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',collocation:'submit a report',example:'Please submit the report.',translation:'報告書を提出してください。'}]}))};};
 d.getElementById('commuteStart').click();await tick();await tick();
 const active=JSON.parse(w.localStorage.getItem('tangoCho2Commute:v1'));const qs=active.groups[0].questions;
 assert.equal(qs.length,5);assert.equal(qs.filter(q=>q.category==='causative').length,1);assert.equal(qs.filter(q=>q.category==='plural').length,1);assert.equal(qs.filter(q=>q.category==='tense').length,1);assert.equal(qs.filter(q=>!q.category).length,2);
 qs.forEach(q=>assert.equal(q.terms.length,1));
 d.getElementById('commuteStart').click();await tick();await tick();assert.equal(JSON.parse(w.localStorage.getItem('tangoCho2CommuteQueue:v1')).length,1);
 assert.equal(w.localStorage.getItem('tangoCho2Commute:v1'),JSON.stringify(active));
 assert.equal(aiCalls,2);assert.equal(w.localStorage.getItem('tangoCho2Words'),wordsBefore);
 dom.window.close();console.log('PASS: offline 30-question drills, unique questions, balanced answers, 1/5 causatives, separate grammar stats, commute quota and saved-session preservation');
})().catch(e=>{console.error(e);process.exit(1)});
