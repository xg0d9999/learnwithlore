-- Create the 'public' bucket if it doesn't exist and make it publicly accessible
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public', 'public', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access (essential for audio playback and images)
CREATE POLICY "Allow public read access for public bucket" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'public');

-- Policy to allow authenticated users (like admin or students) to upload files
CREATE POLICY "Allow authenticated users to upload to public bucket" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'public');

-- Policy to allow authenticated users to update/replace files (upsert)
CREATE POLICY "Allow authenticated users to update public bucket" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'public');

-- Policy to allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete from public bucket" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'public');
