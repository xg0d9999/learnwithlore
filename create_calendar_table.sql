-- Create calendar_events table
create table if not exists calendar_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  student_id uuid references profiles(id) on delete cascade,
  admin_id uuid references profiles(id) on delete set null,
  level text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Other')),
  created_at timestamptz default now()
);

-- Enable RLS
alter table calendar_events enable row level security;

-- Policies
create policy "Admins can do everything on calendar_events"
  on calendar_events for all
  using ( (select role from profiles where id = auth.uid()) = 'admin' );

create policy "Students can view their own calendar_events"
  on calendar_events for select
  using ( student_id = auth.uid() );

-- Create indexes for performance
create index if not exists idx_calendar_events_student_id on calendar_events(student_id);
create index if not exists idx_calendar_events_start_time on calendar_events(start_time);
