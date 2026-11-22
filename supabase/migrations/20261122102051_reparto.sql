-- #25 · Reparto: al finalizar el viaje, la gasolina se reparte a partes iguales entre todos los que
-- iban (el conductor también paga su parte) y se calcula quién paga a quién.
-- Tablas nuevas con RLS: expenses (gastos del viaje) y payments (pagos entre ocupantes).
-- Misma lógica que src/lib/split.ts y src/lib/settle.ts (con pruebas en Jest).

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  paid_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('combustible', 'peaje', 'parking', 'otro')),
  description text check (char_length(description) <= 60),
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 100000),
  receipt_path text,
  created_at timestamptz not null default now()
);
create index expenses_por_viaje on public.expenses (session_id);
create index expenses_por_pagador on public.expenses (paid_by);
alter table public.expenses enable row level security;
create policy "ver gastos del viaje" on public.expenses for select to authenticated
  using (public.is_member(session_id));
-- Añadir peajes y parking con foto del ticket llega en #26. La gasolina solo la apunta end_trip.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index payments_por_viaje on public.payments (session_id);
create index payments_por_deudor on public.payments (from_user);
create index payments_por_acreedor on public.payments (to_user);
alter table public.payments enable row level security;
create policy "ver pagos del viaje o míos" on public.payments for select to authenticated
  using (public.is_member(session_id) or from_user = (select auth.uid()) or to_user = (select auth.uid()));
-- Marcar como pagado llega en #27.

-- Reparto del viaje: apunta la gasolina y crea los pagos. Solo la llama end_trip.
create function public.settle_trip(p_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_session public.sessions;
  v_distance integer;
  v_fuel integer;
  v_total integer;
  v_users uuid[];
  v_bal integer[];
  v_n integer;
  v_base integer;
  v_rest integer;
  v_d integer;
  v_c integer;
  v_amount integer;
begin
  select * into v_session from public.sessions where id = p_session_id;
  if not found or exists (select 1 from public.payments where session_id = p_session_id) then return; end if;

  -- Gasolina: km × (L/100 km) / 100 × €/L, en céntimos (igual que fuelCostCents). La paga el conductor.
  select distance_m into v_distance from public.trip_metrics where session_id = p_session_id;
  if v_session.started_at is not null and v_session.fuel_price_eur_l is not null and coalesce(v_distance, 0) > 0 then
    v_fuel := round((v_distance / 1000.0) * (v_session.consumption_l_100km / 100.0) * v_session.fuel_price_eur_l * 100);
    if v_fuel > 0 then
      insert into public.expenses (session_id, paid_by, kind, description, amount_cents)
        values (p_session_id, v_session.host_id, 'combustible', 'Gasolina', v_fuel);
    end if;
  end if;

  -- Quién reparte: los que siguen dentro y cualquiera que haya pagado algo, ordenados por id
  -- (los primeros ponen el céntimo que sobra, como splitEqually).
  select array_agg(u order by u) into v_users from (
    select user_id as u from public.session_members where session_id = p_session_id and status = 'dentro'
    union
    select paid_by from public.expenses where session_id = p_session_id
  ) t;
  v_n := coalesce(array_length(v_users, 1), 0);
  select coalesce(sum(amount_cents), 0) into v_total from public.expenses where session_id = p_session_id;
  if v_n < 2 or v_total = 0 then return; end if;

  -- Saldo de cada uno: lo que pagó menos lo que le toca.
  v_base := v_total / v_n;
  v_rest := v_total % v_n;
  v_bal := array_fill(0, array[v_n]);
  for i in 1 .. v_n loop
    v_bal[i] := coalesce((select sum(amount_cents) from public.expenses
                  where session_id = p_session_id and paid_by = v_users[i]), 0)::integer
                - (v_base + case when i <= v_rest then 1 else 0 end);
  end loop;

  -- El que más debe paga al que más tiene que cobrar; empates, el primero por id (como settleDebts).
  loop
    v_d := null;
    v_c := null;
    for i in 1 .. v_n loop
      if v_bal[i] < 0 and (v_d is null or v_bal[i] < v_bal[v_d]) then v_d := i; end if;
      if v_bal[i] > 0 and (v_c is null or v_bal[i] > v_bal[v_c]) then v_c := i; end if;
    end loop;
    exit when v_d is null or v_c is null;
    v_amount := least(-v_bal[v_d], v_bal[v_c]);
    insert into public.payments (session_id, from_user, to_user, amount_cents)
      values (p_session_id, v_users[v_d], v_users[v_c], v_amount);
    v_bal[v_d] := v_bal[v_d] + v_amount;
    v_bal[v_c] := v_bal[v_c] - v_amount;
  end loop;
end; $$;
revoke execute on function public.settle_trip(uuid) from public, anon, authenticated;

-- Igual que antes, y al final el reparto.
create or replace function public.end_trip(p_session_id uuid, p_distance_m integer, p_lat double precision, p_lon double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_host(p_session_id) then raise exception 'NOT_HOST'; end if;
  update public.sessions set status = 'finalizada', ended_at = now()
    where id = p_session_id and status in ('abierta', 'en_curso');
  if not found then raise exception 'TRIP_ALREADY_ENDED'; end if;
  update public.trip_metrics m
    set distance_m = greatest(m.distance_m, coalesce(p_distance_m, 0)),
        duration_s = coalesce(extract(epoch from (now() - s.started_at))::integer, 0),
        end_lat = p_lat, end_lon = p_lon, updated_at = now()
    from public.sessions s
    where m.session_id = p_session_id and s.id = p_session_id;
  update public.music_queue set status = 'reproducida', ended_at = now()
    where session_id = p_session_id and status = 'sonando';
  update public.game_rounds set status = 'cerrada'
    where session_id = p_session_id and status <> 'cerrada';
  perform public.settle_trip(p_session_id);
end; $$;

alter publication supabase_realtime add table public.payments;
