import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../components/NotificationBell";

export default function Navbar({ toggleSidebar }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    { label: "Discover", path: "/discover" },
    { label: "Meetings", path: "/meetings" },
    { label: "Requests", path: "/requests" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 lg:px-8 h-16 flex items-center justify-between">

        {/* ---------------- LEFT AREA ---------------- */}
        <div className="flex items-center gap-4">

          {/* Sidebar toggle */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Logo */}
          <a href="/" className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">
              S
            </div>
            <span>SkillSwap</span>
          </a>

          {/* Desktop LINKS */}
          <div className="hidden md:flex items-center gap-2 ml-4">
            {links.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- RIGHT AREA ---------------- */}
        <div className="hidden md:flex items-center gap-4">

          {/* Notification Bell */}
          <NotificationBell />

          {/* Your profile avatar coming later */}
        </div>

        {/* MOBILE MENU BUTTON */}
        <div className="md:hidden absolute right-4">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* ---------------- MOBILE DROPDOWN MENU ---------------- */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => {
                navigate(link.path);
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition"
            >
              {link.label}
            </button>
          ))}

          {/* Mobile Notifications */}
          <div className="px-4 py-3 border-t border-gray-200">
            <NotificationBell />
          </div>
        </div>
      )}
    </nav>
  );
}
