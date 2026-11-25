-- #33 · Ranking general del viaje: suma los puntos de todas las partidas puntuadas.
--
-- Una ronda solo tiene su puntuación definitiva cuando pasa de 'activa' a 'revelada': ahí
-- reveal_round reparte los puntos (y bingo_mark revela al cantar bingo). end_trip y close_round
-- pueden cerrar rondas que seguían activas ('cerrada' sin pasar por 'revelada'): esas quedaron a
-- medias y no cuentan. Para distinguirlas, revealed_at se apunta solo al revelarse.

alter table public.game_rounds add column revealed_at timestamptz;

create function public.mark_round_revealed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.status = 'activa' and new.status = 'revelada' and new.revealed_at is null then
    new.revealed_at := now();
  end if;
  return new;
end; $$;

create trigger game_rounds_revealed_at before update of status on public.game_rounds
  for each row execute function public.mark_round_revealed();

-- Rondas anteriores: las que están reveladas, y las cerradas que se llegaron a puntuar (con algún
-- punto repartido al revelar o con un bingo cantado). Las cerradas de Cazamatrículas no se pueden
-- distinguir de las que quedaron a medias, así que no cuentan.
update public.game_rounds set revealed_at = coalesce(ends_at, created_at) where status = 'revelada';
update public.game_rounds r set revealed_at = coalesce(r.ends_at, r.created_at)
  where r.status = 'cerrada' and r.revealed_at is null and (
    (r.game not in ('matriculas', 'bingo') and exists (select 1 from public.game_answers a where a.round_id = r.id and a.points > 0))
    or (r.game = 'bingo' and exists (select 1 from public.game_answers a where a.round_id = r.id and (a.answer ->> 'bingo')::boolean))
  );

-- Clasificación del viaje: cada persona del coche (también con 0 puntos) y quien puntuó aunque ya
-- no esté. Solo totales: ni respuestas ni soluciones. Para alguien de fuera no devuelve nada.
create function public.trip_ranking(p_session_id uuid)
returns table (user_id uuid, display_name text, avatar_kind text, avatar_value text, points integer, rounds_won integer)
language sql stable security definer set search_path = '' as $$
  with scored as (
    select a.user_id, sum(a.points)::integer as points, (count(*) filter (where a.points > 0))::integer as rounds_won
    from public.game_answers a
    join public.game_rounds r on r.id = a.round_id
    where r.session_id = p_session_id and r.revealed_at is not null
    group by a.user_id
  ),
  people as (
    select m.user_id from public.session_members m where m.session_id = p_session_id and m.status = 'dentro'
    union
    select s.user_id from scored s
  )
  select p.user_id, m.display_name, m.avatar_kind, m.avatar_value,
         coalesce(s.points, 0), coalesce(s.rounds_won, 0)
  from people p
  join public.session_members m on m.session_id = p_session_id and m.user_id = p.user_id
  left join scored s on s.user_id = p.user_id
  where public.is_member(p_session_id);
$$;

revoke execute on function public.trip_ranking(uuid) from public, anon;
grant execute on function public.trip_ranking(uuid) to authenticated;
revoke execute on function public.mark_round_revealed() from public, anon, authenticated;
