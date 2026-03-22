-- Add roadmap fields to assignments
alter table assignments 
add column if not exists available_at timestamptz default now(),
add column if not exists due_at timestamptz;

-- Add status to calendar_events if not already using a status column
-- Our appointments table had status, but calendar_events (legacy or simplified) might not.
-- Let's ensure calendar_events has a status column.
do $$ 
begin 
    if not exists (select 1 from information_schema.columns where table_name='calendar_events' and column_name='status') then
        alter table calendar_events add column status text check (status in ('scheduled', 'attended', 'missed', 'cancelled')) default 'scheduled';
    end if;
end $$;

-- Update RLS if necessary (usually 'all' policies cover new columns)
