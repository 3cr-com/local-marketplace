import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Bell, Box, ChevronDown, CircleHelp, LayoutDashboard, MapPin, Paintbrush, ShoppingBag, Store, Users } from 'lucide-react';
import { loadAdminCandidates, loadAdminOperations, loadManagedAdmins, loadVendorApplications, reviewVendorApplication, setAdminAccessStatus, setAdminRole, setSellerAccessStatus } from '../features/admin/admin.repository';
import { supabase } from '../lib/supabase/browser';
import BrandingWorkspace from './BrandingWorkspace';
import PlatformBrand from './PlatformBrand';

const money = (value) => `₹${(Number(value || 0) / 100).toLocaleString('en-IN')}`;
const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();

function Status({ active, children }) {
  return <span className={`status-pill ${active ? 'status-new' : 'status-delivered'}`}><span />{children}</span>;
}

export default function AdminOperations({ isSuperAdmin = false }) {
  const [menu, setMenu] = useState('Overview');
  const [data, setData] = useState(null);
  const [applications, setApplications] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [message, setMessage] = useState('Loading marketplace operations…');
  const [busy, setBusy] = useState('');

  const menus = useMemo(() => [
    { title: 'PLATFORM', items: [['Overview', LayoutDashboard], ['Seller requests', Store], ['Sellers', Store], ['Shops', Store], ['Customers', Users], ['Orders', ShoppingBag], ['Branding', Paintbrush]] },
    ...(isSuperAdmin ? [{ title: 'SUPER ADMIN', items: [['Administrator access', Users]] }] : []),
  ], [isSuperAdmin]);

  async function refresh() {
    try {
      const protectedData = isSuperAdmin ? Promise.all([loadManagedAdmins(), loadAdminCandidates()]) : Promise.resolve([[], []]);
      const [operations, requests, [nextAdmins, nextCandidates]] = await Promise.all([loadAdminOperations(), loadVendorApplications(), protectedData]);
      setData(operations);
      setApplications(requests.filter((item) => item.status === 'pending'));
      setAdmins(nextAdmins);
      setCandidates(nextCandidates);
      setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Administrator access is required.'); }
  }

  useEffect(() => { refresh(); }, [isSuperAdmin]);

  async function review(id, decision) {
    setBusy(id);
    try { await reviewVendorApplication(id, decision); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to review seller request.'); }
    finally { setBusy(''); }
  }

  async function changeAdminRole(id, role) {
    setBusy(`${id}-${role}`);
    try { await setAdminRole(id, role); setSelectedCandidate(''); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update administrator access.'); }
    finally { setBusy(''); }
  }

  async function toggleAdminStatus(admin) {
    const next = !admin.admin_access_active;
    setBusy(`${admin.id}-status`);
    try { await setAdminAccessStatus(admin.id, next); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update administrator status.'); }
    finally { setBusy(''); }
  }

  async function toggleSellerStatus(seller) {
    const next = !seller.seller_access_active;
    setBusy(`${seller.id}-seller-status`);
    try { await setSellerAccessStatus(seller.id, next); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update seller availability.'); }
    finally { setBusy(''); }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    window.location.assign('/');
  }

  const panelTitle = menu === 'Overview' ? 'Marketplace overview' : menu;
  const panelCopy = menu === 'Overview' ? 'A live view of shops, customers, sellers, and orders.' : `Manage live ${menu.toLowerCase()} across the marketplace.`;

  return <div className="dashboard-shell admin-dashboard-shell">
    <aside className="dash-sidebar platform-sidebar"><PlatformBrand href="/" /><div className="workspace-label">{isSuperAdmin ? 'SUPER ADMIN WORKSPACE' : 'PLATFORM WORKSPACE'}</div><div className="workspace-switch"><span className="admin-avatar">SB</span><span><b>SuperBazzar platform</b><small>{isSuperAdmin ? 'Super administrator' : 'Platform administrator'} · by 3cr</small></span><ChevronDown size={14} /></div>{menus.map((group) => <div className="sidebar-group" key={group.title}><span className="sidebar-title">{group.title}</span>{group.items.map(([label, Icon]) => <button key={label} className={`sidebar-link ${menu === label ? 'sidebar-active' : ''}`} onClick={() => setMenu(label)}><Icon size={17} /><span>{label}</span>{label === 'Seller requests' && applications.length > 0 && <b className="sidebar-count">{applications.length}</b>}</button>)}</div>)}<div className="sidebar-bottom"><div className="help-card"><span><CircleHelp size={16} /></span><b>Platform support</b><small>Review operations and access safely.</small><button onClick={() => setMenu('Overview')}>Back to overview <ArrowRight size={13} /></button></div><button className="account-link" onClick={signOut}><span className="profile-button small-profile">SB</span><span><b>{isSuperAdmin ? 'Super admin' : 'Platform admin'}</b><small>Sign out</small></span><ChevronDown size={14} /></button></div></aside>
    <main className="dash-main"><header className="dash-topbar"><div className="breadcrumbs">SuperBazzar platform <span>/</span> <b>{menu}</b></div><div className="dash-top-actions"><span className="view-store-link"><ArrowUpRight size={14} /> Live platform</span><button className="icon-button" aria-label="Notifications"><Bell size={18} /></button><div className="avatar-name">SB</div></div></header><div className="dash-content"><div className="dash-title-row"><div><p className="section-kicker">{today}</p><h1>{isSuperAdmin ? 'Super admin workspace' : 'Marketplace operations'}</h1><p>{isSuperAdmin ? 'Platform controls, administrator access, and live marketplace activity.' : 'Keep the marketplace healthy and sellers moving.'}</p></div><button className="outline-button" onClick={refresh}><ArrowUpRight size={15} />Refresh live data</button></div>{message && <p className="catalog-message" role="status">{message}</p>}{data && <><div className="dashboard-metrics"><Metric label="Live shops" value={data.shops.filter((shop) => shop.is_active).length} note={`${data.shops.length} total shops`} icon={Store} /><Metric label="New seller requests" value={applications.length} note="Awaiting review" icon={Users} /><Metric label="Orders" value={data.orders.length} note="Latest 100 orders" icon={ShoppingBag} /><Metric label="Customers" value={data.customers.length} note={`${data.vendors.length} approved sellers`} icon={Box} /></div><AdminPanel menu={menu} data={data} applications={applications} admins={admins} candidates={candidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} isSuperAdmin={isSuperAdmin} busy={busy} onReview={review} onRoleChange={changeAdminRole} onToggleStatus={toggleAdminStatus} onToggleSellerStatus={toggleSellerStatus} title={panelTitle} copy={panelCopy} /></>}</div></main>
  </div>;
}

function Metric({ label, value, note, icon: Icon }) { return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-foot"><b><ArrowUpRight size={13} />Live</b><span>{note}</span></div></article>; }

function AdminPanel({ menu, data, applications, admins, candidates, selectedCandidate, setSelectedCandidate, isSuperAdmin, busy, onReview, onRoleChange, onToggleStatus, onToggleSellerStatus, title, copy }) {
  if (menu === 'Branding') return <BrandingWorkspace />;
  if (menu === 'Seller requests') return <section className="dash-panel"><PanelHeading title="Seller requests" copy="Review verified customers requesting seller access." /> <DataTable headings={['ACCOUNT', 'APPLIED', 'STATUS', 'ACTIONS']}>{applications.length ? applications.map((item) => <tr key={item.id}><td><b>{item.shop_name}</b><small className="product-description">{item.category}</small></td><td>{new Date(item.created_at).toLocaleDateString('en-IN')}</td><td><Status active>Pending</Status></td><td><div className="application-actions"><button disabled={busy === item.id} onClick={() => onReview(item.id, 'approved')}>Approve</button><button disabled={busy === item.id} onClick={() => onReview(item.id, 'rejected')}>Reject</button></div></td></tr>) : <EmptyRow columns={4} text="No pending seller requests." />}</DataTable></section>;
  if (menu === 'Sellers') return <section className="dash-panel"><PanelHeading title="Seller availability" copy="Suspending a seller takes every shop and product offline. Reactivating does not reopen shops automatically." /> <DataTable headings={['SELLER', 'PHONE', 'STATUS', 'MANAGE']}>{data.vendors.length ? data.vendors.map((seller) => <tr key={seller.id}><td><b>{seller.full_name || 'Unnamed seller'}</b></td><td>{seller.phone || 'Not provided'}</td><td><Status active={seller.seller_access_active}>{seller.seller_access_active ? 'Active' : 'Inactive'}</Status></td><td><button disabled={busy === `${seller.id}-seller-status`} onClick={() => onToggleSellerStatus(seller)}>{seller.seller_access_active ? 'Deactivate seller' : 'Reactivate seller'}</button></td></tr>) : <EmptyRow columns={4} text="No approved sellers yet." />}</DataTable></section>;
  if (menu === 'Shops') return <section className="dash-panel"><PanelHeading title="All shops" copy="Live and inactive seller storefronts." /> <DataTable headings={['SHOP', 'CATEGORY', 'ADDRESS', 'STATUS']}>{data.shops.length ? data.shops.map((shop) => <tr key={shop.id}><td><b>{shop.name}</b></td><td>{shop.category}</td><td>{shop.address}</td><td><Status active={shop.is_active}>{shop.is_active ? 'Live' : 'Inactive'}</Status></td></tr>) : <EmptyRow columns={4} text="No shops have been created." />}</DataTable></section>;
  if (menu === 'Customers') return <section className="dash-panel"><PanelHeading title="Customers" copy="Customer accounts that are not currently approved sellers." /> <DataTable headings={['CUSTOMER', 'PHONE', 'JOINED', 'TYPE']}>{data.customers.length ? data.customers.map((customer) => <tr key={customer.id}><td><b>{customer.full_name || 'Unnamed customer'}</b></td><td>{customer.phone || 'Not provided'}</td><td>{new Date(customer.created_at).toLocaleDateString('en-IN')}</td><td><Status active>Buyer</Status></td></tr>) : <EmptyRow columns={4} text="No customer accounts yet." />}</DataTable></section>;
  if (menu === 'Orders') return <OrdersPanel orders={data.orders} title="All orders" copy="Latest marketplace orders, loaded directly from the database." />;
  if (menu === 'Administrator access' && isSuperAdmin) return <AdminAccessPanel admins={admins} candidates={candidates} selectedCandidate={selectedCandidate} setSelectedCandidate={setSelectedCandidate} busy={busy} onRoleChange={onRoleChange} onToggleStatus={onToggleStatus} />;
  return <><OrdersPanel orders={data.orders.slice(0, 8)} title={title === 'Marketplace overview' ? 'Recent orders' : title} copy={copy} /><section className="dash-lower"><section className="dash-panel mini-panel"><PanelHeading title="Seller requests" copy="Accounts waiting for platform approval." /><div className="overview-list">{applications.slice(0, 4).map((item) => <div key={item.id}><span><b>{item.shop_name}</b><small>{new Date(item.created_at).toLocaleDateString('en-IN')}</small></span><Status active>Pending</Status></div>)}{!applications.length && <p className="admin-empty">No pending seller requests.</p>}</div></section><section className="dash-panel mini-panel"><PanelHeading title="Approved sellers" copy="Sellers currently enabled on the platform." /><div className="overview-list">{data.vendors.slice(0, 4).map((vendor) => <div key={vendor.id}><span><b>{vendor.full_name || 'Seller'}</b><small>{vendor.phone || 'No phone saved'}</small></span><Status active>Approved</Status></div>)}{!data.vendors.length && <p className="admin-empty">No approved sellers yet.</p>}</div></section></section></>;
}

function OrdersPanel({ orders, title, copy }) { return <section className="dash-panel"><PanelHeading title={title} copy={copy} /><DataTable headings={['ORDER', 'SHOP', 'PLACED', 'STATUS', 'TOTAL']}>{orders.length ? orders.map((order) => <tr key={order.id}><td><b>#{order.id.slice(0, 8)}</b></td><td>{order.shops?.name || 'Shop'}</td><td>{new Date(order.created_at).toLocaleDateString('en-IN')}</td><td><Status active={order.status !== 'cancelled'}>{order.status}</Status></td><td><b>{money(order.total_paise)}</b></td></tr>) : <EmptyRow columns={5} text="No live orders yet." />}</DataTable></section>; }
function AdminAccessPanel({ admins, candidates, selectedCandidate, setSelectedCandidate, busy, onRoleChange, onToggleStatus }) { return <section className="dash-panel"><PanelHeading title="Administrator access" copy="Only super administrators can view and change this protected list." /><div className="admin-promote"><select value={selectedCandidate} onChange={(event) => setSelectedCandidate(event.target.value)}><option value="">Choose a registered account…</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.full_name || 'Unnamed account'} {candidate.phone ? `· ${candidate.phone}` : ''}</option>)}</select><button className="outline-button" disabled={!selectedCandidate || busy === `${selectedCandidate}-admin`} onClick={() => onRoleChange(selectedCandidate, 'admin')}>Make admin</button></div><DataTable headings={['ADMINISTRATOR', 'ROLE', 'STATUS', 'MANAGE']}>{admins.map((admin) => <tr key={admin.id}><td><b>{admin.full_name || 'Unnamed administrator'}</b><small className="product-description">{admin.phone || 'No phone saved'}</small></td><td><Status active={admin.role === 'super_admin'}>{admin.role === 'super_admin' ? 'Super admin' : 'Admin'}</Status></td><td><Status active={admin.admin_access_active}>{admin.admin_access_active ? 'Active' : 'Inactive'}</Status></td><td><div className="application-actions">{admin.role === 'admin' ? <button disabled={busy === `${admin.id}-super_admin`} onClick={() => onRoleChange(admin.id, 'super_admin')}>Make super</button> : <button disabled={busy === `${admin.id}-admin`} onClick={() => onRoleChange(admin.id, 'admin')}>Make admin</button>}<button disabled={busy === `${admin.id}-status`} onClick={() => onToggleStatus(admin)}>{admin.admin_access_active ? 'Deactivate' : 'Activate'}</button><button disabled={busy === `${admin.id}-customer`} onClick={() => onRoleChange(admin.id, 'customer')}>Remove</button></div></td></tr>)}</DataTable></section>; }
function PanelHeading({ title, copy }) { return <div className="panel-heading"><div><h2>{title}</h2><p>{copy}</p></div></div>; }
function DataTable({ headings, children }) { return <div className="table-scroll"><table><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function EmptyRow({ columns, text }) { return <tr><td colSpan={columns} className="no-table-results">{text}</td></tr>; }
