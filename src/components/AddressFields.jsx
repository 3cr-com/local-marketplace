import { useState } from 'react';
import { searchShopAddress } from '../features/locations/location-search.repository';

export const emptyAddress = { label: 'Home', recipientName: '', phone: '', addressLine1: '', addressLine2: '', locality: '', landmark: '', city: '', district: '', state: '', country: 'India', pincode: '', latitude: null, longitude: null };

export function addressText(address) {
  return [address.addressLine1, address.addressLine2, address.locality, address.city, address.state, address.pincode].filter(Boolean).join(', ');
}

export default function AddressFields({ value, onChange, onLocate, locating, onSearchLocation, searchQuery = '', onSearchQueryChange, searching = false, searchResults = [], onSelectLocation, locationSearchScope = 'delivery', includeRecipient = true }) {
  const [internalQuery, setInternalQuery] = useState('');
  const [internalSearching, setInternalSearching] = useState(false);
  const [internalResults, setInternalResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const set = (key, next) => onChange({ ...value, [key]: next });
  const query = onSearchQueryChange ? searchQuery : internalQuery;
  const results = onSearchLocation ? searchResults : internalResults;
  const isSearching = searching || internalSearching;
  const locationDescription = locationSearchScope === 'shop'
    ? 'Choose the result that matches the actual shop location. Device location is only correct when you are at the shop.'
    : 'Choose the result that matches the delivery location. Device location is only correct when you are there.';

  async function runSearch() {
    if (onSearchLocation) {
      onSearchLocation();
      return;
    }
    const fallback = [value.addressLine1, value.addressLine2, value.locality, value.city, value.state, value.pincode, value.country].filter(Boolean).join(', ');
    const term = query.trim() || fallback;
    if (term.length < 6) {
      setSearchError('Enter a fuller address before searching.');
      return;
    }
    setInternalSearching(true);
    setInternalResults([]);
    setSearchError('');
    try {
      const found = await searchShopAddress(term, locationSearchScope);
      setInternalResults(found);
      if (!found.length) setSearchError('No matching address was found. Refine the address or enter coordinates manually.');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search this address right now.');
    } finally {
      setInternalSearching(false);
    }
  }

  function selectResult(result) {
    if (onSelectLocation) {
      onSelectLocation(result);
      return;
    }
    onChange({ ...value, latitude: result.latitude, longitude: result.longitude, city: result.city || value.city, state: result.state || value.state, pincode: result.pincode || value.pincode });
    setInternalQuery(result.displayName);
    setInternalResults([]);
    setSearchError('Location selected. Verify the address details before saving.');
  }

  return <div className="address-fields">
    {includeRecipient && <><label>Address label<input required value={value.label} onChange={e => set('label', e.target.value)} placeholder="Home, Work" /></label><label>Recipient name<input required value={value.recipientName} onChange={e => set('recipientName', e.target.value)} /></label><label>Phone number<input required inputMode="tel" pattern="[0-9+ -]{8,}" value={value.phone} onChange={e => set('phone', e.target.value)} /></label></>}
    <label className="address-wide">Address line 1<input required value={value.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="House / flat no., building, street" /></label>
    <label className="address-wide">Address line 2 <small>(optional)</small><input value={value.addressLine2} onChange={e => set('addressLine2', e.target.value)} placeholder="Floor, apartment, road" /></label>
    <label>Locality / village<input value={value.locality} onChange={e => set('locality', e.target.value)} /></label><label>Landmark <small>(optional)</small><input value={value.landmark} onChange={e => set('landmark', e.target.value)} /></label>
    <label>City / town<input required value={value.city} onChange={e => set('city', e.target.value)} /></label><label>District <small>(optional)</small><input value={value.district} onChange={e => set('district', e.target.value)} /></label>
    <label>State<input required value={value.state} onChange={e => set('state', e.target.value)} /></label><label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" value={value.pincode} onChange={e => set('pincode', e.target.value)} placeholder="560001" /></label>
    <label>Country<input required value={value.country} onChange={e => set('country', e.target.value)} /></label>
    {(onLocate || onSearchLocation) && <div className="address-location address-wide">
      <label className="address-search-input">Search address<input value={query} onChange={e => onSearchQueryChange ? onSearchQueryChange(e.target.value) : setInternalQuery(e.target.value)} placeholder={locationSearchScope === 'shop' ? 'Shop name, locality, city' : 'Area, locality, city'} /></label>
      <div className="address-location-actions"><button type="button" className="account-page-primary" onClick={runSearch} disabled={isSearching}>{isSearching ? 'Searching…' : 'Search and choose address'}</button>{onLocate && <button type="button" className="outline-button" onClick={onLocate} disabled={locating}>{locating ? 'Finding location…' : 'Use this device location'}</button>}</div>
      <small className="address-location-help">{locationDescription}</small>
      <label className="address-coordinate">Latitude<input type="number" step="any" value={value.latitude ?? ''} onChange={e => set('latitude', e.target.value === '' ? null : Number(e.target.value))} /></label>
      <label className="address-coordinate">Longitude<input type="number" step="any" value={value.longitude ?? ''} onChange={e => set('longitude', e.target.value === '' ? null : Number(e.target.value))} /></label>
      {searchError && <small className="address-search-feedback">{searchError}</small>}
      {results.length > 0 && <div className="address-search-results">{results.map((result) => <button type="button" key={`${result.latitude}-${result.longitude}`} onClick={() => selectResult(result)}><b>{result.displayName}</b><small>{result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}</small></button>)}</div>}
    </div>}
  </div>;
}
