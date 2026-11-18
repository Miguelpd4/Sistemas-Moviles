-- Modelo y color del coche. Se ejecuta con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create function pg_temp.como(p_uid uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}');

select pg_temp.como('11111111-1111-1111-1111-111111111111');
select lives_ok($$
  insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, make, model, version, color, model_image_url)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'El Clio', 'MODELO23', 5.5,
          'gasolina_95', 'Renault', 'Clio', 'V', 'rojo', 'https://upload.wikimedia.org/clio.jpg') $$,
  'el conductor guarda marca, modelo, versión, color y foto');
select throws_ok($$ update public.cars set color = 'fucsia' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '23514', null, 'un color fuera de la lista se rechaza');
select throws_ok($$ update public.cars set model_image_url = 'http://inseguro.es/a.jpg' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' $$,
  '23514', null, 'la foto del modelo tiene que ser https');
select lives_ok($$ select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$, 'A abre el viaje');

select pg_temp.como('22222222-2222-2222-2222-222222222222', true);
select is(public.get_session_preview('MODELO23') - 'session_id' - 'taken_seats' - 'my_status' - 'status' - 'join_mode' - 'seats'
          - 'car_photo_path' - 'driver_avatar_kind' - 'driver_avatar_value',
  '{"car_name": "El Clio", "car_make": "Renault", "car_model": "Clio", "car_version": "V", "car_color": "rojo",
    "car_image_url": "https://upload.wikimedia.org/clio.jpg", "driver_name": "Ana"}'::jsonb,
  'la vista previa trae el modelo, el color y la foto');

select * from finish();
rollback;
