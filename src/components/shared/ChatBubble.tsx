import { ReactNode, useState } from 'react';
import { Avatar } from '../ui/Avatar';
import { MediaModal } from './MediaModal';

export interface Attachment {
    name: string;
    url: string;
    type: 'image' | 'video' | 'audio' | 'document';
    size?: number;
}

interface ChatBubbleProps {
    message: string;
    senderName?: string;
    time: string;
    isOwn?: boolean;
    avatarSrc?: string;
    attachments?: Attachment[];
    statusIcon?: ReactNode;
}

export function ChatBubble({
    message,
    senderName,
    time,
    isOwn = false,
    avatarSrc,
    attachments,
    statusIcon,
}: ChatBubbleProps) {
    const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

    return (
        <div className={`flex gap-4 animate-ios-pop ${isOwn ? 'flex-row-reverse' : ''}`}>
            <Avatar src={avatarSrc} fallbackInitials={senderName?.charAt(0) || 'U'} />
            <div className={`flex flex-col gap-1 max-w-[80%] ${isOwn ? 'items-end' : ''}`}>
                <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {isOwn ? 'You' : senderName}
                    </span>
                    {time && <span className="text-xs text-slate-400">{time}</span>}
                </div>

                <div
                    className={`px-4 py-2 rounded-2xl w-fit max-w-md ${isOwn
                            ? 'bg-primary text-white rounded-tr-sm'
                            : 'bg-white dark:bg-card-dark text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-sm shadow-sm'
                        }`}
                >
                    {message && <p className="leading-relaxed whitespace-pre-wrap mb-2">{message}</p>}
                    
                    {attachments && attachments.length > 0 && (
                        <div className="flex flex-col gap-3 mt-2">
                            {attachments.map((file, idx) => (
                                <div key={idx} className="overflow-hidden rounded-lg">
                                    {file.type === 'image' && (
                                        <div className="relative group cursor-pointer" onClick={() => setSelectedAttachment(file)}>
                                            <img src={file.url} alt={file.name} className="max-w-full h-auto rounded-lg hover:opacity-95 transition-all" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-lg">
                                                <span className="material-symbols-outlined text-white text-[32px] drop-shadow-lg">zoom_in</span>
                                            </div>
                                        </div>
                                    )}
                                    {file.type === 'video' && (
                                        <div className="relative">
                                            <video src={file.url} controls className="max-w-full rounded-lg shadow-sm" />
                                            <button 
                                                onClick={() => setSelectedAttachment(file)}
                                                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all z-10"
                                                title="Ver en grande"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                                            </button>
                                        </div>
                                    )}
                                    {file.type === 'audio' && (
                                        <div className="relative flex items-center gap-2">
                                            <audio src={file.url} controls className="w-full max-w-[240px]" />
                                            <button 
                                                onClick={() => setSelectedAttachment(file)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shrink-0"
                                                title="Ver en grande"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                                            </button>
                                        </div>
                                    )}
                                    {file.type === 'document' && (
                                        <div 
                                            onClick={() => setSelectedAttachment(file)}
                                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-100 dark:border-slate-700 cursor-pointer group"
                                        >
                                            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                                                {file.url.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate text-slate-700 dark:text-slate-200">{file.name}</p>
                                                {file.size && <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                                            </div>
                                            <span className="material-symbols-outlined text-slate-400 text-sm group-hover:text-primary">visibility</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isOwn && statusIcon && (
                    <div className="flex items-center mt-1 text-primary">
                        {statusIcon}
                    </div>
                )}
            </div>

            {selectedAttachment && (
                <MediaModal 
                    isOpen={!!selectedAttachment} 
                    onClose={() => setSelectedAttachment(null)} 
                    attachment={selectedAttachment} 
                />
            )}
        </div>
    );
}
