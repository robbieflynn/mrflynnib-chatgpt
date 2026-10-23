begin;

-- Earlier assignment generation mistook the first character of ln(...), an
-- integral, or x/(...) for a function name. Repair already-published copies
-- while retaining the old accepted value so an answer queued on a student's
-- device before this repair is still accepted when it reconnects.
update public.assignment_questions
set response_options = '[
  {"mode":"multiple_choice","label":"a(i)","options":["x^2-x^4/4+x^6/3","x^2+x^4/2+x^6/3","x^2-x^4/2","x^2-x^4/2-x^6/3","x^2-x^4/2+x^6/3"]},
  {"mode":"multiple_choice","label":"a(ii)","options":["x-x^3","x-x^3+x^5","x-x^3-x^5","-(x-x^3+x^5)","x+x^3+x^5"]},
  {"mode":"multiple_choice","label":"b","options":["f(0.4)=0.298","f(0.4)=-0.149","f(0.4)=0.149","f(0.4)=0.074","f(0.4)=1.149"]}
]'::jsonb
where question_id = 'N20TZ0HL_P3_Q4';

update public.assignment_answer_keys
set accepted_answers = '{
  "a(i)":{"mode":"multiple_choice","answers":["x^2-x^4/2+x^6/3","l=x^2-x^4/2+x^6/3"]},
  "a(ii)":{"mode":"multiple_choice","answers":["x-x^3+x^5","x=x-x^3+x^5"]},
  "b":{"mode":"multiple_choice","answers":["f(0.4)=0.149"]}
}'::jsonb,
updated_at = now()
where question_id = 'N20TZ0HL_P3_Q4';

update public.assignment_questions
set response_options = '[
  {"mode":"multiple_choice","label":"a","options":["1-x^2/2+x^4/8+x^6/48","1-x^2/2-x^4/8-x^6/48","1-x^2/2+x^4/8-x^6/48","3-x^2/2+x^4/8-x^6/48","1+x^2/2+x^4/8-x^6/48"]},
  {"mode":"multiple_choice","label":"b","options":["x-x^3/(3*2)+x^5/(5*2^2*2!)+x^7/(7*2^3*3!)","x-x^3/(3*2)+x^5/(5*2^2*2!)-x^7/(7*2^3*3!)","x-x^3/(3*2)-x^5/(5*2^2*2!)-x^7/(7*2^3*3!)","x-x^3/(3*2)+x^5/(5*2^2*2!)","x+x^3/(3*2)+x^5/(5*2^2*2!)-x^7/(7*2^3*3!)"]},
  {"mode":"multiple_choice","label":"c","options":["-0.341","1.341","0.171","0.682","0.341"]}
]'::jsonb
where question_id = 'N10TZ0HL_P3_Q3';

update public.assignment_answer_keys
set accepted_answers = '{
  "a":{"mode":"multiple_choice","answers":["1-x^2/2+x^4/8-x^6/48","t=(1-x^2/2+x^4/8-x^6/48)"]},
  "b":{"mode":"multiple_choice","answers":["x-x^3/(3*2)+x^5/(5*2^2*2!)-x^7/(7*2^3*3!)"]},
  "c":{"mode":"multiple_choice","answers":["0.341"]}
}'::jsonb,
updated_at = now()
where question_id = 'N10TZ0HL_P3_Q3';

update public.assignment_questions
set response_options = '[
  {"mode":"multiple_choice","label":"a","options":["f(x)=x^2/(5!)-x^3/(3!)+2x^4/(4!)-6x^5/(5!)","f(x)=x^2/(4!)-x^3/(3!)+2x^4/(4!)-6x^5/(5!)","f(x)=x^2/(-2!)-x^3/(3!)+2x^4/(4!)-6x^5/(5!)","f(x)=x^2/(0!)-x^3/(3!)+2x^4/(4!)-6x^5/(5!)","f(x)=x^2/(2!)-x^3/(3!)+2x^4/(4!)-6x^5/(5!)"]},
  {"mode":"multiple_choice","label":"b","options":["(-3)^n/(n(n-1))","1/(n(n-1))","(-1)^(n+1)/(n(n-1))","(-1)^n/(n(n-1))","n(n-1)/((-1)^n)"]}
]'::jsonb
where question_id = 'N16TZ0HL_P3_Q2';

commit;
