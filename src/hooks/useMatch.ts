'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import type {
  SessionState,
  ChatMessage,
  RevealedIdentity,
  ReportCategory,
} from '@/types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseMatchOptions {
  userId: string;
}

export function useMatch({ userId }: UseMatchOptions) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [incomingReveal, setIncomingReveal] = useState(false);
  const [revealPending, setRevealPending] = useState(false);
  const [revealedIdentity, setRevealedIdentity] = useState<RevealedIdentity | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ── Media ────────────────────────────────────────────────────────────────

  const initMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      setErrorMsg('Camera/microphone access denied. Please allow permissions and refresh.');
      return null;
    }
  }, []);

  // ── Peer connection ──────────────────────────────────────────────────────

  function createPeerConnection(stream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const rs = new MediaStream();
    setRemoteStream(rs);

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => rs.addTrack(track));
      setRemoteStream(new MediaStream(rs.getTracks()));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('ice_candidate', { candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setSessionState('active');
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        handlePartnerGone();
      }
    };

    return pc;
  }

  function closePeerConnection() {
    pcRef.current?.close();
    pcRef.current = null;
    setRemoteStream(null);
  }

  // ── Reset session state ──────────────────────────────────────────────────

  function resetSession() {
    closePeerConnection();
    setMessages([]);
    setIncomingReveal(false);
    setRevealPending(false);
    setRevealedIdentity(null);
    setShowReport(false);
  }

  function handlePartnerGone() {
    resetSession();
    setSessionState('ended');
  }

  // ── Socket setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('waiting', () => setSessionState('waiting'));

    socket.on('matched', async ({ isInitiator }: { isInitiator: boolean }) => {
      setSessionState('connecting');
      const stream = await initMedia();
      if (!stream) return;

      const pc = createPeerConnection(stream);

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer });
      }
    });

    socket.on('offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      const stream = localStreamRef.current ?? (await initMedia());
      if (!stream) return;

      const pc = pcRef.current ?? createPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { answer });
    });

    socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice_candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore — can happen when pc is closing
      }
    });

    socket.on('partner_skipped', handlePartnerGone);
    socket.on('partner_disconnected', handlePartnerGone);

    socket.on('chat_message', ({ text, timestamp, fromSelf }: { text: string; timestamp: number; fromSelf: boolean }) => {
      setMessages((prev) => [
        ...prev,
        { id: uuidv4(), text, timestamp, fromSelf },
      ]);
    });

    socket.on('reveal_request', () => setIncomingReveal(true));

    socket.on('reveal_response', ({ accepted }: { accepted: boolean }) => {
      if (!accepted) {
        setRevealPending(false);
      }
    });

    socket.on('identity_revealed', (identity: RevealedIdentity) => {
      setRevealedIdentity(identity);
      setRevealPending(false);
      setIncomingReveal(false);
    });

    socket.on('report_confirmed', () => {
      resetSession();
      setSessionState('ended');
    });

    socket.on('error', ({ message }: { message: string }) => {
      setErrorMsg(message);
    });

    return () => {
      socket.disconnect();
      closePeerConnection();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Public actions ───────────────────────────────────────────────────────

  const startMatching = useCallback(
    async (tags: string[]) => {
      setSelectedTags(tags);
      setErrorMsg(null);
      const stream = await initMedia();
      if (!stream) return;
      resetSession();
      setSessionState('waiting');
      socketRef.current?.emit('join_queue', { userId, tags });
    },
    [userId, initMedia]
  );

  const skip = useCallback(() => {
    socketRef.current?.emit('skip');
    resetSession();
    // Re-enter queue with same tags
    setSessionState('waiting');
    socketRef.current?.emit('join_queue', { userId, tags: selectedTags });
  }, [userId, selectedTags]);

  const stopMatching = useCallback(() => {
    socketRef.current?.emit('leave_queue');
    socketRef.current?.emit('skip');
    resetSession();
    setSessionState('idle');
  }, []);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.emit('chat_message', { message: text });
    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), text, fromSelf: true, timestamp: Date.now() },
    ]);
  }, []);

  const requestReveal = useCallback(() => {
    socketRef.current?.emit('reveal_request');
    setRevealPending(true);
  }, []);

  const respondToReveal = useCallback((accepted: boolean) => {
    socketRef.current?.emit('reveal_response', { accepted });
    setIncomingReveal(false);
  }, []);

  const reportUser = useCallback(
    (category: ReportCategory) => {
      socketRef.current?.emit('report', { category });
      setShowReport(false);
    },
    []
  );

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsAudioMuted((m) => !m);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((v) => !v);
  }, []);

  const clearError = useCallback(() => setErrorMsg(null), []);

  return {
    // State
    sessionState,
    localStream,
    remoteStream,
    isAudioMuted,
    isVideoOff,
    messages,
    incomingReveal,
    revealPending,
    revealedIdentity,
    showReport,
    errorMsg,
    selectedTags,
    // Actions
    startMatching,
    skip,
    stopMatching,
    sendMessage,
    requestReveal,
    respondToReveal,
    reportUser,
    toggleMute,
    toggleVideo,
    setShowReport,
    setSelectedTags,
    clearError,
  };
}
