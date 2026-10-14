-- A room's checkpoint is written by its host and can be read only by its two
-- players. Recovery deliberately rolls both simulations back to that same tick.
alter table public.pf_rooms
  add column if not exists recovery_epoch integer not null default 0,
  add column if not exists recovery_tick integer not null default 0,
  add column if not exists recovery_hash bigint,
  add column if not exists recovery_host_ack integer not null default 0,
  add column if not exists recovery_guest_ack integer not null default 0;

create table if not exists public.pf_room_checkpoints (
  room_id uuid primary key references public.pf_rooms(id) on delete cascade,
  tick integer not null check (tick >= 0),
  hash bigint not null,
  replay jsonb not null,
  saved_at timestamptz not null default now()
);
alter table public.pf_room_checkpoints enable row level security;
grant select on public.pf_room_checkpoints to authenticated;
create policy pf_room_checkpoint_players_read on public.pf_room_checkpoints
  for select to authenticated using (exists (
    select 1 from public.pf_rooms r where r.id = room_id
      and (r.host_id = (select auth.uid()) or r.guest_id = (select auth.uid()))
  ));

create or replace function public.pf_save_checkpoint(p_id uuid, p_replay jsonb, p_hash bigint)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms; v_tick integer;
begin
  select * into r from public.pf_rooms where id = p_id for update;
  if not found or auth.uid() is null or auth.uid() <> r.host_id
     or r.guest_id is null or r.status <> 'live' or r.expires_at <= now() then
    raise exception 'Checkpoint unavailable';
  end if;
  if pg_column_size(p_replay) > 4000000 then raise exception 'Checkpoint too large'; end if;
  v_tick := (p_replay->>'ticks')::integer;
  if v_tick < 0 or v_tick > 216000 or p_replay->>'mode' <> r.config->>'mode'
     or p_replay->>'diff' <> r.config->>'difficulty'
     or coalesce((p_replay->>'seed')::bigint,-1) not between 0 and 1000000000
     or jsonb_typeof(p_replay->'commands') <> 'array' then
    raise exception 'Invalid checkpoint';
  end if;
  insert into public.pf_room_checkpoints(room_id,tick,hash,replay,saved_at)
    values (p_id,v_tick,p_hash,p_replay,now())
    on conflict (room_id) do update set tick = excluded.tick, hash = excluded.hash,
      replay = excluded.replay, saved_at = excluded.saved_at
    where public.pf_room_checkpoints.tick <= excluded.tick
      or public.pf_room_checkpoints.replay->>'seed' is distinct from excluded.replay->>'seed';
end $$;

create or replace function public.pf_begin_recovery(p_id uuid)
returns public.pf_rooms language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms; cp public.pf_room_checkpoints;
begin
  select * into r from public.pf_rooms where id = p_id for update;
  if not found or auth.uid() is null or (auth.uid() <> r.host_id and auth.uid() is distinct from r.guest_id)
     or r.guest_id is null or r.expires_at <= now() or r.status in ('forfeit','abandoned') then
    raise exception 'Room unavailable for recovery';
  end if;
  if r.recovery_epoch = 0 or (r.recovery_host_ack >= r.recovery_epoch and r.recovery_guest_ack >= r.recovery_epoch) then
    select * into cp from public.pf_room_checkpoints where room_id = p_id;
    r.recovery_epoch := r.recovery_epoch + 1;
    r.recovery_tick := coalesce(cp.tick, 0);
    r.recovery_hash := cp.hash;
    r.recovery_host_ack := r.recovery_epoch - 1;
    r.recovery_guest_ack := r.recovery_epoch - 1;
  end if;
  if auth.uid() = r.host_id then r.host_seen := now(); else r.guest_seen := now(); end if;
  r.status := 'paused';
  update public.pf_rooms set recovery_epoch = r.recovery_epoch,
    recovery_tick = r.recovery_tick, recovery_hash = r.recovery_hash,
    recovery_host_ack = r.recovery_host_ack, recovery_guest_ack = r.recovery_guest_ack,
    host_seen = r.host_seen, guest_seen = r.guest_seen, status = r.status
    where id = p_id returning * into r;
  return r;
