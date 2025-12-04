// src/components/InAppMeetingModal.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import CallWidget from './CallWidget';

export default function InAppMeetingModal({ roomId, displayName = '', onClose }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');
  const [completedInfo, setCompletedInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/api/meetings/room-info/${encodeURIComponent(roomId)}`);
        if (!mounted) return;
        setMeta(res.data);
      } catch (error) {
        console.error('InApp modal load error', error);
        setErr(error?.response?.data?.message || 'Failed to load room info');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [roomId]);

  // handler invoked by CallWidget when call completes
  const onCallComplete = (info) => {
    // info: { durationSec, startAt, endAt }
    setCompletedInfo(info);
  };

  // UI
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="font-semibold">In-App Call</div>
            <div className="text-xs text-gray-500">Room: <span className="font-mono">{roomId}</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onClose()} className="px-3 py-1 rounded border text-sm">Close</button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">Loading call…</div>
          ) : err ? (
            <div className="text-center text-red-600 py-8">{err}</div>
          ) : (
            <>
              {!completedInfo ? (
                <CallWidget
                  roomName={roomId}
                  meetingId={meta.meetingId}
                  classIndex={meta.classIndex}
                  durationMin={meta.durationMin || 30} // fallback 30
                  displayName={displayName}
                  onComplete={onCallComplete}
                  onClose={onClose}
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="text-2xl font-semibold">Class completed</div>
                  <div className="text-gray-600">Duration: {Math.round(completedInfo.durationSec / 60)} min ({completedInfo.durationSec} sec)</div>
                  <div className="text-sm text-gray-500">Started: {new Date(completedInfo.startAt).toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Ended: {new Date(completedInfo.endAt).toLocaleString()}</div>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button onClick={() => { onClose(); }} className="px-4 py-2 rounded bg-blue-600 text-white">Close</button>
                    <button onClick={() => { /* optionally navigate to meeting page */ onClose(); }} className="px-4 py-2 rounded border">View meeting</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
