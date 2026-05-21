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
    <div className="flex flex-col h-full bg-surface border-l border-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <span className="text-xs font-mono text-text-muted">chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-text-dim text-xs font-mono text-center mt-8">
            say hi 👋
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.fromSelf ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                msg.fromSelf
                  ? 'bg-green text-base rounded-br-sm'
                  : 'bg-elevated text-text-primary rounded-bl-sm border border-border'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="type a message..."
          maxLength={500}
          className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-dim focus:outline-none focus:border-green transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-green text-base rounded-lg px-3 py-2 text-sm font-bold hover:bg-green-dim transition-colors disabled:opacity-30"
        >
          →
        </button>
      </form>
    </div>
  );
}
