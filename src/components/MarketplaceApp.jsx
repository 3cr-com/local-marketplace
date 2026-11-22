import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Toaster } from 'sonner';
import { supabase } from '../lib/supabase/browser';
import { loadCatalog, loadNearbyCatalog } from '../features/catalog/catalog.repository';
import { loadMyProfile } from '../features/auth/auth.repository';
import { loadMyShops, loadVendorProducts } from '../features/seller/seller.repository';
import { loadVendorApplications, reviewVendorApplication } from '../features/admin/admin.repository';
import { placeCodOrder } from '../features/orders/order.repository';
import { createDeliveryAddress, loadMyAddresses } from '../features/addresses/address.repository';
import { resolveMarketplaceBrand } from '../features/branding/branding.repository';
import { fallbackMarketplaceBrand } from '../features/branding/models/marketplace-brand';
import AddressFields, { addressText, emptyAddress } from './AddressFields';
import AdminOperations from './AdminOperations';
import MarketplaceBrand from './MarketplaceBrand';
import SellerWorkspace from './SellerWorkspace';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Bell, Box, Boxes, ChevronDown,
  CircleHelp, CreditCard, Heart, LayoutDashboard, MapPin, Minus, PackageCheck,
  Plus, Search, Settings2, ShieldCheck, ShoppingBag, ShoppingCart, Store, Truck, Users, X,
} from 'lucide-react';

const media = {
  groceries: '/images/3cr-fresh-produce.png',
  fashion: '/images/3cr-fashion.png',
  footwear: '/images/3cr-footwear.png',
  electronics: '/images/3cr-electronics.png',
  home: '/images/3cr-home.png',
  care: '/images/3cr-personal-care.png',
  hero: '/images/3cr-neighbourhood-hero.png',
};

const demoProducts = [
  { id: 'demo-1', name: 'Farm-fresh veggie box', detail: 'Seasonal · 1 box', price: 249, old: 299, category: 'Groceries', shop: 'Green Basket', shopId: 'demo-green-basket', distance: '0.8 km', image: media.groceries, badge: 'Fresh today', color: 'green' },
  { id: 'demo-2', name: 'Everyday cotton kurta', detail: 'Hand block print · S–XXL', price: 899, category: 'Fashion', shop: 'Nila Boutique', shopId: 'demo-nila', distance: '1.2 km', image: media.fashion, badge: 'Local favourite', color: 'sand' },
  { id: 'demo-3', name: 'Cloudstep sneakers', detail: 'Lightweight · Sizes 6–11', price: 1499, old: 1799, category: 'Footwear', shop: 'Sole Stories', shopId: 'demo-sole', distance: '2.1 km', image: media.footwear, badge: '15% off', color: 'blue' },
  { id: 'demo-4', name: 'Studio wireless headphones', detail: 'Bluetooth · 24 hr battery', price: 2199, category: 'Electronics', shop: 'Circuit & Co.', shopId: 'demo-circuit', distance: '3.4 km', image: media.electronics, badge: 'Bestseller', color: 'blue' },
  { id: 'demo-5', name: 'Hand-thrown ceramic vase', detail: 'Made by hand · 18 cm', price: 649, category: 'Home', shop: 'House of Mitti', shopId: 'demo-mitti', distance: '1.7 km', image: media.home, badge: 'Made nearby', color: 'sand' },
  { id: 'demo-6', name: 'Daily glow care set', detail: 'Gentle essentials · 3 pcs', price: 579, category: 'Personal care', shop: 'Good Things Apothecary', shopId: 'demo-good-things', distance: '2.6 km', image: media.care, badge: 'Clean beauty', color: 'green' },
  { id: 'demo-7', name: 'Market greens bundle', detail: 'Spinach, coriander & mint', price: 129, category: 'Groceries', shop: 'Green Basket', shopId: 'demo-green-basket', distance: '0.8 km', image: media.groceries, badge: 'Picked at 7am', color: 'green' },
  { id: 'demo-8', name: 'The relaxed linen shirt', detail: 'Pure cotton · S–XXL', price: 1190, category: 'Fashion', shop: 'Nila Boutique', shopId: 'demo-nila', distance: '1.2 km', image: media.fashion, badge: 'New arrival', color: 'sand' },
];

const categories = [
  { label: 'All nearby', emoji: '✳', count: '1,248' },
  { label: 'Groceries', emoji: '🥬', count: '326' },
  { label: 'Fashion', emoji: '🧵', count: '214' },
  { label: 'Footwear', emoji: '👟', count: '128' },
  { label: 'Electronics', emoji: '🎧', count: '186' },
  { label: 'Home', emoji: '🏺', count: '203' },
  { label: 'Personal care', emoji: '🌿', count: '191' },
];

