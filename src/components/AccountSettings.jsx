import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/browser';
import { loadMyProfile } from '../features/auth/auth.repository';
import { requestSellerMode } from '../features/seller/seller.repository';

export default function AccountSettings() {
  const [profile, setProfile] = useState(null); const [message, setMessage] = useState('Loading your account…'); const [busy, setBusy] = useState(false);
  useEffect(() => { loadMyProfile().then(data => { setProfile(data); setMessage(data ? '' : 'Sign in to manage account settings.'); }).catch(() => setMessage('Unable to load account settings.')); }, []);
  async function toggleSellerMode() {
    if (!profile) return; setBusy(true); setMessage('');
    try {
      if (profile.seller_enabled) { window.location.assign('/?mode=customer'); return; }
      await requestSellerMode(); setProfile({ ...profile, seller_requested: true }); setMessage('Seller access request sent. An administrator will review it after your email is verified.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update seller mode.'); }
    finally { setBusy(false); }
  }
  const isPlatformAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  return <main className="account-page"><header className="account-page-header"><a href="/">← Back to marketplace</a><span>3cr account</span></header><section className="account-page-card"><p className="section-kicker">ACCOUNT SETTINGS</p><h1>{isPlatformAdmin ? 'Platform administration' : 'Buying & selling'}</h1><p className="account-page-intro">{isPlatformAdmin ? 'Platform administrators use the management workspace and cannot switch into buyer or seller mode.' : 'Every account can shop. Sellers are approved by an administrator after email verification.'}</p><div className="settings-status"><span className={profile?.seller_enabled ? 'settings-dot active' : 'settings-dot'} /><div><b>{isPlatformAdmin ? (profile?.role === 'super_admin' ? 'Super administrator' : 'Administrator') : profile?.seller_enabled ? 'Seller access is active' : profile?.seller_requested ? 'Seller approval is pending' : 'Customer mode is active'}</b><small>{isPlatformAdmin ? 'Return to the homepage to open the management workspace.' : profile?.seller_enabled ? 'Switch between shopping and your seller workspace without deactivating shops or products.' : profile?.seller_requested ? 'An administrator must approve your seller request.' : 'You can browse and buy as usual.'}</small></div></div><div className="account-page-links"><a href="/account/profile/">Your profile</a><a href="/addresses/">Saved addresses</a></div>{!isPlatformAdmin && <button className="account-page-primary" disabled={busy || !profile || (!profile?.seller_enabled && profile?.seller_requested)} onClick={toggleSellerMode}>{busy ? 'Updating…' : profile?.seller_enabled ? 'Switch to customer mode' : profile?.seller_requested ? 'Approval pending' : 'Request seller access'}</button>}{message && <p className="account-page-message" role="status">{message}</p>}</section></main>;
}
