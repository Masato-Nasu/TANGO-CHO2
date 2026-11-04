import webpush from 'web-push';

const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
export function validSubscription(sub) {
  if (!sub || typeof sub.endpoint !== 'string' || sub.endpoint.length > 2000 || !sub.keys) return false;
  let u;try {u=new URL(sub.endpoint);}catch{return false;}
  const h=u.hostname;
  const host=h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h.endsWith('.push.services.mozilla.com')||h==='web.push.apple.com'||h.endsWith('.push.apple.com')||h.endsWith('.notify.windows.com');
  return u.protocol==='https:' && !u.username && !u.password && !u.port && host && /^[\w-]{87}$/.test(sub.keys.p256dh) && /^[\w-]{22}$/.test(sub.keys.auth);
}
export function notificationSlot(timestamp) {
  const date=new Date(timestamp+9*60*60*1000);
  const hour=date.getUTCHours(),minute=date.getUTCMinutes();
  // A scheduled trigger may be delivered late, so use its scheduled timestamp.
  const time=hour===8&&minute===45?'08:45':hour===18&&minute===15?'18:15':'';
  return time?`${date.toISOString().slice(0,10)} ${time}`:'';
}
function reply(data,status,origin) {return Response.json(data,{status,headers:{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS'}});}
async function authorized(request,env,id) {
  const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row=await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ?').bind(id).first();
  return row && row.token_hash===await hash(token)?row:null;
}
export async function send(sub,env,slot,transport=fetch) {
  const options={TTL:1800,urgency:'normal',topic:'tc2-commute',vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY}};
  const details=webpush.generateRequestDetails(sub,JSON.stringify({slot}),options);
  return transport(details.endpoint,{method:details.method,headers:details.headers,body:details.body,redirect:'error'});
}
export async function deliver(env,timestamp,transport=fetch) {
  const slot=notificationSlot(timestamp);if(!slot)return;
  let lastId='';
  while(true){
    const {results}=await env.DB.prepare('SELECT * FROM subscriptions WHERE id > ? ORDER BY id LIMIT 100').bind(lastId).all();
    if(!results.length)break;
    for(const row of results){
      lastId=row.id;
      const claim=await env.DB.prepare('UPDATE subscriptions SET last_slot = ? WHERE id = ? AND last_slot != ?').bind(slot,row.id,slot).run();
      if(!claim.meta.changes)continue;
      try {
        const subscription=JSON.parse(row.subscription);
        if(!validSubscription(subscription))throw new Error('invalid subscription');
        const response=await send(subscription,env,slot,transport);
        if(response.status===404||response.status===410)await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(row.id).run();
        else if(!response.ok)throw new Error('push failed');
      }catch{
        // Retry duplicate trigger deliveries without recording endpoints or tokens in logs.
        await env.DB.prepare('UPDATE subscriptions SET last_slot = ? WHERE id = ? AND last_slot = ?').bind('',row.id,slot).run();
        console.error('Notification delivery failed');
      }
    }
    if(results.length<100)break;
  }
}
export default {
  async fetch(request,env){
    const allowed=env.ALLOWED_ORIGIN;
    const origin=request.headers.get('Origin');
    if(origin!==allowed)return new Response('Forbidden',{status:403});
    const json=(data,status=200)=>reply(data,status,allowed);
    const {pathname}=new URL(request.url);
    if(request.method==='OPTIONS')return reply({},200,allowed);
    if(pathname==='/config'&&request.method==='GET'){
      if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY)return json({error:'通知サーバーの鍵を設定してください。'},503);
      return json({service:'tangocho2-notifications',publicKey:env.VAPID_PUBLIC_KEY,times:['08:45','18:15'],timezone:'Asia/Tokyo'});
    }
    if(pathname==='/subscriptions'&&request.method==='POST'){
      if(!request.headers.get('Content-Type')?.includes('application/json'))return json({error:'JSON required'},415);
      const raw=await request.text();if(raw.length>5000)return json({error:'Too large'},413);
      let sub;try{sub=JSON.parse(raw);}catch{return json({error:'Invalid JSON'},400);}
      if(!validSubscription(sub))return json({error:'Invalid push subscription'},400);
      const id=crypto.randomUUID(),token=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
      try{await env.DB.prepare('INSERT INTO subscriptions (id, endpoint, subscription, token_hash, created_at) VALUES (?, ?, ?, ?, ?)').bind(id,sub.endpoint,JSON.stringify(sub),await hash(token),new Date().toISOString()).run();}
      catch{return json({error:'登録できませんでした。通知を解除してから再度登録してください。'},409);}
      return json({id,token},201);
    }
    const match=pathname.match(/^\/subscriptions\/([a-f0-9-]{36})(\/test)?$/);
    if(match){
      const row=await authorized(request,env,match[1]);if(!row)return json({error:'Unauthorized'},401);
      if(request.method==='DELETE'&&!match[2]){await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(row.id).run();return json({ok:true});}
      if(request.method==='POST'&&match[2]){
        try{const response=await send(JSON.parse(row.subscription),env,'test');return json({ok:response.ok},response.ok?200:502);}catch{return json({error:'通知を送信できませんでした。'},502);}
      }
    }
    return json({error:'Not found'},404);
  },
  async scheduled(event,env,ctx){ctx.waitUntil(deliver(env,event.scheduledTime));}
};
