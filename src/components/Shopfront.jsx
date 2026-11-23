import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin, Minus, Package, Plus, ShoppingBag, Store, UserRound } from 'lucide-react';
import { loadPublicShopfront } from '../features/discovery/discovery.repository';

const fallbackImage = '/images/3cr-fresh-produce.png';
const money = (paise) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
const initials = (name) => (name || 'Shop owner').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function Shopfront() {
  const shopId = new URLSearchParams(window.location.search).get('id') || '';
  const [shopfront, setShopfront] = useState(null);
  const [status, setStatus] = useState('Loading shop…');
  const [cart, setCart] = useState({});
  useEffect(() => { if (!shopId) { setStatus('No shop was selected.'); return; } let active = true; loadPublicShopfront(shopId).then((next) => { if (!active) return; setShopfront(next); setStatus(next ? '' : 'This shop is not available right now.'); }).catch((error) => active && setStatus(error instanceof Error ? error.message : 'Unable to load this shop.')); return () => { active = false; }; }, [shopId]);
  const items = Object.values(cart);
  const quantity = items.reduce((total, item) => total + item.qty, 0);
  const total = items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const add = (product) => setCart((current) => ({ ...current, [product.id]: { product, qty: (current[product.id]?.qty || 0) + 1 } }));
  const update = (id, delta) => setCart((current) => { const next = { ...current }; const qty = (next[id]?.qty || 0) + delta; if (qty <= 0) delete next[id]; else next[id] = { ...next[id], qty }; return next; });
  const checkout = () => { localStorage.setItem('3cr-checkout-cart', JSON.stringify(items)); window.location.assign('/checkout/'); };
  const products = useMemo(() => (shopfront?.products || []).map((product) => ({ ...product, price: Math.round(product.price_paise / 100), shop: shopfront.shop.name, shopId: shopfront.shop.id, image: product.image_url || fallbackImage, detail: product.description || product.category, distance: 'Local shop' })), [shopfront]);
  if (!shopfront) return <main className="shopfront-page"><a className="shopfront-back" href="/">← Back to marketplace</a><div className="empty-state shopfront-empty"><Store size={26} /><b>{status}</b><a href="/search/">Search other local shops</a></div></main>;
  const { shop } = shopfront;
  const address = [shop.address, shop.city, shop.state, shop.pincode].filter(Boolean).join(', ');
  return <main className="shopfront-page"><a className="shopfront-back" href="/"><ArrowLeft size={16} /> Back to marketplace</a><section className="shopfront-hero"><img className="shopfront-cover" src={shop.image_url || fallbackImage} alt={`${shop.name} storefront`} /><div className="shopfront-details"><p className="section-kicker">LOCAL SHOP</p><h1>{shop.name}</h1><p className="shopfront-categories">{shop.categories?.join(' · ') || shop.category || 'Neighbourhood shop'}</p><p className="shopfront-address"><MapPin size={16} />{address || 'Local delivery address available at checkout'}</p><p className="shopfront-hours">Open {shop.opens_at?.slice(0, 5) || 'today'} – {shop.closes_at?.slice(0, 5) || 'today'} · {shop.timezone || 'Asia/Kolkata'}</p><div className="shopfront-owner">{shop.owner_avatar_url ? <img src={shop.owner_avatar_url} alt="" /> : <span><UserRound size={18} />{initials(shop.owner_name)}</span>}<div><small>SHOP OWNER</small><b>{shop.owner_name || 'Local shop owner'}</b></div></div></div></section><section className="shopfront-catalog"><div><p className="section-kicker">SHOP CATALOGUE</p><h2>Everything available at {shop.name}</h2><p>Items from this one shop can be ordered together in a single delivery.</p></div><span>{products.length} products</span></section>{products.length ? <div className="shopfront-product-grid">{products.map((product) => <article className="shopfront-product" key={product.id}><img src={product.image} alt={product.name} /><div><span>{product.category}</span><h3>{product.name}</h3><p>{product.detail}</p><footer><b>{money(product.price_paise)}</b>{cart[product.id] ? <div className="shopfront-quantity"><button onClick={() => update(product.id, -1)} aria-label={`Remove ${product.name}`}><Minus size={14} /></button><span>{cart[product.id].qty}</span><button onClick={() => add(product)} aria-label={`Add ${product.name}`}><Plus size={14} /></button></div> : <button className="shopfront-add" onClick={() => add(product)}><Plus size={15} /> Add</button>}</footer></div></article>)}</div> : <div className="empty-state"><Package size={25} /><b>No products are live yet</b><span>Check back soon for this shop’s catalogue.</span></div>}{quantity > 0 && <div className="shopfront-cart"><div><ShoppingBag size={19} /><span><b>{quantity} item{quantity === 1 ? '' : 's'} in your bag</b><small>{shop.name} · {money(total)}</small></span></div><button onClick={checkout}>Continue to checkout</button></div>}</main>;
}
