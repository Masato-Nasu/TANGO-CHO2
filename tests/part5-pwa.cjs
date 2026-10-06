const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const repo = require('node:path').resolve(__dirname, '..');
const upgradeDir = fs.mkdtempSync(require('node:path').join(require('node:os').tmpdir(), 'tc2-upgrade-'));
require('node:child_process').execFileSync('tar', ['-x', '-C', upgradeDir], {input: require('node:child_process').execFileSync('git', ['archive', '4513858ffda24add1ea11630b2d7848e6afd6010'], {cwd:repo,maxBuffer:64*1024*1024})});
const fixtures = ['care','help','success','decision','creation','production','management','approval','competition','communication','delivery','development'].map((word,i)=>({id:String(i),word,meaning:'テスト用の意味'+i,status:i<3?'forgot':i<6?'fuzzy':'learned',example:'saved example',memo:'saved memo'}));
async function mockAI(page) {
 await page.evaluate(() => {
   window.testRequests = [];
   window.lessonCounter = 0;
   callOpenAiJson = async ({instruction,input}) => {
     if (instruction.includes('five-word')) {
       const n = ++window.lessonCounter;
       return {words:['inquiry','deadline','shipment','invoice','proposal'].map(w=>({word:n>1?({inquiry:'inquiries',deadline:'deadlines',shipment:'shipments',invoice:'invoices',proposal:'proposals'}[w]):w,meaning:'意味',pos:'noun',note:'メモ'})),sentence:'An inquiry concerns the deadline, shipment, invoice and proposal.',translation:'翻訳'};
     }
     const requests = JSON.parse(input);
     window.testRequests.push(...requests);
     return {questions:requests.map(r=>({index:r.index,type:r.type,sentence:'Please review the ____ before the meeting.',options:r.type==='VOCAB'?[r.word,'desk','window','chair']:[r.word,r.word+'ful',r.word+'fully',r.word+'ness'],answer:0,translation:'会議前に確認してください。',explanation:'登録語が正解です。これはUI検証用の応答です。'}))};
   };
 });
}
async function complete(page,count,wrongFirst=false) {
 for(let i=0;i<count;i++) {
  await page.locator('[data-p5-answer]').first().waitFor();
  const options=await page.locator('[data-p5-answer]').allTextContents();
  const word=await page.evaluate(()=>window.testRequests.find(r=>r.index===Number(document.querySelector('.p5-label').textContent.split(' /')[0])-1)?.word);
  // cached questions may not be in this run's requests; detect options using fixture words.
  let index=options.findIndex(s=>fixtures.some(w=>s.trim().slice(2).trim()===w.word));
  if(index<0) index=0;
  if(wrongFirst && i===0) index=(index+1)%4;
  await page.locator('[data-p5-answer]').nth(index).click();
  await page.locator('#p5Next').click();
 }
 await page.getByText('練習結果',{exact:true}).waitFor();
}
(async()=>{
 const http=require('node:http'),path=require('node:path');
 const serve=dir=>http.createServer((req,res)=>{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';const file=path.join(dir,pathname);try {const body=fs.readFileSync(file);const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(body);}catch(_){res.writeHead(404);res.end();}});
 const servers=[serve(repo),serve(upgradeDir)];
 await Promise.all(servers.map((server,i)=>new Promise(resolve=>server.listen(8765+i,'127.0.0.1',resolve))));

 const executablePath=process.env.CHROMIUM_EXECUTABLE_PATH || undefined;
 const browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote'],headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:'',contentType:'application/javascript'}));
 await page.addInitScript(words=>{
  if (!localStorage.getItem('tangoCho2Words')) localStorage.setItem('tangoCho2Words',JSON.stringify(words));
  localStorage.setItem('tangoChoWords',JSON.stringify([{id:'original',word:'original',meaning:'元のデータ',status:'learned'}]));
 },fixtures);
 await page.goto('http://127.0.0.1:8765/');
 await page.locator('#tc2FiveGenerate').waitFor({state:'attached'});
 await mockAI(page);
 const baseline=await page.evaluate(()=>localStorage.getItem('tangoCho2Words'));
 await page.locator('[data-section="part5Section"]').click();
 assert(await page.locator('#p5Start').isVisible());
 await page.locator('#p5Start').click();
 await page.locator('.p5-label').waitFor();
 assert.equal((await page.evaluate(()=>window.testRequests)).length,5);
 assert((await page.evaluate(()=>window.testRequests)).every(r=>['care','help','success','decision','creation','production'].includes(r.word)));
 await complete(page,5,true);
 let stats=await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Stats:v1')));
 assert.equal(Object.values(stats.words).reduce((n,w)=>n+w.attempts,0),5);
 assert.equal(stats.sessions.length,1);
 assert(await page.locator('#p5Stats').innerText().then(s=>s.includes('80%')));
 assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Words')),baseline);
 for(const [mode,count] of [['WORD FORM',10],['MIX',30]]) {
  await page.locator('#p5Mode').selectOption(mode);
  await page.locator('#p5Count').selectOption(String(count));
  await page.locator('#p5Start').click();
  await page.locator('.p5-label').waitFor();
  await complete(page,count);
 }
 stats=await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Stats:v1')));
 assert.equal(Object.values(stats.words).reduce((n,w)=>n+w.attempts,0),45);
 assert.equal(stats.sessions.length,3);
 assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Words')),baseline);
 console.log('PASS: VOCAB/WORD FORM/MIX, 5/10/30 questions, weak priority, accuracy/timing/history, statuses unchanged');
 await page.locator('[data-section="fortuneSection"]').click();
 await page.locator('#tc2FiveGenerate').click();
 await page.waitForFunction(()=>document.querySelectorAll('#tc2FiveResult .tc2-word').length===5);
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Words')),baseline);
 await page.locator('#tc2FiveGenerate').click();
 await page.waitForFunction(()=>document.querySelector('#tc2FiveResult strong')?.textContent==='inquiries');
 await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>loadWords().length),12);
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('tangoCho2FiveWordsSet:v2:')).length),2);
 await page.locator('#tc2FiveResult .tc2-word').first().click();
 await page.waitForFunction(()=>document.getElementById('meaning').value==='意味');
 assert.equal(await page.locator('#word').inputValue(),'inquiries');
 assert.equal(await page.evaluate(()=>loadWords().length),12);
 await page.locator('#saveBtn').click();
 await page.waitForFunction(()=>loadWords().some(w=>w.word==='inquiries'));
 assert.equal(await page.evaluate(()=>loadWords().length),13);
 assert.equal(await page.evaluate(()=>loadWords().find(w=>w.word==='inquiries').tags),'5WORDS');
 assert.equal(await page.evaluate(()=>loadWords().find(w=>w.word==='inquiries').example),'An inquiry concerns the deadline, shipment, invoice and proposal.');
 await page.locator('[data-section="fortuneSection"]').click();
 await page.waitForFunction(()=>document.querySelector('#tc2FiveResult .tc2-word').dataset.registered==='1');
 // Deleting a manually registered word must not re-register it on reload.
 await page.evaluate(()=>saveWords(loadWords().filter(w=>w.word!=='inquiries')));
 await page.reload(); await page.locator('#tc2FiveGenerate').waitFor({state:'attached'});
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>loadWords().some(w=>w.word==='inquiries')),false);
 assert.equal(await page.locator('#tc2FiveResult .tc2-word[data-registered="1"]').count(),0);
 // Native Storage mapping never touches original vocabulary.
 assert.equal(await page.evaluate(()=>JSON.parse(Object.getOwnPropertyDescriptor(Storage.prototype,'getItem').value.call(sessionStorage,'none')||'null')),null);
 const original=await page.evaluate(()=>Object.entries(localStorage).find(([k])=>k==='tangoChoWords')[1]);
 assert.equal(JSON.parse(original)[0].word,'original');
 assert(!(await page.locator('body').innerText()).includes('今日の5語'));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 assert.deepEqual(errors,[]);
 await page.locator('[data-section="listSection"]').click();
 assert((await page.locator('#wordList').innerText()).includes('care'));
 await page.locator('[data-section="quizSection"]').click();
 await page.locator('#startQuizBtn').click();
 assert.equal(await page.locator('#quizArea .choice-btn').count(),4);
 await page.locator('#quizArea .choice-btn').first().click();
 assert(await page.locator('#nextQuizBtn').isEnabled());
 await page.locator('[data-section="addSection"]').click();
 await page.locator('#word').fill('regression');
 await page.locator('#meaning').fill('回帰');
 await page.locator('#saveBtn').click();
 await page.waitForFunction(()=>loadWords().some(w=>w.word==='regression' && w.meaning==='回帰'));
 console.log('PASS: existing vocabulary list, add/save and ordinary four-choice quiz');
 console.log('PASS: repeat 5 WORDS generation on same date, manual registration only after Save, deletion respected, original storage intact, mobile layout');
 await context.close();
 // Install old Service Worker, then update assets at the same origin.
 const upgrade=await browser.newContext({viewport:{width:390,height:844}});
 const p=await upgrade.newPage();
 await p.goto('http://127.0.0.1:8766/');
 await p.waitForFunction(()=>navigator.serviceWorker.controller!==null,{timeout:90000});
 assert((await p.evaluate(()=>caches.keys())).includes('tango-cho2-cache-v0.4.0'));
 await p.evaluate(async()=>{localStorage.setItem('tangoCho2Words',JSON.stringify([{id:'pwa',word:'care',meaning:'注意',status:'fuzzy'}]));await caches.open('tango-cho-cache-original');});
 for(const file of ['index.html','service-worker.js','script.js','tangocho2-behavior.js','api-response-fix.js','tangocho2-fivewords.js','tangocho2-auto-register.js','tangocho2-progress.js','tangocho2-layout-fix.css','tangocho2-part5.js','tangocho2-backup.js','tangocho2-spelling.js']) fs.copyFileSync(`${repo}/${file}`,`${upgradeDir}/${file}`);
 await p.reload();
 await p.waitForFunction(async()=> (await caches.keys()).includes('tango-cho2-cache-v0.15.0') && !(await caches.keys()).includes('tango-cho2-cache-v0.4.0'),{timeout:90000});
 assert((await p.evaluate(()=>caches.keys())).includes('tango-cho-cache-original'));
 await p.locator('[data-section="part5Section"]').click();
 assert(await p.locator('#p5Start').isVisible());
 assert.equal(await p.evaluate(()=>loadWords()[0].status),'fuzzy');
 await upgrade.setOffline(true);
 await p.reload(); await p.locator('#p5Mode').waitFor({state:'attached'});
 await p.locator('[data-section="part5Section"]').click();
 assert(await p.locator('#p5Start').isVisible());
 await p.locator('[data-section="addSection"]').click();await p.locator('#word').fill('invoice');await p.locator('#meaning').fill('請求書');await p.locator('#saveBtn').click();await p.waitForFunction(()=>loadWords().some(w=>w.word==='invoice'));await p.locator('#savedWordViewBtn').click();assert.equal(await p.locator('#wordList .word-main').first().textContent(),'invoice');await p.locator('#wordSearch').fill('INV');assert.equal(await p.locator('#wordList .word-main').count(),1);assert.equal(await p.locator('#wordList .word-main').textContent(),'invoice');await p.reload();assert.equal(await p.evaluate(()=>loadWords().find(w=>w.word==='invoice').meaning),'請求書');
 console.log('PASS: old PWA cache upgraded, only TC2 old caches removed, data preserved, new tab available offline');
 await browser.close();
 servers.forEach(s=>s.close());
 fs.rmSync(upgradeDir,{recursive:true,force:true});
})().catch(e=>{console.error(e);process.exit(1)});
