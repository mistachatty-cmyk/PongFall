-- Cancel matchmaking cleanly so another player cannot be paired with an
-- abandoned public queue entry or a private invite whose host went away.
create or replace function public.pf_cancel_room(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms;
begin
  select * into r from public.pf_rooms where id = p_id for update;
  if not found or auth.uid() is null or (auth.uid() <> r.host_id and auth.uid() is distinct from r.guest_id) then
    raise exception 'Room unavailable';
  end if;
  if r.status not in ('waiting','live') or exists (
    select 1 from public.pf_room_checkpoints c where c.room_id = p_id and c.tick > 0
  ) then raise exception 'Match already started'; end if;
  update public.pf_rooms set status = 'abandoned' where id = p_id;
end $$;
revoke all on function public.pf_cancel_room(uuid) from public;
grant execute on function public.pf_cancel_room(uuid) to authenticated;
