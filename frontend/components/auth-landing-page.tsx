'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import ThemeToggle from '@/components/theme-toggle';
import {
  Music, Eye, EyeOff, Loader2, Info,
  ChevronRight, Sparkles, BookOpen, Library,
} from 'lucide-react';

// ── Piano ──────────────────────────────────────────────────────────────────────

// 2 octaves: C3 – B4 (29 white keys, 20 black keys)
const WHITE_NOTES = [
  'C3','D3','E3','F3','G3','A3','B3',
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5','A5','B5',
];

// Which positions have a black key to the right: 0=C,1=D skip E,3=F,4=G,5=A skip B
const HAS_BLACK_RIGHT = new Set([0,1,3,4,5]); // within each octave

function noteToMidi(note: string): number {
  const names: Record<string,number> = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 };
  const letter = note[0];
  const octave  = parseInt(note.slice(1));
  return (octave + 1) * 12 + names[letter];
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Derive black key notes from white key sequence
const BLACK_NOTES: (string | null)[] = [];
for (let w = 0; w < WHITE_NOTES.length; w++) {
  const note  = WHITE_NOTES[w];
  const step  = 'CDEFGAB'.indexOf(note[0]);
  const octave= note.slice(1);
  if (HAS_BLACK_RIGHT.has(step % 7)) {
    const sharpLetter = 'CDEFGAB'['CDEFGAB'.indexOf(note[0]) + 1] ?? 'C';
    BLACK_NOTES.push(note[0] + '#' + octave);
  } else {
    BLACK_NOTES.push(null);
  }
}
// Remove last since last white has no black to the right in this range
if (BLACK_NOTES.length > WHITE_NOTES.length) BLACK_NOTES.pop();

interface ActiveNote { note: string; startTime: number; }

function PianoKey({
  note, isBlack, isActive, onPress, onRelease,
}: {
  note: string; isBlack: boolean; isActive: boolean;
  onPress: (n: string) => void; onRelease: (n: string) => void;
}) {
  const base = isBlack
    ? `absolute z-10 top-0 w-[28px] h-[90px] rounded-b-md cursor-pointer select-none transition-all duration-75 ${
        isActive
          ? 'bg-gradient-to-b from-primary/80 to-primary shadow-glow/40'
          : 'bg-zinc-800 dark:bg-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-800'
      }`
    : `relative z-0 w-[44px] h-[150px] rounded-b-lg border border-border/40 cursor-pointer select-none transition-all duration-75 flex items-end justify-center pb-2 ${
        isActive
          ? 'bg-primary/20 border-primary/60 shadow-inner'
          : 'bg-white dark:bg-zinc-100 hover:bg-gray-50 dark:hover:bg-white'
      }`;

  return (
    <div
      className={base}
      onPointerDown={(e) => { e.preventDefault(); onPress(note); }}
      onPointerUp={() => onRelease(note)}
      onPointerLeave={() => onRelease(note)}
      title={note}
    >
      {!isBlack && (
        <span className="text-[9px] font-bold text-gray-400 select-none pointer-events-none">
          {note.replace(/\d/, '')}
        </span>
      )}
    </div>
  );
}

