import { buildLineDiffPreview } from './ui-afw-diff-preview.js';
import { normalizeAfwPatchInput } from './ui-afw-patch-normalize.js';
import { applyAfwParsedPatch, parseAfwPatch } from './ui-afw-patch-parser.js';

function asText(value) {
  return String(value == null ? '' : value);
}

function countLiteral(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  const source = asText(text);
  while (index <= source.length) {
    const found = source.indexOf(needle, index);
    if (found < 0) break;
    count += 1;
    index = found + needle.length;
  }
  return count;
}

function applySingleEdit({ content, oldString, newString, replaceAll = false, lineStart, lineEnd }) {
  const original = asText(content);
  const lines = original.split('\n');
  const start = Number.isFinite(Number(lineStart)) ? Math.max(1, Math.trunc(Number(lineStart))) : 1;
  const endRaw = Number.isFinite(Number(lineEnd)) ? Math.max(start, Math.trunc(Number(lineEnd))) : lines.length;
  const end = Math.min(endRaw, lines.length);
  const prefix = lines.slice(0, start - 1);
  const target = lines.slice(start - 1, end).join('\n');
  const suffix = lines.slice(end);
  const before = asText(oldString);
  if (!before) return { ok: false, error: 'old_string is required and cannot be empty.' };
  const after = asText(newString);
  let changedTarget = target;
  let replacements = 0;
  if (replaceAll) {
    replacements = countLiteral(target, before);
    if (replacements > 0) changedTarget = target.split(before).join(after);
  } else {
    const idx = target.indexOf(before);
    if (idx >= 0) {
      replacements = 1;
      changedTarget = `${target.slice(0, idx)}${after}${target.slice(idx + before.length)}`;
    }
  }
  const nextContent = [...prefix, changedTarget, ...suffix].join('\n');
  return {
    ok: true,
    changed: nextContent !== original,
    replacements,
    range: { line_start: start, line_end: end },
    content: nextContent,
  };
}

function buildPatchFormatHint(error) {
  const msg = String(error || '');
  if (!msg || (!msg.includes('Invalid patch') && !msg.includes('Unsupported patch'))) return null;
  return [
    'Patch format invalid. Use codex format with "*** Begin Patch" / "*** End Patch".',
    'Delete must be "*** Delete File: <path>".',
    'If previous patch used "Delete:" or "---/+++ /dev/null", rewrite and retry apply_patch directly.',
  ].join(' ');
}

export function createAfwPatchEditTools({ getWorkspaceApi }) {
  return [
    {
      name: 'edit',
      description: 'Edit one file by replacing old_string with new_string, optionally scoped to line range, with dry-run diff preview.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Target file path.' },
          old_string: { type: 'string', description: 'Exact text to find.' },
          new_string: { type: 'string', description: 'Replacement text.' },
          replace_all: { type: 'boolean', description: 'Replace all matches in range (default false).' },
          line_start: { type: 'number', description: '1-based start line for scoped edit.' },
          line_end: { type: 'number', description: '1-based end line for scoped edit.' },
          dry_run: { type: 'boolean', description: 'When true, do not write file; only return preview.' },
          preview_lines: { type: 'number', description: 'Max lines in diff preview (default 24).' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
      func: async ({ path, old_string, new_string, replace_all, line_start, line_end, dry_run, preview_lines } = {}) => {
        const api = getWorkspaceApi();
        if (!api || typeof api.readFile !== 'function' || typeof api.writeFile !== 'function') {
          return { error: 'Workspace API unavailable' };
        }
        const filePath = asText(path);
        const content = api.readFile(filePath);
        if (content == null) return { error: 'File not found', path: filePath };
        const out = applySingleEdit({
          content,
          oldString: old_string,
          newString: new_string,
          replaceAll: !!replace_all,
          lineStart: line_start,
          lineEnd: line_end,
        });
        if (!out.ok) return out;
        const preview = buildLineDiffPreview(content, out.content, { maxLines: preview_lines });
        const isDryRun = !!dry_run;
        if (out.changed && !isDryRun) api.writeFile(filePath, out.content);
        return {
          ok: true,
          path: filePath,
          changed: out.changed,
          dry_run: isDryRun,
          replacements: out.replacements,
          range: out.range,
          chars_before: asText(content).length,
          chars_after: asText(out.content).length,
          diff_preview: preview,
        };
      },
    },
    {
      name: 'apply_patch',
      description: 'Apply a codex-style patch (supports Update/Add/Delete/Move) in AFW workspace.',
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: 'Full patch text starting with "*** Begin Patch".' },
        },
        required: ['input'],
      },
      func: async ({ input } = {}) => {
        const api = getWorkspaceApi();
        if (!api || typeof api.readFile !== 'function' || typeof api.writeFile !== 'function') {
          return { error: 'Workspace API unavailable' };
        }
        const normalized = normalizeAfwPatchInput(input);
        const parsed = parseAfwPatch(normalized.input);
        if (parsed.error) {
          const hint = buildPatchFormatHint(parsed.error);
          return hint ? { error: parsed.error, hint } : { error: parsed.error };
        }

        const fileList = (typeof api.listFiles === 'function' ? api.listFiles() : []) || [];
        const shadow = new Map();
        for (const p of fileList) {
          const content = api.readFile(p);
          if (content != null) shadow.set(String(p), asText(content));
        }

        const touched = new Set();
        const deleted = [];
        const applied = [];
        let totalReplacements = 0;
        for (const op of parsed.operations) {
          if (op.type === 'add') {
            if (shadow.has(op.path)) return { error: `File already exists: ${op.path}` };
            shadow.set(op.path, asText(op.content));
            touched.add(op.path);
            continue;
          }
          if (op.type === 'delete') {
            if (!shadow.has(op.path)) return { error: `File not found: ${op.path}` };
            shadow.delete(op.path);
            deleted.push(op.path);
            continue;
          }
          if (op.type === 'update') {
            const current = shadow.get(op.from);
            if (current == null) return { error: `File not found: ${op.from}` };
            let next = current;
            if (op.hunks.length > 0) {
              const changed = applyAfwParsedPatch(current, op.hunks);
              if (changed.error) return { error: `${op.from}: ${changed.error}` };
              next = changed.next;
              totalReplacements += changed.replacements;
            }
            if (op.to !== op.from) {
              if (shadow.has(op.to)) return { error: `Move target already exists: ${op.to}` };
              shadow.delete(op.from);
              shadow.set(op.to, next);
              deleted.push(op.from);
              touched.add(op.from);
              touched.add(op.to);
            } else {
              shadow.set(op.from, next);
              touched.add(op.from);
            }
          }
        }

        for (const path of deleted) {
          if (typeof api.deleteFile === 'function') api.deleteFile(path);
        }
        for (const path of touched) {
          if (!shadow.has(path)) continue;
          const next = shadow.get(path);
          const current = api.readFile(path);
          if (current !== next) api.writeFile(path, next);
          applied.push(path);
        }

        return {
          ok: true,
          files: applied,
          deleted,
          replacements: totalReplacements,
          file_count: applied.length,
          rewrites: normalized.rewrites.length ? normalized.rewrites : undefined,
        };
      },
    },
  ];
}
