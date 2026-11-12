import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const id='00000000-0000-0000-0000-000000000004';
let signedIn=true, role='student', allowed=true, submitted=false, assigned=true, access=true, failRead=false, count=0, writes=0;
const hints=[{title:'First authored step'},{title:'Unrevealed secret step'}];
const query = (table) => {
  const result = () => {
    const data = table==='assignments' ? access ? {id,status:'published',allow_hints:allowed,classes:{course:'AA HL'}} : null
      : table==='profiles' ? {role}
      : table==='assignment_questions' ? assigned ? {question_id:'q1'} : null
      : table==='assignment_submissions' ? {status:submitted?'submitted':'in_progress'}
      : {revealed_steps:hints.slice(0,count)};
    return {data,error:failRead&&table==='assignment_hint_usage'?{message:'offline'}:null};
  };
  const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>result()};return chain;
};
const fakeRequire = name => {
  if(name==='next/server') return {NextResponse:{json:(body,options)=>({body,...options})}};
  if(name==='@/lib/supabase/server') return {createClient:async()=>({auth:{getUser:async()=>({data:{user:signedIn?{id:'student'}:null}})},from:query})};
  if(name==='@/lib/supabase/admin') return {createAdminClient:()=>({rpc:async(_name,args)=>{writes++;assert.equal(args.student_uuid,'student');assert.equal(args.question_key,'q1');if(args.expected_count===count)count++;return {data:hints.slice(0,count),error:null};}})};
  if(name==='@/lib/assignment-hints') return {getAssignmentHints:async()=>hints};
  throw new Error(name);
};
const compiledModule={exports:{}};
const compiled=ts.transpileModule(readFileSync('src/app/api/assignments/[id]/hints/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports','module',compiled)(fakeRequire,compiledModule.exports,compiledModule);
const {GET,POST}=compiledModule.exports;
const request = (body, origin='http://localhost') => ({nextUrl:new URL('http://localhost/api/assignments/'+id+'/hints?questionId=q1'),headers:new Headers({origin}),json:async()=>body});
const ctx={params:Promise.resolve({id})};
let response=await GET(request(),ctx);assert.equal(response.status,200);assert.deepEqual(response.body.steps,[]);assert.equal(response.headers['Cache-Control'],'private, no-store');
response=await POST(request({questionId:'q1',expectedCount:0}),ctx);assert.equal(response.status,200);assert.deepEqual(response.body.steps,[hints[0]]);assert.equal(writes,1);
assert.ok(!JSON.stringify(response.body).includes('Unrevealed'));
await POST(request({questionId:'q1',expectedCount:0}),ctx);assert.equal(count,1);
assert.equal((await POST(request({questionId:'q1',expectedCount:1},'https://other.example'),ctx)).status,403);
assert.equal((await POST(request({questionId:'../../env',expectedCount:1}),ctx)).status,400);
assert.equal((await POST(request({questionId:'q1',expectedCount:-1}),ctx)).status,400);
const savedWrites=writes;
allowed=false;response=await GET(request(),ctx);assert.deepEqual(response.body.steps,[hints[0]]);assert.equal(response.body.canReveal,false);assert.equal((await POST(request({questionId:'q1',expectedCount:1}),ctx)).status,409);
allowed=true;submitted=true;assert.equal((await POST(request({questionId:'q1',expectedCount:1}),ctx)).status,409);
submitted=false;assigned=false;assert.equal((await GET(request(),ctx)).status,403);
assigned=true;access=false;assert.equal((await GET(request(),ctx)).status,403);
access=true;role='teacher';assert.equal((await POST(request({questionId:'q1',expectedCount:1}),ctx)).status,403);
role='student';signedIn=false;assert.equal((await GET(request(),ctx)).status,401);
signedIn=true;failRead=true;assert.equal((await GET(request(),ctx)).status,503);
assert.equal(writes,savedWrites,'denied and failed requests never write hint usage');
console.log('PASS: API auth, cross-origin protection, assignment/question access, hidden steps, retry, settings, submission and errors.');
