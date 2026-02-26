import { buildPreviewHtml } from '../browser/ui-afw-preview-driver.js';

describe('AFW preview CSP policy', () => {
  it('injects relaxed srcdoc-safe CSP without frame-ancestors and allows common dev assets', () => {
    const html = '<!doctype html><html><head></head><body><h1>CSP</h1></body></html>';
    const output = buildPreviewHtml({ 'index.html': html });

    const cspMatch = output.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/i);
    expect(cspMatch).not.toBeNull();
    const csp = cspMatch ? cspMatch[1] : '';

    expect(csp).not.toContain('frame-ancestors');
    expect(csp).toContain("script-src 'unsafe-inline' 'self' http://localhost:5500 https: http:");
    expect(csp).toContain("style-src 'unsafe-inline' https: http:");
    expect(csp).toContain('img-src data: blob: https: http:');
    expect(csp).toContain('font-src data: https: http:');
  });
});
