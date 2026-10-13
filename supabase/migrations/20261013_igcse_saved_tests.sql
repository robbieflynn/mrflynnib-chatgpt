alter table public.saved_tests drop constraint if exists saved_tests_course_check;

alter table public.saved_tests
  add constraint saved_tests_course_check
  check (course in ('AA HL', 'AA SL', 'AI HL', 'AI SL', 'IGCSE Higher'));
