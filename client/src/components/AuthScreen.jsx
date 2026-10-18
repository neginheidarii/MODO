import { useEffect, useRef, useState } from 'react';
import { authRequest } from '../api.js';

const COPY = {
  login: ['Welcome back.', 'Your space is just as you left it.', 'Sign in'],
  signup: ['A little more intentional.', 'Create your space. Your goals, your pace.', 'Create my account'],
  forgot: ['Find your way back.', 'We will email you a secure recovery link.', 'Send reset link'],
  reset: ['Choose a new password.', 'At least 12 characters for your protection.', 'Reset password'],
  verify: ['One final step.', 'Verifying your email address.', 'Verify email']
};

export function AuthScreen({ onAuthed }) {
  const params = new URLSearchParams(location.search);
  const initial = ['signup', 'forgot', 'reset', 'verify'].includes(params.get('mode')) ? params.get('mode') : 'login';
  const [mode, setMode] = useState(initial);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(initial === 'reset' && !params.get('token') ? 'Reset link is missing. Please request another.' : '');
  const [kind, setKind] = useState('error');
  const [busy, setBusy] = useState(false);
  const [heading, sub, button] = COPY[mode];

  const verified = useRef(false);
  useEffect(() => {
    if (verified.current || initial !== 'verify' || !params.get('token')) return;
    verified.current = true;
    submit();
    // Complete a verification link once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function show(text, next = 'error') { setMessage(text || ''); setKind(next); }

  async function submit(event) {
    event?.preventDefault?.();
    setBusy(true);
    show('');
    try {
      const token = params.get('token');
      let result;
      if (mode === 'signup') result = await authRequest('register', { name: name.trim(), email: email.trim(), password });
      if (mode === 'login') result = await authRequest('login', { email: email.trim(), password });
      if (mode === 'forgot') result = await authRequest('forgot', { email: email.trim() });
      if (mode === 'reset') result = await authRequest('reset', { token, password });
      if (mode === 'verify') result = await authRequest('verify', { token });
      if (result?.user) { onAuthed(); return; }
      if (mode === 'signup') { setMode('login'); show(result.message || 'Check your inbox to verify your email.', 'success'); }
      else { if (mode === 'reset' || mode === 'verify') setMode('login'); show(result?.message || 'Request completed.', 'success'); }
    } catch (error) {
      show(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!email.trim()) { show('Enter your email address first.'); return; }
    try { const result = await authRequest('resend-verification', { email: email.trim() }); show(result.message, 'success'); }
    catch (error) { show(error.message); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-story">
        <div className="auth-wordmark">modo.</div>
        <div className="auth-story-center">
          <span className="auth-kicker">YOUR LIFE. YOUR MODE.</span>
          <h1>Make space for<br />what matters.</h1>
          <p>One calm place for your plans, the people you love, your rituals and everything you want to become.</p>
          <div className="auth-symbol">m.</div>
        </div>
        <span className="auth-footnote">A more intentional everyday.</span>
      </div>
      <main className="auth-panel">
        <div className="auth-mobile-logo">modo.</div>
        <div className="auth-card">
          <div className="auth-overline">WELCOME TO MODO</div>
          <h2>{heading}</h2>
          <p className="auth-description">{sub}</p>
          {['login', 'signup'].includes(mode) && (
            <div className="auth-tabs">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); show(''); }}>Sign in</button>
              <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); show(''); }}>Create account</button>
            </div>
          )}
          <form id="auth-form" onSubmit={submit}>
            {mode === 'signup' && <div><label htmlFor="auth-name">Your name</label><input id="auth-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your name" minLength={2} maxLength={70} required /></div>}
            {!['reset', 'verify'].includes(mode) && <div><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" /></div>}
            {!['forgot', 'verify'].includes(mode) && (
              <div>
                <div className="auth-label-row">
                  <label htmlFor="auth-password">Password</label>
                  {mode === 'login' && <button type="button" className="auth-text-link" onClick={() => { setMode('forgot'); show(''); }}>Forgot password?</button>}
                </div>
                <input id="auth-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={12} placeholder="At least 12 characters" />
              </div>
            )}
            {message && <p className="auth-error" data-kind={kind} role="alert">{message}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>{button} <span>↗</span></button>
          </form>
          {mode === 'login' && <div className="auth-verification"><button type="button" className="auth-text-link" onClick={resend}>Resend verification email</button></div>}
          <p className="auth-legal">Your workspace is private to your account. MODO will never ask you to share your calendar password.</p>
          {!['login', 'signup'].includes(mode) && <div className="auth-back"><button type="button" className="auth-text-link" onClick={() => { setMode('login'); show(''); }}>← Back to sign in</button></div>}
        </div>
      </main>
    </div>
  );
}
