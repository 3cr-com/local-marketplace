import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, Paintbrush, Plus, RefreshCw, Save } from 'lucide-react';
import { fallbackMarketplaceBrand } from '../features/branding/models/marketplace-brand';
import { loadMarketplaceBrands, loadBrandLocations, loadBrandLocationOverrides, publishMarketplaceBrand, saveBrandLocation, saveBrandLocationOverride, saveMarketplaceBrand } from '../features/branding/branding.repository';

const toDraft = (brand = fallbackMarketplaceBrand) => ({
  slug: brand.slug, name_bn: brand.name_bn, name_en: brand.name_en, tagline_bn: brand.tagline_bn,
  tagline_en: brand.tagline_en, primary_color: brand.primary_color, accent_color: brand.accent_color,
  surface_color: brand.surface_color, logo_url: brand.logo_url || '', icon_url: brand.icon_url || '',
  hero_desktop_url: brand.hero_desktop_url || '', hero_mobile_url: brand.hero_mobile_url || '',
  hero_eyebrow: brand.hero_eyebrow, hero_headline: brand.hero_headline, hero_description: brand.hero_description,
  hero_cta_label: brand.hero_cta_label, hero_cta_url: brand.hero_cta_url, hero_alt_text: brand.hero_alt_text,
});

const suppliedAssets = [
  '/images/notun-bazar-banner.png', '/images/notun-bazar-banner2.png', '/images/notun-bazar-banner3.png',
  '/images/notun-bazar-banner4.png', '/images/notun-bazar-location-logo.png', '/images/notun-bazar-location.png',
];

