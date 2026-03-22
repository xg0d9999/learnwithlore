import { useEffect, useState, useRef } from 'react';
import { ChatBubble, Attachment } from '../../components/shared/ChatBubble';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface StudentProfile {
    id: string;
    full_name: string;
    avatar_url?: string;
    last_message?: string;
    last_message_time?: string;
    unread_count?: number;
}

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    attachments?: Attachment[];
}

export default function AdminMessaging() {
    const { user } = useAuth();
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [uploading, setUploading] = useState(false);
    const [tempAttachments, setTempAttachments] = useState<Attachment[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 1. Fetch Students with unread counts and last messages
    const fetchStudents = async () => {
        try {
            // Fetch students
            const { data: profiles, error: fetchError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('role', 'student');

            if (fetchError) throw fetchError;
            if (!profiles) return;

            // Fetch last messages and unread counts for each student
            const studentsWithData = await Promise.all(profiles.map(async (student) => {
                // Get last message
                const { data: lastMsg } = await supabase
                    .from('messages')
                    .select('content, created_at')
                    .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${student.id}),and(sender_id.eq.${student.id},receiver_id.eq.${user?.id})`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Get unread count
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('sender_id', student.id)
                    .eq('receiver_id', user?.id)
                    .eq('is_read', false);

                return {
                    ...student,
                    last_message: lastMsg?.content,
                    last_message_time: lastMsg?.created_at,
                    unread_count: count || 0
                };
            }));

            // Sort students by last message time
            const sortedStudents = studentsWithData.sort((a, b) => {
                const timeA = a.last_message_time ? new Date(a.last_message_time).getTime() : 0;
                const timeB = b.last_message_time ? new Date(b.last_message_time).getTime() : 0;
                return timeB - timeA;
            });

            setStudents(sortedStudents);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchStudents();
    }, [user]);

    // 2. Global Subscription for Messages & Presence
    useEffect(() => {
        if (!user) return;

        const globalChannel = supabase
            .channel('global_chat_updates')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const newMsg = payload.new as Message;
                if (newMsg.receiver_id === user.id || newMsg.sender_id === user.id) {
                    fetchStudents();
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const msg = payload.new as Message;
                if (msg.receiver_id === user.id || msg.sender_id === user.id) {
                    fetchStudents();
                }
            })
            .subscribe();

        // Presence Channel
        const presenceChannel = supabase.channel('online_presence', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const onlineIds = new Set<string>();
                Object.values(state).forEach((presences: any) => {
                    presences.forEach((p: any) => onlineIds.add(p.id));
                });
                setOnlineUsers(onlineIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        id: user.id,
                        user_id: user.id,
                        role: 'admin',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(globalChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, [user]);

    // 3. Mark messages as read function
    const markAsRead = async (studentId: string) => {
        if (!user) return;
        try {
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('sender_id', studentId)
                .eq('receiver_id', user.id)
                .eq('is_read', false);
            
            // Local update to avoid waiting for fetch
            setStudents(prev => prev.map(s => 
                s.id === studentId ? { ...s, unread_count: 0 } : s
            ));
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    // 4. Fetch Messages and Mark as Read when selecting a student
    useEffect(() => {
        if (!selectedStudent || !user) return;

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${selectedStudent.id}),and(sender_id.eq.${selectedStudent.id},receiver_id.eq.${user.id})`)
                .order('created_at', { ascending: true });

            if (data) setMessages(data);
            setTimeout(scrollToBottom, 100);
            
            // Mark as read when opening conversation
            markAsRead(selectedStudent.id);
        };

        fetchMessages();

        // Subscription for current conversation
        const channel = supabase
            .channel(`admin_chat:${selectedStudent.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const msg = payload.new as Message;
                if (
                    (msg.sender_id === selectedStudent.id && msg.receiver_id === user.id) ||
                    (msg.sender_id === user.id && msg.receiver_id === selectedStudent.id)
                ) {
                    setMessages((prev) => [...prev, msg]);
                    setTimeout(scrollToBottom, 50);
                    
                    // If we receive a message from the active student, mark it as read
                    if (msg.sender_id === selectedStudent.id) {
                        markAsRead(selectedStudent.id);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedStudent, user]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const newAttachments: Attachment[] = [];

        for (const file of Array.from(files)) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `chat/${user?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-attachments')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Error uploading file:', uploadError);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('chat-attachments')
                .getPublicUrl(filePath);

            let type: Attachment['type'] = 'document';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            newAttachments.push({
                name: file.name,
                url: publicUrl,
                type,
                size: file.size
            });
        }

        setTempAttachments(prev => [...prev, ...newAttachments]);
        setUploading(false);
        // Clear input
        e.target.value = '';
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && tempAttachments.length === 0) || !selectedStudent || !user) return;

        const messageData = {
            sender_id: user.id,
            receiver_id: selectedStudent.id,
            content: newMessage.trim(),
            attachments: tempAttachments
        };

        const { error } = await supabase
            .from('messages')
            .insert([messageData]);

        if (error) {
            console.error('Error sending message:', error);
        } else {
            setNewMessage('');
            setTempAttachments([]);
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-65px)] overflow-hidden font-display">
            {/* Student List Panel */}
            <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Messages</h2>
                        <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full flex items-center gap-1.5 border border-green-500/20">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[11px] font-bold uppercase tracking-wider">Live {onlineUsers.size}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-slate-900"
                            placeholder="Search students..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredStudents.map((student) => (
                        <div
                            key={student.id}
                            onClick={() => setSelectedStudent(student)}
                            className={`flex items-center gap-3 px-6 py-4 cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-slate-50'}`}
                        >
                            <div className="relative shrink-0">
                                {student.avatar_url ? (
                                    <img className="w-12 h-12 rounded-full object-cover" src={student.avatar_url} alt={student.full_name} />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {student.full_name.charAt(0)}
                                    </div>
                                )}
                                {onlineUsers.has(student.id) && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <h3 className="font-semibold text-sm truncate text-slate-900">{student.full_name}</h3>
                                        {onlineUsers.has(student.id) && (
                                            <span className="flex h-2 w-2 relative shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    {student.last_message_time && (
                                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                            {new Date(student.last_message_time).toLocaleDateString() === new Date().toLocaleDateString()
                                                ? new Date(student.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(student.last_message_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs truncate ${student.unread_count && student.unread_count > 0 ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                                        {student.last_message || 'No messages yet'}
                                    </p>
                                    {student.unread_count && student.unread_count > 0 && (
                                        <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {student.unread_count}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Conversation Panel */}
            <section className="flex-1 flex flex-col bg-slate-50">
                {selectedStudent ? (
                    <>
                        {/* Header */}
                        <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                                    {selectedStudent.avatar_url ? (
                                        <img className="w-full h-full object-cover" src={selectedStudent.avatar_url} alt={selectedStudent.full_name} />
                                    ) : (
                                        <span className="text-primary font-bold">{selectedStudent.full_name.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-900">{selectedStudent.full_name}</h2>
                                        {onlineUsers.has(selectedStudent.id) && (
                                            <span className="flex h-2.5 w-2.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 leading-none mt-0.5">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                                            {onlineUsers.has(selectedStudent.id) ? (
                                                <span className="text-green-600">Online Now</span>
                                            ) : (
                                                <span>Offline</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <span className="material-symbols-outlined text-4xl">chat_bubble_outline</span>
                                    <p className="text-sm">No messages yet. Send a welcome message!</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <ChatBubble
                                        key={msg.id}
                                        isOwn={msg.sender_id === user?.id}
                                        senderName={msg.sender_id === user?.id ? 'Me' : selectedStudent.full_name}
                                        message={msg.content}
                                        time={new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        avatarSrc={msg.sender_id !== user?.id ? selectedStudent.avatar_url : undefined}
                                        attachments={msg.attachments}
                                        statusIcon={
                                            msg.sender_id === user?.id && (
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {msg.is_read ? 'done_all' : 'done'}
                                                </span>
                                            )
                                        }
                                    />
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area - Redesigned */}
                        <form onSubmit={handleSendMessage} className="p-8 shrink-0 bg-slate-50/50">
                            <div className="max-w-4xl mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                                <button 
                                    type="button" 
                                    disabled={uploading}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-primary transition-colors disabled:opacity-50"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                >
                                    {uploading ? (
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span className="material-symbols-outlined">add_circle</span>
                                    )}
                                </button>
                                <input id="file-upload" type="file" hidden multiple onChange={handleFileUpload} />
                                <div className="flex-1 flex flex-col">
                                    {tempAttachments.length > 0 && (
                                        <div className="flex gap-2 p-2 border-b border-slate-50 overflow-x-auto">
                                            {tempAttachments.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 shrink-0">
                                                    <span className="material-symbols-outlined text-xs text-primary">
                                                        {f.type === 'document' ? 'description' : f.type === 'image' ? 'image' : 'media_output'}
                                                    </span>
                                                    <span className="text-[10px] truncate max-w-[80px]">{f.name}</span>
                                                    <button type="button" onClick={() => setTempAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                                                        <span className="material-symbols-outlined text-[10px] text-slate-400 hover:text-red-500">close</span>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <input
                                        className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm py-2 text-slate-700 dark:text-slate-200 placeholder-slate-400"
                                        placeholder={uploading ? "Uploading files..." : "Type your message..."}
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        disabled={uploading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-primary hover:bg-primary/90 text-white px-5 h-10 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="text-sm font-bold">Send</span>
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                </button>
                            </div>
                            <div className="mt-3 flex justify-center">
                                <p className="text-[10px] text-slate-400 font-medium">Press Enter to send message</p>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-5xl opacity-20">forum</span>
                        </div>
                        <p className="font-medium">Select a student to start chatting</p>
                    </div>
                )}
            </section>
        </div>
    );
}

