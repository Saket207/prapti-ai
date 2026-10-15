-- =====================================================
-- Prapti-AI security rules (RLS). Run after schema.sql
-- =====================================================

-- Helper: is the logged-in user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- No direct writes from the frontend (backend uses the secret key)
revoke insert, update, delete on public.items from anon, authenticated;
revoke insert, update, delete on public.claims from anon, authenticated;
revoke insert, update, delete on public.status_history from anon, authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- Secret answers: nobody from the frontend
revoke all on public.item_secrets from anon, authenticated;

-- Users may change only their name and Telegram id (never their role)
revoke update on public.profiles from anon, authenticated;
grant update (full_name, telegram_chat_id) on public.profiles to authenticated;

-- PROFILES: see and edit only your own row (admin sees all)
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ITEMS: see your own items, open found items, or everything if admin
create policy "items_select" on public.items
  for select to authenticated
  using (
    reporter_id = (select auth.uid())
    or (kind = 'found' and status in ('found', 'matched'))
    or public.is_admin()
  );

-- CLAIMS: claimant, the finder of that item, or admin
create policy "claims_select" on public.claims
  for select to authenticated
  using (
    claimant_id = (select auth.uid())
    or exists (
      select 1 from public.items i
      where i.id = claims.found_item_id and i.reporter_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- STATUS HISTORY: owner of the item, or admin
create policy "history_select" on public.status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.items i
      where i.id = status_history.item_id and i.reporter_id = (select auth.uid())
    )
    or public.is_admin()
  );

-- STORAGE: no policies on purpose.
--   originals (private): only the backend can read or write it.
--   blurred (public): anyone can view files; only the backend can upload.