-- #48 · Bingo de carretera: marcar casillas del propio cartón, línea por orden y bingo que termina la ronda.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'BING2345', 6.5, 'diesel', 5);
create temp table viaje (id uuid);
create temp table ronda (id uuid);
grant all on viaje, ronda to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('BING2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('BING2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- Bea reparte: su cartón es a..i y el de Carlos, j..r
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into ronda select public.create_round((select id from viaje), 'bingo', '{"cards": {
  "22222222-2222-2222-2222-222222222222": ["a","b","c","d","e","f","g","h","i"],
  "33333333-3333-3333-3333-333333333333": ["j","k","l","m","n","o","p","q","r"]}}', null, 900);

-- 1-2 · Solo casillas del propio cartón y nada por submit_answer
select throws_ok($$ select public.bingo_mark((select id from ronda), 'j') $$,
  'P0001', 'INVALID_OPTION', 'una casilla de otro cartón no vale');
select throws_ok($$ select public.submit_answer((select id from ronda), '{"option": "a"}') $$,
  'P0001', 'WRONG_GAME', 'el bingo no va por submit_answer');

-- 3-5 · Bea marca la diagonal a-e-i: línea 1ª, 30 puntos; repetir una casilla no cambia nada
select public.bingo_mark((select id from ronda), 'a');
select is((public.bingo_mark((select id from ronda), 'e') ->> 'lines')::int, 0, 'dos casillas no son línea');
select is(public.bingo_mark((select id from ronda), 'i') ->> 'line', '1', 'la diagonal es línea, la primera');
select is((public.bingo_mark((select id from ronda), 'i') ->> 'points')::int, 30, 'la primera línea da 30 y repetir no suma');

-- 6-7 · Carlos canta la segunda línea (fila de arriba): 20 puntos
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.bingo_mark((select id from ronda), 'j');
select public.bingo_mark((select id from ronda), 'k');
select is(public.bingo_mark((select id from ronda), 'l') ->> 'line', '2', 'Carlos canta la segunda línea');
select is((select points from public.game_answers where round_id = (select id from ronda)
  and user_id = '33333333-3333-3333-3333-333333333333'), 20, 'la segunda línea da 20');

-- 8 · Con la ronda activa nadie ve el cartón marcado de los demás
select is((select count(*)::int from public.game_answers where round_id = (select id from ronda)), 1,
  'Carlos solo ve sus marcas');

-- 9-10 · El conductor y alguien de fuera no juegan
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select throws_ok($$ select public.bingo_mark((select id from ronda), 'a') $$,
  'P0001', 'DRIVER_CANT_PLAY', 'el conductor no juega');
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select throws_ok($$ select public.bingo_mark((select id from ronda), 'a') $$,
  'P0001', 'NOT_MEMBER', 'alguien de fuera no juega');

-- 11-12 · Bea completa el cartón: bingo, 130 puntos y la ronda termina
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.bingo_mark((select id from ronda), x) from unnest(array['b','c','d','f','g']) as x;
select is((public.bingo_mark((select id from ronda), 'h') ->> 'points')::int, 130, '¡bingo! 30 de la línea y 100 del cartón');
select is((select status from public.game_rounds where id = (select id from ronda)), 'revelada', 'el bingo termina la ronda para todos');

select * from finish();
rollback;
