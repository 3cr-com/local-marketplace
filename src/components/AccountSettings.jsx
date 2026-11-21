import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/browser';
import { loadMyProfile } from '../features/auth/auth.repository';
import { activateSellerMode, disableSellerMode, requestSellerMode } from '../features/seller/seller.repository';

export default function AccountSettings() {
  const [profile, setProfile] = useState(null); const [message, setMessage] = useState('Loading your account…'); const [busy, setBusy] = useState(false);
  useEffect(() => { loadMyProfile().then(data => { setProfile(data); setMessage(data ? '' : 'Sign in to manage account settings.'); }).catch(() => setMessage('Unable to load account settings.')); }, []);
  async function toggleSellerMode() {
    if (!profile) return; setBusy(true); setMessage('');
    try {
      if (profile.seller_enabled) { await disableSellerMode(); setMessage('Seller mode is off. Your shop is hidden from customers.'); setProfile({ ...profile, seller_enabled: false }); return; }
      const verified = await requestSellerMode();
      if (verified) { await activateSellerMode(); setProfile({ ...profile, seller_enabled: true }); setMessage('Seller mode is on. You can now set up your shop.'); }
      else { const { data: auth } = await supabase.auth.getUser(); const { error } = await supabase.auth.resend({ type: 'signup', email: auth.user?.email }); if (error) throw error; setMessage('We sent a verification link. Open it, then return here.'); }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update seller mode.'); }
    finally { setBusy(false); }
  }
  return <main className="account-page"><header className="account-page-header"><a href="/">← Back to marketplace</a><span>3cr account</span></header><section className="account-page-card"><p className="section-kicker">ACCOUNT SETTINGS</p><h1>Buying & selling</h1><p className="account-page-intro">Every account can shop. Turn on seller mode only when you’re ready to create a shop and publish products.</p><div className="settings-status"><span className={profile?.seller_enabled ? 'settings-dot active' : 'settings-dot'} /><div><b>{profile?.seller_enabled ? 'Seller mode is active' : 'Customer mode is active'}</b><small>{profile?.seller_enabled ? 'Your shops can be visible to customers.' : 'You can browse and buy as usual.'}</small></div></div><div className="account-page-links"><a href="/orders/">Your orders</a><a href="/addresses/">Saved addresses</a></div><button className="account-page-primary" disabled={busy || profile?.role === 'admin' || !profile} onClick={toggleSellerMode}>{busy ? 'Updating…' : profile?.seller_enabled ? 'Switch to customer mode' : 'Become a seller'}</button>{profile?.seller_enabled && <div className="account-page-links seller-links"><a href="/seller/shops/">Manage your shops</a><a href="/seller/orders/">Seller orders</a></div>}{message && <p className="account-page-message" role="status">{message}</p>}</section></main>;
}
