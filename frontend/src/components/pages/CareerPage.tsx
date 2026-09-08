"use client";
// ============================================================
// CareerPage - AI-powered career guidance from interests & skills
// ============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Compass,
  Sparkles,
  Loader2,
  X,
  Plus,
  TrendingUp,
  GraduationCap,
  Briefcase,
  Star,
  Code,
  Heart,
  Lightbulb,
  Target,
  Rocket,
  Palette,
  Stethoscope,
  Scale,
  Building2,
  Mic2,
  Calculator,
  Wrench,
} from 'lucide-react';
import { ai } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/context/LanguageContext';
import PageHero from "@/components/common/PageHero";

// --------------- animation helpers ---------------

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

// --------------- career icon mapping ---------------

const careerIcons = {
  technology: Code,
  engineering: Wrench,
  medicine: Stethoscope,
  healthcare: Stethoscope,
  law: Scale,
  business: Building2,
  finance: Calculator,
  art: Palette,
  design: Palette,
  music: Mic2,
  science: Lightbulb,
  education: GraduationCap,
  default: Briefcase,
};

function getCareerIcon(career) {
  const name = (career.name || career.title || '').toLowerCase();
  const field = (career.field || career.category || '').toLowerCase();
  const combined = `${name} ${field}`;

  for (const [key, Icon] of Object.entries(careerIcons)) {
    if (key !== 'default' && combined.includes(key)) return Icon;
  }
  return careerIcons.default;
}

// --------------- growth badge colors ---------------

function getGrowthColor(growth) {
  const g = (growth || '').toLowerCase();
  if (g.includes('high') || g.includes('excellent') || g.includes('strong'))
    return 'bg-green-100 text-green-700 border-green-200';
  if (g.includes('medium') || g.includes('moderate') || g.includes('good'))
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (g.includes('low') || g.includes('declining'))
    return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-primary-100 text-primary-700 border-primary-200';
}

// --------------- Tag input component ---------------