const vendorOrders = [
  { id: '#NB-2048', item: 'Farm-fresh veggie box · 2 items', customer: 'Ananya S.', time: '10:42 am', status: 'New', amount: '₹498' },
  { id: '#NB-2046', item: 'Market greens bundle · 3 items', customer: 'Rohit M.', time: '10:18 am', status: 'Preparing', amount: '₹387' },
  { id: '#NB-2041', item: 'Farm-fresh veggie box · 1 item', customer: 'Meera K.', time: '9:56 am', status: 'Ready for pickup', amount: '₹249' },
  { id: '#NB-2038', item: 'Seasonal fruit basket · 2 items', customer: 'Kavya R.', time: '9:21 am', status: 'Delivered', amount: '₹620' },
];
const adminVendors = [
  { initials: 'GB', name: 'Green Basket', owner: 'Arjun Patel', category: 'Groceries', area: 'Indiranagar', orders: '1,248', status: 'Active' },
  { initials: 'NB', name: 'Nila Boutique', owner: 'Nila Raman', category: 'Fashion', area: 'Koramangala', orders: '836', status: 'Active' },
  { initials: 'SS', name: 'Sole Stories', owner: 'Rahul Das', category: 'Footwear', area: 'HSR Layout', orders: '604', status: 'Review' },
  { initials: 'CC', name: 'Circuit & Co.', owner: 'Rhea Thomas', category: 'Electronics', area: 'Indiranagar', orders: '492', status: 'Active' },
];
const money = (value) => `₹${value.toLocaleString('en-IN')}`;

function ProductCard({ product, add, isFavorite, toggleFavorite }) {
  return <article className="product-card">
    <div className={`product-image image-${product.color}`}>
      <img src={product.image} alt={product.name} loading="lazy" />
      <span className="product-badge">{product.badge}</span>
      <button className={`favorite-button ${isFavorite ? 'is-favorite' : ''}`} aria-label={isFavorite ? 'Remove from favourites' : 'Save to favourites'} onClick={() => toggleFavorite(product.id)}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button>
      <button className="quick-add" aria-label={`Add ${product.name} to bag`} disabled={product.shopOpen === false} onClick={() => add(product)}><Plus size={19} /></button>
    </div>
    <div className="product-meta"><span>{product.shop}</span><span className="distance"><MapPin size={11} />{product.distance}</span></div>
    <h3>{product.name}</h3>
    <p className="product-detail">{product.detail}</p>
    <div className="price-row"><strong>{money(product.price)}</strong>{product.old && <del>{money(product.old)}</del>}<button className="add-text" disabled={product.shopOpen === false} onClick={() => add(product)}>{product.shopOpen === false ? 'Closed now' : <>Add <Plus size={13} /></>}</button></div>
  </article>;
}

