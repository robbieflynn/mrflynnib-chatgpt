alter table public.assignments
  add column if not exists show_mark_scheme boolean not null default true;
