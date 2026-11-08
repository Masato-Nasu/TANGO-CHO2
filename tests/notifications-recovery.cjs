const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');

const script = fs.readFileSync(path.join(__dirname,'..','tangocho2-notifications.js'),'utf8');
const key = 'tangoCho2Push:v1';
const server = 'https://tangocho2-notifications.1bitexist.workers.dev';
const times = ['07:20','19:30'];
const stale = {server,id:'old-id',token:'old-token',times};
const config = {service:'tangocho2-notifications',publicKey:'B'.repeat(87),scheduleVersion:2,timezone:'Asia/Tokyo'};

async function until(predicate) {
  for (let i=0;i<100;i++) {
    if (predicate()) return;
    await new Promise(resolve=>setTimeout(resolve,5));
  }
  throw new Error('Notification UI did not settle');
}

function open(scheduleStatus) {
  const dom = new JSDOM('<div id="commuteSettings"></div>', {url:'https://app.invalid/',runScripts:'outside-only'});
  const w = dom.window;
  const d = w.document;
  w.localStorage.setItem(key,JSON.stringify(stale));
  const calls = [];
  const counts = {permission:0,unsubscribe:0,subscribe:0};
  w.PushManager=class {};
  w.Notification={permission:'granted',requestPermission:async()=>{counts.permission++;return 'granted';}};
  const subscription = {
    unsubscribe:async()=>{counts.unsubscribe++;return true;},
    toJSON:()=>({endpoint:'https://push.invalid/old'})
  };
  Object.defineProperty(w.navigator,'serviceWorker',{value:{ready:Promise.resolve({pushManager:{
    getSubscription:async()=>subscription,
    subscribe:async()=>{
      counts.subscribe++;
      return {toJSON:()=>({endpoint:'https://push.invalid/new'}),unsubscribe:async()=>true};
    }
  }})}});
  w.fetch=async (url,opts)=>{
    const route=new URL(url).pathname;
    calls.push({route,method:opts.method,auth:opts.headers.Authorization,body:opts.body&&JSON.parse(opts.body)});
    if(route==='/config')return {ok:true,status:200,json:async()=>config};
    if(route==='/subscriptions/old-id')return {ok:false,status:scheduleStatus,json:async()=>({error:scheduleStatus===401?'Unauthorized':'Service unavailable'})};
    if(route==='/subscriptions')return {ok:true,status:201,json:async()=>({id:'new-id',token:'new-token'})};
    return {ok:true,status:200,json:async()=>({ok:true})};
  };
  w.eval(script);
  return {dom,calls,counts,control:id=>d.getElementById('tc2Push'+id),saved:()=>JSON.parse(w.localStorage.getItem(key))};
}

(async()=>{
  const rejected=open(401);
  try {
    await until(()=>rejected.control('Msg')?.textContent.includes('再登録してください'));
    assert.deepEqual(rejected.saved(),{server,times});
    assert.equal(rejected.control('Enable').disabled,false);
    assert.equal(rejected.control('Test').disabled,true);
    assert.deepEqual(rejected.counts,{permission:0,unsubscribe:0,subscribe:0});
    rejected.control('Enable').click();
    await until(()=>rejected.control('State').textContent.includes('登録済み'));
    assert.deepEqual(rejected.saved(),{server,id:'new-id',token:'new-token',times});
    assert.deepEqual(rejected.counts,{permission:1,unsubscribe:1,subscribe:1});
    assert.deepEqual(rejected.calls.find(call=>call.route==='/subscriptions').body.times,times);
    rejected.control('Test').click();
    await until(()=>rejected.control('Msg').textContent.includes('送信しました'));
    assert.equal(rejected.calls.find(call=>call.route.endsWith('/test')).auth,'Bearer new-token');
  } finally { rejected.dom.window.close(); }

  const temporary=open(503);
  try {
    await until(()=>temporary.control('Msg')?.textContent.includes('Service unavailable'));
    assert.deepEqual(temporary.saved(),stale);
    assert.equal(temporary.control('Enable').disabled,true);
  } finally { temporary.dom.window.close(); }

  console.log('PASS: rejected registration can be renewed with saved times; temporary server errors preserve credentials');
})().catch(error=>{console.error(error);process.exitCode=1;});
