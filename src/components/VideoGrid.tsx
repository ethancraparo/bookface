'use client';
import { useEffect, useRef } from 'react';

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoOff: boolean;
  isAudioMuted: boolean;
}

export default function VideoGrid({ localStream, remoteStream, isVideoOff, isAudioMuted }: Props) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="relative flex-1 bg-black rounded-xl overflow-hidden">
      {/* Remote video */}
      {remoteStream ? (
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
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

      {/* Local video — PiP */}
      <div className="absolute bottom-3 right-3 w-36 h-24 rounded-lg overflow-hidden border-2 border-border shadow-xl bg-surface">
        {/* Always keep video in DOM — unmounting clears srcObject and breaks re-enable */}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover scale-x-[-1]${isVideoOff || !localStream ? ' hidden' : ''}`}
        />
        {(isVideoOff || !localStream) && (
          <div className="absolute inset-0 flex items-center justify-center bg-elevated">
            <span className="text-lg">🚫</span>
          </div>
        )}
        {/* Indicators */}
        <div className="absolute bottom-1 left-1 flex gap-1">
          {isAudioMuted && (
            <span className="bg-danger rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px]">
              🔇
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
