// src/pages/MeetingsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import InAppMeetingModal from '../components/InAppMeetingModal';

const JOIN_BEFORE_MIN = 10; // same window as MeetingDetailPage
const JOIN_AFTER_MIN = 90;

function getClassState(slot) {
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

export default function MeetingsPage() {
  const [me, setMe] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [inAppOpen, setInAppOpen] = useState(false);
  const [inAppRoom, setInAppRoom] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const resMe = await api.get('/api/auth/me');
        if (!mounted) return;
        setMe(resMe.data);

        const resMeet = await api.get(`/api/meetings/user/${resMe.data._id}`);
        if (!mounted) return;
        setMeetings(resMeet.data || []);
      } catch (error) {
        console.error('MeetingsPage error', error);
        setErr(error?.response?.data?.message || 'Failed to load meetings');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  // find next class from classes array
  const getNextClass = (classes) => {
    if (!classes || classes.length === 0) return null;
    const upcoming = classes.filter(c => c.status === 'upcoming').sort((a,b) => new Date(a.dateTime) - new Date(b.dateTime));
    return upcoming.length ? upcoming[0] : null;
  };

  // Attempt to join in-app:
  // 1) if roomName present use it
  // 2) otherwise call secure backend endpoint to fetch roomName: GET /api/meetings/:id/room/:index
  // (Note: server must implement that endpoint OR classes must already have roomName)
  const handleInAppJoin = async (meetingId, cls, idx) => {
    try {
      // check join window client-side first
      const slotState = getClassState(cls);
      if (!slotState.canJoin) {
        alert('Join is allowed only within the join window (10 minutes before start).');
        return;
      }

      // prefer server-provided roomName
      if (cls.roomName) {
        setInAppRoom(cls.roomName);
        setInAppOpen(true);
        return;
      }

      // try fetching on-demand
      const res = await api.get(`/api/meetings/${meetingId}/room/${idx}`);
      if (!res.data?.roomName) throw new Error('Room not available yet');
      setInAppRoom(res.data.roomName);
      setInAppOpen(true);
    } catch (err) {
      console.error('handleInAppJoin error', err);
      alert(err?.response?.data?.message || err.message || 'Could not join — try again later.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <Loader className="mx-auto animate-spin" />
          <div className="mt-3 text-gray-600">Loading meetings…</div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-6 rounded-lg shadow text-center text-red-600">
          {err}
        </div>
      </div>
    );
  }

  if (!meetings.length) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Meetings</h1>
          <div className="bg-white p-6 rounded shadow text-gray-600">
            You don't have any meetings yet. Once a request is accepted (and paid for if required), meetings will appear here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Meetings</h1>
          </div>

          <div className="space-y-4">
            {meetings.map((m) => {
              const next = getNextClass(m.classes);
              const total = (m.classes || []).length;

              return (
                <div key={m._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500">Participants</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {(m.participants || []).map(p => p.name).join(' • ')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{total} classes</div>
                        </div>

                        <div className="text-right text-xs text-gray-500">
                          <div>Created: {new Date(m.createdAt).toLocaleString()}</div>
                          <div className="mt-1">Meeting ID: <span className="font-mono text-xs">{String(m._id).slice(-6)}</span></div>
                        </div>
                      </div>

                      <div className="mt-3 grid md:grid-cols-3 gap-4 text-sm text-gray-700">
                        <div>
                          <div className="text-xs text-gray-500">Next class</div>
                          {next ? (
                            <>
                              <div className="font-medium">{new Date(next.dateTime).toLocaleString()}</div>
                              <div className="text-xs text-gray-500 mt-1">Teacher: {
                                (m.participants || []).find(p => String(p._id) === String(next.teacher) || (next.teacher?._id && String(p._id) === String(next.teacher._id)))?.name || 'Teacher'
                              }</div>
                            </>
                          ) : (
                            <div className="text-gray-500">No upcoming class</div>
                          )}
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="font-medium">
                            {((m.classes||[]).filter(c => c.status === 'completed')).length} completed • {((m.classes||[]).filter(c => c.status === 'upcoming')).length} upcoming
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">Actions</div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/meetings/${m._id}`)}
                              className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                            >
                              View meeting
                            </button>

                            {next && (
                              <>
                                {/* join button: active if within join window */}
                                {(() => {
                                  const state = getClassState(next);
                                  const label = state.canJoin ? 'Join next' : `Join (opens ${msToHuman(state.countdownMs)})`;
                                  return (
                                    <button
                                      onClick={() => handleInAppJoin(m._id, next, m.classes.indexOf(next))}
                                      disabled={!state.canJoin}
                                      className={`px-3 py-2 rounded ${state.canJoin ? 'bg-green-600 text-white' : 'border text-sm text-gray-500'}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* In-app meeting modal for quick joins */}
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
