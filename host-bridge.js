// Keep the custom-domain entry URL aligned with navigation inside the hosted page.
if (window.parent !== window) {
  const parents = new Set(['https://invisiblepalmistry.com', 'https://www.invisiblepalmistry.com']);
  const referrer = (() => { try { return new URL(document.referrer).origin; } catch { return ''; } })();
  const host = parents.has(location.ancestorOrigins?.[0]) ? location.ancestorOrigins[0] : (parents.has(referrer) ? referrer : 'https://invisiblepalmistry.com');
  {
    const report = () => window.parent.postMessage({ type: 'portfolio-location', path: location.pathname + location.search + location.hash, title: document.title }, host);
    window.addEventListener('pageshow', report);
    window.addEventListener('hashchange', report);
    report();
    document.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || link.target === '_blank' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href, location.href);
      if (parents.has(url.origin) || (url.origin === location.origin && /^\/(?:index\.html)?$/.test(url.pathname))) {
        event.preventDefault();
        window.parent.postMessage({ type: 'portfolio-exit', url: parents.has(url.origin) ? url.href : host + '/' }, host);
      }
    });
  }
}
