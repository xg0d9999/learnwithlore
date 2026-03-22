import { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'student' | null | undefined; // Added undefined for initial state

export interface AuthContextType {
    user: User | null;
    role: UserRole;
    loading: boolean;
    error: { message: string; description?: string } | null;
    signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
