function asText(value) {
  return String(value == null ? '' : value);
}

export function buildLineDiffPreview(before, after, { maxLines = 24 } = {}) {
  const a = asText(before).split('\n');
  const b = asText(after).split('\n');
  const limit = Number.isFinite(Number(maxLines)) ? Math.max(6, Math.trunc(Number(maxLines))) : 24;
  const lines = [];
  let i = 0;
  let j = 0;
  while ((i < a.length || j < b.length) && lines.length < limit) {
    const left = i < a.length ? a[i] : null;
    const right = j < b.length ? b[j] : null;
    if (left === right) {
      i += 1;
      j += 1;
      continue;
    }
    if (left !== null) {
      lines.push(`-${left}`);
      i += 1;
      if (lines.length >= limit) break;
    }
    if (right !== null) {
      lines.push(`+${right}`);
      j += 1;
    }
  }
  return {
    lines,
    truncated: (i < a.length || j < b.length),
  };
}
