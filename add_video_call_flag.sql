-- Add is_video_call column to calendar_events
alter table calendar_events add column if not exists is_video_call boolean default false;
