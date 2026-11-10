import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import ts from "typescript";
const require = createRequire(import.meta.url);
const dom = new JSDOM("<div id='root'></div>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = require("react");
const { createRoot } = require("react-dom/client");
function load(file, overrides = {}) {
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => overrides[name] || require(name), module, module.exports);
  return module.exports;
}
const access = load("src/lib/student-accounts.ts");
const { StudentAccountDirectory } = load("src/components/student-account-directory.tsx", {
  "@/lib/student-accounts": access,
  "@/app/teacher/actions": { changeAccountRole: () => { throw new Error("Role changes must not run during filter tests"); } },
});
const now = Date.parse("2026-11-10T12:00:00Z");
const grant = { product_code:"course_ib_aa_hl", source:"stripe", status:"active", starts_at:"2026-01-01", expires_at:"2027-01-01" };
const accounts = [
  ["Paid", [grant]], ["Free", []], ["School", [{ ...grant, source:"school", expires_at:null }]],
  ["Licence", [{ ...grant, source:"licence" }]], ["Expired", [{ ...grant, expires_at:"2026-10-01" }]], ["Unknown", undefined],
].map(([name, access], i) => ({ user_id:String(i), display_name:name, email:name.toLowerCase()+"@example.test", curriculum:"ib", created_at:"2026-01-01", email_confirmed_at:"2026-01-01", last_sign_in_at:null, class_count:0, completed_question_count:0, submitted_assignment_count:0, access }));
const root = createRoot(document.getElementById("root"));
await React.act(async () => root.render(React.createElement(StudentAccountDirectory, { accounts, now })));
const select = [...document.querySelectorAll("label")].find(el => el.textContent.startsWith("Access")).querySelector("select");
const rows = () => [...document.querySelectorAll("tbody tr")].map(el => el.textContent);
async function choose(value) { await React.act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles:true })); }); }
assert.equal(rows().length, 6);
await choose("stripe"); assert.equal(rows().length,1); assert(rows()[0].includes("days left"));
await choose("school"); assert.equal(rows().length,1); assert(rows()[0].includes("No expiry"));
await choose("licence"); assert.equal(rows().length,1); assert(rows()[0].includes("Licence"));
await choose("plus"); assert.equal(rows().length,3);
await choose("free"); assert.equal(rows().length,2); assert(!rows().some(r => r.includes("Unknown")));
await choose("expired"); assert.equal(rows().length,1); assert(rows()[0].includes("Expired"));
await choose("promotion"); assert(rows()[0].includes("No student accounts match"));
await React.act(async () => [...document.querySelectorAll("button")].find(el => el.textContent === "Reset filters").click());
assert.equal(rows().length,6);
assert.equal(select.value,"all");
await React.act(async () => root.unmount());
console.log("PASS: actual student directory renders and filters paid, free, school, licence, Plus, expired, empty and reset states with correct expiry text");
