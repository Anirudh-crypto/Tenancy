create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists tenant_property_id uuid references public.properties(id) on delete set null;

create table if not exists public.property_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'redeemed', 'revoked')),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists property_invites_property_id_idx
  on public.property_invites(property_id);

create index if not exists property_invites_owner_id_idx
  on public.property_invites(owner_id);

create index if not exists property_invites_active_code_idx
  on public.property_invites(code)
  where status = 'active';

alter table public.property_invites enable row level security;

create or replace function public.preview_invite(p_code text)
returns table (
  property_id uuid,
  property_name text,
  property_address text,
  city text
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.address,
    p.city
  from public.property_invites i
  join public.properties p on p.id = i.property_id
  where i.code = upper(trim(p_code))
    and i.status = 'active'
  limit 1;
$$;

create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_property_id uuid;
  v_profile public.profiles%rowtype;
  v_tenant jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select *
    into v_profile
  from public.profiles
  where id = v_user_id;

  if v_profile.id is null then
    raise exception 'profile_missing';
  end if;

  select property_id
    into v_property_id
  from public.property_invites
  where code = upper(trim(p_code))
    and status = 'active'
  for update;

  if v_property_id is null then
    raise exception 'invalid_code';
  end if;

  update public.property_invites
  set
    status = 'redeemed',
    redeemed_by = v_user_id,
    redeemed_at = now()
  where code = upper(trim(p_code))
    and status = 'active';

  update public.profiles
  set
    role = 'tenant',
    tenant_property_id = v_property_id
  where id = v_user_id;

  v_tenant := jsonb_build_object(
    'id', v_user_id::text,
    'name', coalesce(nullif(v_profile.name, ''), split_part(v_profile.email, '@', 1)),
    'email', case
      when v_profile.email like '%@tenant.tenancyos.app' then null
      else nullif(v_profile.email, '')
    end,
    'moveInDate', now()
  );

  update public.properties
  set
    status = 'occupied',
    tenants = case
      when exists (
        select 1
        from jsonb_array_elements(coalesce(tenants, '[]'::jsonb)) existing_tenant
        where existing_tenant->>'id' = v_user_id::text
      ) then coalesce(tenants, '[]'::jsonb)
      else coalesce(tenants, '[]'::jsonb) || jsonb_build_array(v_tenant)
    end
  where id = v_property_id;

  return v_property_id;
end;
$$;

grant execute on function public.preview_invite(text) to anon, authenticated;
grant execute on function public.redeem_invite(text) to authenticated;

create or replace function public.can_access_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.properties p
    where p.id = p_property_id
      and (
        p.owner_id = auth.uid()
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.tenant_property_id = p_property_id
        )
      )
  );
$$;

grant execute on function public.can_access_property(uuid) to authenticated;

do $$
declare
  v_table text;
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'property_invites'
      and policyname = 'Landlords can view property invites'
  ) then
    create policy "Landlords can view property invites"
      on public.property_invites
      for select
      using (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'property_invites'
      and policyname = 'Landlords can create property invites'
  ) then
    create policy "Landlords can create property invites"
      on public.property_invites
      for insert
      with check (
        owner_id = auth.uid()
        and exists (
          select 1
          from public.properties p
          where p.id = property_id
            and p.owner_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'property_invites'
      and policyname = 'Landlords can revoke property invites'
  ) then
    create policy "Landlords can revoke property invites"
      on public.property_invites
      for update
      using (owner_id = auth.uid())
      with check (owner_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'properties'
      and policyname = 'Users can view their accessible properties'
  ) then
    create policy "Users can view their accessible properties"
      on public.properties
      for select
      using (
        owner_id = auth.uid()
        or exists (
          select 1
          from public.profiles pr
          where pr.id = auth.uid()
            and pr.tenant_property_id = properties.id
        )
      );
  end if;

  foreach v_table in array array['tickets', 'timeline_events', 'inspections', 'risks']
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = v_table
          and policyname = 'Users can view accessible ' || v_table
      ) then
        execute format(
          'create policy %I on public.%I for select using (public.can_access_property(property_id))',
          'Users can view accessible ' || v_table,
          v_table
        );
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = v_table
          and policyname = 'Users can insert accessible ' || v_table
      ) then
        execute format(
          'create policy %I on public.%I for insert with check (public.can_access_property(property_id))',
          'Users can insert accessible ' || v_table,
          v_table
        );
      end if;

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = v_table
          and policyname = 'Users can update accessible ' || v_table
      ) then
        execute format(
          'create policy %I on public.%I for update using (public.can_access_property(property_id)) with check (public.can_access_property(property_id))',
          'Users can update accessible ' || v_table,
          v_table
        );
      end if;
    end if;
  end loop;
end $$;
