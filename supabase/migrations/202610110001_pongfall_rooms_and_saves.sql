-- Apply to a test project first. Review existing auth and realtime.messages
-- policies before enabling anonymous sign-ins on the shared project.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pf_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  topic text not null unique,
  kind text not null check (kind in ('invite','public')),
  config jsonb not null,
  host_id uuid not null references auth.users(id),
  guest_id uuid references auth.users(id),
  status text not null default 'waiting' check (status in ('waiting','live','paused','forfeit','abandoned')),
  host_seen timestamptz not null default now(),
  guest_seen timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  winner_id uuid references auth.users(id)
);
create index if not exists pf_rooms_queue_idx on public.pf_rooms(kind,status,created_at) where kind='public';
alter table public.pf_rooms enable row level security;
grant select on public.pf_rooms to authenticated;
create policy pf_rooms_players_read on public.pf_rooms for select to authenticated
  using (auth.uid() = host_id or auth.uid() = guest_id);

create table if not exists public.pf_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  falls integer not null default 0 check (falls >= 0),
  settings jsonb not null default '{}'::jsonb,
  unlocks jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.pf_profiles enable row level security;
grant select,insert,update on public.pf_profiles to authenticated;
create policy pf_profile_read on public.pf_profiles for select to authenticated using (auth.uid()=user_id);
create policy pf_profile_insert on public.pf_profiles for insert to authenticated with check (auth.uid()=user_id);
create policy pf_profile_update on public.pf_profiles for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

create table if not exists public.pf_saves (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 48),
  replay jsonb not null,
  saved_at timestamptz not null default now()
);
create index if not exists pf_saves_user_idx on public.pf_saves(user_id,saved_at desc);
alter table public.pf_saves enable row level security;
grant select,insert,update,delete on public.pf_saves to authenticated;
create policy pf_saves_read on public.pf_saves for select to authenticated using (auth.uid()=user_id);
create policy pf_saves_insert on public.pf_saves for insert to authenticated with check (auth.uid()=user_id);
create policy pf_saves_update on public.pf_saves for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy pf_saves_delete on public.pf_saves for delete to authenticated using (auth.uid()=user_id);

create table if not exists public.pf_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  won boolean not null,
  score integer not null,
  opponent_score integer not null,
  played_at timestamptz not null default now()
);
create index if not exists pf_history_user_idx on public.pf_history(user_id,played_at desc);
alter table public.pf_history enable row level security;
grant select,insert on public.pf_history to authenticated;
create policy pf_history_read on public.pf_history for select to authenticated using (auth.uid()=user_id);
create policy pf_history_insert on public.pf_history for insert to authenticated with check (auth.uid()=user_id);

