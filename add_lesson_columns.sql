-- Add missing columns to the lessons table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='duration') THEN
        ALTER TABLE public.lessons ADD COLUMN duration TEXT DEFAULT '15 Minutes';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='image_url') THEN
        ALTER TABLE public.lessons ADD COLUMN image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800';
    END IF;

    -- Standardize names if they were previously different
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='level') THEN
        ALTER TABLE public.lessons RENAME COLUMN language_level TO level;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='category') THEN
        ALTER TABLE public.lessons RENAME COLUMN lesson_type TO category;
    END IF;
END $$;
