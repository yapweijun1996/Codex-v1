function asText(value) {
  return String(value == null ? '' : value);
}

function cleanDiffPath(raw) {
  const text = asText(raw).trim();
  if (!text || text === '/dev/null') return '';
  if (text.startsWith('a/') || text.startsWith('b/')) return text.slice(2);
  return text;
}

function getLegacyDeletePath(line) {
  const text = asText(line).trim();
  if (text.startsWith('*** Delete File: ')) return cleanDiffPath(text.slice('*** Delete File: '.length));
  if (text.startsWith('Delete: ')) return cleanDiffPath(text.slice('Delete: '.length));
  if (text.startsWith('! Delete: ')) return cleanDiffPath(text.slice('! Delete: '.length));
  return '';
}

export function normalizeAfwPatchInput(input) {
  const lines = asText(input).split('\n');
  const rewrites = [];

  for (let i = 0; i < lines.length; i += 1) {
    const legacyPath = getLegacyDeletePath(lines[i]);
    if (legacyPath && !asText(lines[i]).trim().startsWith('*** Delete File: ')) {
      lines[i] = `*** Delete File: ${legacyPath}`;
      rewrites.push('legacy_delete_header');
      continue;
    }

    const head = asText(lines[i]).trim();
    const next = i + 1 < lines.length ? asText(lines[i + 1]).trim() : '';
    if (!head.startsWith('--- ') || !next.startsWith('+++ ')) continue;
    const oldPath = cleanDiffPath(head.slice(4));
    const newPath = cleanDiffPath(next.slice(4));
    if (!oldPath || newPath) continue;
    lines.splice(i, 2, `*** Delete File: ${oldPath}`);
    rewrites.push('unified_delete_header');
  }

  return { input: lines.join('\n'), rewrites };
}