function TagInput({ label, icon: Icon, tags, setTags, placeholder, color, inputId = '' }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const colorMap = {
    indigo: {
      tag: 'bg-primary-100 text-[#1e40af] border-primary-200',
      icon: 'text-[#1e40af]',
    },
    purple: {
      tag: 'bg-primary-100 text-[#1e40af] border-primary-200',
      icon: 'text-[#1e40af]',
    },
  };

  const colors = colorMap[color] || colorMap.indigo;

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
        <Icon className={`w-4 h-4 ${colors.icon}`} />
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#1e40af] focus-within:border-transparent min-h-[48px] transition-all">
        {tags.map((tag) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${colors.tag}`}
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          data-tag-input={inputId}
          placeholder={tags.length === 0 ? placeholder : 'Type and press Enter...'}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none placeholder-gray-400"
        />
      </div>
    </div>
  );
}

// --------------- Loading dots ---------------

function LoadingDots() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e40af] to-[#5b7cf7] flex items-center justify-center text-white">
        <Sparkles className="w-7 h-7" />
      </div>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-[#1e40af]"
            animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <p className="text-sm text-gray-500 font-medium">Analyzing your profile and finding careers...</p>
    </div>
  );
}

// --------------- Career Card ---------------

function CareerCard({ career, index = 0 }) {
  const { t } = useTranslation();
  const Icon = getCareerIcon(career);
  const growthText =
    career.growth || career.growthProspects || career.growth_prospects || career.outlook || '';
  const requiredSkills =
    career.requiredSkills || career.required_skills || career.skills || [];
  const educationPath =
    career.educationPath || career.education_path || career.education || '';
  const description =
    career.description || career.summary || '';
  const name = career.name || career.title || career.career || 'Career';
  const salary = career.salary || career.salaryRange || career.salary_range || '';
  const matchPct = career.match || career.matchPercentage || career.match_percentage || null;

  const gradients = [
    'from-primary-500 to-primary-600',
    'from-primary-500 to-pink-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-red-500',
    'from-cyan-500 to-primary-600',
    'from-primary-500 to-primary-600',
  ];
  const grad = gradients[index % gradients.length];

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden group"
    >
      {/* Colored top strip */}
      <div className={`h-1.5 bg-gradient-to-r ${grad}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900">{name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {growthText && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getGrowthColor(growthText)}`}>
                  <TrendingUp className="w-3 h-3" />
                  {growthText}
                </span>
              )}
              {matchPct && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-100 text-primary-700 border border-primary-200">
                  <Target className="w-3 h-3" />
                  {matchPct}% match
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{description}</p>
        )}

        {/* Salary */}
        {salary && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400 font-medium">Salary:</span>
            <span className="text-gray-800 font-semibold">{salary}</span>
          </div>
        )}

        {/* Required Skills */}
        {requiredSkills.length > 0 && (
          <div>
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              {t('career.requiredSkills', 'Required Skills')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(requiredSkills) ? requiredSkills : [requiredSkills]).slice(0, 6).map(
                (skill, idx) => (
                  <span key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium border border-gray-100">
                    {skill}
                  </span>
                )
              )}
              {requiredSkills.length > 6 && (
                <span className="text-xs text-gray-400 px-2 py-1">+{requiredSkills.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* Education Path */}
        {educationPath && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-primary-50 border border-primary-100">
            <GraduationCap className="w-4 h-4 text-[#1e40af] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[11px] font-bold text-[#1e40af] uppercase tracking-wider mb-0.5">
                {t('career.educationPath', 'Education Path')}
              </h4>
              <p className="text-xs text-primary-800 leading-relaxed">{educationPath}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function CareerPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [careers, setCareers] = useState([]);

  const handleSubmit = async () => {
    // Auto-add any text still in the input fields
    const interestInputEl = document.querySelector('[data-tag-input="interests"]') as HTMLInputElement;
    const skillInputEl = document.querySelector('[data-tag-input="skills"]') as HTMLInputElement;
    let finalInterests = [...interests];
    let finalSkills = [...skills];
    if (interestInputEl?.value?.trim()) {
      const v = interestInputEl.value.trim();
      if (!finalInterests.includes(v)) finalInterests.push(v);
      setInterests(finalInterests);
      interestInputEl.value = '';
    }
    if (skillInputEl?.value?.trim()) {
      const v = skillInputEl.value.trim();
      if (!finalSkills.includes(v)) finalSkills.push(v);
      setSkills(finalSkills);
      skillInputEl.value = '';
    }

    if (finalInterests.length === 0 && finalSkills.length === 0) {
      toast.error(
        t('career.addSomething', 'Please add at least one interest or skill. Press Enter after typing.')
      );
      return;
    }

    setLoading(true);
    setCareers([]);

    try {
      const res = await ai.careerGuidance({ interests: finalInterests, skills: finalSkills });
      const careerList =
        res.careers || res.recommendations || res.data?.careers || res.results || [];
      setCareers(Array.isArray(careerList) ? careerList : []);

      if (
        (Array.isArray(careerList) ? careerList : []).length === 0
      ) {
        toast('No career suggestions found. Try adding more details.', { icon: '🔍' });
      }
    } catch (err) {
      toast.error(err.message || t('common.error', 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  // Quick suggestion chips
  const interestSuggestions = ['Technology', 'Medicine', 'Art & Design', 'Space', 'Business', 'Music', 'Sports', 'Environment'];
  const skillSuggestions = ['Python', 'Communication', 'Drawing', 'Mathematics', 'Leadership', 'Writing', 'Problem Solving'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Hero */}
      <PageHero title="Career Guidance" subtitle="Discover career paths tailored to your interests and skills.">
        <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
          <Compass className="w-4 h-4 text-white/80" />
          <span className="text-xs text-white/80 font-medium">AI-Powered</span>
        </div>
      </PageHero>

        {/* ======== Input Form ======== */}
        <motion.section
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e40af] to-[#5b7cf7] flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              {t('career.tellUs', 'Tell Us About Yourself')}
            </h2>
          </div>

          <div className="p-6 space-y-5">
            <TagInput
              label={t('career.interests', 'Your Interests')}
              icon={Heart}
              tags={interests}
              setTags={setInterests}
              placeholder="e.g., Artificial Intelligence, Space, Music..."
              color="indigo"
              inputId="interests"
            />
            {/* Quick add chips for interests */}
            {interests.length < 3 && (
              <div className="flex flex-wrap gap-2 -mt-2">
                {interestSuggestions.filter(s => !interests.includes(s)).slice(0, 5).map(s => (
                  <button key={s} onClick={() => setInterests([...interests, s])}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-[#1e40af] hover:text-[#1e40af] hover:bg-primary-50 transition-all flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {s}
                  </button>
                ))}
              </div>
            )}

            <TagInput
              label={t('career.skills', 'Your Skills')}
              icon={Star}
              tags={skills}
              setTags={setSkills}
              placeholder="e.g., Python, Public Speaking, Drawing..."
              color="purple"
              inputId="skills"
            />
            {/* Quick add chips for skills */}
            {skills.length < 3 && (
              <div className="flex flex-wrap gap-2 -mt-2">
                {skillSuggestions.filter(s => !skills.includes(s)).slice(0, 5).map(s => (
                  <button key={s} onClick={() => setSkills([...skills, s])}
                    className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-all flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {s}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1e40af] to-[#5b7cf7] text-white font-semibold text-sm hover:shadow-lg hover:shadow-primary-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('career.analyzing', 'Analyzing your profile...')}
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5" />
                  {t('career.findCareers', 'Find Career Paths')}
                </>
              )}
            </button>
          </div>
        </motion.section>

        {/* ======== Loading State ======== */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm"
            >
              <LoadingDots />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ======== Results ======== */}
        <AnimatePresence>
          {!loading && careers.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#1e40af]" />
                  {t('career.recommendations', 'Recommended Careers')}
                </h2>
                <span className="text-sm text-gray-400">
                  {careers.length} {careers.length === 1 ? 'career' : 'careers'} found
                </span>
              </div>

              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {careers.map((career, idx) => (
                  <CareerCard key={career.id || career._id || idx} career={career} index={idx} />
                ))}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
    </div>
  );
}
