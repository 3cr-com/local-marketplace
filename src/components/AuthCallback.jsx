import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const [message, setMessage] = useState('Confirming your account…');
  useEffect(() => {
    async function confirm() {
      if (!supabase) { setMessage('Supabase is not configured. Return to the marketplace and check your environment variables.'); return; }
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) { setMessage('This confirmation link is missing its code. Request a new confirmation email.'); return; }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) { setMessage(error.message); return; }
      window.location.replace('/');
    }
    confirm();
  }, []);
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#f8faf5', color: '#345443', fontFamily: 'system-ui, sans-serif' }}><p role="status">{message}</p></main>;
}
