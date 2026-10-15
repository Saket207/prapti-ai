-- =====================================================
-- Prapti-AI database schema (run once in Supabase SQL Editor)
-- =====================================================

-- 0. Vector extension (for CLIP embeddings)
create extension if not exists vector with schema extensions;

-- 1. PROFILES: one row per logged-in student
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  telegram_chat_id text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- 2. ITEMS: both lost reports and found reports
create table public.items (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('lost', 'found')),
  status text not null check (status in ('lost', 'found', 'matched', 'returned')),
  description text,
  category text,
  color text,
  location_id text not null,
  event_time timestamptz not null default now(),
  original_image_path text,
  blurred_image_path text,
  image_embedding extensions.vector(512),
  text_embedding extensions.vector(512),
  created_at timestamptz not null default now(),
  check (original_image_path is not null or description is not null)
);

-- 3. ITEM_SECRETS: secret question + answer (locked, backend only)
create table public.item_secrets (
  item_id uuid primary key references public.items(id) on delete cascade,
  question text not null,
  answer text not null
);

-- 4. CLAIMS: an owner claims a found item
create table public.claims (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references public.items(id) on delete cascade,
  found_item_id uuid not null references public.items(id) on delete cascade,
  claimant_id uuid not null references public.profiles(id) on delete cascade,
  score numeric,
  attempts int not null default 0,
  qr_token text unique,
  verified_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lost_item_id, found_item_id)
);

-- 5. STATUS_HISTORY: log of every status change
create table public.status_history (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.items(id) on delete cascade,
  old_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now()
);

-- 6. Indexes (faster search)
create index items_kind_status_idx on public.items (kind, status);
create index items_location_idx on public.items (location_id);
create index items_image_emb_idx on public.items using hnsw (image_embedding extensions.vector_cosine_ops);
create index items_text_emb_idx on public.items using hnsw (text_embedding extensions.vector_cosine_ops);
create index claims_claimant_idx on public.claims (claimant_id);
create index status_history_item_idx on public.status_history (item_id);

-- 7. Auto-create a profile when a student signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8. Auto-log every status change
create or replace function public.log_item_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (item_id, old_status, new_status)
    values (new.id, null, new.status);
  elsif new.status is distinct from old.status then
    insert into public.status_history (item_id, old_status, new_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create trigger items_status_log
  after insert or update on public.items
  for each row execute function public.log_item_status();

-- 9. Switch ON Row Level Security (rules come later in rls.sql)
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.item_secrets enable row level security;
alter table public.claims enable row level security;
alter table public.status_history enable row level security;

-- 10. Storage buckets: private originals, public blurred
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('originals', 'originals', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('blurred', 'blurred', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;