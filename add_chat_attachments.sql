-- Add attachments column to messages table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'attachments'
    ) THEN
        ALTER TABLE messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Policies for Storage (Run these in the Supabase SQL Editor)
-- Note: You should manually create a public bucket named 'chat-attachments' first.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Give users access to their own folder 1qj7v6a_0" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can download chat attachments 1qj7v6a_1" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'chat-attachments');

