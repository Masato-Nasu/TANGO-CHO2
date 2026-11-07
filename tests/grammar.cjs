const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const repo=path.resolve(__dirname,'..'),tick=()=>new Promise(r=>setTimeout(r,0));
(async()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(repo,'index.html'),'utf8'),{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('tangoCho2CommuteAutoPrepare:v1','false');
 w.eval(fs.readFileSync(path.join(repo,'script.js'),'utf8').replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("core-init-disabled", () => {'));
 w.eval('setupTabs();setupAddForm();');
 for(const file of ['tangocho2-grammar.js','tangocho2-commute.js'])w.eval(fs.readFileSync(path.join(repo,file),'utf8'));
 await tick();
 let aiCalls=0;w.callOpenAiJson=async()=>{aiCalls++;throw Error('offline drill must not request AI');};
 const wordsBefore=w.localStorage.getItem('tangoCho2Words');
 for (const [mode, causatives] of [['mixed',6],['causative',30]]) {
  const questions=w.TC2Grammar.create(30,mode);
  assert.equal(questions.length,30);
  assert.equal(new Set(questions.map(q=>q.prompt)).size,30);
  assert.equal(questions.filter(q=>q.category==='causative').length,causatives);
 }
 d.getElementById('commuteMode').value='Part 5';
 w.callOpenAiJson=async args=>{aiCalls++;assert.match(args.instruction,/At 800\/900/);return {title:'Business grammar',passage:'',passageTranslation:'',questions:Array.from({length:2},()=>({prompt:'Please ____ the report.',options:['submit','submission','submissive','submissively'],answer:0,translation:'報告書を提出してください。',explanation:'動詞の原形です。',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',collocation:'submit a report',example:'Please submit the report.',translation:'報告書を提出してください。'}]}))};};
 d.getElementById('commuteStart').click();await tick();await tick();
 const active=JSON.parse(w.localStorage.getItem('tangoCho2Commute:v1'));const qs=active.groups[0].questions;
 assert.equal(qs.length,5);assert.equal(qs.filter(q=>q.category==='causative').length,1);assert.equal(qs.filter(q=>q.category==='plural').length,1);assert.equal(qs.filter(q=>q.category==='tense').length,1);assert.equal(qs.filter(q=>!q.category).length,2);
 qs.forEach(q=>assert.equal(q.terms.length,1));
 d.getElementById('commuteStart').click();await tick();await tick();assert.equal(JSON.parse(w.localStorage.getItem('tangoCho2CommuteQueue:v1')).length,1);
 assert.equal(w.localStorage.getItem('tangoCho2Commute:v1'),JSON.stringify(active));
 assert.equal(aiCalls,2);assert.equal(w.localStorage.getItem('tangoCho2Words'),wordsBefore);
 dom.window.close();console.log('PASS: grammar bank question uniqueness and category mix, Part 5-only commute mode and saved-session preservation');
})().catch(e=>{console.error(e);process.exit(1)});
