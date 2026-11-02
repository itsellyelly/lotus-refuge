-- Lotus Refuge: multi-circle schema.
-- Every row belongs to a circle; only that circle's members can read or write it.

-- ---------------------------------------------------------------- tables
create table public.circles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 40),
  invite_code  text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_by   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table public.circle_members (
  circle_id      uuid not null references public.circles (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  role           text not null default 'member' check (role in ('owner', 'member')),
  nickname       text not null check (char_length(nickname) between 1 and 24),
  robe           smallint not null default 0 check (robe between 0 and 5),
  home_realm     text check (home_realm in ('gate','hall','chapel','masjid','mandir','tree','bar','bamboo','pond','bridge')),
  realm          text check (realm in ('gate','hall','chapel','masjid','mandir','tree','bar','bamboo','pond','bridge')),
  mood           text check (mood in ('Drained','Stressed','Holding up','Calm','Grateful')),
  note           text check (char_length(note) <= 140),
  checked_in_at  timestamptz,
  joined_at      timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on public.circle_members (user_id);

create table public.messages (
  id          bigint generated always as identity primary key,
  circle_id   uuid not null references public.circles (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('msg','checkin','offering','vent')),
  realm       text not null check (realm in ('gate','hall','chapel','masjid','mandir','tree','bar','bamboo','pond','bridge')),
  body        text check (char_length(body) <= 500),
  mood        text,
  place       text,
  item        text,
  created_at  timestamptz not null default now()
);
create index messages_circle_created_idx on public.messages (circle_id, created_at desc);
create index messages_user_idx on public.messages (user_id);

create table public.offerings (
  id          bigint generated always as identity primary key,
  circle_id   uuid not null references public.circles (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place       text not null check (place in ('hall','chapel','masjid','mandir','tree')),
  item        text not null check (char_length(item) <= 24),
  wish        text check (char_length(wish) <= 160),
  created_at  timestamptz not null default now()
);
create index offerings_circle_place_idx on public.offerings (circle_id, place, created_at desc);
create index offerings_user_idx on public.offerings (user_id);

create table public.vent_reactions (
  message_id  bigint not null references public.messages (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  circle_id   uuid not null references public.circles (id) on delete cascade,
  reaction    text not null check (reaction in ('same','hug','lol','fire')),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);
create index vent_reactions_circle_idx on public.vent_reactions (circle_id);
create index vent_reactions_user_idx on public.vent_reactions (user_id);

create table public.boss_scores (
  id          bigint generated always as identity primary key,
  circle_id   uuid not null references public.circles (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  score       integer not null check (score between 0 and 5000),
  created_at  timestamptz not null default now()
);
create index boss_scores_circle_score_idx on public.boss_scores (circle_id, score desc);
create index boss_scores_user_idx on public.boss_scores (user_id);

-- ---------------------------------------------------------------- membership helper
-- security definer so RLS policies can check membership without recursing into circle_members' own policy.
create or replace function public.is_member(c uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members m
    where m.circle_id = c and m.user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- ---------------------------------------------------------------- RPCs
create or replace function public.create_circle(p_name text, p_nickname text, p_robe smallint, p_home text)
returns public.circles
language plpgsql security definer set search_path = ''
as $$
declare c public.circles;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  insert into public.circles (name, created_by) values (trim(p_name), (select auth.uid())) returning * into c;
  insert into public.circle_members (circle_id, user_id, role, nickname, robe, home_realm)
  values (c.id, (select auth.uid()), 'owner', trim(p_nickname), coalesce(p_robe, 0), p_home);
  return c;
end;
$$;

create or replace function public.join_circle(p_code text, p_nickname text, p_robe smallint)
returns public.circles
language plpgsql security definer set search_path = ''
as $$
declare c public.circles;
begin
  if (select auth.uid()) is null then raise exception 'not signed in'; end if;
  select * into c from public.circles where invite_code = trim(p_code);
  if not found then raise exception 'invite code not found'; end if;
  insert into public.circle_members (circle_id, user_id, nickname, robe)
  values (c.id, (select auth.uid()), trim(p_nickname), coalesce(p_robe, 0))
  on conflict (circle_id, user_id) do nothing;
  return c;
end;
$$;

-- Owner can issue a new invite code, which stops the old link working.
create or replace function public.rotate_invite(p_circle uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare code text := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
begin
  update public.circles set invite_code = code
  where id = p_circle
    and exists (select 1 from public.circle_members m
                where m.circle_id = p_circle and m.user_id = (select auth.uid()) and m.role = 'owner');
  if not found then raise exception 'only the circle owner can do that'; end if;
  return code;
end;
$$;

revoke execute on function public.create_circle(text, text, smallint, text) from public, anon;
revoke execute on function public.join_circle(text, text, smallint) from public, anon;
revoke execute on function public.rotate_invite(uuid) from public, anon;
grant execute on function public.create_circle(text, text, smallint, text) to authenticated;
grant execute on function public.join_circle(text, text, smallint) to authenticated;
grant execute on function public.rotate_invite(uuid) to authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.circles        enable row level security;
alter table public.circle_members enable row level security;
alter table public.messages       enable row level security;
alter table public.offerings      enable row level security;
alter table public.vent_reactions enable row level security;
alter table public.boss_scores    enable row level security;

create policy "members read their circle" on public.circles
  for select to authenticated using ((select public.is_member(id)));
create policy "owner renames circle" on public.circles
  for update to authenticated
  using (exists (select 1 from public.circle_members m where m.circle_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists (select 1 from public.circle_members m where m.circle_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'));

create policy "members read members" on public.circle_members
  for select to authenticated using ((select public.is_member(circle_id)));
create policy "edit own membership" on public.circle_members
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "leave circle" on public.circle_members
  for delete to authenticated using (user_id = (select auth.uid()));
-- role can't be self-promoted: only these columns are updatable by members.
revoke update on public.circle_members from authenticated;
grant update (nickname, robe, home_realm, realm, mood, note, checked_in_at) on public.circle_members to authenticated;

create policy "members read messages" on public.messages
  for select to authenticated using ((select public.is_member(circle_id)));
create policy "members post messages" on public.messages
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member(circle_id)));
create policy "delete own messages" on public.messages
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "members read offerings" on public.offerings
  for select to authenticated using ((select public.is_member(circle_id)));
create policy "members make offerings" on public.offerings
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member(circle_id)));

create policy "members read reactions" on public.vent_reactions
  for select to authenticated using ((select public.is_member(circle_id)));
create policy "members react" on public.vent_reactions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member(circle_id)));
create policy "remove own reaction" on public.vent_reactions
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "members read scores" on public.boss_scores
  for select to authenticated using ((select public.is_member(circle_id)));
create policy "members post scores" on public.boss_scores
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member(circle_id)));

-- ---------------------------------------------------------------- realtime
-- Row changes stream to members (Realtime applies the select policies above).
alter publication supabase_realtime add table public.messages, public.offerings, public.circle_members, public.vent_reactions, public.boss_scores;
alter table public.vent_reactions replica identity full;

-- Presence (who is walking where) uses private channels named "circle:<id>".
create policy "circle members use their presence channel" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('presence', 'broadcast')
    and exists (select 1 from public.circle_members m
                where m.circle_id::text = split_part((select realtime.topic()), ':', 2)
                  and m.user_id = (select auth.uid()))
  );
create policy "circle members send on their presence channel" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('presence', 'broadcast')
    and exists (select 1 from public.circle_members m
                where m.circle_id::text = split_part((select realtime.topic()), ':', 2)
                  and m.user_id = (select auth.uid()))
  );
