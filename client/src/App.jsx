import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import UserInfoBox from "./components/UserInfoBox";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DiscoverPage from "./pages/DiscoverPage";
import ProfilePage from "./pages/ProfilePage";
import MyProfilePage from "./pages/MyProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import RequestPage from "./pages/RequestPage";
import MeetingsPage from "./pages/MeetingsPage";
import MeetingDetailPage from "./pages/MeetingDetailPage";

function AppContent() {
  const location = useLocation();

  const hideUserBox =
    location.pathname === "/login" ||
    location.pathname === "/register";

  // DEFAULT: sidebar closed
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Sidebar */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Navbar (toggle button + brand + user box) */}
      <Navbar toggleSidebar={() => setIsOpen(!isOpen)} />

      {/* User Info */}
      {!hideUserBox && <UserInfoBox />}

      {/* Page content shift when sidebar open */}
      <div
        className={`
          transition-all duration-300
          pt-16
          ${isOpen ? "lg:ml-64" : "ml-0"}
        `}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/my-profile" element={<MyProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/requests" element={<RequestPage/>}></Route>
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    // <Router>
      <AppContent />
    // </Router>
  );
}
