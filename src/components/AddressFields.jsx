export const emptyAddress = { label: 'Home', recipientName: '', phone: '', addressLine1: '', addressLine2: '', locality: '', landmark: '', city: '', district: '', state: '', country: 'India', pincode: '', latitude: null, longitude: null };

export function addressText(address) {
  return [address.addressLine1, address.addressLine2, address.locality, address.city, address.state, address.pincode].filter(Boolean).join(', ');
}

export default function AddressFields({ value, onChange, onLocate, locating, includeRecipient = true }) {
  const set = (key, next) => onChange({ ...value, [key]: next });
  return <div className="address-fields">
    {includeRecipient && <><label>Address label<input required value={value.label} onChange={e => set('label', e.target.value)} placeholder="Home, Work" /></label><label>Recipient name<input required value={value.recipientName} onChange={e => set('recipientName', e.target.value)} /></label><label>Phone number<input required inputMode="tel" pattern="[0-9+ -]{8,}" value={value.phone} onChange={e => set('phone', e.target.value)} /></label></>}
    <label className="address-wide">Address line 1<input required value={value.addressLine1} onChange={e => set('addressLine1', e.target.value)} placeholder="House / flat no., building, street" /></label>
    <label className="address-wide">Address line 2 <small>(optional)</small><input value={value.addressLine2} onChange={e => set('addressLine2', e.target.value)} placeholder="Floor, apartment, road" /></label>
    <label>Locality / village<input value={value.locality} onChange={e => set('locality', e.target.value)} /></label><label>Landmark <small>(optional)</small><input value={value.landmark} onChange={e => set('landmark', e.target.value)} /></label>
    <label>City / town<input required value={value.city} onChange={e => set('city', e.target.value)} /></label><label>District <small>(optional)</small><input value={value.district} onChange={e => set('district', e.target.value)} /></label>
    <label>State<input required value={value.state} onChange={e => set('state', e.target.value)} /></label><label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" value={value.pincode} onChange={e => set('pincode', e.target.value)} placeholder="560001" /></label>
    <label>Country<input required value={value.country} onChange={e => set('country', e.target.value)} /></label>
    {onLocate && <div className="address-location address-wide"><button type="button" className="outline-button" onClick={onLocate} disabled={locating}>{locating ? 'Finding location…' : value.latitude == null ? 'Use current location' : 'Location captured ✓'}</button><small>Required so we can calculate the delivery distance.</small></div>}
  </div>;
}
