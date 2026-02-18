"use client";
import React, { useState, useEffect, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);
  const [userName, setUserName] = useState("");

  const profileMenuRef = useRef(null);

  // 🔥 Decode JWT to get username
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;

    try {
      const decoded = jwtDecode(t);
      setUserName(decoded.name || decoded.fullName || decoded.email || "User");
    } catch {
      setUserName("User");
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const handleChangePassword = () => setCpOpen(true);

  /* Icons */
  const MenuIcon = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );

  const XMarkIcon = () => (
    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const ChevronDownIcon = ({ open }) => (
    <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const UserCircleIcon = () => (
    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a7.5 7.5 0 0113 0" />
    </svg>
  );

  const KeyIcon = () => (
    <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="8.5" cy="15.5" r="3.5" />
      <path d="M10 17l6-6" />
      <path d="M18 7l4 4" />
    </svg>
  );

  const LogoutIcon = () => (
    <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
      <path d="M9 19H5a2 2 0 01-2-2V7a2 2 0 012-2h4" />
    </svg>
  );

  return (
    <>
      <header className="bg-gray-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">

          {/* Left */}
          <div className="flex items-center gap-3">
            <UserCircleIcon />

            {/* 🔥 Username badge */}
            <span className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-1 rounded-full text-sm font-medium">
              {userName}
            </span>
          </div>

          {/* Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <button onClick={handleChangePassword} className="flex items-center">
              <KeyIcon /> Change Password
            </button>

            <button onClick={handleLogout} className="flex items-center">
              <LogoutIcon /> Logout
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button onClick={() => setProfileMenuOpen(!profileMenuOpen)} className="flex items-center gap-1">
                Profile <ChevronDownIcon open={profileMenuOpen} />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded shadow">
                  <button onClick={handleChangePassword} className="block w-full px-4 py-2 text-left hover:bg-orange-100">
                    Change Password
                  </button>
                  <button onClick={handleLogout} className="block w-full px-4 py-2 text-left hover:bg-orange-100">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <XMarkIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* Modal */}
      <ChangePasswordModal open={cpOpen} onClose={() => setCpOpen(false)} />
    </>
  );
}

export default TopBar;
