const {chromium} = require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{let pathname=new URL(req.url,'http://localhost').pathname;if(pathname.endsWith('/'))pathname+='index.html';const file=path.join(repo,pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(8767,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:true});
 const page=await context.newPage();let downloads=0;const errors=[];
 page.on('download',()=>downloads++);page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.addInitScript(()=>{
  if(!localStorage.getItem('tangoCho2Words'))localStorage.setItem('tangoCho2Words',JSON.stringify([{id:'1',word:'initial',meaning:'初期',status:'fuzzy'}]));
  localStorage.setItem('tangoChoWords',JSON.stringify([{id:'original',word:'original',meaning:'元のアプリ',status:'learned'}]));
  localStorage.setItem('tangoChoOpenAiApiKey','test-only-placeholder-key');
 });
 await page.goto('http://127.0.0.1:8767/');await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 for(let i=1;i<=8;i++) {
  await page.evaluate(i=>{
   saveWords([{id:String(i),word:'generation'+i,meaning:'世代'+i,status:i%2?'fuzzy':'forgot'}]);
   if(i===8)localStorage.setItem('tangoCho2Part5Stats:v1',JSON.stringify({words:{generation8:{word:'generation8',attempts:2,correct:1,ms:1200}},sessions:[]}));
  },i);
  await page.reload();await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 }
 const history=()=>page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('tangoCho2AutomaticBackups',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  return await new Promise(resolve=>{const r=db.transaction('snapshots').objectStore('snapshots').getAll();r.onsuccess=()=>resolve(r.result);});
 });
 let items=await history();assert.equal(items.length,5);assert.equal(items.at(-1).payload.words[0].word,'generation8');assert.equal(items.at(-1).payload.part5.words.generation8.correct,1);assert.equal(downloads,0);
 console.log('PASS: automatic snapshots rotate at five generations, include Part 5 results and produce no downloads');
 const initialHistory=structuredClone(items);
 await page.reload();await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 items=await history();
 assert.deepEqual(items.map(x=>x.id),initialHistory.map(x=>x.id));
 assert(items.at(-1).savedAt>initialHistory.at(-1).savedAt);
 assert.deepEqual(items.slice(0,-1),initialHistory.slice(0,-1));
 assert.deepEqual(items.at(-1).payload.words,initialHistory.at(-1).payload.words);
 assert.deepEqual(items.at(-1).payload.part5,initialHistory.at(-1).payload.part5);
 const openedAt=items.at(-1).savedAt;
 await page.waitForTimeout(20);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await page.waitForTimeout(100);
 items=await history();assert(items.at(-1).savedAt>openedAt);assert.deepEqual(items.map(x=>x.id),initialHistory.map(x=>x.id));
 const shownAt=items.at(-1).savedAt;
 await page.waitForTimeout(20);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.waitForTimeout(100);
 items=await history();assert.equal(items.at(-1).savedAt,shownAt);
 const beforeChanges=structuredClone(items);
 await page.evaluate(()=>{
  const words=loadWords();words[0].memo='開いている間の変更';saveWords(words);
  window.dispatchEvent(new Event('storage'));window.dispatchEvent(new Event('pagehide'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:false}));
 });
 await page.waitForTimeout(1100);assert.deepEqual(await history(),beforeChanges);
 await page.reload();await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 items=await history();assert.equal(items.at(-1).payload.words[0].memo,'開いている間の変更');assert.equal(downloads,0);assert.equal(items.length,5);
 assert(!JSON.stringify(items).includes('test-only-placeholder-key'));
 console.log('PASS: one snapshot per opening/BFCache return, no extra snapshots on writes/visibility/pagehide/initial pageshow, latest changes captured next opening');

 await page.locator('#connSettingsCard summary').click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportJsonBtn').click();const download=await downloadPromise;
 const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
 assert.equal(exported.words[0].status,'forgot');assert.equal(exported.part5.words.generation8.correct,1);
 assert(!JSON.stringify(exported).includes('test-only-placeholder-key'));assert.equal(downloads,1);
 const chosen=items[0];await page.locator('#tc2BackupHistory').selectOption(String(chosen.id));
 page.once('dialog',d=>d.dismiss());await page.locator('#tc2BackupRestore').click();await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>loadWords()[0].word),'generation8');
 page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('load'),page.locator('#tc2BackupRestore').click()]);
 await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 assert.equal(await page.evaluate(()=>loadWords()[0].word),chosen.payload.words[0].word);
 items=await history();assert.equal(items.length,5);assert(items.some(x=>x.payload.words[0].word==='generation8'));
 console.log('PASS: restoration is manual, cancellation preserves data, and the pre-restore state remains recoverable');
 await page.locator('#connSettingsCard summary').click();
 // Import exported extended JSON, including Part 5 stats, through the existing file control.
 page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('load'),page.locator('#importJsonInput').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))})]);
 await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 assert.equal(await page.evaluate(()=>loadWords()[0].word),'generation8');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Stats:v1')).words.generation8.correct),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('tangoChoOpenAiApiKey')),'test-only-placeholder-key');
 assert.equal(await page.evaluate(()=>JSON.parse(Object.entries(localStorage).find(([key])=>key==='tangoChoWords')[1])[0].word),'original');
 // Legacy word-only JSON retains the existing Part 5 results.
 const old=[{id:'old',word:'legacy',meaning:'旧JSON',status:'fuzzy'}];
 page.once('dialog',d=>d.accept());await Promise.all([page.waitForEvent('load'),page.locator('#importJsonInput').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))})]);
 await page.locator('#tc2BackupHistory option').first().waitFor({state:'attached'});
 assert.equal(await page.evaluate(()=>loadWords()[0].status),'fuzzy');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('tangoCho2Part5Stats:v1')).words.generation8.correct),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: extended and legacy JSON imports, fuzzy status, Part 5 results, key exclusion and original app storage');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