export default function BrandingWorkspace() {
  const [brands, setBrands] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(toDraft());
  const [message, setMessage] = useState('Loading brand profiles…');
  const [busy, setBusy] = useState(false);
  const selected = useMemo(() => brands.find((brand) => brand.id === selectedId) || null, [brands, selectedId]);

  async function refresh(preferredId = selectedId) {
    try {
      const next = await loadMarketplaceBrands();
      setBrands(next);
      const current = next.find((brand) => brand.id === preferredId) || next[0] || null;
      setSelectedId(current?.id || '');
      setDraft(toDraft(current || fallbackMarketplaceBrand));
      setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load brand profiles.'); }
  }

  useEffect(() => { refresh(''); }, []);

  function selectBrand(id) {
    const next = brands.find((brand) => brand.id === id);
    setSelectedId(id);
    setDraft(toDraft(next));
    setMessage('');
  }

  function createBrand() {
    setSelectedId('');
    setDraft({ ...toDraft(fallbackMarketplaceBrand), slug: '', name_bn: '', name_en: '', tagline_bn: '', tagline_en: '', hero_headline: '', hero_description: '' });
    setMessage('Creating a draft profile. Save it before publishing.');
  }

  function update(field, value) { setDraft((current) => ({ ...current, [field]: value })); }

  async function save() {
    setBusy(true); setMessage('');
    try {
      const id = await saveMarketplaceBrand(draft, selectedId || undefined);
      await refresh(id);
      setMessage(selectedId ? 'Brand profile saved. Published profiles update the storefront immediately.' : 'Brand draft saved. Publish when this is ready for customers.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save the brand draft.'); }
    finally { setBusy(false); }
  }

  async function publish() {
    if (!selectedId) { setMessage('Save this new brand before publishing it.'); return; }
    setBusy(true); setMessage('');
    try {
      await publishMarketplaceBrand(selectedId);
      await refresh(selectedId);
      setMessage('Brand published as the active marketplace default. Customers will receive it on refresh.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish this brand.'); }
    finally { setBusy(false); }
  }

  return <section className="branding-workspace">
    <section className="dash-panel branding-list-panel">
      <div className="panel-heading"><div><p className="section-kicker">NTN-BZR-3</p><h2>Brand profiles</h2><p>Create drafts, edit content, then publish one marketplace default.</p></div><button className="outline-button" onClick={createBrand}><Plus size={14} />New brand</button></div>
      <div className="brand-list">{brands.map((brand) => <button key={brand.id} className={`brand-list-item ${selectedId === brand.id ? 'brand-list-selected' : ''}`} onClick={() => selectBrand(brand.id)}><span style={{ background: brand.primary_color }}>{brand.name_bn.slice(0, 1) || 'N'}</span><span><b>{brand.name_en}</b><small>{brand.slug} · {brand.status}{brand.is_default ? ' · Live default' : ''}</small></span>{brand.is_default && <Check size={16} />}</button>)}{!brands.length && <p className="admin-empty">No saved brand profiles yet.</p>}</div>
    </section>
    <section className="dash-panel branding-editor-panel">
      <div className="panel-heading"><div><p className="section-kicker">{selected?.is_default ? 'LIVE DEFAULT' : selected ? selected.status.toUpperCase() : 'NEW DRAFT'}</p><h2>{selected ? `Edit ${selected.name_en}` : 'Create brand profile'}</h2><p>Only published profiles are visible in the customer storefront.</p></div><div className="branding-actions"><button className="outline-button" onClick={() => refresh()} disabled={busy}><RefreshCw size={14} />Refresh</button><button className="outline-button" onClick={save} disabled={busy}><Save size={14} />Save draft</button><button className="hero-cta" onClick={publish} disabled={busy || !selectedId}><Check size={14} />Publish default</button></div></div>
      {message && <p className="catalog-message" role="status">{message}</p>}
      <div className="branding-form">
        <Field label="Brand slug" value={draft.slug} onChange={(value) => update('slug', value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} hint="Lowercase letters, numbers, and hyphens." />
        <Field label="Bengali name" value={draft.name_bn} onChange={(value) => update('name_bn', value)} />
        <Field label="English name" value={draft.name_en} onChange={(value) => update('name_en', value)} />
        <Field label="Bengali tagline" value={draft.tagline_bn} onChange={(value) => update('tagline_bn', value)} />
        <Field label="English tagline" value={draft.tagline_en} onChange={(value) => update('tagline_en', value)} />
        <ColourField label="Primary colour" value={draft.primary_color} onChange={(value) => update('primary_color', value)} />
        <ColourField label="Accent colour" value={draft.accent_color} onChange={(value) => update('accent_color', value)} />
        <ColourField label="Surface colour" value={draft.surface_color} onChange={(value) => update('surface_color', value)} />
        <Field label="Logo URL" value={draft.logo_url} onChange={(value) => update('logo_url', value)} hint="Use a public path such as /images/notun-bazar-location-logo.png." />
        <Field label="Icon URL" value={draft.icon_url} onChange={(value) => update('icon_url', value)} />
        <Field label="Desktop hero image URL" value={draft.hero_desktop_url} onChange={(value) => update('hero_desktop_url', value)} />
        <Field label="Mobile hero image URL" value={draft.hero_mobile_url} onChange={(value) => update('hero_mobile_url', value)} />
        <Field label="Hero eyebrow" value={draft.hero_eyebrow} onChange={(value) => update('hero_eyebrow', value)} />
        <Field label="Hero headline" value={draft.hero_headline} onChange={(value) => update('hero_headline', value)} />
        <Field label="Hero description" value={draft.hero_description} onChange={(value) => update('hero_description', value)} multiline />
        <Field label="CTA label" value={draft.hero_cta_label} onChange={(value) => update('hero_cta_label', value)} />
        <Field label="CTA destination" value={draft.hero_cta_url} onChange={(value) => update('hero_cta_url', value)} hint="A page anchor/path or HTTPS URL." />
        <Field label="Hero image alt text" value={draft.hero_alt_text} onChange={(value) => update('hero_alt_text', value)} />
      </div>
      <div className="brand-assets"><b>Available uploaded assets</b><div>{suppliedAssets.map((asset) => <button key={asset} onClick={() => update(asset.includes('location') ? 'icon_url' : 'hero_desktop_url', asset)}>{asset.split('/').pop()}</button>)}</div></div>
      <section className="brand-preview" style={{ '--preview-primary': draft.primary_color, '--preview-accent': draft.accent_color, '--preview-surface': draft.surface_color, backgroundImage: `linear-gradient(90deg, ${draft.primary_color}F2, ${draft.primary_color}99), url("${draft.hero_desktop_url || fallbackMarketplaceBrand.hero_desktop_url}")` }}>
        <p><Paintbrush size={14} />Live storefront preview</p><h3>{draft.name_bn} <span>{draft.name_en}</span></h3><b>{draft.hero_headline || 'Hero headline'}</b><small>{draft.hero_description || 'Hero description'}</small><button><Eye size={13} />{draft.hero_cta_label || 'Call to action'}</button>
      </section>
    </section>
    <BrandLocationManager brands={brands} />
  </section>;
}

function BrandLocationManager({ brands }) {
  const [locations, setLocations] = useState([]); const [overrides, setOverrides] = useState([]); const [locationId, setLocationId] = useState('');
  const [city, setCity] = useState({ slug: '', name_bn: '', name_en: '' }); const [area, setArea] = useState({ slug: '', name_bn: '', name_en: '', parent_city_id: '' });
  const [override, setOverride] = useState({ brand_id: '', hero_desktop_url: '', hero_mobile_url: '', hero_headline: '', hero_description: '', hero_cta_label: '', hero_cta_url: '', hero_alt_text: '' });
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const cities = locations.filter((item) => item.kind === 'city'); const selected = locations.find((item) => item.id === locationId);
  async function refresh() { try { const [nextLocations, nextOverrides] = await Promise.all([loadBrandLocations(), loadBrandLocationOverrides()]); setLocations(nextLocations); setOverrides(nextOverrides); const nextId = locationId || nextLocations[0]?.id || ''; setLocationId(nextId); const current = nextOverrides.find((item) => item.location_id === nextId); if (current) setOverride({ ...current, brand_id: current.brand_id || '' }); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load location branding.'); } }
  useEffect(() => { refresh(); }, []);
  useEffect(() => { const current = overrides.find((item) => item.location_id === locationId); setOverride(current ? { ...current, brand_id: current.brand_id || '' } : { brand_id: '', hero_desktop_url: '', hero_mobile_url: '', hero_headline: '', hero_description: '', hero_cta_label: '', hero_cta_url: '', hero_alt_text: '' }); }, [locationId, overrides]);
  async function addLocation(kind) { const value = kind === 'city' ? city : area; setBusy(true); try { await saveBrandLocation({ ...value, kind, parent_city_id: kind === 'area' ? value.parent_city_id || null : null, is_active: true }); setMessage(`${kind === 'city' ? 'City' : 'Area'} saved.`); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save location.'); } finally { setBusy(false); } }
  async function saveOverride() { if (!locationId) return; setBusy(true); try { await saveBrandLocationOverride({ location_id: locationId, brand_id: override.brand_id || null, hero_desktop_url: override.hero_desktop_url || null, hero_mobile_url: override.hero_mobile_url || null, hero_eyebrow: null, hero_headline: override.hero_headline || null, hero_description: override.hero_description || null, hero_cta_label: override.hero_cta_label || null, hero_cta_url: override.hero_cta_url || null, hero_alt_text: override.hero_alt_text || null, status: 'published' }); setMessage('Location override published.'); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish location override.'); } finally { setBusy(false); } }
  return <section className="dash-panel brand-location-panel"><div className="panel-heading"><div><p className="section-kicker">LOCATION RESOLUTION</p><h2>City and area branding</h2><p>Areas inherit their city/default identity until an override is published.</p></div></div>{message && <p className="catalog-message">{message}</p>}<div className="location-forms"><div><b>Add city</b><input placeholder="Slug, e.g. kolkata" value={city.slug} onChange={(e) => setCity({ ...city, slug: e.target.value.toLowerCase() })} /><input placeholder="English name" value={city.name_en} onChange={(e) => setCity({ ...city, name_en: e.target.value })} /><input placeholder="Bengali name" value={city.name_bn} onChange={(e) => setCity({ ...city, name_bn: e.target.value })} /><button disabled={busy || !city.slug || !city.name_en} onClick={() => addLocation('city')}>Save city</button></div><div><b>Add local area</b><select value={area.parent_city_id} onChange={(e) => setArea({ ...area, parent_city_id: e.target.value })}><option value="">Choose city</option>{cities.map((item) => <option key={item.id} value={item.id}>{item.name_en}</option>)}</select><input placeholder="Slug, e.g. salt-lake" value={area.slug} onChange={(e) => setArea({ ...area, slug: e.target.value.toLowerCase() })} /><input placeholder="English name" value={area.name_en} onChange={(e) => setArea({ ...area, name_en: e.target.value })} /><button disabled={busy || !area.parent_city_id || !area.slug || !area.name_en} onClick={() => addLocation('area')}>Save area</button></div></div><div className="location-override"><label>Preview / override location<select value={locationId} onChange={(e) => setLocationId(e.target.value)}>{locations.map((item) => <option key={item.id} value={item.id}>{item.kind === 'area' ? 'Area' : 'City'} · {item.name_en}</option>)}</select></label>{selected && <><label>Brand identity<select value={override.brand_id} onChange={(e) => setOverride({ ...override, brand_id: e.target.value })}><option value="">Inherit parent/default brand</option>{brands.filter((brand) => brand.status === 'published').map((brand) => <option key={brand.id} value={brand.id}>{brand.name_en}</option>)}</select></label><label>Desktop banner override<input value={override.hero_desktop_url || ''} onChange={(e) => setOverride({ ...override, hero_desktop_url: e.target.value })} placeholder="Optional image URL" /></label><label>Mobile banner override<input value={override.hero_mobile_url || ''} onChange={(e) => setOverride({ ...override, hero_mobile_url: e.target.value })} placeholder="Optional image URL" /></label><label>Headline override<input value={override.hero_headline || ''} onChange={(e) => setOverride({ ...override, hero_headline: e.target.value })} /></label><button disabled={busy} onClick={saveOverride}>Publish location override</button></>}</div></section>;
}

function Field({ label, value, onChange, hint, multiline = false }) {
  return <label className={`branding-field ${multiline ? 'branding-field-wide' : ''}`}><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="3" /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}{hint && <small>{hint}</small>}</label>;
}

function ColourField({ label, value, onChange }) {
  return <label className="branding-field"><span>{label}</span><div className="brand-colour-input"><input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#315B42'} onChange={(event) => onChange(event.target.value.toUpperCase())} /><input value={value} onChange={(event) => onChange(event.target.value)} /></div></label>;
}
