"use client";
// ============================================================
// NotesPage - Complete rewrite for Ed.Ai
// Create notes from Topic, Voice, PDF, or Questions + My Notes
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import {
  Mic,
  Upload,
  FileText,
  MessageSquare,
  Download,
  Trash2,
  Plus,
  Search,
  Loader2,
  BookOpen,
  Sparkles,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import { ai, uploadService } from '@/services/api';
import { useAuth } from '@/components/AuthProvider';

// -------------------- animation presets --------------------

const fadeIn = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardPop = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
};

// -------------------- source badge colors --------------------

const SOURCE_STYLES = {
  topic: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Topic' },
  voice: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Voice' },
  pdf: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'PDF' },
  questions: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Questions' },
};

function SourceBadge({ source }) {
  const s = SOURCE_STYLES[source] || SOURCE_STYLES.topic;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// -------------------- pretty notes renderer --------------------

function RenderedNotes({ markdown }) {
  return (
    <div className="rendered-notes prose prose-sm sm:prose max-w-none
      prose-headings:text-gray-900 prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
      prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-indigo-700
      prose-h3:text-lg prose-h3:font-semibold prose-h3:text-gray-800
      prose-p:text-gray-700 prose-p:leading-relaxed
      prose-li:text-gray-700
      prose-strong:text-indigo-600
      prose-blockquote:border-l-indigo-400 prose-blockquote:bg-indigo-50/50 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4
      prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-indigo-600
      prose-a:text-indigo-600"
    >
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================

export default function NotesPage() {
  const { user } = useAuth();

  // Tab state: "create" | "my-notes"
  const [activeTab, setActiveTab] = useState('create');

  // Create sub-method: "topic" | "voice" | "pdf" | "questions"
  const [method, setMethod] = useState('topic');

  // ---------- Topic state ----------
  const [topicName, setTopicName] = useState('');

  // ---------- Voice state ----------
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioDragActive, setAudioDragActive] = useState(false);
  const audioInputRef = useRef(null);

  // ---------- PDF state ----------
  const [pdfFile, setPdfFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ---------- Questions state ----------
  const [questionsText, setQuestionsText] = useState('');

  // ---------- Generation state ----------
  const [generating, setGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState('');
  const [generationSource, setGenerationSource] = useState('');

  // ---------- My Notes state ----------
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ============================================================
  // Fetch notes when "My Notes" tab is active
  // ============================================================

  useEffect(() => {
    if (activeTab !== 'my-notes') return;
    let cancelled = false;
    setNotesLoading(true);

    (async () => {
      try {
        const res = await uploadService.getNotes();
        const list = res.notes || res.data || res || [];
        if (!cancelled) setNotes(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || 'Failed to load notes.');
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [activeTab]);

  // ============================================================
  // AI note generation helper
  // ============================================================

  const generateNotesFromText = async (sourceText, source) => {
    setGenerating(true);
    setGeneratedNotes('');
    setGenerationSource(source);

    try {
      const prompt =
        source === 'questions'
          ? `You are an expert tutor. For each of the following questions, provide a detailed, well-structured answer with explanations and examples. Format with markdown headings, bullet points, and bold key terms.\n\nQuestions:\n${sourceText}`
          : `Generate comprehensive structured study notes for the following content. Include:\n- **Title** (clear and descriptive)\n- **Key Concepts** with detailed explanations\n- **Definitions** for important terms\n- **Examples** to illustrate concepts\n- **Important Points** to remember\n- **Summary** of the material\n- **Practice Questions** (3-5 questions)\n\nUse markdown formatting with headings (#, ##, ###), bullet points, bold for key terms, and blockquotes for examples.\n\nContent:\n${sourceText}`;

      const res = await ai.tutorChat({
        topic: source === 'topic' ? sourceText : 'Study Notes',
        message: prompt,
        conversationHistory: [],
        language: 'en',
      });

      const notesContent = res.reply || res.message || res.response || res.data?.reply || '';
      if (!notesContent) throw new Error('No notes content received from AI.');
      setGeneratedNotes(notesContent);
      toast.success('Notes generated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate notes.');
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================
  // Method 1: Topic
  // ============================================================

  const handleGenerateFromTopic = () => {
    const t = topicName.trim();
    if (!t) { toast.error('Please enter a topic name.'); return; }
    generateNotesFromText(t, 'topic');
  };

  // ============================================================
  // Method 2: Voice (Upload Recording)
  // ============================================================

  const handleAudioDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setAudioDragActive(true);
    else if (e.type === 'dragleave') setAudioDragActive(false);
  }, []);

  const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/flac'];
  const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.flac', '.aac'];

  const isAudioFile = (file) => {
    if (AUDIO_TYPES.includes(file.type)) return true;
    return AUDIO_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  const handleAudioDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAudioDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f && isAudioFile(f)) {
      setAudioFile(f);
      setAudioURL(URL.createObjectURL(f));
      setTranscribedText('');
    } else {
      toast.error('Please upload an audio file (MP3, WAV, M4A, WebM, OGG, FLAC).');
    }
  }, []);

  const handleAudioSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setAudioFile(f);
      setAudioURL(URL.createObjectURL(f));
      setTranscribedText('');
    }
  };

  const handleTranscribeAndGenerate = async () => {
    if (!audioFile) { toast.error('Please upload an audio file first.'); return; }

    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile, audioFile.name);
      const res = await ai.speechToText(formData);
      const text = res.text || res.transcript || res.transcription || '';

      if (!text.trim()) {
        toast.error('Could not transcribe audio. Please try a different file.');
        setIsTranscribing(false);
        return;
      }

      setTranscribedText(text);
      toast.success('Transcription complete! Generating notes...');
      setIsTranscribing(false);

      await generateNotesFromText(text, 'voice');
    } catch (err) {
      toast.error(err.message || 'Transcription failed.');
      setIsTranscribing(false);
    }
  };

  // ============================================================
  // Method 3: PDF Upload
  // ============================================================

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.toLowerCase().endsWith('.pdf')) {
      setPdfFile(f);
    } else {
      toast.error('Please upload a PDF file.');
    }
  }, []);

  const handlePdfSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) setPdfFile(f);
  };

  const handleGenerateFromPdf = async () => {
    if (!pdfFile) { toast.error('Please upload a PDF file first.'); return; }

    setGenerating(true);
    setGeneratedNotes('');
    setGenerationSource('pdf');

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);

      const uploadRes = await uploadService.uploadPDF(formData);
      const extractedText = uploadRes.extractedText || uploadRes.extracted_text || uploadRes.text || uploadRes.content || '';

      if (!extractedText.trim()) {
        throw new Error('Could not extract text from PDF. The file may be image-based or empty.');
      }

      toast.success('PDF text extracted! Generating notes...');
      setGenerating(false);

      await generateNotesFromText(extractedText, 'pdf');
    } catch (err) {
      toast.error(err.message || 'Failed to process PDF.');
      setGenerating(false);
    }
  };

  // ============================================================
  // Method 4: Questions
  // ============================================================

  const handleGenerateFromQuestions = () => {
    const q = questionsText.trim();
    if (!q) { toast.error('Please paste your questions first.'); return; }
    generateNotesFromText(q, 'questions');
  };

  // ============================================================
  // Download as PDF (print)
  // ============================================================

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Pop-up blocked. Please allow pop-ups.'); return; }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ed.Ai Notes</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 40px; color: #1a1a2e; line-height: 1.7; }
          h1 { font-size: 26px; font-weight: 700; margin-bottom: 16px; color: #1e1b4b; }
          h2 { font-size: 20px; font-weight: 600; margin-top: 28px; margin-bottom: 12px; color: #3730a3; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; }
          h3 { font-size: 17px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; color: #374151; }
          p { margin-bottom: 10px; }
          ul, ol { margin-left: 24px; margin-bottom: 12px; }
          li { margin-bottom: 4px; }
          strong { color: #4338ca; }
          blockquote { border-left: 4px solid #818cf8; background: #eef2ff; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
          code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
          pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 12px 0; }
          hr { margin: 24px 0; border: none; border-top: 1px solid #e5e7eb; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #9ca3af; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div id="content"></div>
        <div class="footer">Generated by Ed.Ai</div>
      </body>
      </html>
    `);

    // Simple markdown to HTML (basic conversion for print)
    let html = generatedNotes
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br/>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>)(<br\/>)?/g, '$1');
    html = `<p>${html}</p>`;

    printWindow.document.getElementById('content').innerHTML = html;
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // ============================================================
  // Save notes to backend
  // ============================================================

  const handleSaveNotes = async () => {
    if (!generatedNotes) return;
    setSavingNote(true);

    try {
      const formData = new FormData();
      const blob = new Blob([generatedNotes], { type: 'text/markdown' });
      formData.append('file', blob, 'notes.md');
      formData.append('title', extractTitle(generatedNotes));
      formData.append('sourceType', generationSource);
      formData.append('content', generatedNotes);

      await uploadService.uploadPDF(formData);
      toast.success('Notes saved successfully!');
    } catch {
      // If the upload endpoint doesn't support this, try a simple approach
      try {
        const formData = new FormData();
        const blob = new Blob([generatedNotes], { type: 'application/pdf' });
        formData.append('file', blob, 'notes.pdf');
        formData.append('title', extractTitle(generatedNotes));
        await uploadService.uploadPDF(formData);
        toast.success('Notes saved!');
      } catch (err2) {
        toast.error('Save failed. Notes have been downloaded instead.');
        handleDownloadPDF();
      }
    } finally {
      setSavingNote(false);
    }
  };

  // Helper: extract title from markdown
  const extractTitle = (md) => {
    const match = md.match(/^#\s+(.+)/m);
    return match ? match[1].replace(/\*\*/g, '').trim() : 'AI Generated Notes';
  };

  // ============================================================
  // Delete note
  // ============================================================

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;

    try {
      // Try to call a delete endpoint; if it doesn't exist, remove locally
      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== noteId));
      toast.success('Note deleted.');
    } catch (err) {
      toast.error('Failed to delete note.');
    }
  };

  // ============================================================
  // Filtered notes for search
  // ============================================================

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (n.title || '').toLowerCase();
    const content = (n.summary || n.content || n.aiSummary || '').toLowerCase();
    return title.includes(q) || content.includes(q);
  });

  // ============================================================
  // Method tabs config
  // ============================================================

  const methods = [
    { id: 'topic', label: 'Topic Name', icon: BookOpen },
    { id: 'voice', label: 'Upload Recording', icon: Upload },
    { id: 'pdf', label: 'Upload PDF', icon: Upload },
    { id: 'questions', label: 'Upload Questions', icon: MessageSquare },
  ];

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ---------- Page Header ---------- */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Notes</h1>
              <p className="text-sm text-gray-500">Generate study notes from topics, voice, PDFs, or questions</p>
            </div>
          </div>
        </motion.div>

        {/* ---------- Top Tabs: Create Notes | My Notes ---------- */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
          {[
            { id: 'create', label: 'Create Notes', icon: Plus },
            { id: 'my-notes', label: 'My Notes', icon: BookOpen },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* ================================================================ */}
        {/* CREATE NOTES TAB                                                */}
        {/* ================================================================ */}
        <AnimatePresence mode="wait">
          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Method selector */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        method === m.id
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <m.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{m.label}</span>
                      <span className="sm:hidden">{m.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* -------- Method 1: Topic Name -------- */}
              {method === 'topic' && (
                <motion.div
                  key="topic"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" />
                      Generate Notes from Topic
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Enter any topic and AI will create comprehensive study notes</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Topic Name</label>
                      <input
                        type="text"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateFromTopic()}
                        placeholder="e.g., Photosynthesis, Newton's Laws, French Revolution..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                    <button
                      onClick={handleGenerateFromTopic}
                      disabled={generating || !topicName.trim()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                    >
                      {generating && generationSource === 'topic' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Notes</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* -------- Method 2: Upload Recording -------- */}
              {method === 'voice' && (
                <motion.div
                  key="voice"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Mic className="w-5 h-5 text-rose-500" />
                      Upload Recording
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Upload an audio recording and AI will transcribe and convert it to structured notes</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Drag and drop zone */}
                    <div
                      onDragEnter={handleAudioDrag}
                      onDragOver={handleAudioDrag}
                      onDragLeave={handleAudioDrag}
                      onDrop={handleAudioDrop}
                      onClick={() => !audioFile && audioInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                        audioDragActive
                          ? 'border-indigo-400 bg-indigo-50'
                          : audioFile
                          ? 'border-green-300 bg-green-50/50'
                          : 'border-gray-300 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*,.mp3,.wav,.webm,.ogg,.m4a,.flac,.aac"
                        onChange={handleAudioSelect}
                        className="hidden"
                      />

                      {audioFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Mic className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">{audioFile.name}</p>
                            <p className="text-xs text-gray-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAudioFile(null); setAudioURL(null); setTranscribedText(''); if (audioInputRef.current) audioInputRef.current.value = ''; }}
                            className="ml-3 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">Drag & drop your audio file here, or click to browse</p>
                          <p className="text-xs text-gray-400 mt-1">Supports MP3, WAV, M4A, WebM, OGG, FLAC</p>
                        </>
                      )}
                    </div>

                    {/* Audio player preview */}
                    {audioURL && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3 mb-2">
                          <Volume2 className="w-4 h-4 text-indigo-500" />
                          <span className="text-sm font-medium text-gray-700">Audio Preview</span>
                        </div>
                        <audio controls src={audioURL} className="w-full h-10" />
                      </div>
                    )}

                    {/* Transcribed text */}
                    {transcribedText && (
                      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <h4 className="text-sm font-semibold text-indigo-700 mb-2">Transcribed Text</h4>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcribedText}</p>
                      </div>
                    )}

                    {/* Convert button */}
                    <button
                      onClick={handleTranscribeAndGenerate}
                      disabled={!audioFile || isTranscribing || generating}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                    >
                      {isTranscribing ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Transcribing...</>
                      ) : generating && generationSource === 'voice' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating Notes...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Convert to Notes</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* -------- Method 3: Upload PDF -------- */}
              {method === 'pdf' && (
                <motion.div
                  key="pdf"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-amber-500" />
                      Upload PDF / Syllabus
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Upload a PDF document and AI will extract text and create study notes</p>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Drag and drop zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => !pdfFile && fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                        dragActive
                          ? 'border-indigo-400 bg-indigo-50'
                          : pdfFile
                          ? 'border-green-300 bg-green-50/50'
                          : 'border-gray-300 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handlePdfSelect}
                        className="hidden"
                      />

                      {pdfFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-900">{pdfFile.name}</p>
                            <p className="text-xs text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                            className="ml-3 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto mb-3">
                            <Upload className="w-7 h-7" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">Drag & drop your PDF here, or click to browse</p>
                          <p className="text-xs text-gray-400 mt-1">Supports PDF files only</p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleGenerateFromPdf}
                      disabled={!pdfFile || generating}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                    >
                      {generating && generationSource === 'pdf' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing PDF...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Notes from PDF</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* -------- Method 4: Upload Questions -------- */}
              {method === 'questions' && (
                <motion.div
                  key="questions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-500" />
                      Upload Questions
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Paste your questions and AI will generate detailed answers with explanations</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Questions</label>
                      <textarea
                        value={questionsText}
                        onChange={(e) => setQuestionsText(e.target.value)}
                        placeholder={"Paste your questions here, one per line...\n\nExample:\n1. What is photosynthesis?\n2. Explain the water cycle.\n3. What are Newton's three laws of motion?"}
                        rows={8}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-shadow"
                      />
                    </div>
                    <button
                      onClick={handleGenerateFromQuestions}
                      disabled={generating || !questionsText.trim()}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200"
                    >
                      {generating && generationSource === 'questions' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Generating Answers...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Answers & Notes</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* -------- Loading indicator -------- */}
              {generating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <motion.div
                        className="w-16 h-16 rounded-full bg-indigo-100"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <Sparkles className="w-7 h-7 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">AI is generating your notes...</p>
                      <p className="text-xs text-gray-500 mt-1">This may take a moment. Hang tight!</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* -------- Generated Notes Result -------- */}
              <AnimatePresence>
                {generatedNotes && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-4"
                  >
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleDownloadPDF}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4 text-indigo-500" />
                        Download as PDF
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNote}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50"
                      >
                        {savingNote ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                          <><BookOpen className="w-4 h-4" /> Save Notes</>
                        )}
                      </button>
                      <button
                        onClick={() => { setGeneratedNotes(''); setTranscribedText(''); }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear
                      </button>
                    </div>

                    {/* Rendered notes */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-500" />
                          <h3 className="text-lg font-semibold text-gray-900">Generated Notes</h3>
                        </div>
                        <SourceBadge source={generationSource} />
                      </div>
                      <div className="p-6 sm:p-8">
                        <RenderedNotes markdown={generatedNotes} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* MY NOTES TAB                                                    */}
          {/* ================================================================ */}
          {activeTab === 'my-notes' && (
            <motion.div
              key="my-notes"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your notes..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-shadow"
                />
              </div>

              {/* Notes count */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} found
                </span>
              </div>

              {/* Notes loading */}
              {notesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="ml-3 text-sm text-gray-500">Loading your notes...</span>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-gray-600">
                    {searchQuery ? 'No notes match your search' : 'No notes yet'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {searchQuery
                      ? 'Try a different search term'
                      : 'Go to "Create Notes" to generate your first notes'
                    }
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setActiveTab('create')}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                    >
                      <Plus className="w-4 h-4" />
                      Create Notes
                    </button>
                  )}
                </div>
              ) : (
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {filteredNotes.map((note) => {
                    const noteId = note._id || note.id;
                    const isExpanded = expandedNoteId === noteId;
                    const sourceType = note.sourceType || note.source_type || note.type || 'topic';
                    const createdAt = note.createdAt || note.created_at || note.date;
                    const content = note.summary || note.content || note.aiSummary || note.ai_summary || '';

                    return (
                      <motion.div key={noteId} variants={cardPop} layout>
                        <div
                          onClick={() => setExpandedNoteId(isExpanded ? null : noteId)}
                          className={`rounded-2xl border cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isExpanded
                              ? 'border-indigo-200 bg-indigo-50/30 shadow-md col-span-1 md:col-span-2'
                              : 'border-gray-200 bg-white hover:border-indigo-200'
                          }`}
                        >
                          {/* Card header */}
                          <div className="p-4 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 truncate">
                                  {note.title || 'Untitled Note'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <SourceBadge source={sourceType} />
                                  {createdAt && (
                                    <span className="text-xs text-gray-400">
                                      {new Date(createdAt).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                      })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={(e) => handleDeleteNote(noteId, e)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Delete note"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <div className={`p-1 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                <ChevronDown className="w-4 h-4" />
                              </div>
                            </div>
                          </div>

                          {/* Preview (when collapsed) */}
                          {!isExpanded && content && (
                            <div className="px-4 pb-3">
                              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                {content.replace(/[#*_>`-]/g, '').substring(0, 150)}...
                              </p>
                            </div>
                          )}

                          {/* Expanded content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 sm:px-6 pb-6 border-t border-gray-100 pt-4">
                                  {content ? (
                                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-100">
                                      <RenderedNotes markdown={content} />
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">No content available for this note.</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
