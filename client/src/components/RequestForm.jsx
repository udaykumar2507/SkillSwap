import React, { useState } from 'react';
import api from '../api';
import { X } from 'lucide-react';

export default function RequestForm({ toUser, defaultType = 'paid', onDone, onClose }) {
  const [type, setType] = useState(defaultType); // "paid" | "exchange"
  const [classes, setClasses] = useState(4); // 4 or 6
  const [slots, setSlots] = useState(['', '', '']); // datetime-local strings
  const [intervalDays, setIntervalDays] = useState(2); // optional helper (used later)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateSlot = (idx, value) => {
    const copy = [...slots];
    copy[idx] = value;
    setSlots(copy);
  };

  const addSlot = () => {
    if (slots.length >= 6) return;
    setSlots(prev => [...prev, '']);
  };

  const removeSlot = (idx) => {
    const copy = slots.filter((_, i) => i !== idx);
    setSlots(copy.length ? copy : ['']);
  };

  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    const cleaned = slots.map(s => s && s.trim()).filter(Boolean);
    if (cleaned.length === 0) return setError('Please propose at least 1 slot.');
    if (![4, 6].includes(Number(classes))) return setError('Classes must be 4 or 6.');

    // convert to ISO
    const proposedSlots = cleaned.map(s => {
      // If user provided local datetime (no timezone), browser gives local -> toISOString
      const d = new Date(s);
      return d.toISOString();
    });

    const payload = { toUser, type, classes: Number(classes), proposedSlots };

    try {
      setLoading(true);
      const res = await api.post('/api/requests', payload);
      if (onDone) onDone(res.data);
      else {
        // default: navigate to sent requests or close
        // consumer can handle navigation in onDone
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('RequestForm submit error', err);
      setError(err?.response?.data?.message || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">Send Request</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="paid">Paid</option>
                <option value="exchange">Exchange</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Classes</label>
              <select
                value={classes}
                onChange={(e) => setClasses(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                <option value={4}>4 classes</option>
                <option value={6}>6 classes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Proposed slots</label>
            <p className="text-xs text-gray-500 mb-2">Add 1–6 datetime suggestions (local time). Instructor will choose one.</p>

            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={slot}
                    onChange={(e) => updateSlot(idx, e.target.value)}
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    className="px-3 py-2 rounded bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
                    aria-label="Remove slot"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={addSlot}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                + Add slot
              </button>

              <div className="ml-auto text-xs text-gray-500">Max 6 slots</div>
            </div>
          </div>

          {/* optional: intervalDays helper for auto schedule after payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Preferred spacing (days)</label>
              <input
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-400 mt-1">Used if you want automatic scheduling (frontend can send this on payment).</p>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Preview</label>
              <div className="border rounded p-2 text-xs text-gray-600">
                {type === 'paid' ? 'Paid flow — pay after accept → meeting created' : 'Exchange flow — meeting created after accept (no payment)'}
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
