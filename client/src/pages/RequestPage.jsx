// src/pages/RequestsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';

export default function RequestsPage() {
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, [tab]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      if (tab === 'incoming') {
        const res = await api.get('/api/requests/incoming');
        setIncoming(res.data || []);
      } else {
        const res = await api.get('/api/requests/sent');
        setSent(res.data || []);
      }
    } catch (err) {
      console.error('fetch requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId, selectedSlot) => {
    if (!selectedSlot) return alert('Select a slot first');
    if (!window.confirm('Accept this request?')) return;

    try {
      setActionLoading(requestId);
      await api.put(`/api/requests/${requestId}/select-slot`, { selectedSlot });
      await fetchAll();
    } catch (err) {
      console.error('accept failed', err);
      alert(err?.response?.data?.message || 'Failed to accept.');
      await fetchAll();
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Reject this request?')) return;
    try {
      setActionLoading(requestId);
      await api.put(`/api/requests/${requestId}/reject`);
      await fetchAll();
    } catch (err) {
      console.error('reject failed', err);
      alert(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading('');
    }
  };

  const handlePay = async (requestId) => {
    if (!window.confirm('Proceed with fake payment?')) return;
    try {
      setActionLoading(requestId);
      const res = await api.post(`/api/payment/${requestId}/pay`, { intervalDays: 2 });
      await fetchAll();
      if (res.data?.meeting?._id) {
        navigate(`/meetings/${res.data.meeting._id}`);
      } else {
        navigate('/meetings');
      }
    } catch (err) {
      console.error('payment failed', err);
      alert(err?.response?.data?.message || 'Payment failed');
    } finally {
      setActionLoading('');
    }
  };

  const renderIncoming = () => {
    if (loading) return <Loader className="animate-spin" />;
    if (!incoming.length)
      return <div className="p-6 bg-white rounded shadow text-gray-500">No incoming requests.</div>;

    return incoming.map((r) => (
      <div key={r._id} className="bg-white border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-500">From</div>
            <div className="text-lg font-semibold text-gray-900">{r.fromUser?.name}</div>
            <div className="text-xs text-gray-500">
              {r.type === 'paid' ? 'Paid' : 'Exchange'} • {r.classes} classes
            </div>

            <div className="mt-3 text-sm text-gray-700">
              <div className="mb-2 font-medium">Proposed slots</div>
              <div className="grid md:grid-cols-2 gap-2">
                {r.proposedSlots?.map((s, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-xs p-2 rounded border">
                    <input
                      type="radio"
                      name={`slot-${r._id}`}
                      value={new Date(s).toISOString()}
                      defaultChecked={
                        r.selectedSlot &&
                        new Date(r.selectedSlot).toISOString() === new Date(s).toISOString()
                      }
                    />
                    <span>{new Date(s).toLocaleString()}</span>
                  </label>
                ))}
              </div>

              <div className="mt-2 text-xs text-gray-600">
                Selected:{' '}
                {r.selectedSlot ? new Date(r.selectedSlot).toLocaleString() : 'Not selected yet'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-gray-500">
              Sent: {new Date(r.createdAt).toLocaleString()}
            </div>
            <div className="text-xs">
              Status: <strong>{r.status}</strong>
            </div>
            <div className="text-xs">
              Payment: <strong>{r.paymentStatus}</strong>
            </div>
          </div>
        </div>

        {/* BUTTONS FIXED */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => (window.location.href = `/profile/${r.fromUser?._id}`)}
            className="px-3 py-2 rounded border text-sm"
          >
            View Learner
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* SHOW Accept/Reject ONLY IF PENDING */}
            {r.status === 'pending' && !r.selectedSlot && (
              <>
                <button
                  onClick={async () => {
                    const selector = `input[name="slot-${r._id}"]:checked`;
                    const el = document.querySelector(selector);
                    const chosen = el ? el.value : null;
                    await handleAccept(r._id, chosen);
                  }}
                  disabled={actionLoading === r._id}
                  className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-70"
                >
                  {actionLoading === r._id ? 'Working…' : 'Accept'}
                </button>

                <button
                  onClick={() => handleReject(r._id)}
                  disabled={actionLoading === r._id}
                  className="px-3 py-2 rounded border text-sm hover:bg-gray-50 disabled:opacity-70"
                >
                  Reject
                </button>
              </>
            )}

            {r.status === 'accepted' && (
              <div className="text-green-600 text-sm font-semibold">Accepted ✔</div>
            )}

            {r.status === 'rejected' && (
              <div className="text-red-600 text-sm font-semibold">Rejected ✖</div>
            )}
          </div>
        </div>
      </div>
    ));
  };

  const renderSent = () => {
    if (loading) return <Loader className="animate-spin" />;
    if (!sent.length)
      return <div className="p-6 bg-white rounded shadow text-gray-500">No sent requests.</div>;

    return sent.map((r) => (
      <div key={r._id} className="bg-white border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-500">To</div>
            <div className="text-lg font-semibold text-gray-900">{r.toUser?.name}</div>
            <div className="text-xs text-gray-500">
              {r.type === 'paid' ? 'Paid' : 'Exchange'} • {r.classes} classes
            </div>

            <div className="mt-3 text-sm text-gray-700">
              <div className="mb-2 font-medium">Proposed slots</div>
              <div className="grid md:grid-cols-2 gap-2">
                {r.proposedSlots?.map((s, idx) => (
                  <div key={idx} className="text-xs px-3 py-2 bg-gray-50 rounded">
                    {new Date(s).toLocaleString()}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-xs text-gray-600">
                Selected:{' '}
                {r.selectedSlot ? new Date(r.selectedSlot).toLocaleString() : 'Not selected yet'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-xs text-gray-500">
              Sent: {new Date(r.createdAt).toLocaleString()}
            </div>
            <div className="text-xs">
              Status: <strong>{r.status}</strong>
            </div>
            <div className="text-xs">
              Payment: <strong>{r.paymentStatus}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => (window.location.href = `/profile/${r.toUser?._id}`)}
            className="px-3 py-2 rounded border text-sm"
          >
            View Instructor
          </button>

          {r.type === 'paid' && r.status === 'accepted' && r.paymentStatus === 'not_paid' && (
            <button
              onClick={() => handlePay(r._id)}
              disabled={actionLoading === r._id}
              className="px-4 py-2 rounded bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-70 ml-2"
            >
              {actionLoading === r._id ? 'Processing…' : `Pay Now ($${r.totalAmount || 0})`}
            </button>
          )}

          {r.meetingId && (
            <button
              onClick={() => navigate(`/meetings/${r.meetingId}`)}
              className="ml-auto px-3 py-2 rounded border text-sm"
            >
              View Meeting
            </button>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Requests</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('incoming')}
              className={`px-3 py-2 rounded ${
                tab === 'incoming' ? 'bg-blue-600 text-white' : 'bg-white border'
              }`}
            >
              Incoming
            </button>
            <button
              onClick={() => setTab('sent')}
              className={`px-3 py-2 rounded ${
                tab === 'sent' ? 'bg-blue-600 text-white' : 'bg-white border'
              }`}
            >
              Sent
            </button>
          </div>
        </div>

        <div>{tab === 'incoming' ? renderIncoming() : renderSent()}</div>
      </div>
    </div>
  );
}
