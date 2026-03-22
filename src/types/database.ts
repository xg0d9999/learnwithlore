export type UserRole = 'admin' | 'student';

export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface UserProgress {
    id: string;
    user_id: string;
    total_xp: number;
    day_streak: number;
    words_learned_count: number;
    last_study_date: string | null;
    created_at: string;
}

export interface Appointment {
    id: string;
    student_id: string;
    tutor_id: string;
    start_time: string;
    end_time: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    meeting_link: string | null;
    created_at: string;
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
    };
}

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    attachments?: any[]; // Array of attachment objects
}

export interface Lesson {
    id: string;
    title: string;
    description: string | null;
    level: string;
    category: string;
    duration: string;
    image_url: string;
    created_at: string;
}
