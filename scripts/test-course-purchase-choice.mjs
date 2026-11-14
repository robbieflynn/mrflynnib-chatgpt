import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url:'https://example.test' });
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true});
let calls=[];
const mocks={
  'next/link': {default:({children,...props})=>React.createElement('a',props,children)},
  'next/navigation': {redirect:()=>{throw new Error('Unexpected redirect');}},
  '@/components/ui': {Container:({children,className=''})=>React.createElement('div',{className:`container ${className}`},children)},
  '@/lib/platform-server': {},
  '@/app/account/access/actions': {redeemAccessCode:'/redeem',requestTeachableTransfer:'/transfer'},
  '@/components/platform/checkout-activation-notice': {CheckoutActivationNotice:()=>null},
  '@/components/platform/school-access-invitation': {SchoolAccessInvitation:()=>null},
};
function load(path){const exports={};const source=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(source,{exports,window:dom.window,crypto:{randomUUID:()=> 'test-request'},fetch:async(_url,options)=>{calls.push(JSON.parse(options.body));return {ok:false,text:async()=>JSON.stringify({error:'Test stopped before payment'})};},require:name=>mocks[name]||require(name)});return exports;}
mocks['@/lib/platform-products']=load('src/lib/platform-products.ts');
mocks['@/components/platform/course-checkout-button']=load('src/components/platform/course-checkout-button.tsx');
const {CourseAccessView}=load('src/components/platform/course-access-page.tsx');
const session={profile:{role:'student'},access:null,ownedCourses:[]};
const markup=query=>renderToStaticMarkup(React.createElement(CourseAccessView,{curriculum:'ib',query,session}));
const empty=markup({});
assert(empty.includes('Choose your course'));
assert(!empty.includes('course-checkout-button'),'no checkout without course choice');
assert(!empty.includes('aria-current="page"'),'no default AA HL tab');
const selected=markup({course:'aa-sl'});
assert(selected.includes('Standard Level') && selected.includes('AA SL Plus'));
assert(!markup({course:'invalid'}).includes('course-checkout-button'));
const {createRoot}=require('react-dom/client');
const root=createRoot(document.getElementById('root'));
const Checkout=mocks['@/components/platform/course-checkout-button'].CourseCheckoutButton;
const plans=[{id:'two-years',label:'24 months',priceUsd:79}];
await React.act(async()=>root.render(React.createElement(Checkout,{key:'aa-sl',courseId:'aa-sl',compact:true,plans})));
assert(document.querySelector('button').disabled);
await React.act(async()=>document.querySelector('button').click());
assert.equal(calls.length,0);
await React.act(async()=>document.querySelector('input[type="checkbox"]').click());
await React.act(async()=>document.querySelector('button').click());
assert.equal(calls[0].courseId,'aa-sl');
assert.equal(calls[0].planId,'two-years');
await React.act(async()=>root.render(React.createElement(Checkout,{key:'ai-hl',courseId:'ai-hl',compact:true,plans})));
assert(document.querySelector('button').disabled,'changing course requires a fresh confirmation');
await React.act(async()=>root.render(React.createElement(Checkout,{key:'teacher',productId:'teacher-plus',plans})));
assert(!document.querySelector('input[type="checkbox"]'));
assert(!document.querySelector('button').disabled,'teacher bundle does not require a single-course choice');
await React.act(async()=>root.unmount());
dom.window.close();
if(process.env.RENDER_CHECKOUT){fs.mkdirSync('/tmp/checkout-preview',{recursive:true});for(const [name,html] of [['choose',empty],['aa-sl',selected]])fs.writeFileSync(`/tmp/checkout-preview/${name}.html`,`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="style.css"></head><body>${html}</body></html>`);}
console.log('PASS: no implicit course, explicit AA SL summary, guarded checkout, exact submitted course, reconfirmation and unchanged teacher bundle.');
