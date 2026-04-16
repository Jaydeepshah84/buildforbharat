"use client";
// ============================================================
// SettingsPage - Language, Profile, Theme, and About
// ============================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Settings,
  Globe,
  User,
  Palette,
  Info,
  Check,
  Loader2,
  Save,
  Mail,
  GraduationCap,
  Shield,
  Smartphone,
  Users,
} from 'lucide-react';
import { auth } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// --------------- Language options ---------------

const languageOptions = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    flag: 'EN',
    description: 'Default language',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    flag: 'HI',
    description: 'भारत की राजभाषा',
  },
  {
    code: 'gu',
    label: 'Gujarati',
    nativeLabel: 'ગુજરાતી',
    flag: 'GU',
    description: 'ગુજરાતની ભાષા',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    flag: 'ES',
    description: 'Idioma global',
  },
];

// --------------- Section wrapper ---------------

function SettingsSection({ icon: Icon, title, children }) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Icon className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();

  // Profile editing
  const [name, setName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingParent, setSavingParent] = useState(false);

  // Initialize name and parent email from user/backend
  useEffect(() => {
    if (user) {
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.name ||
        user.displayName ||
        '';
      setName(displayName);

      // Fetch parent email from backend
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";
      const token = localStorage.getItem("token") || "";
      fetch(`${API}/auth/profile`, {
        headers: { "Authorization": `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data?.user?.parent_email) setParentEmail(data.user.parent_email);
        })
        .catch(() => {});
    }
  }, [user]);

  // Derived user info
  const email = user?.email || user?.user_metadata?.email || '';
  const role = user?.user_metadata?.role || user?.role || 'student';
  const studentClass =
    user?.user_metadata?.class ||
    user?.user_metadata?.grade ||
    user?.class ||
    user?.grade ||
    '';

  // --------------- Handlers ---------------

  const handleLanguageChange = (code) => {
    setLanguage(code);
    toast.success(
      t('settings.languageChanged', 'Language updated successfully!')
    );
  };

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error(t('settings.nameRequired', 'Name cannot be empty.'));
      return;
    }

    setSavingName(true);
    try {
      await auth.updateProfile({ name: trimmed });
      toast.success(t('settings.nameSaved', 'Name updated successfully!'));
    } catch (err: any) {
      toast.error(err.message || t('common.error', 'Something went wrong.'));
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveParentEmail = async () => {
    const trimmed = parentEmail.trim();
    if (!trimmed) {
      toast.error('Parent email cannot be empty.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSavingParent(true);
    try {
      await auth.updateProfile({ parent_email: trimmed });
      toast.success('Parent email saved! They will receive progress reports.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save parent email.');
    } finally {
      setSavingParent(false);
    }
  };

  // --------------- Render ---------------

  return (
    <div className="min-h-screen bg-gray-50/50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Page header */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('settings.title', 'Settings')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('settings.subtitle', 'Manage your preferences and account')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* ======== Language Section ======== */}
          <SettingsSection
            icon={Globe}
            title={t('settings.language', 'Language')}
          >
            <p className="text-sm text-gray-500 mb-4">
              {t(
                'settings.languageDescription',
                'Choose your preferred language for the interface.'
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languageOptions.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20'
                    }`}
                  >
                    {/* Language flag/code badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {lang.flag}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {lang.nativeLabel}
                      </p>
                      <p className="text-xs text-gray-500">{lang.description}</p>
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </SettingsSection>

          {/* ======== Profile Section ======== */}
          <SettingsSection
            icon={User}
            title={t('settings.profile', 'Profile')}
          >
            <div className="space-y-5">
              {/* Name - editable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('settings.displayName', 'Display Name')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={t('settings.namePlaceholder', 'Enter your name')}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {t('settings.save', 'Save')}
                  </button>
                </div>
              </div>

              {/* Parent/Guardian Email - editable */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400" />
                  Parent/Guardian Email
                  <span className="text-xs text-gray-400 font-normal ml-1">(for progress reports)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#284ce3]/20 focus:border-[#284ce3]"
                    placeholder="parent@example.com"
                  />
                  <button
                    onClick={handleSaveParentEmail}
                    disabled={savingParent}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#284ce3] text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingParent ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                </div>
                {parentEmail && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Progress reports will be sent to this email
                  </p>
                )}
              </div>

              {/* Read-only fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {t('settings.email', 'Email')}
                  </label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">
                    {email || '-'}
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    {t('settings.role', 'Role')}
                  </label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 capitalize">
                    {role || '-'}
                  </div>
                </div>

                {/* Class */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                    {t('settings.class', 'Class')}
                  </label>
                  <div className="px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">
                    {studentClass || '-'}
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* ======== Theme Section (Placeholder) ======== */}
          <SettingsSection
            icon={Palette}
            title={t('settings.theme', 'Theme')}
          >
            <div className="flex items-center gap-4 py-4">
              <div className="flex gap-3">
                {/* Light theme */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl border-2 border-indigo-500 bg-white flex items-center justify-center shadow-sm cursor-pointer">
                    <div className="w-10 h-2 rounded-full bg-gray-200" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {t('settings.light', 'Light')}
                  </span>
                </div>

                {/* Dark theme */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl border-2 border-gray-200 bg-gray-800 flex items-center justify-center cursor-pointer opacity-50">
                    <div className="w-10 h-2 rounded-full bg-gray-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {t('settings.dark', 'Dark')}
                  </span>
                </div>

                {/* System theme */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-white to-gray-800 flex items-center justify-center cursor-pointer opacity-50">
                    <Smartphone className="w-5 h-5 text-gray-500" />
                  </div>
                  <span className="text-xs font-medium text-gray-400">
                    {t('settings.system', 'System')}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-400 italic ml-4">
                {t('settings.themeComingSoon', 'Dark mode and system theme coming soon.')}
              </p>
            </div>
          </SettingsSection>

          {/* ======== Learning Preferences ======== */}
          <SettingsSection
            icon={Palette}
            title="Learning Preferences"
          >
            <div className="space-y-4 py-2">
              {/* Low Bandwidth Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Low Bandwidth Mode</p>
                  <p className="text-xs text-gray-400">Reduces data usage. Ideal for slow connections / rural areas.</p>
                </div>
                <button
                  onClick={() => {
                    const curr = localStorage.getItem('low_bandwidth') === 'true';
                    localStorage.setItem('low_bandwidth', !curr);
                    window.location.reload();
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    localStorage.getItem('low_bandwidth') === 'true' ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    localStorage.getItem('low_bandwidth') === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Webcam Emotion Detection */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Webcam Emotion Detection</p>
                  <p className="text-xs text-gray-400">AI adapts lessons based on your facial expressions.</p>
                </div>
                <button
                  onClick={() => {
                    const curr = localStorage.getItem('webcam_enabled') !== 'false';
                    localStorage.setItem('webcam_enabled', !curr);
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    localStorage.getItem('webcam_enabled') !== 'false' ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    localStorage.getItem('webcam_enabled') !== 'false' ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Subtitles */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show Subtitles</p>
                  <p className="text-xs text-gray-400">Display text captions during voice narration.</p>
                </div>
                <button
                  onClick={() => {
                    const curr = localStorage.getItem('subtitles') !== 'false';
                    localStorage.setItem('subtitles', !curr);
                  }}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    localStorage.getItem('subtitles') !== 'false' ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    localStorage.getItem('subtitles') !== 'false' ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* ======== About Section ======== */}
          <SettingsSection
            icon={Info}
            title={t('settings.about', 'About')}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {t('settings.appName', 'App Name')}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  AI Education Platform
                </span>
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {t('settings.version', 'Version')}
                </span>
                <span className="text-sm font-semibold text-gray-900">1.0.0</span>
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {t('settings.builtWith', 'Built With')}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  React + Tailwind CSS
                </span>
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">
                  {t('settings.poweredBy', 'Powered By')}
                </span>
                <span className="text-sm font-semibold text-indigo-600">
                  AI / Gemini
                </span>
              </div>
            </div>
          </SettingsSection>
        </motion.div>
      </div>
    </div>
  );
}
