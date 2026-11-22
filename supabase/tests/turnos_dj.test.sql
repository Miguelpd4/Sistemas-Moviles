-- #20 · Turnos de DJ: turnos por asiento, votar solo cuando han sonado todas y nunca a uno mismo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'DJDJ2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
create temp table ronda (id uuid);
grant all on viaje, ronda to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('DJDJ2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('DJDJ2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select public.join_session('DJDJ2345', 'Dani', 'preset', 'avatar-04', 4::smallint);

-- 1-2 · Bea empieza: turnos de los tres pasajeros, sin el conductor
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into ronda select public.start_dj_round((select id from viaje));
select isnt((select id from ronda), null, 'Bea empieza una ronda de DJ');
select is((select jsonb_array_length(payload -> 'turns') from public.game_rounds where id = (select id from ronda)), 3,
  'tres turnos: los pasajeros, sin el conductor');

-- 3-5 · Turnos por asiento; nadie se cuela con un insert directo
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.add_dj_song((select id from ronda), 't2', 'Canción 2', 'Artista', null, 200000) $$,
  'P0001', 'NOT_YOUR_TURN', 'Carlos no puede elegir antes que Bea (asiento 2)');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.add_dj_song((select id from ronda), 't1', 'Canción 1', 'Artista', null, 200000) $$,
  'Bea elige en su turno');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by, dj_round_id)
  select v.id, 't9', 'Colada', 'Artista', 200000, '33333333-3333-3333-3333-333333333333', r.id from viaje v, ronda r $$,
  '42501', null, 'una canción de DJ no entra con un insert directo');

-- 6 · Aún no se vota
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.submit_answer((select id from ronda),
  jsonb_build_object('option', (select id from public.music_queue where track_id = 't1'))) $$,
  'P0001', 'VOTING_NOT_OPEN', 'no se vota mientras se eligen canciones');

-- 7-10 · Saltar turno: solo admin o quien empezó; después le toca a Dani y Carlos ya no puede
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.skip_dj_turn((select id from ronda)) $$,
  'P0001', 'NOT_ADMIN', 'Carlos no puede saltarse el turno');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.skip_dj_turn((select id from ronda)) $$, 'Bea, que empezó la ronda, salta a Carlos');
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select lives_ok($$ select public.add_dj_song((select id from ronda), 't4', 'Canción 4', 'Artista', null, 200000) $$,
  'Dani elige en su turno');
select is((select source from public.music_queue where track_id = 't4'), 'youtube', 'la canción de DJ es de YouTube (#57)');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.add_dj_song((select id from ronda), 't3', 'Canción 3', 'Artista', null, 200000) $$,
  'P0001', 'NOT_YOUR_TURN', 'tras saltarle, Carlos ya no elige');

-- 11 · Con canciones por sonar no se revela
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.reveal_round((select id from ronda)) $$,
  'P0001', 'TOO_EARLY', 'no se revela mientras suenan las canciones de la ronda');

-- Suenan las dos
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'reproducida', ended_at = now() where dj_round_id = (select id from ronda);

-- 12 · Nadie se vota a sí mismo
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.submit_answer((select id from ronda),
  jsonb_build_object('option', (select id from public.music_queue where track_id = 't1'))) $$,
  'P0001', 'OWN_SONG', 'Bea no puede votar su canción');

-- 13-15 · Votan los tres pasajeros; Carlos revela y gana Dani
select public.submit_answer((select id from ronda), jsonb_build_object('option', (select id from public.music_queue where track_id = 't4')));
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select public.submit_answer((select id from ronda), jsonb_build_object('option', (select id from public.music_queue where track_id = 't1')));
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_answer((select id from ronda), jsonb_build_object('option', (select id from public.music_queue where track_id = 't4')));
select lives_ok($$ select public.reveal_round((select id from ronda)) $$, 'con los tres pasajeros votados, cualquiera revela');
select is((select points from public.game_answers where round_id = (select id from ronda)
  and user_id = '44444444-4444-4444-4444-444444444444'), 50, 'Dani, DJ de la más votada: 50 puntos');
select is((select points from public.game_answers where round_id = (select id from ronda)
  and user_id = '22222222-2222-2222-2222-222222222222'), 0, 'Bea: 0 puntos');

select * from finish();
rollback;
