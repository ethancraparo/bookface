'use client';
import { useEffect, useRef, useState } from 'react';

const ASPECT    = 16 / 9;
const MIN_W     = 120;
const MARGIN    = 10;
const DEFAULT_W = 160;
const DEFAULT_H = Math.round(DEFAULT_W / ASPECT);

type Corner = 'tl' | 'tr' | 'bl' | 'br';

interface Props {
  localStream:      MediaStream | null;
  remoteStreams:    MediaStream[];
  isVideoOff:       boolean;
  isAudioMuted:     boolean;
  isScreenSharing?: boolean;
}

// ── Remote video tile — self-contained, tracks wide-screen state ─────────────

function RemoteVideoTile({ stream }: { stream: MediaStream }) {
  const ref     = useRef<HTMLVideoElement>(null);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    const vid = ref.current;
    const onMeta = () => {
      if (vid.videoWidth && vid.videoHeight) setIsWide(vid.videoWidth / vid.videoHeight > 1.9);
    };
    vid.addEventListener('loadedmetadata', onMeta);
    stream.getVideoTracks().forEach((t) => t.addEventListener('ended', () => setIsWide(false)));
    return () => vid.removeEventListener('loadedmetadata', onMeta);
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className={`w-full h-full ${isWide ? 'object-contain bg-black' : 'object-cover'}`}
    />
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function VideoGrid({
  localStream,
  remoteStreams,
  isVideoOff,
  isAudioMuted,
  isScreenSharing,
}: Props) {
  const localRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pipPos,  setPipPos]  = useState<{ x: number; y: number } | null>(null);
  const [pipSize, setPipSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });

  // Keep refs in sync so mouse handlers have fresh values without re-registering
  const pipPosRef  = useRef(pipPos);
  const pipSizeRef = useRef(pipSize);
  pipPosRef.current  = pipPos;
  pipSizeRef.current = pipSize;

  // Drag state
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Resize state
  const isResizing   = useRef(false);
  const resizeCorner = useRef<Corner | null>(null);
  const resizeStart  = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    if (localRef.current && localStream) localRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (isDragging.current) {
        const { w, h } = pipSizeRef.current;
        setPipPos({
          x: Math.max(MARGIN, Math.min(rect.width  - w - MARGIN, e.clientX - rect.left - dragOffset.current.x)),
          y: Math.max(MARGIN, Math.min(rect.height - h - MARGIN, e.clientY - rect.top  - dragOffset.current.y)),
        });
      }

      if (isResizing.current && resizeCorner.current) {
        const { mouseX, x: sx, y: sy, w: sw, h: sh } = resizeStart.current;
        const corner = resizeCorner.current;
        const dx     = e.clientX - mouseX;
        const maxW   = rect.width * 0.6;

        let newW: number, newX: number, newY: number;

        if (corner === 'br' || corner === 'tr') {
          newW = Math.max(MIN_W, Math.min(maxW, sw + dx));
          newX = sx;
        } else {
          newW = Math.max(MIN_W, Math.min(maxW, sw - dx));
          newX = sx + sw - newW;
        }

        const newH = newW / ASPECT;

        if (corner === 'br' || corner === 'bl') {
          newY = sy;
        } else {
          newY = sy + sh - newH;
        }

        newX = Math.max(MARGIN, Math.min(rect.width  - newW - MARGIN, newX));
        newY = Math.max(MARGIN, Math.min(rect.height - newH - MARGIN, newY));

        setPipSize({ w: Math.round(newW), h: Math.round(newH) });
        setPipPos({ x: newX, y: newY });
      }
    }

    function onMouseUp() {
      isDragging.current   = false;
      isResizing.current   = false;
      resizeCorner.current = null;
      document.body.style.cursor = '';
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  function handlePipMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const pRect = e.currentTarget.getBoundingClientRect();
    setPipPos({ x: pRect.left - cRect.left, y: pRect.top - cRect.top });
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - pRect.left, y: e.clientY - pRect.top };
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function handleCornerMouseDown(corner: Corner, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const pRect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
    isResizing.current   = true;
    resizeCorner.current = corner;
    resizeStart.current  = {
      mouseX: e.clientX, mouseY: e.clientY,
      x: pRect.left - cRect.left, y: pRect.top - cRect.top,
      w: pRect.width,              h: pRect.height,
    };
    setPipPos({ x: pRect.left - cRect.left, y: pRect.top - cRect.top });
    const cursors: Record<Corner, string> = { tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize' };
    document.body.style.cursor = cursors[corner];
  }

  const pipStyle: React.CSSProperties = pipPos
    ? { left: pipPos.x,  top:    pipPos.y,    width: pipSize.w, height: pipSize.h }
    : { right: MARGIN,   bottom: MARGIN,       width: pipSize.w, height: pipSize.h };

  const corners: { corner: Corner; pos: string; cursor: string }[] = [
    { corner: 'tl', pos: 'top-0 left-0',     cursor: 'cursor-nw-resize' },
    { corner: 'tr', pos: 'top-0 right-0',    cursor: 'cursor-ne-resize' },
    { corner: 'bl', pos: 'bottom-0 left-0',  cursor: 'cursor-sw-resize' },
    { corner: 'br', pos: 'bottom-0 right-0', cursor: 'cursor-se-resize' },
  ];

  const remoteCount = remoteStreams.length;

  return (
    <div ref={containerRef} className="relative flex-1 bg-black rounded-xl overflow-hidden select-none">

      {/* ── Remote video area ── */}
      {remoteCount === 0 && (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full glass mx-auto flex items-center justify-center text-2xl">👤</div>
            <p className="text-white/30 text-sm">Connecting…</p>
          </div>
        </div>
      )}

      {remoteCount === 1 && (
        <div className="w-full h-full">
          <RemoteVideoTile stream={remoteStreams[0]} />
        </div>
      )}

      {remoteCount >= 2 && (
        <div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black/40">
          {remoteStreams.map((stream, i) => (
            <div
              key={i}
              className={`relative overflow-hidden bg-black ${
                remoteCount === 3 && i === 2 ? 'col-span-2' : ''
              }`}
            >
              <RemoteVideoTile stream={stream} />
            </div>
          ))}
        </div>
      )}

      {/* ── Local video — draggable + resizable PiP ── */}
      <div
        onMouseDown={handlePipMouseDown}
        style={pipStyle}
        className="absolute rounded-2xl overflow-hidden border border-white/20 shadow-glass bg-black cursor-grab active:cursor-grabbing"
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
        {isAudioMuted && (
          <div className="absolute bottom-1 left-1">
            <span className="bg-danger rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">🔇</span>
          </div>
        )}

        {/* Corner resize handles — invisible hit-targets only */}
        {corners.map(({ corner, pos, cursor }) => (
          <div
            key={corner}
            onMouseDown={(e) => handleCornerMouseDown(corner, e)}
            className={`absolute w-6 h-6 ${pos} ${cursor} z-10`}
          />
        ))}
      </div>
    </div>
  );
}
