'use client';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  }

  return (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-sm">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 pt-6 pb-4 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="w-10 h-10 rounded-full glass flex items-center justify-center text-xl">
              👋
            </div>
            <p className="text-white/30 text-sm text-center">
              Say hi to get the conversation started
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.fromSelf ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`max-w-[82%] px-3.5 py-2 text-sm leading-relaxed ${
                msg.fromSelf
                  ? 'bg-green text-white rounded-[18px] rounded-br-[5px]'
                  : 'glass text-white/90 rounded-[18px] rounded-bl-[5px]'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/[0.08]">
        {attachments.length > 0 && (
          <div className="px-3 pt-2.5 flex flex-wrap gap-1.5">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-white/60 max-w-[160px]">
                <span className="truncate">{f.name}</span>
                <button type="button" onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))} className="text-white/30 hover:text-white transition-colors shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="p-3 flex gap-2 items-center">
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={(e) => { setAttachments((a) => [...a, ...Array.from(e.target.files ?? [])]); if (fileRef.current) fileRef.current.value = ''; }} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-9 h-9 rounded-full glass flex items-center justify-center shrink-0 text-white/40 hover:text-white transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message…"
            maxLength={500}
            className="flex-1 glass rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/60 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() && attachments.length === 0}
            className="w-9 h-9 rounded-full bg-green flex items-center justify-center shrink-0 hover:bg-green-dim transition-all disabled:opacity-30 disabled:scale-95 active:scale-95"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
