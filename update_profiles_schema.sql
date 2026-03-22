-- 🌐 ACTUALIZACIÓN DE ESQUEMA: PERFILES DE IDIOMA 🌐
-- Ejecuta esto en tu SQL Editor de Supabase para añadir las columnas faltantes.

-- 1. Añadimos columnas de nivel e idioma al perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'A1',
ADD COLUMN IF NOT EXISTS learning_language TEXT DEFAULT 'English';

-- 2. Aseguramos que el trigger de nuevos usuarios también los incluya (opcional pero recomendado)
-- (Si ya ejecutaste fix_google_auth.sql, esto lo complementa)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role, level, learning_language)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New Student'),
    new.raw_user_meta_data->>'avatar_url',
    'student',
    'A1',
    'English'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  INSERT INTO public.user_progress (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;
-- 3. Políticas RLS para Administradores
-- Estas políticas permiten que cualquier usuario con rol 'admin' gestione todos los datos

-- Permisos en PROFILES
CREATE POLICY "Admins can do everything on profiles" 
ON public.profiles FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Permisos en USER_PROGRESS
CREATE POLICY "Admins can do everything on progress" 
ON public.user_progress FOR ALL 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Permisos en ASSIGNMENTS (para que el Admin pueda asignar lecciones)
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage assignments" ON public.assignments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can view own assignments" ON public.assignments FOR SELECT USING (auth.uid() = student_id);
