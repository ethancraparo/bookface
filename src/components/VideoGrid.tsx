'use client';
import { useEffect, useRef, useState } from 'react';

const SIZES = [
  { w: 240, h: 160 },
  { w: 360, h: 240 },
  { w: 480, h: 320 },
];
const MARGIN = 12;

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoOff: boolean;
  isAudioMuted: boolean;
  isScreenSharing?: boolean;
}

export default function VideoGrid({ localStream, remoteStream, isVideoOff, isAudioMuted, isScreenSharing }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [sizeIdx, setSizeIdx] = useState(0);
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const PIP_W = SIZES[sizeIdx].w;
  const PIP_H = SIZES[sizeIdx].h;

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Clamp position when size changes
  useEffect(() => {
    if (!pipPos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPipPos({
      x: Math.max(MARGIN, Math.min(rect.width - PIP_W - MARGIN, pipPos.x)),
      y: Math.max(MARGIN, Math.min(rect.height - PIP_H - MARGIN, pipPos.y)),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizeIdx]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !containerRef.current) return;
      didDrag.current = true;
      const rect = containerRef.current.getBoundingClientRect();
      setPipPos({
        x: Math.max(MARGIN, Math.min(rect.width - PIP_W - MARGIN, e.clientX - rect.left - dragOffset.current.x)),
        y: Math.max(MARGIN, Math.min(rect.height - PIP_H - MARGIN, e.clientY - rect.top - dragOffset.current.y)),
      });
    }
    function onMouseUp() { isDragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [PIP_W, PIP_H]);

  function handlePipMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const pRect = e.currentTarget.getBoundingClientRect();
    setPipPos({ x: pRect.left - cRect.left, y: pRect.top - cRect.top });
    isDragging.current = true;
    didDrag.current = false;
    dragOffset.current = { x: e.clientX - pRect.left, y: e.clientY - pRect.top };
    e.preventDefault();
  }

  const pipStyle: React.CSSProperties = pipPos
    ? { left: pipPos.x, top: pipPos.y, width: PIP_W, height: PIP_H }
    : { right: MARGIN, bottom: MARGIN, width: PIP_W, height: PIP_H };

  return (
    <div ref={containerRef} className="relative flex-1 bg-black rounded-xl overflow-hidden select-none">
      {/* Remote video */}
      {remoteStream ? (
        <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-elevated">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-surface border border-border mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <p className="text-text-muted text-sm font-mono">connecting...</p>
          </div>
        </div>
      )}

      {/* Local video — draggable PiP */}
      <div
        onMouseDown={handlePipMouseDown}
        style={pipStyle}
        className="absolute rounded-lg overflow-hidden border-2 border-border shadow-xl bg-surface cursor-grab active:cursor-grabbing group"
      >
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1]${isVideoOff || !localStream ? ' hidden' : ''}`}
        />
        {(isVideoOff || !localStream) && (
          <div className="absolute inset-0 flex items-center justify-center bg-elevated">
            <span className="text-2xl">🚫</span>
          </div>
        )}
        {isScreenSharing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="text-xs font-mono text-green bg-black/70 px-2 py-1 rounded">screen</span>
          </div>
        )}

        {/* Expand button — cycles through sizes */}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setSizeIdx((i) => (i + 1) % SIZES.length)}
          className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          title={sizeIdx === SIZES.length - 1 ? 'shrink' : 'expand'}
        >
          {sizeIdx === SIZES.length - 1 ? '–' : '+'}
        </button>

        <div className="absolute bottom-1 left-1 flex gap-1">
          {isAudioMuted && (
            <span className="bg-danger rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">🔇</span>
          )}
        </div>
      </div>
    </div>
  );
}
