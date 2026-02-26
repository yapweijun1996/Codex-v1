function asPatchText(value) {
  return String(value == null ? '' : value);
}

export function parseAfwPatch(input) {
  const lines = asPatchText(input).split('\n');
  if (lines[0] !== '*** Begin Patch') return { error: 'Invalid patch: missing "*** Begin Patch"' };
  if (!lines.includes('*** End Patch')) return { error: 'Invalid patch: missing "*** End Patch"' };

  const operations = [];
  let i = 1;
  while (i < lines.length) {
    const line = lines[i];
    if (line === '*** End Patch') break;
    if (line.startsWith('*** Add File: ')) {
      const path = line.slice('*** Add File: '.length).trim();
      if (!path) return { error: 'Invalid patch: empty add file path' };
      i += 1;
      const contentLines = [];
      while (i < lines.length) {
        const row = lines[i];
        if (row === '*** End Patch' || row.startsWith('*** Update File: ') || row.startsWith('*** Add File: ') || row.startsWith('*** Delete File: ')) break;
        if (row.startsWith('+')) contentLines.push(row.slice(1));
        i += 1;
      }
      operations.push({ type: 'add', path, content: contentLines.join('\n') });
      continue;
    }
    if (line.startsWith('*** Delete File: ')) {
      const path = line.slice('*** Delete File: '.length).trim();
      if (!path) return { error: 'Invalid patch: empty delete file path' };
      operations.push({ type: 'delete', path });
      i += 1;
      continue;
    }
    if (!line.startsWith('*** Update File: ')) {
      i += 1;
      continue;
    }

    const from = line.slice('*** Update File: '.length).trim();
    if (!from) return { error: 'Invalid patch: empty update file path' };
    i += 1;
    let to = from;
    if (i < lines.length && lines[i].startsWith('*** Move to: ')) {
      to = lines[i].slice('*** Move to: '.length).trim();
      if (!to) return { error: 'Invalid patch: empty move target path' };
      i += 1;
    }

    const hunks = [];
    while (i < lines.length) {
      const head = lines[i];
      if (
        head === '*** End Patch' ||
        head.startsWith('*** Update File: ') ||
        head.startsWith('*** Add File: ') ||
        head.startsWith('*** Delete File: ')
      ) break;
      if (!head.startsWith('@@')) {
        i += 1;
        continue;
      }
      i += 1;
      const oldLines = [];
      const newLines = [];
      while (i < lines.length) {
        const row = lines[i];
        if (row.startsWith('@@') || row === '*** End Patch' || row.startsWith('*** Update File: ')) break;
        if (row.startsWith(' ')) {
          oldLines.push(row.slice(1));
          newLines.push(row.slice(1));
        } else if (row.startsWith('-')) {
          oldLines.push(row.slice(1));
        } else if (row.startsWith('+')) {
          newLines.push(row.slice(1));
        }
        i += 1;
      }
      const oldBlock = oldLines.join('\n');
      const newBlock = newLines.join('\n');
      if (!oldBlock && newBlock) return { error: 'Unsupported patch: pure insertion hunk' };
      hunks.push({ oldBlock, newBlock });
    }
    operations.push({ type: 'update', from, to, hunks });
  }

  if (operations.length === 0) return { error: 'Invalid patch: no operations found' };
  for (const op of operations) {
    if (op.type === 'update' && op.from === op.to && op.hunks.length === 0) {
      return { error: `Invalid patch: update op has neither hunks nor move: ${op.from}` };
    }
  }
  return { operations };
}

export function applyAfwParsedPatch(content, hunks) {
  let next = asPatchText(content);
  let replacements = 0;
  for (const h of hunks) {
    const oldBlock = asPatchText(h.oldBlock);
    const newBlock = asPatchText(h.newBlock);
    const idx = next.indexOf(oldBlock);
    if (idx < 0) return { error: 'Patch hunk not found in file content' };
    next = `${next.slice(0, idx)}${newBlock}${next.slice(idx + oldBlock.length)}`;
    replacements += 1;
  }
  return { next, replacements };
}

