-- #22 · «¿Quién la ha puesto?»: la ronda sale de la canción que suena y quien la puso no responde.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.como(p_uid uuid, p_anon boolean default true) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}'),
  ('33333333-3333-3333-3333-333333333333', null, true, '{}'),
  ('44444444-4444-4444-4444-444444444444', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'QUIE2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
create temp table ronda (id uuid);
grant all on viaje, ronda to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('QUIE2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('QUIE2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- Bea pone una canción y el conductor la hace sonar
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 't1', 'Canción 1', 'Artista', 200000, '22222222-2222-2222-2222-222222222222' from viaje;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'sonando', started_at = now() where track_id = 't1';

-- 1-3 · Carlos empieza la ronda: tres opciones y la solución no va en el payload
select pg_temp.como('33333333-3333-3333-3333-333333333333');
insert into ronda select public.start_guess_who((select id from viaje));
select isnt((select id from ronda), null, 'Carlos empieza una ronda con la canción que suena');
select is((select jsonb_array_length(payload -> 'options') from public.game_rounds where id = (select id from ronda)), 3,
  'las opciones son los tres del coche');
select ok((select not (payload ? 'added_by' or payload ? 'addedBy' or payload ? 'solution')
    from public.game_rounds where id = (select id from ronda)),
  'el payload no dice quién la puso');

-- 4 · Mientras está activa, nadie ve la solución
select is((select count(*)::int from public.game_round_secrets), 0, 'la solución está oculta con la ronda activa');

-- 5 · Bea la puso: no puede responder
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.submit_answer((select id from ronda), '{"option": "33333333-3333-3333-3333-333333333333"}') $$,
  'P0001', 'OWN_SONG', 'quien puso la canción no puede responder');

-- 6 · No se puede empezar otro juego de pantalla a la vez
select throws_ok($$ select public.create_round((select id from viaje), 'probable', '{}'::jsonb, null, 30) $$,
  'P0001', 'GAME_IN_PROGRESS', 'no puede haber otro juego activo a la vez');

-- 7-8 · Responden Carlos (acierta) y Ana (falla); Bea, que no es admin ni la creó, ya puede revelar
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_answer((select id from ronda), '{"option": "22222222-2222-2222-2222-222222222222"}');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.submit_answer((select id from ronda), '{"option": "33333333-3333-3333-3333-333333333333"}');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.reveal_round((select id from ronda)) $$,
  'con todos menos quien la puso ya respondidos, cualquiera revela');
select is((select status from public.game_rounds where id = (select id from ronda)), 'revelada', 'la ronda queda revelada');

-- 9-11 · Puntos y solución
select is((select points from public.game_answers where round_id = (select id from ronda)
  and user_id = '33333333-3333-3333-3333-333333333333'), 100, 'Carlos acierta: 100 puntos');
select is((select points from public.game_answers where round_id = (select id from ronda)
  and user_id = '11111111-1111-1111-1111-111111111111'), 0, 'Ana falla: 0 puntos');
select is((select solution ->> 'option' from public.game_round_secrets where round_id = (select id from ronda)),
  '22222222-2222-2222-2222-222222222222', 'revelada, la solución es Bea');

-- 12 · La misma canción no vale dos veces
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.close_round((select id from ronda));
select throws_ok($$ select public.start_guess_who((select id from viaje)) $$,
  'P0001', 'SONG_ALREADY_USED', 'no se repite la misma canción');

-- 13 · Sin canción sonando no hay ronda
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'reproducida', ended_at = now() where track_id = 't1';
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.start_guess_who((select id from viaje)) $$,
  'P0001', 'NOTHING_PLAYING', 'sin canción sonando da NOTHING_PLAYING');

-- 14 · Alguien de fuera no puede empezarla
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select throws_ok($$ select public.start_guess_who((select id from viaje)) $$,
  'P0001', 'NOT_MEMBER', 'alguien de fuera da NOT_MEMBER');

select * from finish();
rollback;
