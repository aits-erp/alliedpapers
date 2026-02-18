"use client";
import { useState } from "react";

export default function ChangePasswordModal({ open, onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (!open) return null;

  async function handleSubmit() {
    if (!oldPassword || !newPassword) return setMsg("Fill all fields");
    if (newPassword !== confirm) return setMsg("Passwords do not match");

    setLoading(true);
    setMsg("");

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) return setMsg(data.message);

    setMsg("Password changed successfully");
    setOldPassword("");
    setNewPassword("");
    setConfirm("");

    setTimeout(onClose, 1000);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>

        <input
          type="password"
          placeholder="Old Password"
          className="border p-2 w-full mb-3"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="New Password"
          className="border p-2 w-full mb-3"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="border p-2 w-full mb-3"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        {msg && <p className="text-sm text-red-500 mb-2">{msg}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-orange-600 text-white rounded"
          >
            {loading ? "Saving..." : "Change"}
          </button>
        </div>
      </div>
    </div>
  );
}
