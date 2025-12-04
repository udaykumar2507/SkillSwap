import React from 'react';
import { Home, Users, LogIn, UserPlus, User, LogOut, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!localStorage.getItem("ss_token");

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/discover', icon: Users, label: 'Discover' },
  ];

  if (!isLoggedIn) {
    navItems.push(
      { path: '/login', icon: LogIn, label: 'Login' },
      { path: '/register', icon: UserPlus, label: 'Register' }
    );
  } else {
    navItems.push(
      { path: '/profile/edit', icon: User, label: 'Edit Profile' }
    );
  }

  const handleLogout = () => {
    localStorage.removeItem("ss_token");
    navigate('/login');
  };

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 lg:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-lg border-r border-gray-200 z-50
          transform transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-64"}
        `}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">SkillSwap</h1>

          {/* Close button for mobile */}
          <button className="lg:hidden" onClick={() => setIsOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* NAVIGATION */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item, i) => {
              const Icon = item.icon;
              const active = location.pathname === item.path;

              return (
                <li key={i}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* LOGOUT */}
        {isLoggedIn && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
