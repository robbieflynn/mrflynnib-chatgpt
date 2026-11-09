// Generates SQL for a separately approved release; never connects to a database.
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const configs=read('src/data/assignment-answer-configs.json').ib;
const fixes=read('question-bank-data/reviewed-solve-answer-fixes.json');
const repairs=Object.entries(fixes).map(([id,labels])=>{
 const c=configs[id];
 if(c.type==='multiple_choice')return {id,type:c.type,options:c.options,keys:c.acceptedAnswers,correct:c.correctOption};
 const parts=c.parts.filter(p=>labels[p.label]);
 return {id,type:'multipart',options:Object.fromEntries(parts.map(p=>[p.label,{label:p.label,mode:p.mode,options:p.options}])),keys:Object.fromEntries(parts.map(p=>[p.label,{mode:p.mode,answers:p.acceptedAnswers}])),correct:null};
});
writeFileSync('supabase/migrations/20261109_enable_reviewed_solve_answers.sql',`-- PREVIEW ONLY: not applied. Apply only with Rob's approval to publish this release.
-- Upgrade existing whiteboard configurations only. Never reset or regrade responses,
-- attempts, submissions, progress or whiteboards. Keep every unrelated multipart key.
begin;
create temporary table solve_repairs (id text, type text, options jsonb, keys jsonb, correct integer) on commit drop;
insert into solve_repairs select * from jsonb_to_recordset($repairs$${JSON.stringify(repairs)}$repairs$::jsonb)
 as r(id text, type text, options jsonb, keys jsonb, correct integer);

-- Freeze the exact eligible parts before changing either table. Previously automatic
-- variants are deliberately excluded: their option history needs its own review.
create temporary table solve_targets on commit drop as
select q.assignment_id, q.question_id, r.type,
 case when r.type='multiple_choice' then r.options else (
   select jsonb_agg(case when r.options ? (p->>'label') and p->>'mode'='whiteboard'
     then r.options->(p->>'label') else p end order by n)
   from jsonb_array_elements(q.response_options) with ordinality x(p,n)
 ) end as options,
 case when r.type='multiple_choice' then r.keys else (
   select jsonb_object_agg(p->>'label',r.keys->(p->>'label'))
   from jsonb_array_elements(q.response_options) p
   where r.options ? (p->>'label') and p->>'mode'='whiteboard'
 ) end as keys,
 r.correct
from public.assignment_questions q
join solve_repairs r on r.id=q.question_id
join public.assignments a on a.id=q.assignment_id
join public.classes c on c.id=a.class_id
where coalesce(c.bank,'ib')='ib'
 and ((r.type='multiple_choice' and q.response_type='teacher_review')
 or (r.type='multipart' and q.response_type='multipart' and exists (
   select 1 from jsonb_array_elements(q.response_options) p
   where r.options ? (p->>'label') and p->>'mode'='whiteboard'
 )));

do $$ begin
 if exists (select 1 from solve_targets t left join public.assignment_answer_keys k
   on k.assignment_id=t.assignment_id and k.question_id=t.question_id
   where k.assignment_id is null or (t.type='multipart' and jsonb_typeof(k.accepted_answers) is distinct from 'object'))
 then raise exception 'Unexpected or missing existing answer key. Review before applying solve upgrades.'; end if;
end $$;

update public.assignment_answer_keys k set
 accepted_answers=case when t.type='multipart' then k.accepted_answers || t.keys else t.keys end,
 correct_option=case when t.type='multiple_choice' then t.correct else k.correct_option end,
 numeric_answer=case when t.type='multiple_choice' then null else k.numeric_answer end,
 numeric_tolerance=case when t.type='multiple_choice' then null else k.numeric_tolerance end,
 updated_at=now()
from solve_targets t where k.assignment_id=t.assignment_id and k.question_id=t.question_id;
update public.assignment_questions q set response_type=t.type,response_options=t.options
from solve_targets t where q.assignment_id=t.assignment_id and q.question_id=t.question_id;
select question_id,count(*) as assignment_copies_upgraded from solve_targets group by question_id order by question_id;
commit;
`);
console.log(`Prepared ${repairs.length} question upgrades. No database connection or changes.`);
