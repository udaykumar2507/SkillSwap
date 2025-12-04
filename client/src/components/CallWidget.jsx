// src/components/CallWidget.jsx
import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer/simplepeer.min.js';
import api from '../api';

const apiKey = import.meta.env.VITE_WIDGET_KEY;

function formatTimeLeft(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function CallWidget({
  roomName,
  meetingId,
  classIndex,
  durationMin = 30,
  displayName = '',
  onComplete = () => {},
  onClose = () => {}
}) {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef(); // used for first remote; if you need multiple remotes handle array
  const peersRef = useRef({}); // map socketId -> peer
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);

  const [connecting, setConnecting] = useState(true);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(durationMin * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Call completion - mark class complete on backend and notify parent
  const finishClass = async (startAtIso) => {
    try {
      const endAtIso = new Date().toISOString();
      const payload = { startAt: startAtIso, endAt: endAtIso };
      const res = await api.put(`/api/meetings/${meetingId}/classes/${classIndex}/complete`, payload);
      const durationSec = res.data.durationSec ?? Math.floor((new Date(endAtIso) - new Date(startAtIso)) / 1000);
      onComplete({ durationSec, startAt: startAtIso, endAt: endAtIso });
    } catch (err) {
      console.error('Finish class API error', err);
      onComplete({ durationSec: durationMin * 60, startAt: startAtIso, endAt: new Date().toISOString() });
    }
  };

  useEffect(() => {
    let mounted = true;
    let countdownTimer = null;

    const setup = async () => {
      try {
        setConnecting(true);

        // 1) get local camera/mic
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 2) connect socket
        const token = localStorage.getItem('ss_token') || localStorage.getItem('token') || '';
        const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
        socketRef.current = io(backendUrl, { auth: { token }, transports: ['websocket'] });

        const socket = socketRef.current;

        // Helper: create peer for a remote socket id
        const createPeer = (remoteId, initiator) => {
          if (peersRef.current[remoteId]) {
            console.warn('peer already exists for', remoteId);
            return;
          }

          const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream: localStreamRef.current,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
              ],
            },
          });

          peersRef.current[remoteId] = peer;

          peer.on('signal', (signalData) => {
            socket.emit('signal', { to: remoteId, signal: signalData });
          });

          peer.on('stream', (remoteStream) => {
            console.log('received remote stream from', remoteId);
            if (!mounted) return;
            setRemoteConnected(true);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
          });

          peer.on('connect', () => {
            console.log('peer connected to', remoteId);
          });

          peer.on('error', (e) => {
            console.error('peer error for', remoteId, e);
          });

          peer.on('close', () => {
            console.log('peer closed', remoteId);
            delete peersRef.current[remoteId];
            if (Object.keys(peersRef.current).length === 0) setRemoteConnected(false);
          });

          return peer;
        };

        // ==============================
        // Join room and handle peers
        // ==============================
        socket.emit('join-room', { roomName }, (ack) => {
          if (!mounted) return;
          console.log('join-room ack', ack);

          const existing = (ack && ack.peers) || [];
          existing.forEach(remoteId => createPeer(remoteId, true));
          setConnecting(false);

          // Listen for any late arrivals
          socket.on('peer-joined', ({ socketId }) => {
            console.log('peer-joined event', socketId);
            createPeer(socketId, false); // non-initiator
          });
        });

        // When user leaves
        socket.on('peer-left', ({ socketId }) => {
          console.log('peer-left', socketId);
          const p = peersRef.current[socketId];
          if (p) {
            try { p.destroy(); } catch (_) {}
            delete peersRef.current[socketId];
          }
          if (Object.keys(peersRef.current).length === 0) setRemoteConnected(false);
        });

        // handle incoming signal
        socket.on('signal', ({ from, signal }) => {
          const peer = peersRef.current[from];
          if (!peer) {
            console.warn('signal received for unknown peer', from, '- creating non-initiator');
            const newPeer = createPeer(from, false);
            try { newPeer.signal(signal); } catch (err) { console.error('error signaling newPeer', err); }
            return;
          }
          try { peer.signal(signal); } catch (err) { console.error('peer.signal error', err); }
        });

        // optional: call-started/ended handlers
        socket.on('call-started', ({ startAt }) => console.log('call-started broadcast', startAt));
        socket.on('call-ended', (payload) => console.log('call-ended broadcast', payload));

      } catch (err) {
        console.error('CallWidget setup error', err);
        alert('Failed to start call. Please check camera/mic permissions and network.');
      }
    };

    setup();

    // cleanup
    return () => {
      mounted = false;
      try { Object.values(peersRef.current).forEach(p => { try { p.destroy(); } catch (_) {} }); peersRef.current = {}; } catch (_) {}
      try { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; } } catch (_) {}
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      setTimerRunning(false);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [roomName, meetingId, classIndex]);

  // Start timer when remoteConnected becomes true
  useEffect(() => {
    let timerId = null;
    let startIso = null;

    if (remoteConnected && !timerRunning) {
      startIso = new Date().toISOString();
      setStartedAt(startIso);
      setTimerRunning(true);
      setTimeLeft(durationMin * 60);

      if (socketRef.current) socketRef.current.emit('call-started', { roomName, meetingId, classIndex });

      timerId = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerId);
            (async () => {
              try { await finishClass(startIso); } catch (err) { console.error('finishClass error', err); }
              finally {
                if (socketRef.current) socketRef.current.emit('call-ended', { roomName, meetingId, classIndex, startAt: startIso, endAt: new Date().toISOString() });
                try { Object.values(peersRef.current).forEach(p => { try { p.destroy(); } catch(_){} }); } catch(_) {}
                try { if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop()); } catch(_) {}
                setTimerRunning(false);
              }
            })();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => { if (timerId) clearInterval(timerId); };
  }, [remoteConnected, timerRunning, durationMin, roomName, meetingId, classIndex]);

  // UI controls
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    setMuted(prev => !prev);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    setCameraOff(prev => !prev);
  };

  const handleEndNow = async () => {
    const startIso = startedAt || new Date().toISOString();
    await finishClass(startIso);
    if (socketRef.current) socketRef.current.emit('call-ended', { roomName, meetingId, classIndex, startAt: startIso, endAt: new Date().toISOString() });
    try { Object.values(peersRef.current).forEach(p => { try { p.destroy(); } catch(_){} }); } catch(_) {}
    try { if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop()); } catch(_) {}
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-black rounded-lg min-h-[240px] flex items-center justify-center relative">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-lg" />
        {!remoteConnected && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <div className="text-center">
              <div className="text-lg font-medium">Waiting for other participant…</div>
              <div className="text-sm mt-1">They should join within the allowed window.</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-white rounded-lg p-3 shadow flex items-center gap-3">
          <div className="w-20 h-20 bg-gray-100 rounded overflow-hidden">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">{displayName || 'You'}</div>
            <div className="text-xs text-gray-500">Room: <span className="font-mono">{roomName}</span></div>
            <div className="text-xs text-gray-500 mt-1">Class #{classIndex + 1}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow text-center">
          <div className="text-xs text-gray-500">Call timer</div>
          <div className="text-2xl font-semibold">{formatTimeLeft(timeLeft)}</div>
          <div className="text-xs text-gray-400 mt-1">Total: {durationMin} min</div>
        </div>

        <div className="bg-white rounded-lg p-3 shadow flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="px-3 py-2 rounded bg-gray-100 text-sm">{muted ? 'Unmute' : 'Mute'}</button>
            <button onClick={toggleCamera} className="px-3 py-2 rounded bg-gray-100 text-sm">{cameraOff ? 'Camera On' : 'Camera Off'}</button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleEndNow} className="px-4 py-2 rounded bg-red-600 text-white">End now</button>
            <button onClick={() => onClose()} className="px-4 py-2 rounded border">Close</button>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          {connecting ? 'Connecting…' : (remoteConnected ? 'Connected' : 'Not connected')}
        </div>
      </div>
    </div>
  );
}
