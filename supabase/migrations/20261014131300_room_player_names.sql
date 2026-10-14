-- Display labels only. Room membership still comes exclusively from auth.uid().
alter table public.pf_rooms
  add column if not exists host_name text not null default 'Guest 1',
  add column if not exists guest_name text not null default 'Guest 2';

create or replace function public.pf_set_room_name(p_id uuid, p_name text)
returns public.pf_rooms language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms; v_name text;
begin
  v_name := left(regexp_replace(trim(coalesce(p_name, '')), '[[:cntrl:]]', '', 'g'), 32);
  if v_name = '' then raise exception 'Name required'; end if;
  select * into r from public.pf_rooms where id = p_id for update;
  if not found or auth.uid() is null or (auth.uid() <> r.host_id and auth.uid() is distinct from r.guest_id)
     or r.status in ('forfeit', 'abandoned') then raise exception 'Room unavailable'; end if;
  if auth.uid() = r.host_id then
    update public.pf_rooms set host_name = v_name where id = p_id returning * into r;
  else
    update public.pf_rooms set guest_name = v_name where id = p_id returning * into r;
  end if;
  return r;
end $$;
revoke all on function public.pf_set_room_name(uuid, text) from public;
grant execute on function public.pf_set_room_name(uuid, text) to authenticated;
