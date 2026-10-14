/**
 * taxonomy.js — the vocabulary and the shape of an entry.
 *
 * Everything the app knows about legal material lives here: the subject list,
 * the courts, and the fields each entry type carries. The capture form, the
 * reader view and the search index are all generated from these definitions,
 * so adding a field or a subject means editing this file and nothing else.
 */

/* Curated subject list — Indian corporate law. She can also add her own free
   tags, which are stored separately on each entry (see `tags`). */
export const SUBJECTS = [
  'Companies Act 2013',
  'SEBI – LODR',
  'SEBI – ICDR',
  'SEBI – SAST',
  'Insider Trading (PIT)',
  'IBC / Insolvency',
  'Competition Act',
  'FEMA / FDI',
  'Contract',
  'Arbitration',
  'Corporate Governance',
  'M&A',
  'Banking / RBI',
  'Taxation',
  'Constitutional',
];

export const COURTS = [
  'Supreme Court',
  'High Court',
  'NCLAT',
  'NCLT',
  'SAT',
  'CCI',
  'SEBI (WTM/AO)',
  'ITAT',
  'Tribunal / Other',
];

/**
 * Field definitions per entry type.
 *
 * kind:    text | textarea | select | url | extracts
 * boost:   relevance weight in search (absent = 1, 0 = not indexed)
 * hint:    placeholder, written as an example rather than an instruction
 */
export const TYPES = {
  case: {
    label: 'Case',
    blurb: 'A judgment or an order.',
    titleLabel: 'Case name',
    fields: [
      { key: 'citation', label: 'Citation', kind: 'text', mono: true, boost: 3 },
      { key: 'court', label: 'Court or forum', kind: 'select', options: COURTS, boost: 1 },
      { key: 'year', label: 'Year', kind: 'text', mono: true, boost: 0 },
      { key: 'facts', label: 'Facts', kind: 'textarea', hint: 'Only what the issue turns on.', boost: 1 },
      { key: 'issue', label: 'Issue', kind: 'textarea', hint: 'The question the court had to answer. Usually starts "Whether…"', boost: 2 },
      { key: 'held', label: 'Held', kind: 'textarea', hint: 'What the court actually decided or ordered.', boost: 2 },
      {
        key: 'ratio',
        label: 'Ratio decidendi',
        kind: 'textarea',
        hint: 'The rule behind the decision — not the outcome, the principle. In your own words. This is the part you will search for.',
        boost: 3,
        feature: true,
      },
    ],
  },

  paper: {
    label: 'Paper',
    blurb: 'A journal article, chapter or working paper.',
    titleLabel: 'Title',
    fields: [
      { key: 'authors', label: 'Author(s)', kind: 'text', boost: 2 },
      { key: 'journal', label: 'Journal or publisher', kind: 'text', boost: 1 },
      { key: 'volume', label: 'Volume / issue', kind: 'text', mono: true, boost: 0 },
      { key: 'year', label: 'Year', kind: 'text', mono: true, boost: 0 },
      { key: 'pages', label: 'Pages', kind: 'text', mono: true, boost: 0 },
      { key: 'doi', label: 'DOI or link', kind: 'url', mono: true, boost: 0 },
      {
        key: 'argument',
        label: 'The argument',
        kind: 'textarea',
        hint: 'What the author is actually claiming, in one or two sentences.',
        boost: 3,
        feature: true,
      },
      { key: 'critique', label: 'Your critique', kind: 'textarea', hint: 'Where it holds, where it does not, what it ignores.', boost: 2 },
      {
        key: 'extracts',
        label: 'Extracts',
        kind: 'extracts',
        hint: 'A passage you’d want to quote later — paste it, and note the page it’s on.',
        boost: 2,
      },
    ],
  },

  statute: {
    label: 'Statute',
    blurb: 'A provision and what it actually does.',
    titleLabel: 'Provision',
    fields: [
      { key: 'act', label: 'Act', kind: 'text', boost: 2 },
      { key: 'section', label: 'Section', kind: 'text', mono: true, boost: 3 },
      { key: 'year', label: 'Year', kind: 'text', mono: true, boost: 0 },
      {
        key: 'gloss',
        label: 'What it does',
        kind: 'textarea',
        hint: 'In your own words, not the bare text.',
        boost: 3,
        feature: true,
      },
    ],
  },

  news: {
    label: 'News',
    blurb: 'A piece from the press worth remembering.',
    titleLabel: 'Headline',
    fields: [
      { key: 'publication', label: 'Publication', kind: 'text', boost: 1 },
      { key: 'date', label: 'Date', kind: 'text', mono: true, boost: 0 },
      { key: 'summary', label: 'What happened', kind: 'textarea', hint: 'The two or three sentences someone else would need, before you get to why it matters.', boost: 2 },
      {
        key: 'why',
        label: 'Why it matters',
        kind: 'textarea',
        hint: 'The legal point underneath the story.',
        boost: 3,
        feature: true,
      },
    ],
  },
};

export const TYPE_KEYS = Object.keys(TYPES);

/** Fields every entry carries, whatever its type. */
export const COMMON_FIELDS = [
  { key: 'note', label: 'Your note', kind: 'textarea', hint: 'Why it matters, where it fits, what you disagree with.', boost: 2 },
  { key: 'source', label: 'Source link', kind: 'url', hint: 'https://', mono: true, boost: 0 },
];

/** Label for a type key, tolerant of unknown values from old data. */
export function typeLabel(key) {
  return (TYPES[key] && TYPES[key].label) || 'Entry';
}

/** The field definitions for a type, type-specific then common. */
export function fieldsFor(type) {
  const t = TYPES[type] || TYPES.case;
  return t.fields.concat(COMMON_FIELDS);
}

/** The one field that carries the heart of the entry, shown on the card. */
export function featureField(type) {
  const t = TYPES[type] || TYPES.case;
  return t.fields.find((f) => f.feature) || null;
}

/** A fresh, empty entry of the given type. */
export function blankEntry(type) {
  return {
    type: TYPE_KEYS.includes(type) ? type : 'case',
    title: '',
    subjects: [],
    tags: [],
    note: '',
    source: '',
    starred: false,
  };
}
