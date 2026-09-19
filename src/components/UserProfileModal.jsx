import React, { useState } from "react";
import {
  X,
  User,
  Mail,
  Shield,
  Hash,
  CheckCircle2,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  Volume2,
  VolumeX,
  Palette,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import api from "../services/api";
import audioService from "../services/audioService";
import { useTheme } from "../context/ThemeContext";

export default function UserProfileModal({ isOpen, onClose, user, onLogout }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState("profile");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState("");

  // Sound preference state
  const [soundEnabled, setSoundEnabled] = useState(audioService.isAudioEnabled());
  const [soundTested, setSoundTested] = useState(false);

  // Theme context
  const { currentTheme, setCurrentTheme, THEME_PRESETS } = useTheme();

  const displayName = user?.name || user?.username || "Authenticated User";
  const displayRole = (user?.role || "Staff").toUpperCase();
  const displayEmail = user?.email || "No email registered";
  const identifier = user?.employee_code
    ? user.employee_code
    : user?.employee_id || user?.employeeId
    ? `EMP-${String(user.employee_id || user.employeeId).padStart(4, "0")}`
    : "";

  // Handle Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError("");
    setPassSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setPassError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError("New password and confirm password do not match.");
      return;
    }

    setIsSubmittingPass(true);
    try {
      await api("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setPassSuccess("Your password has been changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err?.message ||
        "Failed to update password. Please check your current password.";
      setPassError(msg);
    } finally {
      setIsSubmittingPass(false);
    }
  };

  // Handle Sound Toggle
  const handleToggleSound = () => {
    const newState = audioService.toggleAudio();
    setSoundEnabled(newState);
  };

  // Test Chime Sound
  const handleTestChime = () => {
    audioService.playNewOrderSound();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Card */}
      <div
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 transition-all transform animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 pt-5 pb-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Account & Settings</h3>
                <p className="text-[11px] text-slate-400">Manage credentials and application preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-1.5 rounded-2xl bg-white/10 p-1 border border-white/5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("profile");
                setPassError("");
                setPassSuccess("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "profile"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              My Profile
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("password");
                setPassError("");
                setPassSuccess("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "password"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Change Password
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("preferences");
                setPassError("");
                setPassSuccess("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === "preferences"
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Preferences
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* ========================================================
              TAB 1: MY PROFILE
          ======================================================== */}
          {activeTab === "profile" && (
            <div className="space-y-4">
              {/* Profile Card Summary */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-xl font-bold text-white shadow-md">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{displayName}</h2>
                    <p className="text-xs font-medium text-slate-500">@{user?.username || "user"}</p>
                    <span className="mt-1 inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase tracking-wider">
                      {displayRole}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Access Role</p>
                      <p className="text-xs font-bold text-slate-800">{displayRole}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-500">Authorized</span>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</p>
                    <p className="text-xs font-semibold text-slate-800 truncate">{displayEmail}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                      <Hash className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Staff Identifier</p>
                      <p className="text-xs font-mono font-bold text-slate-800">{identifier}</p>
                    </div>
                  </div>
                  {identifier && (
                    <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                      ID VERIFIED
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Prompt */}
              <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200/70 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Need to update your password or turn off alert sounds? Switch to the <strong>Change Password</strong> or <strong>Preferences</strong> tab above.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: CHANGE PASSWORD
          ======================================================== */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Status alerts */}
              {passError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{passError}</span>
                </div>
              )}

              {passSuccess && (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{passSuccess}</span>
                </div>
              )}

              <p className="text-xs text-slate-500">
                To protect shared bar terminals, you must verify your current password before saving a new one.
              </p>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (min 6 characters) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingPass}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {isSubmittingPass ? "Verifying & Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}

          {/* ========================================================
              TAB 3: PREFERENCES (SOUND & THEME)
          ======================================================== */}
          {activeTab === "preferences" && (
            <div className="space-y-5">
              {/* Sound Notifications Toggle */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        soundEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Audio & Order Chimes</p>
                      <p className="text-[11px] text-slate-500">
                        {soundEnabled ? "Audible alerts enabled for new tickets" : "Sound muted for all alerts"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      soundEnabled ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        soundEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Test Sound Button */}
                {soundEnabled && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Test the order chime output:</span>
                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-100 transition"
                    >
                      {soundTested ? "Playing Chime..." : "Play Test Bell"}
                    </button>
                  </div>
                )}
              </div>

              {/* Theme Selection */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Palette className="h-4 w-4 text-slate-500" />
                  <p className="text-xs font-bold text-slate-800">Interface Color Theme</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {THEME_PRESETS?.map((preset) => {
                    const isSelected = currentTheme === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCurrentTheme(preset.id)}
                        className={`flex items-center justify-between rounded-xl p-3 border transition text-left ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-4 w-4 rounded-full border border-white/30 shadow-sm"
                            style={{ backgroundColor: preset.colorHex }}
                          />
                          <span className="text-xs font-semibold">{preset.name}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log Out
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
