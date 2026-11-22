-- #26 · Gastos extra (peajes, parking, otros) con foto del ticket. Los añade cualquiera del viaje
-- mientras no ha terminado; al finalizar, settle_trip (#25) los reparte con la gasolina.

create policy "añadir gasto extra" on public.expenses for insert to authenticated
  with check (
    paid_by = (select auth.uid())
    and kind in ('peaje', 'parking', 'otro')
    and public.is_member(session_id)
    and exists (select 1 from public.sessions s where s.id = session_id and s.status <> 'finalizada')
    and (receipt_path is null or split_part(receipt_path, '/', 1) = session_id::text)
  );

create policy "quitar mi gasto extra" on public.expenses for delete to authenticated
  using (
    paid_by = (select auth.uid())
    and kind <> 'combustible'
    and exists (select 1 from public.sessions s where s.id = session_id and s.status <> 'finalizada')
  );

-- Fotos de los tickets: cubo privado, ruta <viaje>/<usuario>/<foto>. Solo los del viaje las ven.
insert into storage.buckets (id, name, public) values ('tickets', 'tickets', false);

create function public.ticket_session(p_name text)
returns uuid language sql immutable set search_path = '' as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-fA-F-]{36}$' then split_part(p_name, '/', 1)::uuid end;
$$;

create policy "subir ticket del viaje" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tickets'
    and split_part(name, '/', 2) = (select auth.uid())::text
    and public.is_member(public.ticket_session(name))
  );

create policy "ver tickets del viaje" on storage.objects for select to authenticated
  using (bucket_id = 'tickets' and public.is_member(public.ticket_session(name)));
