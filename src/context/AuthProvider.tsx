import { useEffect, useState, ReactNode, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext, UserRole } from './AuthContext';

const ROLE_CACHE_KEY = 'lwl_user_role';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<UserRole>(() => {
        const cached = localStorage.getItem(ROLE_CACHE_KEY);
        return (cached as UserRole) || undefined;
    });

    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<{ message: string; description?: string } | null>(null);

    const stateRef = useRef({
        userId: null as string | null,
        isMounted: true,
        isFetching: false
    });

    const syncProfile = async (userId: string, userMetadata?: any, retryCount = 0) => {
        if (stateRef.current.isFetching && retryCount === 0) return;
        stateRef.current.isFetching = true;

        console.log(`[Auth] Syncing profile for ${userId} (Attempt ${retryCount + 1})...`);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('[Auth] Sync failed:', error);
                // Non-critical error, let it fall through to potential insert/upsert
            }

            if (data) {
                console.log(`[Auth] Profile synced. Role: ${data.role}`);
                const newRole = data.role as UserRole;
                setRole(newRole);
                localStorage.setItem(ROLE_CACHE_KEY, (newRole as string) || '');
            } else if (retryCount < 2) {
                // Potential race condition with DB triggers, wait and retry once
                console.log(`[Auth] Profile not found, retrying in 1s...`);
                await new Promise(r => setTimeout(r, 1000));
                stateRef.current.isFetching = false; // Reset for retry
                return syncProfile(userId, userMetadata, retryCount + 1);
            } else {
                // AUTO-ONBOARDING: Profile missing after retries, let's create it
                console.log('[Auth] Profile still missing. Initiating context-aware onboarding...');

                // Infer role from URL (default to student)
                const isAtAdminPath = window.location.pathname.startsWith('/admin');
                const defaultRole: UserRole = isAtAdminPath ? 'admin' : 'student';

                console.log(`[Auth] Inferred role: ${defaultRole} (Path: ${window.location.pathname})`);

                const { error: upsertError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        role: defaultRole,
                        full_name: userMetadata?.full_name || userMetadata?.name || 'New Student',
                        avatar_url: userMetadata?.avatar_url || userMetadata?.picture || null
                    }, { onConflict: 'id' });

                if (upsertError) {
                    console.error('[Auth] Upsert failed critially:', upsertError);
                    // Check if it's already fixed but we couldn't select it?
                    setRole(null);
                    localStorage.removeItem(ROLE_CACHE_KEY);
                }
                else {
                    console.log(`[Auth] Profile upserted successfully as ${defaultRole}.`);

                    // Create progress record if student
                    if (defaultRole === 'student') {
                        await supabase.from('user_progress').upsert({ user_id: userId }, { onConflict: 'user_id' });
                    }

                    setRole(defaultRole);
                    localStorage.setItem(ROLE_CACHE_KEY, defaultRole as string);
                }
            }
        } catch (err) {
            console.error('[Auth] Unexpected sync error:', err);
        } finally {
            if (stateRef.current.isMounted && retryCount === 0) {
                setLoading(false);
                stateRef.current.isFetching = false;
            }
        }
    };

    useEffect(() => {
        stateRef.current.isMounted = true;

        const init = async () => {
            const params = new URLSearchParams(window.location.search);
            const error = params.get('error');
            const errorDesc = params.get('error_description');

            if (error) {
                console.error('[Auth] Server side auth error detected:', error, errorDesc);
                setAuthError({ message: error, description: errorDesc || undefined });

                if (errorDesc?.includes('Scan error') || errorDesc?.includes('converting NULL to string')) {
                    console.warn('[Auth] CRITICAL: This is a known Supabase database trigger bug. Please run the fix_google_auth.sql script in your SQL Editor.');
                }
            }

            console.log('[Auth] Initializing session state...', {
                url: window.location.href,
                hasHash: !!window.location.hash || window.location.href.includes('#'),
                pathname: window.location.pathname
            });

            try {
                // If we have an error, getSession might not behave as expected
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('[Auth] getSession error:', sessionError);
                }

                if (!stateRef.current.isMounted) return;

                if (session?.user) {
                    setUser(session.user);
                    stateRef.current.userId = session.user.id;

                    const cachedRole = localStorage.getItem(ROLE_CACHE_KEY);
                    const isAtAdminPath = window.location.pathname.startsWith('/admin');
                    const hasAuthHash = window.location.hash.includes('access_token');

                    // FORCE SYNC if we are at an admin path or just returned from OAuth
                    // This prevents using a stale 'student' cache when logging into admin
                    if (cachedRole && !isAtAdminPath && !hasAuthHash) {
                        console.log('[Auth] Cached role found, releasing UI lock.');
                        setRole(cachedRole as UserRole);
                        setLoading(false);
                        syncProfile(session.user.id, session.user.user_metadata);
                    } else {
                        console.log('[Auth] Forcing fresh sync (Admin path or New Login)...');
                        await syncProfile(session.user.id, session.user.user_metadata);
                    }
                } else {
                    console.log('[Auth] No session found.');
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                    localStorage.removeItem(ROLE_CACHE_KEY);
                }
            } catch (err) {
                console.error('[Auth] Init error:', err);
                setLoading(false);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[Auth] Event: ${event}`);
            if (!stateRef.current.isMounted) return;

            if (session?.user) {
                setUser(session.user);
                if (session.user.id !== stateRef.current.userId || event === 'SIGNED_IN') {
                    if (event === 'SIGNED_IN') {
                        import('../utils/activityLogger').then(({ logUserActivity }) => {
                            logUserActivity(session.user.id, 'auth', 'Successful Login');
                        });
                    }
                    stateRef.current.userId = session.user.id;
                    syncProfile(session.user.id, session.user.user_metadata);
                }
            } else {
                console.log('[Auth] Signed Out');
                setUser(null);
                setRole(null);
                setLoading(false);
                stateRef.current.userId = null;
                localStorage.removeItem(ROLE_CACHE_KEY);
            }
        });

        return () => {
            stateRef.current.isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        localStorage.removeItem(ROLE_CACHE_KEY);
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, error: authError, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
