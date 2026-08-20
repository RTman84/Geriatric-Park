import React, { useEffect, useState } from 'react';
import {
  getCurrentSession,
  isCloudAccountsConfigured,
  sendMagicLink,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  startGoogleSignIn,
  type AuthSession,
} from '../services/authService';

export const AccountPanel: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isCloudAccountsConfigured()) return;
    void getCurrentSession().then(setSession).catch(() => setSession(null));
  }, []);

  if (!isCloudAccountsConfigured()) return null;

  const run = async (action: () => Promise<AuthSession | null>) => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await action();
      setSession(next);
      setPassword('');
      setMessage(next ? `Signed in as ${next.user.email || 'your account'}.` : 'Check your email to finish signing in.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Account request failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = () => run(async () => {
    const result = await signUpWithEmail(email.trim(), password);
    return result.session;
  });

  const handleSignIn = () => run(() => signInWithEmail(email.trim(), password));

  const handleMagicLink = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await sendMagicLink(email.trim());
      setMessage('Magic link sent. Check your email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send magic link.');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    await signOut();
    setSession(null);
    setBusy(false);
    setMessage('Signed out. Your existing local save remains on this device.');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-[5000] rounded-full bg-indigo-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-lg"
        aria-label="Open account"
      >
        {session ? 'Account' : 'Sign In'}
      </button>

      {open && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black uppercase tracking-tight">Account & Cloud Save</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400" aria-label="Close">✕</button>
            </div>

            {session ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-100 p-4 text-sm dark:bg-slate-800">
                  <div className="font-bold">Signed in</div>
                  <div className="mt-1 break-all text-xs opacity-70">{session.user.email || session.user.id}</div>
                </div>
                <p className="text-xs text-slate-500">Your account is linked to a stable player identity. Existing local progress is not deleted when you sign out.</p>
                <button type="button" disabled={busy} onClick={handleSignOut} className="w-full rounded-2xl bg-slate-200 py-3 font-black uppercase dark:bg-slate-800">Sign out</button>
              </div>
            ) : (
              <div className="space-y-3">
                <button type="button" disabled={busy} onClick={() => startGoogleSignIn()} className="w-full rounded-2xl bg-white py-3 font-black uppercase text-slate-800 shadow ring-1 ring-slate-200 disabled:opacity-50">Continue with Google</button>
                <div className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">or email</div>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email" className="w-full rounded-xl border p-3 text-sm dark:bg-slate-800" />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Password" className="w-full rounded-xl border p-3 text-sm dark:bg-slate-800" />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy || !email || !password} onClick={handleSignIn} className="rounded-xl bg-indigo-600 py-3 text-xs font-black uppercase text-white disabled:opacity-50">Sign in</button>
                  <button type="button" disabled={busy || !email || !password} onClick={handleSignUp} className="rounded-xl bg-slate-200 py-3 text-xs font-black uppercase dark:bg-slate-800 disabled:opacity-50">Create</button>
                </div>
                <button type="button" disabled={busy || !email} onClick={handleMagicLink} className="w-full rounded-xl border py-3 text-xs font-black uppercase disabled:opacity-50">Send magic link</button>
                <div className="rounded-xl bg-amber-50 p-3 text-[10px] font-bold leading-relaxed text-amber-900">
                  Accounts are intended for players who are 18+ and reside in the United States. Verification and restricted-feature eligibility will be enforced server-side before those features are enabled.
                </div>
              </div>
            )}

            {message && <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-xs font-bold text-indigo-900">{message}</div>}
          </div>
        </div>
      )}
    </>
  );
};
