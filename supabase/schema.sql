-- HashGuard Profiles / Username Registry Table
-- Execute in your Supabase project SQL Editor (https://app.supabase.com)

create table if not exists public.profiles (
  wallet_address text primary key,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Allow public read access (for username -> address and address -> username lookups)
create policy "Allow public read access to profiles"
  on public.profiles for select
  using (true);

-- Allow inserts and updates
create policy "Allow public insert to profiles"
  on public.profiles for insert
  with check (true);

create policy "Allow public update to profiles"
  on public.profiles for update
  using (true);

-- Fast search & strict 1-to-1 uniqueness constraints
create unique index if not exists idx_profiles_username_unique on public.profiles (lower(username));
create index if not exists idx_profiles_wallet on public.profiles (lower(wallet_address));
