import React, { useEffect, useState, useRef } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/notifications");
      setNotes(res.data || []);
    } catch (err) {
      console.error("Notification fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  // close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notes.filter((n) => !n.read).length;

  const markRead = async (n) => {
    try {
      await api.put(`/api/notifications/${n._id}/read`);
      setNotes((prev) =>
        prev.map((x) =>
          x._id === n._id ? { ...x, read: true } : x
        )
      );

      // Navigate if notification has a related request/meeting
      if (n.relatedRequest) {
        navigate(`/requests`);
      }
    } catch (err) {
      console.error("Mark read error", err);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded hover:bg-gray-100"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border shadow-lg rounded-xl p-3 z-50">
          <h3 className="text-sm font-semibold mb-2">Notifications</h3>

          {loading && (
            <div className="flex items-center justify-center p-4 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}

          {!loading && notes.length === 0 && (
            <p className="text-xs text-gray-500 p-3 text-center">
              No notifications
            </p>
          )}

          <div className="max-h-72 overflow-y-auto space-y-2">
            {notes.map((n) => (
              <div
                key={n._id}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  n.read ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                }`}
                onClick={() => markRead(n)}
              >
                <div className="text-sm text-gray-800">{n.message}</div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </div>

                {!n.read && (
                  <div className="mt-1 text-xs flex items-center gap-1 text-blue-600">
                    <Check className="w-3 h-3" /> mark as read
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
