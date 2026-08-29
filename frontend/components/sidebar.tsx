'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import {
  Music, Star, Settings, Plus, Search,
  MessageSquare, X, Trash2, Loader2, Edit2, Check, LogOut, User,
  KeyRound, SlidersHorizontal, PanelLeftClose, PanelLeftOpen, Eye, EyeOff,
  HelpCircle, ChevronRight, ArrowLeft, AlertTriangle,
  LayoutGrid, AlignJustify,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useChat } from '@/context/chat-context';
import { useAuth } from '@/context/auth-context';
import { useSidebar } from '@/context/sidebar-context';

const MUSIC_LIBRARY_GROUPS = [
  { name: 'Scales', defaultSlug: 'major_scales', slugs: ['major_scales','natural_minor_scales','harmonic_minor_scales','melodic_minor_scales','chromatic_scales','major_pentatonic_scales','minor_pentatonic_scales','blues_scales','whole_tone_scales','diminished_scales','bebop_scales'] },
  { name: 'Modes', defaultSlug: 'ionian_mode', slugs: ['ionian_mode','dorian_mode','phrygian_mode','lydian_mode','mixolydian_mode','aeolian_mode','locrian_mode'] },
  { name: 'Chords', defaultSlug: 'major_chords', slugs: ['major_chords','minor_chords','diminished_chords','augmented_chords','suspended_chords','dominant_seventh_chords','major_seventh_chords','minor_seventh_chords','half_diminished_chords','fully_diminished_chords','sixth_chords','ninth_chords','eleventh_chords','thirteenth_chords','altered_chords'] },
  { name: 'Arpeggios', defaultSlug: 'major_arpeggios', slugs: ['major_arpeggios','minor_arpeggios','diminished_arpeggios','augmented_arpeggios','dominant_seventh_arpeggios','major_seventh_arpeggios','minor_seventh_arpeggios'] },
  { name: 'Intervals', defaultSlug: 'interval_unison', slugs: ['interval_unison','interval_minor_second','interval_major_second','interval_minor_third','interval_major_third','interval_perfect_fourth','interval_tritone','interval_perfect_fifth','interval_minor_sixth','interval_major_sixth','interval_minor_seventh','interval_major_seventh','interval_octave'] },
  { name: 'Notation', defaultSlug: 'notation_clefs', slugs: ['notation_clefs','notation_dynamics','notation_articulations','notation_tempo_markings','notation_repeats','notation_endings','notation_pedal_markings','notation_ornaments','notation_slurs','notation_ties','notation_tuplets'] },
  { name: 'Music Theory', defaultSlug: 'circle_of_fifths', slugs: ['circle_of_fifths','key_signatures','time_signatures','scale_degrees','chord_functions','harmonic_progressions','cadences','modes_theory','voice_leading'] },
];

// ─── How to Use Guide Data ────────────────────────────────────────────────────

