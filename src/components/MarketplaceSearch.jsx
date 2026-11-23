import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MapPin, Search, SlidersHorizontal, Store } from 'lucide-react';
import { searchMarketplace } from '../features/discovery/discovery.repository';

const fallbackImage = '/images/3cr-fresh-produce.png';
const money = (paise) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

function submitSearch(query) {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  window.location.assign(`/search/${params.toString() ? `?${params}` : ''}`);
}

export default function MarketplaceSearch() {
  const initialQuery = new URLSearchParams(window.location.search).get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState({ products: [], shops: [] });
  const [status, setStatus] = useState('Searching local shops…');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('Recommended');

  useEffect(() => {
    let active = true;
    setStatus('Searching local shops…');
    searchMarketplace(initialQuery).then((next) => {
      if (!active) return;
      setResult(next);
      setStatus(next.products.length || next.shops.length ? '' : 'No local products or shops match this search yet.');
    }).catch((error) => active && setStatus(error instanceof Error ? error.message : 'Search is unavailable right now.'));
    return () => { active = false; };
  }, [initialQuery]);

  const categories = useMemo(() => ['All', ...new Set(result.products.map((product) => product.category).filter(Boolean))], [result.products]);
  const products = useMemo(() => {
    let rows = category === 'All' ? result.products : result.products.filter((product) => product.category === category);
    if (sort === 'Price: low to high') rows = [...rows].sort((a, b) => a.price_paise - b.price_paise);
    if (sort === 'Price: high to low') rows = [...rows].sort((a, b) => b.price_paise - a.price_paise);
    return rows;
  }, [category, result.products, sort]);

  return <main className="discovery-page">
    <header className="discovery-header">
      <a className="discovery-brand" href="/">Super<span>Bazzar</span><small>local marketplace</small></a>
      <form className="discovery-search" onSubmit={(event) => { event.preventDefault(); submitSearch(query); }}>
        <Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products and shops" aria-label="Search products and shops" />
        <button type="submit">Search</button>
      </form>
      <a className="discovery-back" href="/">Back to marketplace</a>
    </header>
    <section className="discovery-content">
      <div className="discovery-intro"><p className="section-kicker">SEARCH RESULTS</p><h1>{initialQuery ? <>Results for “{initialQuery}”</> : 'Explore local shops and products'}</h1><p>Find a product, browse a shop, then order from one neighbourhood shop at a time.</p></div>
      <div className="discovery-layout">
        <div className="discovery-results">
          {result.shops.length > 0 && <section className="search-shop-section"><div className="search-section-heading"><div><p className="section-kicker">LOCAL SHOPS</p><h2>Shops matching your search</h2></div><span>{result.shops.length} found</span></div><div className="search-shop-grid">{result.shops.map((shop) => <a className="search-shop-card" href={`/shop/?id=${shop.id}`} key={shop.id}><img src={shop.image_url || fallbackImage} alt="" /><div><span className="search-shop-icon"><Store size={14} /></span><h3>{shop.name}</h3><p>{shop.category || 'Neighbourhood shop'} · {shop.city || shop.address || 'Local delivery'}</p><small>Meet {shop.owner_name || 'the shop owner'} <ArrowRight size={13} /></small></div></a>)}</div></section>}
          <section><div className="search-section-heading"><div><p className="section-kicker">PRODUCTS</p><h2>Available to order</h2></div><span>{products.length} found</span></div>{products.length ? <div className="search-product-grid">{products.map((product) => <article className="search-product-card" key={product.id}><img src={product.image_url || fallbackImage} alt={product.name} /><div><a href={`/shop/?id=${product.shop_id}`} className="product-shop-link"><MapPin size={12} />{product.shop_name}</a><h3>{product.name}</h3><p>{product.description || product.category}</p><div><b>{money(product.price_paise)}</b><a href={`/shop/?id=${product.shop_id}`}>View shop <ArrowRight size={13} /></a></div></div></article>)}</div> : <div className="empty-state"><Search size={24} /><b>No products found</b><span>Try a broader search, or browse the shops above.</span></div>}</section>
          {status && <p className="discovery-status" role="status">{status}</p>}
        </div>
        <aside className="discovery-filters"><div className="filter-title"><SlidersHorizontal size={16} /><b>Filters</b></div><label>Sort products<select value={sort} onChange={(event) => setSort(event.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Price: high to low</option></select></label><div><span>Categories</span>{categories.map((item) => <button className={category === item ? 'filter-choice-active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><button className="filter-clear" onClick={() => { setCategory('All'); setSort('Recommended'); }}>Clear filters</button></aside>
      </div>
    </section>
  </main>;
}
