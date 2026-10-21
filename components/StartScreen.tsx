import React, { useState } from 'react';
import startPortrait from '../game-assets/ui/start_portrait.webp';
import startLandscape from '../game-assets/ui/start_landscape.webp';
import { GAME_VERSION } from '../constants';

interface StartScreenProps {
  hasStarted: boolean;          // true = returning player (local or cloud save already loaded)
  signedInEmail: string | null; // null = not signed in
  cloudEnabled: boolean;        // sign-in options only show when accounts are configured
  busy: boolean;
  message: string | null;
  onPlay: () => void;
  onGoogle: () => void;
  onEmailSignIn: (email: string, password: string) => void;
  onEmailCreate: (email: string, password: string) => void;
  onMagicLink: (email: string) => void;
  onHowToPlay?: () => void;
}

// Title is drawn in code (decision 2026-10-19): gold "GERIATRIC" with a dark-brown outline over a white
// "PARK" with a green outline, placed on the open sky of the start art.
const outline = (stroke: string, width: number): React.CSSProperties => ({
  WebkitTextStroke: `${width}px ${stroke}`,
  paintOrder: 'stroke fill',
  textShadow: `0 4px 0 ${stroke}, 0 8px 14px rgba(0,0,0,0.35)`,
});

const StartScreen: React.FC<StartScreenProps> = ({ hasStarted, signedInEmail, cloudEnabled, busy, message, onPlay, onGoogle, onEmailSignIn, onEmailCreate, onMagicLink, onHowToPlay }) => {
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const inputCls = 'w-full rounded-xl border border-white/30 bg-white/90 p-3 text-sm text-slate-800 placeholder-slate-500';

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-sky-300 select-none" style={{ fontFamily: "'Fredoka', sans-serif" }}>
      <picture>
        <source media="(orientation: landscape)" srcSet={startLandscape} />
        <img src={startPortrait} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover object-top" />
      </picture>

      <div className="absolute inset-x-0 top-0 flex flex-col items-center pt-[4dvh] px-4 text-center pointer-events-none">
        <div className="font-bold leading-none tracking-wide" style={{ fontSize: 'clamp(30px, min(13vw, 12dvh), 84px)', color: '#FFC83D', ...outline('#5a2e0e', 9) }}>GERIATRIC</div>
        <div className="font-bold leading-none tracking-widest -mt-1" style={{ fontSize: 'clamp(36px, min(16vw, 15dvh), 104px)', color: '#ffffff', ...outline('#2f7d32', 9) }}>PARK</div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-10 bg-gradient-to-t from-black/75 via-black/55 to-transparent">
        <div className="w-full max-w-sm space-y-3 max-h-[68dvh] overflow-y-auto">
          <button
            onClick={onPlay}
            disabled={busy}
            className="w-full rounded-3xl bg-green-500 py-4 text-3xl font-bold uppercase tracking-widest text-white shadow-[0_6px_0_#166534] active:translate-y-1 active:shadow-[0_2px_0_#166534] disabled:opacity-60"
            style={{ WebkitTextStroke: '2px #166534', paintOrder: 'stroke fill' }}
          >
            {hasStarted ? 'Play' : 'New Game'}
          </button>

          {signedInEmail && <p className="text-center text-[13px] font-semibold text-white/90">Signed in as {signedInEmail}</p>}

          {cloudEnabled && !signedInEmail && (
            <>
              <p className="text-center text-[13px] font-semibold text-white/85">{hasStarted ? 'Sign in to back up your progress and play on other devices.' : 'Already have an account? Sign in to load your Park.'}</p>
              <button disabled={busy} onClick={onGoogle} className="w-full rounded-2xl bg-white py-3 text-sm font-bold uppercase text-slate-800 shadow disabled:opacity-50">Continue with Google</button>
              {!showEmail ? (
                <button onClick={() => setShowEmail(true)} className="w-full rounded-2xl border border-white/40 bg-white/10 py-3 text-sm font-bold uppercase text-white">Use email instead</button>
              ) : (
                <div className="space-y-2">
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email" className={inputCls} />
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Password" className={inputCls} />
                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={busy || !email || !password} onClick={() => onEmailSignIn(email.trim(), password)} className="rounded-xl bg-amber-500 py-3 text-sm font-bold uppercase text-slate-900 disabled:opacity-50">Sign in</button>
                    <button disabled={busy || !email || !password} onClick={() => onEmailCreate(email.trim(), password)} className="rounded-xl bg-white/90 py-3 text-sm font-bold uppercase text-slate-800 disabled:opacity-50">Create</button>
                  </div>
                  <button disabled={busy || !email} onClick={() => onMagicLink(email.trim())} className="w-full rounded-xl border border-white/40 py-2.5 text-sm font-bold uppercase text-white disabled:opacity-50">Send magic link</button>
                </div>
              )}
            </>
          )}

          {message && <div className="rounded-xl bg-white/90 p-3 text-center text-sm font-bold text-slate-800">{message}</div>}

          <div className="flex items-center justify-between pt-1 text-[12px] font-semibold text-white/70">
            {onHowToPlay ? <button onClick={onHowToPlay} className="underline">How to Play</button> : <span />}
            <span>v{GAME_VERSION}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
