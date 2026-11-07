const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const repo=path.resolve(__dirname,'..'),KEY='tangoCho2Commute:v1';
const full='従業員の皆様へ\n新しい申請手続きは金曜日に始まります。\n締切を過ぎる場合は、事前に担当者へ連絡してください。\n管理部 <担当>';
const saved={id:'translation-regression',index:0,complete:false,answerLayoutVersion:1,level:900,groups:[3,5].map((count,g)=>({type:g?'Part 5':'Part 7',title:'Office notice',passage:g?'':Array(150).fill('office').join(' '),passageTranslation:g?'':full,graded:false,questions:Array.from({length:count},()=>({prompt:g?'Please ____ the report before Friday.':'When does the new process start?',options:['submit','submission','submissive','submissively'],answer:0,choice:0,translation:g?'金曜日より前に報告書を提出してください。':'新しい手続きはいつ始まりますか。',explanation:'正解の理由',terms:[{word:'submit',meaning:'提出する',pronunciation:'səbˈmɪt',collocation:'submit a report',example:'Please submit the report.',translation:'報告書を提出してください。'}]}))}))};
async function init(storage){const dom=new JSDOM(fs.readFileSync(path.join(repo,'index.html'),'utf8'),{url:'https://test.invalid/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};for(const[k,v]of Object.entries(storage))w.localStorage.setItem(k,v);w.eval(fs.readFileSync(path.join(repo,'script.js'),'utf8').replace('document.addEventListener("DOMContentLoaded", () => {','document.addEventListener("skip-core", () => {'));w.eval('setupTabs();setupAddForm();');for(const f of ['tangocho2-grammar.js','tangocho2-commute.js'])w.eval(fs.readFileSync(path.join(repo,f),'utf8'));await new Promise(r=>setTimeout(r,0));return{dom,w,d};}
(async()=>{
 let {dom,w,d}=await init({[KEY]:JSON.stringify(saved),'tangoCho2CommuteAutoPrepare:v1':'false'});
 assert(!d.querySelector('#commutePractice .commute-full-translation'),'hide translation before grading');
 d.getElementById('commuteGrade').click();
 function check(container){const translation=container.querySelector('.commute-full-translation');assert(translation);assert.equal(translation.querySelector('p').textContent,full);assert.equal(translation.closest('details:not([open])'),null);assert(translation.compareDocumentPosition(container.querySelector('.commute-question'))&w.Node.DOCUMENT_POSITION_FOLLOWING);assert(!translation.querySelector('担当'));}
 check(d.getElementById('commutePractice'));
 assert.equal(JSON.parse(w.localStorage.getItem(KEY)).groups[0].passageTranslation,full);
 const storage=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));dom.window.close();({dom,w,d}=await init(storage));
 check(d.getElementById('commutePractice'));
 const activeBefore=w.localStorage.getItem(KEY);d.querySelector('[data-history-open="translation-regression"]').click();check(d.getElementById('commuteReview'));assert.equal(w.localStorage.getItem(KEY),activeBefore);
 d.getElementById('commuteReviewClose').click();d.getElementById('commuteNext').click();d.getElementById('commuteGrade').click();
 const translations=[...d.querySelectorAll('#commutePractice .commute-question-translation')];assert.equal(translations.length,5);assert(translations.every(el=>el.querySelector('h4').textContent==='問題文の全文日本語訳'));assert(translations.every(el=>el.querySelector('p').textContent==='金曜日より前に報告書を提出してください。'));
 dom.window.close();console.log('PASS: full passage translation opens after grading, before questions, survives reload and history review; escaped multiline content and Part 5 full-sentence labels');
})().catch(e=>{console.error(e);process.exit(1)});
