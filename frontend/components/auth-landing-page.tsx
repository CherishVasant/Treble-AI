'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Music, Eye, EyeOff, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthLandingPage() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Validate form fields on the client before submit
  const validateForm = (): boolean => {
    setError(null);
    const trimmedUser = username.trim();
    
    if (!trimmedUser) {
      setError('Username is required.');
      return false;
    }
    
    if (trimmedUser.length < 3 || trimmedUser.length > 32) {
      setError('Username must be between 3 and 32 characters.');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedUser)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return false;
    }

    if (!password) {
      setError('Password is required.');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        const success = await login(username.trim(), password);
        if (!success) {
          // Toast is shown inside context
        }
      } else {
        const success = await signup(username.trim(), password, confirmPassword);
        if (success) {
          // Reset fields and toggle to login
          setIsLogin(true);
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(prev => !prev);
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Dynamic Animated Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gradient-primary/10 blur-3xl animate-float" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-secondary/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Main Glass Panel Card */}
      <div className="relative z-10 w-full max-w-md bg-card/35 border border-border/30 backdrop-blur-md rounded-2xl p-8 shadow-glow/10 animate-scale-in">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-primary rounded-xl shadow-glow mb-4">
            <Music className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            TrebleAI
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 font-semibold uppercase tracking-wider text-center">
            {isLogin ? 'Welcome Back to Music Learning' : 'Create Your Learning Profile'}
          </p>
        </div>

        {/* Validation Error Alert */}
        {error && (
          <div className="mb-5 p-3 rounded-lg border border-red-500/20 bg-red-500/10 flex items-start gap-2.5 text-xs text-red-400 animate-fade-in font-medium">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">
              Username
            </label>
            <input
              type="text"
              required
              disabled={isLoading}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. music_student"
              className="w-full px-4 py-2.5 text-sm bg-card/65 border border-border/40 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 text-sm bg-card/65 border border-border/40 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only on Sign Up) */}
          {!isLogin && (
            <div className="animate-slide-down">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-sm bg-card/65 border border-border/40 text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-2.5 rounded-xl bg-gradient-primary hover:shadow-glow text-white font-bold transition-all shadow-glow text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isLogin ? 'Logging In...' : 'Registering...'}</span>
              </>
            ) : (
              <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
            )}
          </Button>
        </form>

        {/* Toggle Mode Footer Link */}
        <div className="mt-6 text-center text-xs">
          <span className="text-muted-foreground mr-1.5">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            type="button"
            disabled={isLoading}
            onClick={toggleMode}
            className="text-primary hover:underline font-bold transition-all"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>

      </div>
    </div>
  );
}
