import { useEffect, useState, useRef } from 'react';
import { ChatBubble, Attachment } from '../../components/shared/ChatBubble';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
    attachments?: Attachment[];
}

interface AdminProfile {
    id: string;
    full_name: string;
    avatar_url?: string;
}

export default function StudentMessages() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [admin, setAdmin] = useState<AdminProfile | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [tempAttachments, setTempAttachments] = useState<Attachment[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (!user) return;

        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Admin (the first one for now)
                const { data: adminData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('role', 'admin')
                    .limit(1)
                    .single();

                if (adminData) setAdmin(adminData);

                // 2. Fetch existing messages
                if (adminData) {
                    const { data: messagesData } = await supabase
                        .from('messages')
                        .select('*')
                        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${adminData.id}),and(sender_id.eq.${adminData.id},receiver_id.eq.${user.id})`)
                        .order('created_at', { ascending: true });

                    if (messagesData) {
                        setMessages(messagesData);
                        // Mark admin messages as read
                        markAsRead(adminData.id);
                    }
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
            } finally {
                setLoading(false);
                scrollToBottom();
            }
        };

        fetchInitialData();

        // 3. Subscription for real-time messages
        const messageChannel = supabase
            .channel('realtime:messages')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages'
            }, (payload) => {
                const newMsg = payload.new as Message;
                if ((newMsg.sender_id === user.id || newMsg.receiver_id === user.id)) {
                    setMessages((prev) => [...prev, newMsg]);
                    setTimeout(scrollToBottom, 50);
                    if (newMsg.sender_id !== user.id) {
                        markAsRead(newMsg.sender_id);
                    }
                }
            })
            .subscribe();

        // 4. Presence Channel
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
                        role: 'student',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(messageChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, [user]);

    const markAsRead = async (adminId: string) => {
        if (!user) return;
        try {
            await supabase
                .from('messages')
                .update({ is_read: true })
                .eq('sender_id', adminId)
                .eq('receiver_id', user.id)
                .eq('is_read', false);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

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
        e.target.value = '';
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && tempAttachments.length === 0) || !admin || !user) return;

        const messageData = {
            sender_id: user.id,
            receiver_id: admin.id,
            content: newMessage.trim(),
            attachments: tempAttachments
        };

        const { error } = await supabase
            .from('messages')
            .insert([messageData]);

        if (error) {
            console.error('Error sending message:', error);
            // Optionally restore message/attachments on error
            // setNewMessage(content);
            // setTempAttachments(attachments);
        } else {
            setNewMessage('');
            setTempAttachments([]);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-background-dark">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        {admin?.avatar_url ? (
                            <img
                                className="w-10 h-10 rounded-full bg-slate-200 object-cover"
                                alt="Admin profile"
                                src={admin.avatar_url}
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {admin?.full_name?.charAt(0) || 'A'}
                            </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold">{admin?.full_name || 'Admin'}</h2>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 ${admin && onlineUsers.has(admin.id) ? 'bg-green-500 animate-pulse' : 'bg-slate-300'} rounded-full`}></span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${admin && onlineUsers.has(admin.id) ? 'text-green-600' : 'text-slate-400'}`}>
                                {admin && onlineUsers.has(admin.id) ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full flex items-center gap-1.5 border border-green-500/20">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Live {onlineUsers.size}</span>
                </div>
            </header>

            {/* Messages Window */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar bg-slate-50/30">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2">
                        <span className="material-symbols-outlined text-4xl">chat_bubble_outline</span>
                        <p className="text-sm">No messages yet. Say hi!</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatBubble
                            key={msg.id}
                            isOwn={msg.sender_id === user?.id}
                            senderName={msg.sender_id === user?.id ? 'Me' : (admin?.full_name || 'Tutor')}
                            message={msg.content}
                            time={new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            avatarSrc={msg.sender_id !== user?.id ? admin?.avatar_url || undefined : undefined}
                            attachments={msg.attachments}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Redesigned to match Admin style */}
            <form onSubmit={handleSendMessage} className="p-8 shrink-0 bg-slate-50/50">
                <div className="max-w-4xl mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
                    <button 
                        type="button" 
                        disabled={uploading}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-primary transition-colors disabled:opacity-50"
                        onClick={() => document.getElementById('student-file-upload')?.click()}
                    >
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined">add_circle</span>
                        )}
                    </button>
                    <input id="student-file-upload" type="file" hidden multiple onChange={handleFileUpload} />
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
        </div>
    );
}

