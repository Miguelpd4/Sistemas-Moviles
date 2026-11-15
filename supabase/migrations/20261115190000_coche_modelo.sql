-- Marca, modelo, versión y color del coche, y la foto del modelo (Wikipedia) para mostrarlo en la app.
alter table public.cars
  add column make text check (char_length(make) <= 30),
  add column model text check (char_length(model) <= 40),
  add column version text check (char_length(version) <= 40),
  add column color text check (color in
    ('blanco', 'negro', 'gris', 'plata', 'rojo', 'azul', 'verde', 'amarillo', 'naranja', 'marron', 'beige')),
  add column model_image_url text check (model_image_url ~ '^https://');

-- La vista previa de la entrada incluye ahora el modelo, el color, las fotos y el avatar del conductor.
-- Misma firma que antes: se mantienen los permisos.
create or replace function public.get_session_preview(p_nfc_code text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select jsonb_build_object(
    'session_id', s.id,
    'status', s.status,
    'join_mode', s.join_mode,
    'car_name', c.name,
    'car_make', c.make,
    'car_model', c.model,
    'car_version', c.version,
    'car_color', c.color,
    'car_photo_path', c.photo_path,
    'car_image_url', c.model_image_url,
    'seats', c.seats,
    'driver_name', coalesce(nullif(p.display_name, ''), 'el conductor'),
    'driver_avatar_kind', p.avatar_kind,
    'driver_avatar_value', p.avatar_value,
    'taken_seats', coalesce((select jsonb_agg(m.seat order by m.seat) from public.session_members m
        where m.session_id = s.id and m.seat is not null and m.status in ('pendiente', 'dentro')), '[]'::jsonb),
    'my_status', (select m.status from public.session_members m
        where m.session_id = s.id and m.user_id = auth.uid()))
  into v
  from public.cars c
  join public.sessions s on s.car_id = c.id and s.status <> 'finalizada'
  join public.profiles p on p.id = s.host_id
  where c.nfc_code = upper(p_nfc_code);
  if v is null then raise exception 'NO_ACTIVE_SESSION'; end if;
  return v;
end; $$;
