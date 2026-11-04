import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createECDH,randomBytes} from 'node:crypto';
import webpush from 'web-push';
import worker,{notificationSlot,validSubscription,deliver,send,normalizeTimes} from './worker.mjs';
function env(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const keys=webpush.generateVAPIDKeys();
 return {ALLOWED_ORIGIN:'https://masato-nasu.github.io',VAPID_SUBJECT:'https://masato-nasu.github.io/TANGO-CHO2/',VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,db,DB:{async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}},prepare(sql){let values=[];return {bind(...args){values=args;return this;},async first(){return db.prepare(sql).get(...values)||null;},async all(){return {results:db.prepare(sql).all(...values)};},async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}};}}};
}
const sub=()=>{const key=createECDH('prime256v1');key.generateKeys();return {endpoint:'https://fcm.googleapis.com/fcm/send/'+randomBytes(20).toString('hex'),keys:{p256dh:key.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};};
const req=(path,method='GET',body,token)=>new Request('https://example.workers.dev'+path,{method,headers:{Origin:'https://masato-nasu.github.io',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
test('Tokyo schedules support arbitrary times and the previous UTC date',()=>{
 assert.equal(notificationSlot(Date.parse('2026-11-03T23:45:00Z')),'2026-11-04 08:45');
 assert.equal(notificationSlot(Date.parse('2026-11-04T09:15:00Z')),'2026-11-04 18:15');
 assert.equal(notificationSlot(Date.parse('2026-11-04T09:16:00Z')),'2026-11-04 18:16');
 assert.deepEqual(normalizeTimes(['18:20','07:10','07:10']),['07:10','18:20']);
 for(const times of [[],['24:00'],['12:60'],['7:10'],Array(7).fill('08:00')])assert.equal(normalizeTimes(times),null);
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

test('Custom schedule update is authenticated, persists, replaces old times and survives schema reruns',async()=>{
 const e=env();const credentials=await(await worker.fetch(req('/subscriptions','POST',{subscription:sub(),times:['07:10','20:30']}),e)).json();
 const url='/subscriptions/'+credentials.id;
 assert.deepEqual((await(await worker.fetch(req(url,'GET',null,credentials.token),e)).json()).times,['07:10','20:30']);
 assert.equal((await worker.fetch(req(url,'PUT',{times:['06:00']}),e)).status,401);
 assert.equal((await worker.fetch(req(url,'PUT',{times:['24:00']},credentials.token),e)).status,400);
 assert.equal((await worker.fetch(req(url,'PUT',{times:['06:00','22:05']},credentials.token),e)).status,200);
 e.db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 assert.deepEqual((await(await worker.fetch(req(url,'GET',null,credentials.token),e)).json()).times,['06:00','22:05']);
 const calls=[];const transport=async(url)=>{calls.push(url);return new Response('',{status:201});};
 await deliver(e,Date.parse('2026-11-03T23:45:00Z'),transport);await deliver(e,Date.parse('2026-11-03T22:10:00Z'),transport);assert.equal(calls.length,0);
 await deliver(e,Date.parse('2026-11-03T21:00:00Z'),transport);await deliver(e,Date.parse('2026-11-03T21:00:00Z'),transport);assert.equal(calls.length,1);
 await deliver(e,Date.parse('2026-11-04T13:05:00Z'),transport);assert.equal(calls.length,2);
 await worker.fetch(req(url,'DELETE',null,credentials.token),e);assert.equal(e.db.prepare('SELECT COUNT(*) AS n FROM schedules').get().n,0);e.db.close();
});
