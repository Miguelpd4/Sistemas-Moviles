-- #60 · El conductor o el copiloto pasan a la siguiente canción desde Música, sin votar.
-- Sin tablas nuevas: marca la que suena como saltada (igual que vote_skip cuando gana la votación)
-- y el reproductor del Modo conductor pone la siguiente.

create function public.skip_song(p_queue_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_item public.music_queue;
begin
  select * into v_item from public.music_queue where id = p_queue_id;
  if not found or not public.is_member(v_item.session_id) then raise exception 'NOT_MEMBER'; end if;
  if not public.is_admin(v_item.session_id) then raise exception 'NOT_ADMIN'; end if;
  if v_item.status <> 'sonando' then raise exception 'NOT_PLAYING'; end if;
  update public.music_queue set status = 'saltada', ended_at = now()
    where id = p_queue_id and status = 'sonando';
end; $$;

revoke execute on function public.skip_song(uuid) from public, anon;
grant execute on function public.skip_song(uuid) to authenticated;
