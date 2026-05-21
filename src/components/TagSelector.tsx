'use client';
import { INTEREST_TAGS } from '@/types';

interface Props {
  selected: string[];
  onChange: (tags: string[]) => void;
}

export default function TagSelector({ selected, onChange }: Props) {
  function toggle(tag: string) {
    onChange(
      selected.includes(tag)
        ? selected.filter((t) => t !== tag)
        : [...selected, tag]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {INTEREST_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-xs font-mono rounded-full px-3 py-1.5 border transition-all ${
              active
                ? 'bg-green/15 border-green/50 text-green font-semibold'
                : 'bg-white/[0.05] border-white/[0.1] text-white/50 hover:border-white/20 hover:text-white/80'
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
