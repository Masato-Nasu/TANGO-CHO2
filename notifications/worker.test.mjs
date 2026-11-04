import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import worker,{notificationSlot,validSubscription,deliver,send} from './worker.mjs';
function env(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const keys=webpush.generateVAPIDKeys();
 return {ALLOWED_ORIGIN:'https://masato-nasu.github.io',VAPID_SUBJECT:'https://masato-nasu.github.io/TANGO-CHO2/',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,db,DB:{prepare(sql){let values=[];return {bind(...args){values=args;return this;},async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}};}}};
}
const sub=()=>{const key=createECDH('prime256v1');key.generateKeys();return {endpoint:'https://fcm.googleapis.com/fcm/send/'+randomBytes(20).toString('hex'),keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};};
const req=(path,method='GET',body,token)=>new Request('https://example.workers.dev'+path,{method,headers:{Origin:'https://masato-nasu.github.io',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
test('Tokyo schedules include previous UTC date; other times do not deliver',()=>{
 assert.equal(notificationSlot(Date.parse('2026-11-03T23:45:00Z')),'2026-11-04 08:45');
 assert.equal(notificationSlot(Date.parse('2026-11-04T09:15:00Z')),'2026-11-04 18:15');
 assert.equal(notificationSlot(Date.parse('2026-11-04T09:16:00Z')),'');
});
test('Subscription permissions, endpoint validation and token-protected deletion',async()=>{
 const e=env();let r=await worker.fetch(req('/config'),e);assert.equal((await r.json()).service,'tangocho2-notifications');
 assert.equal((await worker.fetch(new Request('https://example.workers.dev/config',{headers:{Origin:'https://evil.invalid'}}),e)).status,403);
 const s=sub();assert(validSubscription(s));assert(!validSubscription({...s,endpoint:'https://127.0.0.1/'}));assert(!validSubscription({...s,endpoint:'https://fcm.googleapis.com.evil.invalid/'}));
 assert.equal((await worker.fetch(req('/subscriptions','POST',{...s,endpoint:'http://fcm.googleapis.com/x'}),e)).status,400);
 r=await worker.fetch(req('/subscriptions','POST',s),e);assert.equal(r.status,201);const credentials=await r.json();
 assert.equal((await worker.fetch(req('/subscriptions','POST',s),e)).status,409);
 assert.equal((await worker.fetch(req('/subscriptions/'+credentials.id,'DELETE'),e)).status,401);
 assert.equal((await worker.fetch(req('/subscriptions/'+credentials.id,'DELETE',null,credentials.token),e)).status,200);
 assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM subscriptions').get().n,0);e.db.close();
});
test('Real encrypted Web Push request, no redirects, unique delivery per slot and expired subscription removal',async()=>{
 const e=env(),s=sub();const credentials=await (await worker.fetch(req('/subscriptions','POST',s),e)).json();
 const calls=[];const transport=async(url,options)=>{calls.push({url,options});return new Response('',{status:201});};
 const time=Date.parse('2026-11-03T23:45:00Z');await deliver(e,time,transport);await deliver(e,time,transport);
 assert.equal(calls.length,1);assert.equal(calls[0].url,s.endpoint);assert.equal(calls[0].options.headers['Content-Encoding'],'aes128gcm');assert.equal(calls[0].options.redirect,'error');assert(calls[0].options.body.length>20);assert(calls[0].options.headers.Authorization.includes('vapid'));
 await deliver(e,Date.parse('2026-11-04T09:15:00Z'),transport);assert.equal(calls.length,2);
 await deliver(e,Date.parse('2026-11-04T23:45:00Z'),async()=>new Response('',{status:410}));assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM subscriptions').get().n,0);e.db.close();
});
test('Failed delivery releases claim so a retried event can succeed',async()=>{
 const e=env();await worker.fetch(req('/subscriptions','POST',sub()),e);const time=Date.parse('2026-11-03T23:45:00Z');
 await deliver(e,time,async()=>new Response('',{status:503}));assert.equal(e.db.prepare('SELECT last_slot FROM subscriptions').get().last_slot,'');
 let n=0;await deliver(e,time,async()=>{n++;return new Response('',{status:201});});assert.equal(n,1);e.db.close();
});
