-- Add meeting_link column to calendar_events
alter table calendar_events add column if not exists meeting_link text;
