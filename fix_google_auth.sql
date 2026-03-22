-- 🚨 SOLUCIÓN DEFINITIVA: BORRADO DE TRIGGERS 🚨
-- El error "Scan error" ocurre porque Supabase no se lleva bien con los triggers en la tabla auth.users.
-- Como ya hemos programado la web para que cree tu perfil automáticamente, ya NO necesitamos estos triggers.

-- 1. Borramos CUALQUIER trigger que pueda estar estorbando en la tabla de usuarios de Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS create_profile_after_signup ON auth.users;

-- 2. (Opcional) Borramos la función para dejar la base de datos limpia
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Verificación final: No debería aparecer ningún trigger "custom" en esta lista
SELECT tgname AS nombre_trigger
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;

-- 4. 🔑 UPGRADE MANUAL (Usa esto si ya entraste una vez y te puso como 'student')
-- Sustituye 'TU_EMAIL@gmail.com' por tu correo real de Google
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'TU_EMAIL@gmail.com'
);
