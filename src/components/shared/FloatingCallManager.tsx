import React, { useState, useEffect, useRef } from 'react';
import { Phone, GripVertical, Maximize2, X, Minus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface ActiveEvent {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    student_name: string;
    student_id: string;
    meeting_link?: string;
}

export const FloatingCallManager: React.FC = () => {
    const { user, role } = useAuth();
    const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
    const [isWindowOpen, setIsWindowOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [useFallback, setUseFallback] = useState(false);
    const [fallbackUrl, setFallbackUrl] = useState('');
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const checkInterval = useRef<any>(null);

    // Zoom Credentials
    const ZOOM_CLIENT_ID = '93fulhdlTGudKk8sydDetA';
    const ZOOM_CLIENT_SECRET = 'd2M2eHuYF9MKhi5Hu15zW7hW0AxleJ2V';
    const GLOBAL_MEETING_ID = '4705375769'; // Your Personal Meeting ID

    useEffect(() => {
        if (!user) return;

        const checkActiveCall = async () => {
            const now = new Date();
            const bufferStart = new Date(now.getTime() + (30 * 60 * 1000)).toISOString();
            const bufferEnd = new Date(now.getTime() - (30 * 60 * 1000)).toISOString();
            
            try {
                if (role === 'admin') {
                    const { data } = await supabase
                        .from('calendar_events')
                        .select('*, student:profiles!student_id(full_name), meeting_link')
                        .eq('admin_id', user.id)
                        .lte('start_time', bufferStart)
                        .gte('end_time', bufferEnd)
                        .order('start_time', { ascending: true })
                        .limit(1)
                        .maybeSingle();
                    
                    if (data) {
                        setActiveEvent({
                            id: data.id,
                            title: data.session_goal || 'English Session',
                            start_time: data.start_time,
                            end_time: data.end_time,
                            student_name: data.student?.full_name || 'Student',
                            student_id: data.student_id,
                            meeting_link: data.meeting_link
                        });
                    } else {
                        setActiveEvent(null);
                    }
                } else {
                    const { data } = await supabase
                        .from('calendar_events')
                        .select('*, meeting_link')
                        .eq('student_id', user.id)
                        .eq('is_video_call', true)
                        .lte('start_time', bufferStart)
                        .gte('end_time', bufferEnd)
                        .order('start_time', { ascending: true })
                        .limit(1)
                        .maybeSingle();
                    
                    if (data) {
                        console.log('Student active session detected:', data.id);
                        setActiveEvent({
                            id: data.id,
                            title: data.session_goal || 'English Session',
                            start_time: data.start_time,
                            end_time: data.end_time,
                            student_name: 'Tutor',
                            student_id: user.id,
                            meeting_link: data.meeting_link
                        });
                    } else {
                        setActiveEvent(null);
                    }
                }
            } catch (err) {
                console.error('Error checking active call:', err);
            }
        };

        checkActiveCall();
        checkInterval.current = setInterval(checkActiveCall, 30000);

        return () => {
            if (checkInterval.current) clearInterval(checkInterval.current);
        };
    }, [user, role]);

    const extractMeetingId = (url: string): string => {
        if (!url) return '';
        const match = url.match(/\/j\/(\d+)/) || url.match(/\/s\/(\d+)/) || url.match(/wc\/join\/(\d+)/) || url.match(/(\d{9,11})/);
        return match ? match[1] : '';
    };

    const getDeterministicMeetingId = (uuid: string): string => {
        let hash = 0;
        for (let i = 0; i < uuid.length; i++) {
            const char = uuid.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return (Math.abs(hash) % 9000000000 + 1000000000).toString();
    };

    const generateSignature = async (meetingNumber: string, roleNum: number) => {
        const iat = Math.round(new Date().getTime() / 1000) - 30;
        const exp = iat + 60 * 60 * 2;
        
        const header = { alg: 'HS256', typ: 'JWT' };
        const payload = {
            sdkKey: ZOOM_CLIENT_ID,
            mn: meetingNumber,
            role: roleNum,
            iat: iat,
            exp: exp,
            tokenExp: exp
        };

        const sHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const sPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        const sBase = `${sHeader}.${sPayload}`;

        if (!window.crypto.subtle) {
            throw new Error('SECURE_CONTEXT_REQUIRED');
        }

        const encoder = new TextEncoder();
        const keyData = encoder.encode(ZOOM_CLIENT_SECRET);
        const baseData = encoder.encode(sBase);

        const cryptoKey = await window.crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await window.crypto.subtle.sign('HMAC', cryptoKey, baseData);
        const sSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
            .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

        return `${sBase}.${sSignature}`;
    };

    const handleJoin = async () => {
        if (!activeEvent) return;
        
        const ZoomMtgEmbedded = (window as any).ZoomMtgEmbedded;
        const userName = role === 'admin' ? 'Tutor' : (user as any).full_name || 'Student';
        
        let meetingNumber = extractMeetingId(activeEvent.meeting_link || '') || GLOBAL_MEETING_ID;
        
        console.log('--- Zoom Join Attempt ---');
        console.log('Meeting Link from DB:', activeEvent.meeting_link);
        console.log('Global ID used:', GLOBAL_MEETING_ID);
        console.log('Extracted / Final Meeting Number:', meetingNumber);

        if (!meetingNumber && activeEvent.student_id) {
            meetingNumber = getDeterministicMeetingId(activeEvent.student_id);
            console.log('Fallback: Using student-based deterministic ID:', meetingNumber);
        }

        try {
            if (!ZoomMtgEmbedded) throw new Error('SDK_NOT_LOADED');

            const signature = await generateSignature(meetingNumber, role === 'admin' ? 1 : 0);
            const client = ZoomMtgEmbedded.createClient();
            
            await client.init({
                zoomAppRoot: document.getElementById('zoom-embed-root')!,
                language: 'en-US',
                patchJsMedia: true,
                leaveUrl: window.location.origin
            });

            await client.join({
                sdkKey: ZOOM_CLIENT_ID,
                signature: signature,
                meetingNumber: meetingNumber,
                userName: userName,
                password: '',
            });

            setIsJoined(true);
        } catch (e: any) {
            console.error('Zoom Join Error, switching to fallback:', e);
            const zoomViewUrl = `https://zoom.us/wc/join/${meetingNumber}?prefer=1&un=${encodeURIComponent(userName)}`;
            setFallbackUrl(zoomViewUrl);
            setUseFallback(true);
            setIsJoined(true);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isMinimized || isMaximized) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || isMaximized) return;
            const newX = e.clientX - dragOffset.current.x;
            const newY = e.clientY - dragOffset.current.y;
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isMaximized]);

    if (!activeEvent) return null;

    const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const windowStyle: React.CSSProperties = isMaximized 
        ? { 
            left: '20px', 
            top: '20px', 
            width: 'calc(100vw - 40px)', 
            height: 'calc(100vh - 40px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        : { 
            left: position.x, 
            top: position.y, 
            width: '400px', 
            height: '500px',
            transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          };

    return (
        <>
            {!isWindowOpen && (
                <div className="fixed bottom-8 right-8 z-[200]">
                    <button
                        onClick={() => setIsWindowOpen(true)}
                        className="group relative flex items-center gap-4 bg-white dark:bg-slate-900 border-2 border-primary/20 p-2 pl-6 rounded-full shadow-2xl hover:border-primary transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <div className="flex flex-col items-start leading-none pr-4">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Active Call</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                                {formatTime(activeEvent.start_time)} - {activeEvent.student_name}
                            </span>
                        </div>
                        <div className="size-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                            <Phone size={20} fill="white" />
                        </div>
                        <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20 pointer-events-none" />
                    </button>
                </div>
            )}

            {isWindowOpen && !isMinimized && (
                <div 
                    className="fixed z-[300] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
                    style={windowStyle}
                >
                    <div onMouseDown={handleMouseDown} className="h-12 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing shrink-0">
                        <div className="flex gap-2">
                            <button onClick={() => setIsWindowOpen(false)} className="size-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:brightness-90 transition-all flex items-center justify-center group">
                                <X size={8} className="opacity-0 group-hover:opacity-100 text-red-900" />
                            </button>
                            <button onClick={() => { setIsMinimized(true); setIsMaximized(false); }} className="size-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] hover:brightness-90 transition-all flex items-center justify-center group">
                                <Minus size={8} className="opacity-0 group-hover:opacity-100 text-amber-900" />
                            </button>
                            <button onClick={() => setIsMaximized(!isMaximized)} className="size-3 rounded-full bg-[#27C93F] border border-[#1AAB29] hover:brightness-90 transition-all flex items-center justify-center group">
                                <Maximize2 size={8} className="opacity-0 group-hover:opacity-100 text-emerald-900" />
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">In Call</span>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight truncate px-4">{activeEvent.student_name}</span>
                        </div>
                        <GripVertical size={16} className="text-slate-300" />
                    </div>

                    <div className="flex-1 flex flex-col relative bg-slate-900 overflow-hidden">
                        <div 
                            id="zoom-embed-root" 
                            className={`absolute inset-0 z-0 ${(isJoined && !useFallback) ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        />

                        {isJoined && useFallback && (
                            <iframe
                                src={fallbackUrl}
                                className="absolute inset-0 w-full h-full border-none bg-black"
                                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write;"
                                sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
                            />
                        )}

                        {!isJoined && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-slate-900/90 backdrop-blur-sm">
                                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <Phone size={40} className="text-primary" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Ready to Join?</h3>
                                <div className="text-slate-400 text-sm mb-8 max-w-[280px]">
                                    Your session "{activeEvent.title}" is ready.
                                    {(!window.isSecureContext && !window.crypto.subtle) && (
                                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                            <p className="text-amber-500 text-[10px] font-bold uppercase mb-1">Non-Secure Context Detected</p>
                                            <p className="text-[9px] text-amber-500/80 leading-tight">
                                                Please use <b>http://localhost:3000</b> instead of your IP to enable the full Zoom SDK.
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleJoin}
                                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105"
                                >
                                    Enter Meeting
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-10 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center px-4 shrink-0">
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">● Live Recording Active</span>
                    </div>
                </div>
            )}

            {isWindowOpen && isMinimized && (
                <div className="fixed bottom-8 right-8 z-[200]">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="bg-amber-500 text-white p-4 rounded-3xl shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 border-amber-400"
                    >
                        <Maximize2 size={24} />
                    </button>
                </div>
            )}
        </>
    );
};
