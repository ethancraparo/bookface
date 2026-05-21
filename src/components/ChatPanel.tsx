'use client';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, onSend }: Props) {
  const [input, setInput] = useState('');
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
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
        <span className="text-sm font-medium text-white/70">Messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
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
      <form onSubmit={handleSend} className="p-3 border-t border-white/[0.08] flex gap-2 items-end">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message…"
          maxLength={500}
          className="flex-1 glass rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/60 transition-all resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="w-9 h-9 rounded-full bg-green flex items-center justify-center shrink-0 hover:bg-green-dim transition-all disabled:opacity-30 disabled:scale-95 active:scale-95"
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