function InteractivePiano() {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [loaded, setLoaded]   = useState(false);
  const [loading, setLoading] = useState(false);
  const audioCtx  = useRef<AudioContext | null>(null);
  const buffers   = useRef<Map<string, AudioBuffer>>(new Map());
  const gainNodes = useRef<Map<string, GainNode>>(new Map());

  // Load soundfonts via soundfont-player CDN samples (Gleitz OGG)
  const loadSounds = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtx.current;
      // Load a handful of notes; we'll pitch-shift nearby ones
      const notesToLoad = ['C3','E3','G3','C4','E4','G4','C5','E5','G5'];
      await Promise.all(notesToLoad.map(async (note) => {
        const midi  = noteToMidi(note);
        const name  = note.replace('#', 's');
        const url   = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-ogg/${name}${midi >= 10 ? '' : '0'}.ogg`;
        // Build a proper soundfont URL: each file is named like C4.ogg
        const sfUrl = `https://gleitz.github.io/midi-js-soundfonts/MusyngKite/acoustic_grand_piano-ogg/${note.replace('#','s')}.ogg`;
        try {
          const resp = await fetch(sfUrl);
          const buf  = await resp.arrayBuffer();
          buffers.current.set(note, await ctx.decodeAudioData(buf));
        } catch {}
      }));
      setLoaded(true);
    } catch (err) {
      console.error('[Piano] soundfont load error:', err);
    } finally {
      setLoading(false);
    }
  }, [loaded, loading]);

  // Find closest loaded buffer for pitch-shifting
  const getBuffer = (note: string): { buf: AudioBuffer; semitones: number } | null => {
    if (buffers.current.has(note)) {
      return { buf: buffers.current.get(note)!, semitones: 0 };
    }
    const targetMidi = noteToMidi(note);
    let closest: string | null = null;
    let minDist = Infinity;
    for (const loaded of buffers.current.keys()) {
      const d = Math.abs(noteToMidi(loaded) - targetMidi);
      if (d < minDist) { minDist = d; closest = loaded; }
    }
    if (!closest) return null;
    return { buf: buffers.current.get(closest)!, semitones: targetMidi - noteToMidi(closest) };
  };

  const playNote = useCallback(async (note: string) => {
    if (!audioCtx.current) await loadSounds();
    if (audioCtx.current?.state === 'suspended') await audioCtx.current.resume();
    if (!loaded && !loading) { await loadSounds(); return; }
    if (!audioCtx.current) return;

    setActiveNotes(prev => new Set([...prev, note]));
    const ctx = audioCtx.current;
    const entry = getBuffer(note);
    if (!entry) return;

    const src  = ctx.createBufferSource();
    src.buffer = entry.buf;
    // Pitch-shift by detune (cents)
    src.detune.value = entry.semitones * 100;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    gainNodes.current.set(note, gain);
  }, [loaded, loading, loadSounds]);

  const releaseNote = useCallback((note: string) => {
    setActiveNotes(prev => { const s = new Set(prev); s.delete(note); return s; });
    const gain = gainNodes.current.get(note);
    if (gain && audioCtx.current) {
      gain.gain.cancelScheduledValues(audioCtx.current.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, audioCtx.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.4);
    }
  }, []);

  // Keyboard mappings (home row = white keys C4–B4)
  const keyMap: Record<string, string> = {
    a:'C4', s:'D4', d:'E4', f:'F4', g:'G4', h:'A4', j:'B4',
    k:'C5', l:'D5',
    w:'C#4', e:'D#4', t:'F#4', y:'G#4', u:'A#4',
    q:'C3', '2':'C#3', '3':'D#3',
  };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      const note = keyMap[e.key.toLowerCase()];
      if (note && !activeNotes.has(note)) playNote(note);
    };
    const up = (e: KeyboardEvent) => {
      const note = keyMap[e.key.toLowerCase()];
      if (note) releaseNote(note);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [activeNotes, playNote, releaseNote]);

  const handleFirstTouch = () => { if (!loaded && !loading) loadSounds(); };

  // Build white key + black key layout
  const whiteWidth = 46; // px
  const totalW = WHITE_NOTES.length * whiteWidth;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {loading ? 'Loading piano…' : loaded ? 'Play me · click keys or use keyboard (A–J)' : 'Click a key to load sounds'}
        </span>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
      </div>

      {/* Piano container */}
      <div
        className="relative select-none touch-none overflow-x-auto"
        style={{ width: '100%', maxWidth: `${totalW + 2}px` }}
        onPointerDown={handleFirstTouch}
      >
        <div className="relative flex" style={{ height: '152px', width: `${totalW}px` }}>
          {/* White keys */}
          {WHITE_NOTES.map((note, i) => (
            <div key={note} style={{ position: 'absolute', left: `${i * whiteWidth}px`, width: `${whiteWidth - 2}px` }}>
              <PianoKey
                note={note}
                isBlack={false}
                isActive={activeNotes.has(note)}
                onPress={playNote}
                onRelease={releaseNote}
              />
            </div>
          ))}

          {/* Black keys */}
          {WHITE_NOTES.map((note, i) => {
            const step = 'CDEFGAB'.indexOf(note[0]) % 7;
            if (!HAS_BLACK_RIGHT.has(step)) return null;
            const letters = 'CDEFGAB';
            const nextLetter = letters[letters.indexOf(note[0]) + 1];
            if (!nextLetter) return null;
            const blackNote = `${note[0]}#${note.slice(1)}`;
            const allBlackNotes: Record<string,string> = {
              'C#3':'C#3','D#3':'D#3','F#3':'F#3','G#3':'G#3','A#3':'A#3',
              'C#4':'C#4','D#4':'D#4','F#4':'F#4','G#4':'G#4','A#4':'A#4',
              'C#5':'C#5','D#5':'D#5','F#5':'F#5','G#5':'G#5','A#5':'A#5',
            };
            const bn = allBlackNotes[blackNote];
            if (!bn) return null;
            return (
              <div key={bn} style={{ position: 'absolute', left: `${i * whiteWidth + (whiteWidth - 2) * 0.65}px`, width: '28px', zIndex: 10 }}>
                <PianoKey
                  note={bn}
                  isBlack={true}
                  isActive={activeNotes.has(bn)}
                  onPress={playNote}
                  onRelease={releaseNote}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Feature cards ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <Music className="w-5 h-5" />,
    label: 'Practice Studio',
    color: '#5ECFCF',
    bg: 'rgba(94,207,207,.10)',
    desc: 'Upload any score — get instant analysis, MIDI playback, and AI coaching as you practice.',
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    label: 'Theory Tutor',
    color: '#8B8FD4',
    bg: 'rgba(139,143,212,.10)',
    desc: 'Interactive lessons in harmony, counterpoint, ear training — taught by an AI that remembers your progress.',
  },
  {
    icon: <Library className="w-5 h-5" />,
    label: 'Music Library',
    color: '#E07878',
    bg: 'rgba(224,120,120,.10)',
    desc: 'Your personal archive of scores, practice sessions, and analysis reports — all in one place.',
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    label: 'AI Analysis',
    color: '#A870C8',
    bg: 'rgba(168,112,200,.10)',
    desc: 'Deterministic score reports: key, difficulty, voice leading, fingering — in seconds.',
  },
];

// ── Auth form ─────────────────────────────────────────────────────────────────

function AuthForm() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin]           = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]               = useState<string | null>(null);

  const validate = (): boolean => {
    setError(null);
    const u = username.trim();
    if (!u) { setError('Username is required.'); return false; }
    if (u.length < 3 || u.length > 32) { setError('Username must be 3–32 characters.'); return false; }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) { setError('Letters, numbers, and underscores only.'); return false; }
    if (!password) { setError('Password is required.'); return false; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
    if (!isLogin && password !== confirmPassword) { setError('Passwords do not match.'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(username.trim(), password);
      } else {
        const ok = await signup(username.trim(), password, confirmPassword);
        if (ok) { setIsLogin(true); setPassword(''); setConfirmPassword(''); }
      }
    } catch { setError('An unexpected error occurred.'); }
    finally { setIsLoading(false); }
  };

  const toggle = () => {
    setIsLogin(p => !p); setError(null);
    setUsername(''); setPassword(''); setConfirmPassword('');
  };

  const inputCls = 'w-full px-4 py-2.5 text-sm bg-background border border-border/60 text-foreground placeholder:text-muted-foreground/50 rounded-xl focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all';

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30 mb-6">
        {['Sign In', 'Sign Up'].map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => { setIsLogin(i === 0); setError(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              isLogin === (i === 0)
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-xs text-destructive font-medium">
          <Info className="w-4 h-4 shrink-0 mt-px" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Username</label>
          <input type="text" required disabled={isLoading} value={username}
            onChange={e => setUsername(e.target.value)} placeholder="music_student" className={inputCls} />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} required disabled={isLoading}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" className={`${inputCls} pr-10`} />
            <button type="button" tabIndex={-1} onClick={() => setShowPassword(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Confirm Password</label>
            <input type={showPassword ? 'text' : 'password'} required disabled={isLoading}
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••" className={inputCls} />
          </div>
        )}

        <button type="submit" disabled={isLoading}
          className="w-full mt-2 py-2.5 rounded-xl bg-gradient-primary hover:shadow-glow text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" />{isLogin ? 'Signing in…' : 'Creating account…'}</>
            : <>{isLogin ? 'Sign In' : 'Create Account'}<ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button type="button" onClick={toggle}
          className="text-primary hover:underline font-bold">
          {isLogin ? 'Sign Up' : 'Sign In'}
        </button>
      </p>
    </div>
  );
}

