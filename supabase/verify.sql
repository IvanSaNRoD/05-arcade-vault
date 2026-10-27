-- Arcade Vault — verificación (solo lectura). Ejecutar en el SQL Editor tras `npx supabase db push`.
-- Resultado esperado (igual que dev) en docs/despliegue/supabase-produccion.md.

select json_build_object(
  'games', (select count(*) from public.games),
  'scores', (select count(*) from public.scores),
  'profiles', (select count(*) from public.profiles),
  'rls', (select json_object_agg(relname, relrowsecurity order by relname)
          from pg_class
          where relnamespace = 'public'::regnamespace
            and relname in ('games', 'scores', 'profiles')),
  'policies', (select json_agg(tablename || ': ' || policyname || ' [' || cmd || ']'
                               order by tablename, policyname)
               from pg_policies where schemaname = 'public'),
  'view_security_invoker', (select reloptions from pg_class
                            where oid = 'public.game_stats'::regclass),
  'trigger', (select json_agg(tgname) from pg_trigger
              where tgrelid = 'auth.users'::regclass and not tgisinternal),
  'handle_new_user_exec', (select json_build_object(
      'anon', has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
      'authenticated', has_function_privilege('authenticated', 'public.handle_new_user()', 'execute')))
) as resultado;
