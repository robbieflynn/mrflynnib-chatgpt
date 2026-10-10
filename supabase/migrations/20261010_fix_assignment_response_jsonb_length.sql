do $$
declare
  function_definition text;
  broken_expression constant text := 'has_part_answers := jsonb_typeof(response_payload -> ''parts'') = ''object'''
    || chr(10) || '    and jsonb_object_length(response_payload -> ''parts'') > 0;';
  fixed_expression constant text := 'has_part_answers := coalesce('
    || chr(10) || '    jsonb_typeof(response_payload -> ''parts'') = ''object'''
    || chr(10) || '      and response_payload -> ''parts'' <> ''{}''::jsonb,'
    || chr(10) || '    false'
    || chr(10) || '  );';
begin
  select pg_get_functiondef('public.submit_assignment_response(uuid,text,jsonb)'::regprocedure)
    into function_definition;

  if position(broken_expression in function_definition) = 0 then
    raise exception 'Expected assignment response expression was not found.';
  end if;

  execute replace(function_definition, broken_expression, fixed_expression);
end;
$$;

notify pgrst, 'reload schema';
