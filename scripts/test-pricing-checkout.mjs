import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
function load(file, imports, globals={}) {
  const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={}; vm.runInNewContext(output,{exports,require:name=>{if(name in imports)return imports[name];throw Error(name);},console,URL,URLSearchParams,Date,Buffer,...globals});return exports;
}
const products=load('src/lib/platform-products.ts',{});
const all=[...products.courseProducts,products.teacherPlusProduct];
let session, sent, inserts=[];
const env={STRIPE_MODE:'test',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture'};
for(const p of all)for(const plan of p.plans)env[plan.stripePriceEnv]=`price_${p.id}_${plan.id}`;
const admin={from(table){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};},async upsert(data){inserts.push({table,data});return {error:null};}};}};
const shared={'next/server':{NextResponse:{json:(data,opts)=>Response.json(data,opts)}},'node:crypto':{randomUUID,createHmac,timingSafeEqual},'@/lib/platform-products':products,'@/lib/supabase/admin':{createAdminClient:()=>admin}};
const checkout=load('src/app/api/platform/checkout/route.ts',{...shared,'@/lib/platform-server':{getPlatformAccess:async()=>session}},{process:{env},fetch:async(url,options)=>{sent=new URLSearchParams(options.body);const price=sent.get('line_items[0][price]');const plan=all.flatMap(p=>p.plans).find(p=>env[p.stripePriceEnv]===price);return Response.json({url:'https://checkout.stripe.com/test',amount_total:plan.priceUsd*100,currency:'usd'});}});
const webhook=load('src/app/api/stripe/webhook/route.ts',shared,{process:{env}});
const user={id:'00000000-0000-0000-0000-000000000001',email:'test@example.test'};
for(const product of all){
 for(const plan of product.plans){
  for(const role of product.id==='teacher-plus'?['teacher']:['student','teacher']){
   session={user,curriculum:product.curriculum,profile:{role},entitlements:[],ownedCourses:[]};
   const body={...(product.id==='teacher-plus'?{productId:product.id}:{courseId:product.id}),planId:plan.id,requestId:randomUUID()};
   const request=new Request('https://example.test/api/platform/checkout',{method:'POST',headers:{origin:'https://example.test'},body:JSON.stringify(body)});
   assert.equal((await checkout.POST(request)).status,200);
   assert.equal(sent.get('metadata[plan_id]'),plan.id);assert.equal(sent.get('metadata[product_code]'),product.productCode);
   if(role==='teacher'&&product.id!=='teacher-plus')assert.match(sent.get('success_url'),/single=1/);
  }
  inserts=[];
  const event={id:`evt_${product.id}_${plan.id}`,type:'checkout.session.completed',livemode:false,data:{object:{id:`cs_${product.id}_${plan.id}`,metadata:{user_id:user.id,product_code:product.productCode,plan_id:plan.id},client_reference_id:user.id,mode:'payment',currency:'usd',amount_total:plan.priceUsd*100,payment_status:'paid'}}};
  const body=JSON.stringify(event),stamp=Math.floor(Date.now()/1000);const signature=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(`${stamp}.${body}`).digest('hex');
  const res=await webhook.POST(new Request('https://example.test/api/stripe/webhook',{method:'POST',headers:{'stripe-signature':`t=${stamp},v1=${signature}`},body}));
  assert.equal(res.status,200);
  const entitlement=inserts.find(x=>x.table==='platform_entitlements')?.data;assert.ok(entitlement);
  assert.equal(new Date(entitlement.expires_at)-new Date(entitlement.starts_at),plan.accessDays*86400000);
  assert.equal(entitlement.product_code,product.productCode);
 }
}
session={user,curriculum:'ib',profile:{role:'teacher'},ownedCourses:[products.courseProducts[0]],entitlements:[{product_code:'course_ib_aa_hl',external_provider:'plus_trial'}]};
sent=null;
await checkout.POST(new Request('https://example.test/api/platform/checkout',{method:'POST',headers:{origin:'https://example.test'},body:JSON.stringify({courseId:'aa-hl',planId:'one-year'})}));
assert.ok(sent,'an active trial must not block payment');
session.entitlements[0].external_provider='stripe';sent=null;
await checkout.POST(new Request('https://example.test/api/platform/checkout',{method:'POST',headers:{origin:'https://example.test'},body:JSON.stringify({courseId:'aa-hl',planId:'one-year'})}));
assert.equal(sent,null,'existing paid access prevents duplicate purchase');
session.profile.role='student';
assert.equal((await checkout.POST(new Request('https://example.test/api/platform/checkout',{method:'POST',headers:{origin:'https://example.test'},body:JSON.stringify({productId:'teacher-plus',planId:'two-years'})}))).status,403);
assert.equal((await checkout.POST(new Request('https://example.test/api/platform/checkout',{method:'POST',headers:{origin:'https://other.test'},body:'{}'}))).status,403);
console.log('Passed all IB and IGCSE plan checkout amounts, teacher single-course purchases, signed webhook durations, trial-to-paid checkout and paid duplicate protection.');
