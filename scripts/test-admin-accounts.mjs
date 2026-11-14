import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
const require = createRequire(import.meta.url);
const dom = new JSDOM('<div id="root"></div>', { url: "https://example.test/teacher/accounts" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
function compile(path, imports = {}) {
  const mod = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: id => imports[id] ?? require(id), window, document, Date, console });
  return mod.exports;
}
const access = compile("src/lib/platform-access.ts");
const student = compile("src/lib/student-accounts.ts");
const tier = compile("src/lib/admin-account-tier.ts", { "@/lib/platform-access": access });
const now = Date.parse("2026-11-14");
const grant = (code, extras = {}) => ({ product_code: code, source: "admin", status: "active", starts_at: "2026-01-01", expires_at: "2027-01-01", ...extras });
const base = { role: "teacher", curriculum: "ib" };
for (const [records, expected] of [
  [[], "standard"], [undefined, "unknown"], [[grant("teacher_plus_ib")], "plus"],
  [[grant("teacher_plus_ib", { expires_at: "2026-11-14" })], "standard"],
  [[grant("teacher_plus_ib", { starts_at: "2026-12-01" })], "standard"],
  [[grant("teacher_plus_ib", { status: "revoked" })], "standard"],
  [[grant("teacher_plus_ib", { source: "licence" })], "plus"],
  [[grant("teacher_plus_igcse")], "standard"], [[grant("course_ib_aa_hl")], "standard"],
]) assert.equal(tier.directoryAccountTier({ ...base, access: records }, now), expected);
assert.equal(tier.directoryAccountTier({ role: "student", curriculum: "ib", access: [grant("course_ib_aa_hl")] }, now), "plus");
const products = { courseProducts: [{ curriculum: "ib", productCode: "course_ib_aa_hl" }, { curriculum: "ib", productCode: "course_ib_aa_sl" }] };
const { TeacherAccountDirectory } = compile("src/components/teacher-account-directory.tsx", {
  "@/lib/admin-account-tier": tier, "@/lib/student-accounts": student, "@/lib/platform-products": products,
  "@/app/teacher/actions": { changeAccountRole() {}, reviewTeacherApplication() {} },
});
const make = (id, extra = {}) => ({ ...base, user_id: id, display_name: id, email: id + "@example.test", teacher_status: "approved", email_confirmed_at: "2026-01-01", created_at: "2026-01-01", last_sign_in_at: null, access: [], ...extra });
const accounts = [
  make("Paid", { access: [grant("teacher_plus_ib", { source: "stripe" })] }),
  make("School", { access: [grant("teacher_plus_ib", { source: "school" })] }),
  make("Standard"), make("Unknown", { access: undefined }),
  make("Pending", { role: "student", teacher_status: "pending" }),
  make("Unconfirmed", { role: "student", teacher_status: "pending", email_confirmed_at: null }),
];
const root = createRoot(document.getElementById("root"));
await act(async () => root.render(React.createElement(TeacherAccountDirectory, { accounts, now })));
const rows = () => [...document.querySelectorAll("tbody tr")].map(r => r.firstElementChild.textContent);
const select = async (label, value) => { const control = [...document.querySelectorAll("label")].find(l => l.querySelector("span")?.textContent === label).querySelector("select"); await act(async () => { control.value = value; control.dispatchEvent(new window.Event("change", { bubbles: true })); }); };
await select("Account tier", "plus"); assert.equal(rows().length, 2);
await select("Access source", "stripe"); assert.equal(rows().length, 1); assert.match(rows()[0], /Paid/);
await select("Account tier", "standard"); assert.match(document.querySelector("tbody").textContent, /No teacher registrations/);
await act(async () => [...document.querySelectorAll("button")].find(b => b.textContent === "Reset filters").click());
assert.equal(rows().length, 6);
await select("Account tier", "unknown"); assert.equal(rows().length, 1); assert.match(rows()[0], /Unknown/);
await act(async () => root.render(React.createElement(TeacherAccountDirectory, { key: "pending", accounts, now, initialAccess: "pending" })));
assert.equal(rows().length, 1); assert.match(rows()[0], /Pending/);
assert.equal(document.querySelector('form input[name="returnTo"]').value, "/teacher/accounts?access=pending");
assert.ok(document.querySelector('button[value="approve"]'));
await act(async () => root.unmount());
for (const path of ["accounts", "students", "platform-access", "access-claims"]) {
  assert.match(fs.readFileSync("src/app/teacher/" + path + "/page.tsx", "utf8"), /AdminNavigation current=/);
}
assert.match(fs.readFileSync("src/app/teacher/administration/page.tsx", "utf8"), /await requireAdmin\(\)/);
console.log("Administrator tier, combined filters, reset, confirmed approval queue and navigation checks passed.");
