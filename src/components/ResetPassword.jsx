import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('Checking your reset link…');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) { setMessage('Supabase is not configured.'); return; }
    supabase.auth.getSession().then(({ data }) => { if (data.session) { setReady(true); setMessage('Choose a new password.'); } else setMessage('This reset link is invalid or has expired. Request a new one.'); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY' || session) { setReady(true); setMessage('Choose a new password.'); } });
    return () => listener.subscription.unsubscribe();
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) { setMessage('Use a password with at least 8 characters.'); return; }
    if (password !== confirmPassword) { setMessage('The passwords do not match.'); return; }
    setBusy(true); const { error } = await supabase.auth.updateUser({ password }); setBusy(false);
    if (error) { setMessage(error.message); return; }
    setMessage('Password updated. Redirecting to sign in…'); window.setTimeout(() => window.location.replace('/'), 1000);
  }
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#f8faf5', color: '#345443', fontFamily: 'system-ui, sans-serif' }}><section style={{ width: 'min(100%, 380px)', padding: '28px', border: '1px solid #dce5da', borderRadius: '12px', background: '#fff' }}><h1 style={{ marginTop: 0 }}>Reset password</h1>{ready ? <form onSubmit={submit} style={{ display: 'grid', gap: '14px' }}><label>New password<input required minLength="8" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={{ boxSizing: 'border-box', width: '100%', marginTop: '6px', padding: '10px' }} /></label><label>Confirm new password<input required minLength="8" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ boxSizing: 'border-box', width: '100%', marginTop: '6px', padding: '10px' }} /></label><button disabled={busy} style={{ padding: '11px', border: 0, borderRadius: '7px', background: '#315b42', color: '#fff', cursor: 'pointer' }}>{busy ? 'Saving…' : 'Save new password'}</button></form> : null}<p role="status">{message}</p></section></main>;
}
