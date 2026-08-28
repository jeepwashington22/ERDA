-- ============================================================================
-- USER ACCOUNTS
-- Extends Supabase Auth (auth.users handles login/password) with a role
-- and basic profile info. No access-control logic here — just the table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS  public.user_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('super_admin', 'admin', 'staff')),
  is_active boolean not null default true,
  created_by uuid references user_profiles(id),  -- which admin created this account
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS public.idx_user_profiles_role on user_profile(role);

-- Auto-creates a profile row the moment someone signs up through Supabase Auth.
-- Defaults new accounts to 'staff' — an admin changes the role afterward.
create or replace function handle_new_auth_user()
  returns trigger as $$
  begin
  insert into public.user_profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_auth_user
after insert on auth.users
for each row execute function handle_new_auth_user();
