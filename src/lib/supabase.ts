import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials are missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/**
 * Gets the correct redirect URL for OAuth.
 * Uses window.location.origin to ensure it works on both localhost
 * and when accessed via IP (192.168.1.31) on the local network.
 */
export const getRedirectUrl = (path: string = '/student/dashboard') => {
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const origin = window.location.origin;
    console.log(`[Supabase] Generated redirect URL: ${origin}${cleanPath}`);
    return `${origin}${cleanPath}`;
};
