-- Create exercise_submissions table
CREATE TABLE IF NOT EXISTS public.exercise_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'reviewed'
    grade INTEGER,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.exercise_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Students can insert their own submissions" ON public.exercise_submissions;
DROP POLICY IF EXISTS "Students can view their own submissions" ON public.exercise_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.exercise_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.exercise_submissions;

-- Students can insert their own submissions
CREATE POLICY "Students can insert their own submissions" 
ON public.exercise_submissions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Students can view their own submissions
CREATE POLICY "Students can view their own submissions" 
ON public.exercise_submissions FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" 
ON public.exercise_submissions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can update submissions (for feedback/status)
CREATE POLICY "Admins can update submissions" 
ON public.exercise_submissions FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Create a view for better admin display (joins user and lesson info)
CREATE OR REPLACE VIEW public.admin_submissions_view AS
SELECT 
    s.*,
    p.full_name as student_name,
    l.title as lesson_title
FROM 
    public.exercise_submissions s
JOIN 
    public.profiles p ON s.user_id = p.id
JOIN 
    public.lessons l ON s.lesson_id = l.id;
