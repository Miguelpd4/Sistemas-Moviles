-- #60 · Solo el conductor o el copiloto pasan de canción sin votar.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'SALT2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('SALT2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('SALT2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- Bea pone dos canciones; suena la primera
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 'yt' || n, 'Canción ' || n, 'Artista', 200000, '22222222-2222-2222-2222-222222222222'
  from viaje, generate_series(1, 2) n;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'sonando', started_at = now() where track_id = 'yt1';

-- 1 · Un pasajero no puede
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.skip_song((select id from public.music_queue where track_id = 'yt1')) $$,
  'P0001', 'NOT_ADMIN', 'un pasajero no puede pasar de canción sin votar');

-- 2 · Alguien de fuera tampoco
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select throws_ok($$ select public.skip_song((select q.id from public.music_queue q
    join viaje v on v.id = q.session_id where q.track_id = 'yt1')) $$,
  'P0001', 'NOT_MEMBER', 'alguien de fuera da NOT_MEMBER');

-- 3-4 · El copiloto sí: la canción queda saltada
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.set_copilot((select id from viaje), '33333333-3333-3333-3333-333333333333');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select lives_ok($$ select public.skip_song((select id from public.music_queue where track_id = 'yt1')) $$,
  'el copiloto pasa a la siguiente');
select is((select status from public.music_queue where track_id = 'yt1'), 'saltada', 'la canción queda saltada');

-- 5 · Solo la que suena
select throws_ok($$ select public.skip_song((select id from public.music_queue where track_id = 'yt2')) $$,
  'P0001', 'NOT_PLAYING', 'una canción que no suena no se salta');

select * from finish();
rollback;