// ── Main landing page ──────────────────────────────────────────────────────────

export default function AuthLandingPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-14 flex items-center px-6 md:px-10 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 flex-1">
          <div className="p-1.5 bg-gradient-primary rounded-lg">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">TrebleAI</span>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 md:py-32 px-6 md:px-10">

        {/* Background orbs — rose-pink top-left, blue-lavender bottom-right */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 -left-28 w-[540px] h-[540px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(242,168,200,0.52) 0%, transparent 68%)', filter: 'blur(72px)' }} />
          <div className="absolute -bottom-20 -right-20 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(160,170,238,0.48) 0%, transparent 68%)', filter: 'blur(72px)' }} />
          {/* Small floating dots */}
          <div className="absolute top-14 left-10 w-2 h-2 rounded-full" style={{ background: 'rgba(220,140,175,0.55)' }} />
          <div className="absolute top-28 right-20 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(155,160,225,0.50)' }} />
          <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(200,150,200,0.45)' }} />
          <div className="absolute bottom-32 right-12 w-2 h-2 rounded-full" style={{ background: 'rgba(145,165,235,0.50)' }} />
        </div>

        {/* Centered hero content */}
        <div className="relative max-w-3xl mx-auto text-center">

          {/* Badge — "• TrebleAI" */}
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-primary" />
            <span className="font-medium tracking-wide">TrebleAI</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.06] tracking-tight mb-6 text-foreground">
            The smarter way to{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              practice music
            </span>
          </h1>

          {/* Subtitle — exact text from design */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            Upload any score — get instant analysis, MIDI playback, and an AI
            coach that hears every nuance in your playing.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <a href="#get-started"
              className="px-7 py-3.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 hover:shadow-glow transition-all duration-200">
              Start Practicing Free
            </a>
            <a href="#features"
              className="px-5 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Watch Demo <span className="ml-0.5">→</span>
            </a>
          </div>

          {/* Playable piano */}
          <div className="p-5 rounded-2xl bg-card/40 backdrop-blur-sm border border-border/20">
            <InteractivePiano />
          </div>
        </div>
      </section>

      {/* ── Auth / Get started ──────────────────────────────────── */}
      <section id="get-started" className="py-16 px-6 md:px-10 border-t border-border/10">
        <div className="max-w-sm mx-auto text-center mb-8">
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Get started free</h2>
          <p className="text-sm text-muted-foreground">Your AI music studio is waiting.</p>
        </div>
        <div className="max-w-sm mx-auto p-7 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/20 shadow-xl shadow-black/5">
          <AuthForm />
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-16 px-6 md:px-10 border-t border-border/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Everything you need</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-10">
            One platform, complete musical intelligence
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map(f => (
              <div key={f.label}
                className="p-5 rounded-2xl border border-border/15 bg-card/30 hover:bg-card/50 transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-sm text-foreground mb-1.5">{f.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="py-16 px-6 md:px-10 border-t border-border/10">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">How it works</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-10">From score to mastery in three steps</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Upload your score', body: 'Drop a PDF or photo — TrebleAI reads it using Optical Music Recognition and converts it to playable MIDI in seconds.' },
              { n: '02', title: 'Get instant insights', body: 'A full theory report lands immediately: key, harmony, difficulty, fingering suggestions, voice-leading checks.' },
              { n: '03', title: 'Practice with AI', body: 'Play along. Ask questions in plain English. Your AI tutor knows the piece and coaches you through every challenge.' },
            ].map(s => (
              <div key={s.n} className="flex gap-4">
                <div className="text-3xl font-black text-muted-foreground/20 leading-none mt-0.5 select-none w-12 shrink-0 text-right">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="py-8 px-6 md:px-10 border-t border-border/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <div className="p-1 bg-gradient-primary rounded-md">
            <Music className="w-3 h-3 text-white" />
          </div>
          TrebleAI — AI-powered music learning
        </div>
        <ThemeToggle />
      </footer>
    </div>
  );
}
