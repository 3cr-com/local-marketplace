import { ShoppingBag } from 'lucide-react';

export default function MarketplaceBrand({ brand, compact = false }) {
  const icon = brand.logo_url || brand.icon_url;
  return <div className={`brand ${compact ? 'brand-compact' : ''}`} style={{ '--brand-primary': brand.primary_color, '--brand-accent': brand.accent_color }}>
    <span className="brand-mark">{icon ? <img src={icon} alt="" /> : <ShoppingBag size={19} strokeWidth={2.5} />}</span>
    <span><b>{brand.name_bn}</b><span className="brand-green">{brand.name_en}</span><small>{brand.tagline_en}</small></span>
  </div>;
}
