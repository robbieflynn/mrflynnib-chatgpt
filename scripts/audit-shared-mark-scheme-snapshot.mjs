// Read-only snapshot audit. Run from the repository root with Node.
// The parser is taken from this revision's generator, stopping before its full audit.
// This wrapper never calls the generator's catalogue write path.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const generator = new URL("./audit-assignment-choices.mjs", import.meta.url);
const source = readFileSync(generator, "utf8");
const boundary = source.indexOf("const positiveDecimalExample");
if (boundary < 0) throw new Error("Audit generator boundary changed; review this snapshot runner before using it.");
const temporary = new URL(`./.shared-snapshot-${process.pid}.mjs`, import.meta.url);
const inventory = "const findings=[];\nconst catalogue=JSON.parse(readFileSync('src/data/assignment-answer-configs.json','utf8')); \nfor(const [bank,path] of banks){\n for(const q of extractSeed(path)){\n  if(!activeQuestionIds[bank].has(q.id)) continue;\n  const groups=new Map((q.markscheme||[]).filter(Array.isArray).map(g=>[String(g[0]||'').toLowerCase(),g[1]||[]]));\n  const fixed=catalogue[bank==='IB'?'ib':'igcse'][q.id];\n  for(const part of q.parts?.length?q.parts:[['',q.body||q.title||'']]){\n   const top=String(part[0]||'').toLowerCase(), prompt=String(part[1]||''), rows=groups.get(top)||[];\n   const romans=romanSubparts(prompt);\n   if(!romans.some(roman=>!(groups.get(`${top}(${roman})`)||[]).length && !rowsForSubpart(rows,roman).length)) continue;\n   for(const roman of romans){\n    const label=top?`${top}(${roman})`:roman;\n    const sharedFallback=!((groups.get(`${top}(${roman})`)||[]).length || rowsForSubpart(rows,roman).length);\n    const answer=fixed?.parts?.find(p=>p.label===label);\n    findings.push({bank,id:q.id,label,sharedFallback,body:q.body,prompt:promptForSubpart(prompt,roman),sharedPrompt:prompt,rows,answer,manual:!!manualChoiceSet(q.id,label)});\n   }\n  }\n }\n}\nwriteFileSync(process.env.SHARED_AUDIT_OUTPUT || '/tmp/mrflynnib-shared-mark-scheme-current.json',JSON.stringify(findings,null,2)+'\\n');\nconsole.log(JSON.stringify({parts:findings.length,questions:new Set(findings.map(f=>f.bank+f.id)).size,multipleChoice:findings.filter(f=>f.answer?.mode==='multiple_choice').length,manual:findings.filter(f=>f.manual).length,byBank:banks.map(([bank])=>[bank,findings.filter(f=>f.bank===bank).length])}));\n";
try {
  writeFileSync(temporary, source.slice(0, boundary) + "\n" + inventory, { flag: "wx" });
  const result = spawnSync(process.execPath, [fileURLToPath(temporary)], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  try { unlinkSync(temporary); } catch (error) { if (error.code !== "ENOENT") throw error; }
}
