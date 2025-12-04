// src/pages/MeetingDetailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { Loader } from 'lucide-react';
import InAppMeetingModal from '../components/InAppMeetingModal';

const JOIN_BEFORE_MIN = 10; // minutes before start to allow join
const JOIN_AFTER_MIN = 90; // minutes after start to still allow join (class window)

function fmtLocal(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

function getClassState(slot) {
  // returns: { statusLabel, canJoin (bool), countdownMs (ms until start, negative if started), started, ended }
  const now = Date.now();
  const start = new Date(slot.dateTime).getTime();
  const joinWindowStart = start - JOIN_BEFORE_MIN * 60_000;
  const joinWindowEnd = start + JOIN_AFTER_MIN * 60_000;

  if (slot.status === 'completed') return { statusLabel: 'Completed', canJoin: false, countdownMs: start - now, started: false, ended: true };
  if (slot.status === 'cancelled') return { statusLabel: 'Cancelled', canJoin: false, countdownMs: start - now, started: false, ended: true };

  if (now < joinWindowStart) return { statusLabel: 'Upcoming', canJoin: false, countdownMs: start - now, started: false, ended: false };
  if (now >= joinWindowStart && now <= joinWindowEnd) {
    const started = now >= start;
    return { statusLabel: started ? 'In progress' : 'Starting soon', canJoin: true, countdownMs: start - now, started, ended: false };
  }
  return { statusLabel: 'Missed / Finished window', canJoin: false, countdownMs: start - now, started: false, ended: true };
}

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [err, setErr] = useState('');
  const [nowTick, setNowTick] = useState(Date.now()); // tick every second for countdowns

  // in-app modal state
  const [inAppOpen, setInAppOpen] = useState(false);
  const [inAppRoom, setInAppRoom] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const resMe = await api.get('/api/auth/me');
        if (!mounted) return;
        setMe(resMe.data);

        const res = await api.get(`/api/meetings/${id}`);
        if (!mounted) return;
        const meetingDoc = res.data;
        meetingDoc.classes = (meetingDoc.classes || []).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        setMeeting(meetingDoc);
      } catch (error) {
        console.error('load meeting', error);
        setErr(error?.response?.data?.message || 'Failed to load meeting');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  // helper: refetch meeting
  const refreshMeeting = async () => {
    try {
      const res = await api.get(`/api/meetings/${id}`);
      const m = res.data;
      m.classes = (m.classes || []).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
      setMeeting(m);
    } catch (err) {
      console.error('refresh meeting', err);
    }
  };

  const isTeacherOfClass = (classSlot) => {
    if (!me || !classSlot) return false;
    const teacherId = classSlot.teacher?._id || classSlot.teacher;
    return String(teacherId) === String(me._id);
  };

  // Teacher sets external meeting link (Zoom/Meet)
  const saveMeetingLink = async (index, link, setLocalSaving) => {
    if (!link || link.trim() === '') return alert('Please enter a valid meeting link.');
    try {
      setLocalSaving(true);
      await api.put(`/api/meetings/${meeting._id}/classes/${index}/link`, { meetingLink: link.trim() });
      await refreshMeeting();
      alert('Meeting link saved.');
    } catch (err) {
      console.error('save link error', err);
      alert(err?.response?.data?.message || 'Failed to save meeting link');
    } finally {
      setLocalSaving(false);
    }
  };

  // Mark class completed (teacher)
  const markComplete = async (index) => {
    if (!window.confirm('Mark this class as completed?')) return;
    try {
      setActionLoading(true);
      await api.put(`/api/meetings/${meeting._id}/classes/${index}/complete`);
      await refreshMeeting();
    } catch (error) {
      console.error('mark complete', error);
      alert(error?.response?.data?.message || 'Failed to mark class completed');
    } finally {
      setActionLoading(false);
    }
  };

  // Secure in-app join helper:
  //  - prefer cls.roomName
  //  - otherwise call backend GET /api/meetings/:meetingId/room/:index to reveal roomName (server validates window & participant)
  const handleInAppJoin = async (cls, idx) => {
    try {
      const slotState = getClassState(cls);
      if (!slotState.canJoin) {
        if (slotState.ended) return alert('This class join window has ended.');
        return alert(`Join is allowed ${JOIN_BEFORE_MIN} minutes before the start. Starts at ${new Date(cls.dateTime).toLocaleString()}.`);
      }

      // prefer server-provided roomName in meeting doc
      if (cls.roomName) {
        setInAppRoom(cls.roomName);
        setInAppOpen(true);
        return;
      }

      // fetch secure room name from server
      const res = await api.get(`/api/meetings/${meeting._id}/room/${idx}`);
      if (!res.data || !res.data.roomName) throw new Error('Room not available yet. Try again a few minutes before class.');

      setInAppRoom(res.data.roomName);
      setInAppOpen(true);
    } catch (err) {
      console.error('handleInAppJoin error', err);
      const msg = err?.response?.data?.message || err.message || 'Could not join the meeting right now.';
      alert(msg);
    }
  };

  // External link open (Zoom/Meet)
  const openExternal = (link) => {
    if (!link) return alert('No external meeting link set for this class.');
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <Loader className="mx-auto animate-spin" />
          <div className="mt-3 text-gray-600">Loading meeting…</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-lg shadow text-red-600">
          {err}
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-lg shadow text-gray-600">
          Meeting not found.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Meeting</h1>
              <div className="text-sm text-gray-500">Participants: {(meeting.participants || []).map(p => p.name).join(', ')}</div>
              <div className="text-xs text-gray-400">Meeting ID: {meeting._id}</div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/meetings')} className="px-3 py-2 rounded border">Back to meetings</button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-medium mb-3">Class schedule</h2>

            <div className="space-y-3">
              {(meeting.classes || []).map((cls, idx) => {
                const when = new Date(cls.dateTime);
                const slotState = getClassState(cls);
                const isTeacher = isTeacherOfClass(cls);

                return (
                  <ClassRow
                    key={cls._id || idx}
                    idx={idx}
                    cls={cls}
                    when={when}
                    slotState={slotState}
                    isTeacher={isTeacher}
                    onSaveLink={(i, link, setSaving) => saveMeetingLink(i, link, setSaving)}
                    onOpenInApp={() => handleInAppJoin(cls, idx)}
                    onOpenExternal={() => openExternal(cls.meetingLink)}
                    onMarkComplete={() => markComplete(idx)}
                    actionLoading={actionLoading}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* In-app meeting modal (Jitsi iframe). Renders only when open */}
      {inAppOpen && (
        <InAppMeetingModal
          roomId={inAppRoom}
          displayName={me?.name || ''}
          onClose={() => { setInAppOpen(false); setInAppRoom(null); }}
        />
      )}
    </>
  );
}


/**
 * ClassRow component (per-row local state for meetingLink editing)
 */
function ClassRow({ idx, cls, when, slotState, isTeacher, onSaveLink, onOpenInApp, onOpenExternal, onMarkComplete, actionLoading }) {
  const [localLink, setLocalLink] = useState(cls.meetingLink || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalLink(cls.meetingLink || '');
  }, [cls.meetingLink]);

  // countdown display
  const countdown = slotState.countdownMs;
  const countdownText = countdown > 0
    ? msToHuman(countdown)
    : (slotState.started ? 'Started' : 'Ended');

  return (
    <div className="flex items-center gap-4 p-3 border rounded">
      <div className="w-16 text-xs text-gray-500">
        <div className="font-semibold">
          {cls.status === 'completed' ? <span className="text-green-600">Done</span> : cls.status === 'cancelled' ? <span className="text-red-600">Cancelled</span> : <span className="text-blue-600">{slotState.statusLabel}</span>}
        </div>
        <div className="mt-1 text-[11px] text-gray-500">{when.toLocaleDateString()}</div>
        <div className="text-[11px] text-gray-500">{when.toLocaleTimeString()}</div>
      </div>

      <div className="flex-1">
        <div className="font-medium">{fmtLocal(cls.dateTime)}</div>
        <div className="text-xs text-gray-500">Teacher: {cls.teacher?.name || cls.teacher}</div>

        <div className="mt-2 flex items-center gap-3">
          {/* Countdown / state */}
          <div className="text-sm text-gray-700">{slotState.statusLabel}</div>
          <div className="text-xs text-gray-500">{countdownText}</div>
        </div>

        {/* Link area */}
        <div className="mt-3">
          {cls.meetingLink ? (
            <div className="text-xs text-gray-700">
              <div className="truncate"><strong>External link:</strong> <a href={cls.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">{cls.meetingLink}</a></div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">No external meeting link set.</div>
          )}

          {/* Teacher edit controls for external link */}
          {isTeacher && (
            <div className="mt-2 flex items-center gap-2">
              {editing ? (
                <>
                  <input
                    value={localLink}
                    onChange={(e) => setLocalLink(e.target.value)}
                    placeholder="Paste Google Meet / Zoom link"
                    className="flex-1 border px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => onSaveLink(idx, localLink, setSaving)}
                    disabled={saving}
                    className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-70"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setLocalLink(cls.meetingLink || ''); }} className="px-3 py-2 rounded border text-sm">Cancel</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="px-3 py-2 rounded border text-sm">Set / Edit External Link</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* In-app Join button (enabled only when slotState.canJoin) */}
        {slotState.canJoin ? (
          <button onClick={onOpenInApp} className="px-3 py-2 rounded bg-green-600 text-white text-sm">Join (In-App)</button>
        ) : (
          <button disabled className="px-3 py-2 rounded border text-sm text-gray-400">Join (In-App)</button>
        )}

        {/* External open */}
        {cls.meetingLink && (
          <button onClick={onOpenExternal} className="px-3 py-2 rounded border text-sm">Open External</button>
        )}

        {/* Teacher mark complete if teacher & upcoming */}
        {isTeacher && cls.status === 'upcoming' && (
          <button onClick={onMarkComplete} disabled={actionLoading} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">
            {actionLoading ? 'Working…' : 'Mark Completed'}
          </button>
        )}
      </div>
    </div>
  );
}

// small helper: ms -> "HH:MM:SS" or "Xd HH:MM"
function msToHuman(ms) {
  if (ms <= 0) return '0s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
