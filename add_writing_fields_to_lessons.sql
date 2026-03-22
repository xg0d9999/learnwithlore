-- Add writing-specific columns to the lessons table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='writing_location') THEN
        ALTER TABLE public.lessons ADD COLUMN writing_location TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='writing_task') THEN
        ALTER TABLE public.lessons ADD COLUMN writing_task TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='writing_requirements') THEN
        ALTER TABLE public.lessons ADD COLUMN writing_requirements TEXT;
    END IF;
END $$;
