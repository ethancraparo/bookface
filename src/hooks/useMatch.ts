'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import type { SessionState, ChatMessage, RevealedIdentity, ReportCategory } from '@/types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface UseMatchOptions { userId: string; }

export function useMatch({ userId }: UseMatchOptions) {
  const socketRef          = useRef<Socket | null>(null);
  const peersRef           = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef     = useRef<MediaStream | null>(null);
  const screenStreamRef    = useRef<MediaStream | null>(null);
  const isScreenSharingRef = useRef(false);

  const [sessionState,     setSessionState]     = useState<SessionState>('idle');
  const [localStream,      setLocalStream]      = useState<MediaStream | null>(null);
  const [remoteStreams,    setRemoteStreams]     = useState<Map<string, MediaStream>>(new Map());
  const [isAudioMuted,    setIsAudioMuted]      = useState(false);
  const [isVideoOff,      setIsVideoOff]        = useState(false);
  const [isScreenSharing, setIsScreenSharing]   = useState(false);
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [incomingReveal,   setIncomingReveal]   = useState(false);
  const [revealPending,    setRevealPending]    = useState(false);
  const [revealedIdentity, setRevealedIdentity] = useState<RevealedIdentity | null>(null);
  const [showReport,       setShowReport]       = useState(false);
  const [errorMsg,         setErrorMsg]         = useState<string | null>(null);
  const [selectedTags,     setSelectedTags]     = useState<string[]>([]);
  const [groupSize,        setGroupSize]        = useState(1);
  const [incomingExpand,   setIncomingExpand]   = useState(false);
  const [expandPending,    setExpandPending]    = useState(false);

  // Derived — stable array form of the streams map
  const remoteStreamsList = Array.from(remoteStreams.values());

  // ── Media ────────────────────────────────────────────────────────────────

  const initMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch {
      setErrorMsg('Camera/microphone access denied. Please allow permissions and refresh.');
      return null;
    }
  }, []);

  function stopMedia() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLocalStream(null);
    setIsVideoOff(false);
    setIsAudioMuted(false);
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
  }

  // ── Peer connections ──────────────────────────────────────────────────────

  function createPeerConnection(peerId: string, stream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(peerId, pc);

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const remoteStream = new MediaStream();

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      setRemoteStreams((prev) => new Map(prev).set(peerId, new MediaStream(remoteStream.getTracks())));
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('ice_candidate', { to: peerId, candidate: e.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setSessionState('active');
      else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handlePeerGone(peerId);
      }
    };

    return pc;
  }

  function handlePeerGone(peerId: string) {
    peersRef.current.get(peerId)?.close();
    peersRef.current.delete(peerId);
    setRemoteStreams((prev) => { const m = new Map(prev); m.delete(peerId); return m; });
    setGroupSize((s) => Math.max(1, s - 1));
    if (peersRef.current.size === 0) setSessionState('ended');
  }

  function closeAllPeerConnections() {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemoteStreams(new Map());
  }

  // ── Session reset ─────────────────────────────────────────────────────────

  function resetSession() {
    closeAllPeerConnections();
    setMessages([]);
    setIncomingReveal(false);
    setRevealPending(false);
    setRevealedIdentity(null);
    setShowReport(false);
    setGroupSize(1);
    setIncomingExpand(false);
    setExpandPending(false);
  }

  // ── Socket setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('waiting', () => setSessionState('waiting'));

    socket.on('matched', async ({
      isInitiator,
      partnerSocketId,
    }: { isInitiator: boolean; partnerSocketId: string }) => {
      setSessionState('connecting');
      setGroupSize(2);
      const stream = await initMedia();
      if (!stream) return;

      if (isInitiator) {
        const pc = createPeerConnection(partnerSocketId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: partnerSocketId, offer });
      }
      // Non-initiator waits for an offer
    });

    socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const stream = localStreamRef.current ?? (await initMedia());
      if (!stream) return;
      let pc = peersRef.current.get(from);
      if (!pc) pc = createPeerConnection(from, stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { to: from, answer });
    });

    socket.on('answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      await peersRef.current.get(from)?.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice_candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      try { await peersRef.current.get(from)?.addIceCandidate(new RTCIceCandidate(candidate)); }
      catch { /* ignore — can happen while PC is closing */ }
    });

    // ── Group events ──────────────────────────────────────────────────────

    socket.on('member_joined', ({ socketId: _sid }: { socketId: string }) => {
      setGroupSize((s) => s + 1);
      // The new member will send us an offer — nothing else to do here
    });

    socket.on('member_left', ({ socketId }: { socketId: string }) => {
      handlePeerGone(socketId);
    });

    socket.on('group_joined', async ({ memberSocketIds }: { memberSocketIds: string[] }) => {
      // I'm the new person — initiate connections to all existing members
      setSessionState('connecting');
      setGroupSize((s) => s + memberSocketIds.length);
      const stream = localStreamRef.current ?? (await initMedia());
      if (!stream) return;
      for (const peerId of memberSocketIds) {
        const pc = createPeerConnection(peerId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: peerId, offer });
      }
    });

    // ── Session end ───────────────────────────────────────────────────────

    socket.on('partner_skipped',      () => { resetSession(); setSessionState('ended'); });
    socket.on('partner_disconnected', () => { resetSession(); setSessionState('ended'); });

    // ── Chat ──────────────────────────────────────────────────────────────

    socket.on('chat_message', ({
      text, timestamp, fromSelf,
    }: { text: string; timestamp: number; fromSelf: boolean }) => {
      setMessages((prev) => [...prev, { id: uuidv4(), text, timestamp, fromSelf }]);
    });

    // ── Reveal ────────────────────────────────────────────────────────────

    socket.on('reveal_request',  ()                           => setIncomingReveal(true));
    socket.on('reveal_response', ({ accepted }: { accepted: boolean }) => {
      if (!accepted) setRevealPending(false);
    });
    socket.on('identity_revealed', (identity: RevealedIdentity) => {
      setRevealedIdentity(identity);
      setRevealPending(false);
      setIncomingReveal(false);
    });

    // ── Expand ────────────────────────────────────────────────────────────

    socket.on('expand_proposed', () => setIncomingExpand(true));
    socket.on('expand_declined', () => { setExpandPending(false); setIncomingExpand(false); });
    socket.on('expand_no_match', () => setExpandPending(false));

    // ── Report / Error ────────────────────────────────────────────────────

    socket.on('report_confirmed', () => { resetSession(); setSessionState('ended'); });
    socket.on('error', ({ message }: { message: string }) => setErrorMsg(message));

    return () => {
      socket.disconnect();
      closeAllPeerConnections();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Public actions ───────────────────────────────────────────────────────

  const startMatching = useCallback(async (tags: string[]) => {
    setSelectedTags(tags);
    setErrorMsg(null);
    const stream = await initMedia();
    if (!stream) return;
    resetSession();
    setSessionState('waiting');
    socketRef.current?.emit('join_queue', { userId, tags });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initMedia]);

  const skip = useCallback(() => {
    socketRef.current?.emit('skip');
    resetSession();
    setSessionState('waiting');
    socketRef.current?.emit('join_queue', { userId, tags: selectedTags });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedTags]);

  const stopMatching = useCallback(() => {
    socketRef.current?.emit('leave_queue');
    socketRef.current?.emit('skip');
    resetSession();
    stopMedia();
    setSessionState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((text: string) => {
    socketRef.current?.emit('chat_message', { message: text });
    setMessages((prev) => [...prev, { id: uuidv4(), text, fromSelf: true, timestamp: Date.now() }]);
  }, []);

  const requestReveal = useCallback(() => {
    socketRef.current?.emit('reveal_request');
    setRevealPending(true);
  }, []);

  const respondToReveal = useCallback((accepted: boolean) => {
    socketRef.current?.emit('reveal_response', { accepted });
    setIncomingReveal(false);
  }, []);

  const reportUser = useCallback((category: ReportCategory) => {
    socketRef.current?.emit('report', { category });
    setShowReport(false);
  }, []);

  const proposeExpand = useCallback(() => {
    socketRef.current?.emit('propose_expand');
    setExpandPending(true);
  }, []);

  const respondToExpand = useCallback((accept: boolean) => {
    socketRef.current?.emit('expand_vote', { accept });
    setIncomingExpand(false);
    if (!accept) setExpandPending(false);
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsAudioMuted((m) => !m);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsVideoOff((v) => !v);
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        sender?.replaceTrack(cameraTrack);
      });
    }
    isScreenSharingRef.current = false;
    setIsScreenSharing(false);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharingRef.current) { stopScreenShare(); return; }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        sender?.replaceTrack(screenTrack);
      });
      screenTrack.onended = stopScreenShare;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);
    } catch { /* user cancelled picker */ }
  }, [stopScreenShare]);

  const clearError    = useCallback(() => setErrorMsg(null), []);
  const dismissReveal = useCallback(() => setRevealedIdentity(null), []);

  return {
    sessionState,
    localStream,
    remoteStreamsList,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    messages,
    incomingReveal,
    revealPending,
    revealedIdentity,
    showReport,
    errorMsg,
    selectedTags,
    groupSize,
    incomingExpand,
    expandPending,
    startMatching,
    skip,
    stopMatching,
    sendMessage,
    requestReveal,
    respondToReveal,
    reportUser,
    proposeExpand,
    respondToExpand,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    setShowReport,
    setSelectedTags,
    clearError,
    dismissReveal,
  };
}
