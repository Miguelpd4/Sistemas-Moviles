-- #34 · Muro de recuerdos: solo los del coche, solo en su carpeta y hasta 7 días después del viaje.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
  ('44444444-4444-4444-4444-444444444444', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'RECU2345', 6.5, 'diesel', 5);
create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('RECU2345', 'Bea', 'preset', 'avatar-02', 2::smallint);

-- 1-2 · Bea sube una foto en su carpeta; en la de otro, no
select lives_ok($$ insert into public.memories (session_id, user_id, photo_path)
  select id, '22222222-2222-2222-2222-222222222222', id || '/22222222-2222-2222-2222-222222222222/1.jpg' from viaje $$,
  'Bea sube una foto del viaje');
select throws_ok($$ insert into public.memories (session_id, user_id, photo_path)
  select id, '22222222-2222-2222-2222-222222222222', id || '/11111111-1111-1111-1111-111111111111/2.jpg' from viaje $$,
  '42501', null, 'no se sube en la carpeta de otro');

-- 3 · Ana (del coche) la ve
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select is((select count(*)::int from public.memories), 1, 'Ana ve la foto de Bea');

-- 4 · Ana no puede borrar la foto de Bea
delete from public.memories where user_id = '22222222-2222-2222-2222-222222222222';
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select count(*)::int from public.memories), 1, 'solo quien la sube puede borrarla');

-- 5-6 · Alguien de fuera ni la ve ni sube
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select is((select count(*)::int from public.memories), 0, 'alguien de fuera no ve el muro');
select throws_ok($$ insert into public.memories (session_id, user_id, photo_path)
  select id, '44444444-4444-4444-4444-444444444444', id || '/44444444-4444-4444-4444-444444444444/3.jpg' from viaje $$,
  '42501', null, 'alguien de fuera no sube fotos');

-- 7-8 · Terminado hace 8 días: el muro se cierra (ni se ve ni se sube)
reset role;
update public.sessions set status = 'finalizada', ended_at = now() - interval '8 days' where id = (select id from viaje);
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select count(*)::int from public.memories), 0, 'a los 7 días la foto ya no se ve');
select throws_ok($$ insert into public.memories (session_id, user_id, photo_path)
  select id, '22222222-2222-2222-2222-222222222222', id || '/22222222-2222-2222-2222-222222222222/4.jpg' from viaje $$,
  '42501', null, 'ni se pueden subir más');

-- 9 · Terminado hace 2 días: sigue abierto
reset role;
update public.sessions set ended_at = now() - interval '2 days' where id = (select id from viaje);
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select count(*)::int from public.memories), 1, 'durante los 7 días se sigue viendo');

select * from finish();
rollback;
