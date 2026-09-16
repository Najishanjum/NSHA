-- CoupleSync Supabase Database Schema
-- Run this in your Supabase Project -> SQL Editor -> New query -> Run

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Couples Table
create table if not exists public.couples (
  id text primary key,
  code text unique not null,
  partner1_name text not null,
  partner2_name text not null,
  couple_nickname text,
  relationship_start_date text,
  timezone text default 'UTC',
  streak_freezes_remaining int default 2,
  created_at timestamp with time zone default now()
);

-- 2. Daily Challenges Table
create table if not exists public.challenges (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  date text not null,
  partner1_photos int default 0,
  partner2_photos int default 0,
  partner1_vc boolean default false,
  partner2_vc boolean default false,
  partner1_question boolean default false,
  partner2_question boolean default false,
  status text default 'pending',
  streak_at_day int default 0,
  created_at timestamp with time zone default now(),
  unique(couple_id, date)
);

-- 3. Messages / Chat Table
create table if not exists public.messages (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  partner int not null,
  content text not null,
  type text default 'text',
  media_url text,
  reply_to_id text,
  reactions jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now()
);

-- 4. Photos Gallery Table
create table if not exists public.photos (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  partner int not null,
  file_url text not null,
  caption text default '',
  is_favorite boolean default false,
  is_challenge boolean default true,
  date text not null,
  created_at timestamp with time zone default now()
);

-- 5. Voice Clips Table
create table if not exists public.voice_clips (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  partner int not null,
  file_url text not null,
  duration int default 0,
  type text default 'voice',
  is_challenge boolean default true,
  date text not null,
  created_at timestamp with time zone default now()
);

-- 6. Mood Entries Table
create table if not exists public.moods (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  partner int not null,
  mood text not null,
  note text,
  date text not null,
  created_at timestamp with time zone default now()
);

-- 7. Question Answers Table
create table if not exists public.questions (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  partner int not null,
  question_id text,
  question_text text not null,
  answer text not null,
  date text not null,
  created_at timestamp with time zone default now()
);

-- 8. Bucket List Table
create table if not exists public.bucket_list (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  title text not null,
  description text,
  category text default 'adventure',
  target_date text,
  completed boolean default false,
  completed_at timestamp with time zone,
  created_by int not null,
  created_at timestamp with time zone default now()
);

-- 9. Love Notes Table
create table if not exists public.love_notes (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  from_partner int not null,
  to_partner int not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- 10. Surprises Table
create table if not exists public.surprises (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  from_partner int not null,
  title text not null,
  message text not null,
  unlock_at timestamp with time zone not null,
  is_unlocked boolean default false,
  unlocked_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 11. Important Dates Table
create table if not exists public.important_dates (
  id text primary key,
  couple_id text references public.couples(id) on delete cascade,
  title text not null,
  date text not null,
  type text default 'anniversary',
  added_by int not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) and allow public read/write for couple app
alter table public.couples enable row level security;
alter table public.challenges enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;
alter table public.voice_clips enable row level security;
alter table public.moods enable row level security;
alter table public.questions enable row level security;
alter table public.bucket_list enable row level security;
alter table public.love_notes enable row level security;
alter table public.surprises enable row level security;
alter table public.important_dates enable row level security;

-- Create Open Policies (allows partners to share space data with couple code)
create policy "Allow all access to couples" on public.couples for all using (true) with check (true);
create policy "Allow all access to challenges" on public.challenges for all using (true) with check (true);
create policy "Allow all access to messages" on public.messages for all using (true) with check (true);
create policy "Allow all access to photos" on public.photos for all using (true) with check (true);
create policy "Allow all access to voice_clips" on public.voice_clips for all using (true) with check (true);
create policy "Allow all access to moods" on public.moods for all using (true) with check (true);
create policy "Allow all access to questions" on public.questions for all using (true) with check (true);
create policy "Allow all access to bucket_list" on public.bucket_list for all using (true) with check (true);
create policy "Allow all access to love_notes" on public.love_notes for all using (true) with check (true);
create policy "Allow all access to surprises" on public.surprises for all using (true) with check (true);
create policy "Allow all access to important_dates" on public.important_dates for all using (true) with check (true);
