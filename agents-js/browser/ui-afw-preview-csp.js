const PREVIEW_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'self' http://localhost:5500 https: http:",
  "style-src 'unsafe-inline' https: http:",
  'img-src data: blob: https: http:',
  'font-src data: https: http:',
  "connect-src 'none'",
  'media-src data: blob:',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export function withPreviewCspMeta(html) {
  const source = String(html || '');
  const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">`;
  const hasCspMeta = /<meta\b[^>]*http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/i.test(source);
  if (hasCspMeta) return source;
  if (source.includes('</head>')) return source.replace('</head>', `${cspMetaTag}</head>`);
  return `${cspMetaTag}${source}`;
}
