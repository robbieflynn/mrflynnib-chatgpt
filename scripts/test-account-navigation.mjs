import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
const require = createRequire(import.meta.url);
const dom = new JSDOM('<div id="root"></div>', {url:'https://example.test/teacher'});
Object.assign(globalThis, {window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
let pathname='/teacher', configured=false, profileError=null, accessError=null, signedOut=false;
let fixtureRole='admin', grants=[];
const routes=[];
const client={auth:{getUser:async()=>({data:{user:{id:'fixture',email:'robert@example.test',user_metadata:{}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{signedOut=true;return {error:null};}},from(table){const q={select(){return q},eq(){return q},is(){return q},maybeSingle(){return Promise.resolve({data:{role:fixtureRole,display_name:'Robert Flynn'},error:profileError})},then(resolve){resolve({data:table==='platform_entitlements'?grants:[],error:accessError})}};return q;}};
function compile(file, imports={}) {
 const mod={exports:{}};
 const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(output,{module:mod,exports:mod.exports,require:id=>id.endsWith('.css')?{}:imports[id]??require(id),window,document,URLSearchParams,Date,setTimeout,clearTimeout,console});
 return mod.exports;
}
const access=compile('src/lib/platform-access.ts');
const {AccountMenu}=compile('src/components/account-menu.tsx',{
 'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
 'next/navigation':{usePathname:()=>pathname,useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push:p=>routes.push(p),refresh(){}})},
 '@/lib/supabase/config':{hasSupabaseBrowserConfig:()=>configured},
 '@/lib/supabase/client':{createClient:()=>client},
 '@/lib/platform-access':access,
});
const now=new Date('2026-11-14T00:00:00Z');
const grant=code=>({product_code:code,status:'active',starts_at:'2026-01-01',expires_at:'2027-01-01'});
for(const [role,entitlements,seats,curriculum,expected] of [
 ['admin',[],[],'ib','plus'],['student',[],[],'ib','standard'],['teacher',[],[],'ib','standard'],
 ['student',[grant('course_ib_aa_hl')],[],'ib','plus'],['teacher',[grant('teacher_plus_ib')],[],'ib','plus'],
 ['teacher',[grant('course_ib_aa_hl')],[],'ib','standard'],
 ['student',[{...grant('course_ib_aa_hl'),expires_at:'2026-01-02'}],[],'ib','standard'],
 ['student',[{...grant('course_ib_aa_hl'),starts_at:'2027-01-01'}],[],'ib','standard'],
 ['teacher',[],[{revoked_at:null,organization_licenses:{product_code:'teacher_plus_ib',status:'pilot',starts_at:'2026-01-01',ends_at:null}}],'ib','plus'],
 ['teacher',[],[{revoked_at:'2026-01-01',organization_licenses:{product_code:'teacher_plus_ib',status:'active',starts_at:'2026-01-01',ends_at:null}}],'ib','standard'],
 ['student',[grant('course_ib_aa_hl')],[],'igcse','standard'],['teacher',[grant('course_igcse')],[],'igcse','plus'],
]) {
 const summary=access.platformAccessSummary(entitlements,seats,now,curriculum);
 assert.equal(access.accountTier(role,summary,curriculum),expected);
 pathname=curriculum==='igcse'?'/igcse/account':'/account';
 const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(AccountMenu,{initialAccount:{displayName:'Robert Flynn',email:'robert@example.test',role,curriculum,...summary},showNavigation:true})));
 const teacher=role==='admin'||role==='teacher';
 assert.equal(document.querySelector('.account-home-link').textContent,teacher?'Teacher home':'My learning');
 assert.equal(document.querySelector('.account-home-link').getAttribute('href'),`${curriculum==='igcse'?'/igcse':''}/${teacher?'teacher':'account'}`);
 assert.equal(document.querySelector('.account-greeting').textContent,'Robert');
 assert.equal(Boolean(document.querySelector('.account-upgrade-button')),expected==='standard');
 assert.equal(document.querySelector('.account-tier-badge'),null,'Account status stays inside the dropdown');
 if(expected==='standard')assert.equal(document.querySelector('.account-upgrade-button').getAttribute('href'),curriculum==='igcse'?'/igcse/account/access':teacher?'/teacher/access':'/account/access');
 const trigger=document.querySelector('button');
 await act(async()=>trigger.click());
 assert(document.querySelector('.account-menu-panel'));
 assert.equal(document.querySelector('.account-menu-access-summary strong').textContent,expected==='plus'?'Plus account':'Standard account');
 await act(async()=>document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 assert.equal(document.querySelector('.account-menu-panel'),null);assert.equal(document.activeElement,trigger);
 await act(async()=>trigger.click());
 await act(async()=>document.body.dispatchEvent(new window.MouseEvent('mousedown',{bubbles:true})));
 assert.equal(document.querySelector('.account-menu-panel'),null);
 await act(async()=>root.unmount());
}
configured=true;pathname='/teacher';
for(const role of ['admin','teacher','student']) {
 fixtureRole=role;accessError={message:'Temporary access failure'};
 const root=createRoot(document.getElementById('root'));
 await act(async()=>root.render(React.createElement(AccountMenu,{showNavigation:true,showSignedOut:true})));
 assert.equal(document.querySelector('.account-upgrade-button'),null,'Failed lookup must not sell an upgrade as if Standard');
 assert.equal(document.querySelector('.account-tier-badge'),null);
 await act(async()=>document.querySelector('button').click());
 assert.equal(document.querySelector('.account-menu-access-summary strong').textContent,role==='admin'?'Plus account':'Check account access');
 await act(async()=>root.unmount());
}
profileError={message:'Profile unavailable'};
let root=createRoot(document.getElementById('root'));
await act(async()=>root.render(React.createElement(AccountMenu,{showSignedOut:true})));
assert.equal(document.getElementById('root').textContent,'My account');
await act(async()=>root.unmount());
configured=false;root=createRoot(document.getElementById('root'));
await act(async()=>root.render(React.createElement(AccountMenu,{initialAccount:{displayName:'Robert Flynn',email:'robert@example.test',role:'admin',curriculum:'ib'}})));
await act(async()=>document.querySelector('button').click());
await act(async()=>document.querySelector('.account-menu-signout').click());
assert(signedOut);assert.deepEqual(routes,['/account']);await act(async()=>root.unmount());
// Exercise the course player's real header function against its real HTML.
const player=new JSDOM(fs.readFileSync('public/learn/index.html','utf8'));
const app=fs.readFileSync('public/learn/app.js','utf8');
const render=app.slice(app.indexOf('function renderAccountHeader('),app.indexOf('async function bootstrapAccount()'));
const context={document:player.window.document};vm.runInNewContext(render,context);
for(const role of ['admin','teacher','student']) for(const curriculum of ['ib','igcse']) for(const plus of [false,true]) {
 context.renderAccountHeader({user:{role,displayName:'Robert Flynn'},curriculum,access:{hasCourseAccess:plus,hasTeacherPlus:plus},links:{access:curriculum==='igcse'?'/igcse/account/access':role==='student'?'/account/access':'/teacher/access'}});
 assert.equal(context.document.getElementById('primaryLearningHomeLink').querySelector('strong').textContent,role==='student'?'My learning':'Teacher dashboard');
 assert.equal(context.document.getElementById('siteClassesLink').hidden,role==='student');
 assert.equal(context.document.getElementById('siteClassesLink').getAttribute('href'),curriculum==='igcse'?'/igcse/teacher/classes':'/teacher/classes');
 assert.equal(context.document.getElementById('accountName').textContent,'Robert');
 assert.equal(context.document.getElementById('accessLink').textContent,plus||role==='admin'?'Plus account':'Upgrade to Plus');
 assert.equal(context.document.getElementById('learningHomeLink').textContent,role==='student'?'My learning':'Teacher dashboard');
}
console.log('PASS: admin, paid, Standard, school, expired/future/revoked access, curriculum isolation, upgrade routes, failed lookups, dropdown, Escape/outside close, sign-out and course-player identity.');
dom.window.close();player.window.close();