create table if not exists public.pf_transfer_tokens (
  guest_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.pf_transfer_tokens enable row level security;
grant insert,update on public.pf_transfer_tokens to authenticated;
create policy pf_transfer_insert on public.pf_transfer_tokens for insert to authenticated with check (auth.uid()=guest_id);
create policy pf_transfer_update on public.pf_transfer_tokens for update to authenticated using (auth.uid()=guest_id) with check (auth.uid()=guest_id);

create or replace function public.pf_create_room(p_config jsonb)
returns public.pf_rooms language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.pf_rooms; v_mode text; v_code text;
begin
  if auth.uid() is null then raise exception 'Sign in to play online'; end if;
  v_mode := p_config->>'mode';
  if v_mode not in ('versus','versus-timed') then raise exception 'Invalid mode'; end if;
  if coalesce((p_config->>'arenas')::int,-1) not in (0,1,3,5) then raise exception 'Invalid arenas'; end if;
  if coalesce((p_config->>'target')::int,-999) not in (0,7,14,24,28)
     or coalesce((p_config->>'timeLimit')::int,-999) not in (-1,0,60,120,180)
     or coalesce((p_config->>'seed')::bigint,-1) not between 0 and 1000000000
     or coalesce(p_config->>'difficulty','') not in ('chill','casual','sharp','relentless')
     or jsonb_typeof(p_config->'flux') <> 'boolean' then raise exception 'Invalid match settings'; end if;
  for i in 1..8 loop
    v_code := 'PF-' || upper(encode(gen_random_bytes(5),'hex'));
    begin
      insert into public.pf_rooms(code,topic,kind,config,host_id,expires_at)
      values (v_code,'pongfall:' || gen_random_uuid()::text,'invite',p_config,auth.uid(),now()+interval '7 days') returning * into r;
      return r;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'Could not reserve a room code';
end $$;

create or replace function public.pf_join_room(p_code text)
returns public.pf_rooms language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.pf_rooms;
begin
  if auth.uid() is null then raise exception 'Sign in to play online'; end if;
  select * into r from public.pf_rooms where code=upper(trim(p_code)) for update;
  if not found or r.expires_at < now() or r.status in ('forfeit','abandoned') then raise exception 'Room unavailable or expired'; end if;
  if r.host_id <> auth.uid() and r.guest_id is not null and r.guest_id <> auth.uid() then raise exception 'Room is full'; end if;
  if r.host_id <> auth.uid() and r.guest_id is null then
    update public.pf_rooms set guest_id=auth.uid(),guest_seen=now(),status='live' where id=r.id returning * into r;
  end if;
  return r;
end $$;

create or replace function public.pf_public_queue(p_mode text)
returns public.pf_rooms language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.pf_rooms; v_cfg jsonb; v_code text;
begin
  if auth.uid() is null then raise exception 'Sign in to play online'; end if;
  if p_mode not in ('versus','versus-timed') then raise exception 'Invalid mode'; end if;
  perform pg_advisory_xact_lock(hashtext('pongfall-public-' || p_mode));
  select * into r from public.pf_rooms
    where kind='public' and status='waiting' and config->>'mode'=p_mode
      and host_id<>auth.uid() and created_at>now()-interval '5 minutes'
    order by created_at limit 1 for update;
  if found then
    update public.pf_rooms set guest_id=auth.uid(),guest_seen=now(),status='live' where id=r.id returning * into r;
    return r;
  end if;
  v_cfg := jsonb_build_object('mode',p_mode,'difficulty','chill','arenas',3,'flux',false,
    'target',case when p_mode='versus' then 14 else 0 end,
    'timeLimit',case when p_mode='versus-timed' then 120 else 0 end,
    'seed',floor(random()*1000000000)::int);
  for i in 1..8 loop
    v_code := 'PF-' || upper(encode(gen_random_bytes(5),'hex'));
    begin
      insert into public.pf_rooms(code,topic,kind,config,host_id,expires_at)
      values (v_code,'pongfall:' || gen_random_uuid()::text,'public',v_cfg,auth.uid(),now()+interval '1 day') returning * into r;
      return r;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'Could not enter the queue';
end $$;

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
  elsif v_other is null or v_other<now()-interval '30 seconds' then r.status:='paused';
  else r.status:='live'; end if;
  if r.kind='public' and v_other<now()-interval '5 minutes' then
    r.status:='forfeit'; r.winner_id:=auth.uid();
  end if;
  update public.pf_rooms set host_seen=r.host_seen,guest_seen=r.guest_seen,status=r.status,winner_id=r.winner_id where id=r.id returning * into r;
  return r;
end $$;

create or replace function public.pf_claim_guest(p_token text)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_guest uuid; v_falls int; v_settings jsonb; v_unlocks jsonb;
begin
  if auth.uid() is null or length(p_token)<32 then raise exception 'Invalid transfer'; end if;
  select guest_id into v_guest from public.pf_transfer_tokens
    where token_hash=encode(digest(p_token,'sha256'),'hex') and used_at is null for update;
  if v_guest is null or v_guest=auth.uid() then raise exception 'Transfer unavailable'; end if;
  select falls,settings,unlocks into v_falls,v_settings,v_unlocks from public.pf_profiles where user_id=v_guest;
  insert into public.pf_profiles(user_id,falls,settings,unlocks)
  values (auth.uid(),coalesce(v_falls,0),coalesce(v_settings,'{}'::jsonb),coalesce(v_unlocks,'{}'::jsonb))
  on conflict (user_id) do update set falls=greatest(pf_profiles.falls,excluded.falls),
    settings=case when pf_profiles.updated_at<excluded.updated_at then excluded.settings else pf_profiles.settings end,
    unlocks=pf_profiles.unlocks || excluded.unlocks,updated_at=now();
  update public.pf_saves set user_id=auth.uid() where user_id=v_guest;
  update public.pf_history set user_id=auth.uid() where user_id=v_guest;
  update public.pf_transfer_tokens set used_at=now() where guest_id=v_guest;
end $$;

revoke all on function public.pf_create_room(jsonb) from public;
revoke all on function public.pf_join_room(text) from public;
revoke all on function public.pf_public_queue(text) from public;
revoke all on function public.pf_touch_room(uuid) from public;
revoke all on function public.pf_claim_guest(text) from public;
grant execute on function public.pf_create_room(jsonb),public.pf_join_room(text),public.pf_public_queue(text),public.pf_touch_room(uuid),public.pf_claim_guest(text) to authenticated;

-- Anonymous Auth users have the authenticated database role. Membership is
-- checked with auth.uid(), so a guest receives only its own room's broadcasts.
create policy pf_room_receive on realtime.messages for select to authenticated
  using (extension='broadcast' and exists (
    select 1 from public.pf_rooms r where r.topic=realtime.topic()
      and (r.host_id=auth.uid() or r.guest_id=auth.uid())
      and r.status in ('waiting','live','paused') and r.expires_at>now()
  ));
create policy pf_room_send on realtime.messages for insert to authenticated
  with check (extension='broadcast' and exists (
    select 1 from public.pf_rooms r where r.topic=realtime.topic()
      and (r.host_id=auth.uid() or r.guest_id=auth.uid())
      and r.status in ('waiting','live','paused') and r.expires_at>now()
  ));
