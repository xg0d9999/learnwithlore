-- ==============================================================================
-- FIX FOR MISSING INSERT POLICY
-- ==============================================================================

-- When a new user logs in via Google for the first time, the frontend attempts 
-- to insert their profile automatically (auto-onboarding).
-- This requires an explicit INSERT policy in Supabase.

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- Just to be 100% sure: Ensure the Karima account is definitively an Admin
-- (Run this AFTER you log in once with Google so the initial profile exists)
-- ==============================================================================

UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'karimatounarti@gmail.com' 
  LIMIT 1
);