const HOW_TO_USE_GUIDE = [
  {
    page: 'Practice Studio',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    sections: [
      { heading: 'What is Practice Studio?', body: 'Your AI-powered sheet music coach. Upload a PDF or image of sheet music and Treble will analyse the score — extracting key/time signatures, chord progressions, difficulty rating, voice-leading audits, scale warmup recommendations, and more.' },
      { heading: 'Uploading Sheet Music', body: 'Click the upload area or drag a PDF or image file onto it. The score is converted to a rendered image and its musical content is analysed automatically. Supported: PDF, PNG, JPG.' },
      { heading: 'The Piano', body: 'The interactive piano highlights left-hand and right-hand notes from your uploaded score. Click any key to hear it played with a real piano sound. You can record a sequence of notes and send them to the AI for feedback.' },
      { heading: 'AI Chat', body: 'Ask the AI anything about the piece — fingering tips, scale warmup routines, how to tackle a difficult passage, or general practice strategies. You can also start a chat without uploading a file.' },
      { heading: 'Follow-up Suggestions', body: 'After each AI reply, up to 3 follow-up question chips appear below the message. Click one to send it instantly as your next question.' },
    ],
  },
  {
    page: 'Theory Tutor',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    sections: [
      { heading: 'What is Theory Tutor?', body: 'A dedicated music theory chatbot. Ask anything — intervals, chord functions, voice leading, counterpoint, harmonic analysis, ear training, Roman numeral analysis, or any other music-theory topic.' },
      { heading: 'Starting a Conversation', body: 'Type your question and press Enter or click Send. Each conversation is saved and listed in the sidebar. Click any past chat to continue it.' },
      { heading: 'Searching Past Chats', body: 'Use the search bar at the top of the sidebar to find any past Theory Tutor conversation. It searches both chat titles and message content.' },
      { heading: 'Custom AI Tone', body: 'Go to Settings → AI Instructions → Theory Tutor to personalise how the AI responds — for example: "explain like I\'m a complete beginner", "always provide a musical example", "be concise and formal".' },
    ],
  },
  {
    page: 'Music Library',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    sections: [
      { heading: 'What is the Music Library?', body: 'A reference encyclopedia of music theory. Browse scales, modes, chords, arpeggios, intervals, and notation symbols. Each entry shows the formula, note names, and a piano diagram.' },
      { heading: 'Browsing Categories', body: 'Use the left sidebar to jump to a category — Scales, Modes, Chords, Arpeggios, Intervals, Notation, or Music Theory. Sub-navigation tabs let you drill into specific types within each category.' },
      { heading: 'Searching', body: 'Type in the search bar to filter entries by name. Entering "c" shows only entries whose name contains "c" — e.g. "C Major Scale", "Chromatic Scale". For best results use at least 2–3 characters.' },
      { heading: 'Bookmarks', body: 'Click the star (★) on any reference card to bookmark it. All bookmarks appear in the Favorites section in the sidebar for quick access.' },
      { heading: 'Listening to a Scale or Chord', body: 'Click the Play button on any reference card to hear the scale, chord, or arpeggio played back note-by-note using a real piano sound.' },
    ],
  },
];

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="p-2 bg-red-500/10 rounded-xl shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
        </div>
        <p className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed">{message}</p>
        <div className="flex border-t border-border/20">
          <button
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors border-r border-border/20"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── How to Use Page (inside modal) ──────────────────────────────────────────

