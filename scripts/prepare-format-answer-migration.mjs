// Produces a reviewable migration only; never connects to a database.
import {readFileSync, writeFileSync} from 'node:fs';
const fixes = JSON.parse(readFileSync('question-bank-data/reviewed-format-answer-fixes.json','utf8'));
const rows = Object.entries(fixes).flatMap(([id, fix]) => Object.entries(fix.parts).filter(([,p]) => p.mode !== "whiteboard" && JSON.stringify(p.options) !== JSON.stringify(p.previousOptions)).map(([label,p]) => ({id,label,previous:p.previousOptions,options:{label,mode:'multiple_choice',options:p.options},key:{mode:'multiple_choice',answers:p.answers}})));
writeFileSync('supabase/migrations/20261109_reviewed_answer_formatting.sql', `-- UNAPPLIED: publish only with Rob's approval, after reviewing the target counts.
-- Change only matching prepared question options/keys. Do not alter responses,
-- attempt counts, progress, submissions or whiteboards. Unexpected historical
-- option variants are excluded and must be reviewed separately.
begin;
create temporary table format_repairs (id text,label text,previous jsonb,options jsonb,key jsonb) on commit drop;
insert into format_repairs select * from jsonb_to_recordset($format$${JSON.stringify(rows)}$format$::jsonb)
 as r(id text,label text,previous jsonb,options jsonb,key jsonb);
create temporary table format_targets on commit drop as
select q.assignment_id,q.question_id,r.label,r.options,r.key
from public.assignment_questions q
cross join lateral jsonb_array_elements(case when q.response_type='multipart' then q.response_options else '[]'::jsonb end) p
join format_repairs r on r.id=q.question_id and r.label=p->>'label'
where q.bank='ib' and p->>'mode'='multiple_choice' and p->'options'=r.previous;
do $$ begin
 if exists(select 1 from format_targets t left join public.assignment_answer_keys k
 on k.assignment_id=t.assignment_id and k.question_id=t.question_id
 where k.assignment_id is null or jsonb_typeof(k.accepted_answers) is distinct from 'object')
 then raise exception 'Unexpected existing answer key. Review before updating.'; end if;
end $$;
update public.assignment_answer_keys k set accepted_answers=k.accepted_answers || t.keys,updated_at=now()
from (select assignment_id,question_id,jsonb_object_agg(label,key) as keys from format_targets group by assignment_id,question_id) t
where k.assignment_id=t.assignment_id and k.question_id=t.question_id;
update public.assignment_questions q set response_options=(
 select jsonb_agg(coalesce(t.options,p) order by n)
 from jsonb_array_elements(q.response_options) with ordinality x(p,n)
 left join format_targets t on t.assignment_id=q.assignment_id and t.question_id=q.question_id and t.label=p->>'label')
where exists(select 1 from format_targets t where t.assignment_id=q.assignment_id and t.question_id=q.question_id);
select question_id,label,count(*) as updated_assignment_copies from format_targets group by question_id,label order by question_id,label;
commit;
`);
console.log(`Prepared ${rows.length} part repairs; no database connection or changes.`);
