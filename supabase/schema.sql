create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_details (
  id integer primary key check (id = 1),
  groom_name text not null default '',
  bride_name text not null default '',
  wedding_date date,
  wedding_time text not null default '',
  venue_name text not null default '',
  venue_address text not null default '',
  maps_link text not null default '',
  site_background_image_url text not null default '',
  hero_image_url text not null default '',
  gallery_items jsonb not null default '[]'::jsonb,
  gallery_urls jsonb not null default '[]'::jsonb,
  music_url text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.wedding_details
  add column if not exists groom_name text not null default '',
  add column if not exists bride_name text not null default '',
  add column if not exists wedding_date date,
  add column if not exists wedding_time text not null default '',
  add column if not exists venue_name text not null default '',
  add column if not exists venue_address text not null default '',
  add column if not exists maps_link text not null default '',
  add column if not exists site_background_image_url text not null default '',
  add column if not exists hero_image_url text not null default '',
  add column if not exists gallery_items jsonb not null default '[]'::jsonb,
  add column if not exists gallery_urls jsonb not null default '[]'::jsonb,
  add column if not exists music_url text not null default '',
  add column if not exists updated_at timestamptz not null default now();

update public.wedding_details as wedding
set gallery_items = coalesce(
  (
    select jsonb_agg(
      jsonb_build_object('url', gallery_url.value, 'category', 'photoshoot')
    )
    from jsonb_array_elements_text(wedding.gallery_urls) as gallery_url(value)
  ),
  '[]'::jsonb
)
where wedding.gallery_items = '[]'::jsonb
  and case
    when jsonb_typeof(wedding.gallery_urls) = 'array'
      then jsonb_array_length(wedding.gallery_urls) > 0
    else false
  end;

alter table public.admin_users enable row level security;
alter table public.wedding_details enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.wedding_details to anon, authenticated;
grant insert, update on public.wedding_details to authenticated;

create or replace function public.admin_exists()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users);
$$;

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function public.claim_first_admin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(742901);

  select email into current_email
  from auth.users
  where id = (select auth.uid());

  if current_email is null then
    raise exception 'Authenticated user email not found';
  end if;

  insert into public.admin_users (user_id, email)
  select (select auth.uid()), current_email
  where not exists (select 1 from public.admin_users)
  on conflict (user_id) do nothing;

  if not exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  ) then
    raise exception 'Initial admin has already been claimed';
  end if;
end;
$$;

drop policy if exists "Wedding details are public to read" on public.wedding_details;
create policy "Wedding details are public to read"
  on public.wedding_details for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert wedding details" on public.wedding_details;
create policy "Admins can insert wedding details"
  on public.wedding_details for insert
  to authenticated
  with check ((select public.is_current_user_admin()));

drop policy if exists "Admins can update wedding details" on public.wedding_details;
create policy "Admins can update wedding details"
  on public.wedding_details for update
  to authenticated
  using ((select public.is_current_user_admin()))
  with check ((select public.is_current_user_admin()));

revoke all on function public.admin_exists() from public;
revoke all on function public.is_current_user_admin() from public;
revoke all on function public.claim_first_admin() from public;
grant execute on function public.admin_exists() to anon, authenticated;
grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.claim_first_admin() to authenticated;

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wedding_details'
  ) then
    alter publication supabase_realtime add table public.wedding_details;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-assets',
  'wedding-assets',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Wedding assets are publicly readable" on storage.objects;
create policy "Wedding assets are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'wedding-assets');

drop policy if exists "Admins can upload wedding assets" on storage.objects;
create policy "Admins can upload wedding assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'wedding-assets'
    and (select public.is_current_user_admin())
  );

drop policy if exists "Admins can delete wedding assets" on storage.objects;
create policy "Admins can delete wedding assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'wedding-assets'
    and (select public.is_current_user_admin())
  );