end $$;

create or replace function public.pf_load_checkpoint(p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms; v_replay jsonb;
begin
  select * into r from public.pf_rooms where id = p_id;
  if not found or auth.uid() is null or (auth.uid() <> r.host_id and auth.uid() is distinct from r.guest_id)
     or r.expires_at <= now() then raise exception 'Checkpoint unavailable'; end if;
  select replay into v_replay from public.pf_room_checkpoints where room_id = p_id;
  return v_replay;
end $$;

create or replace function public.pf_ack_recovery(p_id uuid, p_epoch integer)
returns public.pf_rooms language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms;
begin
  select * into r from public.pf_rooms where id = p_id for update;
  if not found or auth.uid() is null or (auth.uid() <> r.host_id and auth.uid() is distinct from r.guest_id)
     or p_epoch <> r.recovery_epoch or r.status in ('forfeit','abandoned') then
    raise exception 'Recovery unavailable';
  end if;
  if auth.uid() = r.host_id then
    r.recovery_host_ack := p_epoch; r.host_seen := now();
  else
    r.recovery_guest_ack := p_epoch; r.guest_seen := now();
  end if;
  if r.recovery_host_ack = p_epoch and r.recovery_guest_ack = p_epoch
     and r.host_seen > now() - interval '30 seconds'
     and r.guest_seen > now() - interval '30 seconds' then r.status := 'live';
  else r.status := 'paused'; end if;
  update public.pf_rooms set recovery_host_ack = r.recovery_host_ack,
    recovery_guest_ack = r.recovery_guest_ack, host_seen = r.host_seen,
    guest_seen = r.guest_seen, status = r.status where id = p_id returning * into r;
  return r;
end $$;

-- Keep recovery paused until both players have loaded and acknowledged the
-- same checkpoint. Public rooms still forfeit after five minutes away.
create or replace function public.pf_touch_room(p_id uuid)
returns public.pf_rooms language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms; v_other timestamptz;
begin
  select * into r from public.pf_rooms where id=p_id for update;
  if not found or auth.uid() is null or (auth.uid()<>r.host_id and (r.guest_id is null or auth.uid()<>r.guest_id)) then raise exception 'Room unavailable'; end if;
  if r.status in ('forfeit','abandoned') then return r; end if;
  if auth.uid()=r.host_id then r.host_seen:=now(); else r.guest_seen:=now(); end if;
  v_other:=case when auth.uid()=r.host_id then r.guest_seen else r.host_seen end;
  if r.expires_at<now() then r.status:='abandoned';
  elsif r.guest_id is null then r.status:='waiting';
  elsif r.kind='public' and v_other<now()-interval '5 minutes' then
    r.status:='forfeit'; r.winner_id:=auth.uid();
  elsif r.recovery_epoch>0 and (r.recovery_host_ack<r.recovery_epoch or r.recovery_guest_ack<r.recovery_epoch) then r.status:='paused';
  elsif v_other is null or v_other<now()-interval '30 seconds' then r.status:='paused';
  else r.status:='live'; end if;
  update public.pf_rooms set host_seen=r.host_seen,guest_seen=r.guest_seen,status=r.status,winner_id=r.winner_id where id=r.id returning * into r;
  return r;
end $$;

revoke all on function public.pf_save_checkpoint(uuid,jsonb,bigint) from public;
revoke all on function public.pf_begin_recovery(uuid) from public;
revoke all on function public.pf_load_checkpoint(uuid) from public;
revoke all on function public.pf_ack_recovery(uuid,integer) from public;
grant execute on function public.pf_save_checkpoint(uuid,jsonb,bigint),
  public.pf_begin_recovery(uuid),public.pf_load_checkpoint(uuid),
  public.pf_ack_recovery(uuid,integer) to authenticated;
