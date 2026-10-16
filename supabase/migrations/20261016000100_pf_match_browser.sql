-- PongFall match browser. Apply to a test project first, after 20261014131300_room_player_names.sql.
-- Adds listed (browsable) rooms: a host can list a custom match, and anyone signed in (guest or account) can see open ones and join by code.
-- Quick Match keeps using its own fixed-config queue; listed rooms are marked config.listed = true and are never picked by it.
-- Matches stay unranked and pay nothing. Nothing here exposes who is playing beyond the display name the host chose.

create or replace function public.pf_create_listed_room(p_config jsonb)
returns public.pf_rooms language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.pf_rooms; v_mode text; v_code text; v_cfg jsonb;
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
  -- one open listing per host at a time
  update public.pf_rooms set status = 'abandoned'
    where host_id = auth.uid() and kind = 'public' and status = 'waiting' and config ? 'listed';
  v_cfg := jsonb_build_object('mode', v_mode, 'difficulty', p_config->>'difficulty', 'arenas', (p_config->>'arenas')::int,
    'flux', (p_config->>'flux')::boolean, 'target', (p_config->>'target')::int, 'timeLimit', (p_config->>'timeLimit')::int,
    'seed', (p_config->>'seed')::bigint, 'listed', true);
  for i in 1..8 loop
    v_code := 'PF-' || upper(encode(gen_random_bytes(5),'hex'));
    begin
      insert into public.pf_rooms(code,topic,kind,config,host_id,expires_at)
      values (v_code,'pongfall:' || gen_random_uuid()::text,'public',v_cfg,auth.uid(),now()+interval '1 hour') returning * into r;
      return r;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'Could not reserve a room code';
end $$;
revoke all on function public.pf_create_listed_room(jsonb) from public;
grant execute on function public.pf_create_listed_room(jsonb) to authenticated;

create or replace function public.pf_list_open_rooms(p_mode text default null)
returns table(code text, mode text, difficulty text, arenas integer, target integer, time_limit integer, flux boolean, host_name text, age_seconds integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select r.code, r.config->>'mode', r.config->>'difficulty', (r.config->>'arenas')::int, (r.config->>'target')::int,
         (r.config->>'timeLimit')::int, coalesce((r.config->>'flux')::boolean, false), r.host_name,
         extract(epoch from now() - r.created_at)::int
  from public.pf_rooms r
  where auth.uid() is not null and r.kind = 'public' and r.config ? 'listed' and r.status = 'waiting' and r.guest_id is null
    and r.expires_at > now() and r.created_at > now() - interval '10 minutes' and r.host_id <> auth.uid()
    and (p_mode is null or r.config->>'mode' = p_mode)
  order by r.created_at desc
  limit 30;
$$;
revoke all on function public.pf_list_open_rooms(text) from public;
grant execute on function public.pf_list_open_rooms(text) to authenticated;

-- Quick Match must not pick up listed rooms: same function as before plus `and not (config ? 'listed')`.
create or replace function public.pf_public_queue(p_mode text)
returns public.pf_rooms language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.pf_rooms; v_cfg jsonb; v_code text;
begin
  if auth.uid() is null then raise exception 'Sign in to play online'; end if;
  if p_mode not in ('versus','versus-timed') then raise exception 'Invalid mode'; end if;
  perform pg_advisory_xact_lock(hashtext('pongfall-public-' || p_mode));
  select * into r from public.pf_rooms
    where kind='public' and status='waiting' and config->>'mode'=p_mode and not (config ? 'listed')
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
