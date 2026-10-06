const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const repo=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{let name=new URL(req.url,'http://localhost').pathname;if(name.endsWith('/'))name+='index.html';const file=path.join(repo,name);try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/json');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(8773,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox','--disable-gpu','--no-zygote']});
 const context=await browser.newContext({serviceWorkers:'block',hasTouch:true,viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.addInitScript(()=>localStorage.setItem('tangoCho2Words',JSON.stringify([
 {id:'1',word:'flurry',meaning:'にわか雪',status:'fuzzy',tags:'TOEIC',createdAt:'2020-01-01'},
 {id:'2',word:'accountable',meaning:'責任がある',status:'forgot',tags:'TOEIC',createdAt:'2020-01-02'},
 {id:'3',word:'Accounting',meaning:'会計',status:'learned',tags:'work',createdAt:'2020-01-03'}])));
 await page.goto('http://127.0.0.1:8773/');await page.locator('[data-section="listSection"]').tap();
 const baseline=await page.evaluate(()=>localStorage.getItem('tangoCho2Words'));
 const words=()=>page.locator('#wordList .word-main').allTextContents();
 await page.getByRole('searchbox',{name:'英単語を検索'}).fill('flu');assert.deepEqual(await words(),['flurry']);
 await page.locator('#wordSearch').fill(' COUNT ');assert.deepEqual(await words(),['Accounting','accountable']);assert.equal(await page.locator('#wordSearchResult').textContent(),'検索結果：2語');
 await page.locator('#statusFilter').selectOption('forgot');assert.deepEqual(await words(),['accountable']);await page.locator('#statusFilter').selectOption('all');await page.locator('#tagFilter').selectOption('work');assert.deepEqual(await words(),['Accounting']);
 await page.locator('#tagFilter').selectOption('all');await page.locator('#sortOrder').selectOption('alpha');assert.deepEqual(await words(),['accountable','Accounting']);
 await page.locator('#wordSearch').fill('zzzzzz');assert.equal(await page.locator('#wordSearchResult').textContent(),'検索結果：0語');assert((await page.locator('#wordList').textContent()).includes('該当する単語がありません'));
 await page.locator('#wordSearch').fill('');assert.equal((await words()).length,3);assert(!(await page.locator('#wordSearchResult').isVisible()));assert.equal(await page.evaluate(()=>localStorage.getItem('tangoCho2Words')),baseline);
 assert(await page.locator('#wordSearch').evaluate(e=>e.getBoundingClientRect().width>250));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#wordSearch').fill('flurry');await page.locator('[data-section="addSection"]').tap();await page.locator('#word').fill('invoice');await page.locator('#meaning').fill('請求書');await page.locator('#saveBtn').tap();await page.locator('#savedWordViewBtn').tap();assert.equal(await page.locator('#wordSearch').inputValue(),'');assert.equal(await page.locator('#wordList .word-main').first().textContent(),'invoice');
 assert.deepEqual(errors,[]);console.log('PASS: mobile partial/case-insensitive search, result count, status/tag/sort combination, no results/clear, data unchanged, saved-word confirmation clears search');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
