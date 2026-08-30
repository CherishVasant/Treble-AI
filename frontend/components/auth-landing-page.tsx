'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import ThemeToggle from '@/components/theme-toggle';
import {
  Music, Eye, EyeOff, Loader2, Info,
  ChevronRight, BookOpen, Library, X,
  Upload, Play, MessageSquare, BarChart3, Search, RefreshCw,
} from 'lucide-react';

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

// ── Auth modal ────────────────────────────────────────────────────────────────

function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative z-10 bg-background border border-border/20 rounded-2xl shadow-2xl p-8 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Welcome to TrebleAI</h2>
          <p className="text-sm text-muted-foreground">Your AI music studio is waiting.</p>
        </div>

        <AuthForm />
      </div>
    </div>
  );
}

// ── Product sections ──────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    name: 'Practice Studio',
    tagline: 'Upload a score. Start learning immediately.',
    description:
      'Turn any sheet music into a fully playable, analysable practice session. Upload a PDF or photo — TrebleAI reads it, builds a theory report, and lets you practice with an AI coach that listens.',
    accentColor: '#3DBCB8',
    accentBg: 'rgba(61,188,184,0.09)',
    icon: <Music className="w-6 h-6" />,
    steps: [
      { icon: <Upload className="w-4 h-4" />, label: 'Upload', detail: 'Drop any PDF or photo of sheet music — solo, ensemble, lead sheet, anything.' },
      { icon: <BarChart3 className="w-4 h-4" />, label: 'Analyse', detail: 'Instant report: key, chords, difficulty, voice-leading notes, and fingering suggestions.' },
      { icon: <Play className="w-4 h-4" />, label: 'Practice', detail: 'Play MIDI playback, practice along, and ask your AI coach about any passage.' },
    ],
  },
  {
    name: 'Theory Tutor',
    tagline: 'Ask anything. Learn everything.',
    description:
      'A chat-based AI tutor with expert knowledge of music theory — from beginner scales all the way to advanced counterpoint, harmonic analysis, and ear training.',
    accentColor: '#7B82E8',
    accentBg: 'rgba(123,130,232,0.09)',
    icon: <BookOpen className="w-6 h-6" />,
    steps: [
      { icon: <MessageSquare className="w-4 h-4" />, label: 'Ask', detail: 'Type any question — "What is a tritone substitution?" or "Walk me through Dorian mode."' },
      { icon: <ChevronRight className="w-4 h-4" />, label: 'Explore', detail: 'Follow up with more questions, request exercises, or ask for real musical examples.' },
      { icon: <BookOpen className="w-4 h-4" />, label: 'Revisit', detail: 'Every conversation is saved — come back anytime to build on what you have learned.' },
    ],
  },
  {
    name: 'Music Library',
    tagline: 'Your scores, organised and ready.',
    description:
      'Every score you upload lives here with its analysis, key info, and MIDI playback. Browse, filter, and deep-dive into your collection whenever you need it.',
    accentColor: '#E07878',
    accentBg: 'rgba(224,120,120,0.09)',
    icon: <Library className="w-6 h-6" />,
    steps: [
      { icon: <Search className="w-4 h-4" />, label: 'Browse', detail: 'Filter your collection by key, scale, difficulty, or time signature.' },
      { icon: <RefreshCw className="w-4 h-4" />, label: 'Re-analyse', detail: 'Run fresh AI analysis on any score as your ear and technique improve.' },
      { icon: <BarChart3 className="w-4 h-4" />, label: 'Explore', detail: 'Use the built-in key, scale, and chord explorer to deepen your theory knowledge.' },
    ],
  },
];

// ── Main landing page ──────────────────────────────────────────────────────────

export default function AuthLandingPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ── Top bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 flex items-center px-6 md:px-10 border-b border-border/20 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2 flex-1">
          <div className="p-1.5 bg-gradient-primary rounded-lg">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-foreground">TrebleAI</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setShowAuth(true)}
            className="px-4 py-1.5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 transition-all"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28 md:py-36 px-6 md:px-10">

        {/* Background orbs — rose-pink top-left, blue-lavender bottom-right */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-28 -left-28 w-[540px] h-[540px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(242,168,200,0.52) 0%, transparent 68%)', filter: 'blur(72px)' }}
          />
          <div
            className="absolute -bottom-20 -right-20 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(160,170,238,0.48) 0%, transparent 68%)', filter: 'blur(72px)' }}
          />
          {/* Small accent dots */}
          <div className="absolute top-14 left-10 w-2 h-2 rounded-full" style={{ background: 'rgba(220,140,175,0.55)' }} />
          <div className="absolute top-28 right-20 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(155,160,225,0.50)' }} />
          <div className="absolute bottom-20 left-1/4 w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(200,150,200,0.45)' }} />
          <div className="absolute bottom-32 right-12 w-2 h-2 rounded-full" style={{ background: 'rgba(145,165,235,0.50)' }} />
        </div>

        {/* Centered content */}
        <div className="relative max-w-3xl mx-auto text-center">

          {/* Badge */}
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

          {/* Subtitle */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            Upload any score — get instant analysis, MIDI playback, and an AI
            coach that hears every nuance in your playing.
          </p>

          {/* Single CTA */}
          <button
            onClick={() => setShowAuth(true)}
            className="px-8 py-4 rounded-full bg-primary text-white font-bold text-base hover:opacity-90 hover:shadow-glow transition-all duration-200"
          >
            Get Started Free
          </button>
        </div>
      </section>

      {/* ── Product sections ────────────────────────────────────── */}
      <section className="py-20 px-6 md:px-10 border-t border-border/10">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">What you can do</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              One platform, complete musical intelligence
            </h2>
          </div>

          <div className="space-y-10">
            {PRODUCTS.map((product) => (
              <div
                key={product.name}
                className="rounded-2xl border border-border/15 overflow-hidden"
                style={{ background: product.accentBg }}
              >
                <div className="p-8 md:p-10">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${product.accentColor}22`, color: product.accentColor }}
                    >
                      {product.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-foreground leading-tight">{product.name}</h3>
                      <p className="text-sm font-medium" style={{ color: product.accentColor }}>{product.tagline}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                    {product.description}
                  </p>

                  {/* How to use steps */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {product.steps.map((step, idx) => (
                      <div key={step.label} className="flex gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `${product.accentColor}20`, color: product.accentColor }}
                        >
                          {step.icon}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground mb-0.5 uppercase tracking-wide">{step.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section className="py-16 px-6 md:px-10 border-t border-border/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">How it works</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mb-10">From score to mastery in three steps</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Upload your score', body: 'Drop a PDF or photo — TrebleAI reads it using Optical Music Recognition and converts it to playable MIDI in seconds.' },
              { n: '02', title: 'Get instant insights', body: 'A full theory report lands immediately: key, harmony, difficulty, fingering suggestions, and voice-leading checks.' },
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