function HowToUsePage({ onBack }: { onBack: () => void }) {
  return (
    <>
      {/* Back header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <div className="flex-1 flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">How to Use TrebleAI</h2>
        </div>
      </div>

      {/* Guide content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent px-6 py-5 space-y-8">
        {HOW_TO_USE_GUIDE.map(topic => (
          <div key={topic.page}>
            {/* Page heading */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${topic.bg} border ${topic.border} mb-4`}>
              <span className={`text-xs font-bold ${topic.color}`}>{topic.page}</span>
            </div>
            {/* Sections */}
            <div className="space-y-5">
              {topic.sections.map(sec => (
                <div key={sec.heading}>
                  <h4 className="text-xs font-bold text-foreground mb-1">{sec.heading}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{sec.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-b border-border/15" />
          </div>
        ))}
        <div className="h-2" />
      </div>
    </>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────

type ModalPage = 'main' | 'howto';

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useSidebar();
  const { clearAllSessions } = useChat();
  const router = useRouter();

  const [modalPage, setModalPage] = useState<ModalPage>('main');

  // AI instructions
  const [practiceText, setPracticeText] = useState(settings.practiceInstructions);
  const [theoryText, setTheoryText] = useState(settings.theoryInstructions);
  const [instructionsSaved, setInstructionsSaved] = useState(false);

  // Change password
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Clear confirm popup
  const [clearConfirm, setClearConfirm] = useState<'practice' | 'theory' | null>(null);

  const handleSaveInstructions = () => {
    updateSettings({ practiceInstructions: practiceText, theoryInstructions: theoryText });
    setInstructionsSaved(true);
    setTimeout(() => setInstructionsSaved(false), 2000);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { toast.error('Please fill in all password fields.'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords do not match.'); return; }
    if (newPw.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.detail || 'Failed to change password.'); }
      else {
        toast.success('Password updated successfully!');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setShowPwForm(false);
      }
    } catch { toast.error('Network error. Please try again.'); }
    finally { setPwLoading(false); }
  };

  const handleClearChats = (type: 'practice' | 'theory') => {
    clearAllSessions(type);
    router.push(type === 'practice' ? '/practice-studio' : '/theory-tutor');
    toast.success(`Cleared all ${type === 'practice' ? 'Practice' : 'Theory'} chats.`);
    setClearConfirm(null);
  };

  // Escape closes modal (only when no confirm dialog is open)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !clearConfirm) {
        if (modalPage === 'howto') setModalPage('main');
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, modalPage, clearConfirm]);

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div
          className="relative bg-card border border-border/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {modalPage === 'howto' ? (
            <HowToUsePage onBack={() => setModalPage('main')} />
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Settings className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">Settings</h2>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/65 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent divide-y divide-border/20">

                {/* ── Profile ── */}
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Profile</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-background/50 border border-border/20">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Logged in as</p>
                      <p className="text-sm font-semibold text-foreground">{user?.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPwForm(v => !v)}
                    className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {showPwForm ? 'Cancel password change' : 'Change password'}
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPwForm ? 'rotate-90' : ''}`} />
                  </button>

                  {showPwForm && (
                    <div className="space-y-3 p-4 rounded-xl bg-background/40 border border-border/20">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Current Password</label>
                        <div className="relative">
                          <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password"
                            className="w-full pr-9 pl-3 py-2 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground/60 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
                          <button onClick={() => setShowCurrentPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">New Password</label>
                        <div className="relative">
                          <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 6 characters"
                            className="w-full pr-9 pl-3 py-2 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground/60 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
                          <button onClick={() => setShowNewPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Confirm New Password</label>
                        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password"
                          onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                          className="w-full pl-3 py-2 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground/60 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
                      </div>
                      <Button onClick={handleChangePassword} disabled={pwLoading} className="w-full h-8 text-xs bg-gradient-primary hover:shadow-glow text-white font-semibold">
                        {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Password'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── AI Instructions ── */}
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">AI Instructions</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Personalise how Treble speaks to you. These instructions are appended to the system prompt for each agent.
                  </p>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Practice Studio</label>
                    <textarea value={practiceText} onChange={e => setPracticeText(e.target.value)} rows={3}
                      placeholder="e.g. Talk to me like a friend, avoid technical jargon, use simple analogies…"
                      className="w-full px-3 py-2 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground/50 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none leading-relaxed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Theory Tutor</label>
                    <textarea value={theoryText} onChange={e => setTheoryText(e.target.value)} rows={3}
                      placeholder="e.g. Be concise and formal, always include a musical example, no code blocks…"
                      className="w-full px-3 py-2 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground/50 rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none leading-relaxed" />
                  </div>
                  <Button onClick={handleSaveInstructions}
                    className={`h-8 text-xs font-semibold transition-all ${instructionsSaved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' : 'bg-gradient-primary hover:shadow-glow text-white'}`}>
                    {instructionsSaved ? <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Saved!</span> : 'Save Instructions'}
                  </Button>
                </div>

                {/* ── How to Use ── */}
                <div className="px-6 py-5">
                  <button
                    onClick={() => setModalPage('howto')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-background/40 hover:bg-background/60 border border-border/20 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-primary/10 rounded-lg">
                        <HelpCircle className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">How to Use TrebleAI</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Guides for Practice Studio, Theory Tutor & Music Library</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>

                {/* ── Danger Zone: Clear Chat History ── */}
                <div className="px-6 py-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Clear Chat History</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Permanently delete all conversations. This cannot be undone.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setClearConfirm('practice')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Practice Chats
                    </button>
                    <button
                      onClick={() => setClearConfirm('theory')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear Theory Chats
                    </button>
                  </div>
                </div>

              </div>

              {/* Footer: Logout */}
              <div className="px-6 py-4 border-t border-border/30 shrink-0">
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Clear-all confirmation popup (above the modal) */}
      {clearConfirm && (
        <ConfirmDialog
          title={`Clear all ${clearConfirm === 'practice' ? 'Practice Studio' : 'Theory Tutor'} chats?`}
          message={`This will permanently delete every ${clearConfirm === 'practice' ? 'Practice Studio' : 'Theory Tutor'} conversation. There is no way to recover them.`}
          confirmLabel="Yes, clear all"
          onConfirm={() => handleClearChats(clearConfirm)}
          onCancel={() => setClearConfirm(null)}
        />
      )}
    </>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { collapsed, toggleCollapsed, layoutMode, setLayoutMode, toggleLayoutMode } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Per-session delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; type: 'practice' | 'theory' } | null>(null);

  const {
    theorySessions, practiceSessions,
    lastActiveTheorySessionId, lastActivePracticeSessionId,
    renameSession, deleteSession,
  } = useChat();
  const { user } = useAuth();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [theorySearch, setTheorySearch] = useState('');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Mobile drawer events
  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener('treble_sidebar_toggle', handleToggle);
    window.addEventListener('treble_sidebar_close', handleClose);
    return () => {
      window.removeEventListener('treble_sidebar_toggle', handleToggle);
      window.removeEventListener('treble_sidebar_close', handleClose);
    };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname, searchParams]);

  const [favoritesCount, setFavoritesCount] = useState(0);
  const loadFavorites = () => {
    try {
      const favs = localStorage.getItem('treble_favorites');
      setFavoritesCount(favs ? (JSON.parse(favs) as string[]).length : 0);
    } catch {}
  };
  useEffect(() => {
    loadFavorites();
    window.addEventListener('treble_recents_updated', loadFavorites);
    return () => window.removeEventListener('treble_recents_updated', loadFavorites);
  }, []);

  const activeCategory = pathname === '/music-library' ? (searchParams.get('category') || 'major_scales') : '';
  const currentSessionId = searchParams.get('sessionId') || '';

  // Grouped sessions (filtered by practiceSearch)
  const groupedPractice = useMemo(() => {
    const today: any[] = [], yesterday: any[] = [], older: any[] = [];
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startYesterday = startToday - 86400000;
    const q = practiceSearch.trim().toLowerCase();
    const filtered = q
      ? practiceSessions.filter(s =>
          s.title.toLowerCase().includes(q) ||
          (s.messages || []).some((m: any) => m.content.toLowerCase().includes(q))
        )
      : practiceSessions;
    filtered.forEach(s => {
      const t = new Date(s.timestamp).getTime();
      if (t >= startToday) today.push(s);
      else if (t >= startYesterday) yesterday.push(s);
      else older.push(s);
    });
    return { today, yesterday, older };
  }, [practiceSessions, practiceSearch]);

  const filteredTheory = useMemo(() => {
    const q = theorySearch.trim().toLowerCase();
    if (!q) return theorySessions;
    return theorySessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.messages || []).some((m: any) => m.content.toLowerCase().includes(q))
    );
  }, [theorySessions, theorySearch]);

  const handleStartRename = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation(); e.preventDefault();
    setEditingSessionId(id); setEditTitle(title);
  };
  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent, type: 'theory' | 'practice', id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;
    const ok = await renameSession(type, id, editTitle.trim());
    if (ok) setEditingSessionId(null);
  };
  const handleCancelRename = (e: React.MouseEvent) => { e.stopPropagation(); setEditingSessionId(null); };

  // Show custom confirm dialog instead of browser confirm()
  const handleDeleteSession = (e: React.MouseEvent, type: 'theory' | 'practice', id: string, title: string) => {
    e.stopPropagation(); e.preventDefault();
    setDeleteConfirm({ id, title, type });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    setDeleteConfirm(null);
    const ok = await deleteSession(type, id);
    if (ok && currentSessionId === id) router.push(type === 'theory' ? '/theory-tutor' : '/practice-studio');
  };

  const renderSessionRow = (session: any, type: 'theory' | 'practice') => {
    const isActive = currentSessionId === session.id;
    const isEditing = editingSessionId === session.id;

    if (isEditing) {
      return (
        <div key={session.id} className="w-full flex items-center gap-1.5 px-2 py-1 bg-card/65 border border-border/40 rounded-lg">
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveRename(e, type, session.id);
              if (e.key === 'Escape') handleCancelRename(e as any);
            }}
            autoFocus
            className="flex-1 min-w-0 bg-transparent text-xs text-foreground focus:outline-none" />
          <button onClick={e => handleSaveRename(e, type, session.id)} className="p-0.5 text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={handleCancelRename} className="p-0.5 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
        </div>
      );
    }

    const href = type === 'theory' ? `/theory-tutor?sessionId=${session.id}` : `/practice-studio?sessionId=${session.id}`;
    return (
      <Link key={session.id} href={href}
        className={`group relative w-full flex items-center justify-between rounded-lg text-left text-xs truncate transition-all duration-200 border cursor-pointer ${
          isActive
            ? 'bg-primary/10 text-foreground font-bold border-primary/20 border-l-2 border-l-primary pl-2.5 pr-3 py-1.5 shadow-sm'
            : 'text-muted-foreground hover:bg-card/45 hover:text-foreground border-transparent px-3 py-1.5'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 mr-8">
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{session.title}</span>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card/85 via-card/75 to-transparent pl-3 py-0.5">
          <button onClick={e => handleStartRename(e, session.id, session.title)} className="text-muted-foreground hover:text-primary p-0.5" title="Rename">
            <Edit2 className="w-3 h-3" />
          </button>
          <button onClick={e => handleDeleteSession(e, type, session.id, session.title)} className="text-muted-foreground hover:text-red-400 p-0.5" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Link>
    );
  };

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return isActive
      ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold shadow-sm text-sm'
      : 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/45 border border-transparent transition-all text-sm';
  };

  const renderContextual = () => {
    if (!isMounted) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary/50" /></div>;

    if (pathname === '/practice-studio') {
      const hasResults = groupedPractice.today.length + groupedPractice.yesterday.length + groupedPractice.older.length > 0;
      return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Button onClick={() => router.push('/practice-studio')} className="w-full bg-gradient-primary hover:shadow-glow text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 h-9 shrink-0 shadow-glow" size="sm">
            <Plus className="w-4 h-4" /> New Chat
          </Button>

          {/* ── Layout Toggle ── only on practice-studio ── */}
          <div className="flex items-center gap-1 p-1 bg-background/40 border border-border/20 rounded-lg shrink-0" title="Switch layout">
            <button
              onClick={() => setLayoutMode('studio')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${layoutMode === 'studio' ? 'bg-primary/15 text-primary border border-primary/20 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              Studio
            </button>
            <button
              onClick={() => setLayoutMode('classic')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${layoutMode === 'classic' ? 'bg-card/65 text-foreground border border-border/30 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <AlignJustify className="w-3.5 h-3.5 shrink-0" />
              Classic
            </button>
          </div>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search history..." value={practiceSearch} onChange={e => setPracticeSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {groupedPractice.today.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Today</h5>
                {groupedPractice.today.map(s => renderSessionRow(s, 'practice'))}
              </div>
            )}
            {groupedPractice.yesterday.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Yesterday</h5>
                {groupedPractice.yesterday.map(s => renderSessionRow(s, 'practice'))}
              </div>
            )}
            {groupedPractice.older.length > 0 && (
              <div className="space-y-1">
                <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Older</h5>
                {groupedPractice.older.map(s => renderSessionRow(s, 'practice'))}
              </div>
            )}
            {!hasResults && (
              <div className="text-center py-6 px-3 border border-dashed border-border/20 rounded-xl">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {practiceSearch ? 'No matching chats.' : 'No practice chats yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (pathname === '/theory-tutor') {
      return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <Button onClick={() => { router.push('/theory-tutor'); window.dispatchEvent(new Event('treble_new_chat_theory')); }}
            className="w-full bg-gradient-primary hover:shadow-glow text-white text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 h-9 shrink-0 shadow-glow" size="sm">
            <Plus className="w-4 h-4" /> New Chat
          </Button>
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input type="text" placeholder="Search history..." value={theorySearch} onChange={e => setTheorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-card border border-border/30 text-foreground placeholder:text-muted-foreground rounded-lg focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Conversations</h5>
            {filteredTheory.map(s => renderSessionRow(s, 'theory'))}
            {filteredTheory.length === 0 && (
              <div className="text-center py-6 px-3 border border-dashed border-border/20 rounded-xl">
                <p className="text-[10px] text-muted-foreground leading-relaxed">{theorySearch ? 'No matching chats.' : 'Ask Treble a theory question.'}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (pathname === '/music-library') {
      return (
        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="space-y-1 shrink-0">
            <h5 className="text-[10px] font-bold text-muted-foreground tracking-wider px-3 mb-1.5">Saved & Bookmarks</h5>
            <button onClick={() => router.push('/music-library?category=favorites')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition-all duration-200 ${activeCategory === 'favorites' ? 'bg-primary/10 text-primary font-semibold border border-primary/15 shadow-sm' : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'}`}>
              <span className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />Favorites</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground">{favoritesCount}</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <h5 className="text-[10px] font-bold text-muted-foreground tracking-wider px-3">Categories</h5>
            <div className="space-y-1">
              {MUSIC_LIBRARY_GROUPS.map(g => (
                <button key={g.name} onClick={() => router.push(`/music-library?category=${g.defaultSlug}`)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all duration-200 ${g.slugs.includes(activeCategory) ? 'bg-primary/10 text-primary font-semibold border border-primary/15' : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'}`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">Bookmarks</h5>
        <button onClick={() => router.push('/music-library?category=favorites')}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs text-muted-foreground hover:bg-card/40 hover:text-foreground transition-colors">
          <span className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />My Bookmarks</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/20 text-muted-foreground font-semibold">{favoritesCount}</span>
        </button>
      </div>
    );
  };

  // ── Collapsed icon-only sidebar ────────────────────────────────────────────
  const iconOnlySidebar = (
    <div className="h-full flex flex-col items-center py-4 gap-3 bg-card/45 border-r border-border/30 backdrop-blur-md">
      <Link href="/" className="p-2 bg-gradient-primary rounded-lg hover:shadow-glow transition-shadow mb-1" title="TrebleAI">
        <Music className="w-5 h-5 text-white" />
      </Link>
      <button onClick={toggleCollapsed} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors" title="Expand sidebar">
        <PanelLeftOpen className="w-4 h-4" />
      </button>
      <div className="w-8 border-t border-border/25 my-1" />
      <Link href={isMounted && lastActivePracticeSessionId ? `/practice-studio?sessionId=${lastActivePracticeSessionId}` : '/practice-studio'}
        className={`p-2 rounded-lg transition-colors ${pathname === '/practice-studio' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-card/45'}`}
        title="Practice Studio">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="2" /><path d="M6 3v12M10 3v12M14 3v12M18 3v12M2 15h20" />
        </svg>
      </Link>
      <Link href={isMounted && lastActiveTheorySessionId ? `/theory-tutor?sessionId=${lastActiveTheorySessionId}` : '/theory-tutor'}
        className={`p-2 rounded-lg transition-colors ${pathname === '/theory-tutor' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-card/45'}`}
        title="Theory Tutor">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </Link>
      <Link href="/music-library"
        className={`p-2 rounded-lg transition-colors ${pathname === '/music-library' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-card/45'}`}
        title="Music Library">
        <Music className="w-4 h-4" />
      </Link>

      {/* Layout toggle — icon rail, only on practice-studio */}
      {pathname === '/practice-studio' && (
        <>
          <div className="w-8 border-t border-border/25 my-1" />
          <button
            onClick={toggleLayoutMode}
            className={`p-2 rounded-lg transition-colors ${layoutMode === 'studio' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-card/60'}`}
            title={layoutMode === 'studio' ? 'Switch to Classic layout' : 'Switch to Studio layout'}
          >
            {layoutMode === 'studio' ? <LayoutGrid className="w-4 h-4" /> : <AlignJustify className="w-4 h-4" />}
          </button>
        </>
      )}

      <div className="flex-1" />
      <button onClick={() => setShowSettings(true)}
        className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center hover:shadow-glow transition-shadow"
        title={`${user?.username ?? 'Account'} · Settings`}>
        <span className="text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase() || '?'}</span>
      </button>
    </div>
  );

  // ── Full expanded sidebar ──────────────────────────────────────────────────
  const expandedSidebar = (
    <div className="h-full flex flex-col justify-between p-4 bg-card/45 border-r border-border/30 backdrop-blur-md relative">
      {mobileOpen && (
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg bg-card/65 border border-border/30 text-foreground md:hidden hover:bg-card transition-colors z-50">
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Logo + collapse toggle */}
      <div className="space-y-6 shrink-0">
        <div className="flex items-center justify-between border-b border-border/20 pb-4 md:pb-0 md:border-b-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-primary rounded-lg group-hover:shadow-glow transition-shadow shrink-0">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">TrebleAI</span>
          </Link>
          <button onClick={toggleCollapsed} className="hidden md:flex p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors" title="Collapse sidebar">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile nav */}
        <div className="space-y-1 md:hidden">
          <Link href={isMounted && lastActivePracticeSessionId ? `/practice-studio?sessionId=${lastActivePracticeSessionId}` : '/practice-studio'} className={getLinkClass('/practice-studio')}>Practice Studio</Link>
          <Link href={isMounted && lastActiveTheorySessionId ? `/theory-tutor?sessionId=${lastActiveTheorySessionId}` : '/theory-tutor'} className={getLinkClass('/theory-tutor')}>Theory Tutor</Link>
          <Link href="/music-library" className={getLinkClass('/music-library')}>Music Library</Link>
        </div>
      </div>

      <div className="my-4 border-t border-border/25 w-full shrink-0" />

      {/* Dynamic contextual area */}
      <div className="flex-1 flex flex-col min-h-0">
        {renderContextual()}
      </div>

      <div className="my-4 border-t border-border/25 w-full shrink-0" />

      {/* User avatar → Settings */}
      <div className="shrink-0">
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-card/50 border border-transparent hover:border-border/30 transition-all group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center shrink-0 group-hover:shadow-glow transition-shadow">
            <span className="text-white font-bold text-sm">{user?.username?.charAt(0).toUpperCase() || '?'}</span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{user?.username}</p>
            <p className="text-[10px] text-muted-foreground">Settings & preferences</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop permanent sidebar */}
      <aside className={`hidden md:block h-screen fixed top-0 left-0 z-30 transition-all duration-300 ${collapsed ? 'w-14' : 'w-64'}`}>
        {collapsed ? iconOnlySidebar : expandedSidebar}
      </aside>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full z-10 flex flex-col">{expandedSidebar}</aside>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Per-session delete confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          title={`Delete "${deleteConfirm.title}"?`}
          message="This conversation will be permanently deleted and cannot be recovered."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}