function CustomerStore({ cart, add, toggleFavorite, favorites, setCartOpen, user, brand }) {
  const [catalog, setCatalog] = useState([]);
  const [catalogStatus, setCatalogStatus] = useState('');
  const [category, setCategory] = useState('All nearby');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('Recommended');
  const [savedOnly, setSavedOnly] = useState(false);
  const [radius, setRadius] = useState('10 km');
  const [location, setLocation] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const previousCartCount = useRef(0);
  const [cartPulse, setCartPulse] = useState(false);
  const heroSlides = useMemo(() => [...new Set([
    brand.hero_desktop_url,
    '/images/notun-bazar-banner2.png',
    '/images/notun-bazar-banner3.png',
    '/images/notun-bazar-banner4.png',
  ].filter(Boolean))], [brand.hero_desktop_url]);
  useEffect(() => {
    loadCatalog().then((liveProducts) => {
      if (liveProducts) { setCatalog(liveProducts); setCatalogStatus(liveProducts.length ? '' : 'No live products are available yet.'); }
    }).catch(() => { setCatalog([]); setCatalogStatus('Live catalogue could not be loaded. Please try again.'); });
  }, []);
  useEffect(() => { if (!location) return; const radiusKm = Number.parseInt(radius); loadNearbyCatalog(location.latitude, location.longitude, radiusKm, search).then(products => { setCatalog(products); setCatalogStatus(products.length ? '' : 'No products are available within your selected distance.'); }).catch(() => setCatalogStatus('Nearby products could not be loaded.')); }, [location, radius]);
  useEffect(() => { setHeroIndex(0); }, [heroSlides.join('|')]);
  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroSlides.length), 5000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);
  function useCurrentLocation() { if (!navigator.geolocation) { setCatalogStatus('Location is not supported in this browser.'); return; } setCatalogStatus('Finding shops near you…'); navigator.geolocation.getCurrentPosition(position => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }), () => setCatalogStatus('Allow location access to find nearby shops.'), { enableHighAccuracy: true, timeout: 15000 }); }
  const filtered = useMemo(() => {
    let list = catalog.filter(p => (category === 'All nearby' || p.category.toLowerCase().includes(category.toLowerCase())) && (!savedOnly || favorites.includes(p.id)) && `${p.name} ${p.shop} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'Price: low to high') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Nearest first') list = [...list].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    return list;
  }, [catalog, category, favorites, savedOnly, search, sort]);
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  useEffect(() => {
    if (previousCartCount.current !== 0 && previousCartCount.current !== cartCount) {
      setCartPulse(false);
      const frame = window.requestAnimationFrame(() => setCartPulse(true));
      const timer = window.setTimeout(() => setCartPulse(false), 460);
      previousCartCount.current = cartCount;
      return () => { window.cancelAnimationFrame(frame); window.clearTimeout(timer); };
    }
    previousCartCount.current = cartCount;
    return undefined;
  }, [cartCount]);
  return <>
    <header className="store-header">
      <div className="topline"><span><span className="live-dot" /> Good morning, Bengaluru <span className="topline-separator">·</span> Your neighbourhood is in season</span><span>Delivering to <b>Indiranagar, 560038</b> <ChevronDown size={14} /></span></div>
      <div className="main-header">
        <MarketplaceBrand brand={brand} />
        <button className="location-pill" onClick={useCurrentLocation}><MapPin size={17} /><span><small>SHOPPING NEAR</small><b>{location ? 'Your current location' : 'Set your location'}</b></span><ChevronDown size={14} /></button>
        <label className="search-box"><Search size={18} /><input aria-label="Search products and shops" placeholder="Find something lovely nearby..." value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌘ K</kbd></label>
        <div className="header-actions"><button className="icon-button bell-button" aria-label="Notifications"><Bell size={19} /><i /></button>{user && <button className="orders-header-link" onClick={() => window.location.assign('/orders/')}>Orders</button>}<button className="profile-button" aria-label="Your profile" onClick={() => window.location.assign('/account/settings/')}>A</button><button className={`bag-button ${cartPulse ? 'bag-button-pulse' : ''}`} onClick={() => setCartOpen(true)}><ShoppingCart size={18} /><span>Your bag</span><b>{cartCount}</b></button></div>
      </div>
      <nav className="category-nav" aria-label="Main categories"><div className="nav-categories">{categories.slice(1).map(c => <button className={category === c.label ? 'nav-active' : ''} key={c.label} onClick={() => setCategory(c.label)}>{c.label}</button>)}</div><button className="near-filter" onClick={() => setRadius(radius === '10 km' ? '5 km' : '10 km')}><MapPin size={14} />Within {radius}<ChevronDown size={13} /></button></nav>
    </header>

    <main className="store-main">
      <section id="hero" className="hero-banner hero-banner-slide" key={heroSlides[heroIndex]} style={{ backgroundImage: `linear-gradient(90deg, ${brand.primary_color}F2 0%, ${brand.primary_color}D6 38%, ${brand.primary_color}22 100%), url("${heroSlides[heroIndex] || media.hero}")` }}>
        <div className="hero-content"><span className="eyebrow"><span /> {brand.hero_eyebrow || brand.tagline_en}</span><h1>{brand.hero_headline || 'Little shops. Big discoveries.'}</h1><p>{brand.hero_description || 'Good things are closer than you think. Shop independent stores around you and get it delivered today.'}</p><button className="hero-cta" onClick={() => { if (brand.hero_cta_url?.startsWith('#')) document.querySelector(brand.hero_cta_url)?.scrollIntoView({ behavior: 'smooth' }); else if (brand.hero_cta_url) window.location.assign(brand.hero_cta_url); else document.getElementById('nearby-finds')?.scrollIntoView({ behavior: 'smooth' }); }}>{brand.hero_cta_label || 'Explore nearby finds'} <ArrowRight size={16} /></button><div className="hero-proof"><div className="proof-avatars"><span>R</span><span>M</span><span>A</span></div><span><b>4.9/5</b> from your neighbours</span><span className="proof-line" /><span><Truck size={14} /> Same-day delivery</span></div></div>
        <div className="hero-note"><span className="note-icon"><MapPin size={17} /></span><div><b>Right around the corner</b><small>1,248 local shops within 10 km</small></div></div>
        {heroSlides.length > 1 && <div className="hero-slide-controls" aria-label="Banner slides">{heroSlides.map((slide, index) => <button key={slide} className={index === heroIndex ? 'hero-slide-active' : ''} onClick={() => setHeroIndex(index)} aria-label={`Show banner ${index + 1}`} aria-current={index === heroIndex} />)}</div>}
      </section>

      <div className="welcome-row"><div><p className="section-kicker">YOUR LOCAL EDIT</p><h2>Good morning, Aanya <span>☀</span></h2><p className="welcome-copy">A little something from the shops you love.</p></div><button className="text-link" onClick={() => setCategory('All nearby')}>View all nearby shops <ArrowRight size={15} /></button></div>

      <section id="categories" className="category-scroller" aria-label="Shop by category">{categories.map((item, index) => <button key={item.label} className={`category-tile ${category === item.label ? 'category-selected' : ''}`} onClick={() => setCategory(item.label)}><span className={`category-art art-${index}`}>{item.emoji}</span><span className="category-name">{item.label}</span><span className="category-count">{item.count} finds</span></button>)}</section>

      <section id="nearby-finds" className="products-section">
        <div className="products-heading"><div><p className="section-kicker">GOOD THINGS, CLOSE BY</p><h2>{savedOnly ? 'Your saved finds' : category === 'All nearby' ? 'Picked for your neighbourhood' : `${category}, nearby`}</h2><p className="product-subtitle">{catalogStatus || (filtered.length ? `${filtered.length} lovely finds from independent shops near you` : 'Try another search or category to find something nearby.')}</p></div><div className="product-tools"><button className={`saved-filter ${savedOnly ? 'saved-active' : ''}`} onClick={() => setSavedOnly(!savedOnly)}><Heart size={15} fill={savedOnly ? 'currentColor' : 'none'} />Saved</button><label className="sort-label">Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option>Recommended</option><option>Nearest first</option><option>Price: low to high</option></select><ChevronDown size={14} /></label><button className="filter-button"><Settings2 size={16} /> Filters</button></div></div>
        <div className="category-chips">{categories.map(item => <button key={item.label} className={category === item.label ? 'chip-active' : ''} onClick={() => setCategory(item.label)}>{item.label}</button>)}</div>
        {filtered.length ? <div className="product-grid">{filtered.map(product => <ProductCard key={product.id} product={product} add={add} isFavorite={favorites.includes(product.id)} toggleFavorite={toggleFavorite} />)}</div> : <div className="empty-state"><Search size={24} /><b>No finds just yet</b><span>Try a different search, or browse all nearby shops.</span><button onClick={() => { setSearch(''); setCategory('All nearby'); setSavedOnly(false); }}>Show all finds</button></div>}
        <div className="more-row"><span>Showing {filtered.length} of 1,248 local finds</span><button onClick={() => { setCategory('All nearby'); setSavedOnly(false); }}>See all nearby finds <ArrowRight size={15} /></button></div>
      </section>
      <section id="neighbourhood-note" className="neighbourhood-strip"><span className="strip-icon"><Store size={19} /></span><div><b>Your neighbourhood has good taste.</b><span>Every order supports a small business right around the corner.</span></div><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Meet your local shops <ArrowRight size={14} /></button></section>
    </main>
  </>;
}

function Status({ children }) {
  return <span className={`status-pill status-${children.toLowerCase().replaceAll(' ', '-')}`}><span />{children}</span>;
}

function ProductManagement({ mode, user }) {
  const [query, setQuery] = useState(''); const [stockFilter, setStockFilter] = useState('All products');
  const [shops, setShops] = useState([]); const [shopId, setShopId] = useState(''); const [products, setProducts] = useState([]);
  const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
  async function refreshShops() { if (!user) { setMessage('Sign in with the account that owns a shop to manage products.'); return; } setLoading(true); try { const data = await loadMyShops(user.id); setShops(data); setShopId(current => current && data.some(shop => shop.id === current) ? current : data[0]?.id || ''); if (!data.length) setMessage('No shop is assigned to this account yet.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load your shops.'); } finally { setLoading(false); } }
  async function refreshProducts() { if (!shopId) { setProducts([]); return; } setLoading(true); try { setProducts(await loadVendorProducts(shopId)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load products.'); } finally { setLoading(false); } }
  useEffect(() => { refreshShops(); }, [user?.id]);
  useEffect(() => { refreshProducts(); }, [shopId]);
  const list = products.filter(item => (stockFilter === 'All products' || (stockFilter === 'Low stock' ? item.stock > 0 && item.stock <= 5 : item.stock > 5)) && `${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  const label = item => !item.is_active ? 'Hidden' : item.stock === 0 ? 'Out of stock' : item.stock <= 5 ? 'Low stock' : 'In stock';
  return <section id={mode === 'Products' ? 'product-catalog' : 'inventory'} className="dash-panel"><div className="panel-heading"><div><h2>{mode === 'Products' ? 'Your product catalog' : 'Inventory at a glance'}</h2><p>{mode === 'Products' ? 'Create, edit, and publish the items customers can buy.' : 'Monitor stock quantities for the products in your catalog.'}</p></div><button className="outline-button" disabled={!shopId} onClick={() => window.location.assign('/seller/products/editor/')}><Plus size={14} />Add product</button></div>{shops.length > 1 && <label className="shop-select">Shop <select value={shopId} onChange={e => setShopId(e.target.value)}>{shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></label>}<div className="product-management-toolbar"><label className="table-search"><Search size={15} /><input aria-label="Search products" placeholder="Search your products" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="table-tabs">{['All products', 'In stock', 'Low stock'].map(tab => <button key={tab} className={stockFilter === tab ? 'tab-active' : ''} onClick={() => setStockFilter(tab)}>{tab}{tab === 'Low stock' && products.filter(item => item.stock > 0 && item.stock <= 5).length > 0 && <i>{products.filter(item => item.stock > 0 && item.stock <= 5).length}</i>}</button>)}</div></div>{message && <p className="catalog-message" role="status">{message}</p>}<div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>AVAILABLE</th><th>STATUS</th><th></th></tr></thead><tbody>{list.map(item => <tr key={item.id}><td><b>{item.name}</b><small className="product-description">{item.description}</small></td><td>{item.category}</td><td><b>{money(item.price_paise / 100)}</b></td><td><b>{item.stock} units</b></td><td><Status>{label(item)}</Status></td><td><button className="row-more" aria-label={`Edit ${item.name}`} onClick={() => window.location.assign(`/seller/products/editor/?id=${item.id}`)}>Edit</button></td></tr>)}</tbody></table>{loading && <div className="no-table-results">Loading your catalog…</div>}{!loading && !list.length && <div className="no-table-results">{shopId ? 'No products match this view.' : 'Connect a shop to start managing products.'}</div>}</div><div className="table-footer"><span>{list.length} product{list.length === 1 ? '' : 's'} shown</span><button onClick={() => setStockFilter('Low stock')}>Review low stock <ArrowRight size={13} /></button></div></section>;
}

function VendorApplicationQueue() {
  const [applications, setApplications] = useState([]); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState('');
  async function refresh() { setLoading(true); try { setApplications(await loadVendorApplications()); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load vendor applications.'); } finally { setLoading(false); } }
  useEffect(() => { refresh(); }, []);
  async function review(application, decision) { const reason = decision === 'rejected' ? window.prompt('Reason for rejection (optional):') || '' : ''; setBusyId(application.id); setMessage(''); try { await reviewVendorApplication(application.id, decision, reason); await refresh(); setMessage(`${application.shop_name} was ${decision}.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to review application.'); } finally { setBusyId(''); } }
  return <section className="dash-panel"><div className="panel-heading"><div><h2>Vendor applications</h2><p>Approve a verified shop to create its vendor workspace.</p></div><button className="subtle-button" onClick={refresh}>Refresh</button></div>{message && <p className="catalog-message" role="status">{message}</p>}<div className="table-scroll"><table><thead><tr><th>SHOP</th><th>CATEGORY</th><th>ADDRESS</th><th>APPLIED</th><th>ACTIONS</th></tr></thead><tbody>{applications.map(application => <tr key={application.id}><td><b>{application.shop_name}</b></td><td>{application.category}</td><td>{application.address}</td><td>{new Date(application.created_at).toLocaleDateString('en-IN')}</td><td><div className="application-actions"><button disabled={busyId === application.id} onClick={() => review(application, 'approved')}>Approve</button><button disabled={busyId === application.id} onClick={() => review(application, 'rejected')}>Reject</button></div></td></tr>)}</tbody></table>{loading && <div className="no-table-results">Loading applications…</div>}{!loading && !applications.length && <div className="no-table-results">No pending vendor applications.</div>}</div><div className="table-footer"><span>Approved shops start hidden until an administrator activates them and completes location details.</span></div></section>;
}

function Dashboard({ role, setStorefront, user }) {
  const [menu, setMenu] = useState('Overview');
  const [query, setQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('All orders');
  const vendor = role === 'vendor';
  const menus = vendor ? [
    { title: 'WORKSPACE', items: [['Overview', LayoutDashboard], ['Orders', ShoppingBag, '4'], ['Products', Box], ['Inventory', Boxes]] },
    { title: 'YOUR BUSINESS', items: [['Store profile', Store], ['Insights', ArrowUpRight]] },
  ] : [
    { title: 'PLATFORM', items: [['Overview', LayoutDashboard], ['Vendors', Store], ['Customers', Users], ['Orders', ShoppingBag]] },
    { title: 'MANAGE', items: [['Categories', Boxes], ['Service areas', MapPin], ['Settings', Settings2]] },
  ];
  const filteredOrders = vendorOrders.filter(o => orderFilter === 'All orders' || o.status === orderFilter);
  const filteredVendors = adminVendors.filter(v => `${v.name} ${v.owner} ${v.area}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="dashboard-shell">
    <aside className={`dash-sidebar ${vendor ? 'merchant-sidebar' : 'platform-sidebar'}`}><Brand compact /><div className="workspace-label">{vendor ? 'MERCHANT WORKSPACE' : 'PLATFORM ADMIN'}</div><div className="workspace-switch"><span className={vendor ? 'store-avatar' : 'admin-avatar'}>{vendor ? 'GB' : '3'}</span><span><b>{vendor ? 'Green Basket' : '3cr platform'}</b><small>{vendor ? 'Indiranagar, Bengaluru' : 'Bengaluru region'}</small></span><ChevronDown size={14} /></div>
      {menus.map(group => <div className="sidebar-group" key={group.title}><span className="sidebar-title">{group.title}</span>{group.items.map(([label, Icon, count]) => <button key={label} className={`sidebar-link ${menu === label ? 'sidebar-active' : ''}`} onClick={() => setMenu(label)}><Icon size={17} /><span>{label}</span>{count && <b className="sidebar-count">{count}</b>}</button>)}</div>)}
      <div className="sidebar-bottom"><div className="help-card"><span><CircleHelp size={16} /></span><b>Need a hand?</b><small>Our local team is here for you.</small><button onClick={() => setMenu('Help & support')}>Visit help centre <ArrowRight size={13} /></button></div><button className="account-link"><span className="profile-button small-profile">{vendor ? 'A' : 'N'}</span><span><b>{vendor ? 'Arjun Patel' : 'Nandita Rao'}</b><small>{vendor ? 'Store owner' : 'Platform admin'}</small></span><ChevronDown size={14} /></button></div>
    </aside>
    <main className="dash-main"><header className="dash-topbar"><div className="breadcrumbs">{vendor ? 'Green Basket' : 'Platform'} <span>/</span> <b>{menu}</b></div><div className="dash-top-actions"><button className="view-store-link" onClick={() => setStorefront(true)}><ArrowUpRight size={14} /> View marketplace</button><button className="icon-button" aria-label="Notifications"><Bell size={18} /><i /></button><div className="avatar-name">{vendor ? 'AP' : 'NR'}</div></div></header>
      <div className="dash-content"><div className="dash-title-row"><div><p className="section-kicker">{vendor ? 'FRIDAY, 20 NOVEMBER 2026' : 'PLATFORM OVERVIEW'}</p><h1>{vendor ? 'Good morning, Arjun 👋' : 'Good morning, Nandita 👋'}</h1><p>{vendor ? 'Here’s what’s happening at your shop today.' : 'A live view of your marketplace, ready to grow to 10,000 local shops.'}</p></div><button className="outline-button" onClick={() => setMenu(vendor ? 'Store profile' : 'Service areas')}><ArrowUpRight size={15} />{vendor ? 'View your storefront' : 'Explore service areas'}</button></div>
        <div className="dashboard-metrics">{(vendor ? [
          { label: 'Today’s sales', value: '₹18,420', change: '+12.8%', note: 'vs. yesterday', icon: CreditCard, trend: 'up' },
          { label: 'New orders', value: '24', change: '+4', note: 'since 9 am', icon: ShoppingBag, trend: 'up' },
          { label: 'Products live', value: '86', change: '4 low stock', note: 'need a top-up', icon: Box, trend: 'warn' },
          { label: 'Shop rating', value: '4.9', change: '★', note: 'from 218 reviews', icon: BadgeCheck, trend: 'up' },
        ] : [
          { label: 'Local vendors', value: '1,248', change: '+8.4%', note: 'this month', icon: Store, trend: 'up' },
          { label: 'Orders today', value: '3,862', change: '+12.1%', note: 'vs. last Tuesday', icon: ShoppingBag, trend: 'up' },
          { label: 'Active customers', value: '24.6k', change: '+6.2%', note: 'this month', icon: Users, trend: 'up' },
          { label: 'Coverage radius', value: '10 km', change: '8 areas', note: 'across Bengaluru', icon: MapPin, trend: 'up' },
        ]).map(({ label, value, change, note, icon: Icon, trend }) => <article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-foot"><b className={trend === 'warn' ? 'metric-warning' : ''}>{trend !== 'warn' && <ArrowUpRight size={13} />}{change}</b><span>{note}</span></div></article>)}</div>
        {vendor ? (menu === 'Products' || menu === 'Inventory' ? <ProductManagement mode={menu} user={user} /> : <>
          <section id="orders-overview" className="dash-panel"><div className="panel-heading"><div><h2>{menu === 'Overview' ? 'Recent orders' : menu === 'Orders' ? 'All orders' : menu === 'Products' ? 'Your products' : menu === 'Inventory' ? 'Stock overview' : menu}</h2><p>{menu === 'Orders' ? 'Manage every order from your neighbourhood.' : 'Keep your shop moving, one order at a time.'}</p></div><button className="subtle-button" onClick={() => setMenu('Orders')}>View all orders <ArrowRight size={14} /></button></div><div className="table-controls"><div className="table-tabs">{['All orders', 'New', 'Preparing', 'Ready for pickup'].map(tab => <button key={tab} className={orderFilter === tab ? 'tab-active' : ''} onClick={() => { setOrderFilter(tab); setMenu('Orders'); }}>{tab}{tab === 'New' && <i>4</i>}</button>)}</div><button className="outline-button small-outline"><Settings2 size={14} /> Filter</button></div><div className="table-scroll"><table><thead><tr><th>ORDER</th><th>ITEMS</th><th>CUSTOMER</th><th>PLACED</th><th>STATUS</th><th>TOTAL</th><th></th></tr></thead><tbody>{filteredOrders.length ? filteredOrders.map(order => <tr key={order.id}><td><b>{order.id}</b></td><td>{order.item}</td><td>{order.customer}</td><td>{order.time}</td><td><Status>{order.status}</Status></td><td><b>{order.amount}</b></td><td><button className="row-more" aria-label={`Open order ${order.id}`} onClick={() => setMenu('Orders')}>•••</button></td></tr>) : <tr><td colSpan="7" className="no-table-results">No orders in this view.</td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {filteredOrders.length} of 24 orders today</span><button onClick={() => setMenu('Orders')}>Go to orders <ArrowRight size={13} /></button></div></section>
          <section id="store-health" className="dash-lower"><div className="dash-panel mini-panel"><div className="panel-heading"><div><h2>Stock to check</h2><p>Keep your bestsellers ready to go.</p></div><button className="dots-button">•••</button></div>{[['Free-range eggs', 'Green Basket', '3 left'], ['Mangoes, Alphonso', 'Green Basket', '5 left'], ['Baby spinach', 'Green Basket', '6 left']].map((r, i) => <div className="stock-row" key={r[0]}><span className={`stock-thumb stock-${i}`}>{i === 0 ? '🥚' : i === 1 ? '🥭' : '🥬'}</span><span><b>{r[0]}</b><small>{r[1]}</small></span><span className="low-stock">{r[2]}</span></div>)}<button className="panel-bottom-link" onClick={() => setMenu('Inventory')}>Manage inventory <ArrowRight size={13} /></button></div><div className="dash-panel delivery-panel"><span className="delivery-icon"><PackageCheck size={19} /></span><p className="section-kicker">ON THE MOVE</p><h2>Delivery is looking good</h2><p>All 18 orders scheduled today are on track. Your neighbours are loving the quick turnarounds.</p><div className="delivery-progress"><span className="progress-78" /></div><div className="delivery-caption"><b>78%</b> delivered before 1 pm <span>18 total orders</span></div></div></section>
        </>) : (menu === 'Vendors' ? <VendorApplicationQueue /> : <>
          <section id="vendor-management" className="dash-panel"><div className="panel-heading"><div><h2>{menu === 'Overview' ? 'Neighbourhood vendors' : menu}</h2><p>Independent businesses bringing good things closer.</p></div><div className="vendor-panel-actions"><label className="table-search"><Search size={15} /><input aria-label="Search vendors" placeholder="Search vendors" value={query} onChange={e => setQuery(e.target.value)} /></label><button className="subtle-button" onClick={() => setMenu('Vendors')}>All vendors <ArrowRight size={14} /></button></div></div><div className="table-scroll"><table><thead><tr><th>SHOP</th><th>CATEGORY</th><th>AREA</th><th>ORDERS</th><th>STATUS</th><th></th></tr></thead><tbody>{filteredVendors.map(v => <tr key={v.name}><td><div className="vendor-cell"><span className="vendor-initials">{v.initials}</span><span><b>{v.name}</b><small>{v.owner}</small></span></div></td><td>{v.category}</td><td>{v.area}</td><td><b>{v.orders}</b></td><td><Status>{v.status}</Status></td><td><button className="row-more" aria-label={`Manage ${v.name}`} onClick={() => setMenu('Vendors')}>•••</button></td></tr>)}</tbody></table>{filteredVendors.length === 0 && <div className="no-table-results">No vendors match your search.</div>}</div><div className="table-footer"><span>Showing {filteredVendors.length} of 1,248 approved vendors</span><button onClick={() => setMenu('Vendors')}>Manage vendors <ArrowRight size={13} /></button></div></section>
          <section id="marketplace-health" className="dash-lower"><div className="dash-panel mini-panel"><div className="panel-heading"><div><h2>Growing neighbourhoods</h2><p>Active shopping across Bengaluru.</p></div><button className="dots-button">•••</button></div>{[['Indiranagar', '182 vendors', '2.8k'], ['Koramangala', '164 vendors', '2.4k'], ['HSR Layout', '138 vendors', '1.9k']].map((r, i) => <div className="area-row" key={r[0]}><span className={`area-dot area-dot-${i}`} /><span><b>{r[0]}</b><small>{r[1]}</small></span><span className="area-orders">{r[2]} orders</span></div>)}<button className="panel-bottom-link" onClick={() => setMenu('Service areas')}>Explore all service areas <ArrowRight size={13} /></button></div><div className="dash-panel delivery-panel admin-insight"><span className="delivery-icon"><ShieldCheck size={19} /></span><p className="section-kicker">NEIGHBOURHOOD HEALTH</p><h2>Independent shops are thriving</h2><p>Local orders are up 18% this month. More neighbours are choosing shops close to home.</p><div className="insight-highlight"><ArrowUpRight size={16} /><b>+18%</b><span>local orders this month</span></div></div></section>
        </>)}
        <div className="dash-footer"><span>3cr Marketplace <span>·</span> A little closer to home.</span><span>Workspace <b><i /> Preview mode</b></span></div>
      </div>
    </main>
  </div>;
}

function CartDrawer({ cart, setCart, close, user }) {
  const items = Object.values(cart);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const [addresses, setAddresses] = useState([]); const [addressId, setAddressId] = useState(''); const [addingAddress, setAddingAddress] = useState(false); const [address, setAddress] = useState(emptyAddress); const [savingAddress, setSavingAddress] = useState(false); const [locating, setLocating] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const shopId = items[0]?.product.shopId;
  async function refreshAddresses() { try { const rows = await loadMyAddresses(); setAddresses(rows); setAddressId(current => current || rows[0]?.id || ''); } catch (error) { setCheckoutMessage(error instanceof Error ? error.message : 'Unable to load saved addresses.'); } }
  useEffect(() => { if (user) refreshAddresses(); else { setAddresses([]); setAddressId(''); } }, [user?.id]);
  function locate() { if (!navigator.geolocation) { setCheckoutMessage('Location is not supported by this browser.'); return; } setLocating(true); navigator.geolocation.getCurrentPosition(position => { setAddress(current => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude })); setLocating(false); }, () => { setLocating(false); setCheckoutMessage('Allow location access so we can calculate delivery distance.'); }, { enableHighAccuracy: true, timeout: 15000 }); }
  async function saveAddress(event) { event.preventDefault(); if (!user) { setCheckoutMessage('Sign in before saving an address.'); return; } if (address.latitude == null || address.longitude == null) { setCheckoutMessage('Use your current location before saving this address.'); return; } setSavingAddress(true); setCheckoutMessage(''); try { const id = await createDeliveryAddress(address); await refreshAddresses(); setAddressId(id); setAddingAddress(false); setAddress(emptyAddress); } catch (error) { setCheckoutMessage(error instanceof Error ? error.message : 'Unable to save this address.'); } finally { setSavingAddress(false); } }
  const update = (id, delta) => setCart(current => {
    const next = { ...current };
    const quantity = (next[id]?.qty || 0) + delta;
    if (quantity <= 0) delete next[id]; else next[id] = { ...next[id], qty: quantity };
    return next;
  });
  async function submitCodOrder() {
    localStorage.setItem('3cr-checkout-cart', JSON.stringify(items));
    window.location.assign('/checkout/');
  }
  return <div className="cart-overlay" onMouseDown={e => e.target === e.currentTarget && close()}><aside className="cart-drawer" aria-label="Your shopping bag"><div className="cart-head"><div><p className="section-kicker">YOUR LOCAL FINDS</p><h2>Your bag <span>({items.reduce((n, i) => n + i.qty, 0)})</span></h2></div><button className="icon-button" aria-label="Close bag" onClick={close}><X size={19} /></button></div>{items.length ? <><div className="cart-items">{items.map(({ product, qty }) => <div className="cart-item" key={product.id}><img src={product.image} alt="" /><div className="cart-item-info"><b>{product.name}</b><small>{product.shop} · {product.distance}</small><strong>{money(product.price)}</strong><div className="quantity-control"><button aria-label="Remove one" onClick={() => update(product.id, -1)}><Minus size={12} /></button><span>{qty}</span><button aria-label="Add one" onClick={() => update(product.id, 1)}><Plus size={12} /></button></div></div><button className="remove-item" aria-label="Remove item" onClick={() => update(product.id, -qty)}><X size={14} /></button></div>)}</div><div className="cart-bottom"><div className="delivery-estimate"><Truck size={16} /><span>Estimated delivery</span><b>Today, 30–45 min</b></div><div className="subtotal-row"><span>Subtotal</span><b>{money(total)}</b></div><p className="checkout-note">Choose your saved address and complete payment on the full checkout page.</p><button className="hero-cta" onClick={submitCodOrder}>Continue to checkout</button><button className="keep-shopping" onClick={close}>Keep browsing nearby</button></div></> : <div className="cart-empty"><span><ShoppingBag size={29} /></span><h3>Your bag is taking a little stroll.</h3><p>Add something lovely from a shop around the corner.</p><button onClick={close}>Find a local favourite <ArrowRight size={14} /></button></div>}</aside></div>;
}

function AccountAccess({ user, setUser }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('Sign in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, [setUser]);
  async function submit(event) {
    event.preventDefault();
    if (!supabase) { setMessage('Backend connection is not available in this build.'); return; }
    setBusy(true); setMessage('');
    const result = mode === 'Create account'
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(result.error?.message || (mode === 'Create account' && !result.data.session ? 'Account created. Sign in with your email and password.' : 'You’re signed in.'));
    if (result.data.session?.user) setOpen(false);
  }
  return <>
    <button className="account-access-trigger" onClick={() => user ? supabase?.auth.signOut() : setOpen(true)}>{user ? 'Sign out' : 'Sign in'}</button>
    {user && <button className="account-access-trigger" style={{ bottom: 136 }} onClick={() => window.location.assign('/account/settings/')}>Account settings</button>}
    {open && <div className="cart-overlay" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}><aside className="cart-drawer auth-panel" aria-label="Account access"><div className="cart-head"><div><p className="section-kicker">3CR ACCOUNT</p><h2>{mode}</h2></div><button className="icon-button" aria-label="Close" onClick={() => setOpen(false)}><X size={19} /></button></div><form className="account-form" onSubmit={submit}><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" minLength="8" required autoComplete={mode === 'Sign in' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} /></label><button className="hero-cta" disabled={busy}>{busy ? 'Please wait…' : mode}</button>{message && <p role="status">{message}</p>}</form>{mode === 'Sign in' && <button className="keep-shopping" onClick={() => window.location.assign('/forgot-password/')}>Forgot password?</button>}<button className="keep-shopping" onClick={() => { setMode(mode === 'Sign in' ? 'Create account' : 'Sign in'); setMessage(''); }}>{mode === 'Sign in' ? 'New here? Create an account' : 'Already registered? Sign in'}</button></aside></div>}
  </>;
}

export default function MarketplaceApp() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('customer');
  const [showStorefront, setShowStorefront] = useState(false);
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState([2]);
  const [brand, setBrand] = useState(fallbackMarketplaceBrand);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let savedLocation = null;
    try { savedLocation = JSON.parse(window.localStorage.getItem('ntn-bzr-brand-location') || 'null'); } catch { window.localStorage.removeItem('ntn-bzr-brand-location'); }
    resolveMarketplaceBrand(params.get('city') || savedLocation?.city, params.get('area') || savedLocation?.area).then((nextBrand) => {
      setBrand(nextBrand);
      document.title = `${nextBrand.name_en} — local marketplace`;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextBrand.primary_color);
    });
  }, []);
  useEffect(() => {
    if (!supabase) return;
    const applySession = async (session) => {
      setUser(session?.user || null);
      if (!session?.user) { setRole('customer'); setShowStorefront(false); return; }
      try { const profile = await loadMyProfile(); setRole(profile?.role === 'super_admin' ? 'super_admin' : profile?.role === 'admin' ? 'admin' : profile?.seller_enabled ? 'vendor' : 'customer'); setShowStorefront(false); }
      catch { setRole('customer'); }
    };
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => applySession(session));
    return () => listener.subscription.unsubscribe();
  }, []);
  const add = product => setCart(current => {
    const first = Object.values(current)[0];
    if (first && first.product.shopId !== product.shopId) { window.alert('Your bag can contain items from one shop at a time. Complete or clear this order before adding another shop.'); return current; }
    return { ...current, [product.id]: { product, qty: (current[product.id]?.qty || 0) + 1 } };
  });
  const toggleFavorite = id => setFavorites(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  return <><div className="app-frame" style={{ '--brand-primary': brand.primary_color, '--brand-accent': brand.accent_color, '--brand-surface': brand.surface_color }}>
    {role === 'admin' || role === 'super_admin'
      ? <AdminOperations isSuperAdmin={role === 'super_admin'} />
      : role === 'vendor' && !showStorefront
        ? <SellerWorkspace user={user} setStorefront={setShowStorefront} />
      : showStorefront || role === 'customer'
        ? <CustomerStore cart={cart} add={add} toggleFavorite={toggleFavorite} favorites={favorites} setCartOpen={setCartOpen} user={user} brand={brand} />
        : <Dashboard role={role} setStorefront={setShowStorefront} user={user} />}
    {role !== 'admin' && role !== 'super_admin' && <AccountAccess user={user} setUser={setUser} />}
    {(showStorefront || role === 'customer') && <div className="market-footer"><div><MarketplaceBrand brand={brand} compact /><span>{brand.tagline_en}</span></div><span>© 2026 {brand.name_en} · All rights reserved.</span></div>}
    {cartOpen && <CartDrawer cart={cart} setCart={setCart} close={() => setCartOpen(false)} user={user} />}
  </div><Toaster position="top-right" richColors closeButton /></>;
}
