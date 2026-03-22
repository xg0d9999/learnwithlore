import React from 'react';
import { createPortal } from 'react-dom';
import { Attachment } from './ChatBubble';

interface MediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    attachment: Attachment;
}

export function MediaModal({ isOpen, onClose, attachment }: MediaModalProps) {
    if (!isOpen) return null;

    const isPdf = attachment.url.toLowerCase().endsWith('.pdf') || attachment.name.toLowerCase().endsWith('.pdf');

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const link = document.createElement('a');
            link.href = attachment.url;
            link.setAttribute('download', attachment.name);
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading file:', error);
            window.open(attachment.url, '_blank');
        }
    };

    const modalContent = (
        <div 
            className="fixed inset-0 z-[10000] bg-black/98 backdrop-blur-3xl animate-fade-in flex flex-col items-center justify-start overflow-hidden pt-4 md:pt-6"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            onClick={onClose}
        >
            {/* Background click area */}
            <div className="absolute inset-0 z-0" onClick={onClose} />

            {/* Close Button - Maximized Visibility */}
            <button 
                className="absolute top-6 right-6 w-16 h-16 flex items-center justify-center rounded-full bg-white text-black shadow-2xl hover:bg-slate-100 transition-all z-[10010] active:scale-90 pointer-events-auto border-4 border-black/20"
                onClick={onClose}
                title="Cerrar"
            >
                <span className="material-symbols-outlined text-[40px] font-bold">close</span>
            </button>

            {/* Content Area - Top Aligned and Maximized */}
            <div 
                className="z-[10005] w-full h-[96vh] flex flex-col items-center justify-start pointer-events-none"
                onClick={e => e.stopPropagation()}
            >
                <div className="w-full max-w-[98vw] h-full flex flex-col items-center justify-start pointer-events-auto px-1 md:px-2">
                    {isPdf ? (
                        <div className="w-full h-[92vh] bg-black p-0.5 md:p-1 rounded-xl shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col items-center border border-white/40">
                            <iframe 
                                src={`${attachment.url}#toolbar=0`}
                                className="w-full h-full bg-white border-none rounded-lg"
                                title={attachment.name}
                            />
                        </div>
                    ) : attachment.type === 'image' ? (
                        <div className="bg-black p-1 md:p-2 rounded-2xl shadow-2xl border border-white/20">
                            <img 
                                src={attachment.url} 
                                alt={attachment.name} 
                                className="max-w-[98vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-inner"
                            />
                        </div>
                    ) : attachment.type === 'video' ? (
                        <div className="bg-black p-1 md:p-2 rounded-2xl shadow-2xl border border-white/10">
                            <video 
                                src={attachment.url} 
                                controls 
                                autoPlay 
                                className="max-w-[98vw] max-h-[88vh] rounded-lg" 
                            />
                        </div>
                    ) : (
                        <div className="bg-black/60 mt-20 p-12 rounded-3xl border border-white/20 flex flex-col items-center gap-8 animate-ios-pop backdrop-blur-md">
                            <span className="material-symbols-outlined text-[100px] text-white">
                                {attachment.type === 'audio' ? 'audiotrack' : 'description'}
                            </span>
                            {attachment.type === 'audio' ? (
                                <audio src={attachment.url} controls className="w-[360px]" />
                            ) : (
                                <p className="text-white text-2xl font-bold">{attachment.name}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Bar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full max-w-lg px-6 pointer-events-none animate-fade-in z-[10010]">
                <div className="bg-black/95 backdrop-blur-3xl px-6 py-3.5 rounded-[32px] border border-white/20 flex items-center gap-6 pointer-events-auto shadow-2xl">
                    <div className="flex flex-col min-w-0">
                        <p className="text-white font-bold truncate text-base">{attachment.name}</p>
                        {attachment.size && (
                            <p className="text-slate-400 text-xs">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleDownload}
                        className="bg-white text-black hover:bg-slate-200 px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shrink-0 shadow-lg text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                        <span>Descargar</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
