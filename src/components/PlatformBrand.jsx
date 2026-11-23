export default function PlatformBrand({ compact = false, href }) {
  const content = <><img src="/images/superbazzar-logo.svg" alt="" /><span><b>Super<span>Bazzar</span></b><small>by 3cr</small></span></>;
  return href ? <a className={`platform-brand ${compact ? 'platform-brand-compact' : ''}`} href={href}>{content}</a> : <div className={`platform-brand ${compact ? 'platform-brand-compact' : ''}`}>{content}</div>;
}
