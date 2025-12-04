import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';
import api from '../api';

export default function UserInfoBox() {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('ss_token');
    if (!token) return;

    const fetchUser = async () => {
      try {
        const res = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (err) {
        console.log('Not logged in');
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('ss_token');
    setUser(null);
    setIsOpen(false);
    navigate('/login');
  };

  const getInitials = (name, email) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const initials = getInitials(user?.name, user?.email);
  const userName = user?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div
      className="fixed top-2 right-30 z-50" // moved slightly upwards (top-2)
      ref={dropdownRef}
    >
      {!user ? (
        <button
          onClick={() => navigate('/login')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Sign In
        </button>
      ) : (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden shadow-md"> {/* slightly bigger (w-11 h-11) */}
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-semibold text-base">
                  {initials}
                </div>
              )}
            </div>

            <div className="hidden sm:flex flex-col items-start">
              <p className="text-sm font-semibold text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-600 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
              <button
                onClick={() => {
                  navigate('/my-profile');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User className="w-4 h-4 text-gray-600" />
                View Profile
              </button>

              <button
                onClick={() => {
                  navigate('/profile/edit');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 text-gray-600" />
                Edit Profile
              </button>

              <div className="border-t border-gray-100 my-2" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
