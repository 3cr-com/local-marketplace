import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function submit(event) { event.preventDefault(); setBusy(true); setMessage(''); const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password/` }); setBusy(false); setMessage(error ? error.message : 'If that email has an account, we sent password reset instructions.'); }
  return <main className="account-page"><header className="account-page-header"><a href="/">← Back to marketplace</a><span>3cr account</span></header><section className="account-page-card"><p className="section-kicker">PASSWORD RECOVERY</p><h1>Reset your password</h1><p className="account-page-intro">Enter the email used for your account. We’ll send a reset link or code, depending on your email template.</p><form className="page-form single" onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><button className="account-page-primary" disabled={busy}>{busy ? 'Sending…' : 'Send reset instructions'}</button></form>{message && <p className="account-page-message" role="status">{message}</p>}</section></main>;
}
