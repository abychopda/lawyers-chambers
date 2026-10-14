/**
 * search.js — full text over her own words, plus subject/tag/type/court
 * filters. Built on MiniSearch (vendored, runs entirely offline).
 */

import MiniSearch from '../vendor/minisearch.js';
import { fieldsFor } from './taxonomy.js';

// All fields that could ever appear across any entry type, each with the
// boost its own type definition gives it. MiniSearch is happy indexing a
// field that is blank or absent on a given document.
const ALL_FIELD_KEYS = (() => {
  const seen = new Map();
  ['case', 'paper', 'statute', 'news'].forEach((t) => {
    fieldsFor(t).forEach((f) => {
      if (f.kind === 'extracts') return; // handled separately, see flatten()
      const w = f.boost === undefined ? 1 : f.boost;
      if (w > 0) seen.set(f.key, Math.max(seen.get(f.key) || 0, w));
    });
  });
  return seen;
})();

const BOOST = Object.assign(
  { title: 4, subjects: 1.5, tags: 1.5, extractText: 2 },
  Object.fromEntries(ALL_FIELD_KEYS)
);

const FIELDS = ['title', 'subjects', 'tags', 'extractText', ...ALL_FIELD_KEYS.keys()];

let mini = null;

function flatten(entry) {
  const row = { id: entry.id };
  row.title = entry.title || '';
  row.subjects = (entry.subjects || []).join(' ');
  row.tags = (entry.tags || []).join(' ');
  FIELDS.forEach((k) => {
    if (k === 'title' || k === 'subjects' || k === 'tags' || k === 'extractText') return;
    const v = entry[k];
    row[k] = typeof v === 'string' ? v : '';
  });
  row.extractText = Array.isArray(entry.extracts)
    ? entry.extracts.map((e) => (e && e.quote) || '').join(' \n ')
    : '';
  return row;
}

export function buildIndex(entries) {
  mini = new MiniSearch({
    idField: 'id',
    fields: FIELDS,
    storeFields: ['id'],
    searchOptions: {
      boost: BOOST,
      fuzzy: 0.2,
      prefix: true,
      combineWith: 'AND',
    },
  });
  mini.addAll(entries.map(flatten));
  return mini;
}

/** Re-index after entries change. Rebuilding is cheap at this scale. */
export function reindex(entries) {
  return buildIndex(entries);
}

/**
 * query: free text (may be empty)
 * returns: array of ids in relevance order, or null if query is empty
 *          (null means "no ranking opinion" — caller shows everything).
 */
export function search(query) {
  const q = (query || '').trim();
  if (!q) return null;
  if (!mini) return [];
  try {
    return mini.search(q).map((r) => r.id);
  } catch (e) {
    return [];
  }
}
